import os

import pytest

import panel
from conftest import write

JD_TEXT = ("We're hiring a data engineer to build and run our pipelines. You'll own ingestion, "
           "modelling and quality checks, work with analysts and product owners, and help the "
           "team move from nightly batches to streaming. You know Python and SQL well, have run "
           "Airflow or a similar scheduler in production, and like l'esprit d'équipe.")


@pytest.fixture
def resume(cwd):
    return write(os.path.join(cwd, "cv.pdf"), "x")


def P(raw, cwd):
    return panel.parse_args(raw, cwd)


def err(raw, cwd):
    with pytest.raises(panel.ArgError) as e:
        panel.parse_args(raw, cwd)
    return str(e.value)


# -- tokenizer ---------------------------------------------------------------

def test_tokenizer_keeps_apostrophes_and_backslashes():
    toks = [t.text for t in panel.tokenize(r"we're l'entreprise C:\Users\me\cv.pdf")]
    assert toks == ["we're", "l'entreprise", r"C:\Users\me\cv.pdf"]


def test_tokenizer_quotes_group():
    toks = panel.tokenize('"My CV.pdf" \u201cSenior Dev\u201d \'Data Eng\' \'s-Hertogenbosch')
    assert [t.text for t in toks] == ["My CV.pdf", "Senior Dev", "Data Eng", "'s-Hertogenbosch"]
    assert [t.quoted for t in toks] == [True, True, True, False]


def test_tokenizer_unbalanced_double_quote_is_literal():
    assert [t.text for t in panel.tokenize('he said "great team')] == ["he", "said", '"great', "team"]


# -- defaults and sources ----------------------------------------------------

def test_defaults_are_marked_default(cwd, resume):
    o = P("cv.pdf", cwd)
    assert o["resume"] == resume
    assert o["region"] == {"value": "auto", "source": "default"}
    assert o["lang"]["source"] == "default" and o["seed"]["value"] is None
    assert o["reviewers"] == {"value": None, "source": "default"}
    assert not o["quick"] and not o["recheck"] and o["needs_resume"] is None


def test_all_flags(cwd, resume):
    o = P('cv.pdf --role "Data Engineer" --region BE --lang nl --reviewers opus --quick --recheck --seed 42', cwd)
    assert o["role"] == "Data Engineer"
    assert o["region"] == {"value": "be", "source": "flag"}
    assert o["lang"] == {"value": "nl", "source": "flag"}
    assert o["reviewers"] == {"value": "opus", "source": "flag"}
    assert o["seed"] == {"value": 42, "source": "flag"}
    assert o["quick"] and o["recheck"]


def test_equals_form_and_em_dash(cwd, resume):
    o = P("cv.pdf --region=us \u2014seed 7", cwd)
    assert o["region"]["value"] == "us" and o["seed"]["value"] == 7


# -- omitted vs missing vs invalid -------------------------------------------

@pytest.mark.parametrize("raw", ["cv.pdf --region", "cv.pdf --region --quick"])
def test_region_missing_value(cwd, resume, raw):
    assert err(raw, cwd) == "--region needs a value: be|eu|us|auto"


def test_region_invalid_value(cwd, resume):
    assert err("cv.pdf --region xx", cwd) == "unknown --region 'xx' (expected be|eu|us|auto)"


@pytest.mark.parametrize("raw,msg", [
    ("cv.pdf --reviewers", "--reviewers needs a value: sonnet|opus|inherit"),
    ("cv.pdf --reviewers haiku", "unknown --reviewers 'haiku' (expected sonnet|opus|inherit)"),
    ("cv.pdf --lang de", "unknown --lang 'de' (expected en|nl|fr)"),
    ("cv.pdf --seed abc", "--seed must be an integer, got 'abc'"),
    ("cv.pdf --seed", "--seed needs a value: an integer"),
    ("cv.pdf --quick=yes", "--quick takes no value: just write --quick"),
    ("cv.pdf --recheck true", "--recheck takes no value: just write --recheck"),
    ("cv.pdf --region be --region us", "--region given twice"),
    ("cv.pdf --role", "--role needs a value: a job title"),
    ("cv.pdf --jd", "--jd needs a value: a file, URL or pasted text"),
])
def test_flag_errors(cwd, resume, raw, msg):
    assert err(raw, cwd) == msg


