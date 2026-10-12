import json
import os

import panel
from conftest import reply_for


def start(init_run, run_cli, args="resume.md --jd jd.md --seed 7"):
    run, _ = init_run(args)
    code, out = run_cli(["prompts", "--run", run, "--phase", "panel"])
    assert code == 0, out
    return run


def test_submit_saves_reply_verbatim_and_validates(init_run, run_cli):
    run = start(init_run, run_cli)
    raw = reply_for("hr").replace('"agent"', '  "agent"') + "  \r\né\n"
    code, out = run_cli(["submit", "hr", "--run", run], stdin=raw.encode("utf-8"))
    with open(os.path.join(run, "outputs", "hr.json"), "rb") as f:
        assert f.read() == raw.encode("utf-8")
    # trailing junk after the object makes it invalid JSON: validation decides, nothing is "fixed"
    assert code == 1 and "invalid: hr (attempt 1)" in out and "not valid JSON" in out


def test_retry_renames_attempt1_and_third_attempt_is_refused(init_run, run_cli):
    run = start(init_run, run_cli)
    code, out = run_cli(["submit", "peer", "--run", run], stdin="Sure! Here is my review: REJECT")
    assert code == 1 and "next: prompts --retry peer" in out
    assert panel.load_state(run)["attempts"]["peer"] == 1

    code, out = run_cli(["prompts", "--run", run, "--retry", "peer"])
    assert code == 0, out
    brief = json.loads(out)["jobs"][0]["brief"]
    text = open(brief, encoding="utf-8").read()
    assert brief.endswith("prompts/peer.retry.md")
    assert "## Your previous reply was rejected" in text and "not valid JSON" in text
    assert "Sure! Here is my review: REJECT" in text

    code, out = run_cli(["submit", "peer", "--run", run], stdin=reply_for("peer"))
    assert code == 0 and out.startswith("ok: peer accepted (attempt 2)")
    outs = os.path.join(run, "outputs")
    assert open(os.path.join(outs, "peer.attempt1.json"), encoding="utf-8").read() == "Sure! Here is my review: REJECT"
    assert json.loads(open(os.path.join(outs, "peer.json"), encoding="utf-8").read())["agent"] == "peer"

    code, out = run_cli(["submit", "peer", "--run", run], stdin=reply_for("peer"))
    assert code == 2 and "a 3rd is refused" in out


def test_two_invalid_attempts_become_no_decision(init_run, run_cli):
    run = start(init_run, run_cli)
    run_cli(["submit", "ceo", "--run", run], stdin="{}")
    code, out = run_cli(["submit", "ceo", "--run", run], stdin="{}")
    assert code == 1 and out.startswith("no decision: ceo")
    assert json.load(open(os.path.join(run, "outputs", "ceo.result.json"), encoding="utf-8"))["status"] == "no_decision"


def test_soft_quote_errors_keep_attempt1_when_attempt2_is_broken(init_run, run_cli):
    run = start(init_run, run_cli)
    bad_quote = json.loads(reply_for("lead"))
    bad_quote["issues"][0]["quote"] = "Led a team of 12 engineers at Google"
    code, out = run_cli(["submit", "lead", "--run", run], stdin=json.dumps(bad_quote))
    assert code == 1 and "was not found in the resume" in out
    code, out = run_cli(["submit", "lead", "--run", run], stdin="garbage")
    assert code == 0 and "with dropped items" in out
    res = json.load(open(os.path.join(run, "outputs", "lead.result.json"), encoding="utf-8"))
    assert res["status"] == "ok_dropped" and res["used_attempt"] == 1
    assert len(res["data"]["issues"]) == 2 and res["data"]["verdict"] == "REJECT"


