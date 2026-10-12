import json
import os
import re

import pytest

import panel
from conftest import reply_for

ORIGINAL = """# {{PII_NAME}}
{{PII_EMAIL}} | {{PII_PHONE}} | {{PII_URL_1}}

## Experience
Data Engineer, Acme (03/2021 - present), Junior Developer (09/2019 - 02/2021), since 2019
- Moved 40 nightly jobs to Airflow, cutting failed runs by 60%
- Managed a €1,200,000 budget over five years with Python 3 on AWS S3
## Languages
Dutch (native), English C1
"""


# -- fabrication guard ---------------------------------------------------------

def test_fabrication_guard_neutralises_only_new_facts():
    rewrite = ("Moved 45 nightly jobs (60%) since March 2021 and Jan 2019; in 2019 managed €1.2M for 5 years, "
               "Python 3, S3, EC2. Dutch: C2, English: C1. Cut costs by [FILL IN: % saved]. {{PII_URL_1}}\n"
               "1. Numbered item from 2019\n")
    out, bad = panel.fabrication_guard(ORIGINAL, rewrite)
    assert [b["token"] for b in bad] == ["45", "Jan 2019", "C2"]
    assert 'Moved [FILL IN: verify — "45" not in original] nightly jobs (60%) since March 2021' in out
    assert '[FILL IN: verify — "Jan 2019" not in original]' in out
    assert "Dutch: [FILL IN: verify — \"C2\" not in original], English: C1" in out
    assert "[FILL IN: % saved]" in out and "{{PII_URL_1}}" in out


@pytest.mark.parametrize("s,unit,expect", [
    ("1.200", None, {"1200", "1.2"}), ("1,500", None, {"1500", "1.5"}), ("2,5", None, {"2.5"}),
    ("5", "k", {"5", "5000"}), ("1.2", "M", {"1.2", "1200000"}), ("1 200 000", None, {"1200000"}),
])
def test_number_normalisation(s, unit, expect):
    assert panel.num_values(s, unit) == expect


def test_month_names_in_three_languages_match_numeric_dates():
    orig = "Werkte bij X van 03/2021 tot 11/2022"
    for rw in ("maart 2021 - november 2022", "mars 2021 - novembre 2022", "Mar 2021 - Nov. 2022", "2021-03"):
        assert panel.fabrication_guard(orig, rw)[1] == [], rw


# -- structural checks ---------------------------------------------------------

PANEL = {"issues": [{"id": "I1", "raised_by": ["hr", "ceo"]}, {"id": "I2", "raised_by": ["ats"]},
                    {"id": "I3", "raised_by": ["hm"]}],
         "ats": {"keywords": {"missing_required": ["Kubernetes"], "missing_preferred": ["AWS"]},
                 "knockouts": []}}
PII = {"{{PII_NAME}}": "A B", "{{PII_EMAIL}}": "a@b.c", "{{PII_PHONE}}": "0470", "{{PII_URL_1}}": "x.dev"}
GOOD_MD = "# {{PII_NAME}}\n{{PII_EMAIL}} | {{PII_PHONE}}\n\n## Experience\n- Moved 40 nightly jobs [FILL IN: team size]\n"
GOOD_CH = {"edits": [{"issue_ids": ["I1", "REGION"], "before": "x", "after": "y", "why": "z"}],
           "unaddressed": [{"issue_id": "I2", "kind": "needs_info", "reason": "n"},
                           {"issue_id": "I3", "kind": "real_gap", "reason": "g"}]}


def check(md=GOOD_MD, ch=GOOD_CH, region="be"):
    return panel.check_rewrite(ORIGINAL, md, ch, PANEL, PII, region, panel.load_roster())


def test_check_rewrite_passes_good_input():
    _, errs, warns, neutral = check()
    assert errs == [] and warns == [] and neutral == []


@pytest.mark.parametrize("md,ch,needle", [
    (GOOD_MD, {"edits": [], "unaddressed": []}, "issues not covered: I1, I2, I3"),
    (GOOD_MD, {"edits": [{"issue_ids": ["I9"], "after": "x"}], "unaddressed": []}, "unknown issue ID 'I9'"),
    (GOOD_MD, {"edits": [], "unaddressed": [{"issue_id": "I1", "kind": "later"}]}, "kind must be needs_info or real_gap"),
    (GOOD_MD.replace(" [FILL IN: team size]", ""), GOOD_CH, "needs_info items need a [FILL IN"),
    (GOOD_MD.replace("{{PII_PHONE}}", ""), GOOD_CH, "{{PII_PHONE}} is missing"),
    (GOOD_MD + "{{PII_GITHUB}}\n", GOOD_CH, "unknown token {{PII_GITHUB}}"),
    (GOOD_MD + "| a | b |\n", GOOD_CH, "ATS lint: tables"),
    (GOOD_MD + "<br>\n", GOOD_CH, "ATS lint: HTML"),
    (GOOD_MD + "![me](me.png)\n", GOOD_CH, "ATS lint: images"),
    (GOOD_MD + "- Python \U0001F40D\n", GOOD_CH, "ATS lint: icons or emoji"),
    (GOOD_MD + "- Skills: Kubernetes\n", GOOD_CH, "keyword 'Kubernetes' was added without evidence"),
])
def test_check_rewrite_structural_errors(md, ch, needle):
    errs = check(md, ch)[1]
    assert any(needle in e for e in errs), errs


