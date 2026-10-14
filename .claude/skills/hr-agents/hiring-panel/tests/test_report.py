import json
import os

import panel
from conftest import _issue, reply_for
from test_finalize import REWRITE_MD, reply

REWRITE_QUOTES = ["Built [FILL IN: number] data pipelines for the pricing and finance teams", "## Languages",
                  "Built a Kafka consumer that feeds the pricing team's dashboards"]


def recheck_reply(aid, verdict):
    issues = [_issue(REWRITE_QUOTES[0], 2), _issue(REWRITE_QUOTES[1], 1, "region", "section"),
              _issue(REWRITE_QUOTES[2], 1, "clarity")]
    return reply_for(aid, verdict, issues=issues)


def run_quick_recheck(init_run, run_cli):
    run, _ = init_run("resume.md --jd jd.md --quick --recheck --seed 9")
    run_cli(["prompts", "--run", run, "--phase", "panel"])
    run_cli(["submit", "ats", "--run", run], stdin=reply_for("ats"))
    run_cli(["submit", "hm", "--run", run], stdin=reply_for("hm"))
    run_cli(["aggregate", "--run", run])
    run_cli(["prompts", "--run", run, "--phase", "rewrite"])
    ids = [i["id"] for i in json.load(open(os.path.join(run, "panel.json"), encoding="utf-8"))["issues"]]
    run_cli(["submit-rewrite", "--run", run], stdin=reply(ids, REWRITE_MD))
    code, out = run_cli(["finalize", "--run", run])
    assert code == 0 and "next: recheck-init" in out, out
    return run


def test_recheck_runs_the_full_panel_with_the_same_seed_and_pile(init_run, run_cli):
    run = run_quick_recheck(init_run, run_cli)
    code, out = run_cli(["report", "--run", run])
    assert code == 2 and "run recheck-init" in out
    code, out = run_cli(["recheck-init", "--run", run])
    assert code == 0, out
    sub = os.path.join(run, "recheck")
    parent, rs = panel.load_state(run), panel.load_state(sub)
    assert rs["is_recheck"] and len(rs["agents"]) == 7 and rs["mode"] == "full"
    assert (rs["pile_size"], rs["seed"], rs["variants"]) == (parent["pile_size"], parent["seed"], parent["variants"])
    resume = open(os.path.join(sub, "input", "resume.txt"), encoding="utf-8").read()
    assert "{{PII_NAME}}" in resume and "Lotte" not in resume and "[FILL IN" in resume

    code, out = run_cli(["prompts", "--run", sub, "--phase", "panel"])
    jobs = json.loads(out)["jobs"]
    assert len(jobs) == 7
    for j in jobs:
        b = open(j["brief"], encoding="utf-8").read()
        assert "You have %d applications" % parent["pile_size"] in b
        assert "[FILL IN: ...] marks a detail the candidate hasn't provided yet" in b
    code, out = run_cli(["prompts", "--run", sub, "--phase", "rewrite"])
    assert code == 2

    for aid in rs["agents"]:
        verdict = "ADVANCE" if aid in ("hm", "peer", "lead") else "REJECT"
        code, out = run_cli(["submit", aid, "--run", sub], stdin=recheck_reply(aid, verdict))
        assert code == 0, (aid, out)
    code, out = run_cli(["aggregate", "--run", sub])
    assert code == 0 and "next: compare --run" in out

    code, out = run_cli(["compare", "--run", run])
    assert code == 0, out
    cmp_doc = json.load(open(os.path.join(run, "compare.json"), encoding="utf-8"))
    before = {r["agent"]: r["before"] for r in cmp_doc["rows"]}
    assert before["hm"] == "REJECT" and before["ceo"] == "—" and len(before) == 7

    code, chat = run_cli(["report", "--run", run])
    assert code == 0, chat
    lines = chat.splitlines()
    assert lines[0].startswith("**Hiring panel** · target: job description (file jd.md)")
    assert "region: BE (inferred: Belgian postcode and city)" in lines[0]
    assert "mode: quick + recheck" in lines[0] and "seed 9" in lines[0]
    assert "pile of %d applications" % parent["pile_size"] in lines[0]
    assert lines[2] == "**2 of 2 reviewers that reached a decision rejected**"
    assert lines[4] == panel.ATS_LINE
    assert "| 1 screen | ATS screener | REJECT (FAIL) | 3 |" in chat
    assert "**Top issues**" in chat and "1. ×" in chat
    out_line = [ln for ln in lines if ln.startswith("Output: ")][0]
    assert "[FILL IN] to complete" in out_line
    assert "| CEO | — | REJECT |" in chat
    # the chat report comes before the before/after table, and stays short
    assert chat.index("Output: ") < chat.index("Before / after") and len(lines) < 40

    full = open(os.path.join(run, "report.md"), encoding="utf-8").read()
    for section in ("## Keywords and knockouts", "## Strengths", "## Discarded items and NO DECISION",
                    "## Rewrite checks", "Missing, required: AWS, GCP"):
        assert section in full
    for text in (chat, full):
        low = text.lower()
        assert not any(w in low for w in ("bulletproof", "guaranteed", "ats-proof"))
        assert not panel.SCORE_RE.search(text)
    assert panel.load_state(run)["phase"] == "reported"


def test_report_without_recheck_and_inferred_target(init_run, run_cli):
    run, _ = init_run("resume.md --quick --seed 3")
    run_cli(["set-role", "--run", run, "--inferred", "Data Engineer"])
    run_cli(["prompts", "--run", run, "--phase", "panel"])
    run_cli(["submit", "ats", "--run", run], stdin="{}")
    run_cli(["submit", "ats", "--run", run], stdin="{}")
    run_cli(["submit", "hm", "--run", run], stdin="{}")
    run_cli(["submit", "hm", "--run", run], stdin="{}")
    run_cli(["aggregate", "--run", run])
    run_cli(["prompts", "--run", run, "--phase", "rewrite"])
    run_cli(["submit-rewrite", "--run", run], stdin=reply([], REWRITE_MD))
    assert run_cli(["finalize", "--run", run])[0] == 0
    code, chat = run_cli(["report", "--run", run])
    assert code == 0
    assert "target **inferred from the resume** (no --jd or --role): Data Engineer" in chat.splitlines()[0]
    assert "**No reviewer reached a decision.**" in chat and "(none)" in chat
    full = open(os.path.join(run, "report.md"), encoding="utf-8").read()
    assert "ats: NO DECISION" in full and "(the ATS reviewer reached no decision)" in full


def test_export_leaves_out_pii_and_absolute_paths(init_run, run_cli, cwd):
    run = run_quick_recheck(init_run, run_cli)
    run_cli(["recheck-init", "--run", run])
    dest = os.path.join(cwd, "exported")
    code, out = run_cli(["export", "--run", run, "--to", dest])
    assert code == 0 and "left out: input/pii.json" in out
    assert not os.path.exists(os.path.join(dest, "input", "pii.json"))
    assert os.path.exists(os.path.join(dest, "resume.tex")) and os.path.exists(os.path.join(dest, "recheck", "state.json"))
    for root, _, files in os.walk(dest):
        for fn in files:
            if fn.endswith((".json", ".md", ".txt")):
                text = open(os.path.join(root, fn), encoding="utf-8").read()
                assert cwd not in text and panel.posix(cwd) not in text, fn
    code, out = run_cli(["export", "--run", run, "--to", dest])
    assert code == 2 and "isn't empty" in out


def test_doctor_passes(run_cli):
    code, out = run_cli(["doctor"])
    assert code == 0 and "doctor: all required checks passed" in out