def test_submit_guards(init_run, run_cli):
    run, _ = init_run()
    code, out = run_cli(["submit", "hr", "--run", run], stdin=reply_for("hr"))
    assert code == 2 and "can't run in phase 'init'" in out
    run_cli(["prompts", "--run", run, "--phase", "panel"])
    code, out = run_cli(["submit", "intern", "--run", run], stdin=reply_for("hr"))
    assert code == 2 and "'intern' is not in this run's panel" in out
    code, out = run_cli(["submit", "hr", "--run", run], stdin=reply_for("hr"))
    assert code == 0
    code, out = run_cli(["submit", "hr", "--run", run], stdin=reply_for("hr"))
    assert code == 2 and "already settled" in out
    code, out = run_cli(["prompts", "--run", run, "--retry", "hr"])
    assert code == 2 and "no retry pending" in out


def test_quick_run_refuses_agents_outside_the_phase(init_run, run_cli):
    run = start(init_run, run_cli, "resume.md --jd jd.md --quick --seed 1")
    code, out = run_cli(["submit", "ceo", "--run", run], stdin=reply_for("ceo"))
    assert code == 2 and "not in this run's panel (agents: ats, hm)" in out


def test_check_gates_the_wave(init_run, run_cli):
    run = start(init_run, run_cli, "resume.md --jd jd.md --quick --seed 1")
    code, out = run_cli(["check", "--run", run])
    assert code == 1 and "ats        missing" in out and "ready: no" in out
    run_cli(["submit", "ats", "--run", run], stdin=reply_for("ats"))
    run_cli(["submit", "hm", "--run", run], stdin="nope")
    code, out = run_cli(["check", "--run", run])
    assert code == 1 and "hm         invalid (attempt 1)" in out and "prompts --retry hm" in out
    run_cli(["submit", "hm", "--run", run], stdin=reply_for("hm"))
    code, out = run_cli(["check", "--run", run])
    assert code == 0 and "ready: yes" in out and "next: aggregate" in out


def test_reply_is_read_from_the_inbox_file_and_consumed(init_run, run_cli):
    run, _ = init_run()
    code, out = run_cli(["prompts", "--run", run, "--phase", "panel"])
    jobs = {j["id"]: j for j in json.loads(out)["jobs"]}
    inbox = jobs["hr"]["reply_file"]
    assert inbox.endswith("/inbox/hr.txt") and os.path.isabs(inbox)
    raw = reply_for("hr").encode("utf-8") + b"\n"
    os.makedirs(os.path.dirname(inbox), exist_ok=True)
    with open(inbox, "wb") as f:
        f.write(raw)
    code, out = run_cli(["submit", "hr", "--run", run], stdin=b"")
    assert code == 0, out
    assert not os.path.exists(inbox)
    with open(os.path.join(run, "outputs", "hr.json"), "rb") as f:
        assert f.read() == raw


def test_missing_reply_is_an_error_not_an_attempt(init_run, run_cli):
    run, _ = init_run()
    run_cli(["prompts", "--run", run, "--phase", "panel"])
    code, out = run_cli(["submit", "hr", "--run", run], stdin=b"")
    assert code == 2 and "no reply found: write the agent's reply verbatim to" in out
    assert panel.load_state(run)["attempts"]["hr"] == 0


def test_rewrite_reply_from_inbox(init_run, run_cli):
    run, _ = init_run("resume.md --jd jd.md --quick --seed 4")
    run_cli(["prompts", "--run", run, "--phase", "panel"])
    run_cli(["submit", "ats", "--run", run], stdin=reply_for("ats"))
    run_cli(["submit", "hm", "--run", run], stdin=reply_for("hm"))
    run_cli(["aggregate", "--run", run])
    code, out = run_cli(["prompts", "--run", run, "--phase", "rewrite"])
    inbox = json.loads(out)["jobs"][0]["reply_file"]
    assert inbox.endswith("/inbox/rewrite.txt")
    with open(inbox, "w", encoding="utf-8") as f:
        f.write("<<<RESUME_MD>>>\n# {{PII_NAME}}\n<<<CHANGES_JSON>>>\n{\"edits\": []}\n<<<END>>>\n")
    code, out = run_cli(["submit-rewrite", "--run", run], stdin=b"")
    assert code == 0 and not os.path.exists(inbox)
    assert open(os.path.join(run, "rewrite", "resume.md"), encoding="utf-8").read() == "# {{PII_NAME}}\n"
