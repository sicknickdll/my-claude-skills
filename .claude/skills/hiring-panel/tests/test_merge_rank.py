import panel

ORDER = {"ats": 0, "hr": 1, "hm": 2, "lead": 3, "peer": 4, "applicant": 5, "ceo": 6}
STAGE = {"ats": 1, "hr": 1, "hm": 2, "lead": 3, "peer": 3, "applicant": 3, "ceo": 4}


def it(agent, quote, problem="Vague, no outcome.", sev=2, cat="impact", scope="line", conf=3, idx=0):
    return {"agent": agent, "stage": STAGE[agent], "order": ORDER[agent], "idx": idx, "confidence": conf,
            "quote": quote, "problem": problem, "fix": "Fix it.", "severity": sev, "category": cat, "scope": scope}


Q1 = "Responsible for various data pipelines"
Q2 = "Passionate team player who loves clean code."


def test_same_quote_same_category_merges_and_ranks_by_reviewers_times_severity():
    pool = [it("hr", Q1, sev=3), it("ceo", Q1, sev=2), it("peer", Q1, sev=2),
            it("lead", Q2, sev=3, cat="clarity")]
    out = panel.merge_issues(pool)
    assert [i["id"] for i in out] == ["I1", "I2"]
    assert out[0]["raised_by"] == ["hr", "peer", "ceo"] and out[0]["score"] == 9
    assert out[1]["raised_by"] == ["lead"] and out[1]["score"] == 3


def test_a_cluster_never_takes_two_issues_from_one_agent():
    out = panel.merge_issues([it("hr", Q1, idx=0), it("hr", Q1 + " daily", idx=1)])
    assert len(out) == 2


def test_whole_scope_same_category_merges_even_with_different_quotes():
    out = panel.merge_issues([it("hr", "## Experience", scope="whole", cat="impact"),
                              it("ceo", "## Skills", scope="whole", cat="impact"),
                              it("lead", "## Skills", scope="whole", cat="length")])
    assert sorted(len(i["raised_by"]) for i in out) == [1, 2]


def test_similar_quotes_need_shared_category_or_overlapping_problem():
    a = it("hr", Q1, problem="No numbers or results anywhere in this bullet", cat="impact")
    b = it("ceo", Q1, problem="No numbers or results anywhere in this line", cat="clarity")
    c = it("peer", Q1, problem="Python version is outdated", cat="relevance")
    out = panel.merge_issues([a, b, c])
    assert sorted(len(i["raised_by"]) for i in out) == [1, 2]


def test_containment_needs_five_tokens():
    long_q = "Moved 40 nightly jobs from cron to Airflow, cutting failed runs by 60%"
    assert panel.quotes_similar("Moved 40 nightly jobs from cron", long_q)
    assert not panel.quotes_similar("cron to Airflow", long_q)


def test_no_union_find_chaining():
    # b matches a's representative, c matches b but not a: c must start its own cluster
    a = it("hr", "alpha beta gamma delta epsilon", sev=3)
    b = it("lead", "alpha beta gamma delta epsilon zeta eta", sev=2)
    c = it("ceo", "beta gamma delta epsilon zeta eta theta", sev=1)
    assert panel.quotes_similar(a["quote"], b["quote"]) and panel.quotes_similar(b["quote"], c["quote"])
    assert not panel.quotes_similar(a["quote"], c["quote"])
    out = panel.merge_issues([c, b, a])
    assert [i["raised_by"] for i in out] == [["hr", "lead"], ["ceo"]]


def test_ties_break_deterministically():
    # equal score 2: summed severity, then summed confidence, then stage, then quote
    x = it("hr", "zzz last quote", sev=2, conf=5, cat="clarity")
    y = it("ceo", "aaa first quote", sev=2, conf=1, cat="structure")
    z = it("lead", "mmm middle quote", sev=2, conf=5, cat="gaps")
    out = panel.merge_issues([y, z, x])
    assert [i["raised_by"][0] for i in out] == ["hr", "lead", "ceo"]
    out2 = panel.merge_issues([x, y, z])
    assert [i["quote"] for i in out] == [i["quote"] for i in out2]