def test_unknown_flag(cwd, resume):
    assert err("cv.pdf --verbose", cwd).startswith("unknown flag '--verbose'")


def test_jd_and_role_conflict(cwd, resume):
    assert err('cv.pdf --role "Dev" --jd ' + JD_TEXT, cwd) == "give either --jd or --role, not both"


# -- resume path -------------------------------------------------------------

def test_resume_errors(cwd):
    write(os.path.join(cwd, "old.doc"), "x")
    write(os.path.join(cwd, "cv.rtf"), "x")
    os.mkdir(os.path.join(cwd, "folder"))
    assert err("missing.pdf", cwd) == "resume not found: missing.pdf"
    assert "is a folder" in err("folder", cwd)
    assert "save old.doc as .docx or PDF" in err("old.doc", cwd)
    assert "unsupported resume type '.rtf'" in err("cv.rtf", cwd)


def test_unquoted_path_with_spaces_is_accepted(cwd):
    p = write(os.path.join(cwd, "My CV.pdf"), "x")
    assert P("My CV.pdf --quick", cwd)["resume"] == p


def test_two_positionals_rejected(cwd, resume):
    assert "quote paths with spaces" in err("cv.pdf be", cwd)


def test_no_resume_and_pasted_resume_need_resume(cwd):
    assert P("--role Dev", cwd)["needs_resume"] == "no_resume_argument"
    pasted = " ".join(["Experienced engineer with Python and SQL."] * 10)
    assert P(pasted, cwd)["needs_resume"] == "pasted_text_in_arguments"


def test_tilde_and_git_bash_paths(cwd):
    assert panel.norm_path("/c/Users/me/cv.pdf", cwd, windows=True) == os.path.normpath("C:/Users/me/cv.pdf")
    assert panel.norm_path("~/cv.pdf", cwd) == os.path.normpath(os.path.join(os.path.expanduser("~"), "cv.pdf"))


def test_windows_backslash_path(cwd):
    p = write(os.path.join(cwd, "sub", "cv.md"), "x")
    assert P(os.path.join(cwd, "sub", "cv.md"), cwd)["resume"] == p


# -- --jd classification -----------------------------------------------------

def test_jd_unquoted_text_with_apostrophes_runs_to_next_flag(cwd, resume):
    o = P("cv.pdf --jd " + JD_TEXT + " --region be", cwd)
    assert o["jd"] == {"kind": "text", "value": JD_TEXT}
    assert o["region"]["value"] == "be"


def test_jd_unknown_dashes_inside_text_are_text(cwd, resume):
    o = P("cv.pdf --jd " + JD_TEXT + " --nice-to-have Kafka", cwd)
    assert o["jd"]["value"].endswith("--nice-to-have Kafka")


def test_jd_too_short(cwd, resume):
    assert err("cv.pdf --jd We need a dev", cwd).startswith("--jd text is only 4 words")


def test_jd_pathlike_missing(cwd, resume):
    assert err("cv.pdf --jd jobs/backend.pdf", cwd) == "--jd file not found: jobs/backend.pdf"


def test_jd_file_and_url(cwd, resume):
    jd = write(os.path.join(cwd, "jd.md"), JD_TEXT)
    assert P("cv.pdf --jd jd.md", cwd)["jd"] == {"kind": "file", "value": jd}
    assert P("cv.pdf --jd https://jobs.example.com/1", cwd)["jd"]["kind"] == "url"
    assert "http or https" in err("cv.pdf --jd ftp://x.example/jd", cwd)


def test_jd_text_ending_in_resume_file(cwd, resume):
    assert err("--jd " + JD_TEXT + " cv.pdf", cwd) == \
        "the --jd text ends in a file (cv.pdf): put the resume first or quote the JD"


def test_role_ending_in_resume_file(cwd, resume):
    assert "put the resume first or quote the role" in err("--role Data Engineer cv.pdf", cwd)


def test_quoted_jd_text(cwd, resume):
    o = P('cv.pdf --jd "' + JD_TEXT + '"', cwd)
    assert o["jd"]["kind"] == "text" and "We're hiring" in o["jd"]["value"]
