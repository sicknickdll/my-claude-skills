import json
import os

import panel
from conftest import reply_for


def settle(run_cli, run, replies):
    for aid, raw in replies.items():
        for r in raw if isinstance(raw, list) else [raw]:
            run_cli(["submit", aid, "--run", run], stdin=r)


def start(init_run, run_cli, args):
    run, _ = init_run(args)
    run_cli(["prompts", "--run", run, "--phase", "panel"])
    return run


def test_no_decision_is_not_counted_as_a_loss(init_run, run_cli):
    run = start(init_run, run_cli, "resume.md --jd jd.md --seed 7")
    replies = {aid: reply_for(aid, "REJECT") for aid in ("ats", "hm", "hr", "lead")}
    replies["peer"] = reply_for("peer", "ADVANCE")
    replies["ceo"] = ["{}", "still not valid"]
    replies["applicant"] = [" ", "{}"]
    settle(run_cli, run, replies)
    code, out = run_cli(["aggregate", "--run", run])
    assert code == 0, out
    doc = json.load(open(os.path.join(run, "panel.json"), encoding="utf-8"))
    assert doc["headline"] == "4 of 5 reviewers that reached a decision rejected · 2 no decision (not counted)"
    assert {n["agent"] for n in doc["no_decision"]} == {"ceo", "applicant"}
    raised = {a for i in doc["issues"] for a in i["raised_by"]}
    assert "ceo" not in raised and "applicant" not in raised
    nd = [d for d in doc["decisions"] if d["verdict"] == "NO DECISION"]
    assert {d["agent"] for d in nd} == {"ceo", "applicant"} and all(d["confidence"] is None for d in nd)
    assert panel.load_state(run)["phase"] == "aggregated"


def test_all_no_decision_headline():
    ds = [{"verdict": "NO DECISION"}, {"verdict": "NO DECISION"}]
    assert panel.headline(ds) == "No reviewer reached a decision."
    assert panel.headline([{"verdict": "ADVANCE"}, {"verdict": "REJECT"}]) == \
        "1 of 2 reviewers that reached a decision rejected"


def test_aggregate_refuses_unsettled_agents_unless_forced(init_run, run_cli):
    run = start(init_run, run_cli, "resume.md --jd jd.md --quick --seed 2")
    run_cli(["submit", "ats", "--run", run], stdin=reply_for("ats"))
    code, out = run_cli(["aggregate", "--run", run])
    assert code == 2 and "hm isn't settled yet (no reply)" in out
    code, out = run_cli(["aggregate", "--run", run, "--force"])
    assert code == 0 and "1 of 1 reviewers that reached a decision rejected · 1 no decision" in out
    doc = json.load(open(os.path.join(run, "panel.json"), encoding="utf-8"))
    assert doc["no_decision"] == [{"agent": "hm", "reasons": ["no reply was submitted"]}]


def test_hm_for_reasons_become_strengths_not_issues(init_run, run_cli):
    run = start(init_run, run_cli, "resume.md --jd jd.md --quick --seed 2")
    settle(run_cli, run, {"ats": reply_for("ats"), "hm": reply_for("hm", "ADVANCE")})
    run_cli(["aggregate", "--run", run])
    doc = json.load(open(os.path.join(run, "panel.json"), encoding="utf-8"))
    hm = [d for d in doc["decisions"] if d["agent"] == "hm"][0]
    assert hm["verdict"] == "ADVANCE" and hm["native"] == "interview YES"
    assert [s["agent"] for s in doc["strengths"]] == ["hm"]
    hm_issues = [m for i in doc["issues"] for m in i["members"] if m["agent"] == "hm"]
    assert len(hm_issues) == 2
    assert doc["ats"]["keywords"]["missing_required"] == ["AWS", "GCP"]