def test_keywords_inside_fill_in_markers_are_not_claims():
    md = GOOD_MD + "- Tools: [FILL IN: only what you use, e.g. Kubernetes, AWS]\n"
    assert check(md)[1] == []
    assert check(GOOD_MD + "- Tools: Kubernetes [FILL IN: version]\n")[1] != []


def test_keyword_with_evidence_is_allowed_and_bad_evidence_is_not():
    ok = json.loads(json.dumps(GOOD_CH))
    ok["edits"].append({"issue_ids": ["I1"], "after": "Kubernetes", "added_keywords": ["Kubernetes"],
                        "evidence_quote": "Moved 40 nightly jobs to Airflow"})
    assert check(GOOD_MD + "- Kubernetes\n", ok)[1] == []
    ok["edits"][-1]["evidence_quote"] = "Ran our Kubernetes clusters"
    assert "without an evidence_quote found in the original" in " ".join(check(GOOD_MD + "- Kubernetes\n", ok)[1])


def test_length_is_a_warning_only():
    long_md = GOOD_MD + ("- " + "word " * 40 + "\n") * 30
    _, errs, warns, _ = check(long_md, region="us")
    assert errs == [] and warns and warns[0].startswith("length: about")


# -- marker split --------------------------------------------------------------

def test_split_rewrite():
    good = "<<<RESUME_MD>>>\n# {{PII_NAME}}\n<<<CHANGES_JSON>>>\n```json\n{\"edits\": []}\n```\n<<<END>>>\n"
    md, ch, errs, warns = panel.split_rewrite("Here you go:\n" + good + "bye")
    assert errs == [] and md == "# {{PII_NAME}}" and ch == {"edits": [], "unaddressed": []}
    assert len(warns) == 3
    assert panel.split_rewrite(good.replace("<<<END>>>", ""))[2] == ["missing marker <<<END>>>"]
    assert "appears 2 times" in panel.split_rewrite(good + "<<<END>>>")[2][0]
    swapped = "<<<CHANGES_JSON>>>\n{}\n<<<RESUME_MD>>>\nx\n<<<END>>>"
    assert "out of order" in panel.split_rewrite(swapped)[2][0]
    assert "not valid JSON" in panel.split_rewrite(good.replace('{"edits": []}', "{edits"))[2][0]
    assert "\"edits\" list" in panel.split_rewrite(good.replace('{"edits": []}', "[]"))[2][0]


# -- end to end: quick run through finalize --------------------------------------

def to_rewrite(init_run, run_cli):
    run, _ = init_run("resume.md --jd jd.md --quick --seed 4")
    run_cli(["prompts", "--run", run, "--phase", "panel"])
    run_cli(["submit", "ats", "--run", run], stdin=reply_for("ats"))
    run_cli(["submit", "hm", "--run", run], stdin=reply_for("hm"))
    assert run_cli(["aggregate", "--run", run])[0] == 0
    code, out = run_cli(["prompts", "--run", run, "--phase", "rewrite"])
    assert code == 0, out
    job = json.loads(out)["jobs"][0]
    assert job["model"] is None and job["prompt"] == panel.REWRITE_PROMPT.format(brief=job["brief"])
    ids = [i["id"] for i in json.load(open(os.path.join(run, "panel.json"), encoding="utf-8"))["issues"]]
    return run, ids, open(job["brief"], encoding="utf-8").read()


REWRITE_MD = """# {{PII_NAME}}
{{PII_ADDRESS}} | {{PII_PHONE}} | {{PII_EMAIL}} | {{PII_LINKEDIN}}

## Profile
Data engineer building batch and streaming pipelines in **Python** and SQL.

## Experience
### Data Engineer, Acme Logistics (03/2021 - present)
- Moved 40 nightly jobs from cron to Airflow, cutting failed runs by 60%
- Built [FILL IN: number] data pipelines for the pricing and finance teams
- Built a Kafka consumer that feeds the pricing team's dashboards

## Languages
Dutch: [FILL IN: CEFR level] · English: C1 · French: [FILL IN: CEFR level]
"""


