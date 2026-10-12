import copy
import json

import pytest

import panel

RESUME = """# {{PII_NAME}}

## Experience

### Data Engineer, Acme Logistics (03/2021 - present)

- Responsible for various data pipelines
- Moved 40 nightly jobs from cron to **Airflow**, cutting failed runs by 60%
- Built a Kafka consumer in JavaScript for the pricing dashboards

## Skills

Python, SQL, C#, Docker
"""
CATS = tuple(panel.load_roster()["categories"])


def ctx():
    return {"resume": RESUME, "quotes": panel.QuoteIndex(RESUME), "categories": CATS, "has_jd": True}


def issue(quote="Responsible for various data pipelines", **kw):
    d = {"quote": quote, "problem": "Says nothing about results.", "fix": "Name the pipeline and its outcome.",
         "severity": 3, "category": "impact", "scope": "line"}
    d.update(kw)
    return d


def persona(**kw):
    d = {"agent": "hr", "verdict": "REJECT", "confidence": 4,
         "issues": [issue(), issue("Built a Kafka consumer in JavaScript for the pricing dashboards", severity=2),
                    issue("## Skills", scope="whole", category="structure", severity=1)],
         "strength": {"quote": "cutting failed runs by 60%", "why": "A real, measured outcome."}}
    d.update(kw)
    return d


def V(obj, aid="hr", kind="persona", final=False):
    raw = obj if isinstance(obj, str) else json.dumps(obj)
    return panel.validate_reply(raw, aid, kind, ctx(), final=final)


def test_valid_persona_with_markdown_and_whitespace_in_quotes():
    r = V(persona(issues=[issue("Moved 40 nightly jobs from cron to Airflow,  cutting"), issue(), issue()]))
    assert r["status"] == "ok", r
    assert r["data"]["issues"][0]["quote"] == "Moved 40 nightly jobs from cron to **Airflow**, cutting"
    assert r["data"]["verdict"] == "REJECT"


def test_lenient_coercions_are_logged():
    obj = persona(verdict="reject", confidence="4")
    obj["issues"].append(issue())
    raw = "```json\n" + json.dumps(obj) + "\n```"
    r = V(raw)
    assert r["status"] == "ok"
    d = r["data"]
    assert d["confidence"] == 4 and d["verdict"] == "REJECT" and len(d["issues"]) == 3
    w = " ".join(r["warnings"])
    assert "code fence" in w and "read as 4" in w and "normalised to 'REJECT'" in w and "kept the first 3" in w


@pytest.mark.parametrize("mutate,needle", [
    (lambda d: "not json at all", "not valid JSON"),
    (lambda d: d.update(confidence=9), "confidence = 9 is out of range 1-5"),
    (lambda d: d.update(issues=d["issues"][:2]), "issues has 2 issues; it needs exactly 3"),
    (lambda d: d["issues"][0].update(problem=""), "issues[0].problem is missing or empty"),
    (lambda d: d["issues"][0].update(severity=4), "issues[0].severity = 4 is out of range 1-3"),
    (lambda d: d["issues"][0].update(category="vibes"), "issues[0].category = 'vibes' is not one of"),
    (lambda d: d.update(agent="hm"), "agent is 'hm' but this reply was submitted for 'hr'"),
    (lambda d: d.__delitem__("verdict"), "verdict is missing or empty"),
    (lambda d: d["issues"][1].update(problem="ATS score: 62/100, too low"), "numeric ATS/match score"),
    (lambda d: d["issues"][1].update(fix="Aim for a 90% match"), "numeric ATS/match score"),
    (lambda d: d.update(strength="great"), "strength must be an object"),
])
def test_hard_errors(mutate, needle):
    d = persona()
    res = mutate(d)
    r = V(res if isinstance(res, str) else d)
    assert r["status"] == "invalid" and r["data"] is None
    assert any(needle in e for e in r["errors"]), r["errors"]


def test_score_words_inside_quotes_are_allowed():
    resume_ok = persona()
    resume_ok["issues"][0]["problem"] = "No numbers anywhere, which hurts the match with the role."
    assert V(resume_ok)["status"] == "ok"


def test_near_match_quote_is_auto_corrected():
    r = V(persona(issues=[issue("Responsable for various data pipeline"), issue(), issue()]))
    assert r["status"] == "ok"
    assert r["data"]["issues"][0]["quote"] == "Responsible for various data pipelines"
    assert any("auto-corrected" in w for w in r["warnings"])