def reply(ids, md=REWRITE_MD):
    ch = {"edits": [{"issue_ids": ids[:1] + ["REGION"], "before": "Responsible for various data pipelines",
                     "after": "Built [FILL IN: number] data pipelines", "why": "Concrete."}],
          "unaddressed": [{"issue_id": i, "kind": "needs_info", "reason": "Only the candidate knows."} for i in ids[1:]]}
    return "<<<RESUME_MD>>>\n%s<<<CHANGES_JSON>>>\n%s\n<<<END>>>\n" % (md, json.dumps(ch))


def test_rewrite_brief_lists_issues_strengths_and_rules(init_run, run_cli):
    run, ids, brief = to_rewrite(init_run, run_cli)
    for i in ids:
        assert re.search(r"(?m)^%s · raised by " % i, brief)
    assert "## Strengths to keep" in brief and "Missing, required: AWS, GCP" in brief
    assert "Never invent facts" in brief and "Write the whole resume in English" in brief
    assert "<<<RESUME_MD>>>" in brief and "Lotte" not in brief


def test_finalize_end_to_end_with_one_retry(init_run, run_cli):
    run, ids, _ = to_rewrite(init_run, run_cli)
    code, out = run_cli(["submit-rewrite", "--run", run], stdin="Sorry, here is the resume without markers")
    assert code == 1 and "missing marker <<<RESUME_MD>>>" in out and "prompts --retry rewrite" in out
    code, out = run_cli(["prompts", "--run", run, "--retry", "rewrite"])
    assert code == 0, out
    retry = open(json.loads(out)["jobs"][0]["brief"], encoding="utf-8").read()
    assert "## Your previous rewrite failed these checks" in retry and "missing marker" in retry

    code, out = run_cli(["submit-rewrite", "--run", run], stdin=reply(ids))
    assert code == 0 and "next: finalize" in out
    assert os.path.exists(os.path.join(run, "rewrite", "reply.attempt1.txt"))
    code, out = run_cli(["submit-rewrite", "--run", run], stdin=reply(ids))
    assert code == 2 and "a 3rd is refused" in out

    code, out = run_cli(["finalize", "--run", run])
    assert code == 0, out
    assert "neutralised 1 number/date/level token" in out
    assert "no PDF: no TeX engine found" in out
    assert not os.path.exists(os.path.join(run, "resume.md")) and not os.path.exists(os.path.join(run, "resume.docx"))
    tex = open(os.path.join(run, "resume.tex"), encoding="utf-8").read()
    assert r"{\LARGE\bfseries Lotte Vermeulen\par}" in tex
    assert "Kerkstraat 12, 9000 Gent | +32 470 12 34 56 | lotte.vermeulen@example.com" in tex
    assert "{{PII_" not in tex and r"English: \fillin{FILL IN: verify — \textquotedbl{}C1\textquotedbl{} not in original}" in tex
    assert r"\section*{Experience}" in tex and r"\item{} Moved 40" in tex and r"\textbf{Python}" in tex
    assert "a4paper" in tex and tex.rstrip().endswith(r"\end{document}")
    changes = open(os.path.join(run, "changes.md"), encoding="utf-8").read()
    assert "4 [FILL IN] markers to complete" in changes
    assert "(raised by " in changes and "## Needs your input" in changes and '"C1" (cefr)' in changes
    st = panel.load_state(run)
    assert st["phase"] == "finalized" and st["fill_in"] == 4 and st["pdf"] is False
    assert "resume.tex (no PDF" in run_cli(["report", "--run", run])[1]


def test_finalize_structural_failure_earns_one_retry(init_run, run_cli):
    run, ids, _ = to_rewrite(init_run, run_cli)
    run_cli(["submit-rewrite", "--run", run], stdin=reply(ids[:1]))
    code, out = run_cli(["finalize", "--run", run])
    assert code == 5 and "issues not covered" in out and "prompts --retry rewrite" in out
    assert run_cli(["prompts", "--run", run, "--retry", "rewrite"])[0] == 0
    # the retry still drops the phone token: finalize goes ahead best-effort and says so
    run_cli(["submit-rewrite", "--run", run], stdin=reply(ids, REWRITE_MD.replace("{{PII_PHONE}} | ", "")))
    code, out = run_cli(["finalize", "--run", run])
    assert code == 0 and "still failing after the retry: {{PII_PHONE}} is missing" in out
    body = open(os.path.join(run, "resume.tex"), encoding="utf-8").read().split("\\begin{document}\n")[1]
    assert "+32 470 12 34 56" in body.split("\n")[1]