def test_unknown_quote_is_soft_then_dropped_on_final_attempt():
    bad = persona(issues=[issue("Led a team of 12 engineers"), issue(), issue()],
                  strength={"quote": "Won the Turing award", "why": "x"})
    r = V(bad)
    assert r["status"] == "soft" and len(r["soft_errors"]) == 2
    f = V(bad, final=True)
    assert f["status"] == "ok" and f["data"]["verdict"] == "REJECT"
    assert len(f["data"]["issues"]) == 2 and f["data"]["strength"] is None
    assert [d["type"] for d in f["dropped"]] == ["quote_not_found", "quote_not_found"]


def hm(**kw):
    d = {"agent": "hm", "interview": "yes", "confidence": 3,
         "reasons": [dict(issue(), direction="for"), dict(issue(), direction="against"),
                     dict(issue("## Skills", scope="whole"), direction="Against")]}
    d.update(kw)
    return d


def test_hm_maps_interview_to_verdict():
    r = V(hm(), aid="hm", kind="hm")
    assert r["status"] == "ok" and r["data"]["verdict"] == "ADVANCE" and r["data"]["interview"] == "YES"
    bad = hm()
    bad["reasons"][0]["direction"] = "maybe"
    assert V(bad, aid="hm", kind="hm")["status"] == "invalid"


def ats(**kw):
    d = {"agent": "ats", "result": "FAIL", "confidence": 3,
         "knockouts": [{"requirement": "Dutch at a professional level", "status": "missing", "evidence_quote": None},
                       {"requirement": "Airflow in production", "status": "met",
                        "evidence_quote": "Moved 40 nightly jobs from cron to Airflow"}],
         "keywords": {"source": "jd", "found": ["SQL"], "missing_required": ["Python", "Java", "dbt"],
                      "missing_preferred": ["C#", "Kubernetes", "Docker"]},
         "issues": [issue("## Skills", category="keywords", scope="section")]}
    d.update(kw)
    return d


def test_ats_valid_and_keywords_cleaned():
    r = V(ats(), aid="ats", kind="ats")
    assert r["status"] == "ok", r
    kw = r["data"]["keywords"]
    assert kw["missing_required"] == ["Java", "dbt"]          # Java != JavaScript
    assert kw["missing_preferred"] == ["Kubernetes"]           # C# and Docker are in the resume
    assert set(kw["found"]) == {"SQL", "Python", "C#", "Docker"}
    assert {d["keyword"] for d in r["dropped"]} == {"Python", "C#", "Docker"}
    assert r["data"]["knockouts"][1]["evidence_quote"] == "Moved 40 nightly jobs from cron to **Airflow**"


def test_ats_fail_needs_missing_knockout_or_severe_parse_issue():
    d = ats()
    d["knockouts"][0]["status"] = "unclear"
    r = V(d, aid="ats", kind="ats")
    assert r["status"] == "invalid" and "result FAIL needs" in r["errors"][0]
    d["issues"].append(issue("## Experience", category="ats_parse", scope="whole", severity=3))
    assert V(d, aid="ats", kind="ats")["status"] == "ok"
    p = copy.deepcopy(d)
    p["result"] = "PASS"
    assert V(p, aid="ats", kind="ats")["status"] == "ok"


def test_ats_met_needs_evidence_and_issue_bounds():
    d = ats()
    d["knockouts"][1]["evidence_quote"] = None
    assert "evidence_quote is required" in " ".join(V(d, aid="ats", kind="ats")["errors"])
    d = ats(issues=[])
    assert "issues has 0 issues; it needs 1-5" in " ".join(V(d, aid="ats", kind="ats")["errors"])


@pytest.mark.parametrize("kw,text,hit", [
    ("Java", "I write JavaScript", False), ("Java", "Java, SQL", True), ("C#", "C#, Docker", True),
    ("C", "C#, Docker", False), ("C++", "Python and C++.", True), (".NET", "ASP.NET Core", False),
    (".NET", "C# and .NET 8", True), ("machine learning", "Machine-learning models", True),
    ("SQL", "PostgreSQL", False), ("Node.js", "Node.js APIs", True),
])
def test_keyword_boundaries(kw, text, hit):
    assert panel.keyword_in(kw, text) is hit


def test_keywords_suggested_inside_fill_in_still_count_as_missing():
    resume = RESUME + "Tools: [FILL IN: only what you use, e.g. Git, Jest]\n"
    c = {"resume": panel.FILL_RE.sub(" ", resume), "quotes": panel.QuoteIndex(resume), "categories": CATS,
         "has_jd": False}
    obj = ats()
    obj["keywords"]["missing_required"] = ["Git", "Python"]
    r = panel.validate_reply(json.dumps(obj), "ats", "ats", c)
    assert r["data"]["keywords"]["missing_required"] == ["Git"]
