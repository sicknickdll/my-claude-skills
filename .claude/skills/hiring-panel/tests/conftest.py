import os
import sys

import pytest

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
sys.path.insert(0, os.path.join(ROOT, "scripts"))

import panel  # noqa: E402

FIXTURES = os.path.join(HERE, "fixtures")


@pytest.fixture
def fixtures():
    return FIXTURES


@pytest.fixture(autouse=True)
def no_tex(monkeypatch):
    """finalize writes resume.tex but skips the PDF build; test_latex.py compiles for real when it can."""
    monkeypatch.setenv("HIRING_PANEL_TEX", "none")


@pytest.fixture
def cwd(tmp_path, monkeypatch):
    """A clean working directory that the CLI sees as os.getcwd()."""
    monkeypatch.chdir(tmp_path)
    return str(tmp_path)


@pytest.fixture
def run_cli(monkeypatch, capsys):
    """Run `panel.py <args>` in-process with `stdin` text; return (code, stdout)."""
    import io

    def _run(args, stdin=""):
        data = stdin.encode("utf-8") if isinstance(stdin, str) else stdin
        fake = io.TextIOWrapper(io.BytesIO(data), encoding="utf-8")
        monkeypatch.setattr(sys, "stdin", fake)
        code = panel.main(list(args))
        return code, capsys.readouterr().out
    return _run


@pytest.fixture
def init_run(run_cli, cwd):
    """Copy the fixture resume (and JD) into the cwd and run init; return (run_abs, summary)."""
    import json
    import shutil

    shutil.copy(os.path.join(FIXTURES, "resume.md"), os.path.join(cwd, "resume.md"))
    shutil.copy(os.path.join(FIXTURES, "jd.md"), os.path.join(cwd, "jd.md"))

    def _init(args="resume.md --jd jd.md --seed 7", extra=()):
        code, out = run_cli(["init", *extra], stdin=args)
        assert code == 0, out
        summary = json.loads(out)
        return os.path.join(cwd, summary["run"]), summary
    return _init


FIXTURE_QUOTES = [
    "Responsible for various data pipelines",
    "Moved 40 nightly jobs from cron to Airflow, cutting failed runs by 60%",
    "Dutch (native), English (fluent), French (good)",
    "Passionate team player who loves clean code.",
    "## Skills",
]


def _issue(q, sev=2, cat="impact", scope="line", problem="Vague for this role.", fix="Make it concrete."):
    return {"quote": q, "problem": problem, "fix": fix, "severity": sev, "category": cat, "scope": scope}


def reply_for(aid, verdict="REJECT", confidence=3, issues=None):
    """A valid reply for the fixture resume (tests/fixtures/resume.md)."""
    import json
    issues = issues or [_issue(FIXTURE_QUOTES[0], 3), _issue(FIXTURE_QUOTES[3], 2, "clarity"),
                        _issue(FIXTURE_QUOTES[2], 2, "region", problem="Levels aren't CEFR.")]
    if aid == "ats":
        obj = {"agent": "ats", "result": "PASS" if verdict == "ADVANCE" else "FAIL", "confidence": confidence,
               "knockouts": [{"requirement": "Experience with AWS or GCP", "status": "missing", "evidence_quote": None}],
               "keywords": {"source": "jd", "found": ["Python", "SQL"], "missing_required": ["AWS", "GCP"],
                            "missing_preferred": ["dbt", "Terraform"]},
               "issues": issues}
    elif aid == "hm":
        obj = {"agent": "hm", "interview": "YES" if verdict == "ADVANCE" else "NO", "confidence": confidence,
               "reasons": [dict(i, direction="against") for i in issues[:2]]
               + [dict(_issue(FIXTURE_QUOTES[1], 2, "impact", problem="A real result.", fix="Keep it."),
                       direction="for")]}
    else:
        obj = {"agent": aid, "verdict": verdict, "confidence": confidence, "issues": issues,
               "strength": {"quote": FIXTURE_QUOTES[1], "why": "Concrete and measured."}}
    return json.dumps(obj)


def write(path, text):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8", newline="\n") as f:
        f.write(text)
    return path


def _pdf_str(s):
    out = []
    for b in s.encode("cp1252"):
        c = chr(b)
        if c in "()\\":
            out.append("\\" + c)
        elif 32 <= b < 127:
            out.append(c)
        else:
            out.append("\\%03o" % b)
    return "(" + "".join(out) + ")"


def make_pdf(path, pages):
    """A minimal hand-built PDF with a real text layer (Helvetica, WinAnsi).

    `pages` is a list of pages; a page is a list of (x, y, text) or plain lines.
    """
    objs = ["<< /Type /Catalog /Pages 2 0 R >>", None,
            "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>"]
    kids = []
    for page in pages:
        ops = ["BT /F1 10 Tf"]
        y = 780
        for item in page:
            if isinstance(item, tuple):
                x, yy, t = item
            else:
                x, yy, t = 60, y, item
                y -= 14
            ops.append("1 0 0 1 %d %d Tm %s Tj" % (x, yy, _pdf_str(t)))
        ops.append("ET")
        stream = "\n".join(ops).encode("latin-1")
        objs.append("<< /Length %d >>\nstream\n%s\nendstream" % (len(stream), stream.decode("latin-1")))
        content_id = len(objs)
        objs.append("<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents %d 0 R "
                    "/Resources << /Font << /F1 3 0 R >> >> >>" % content_id)
        kids.append(len(objs))
    objs[1] = "<< /Type /Pages /Kids [%s] /Count %d >>" % (" ".join("%d 0 R" % k for k in kids), len(kids))
    out = bytearray(b"%PDF-1.4\n")
    offsets = []
    for i, body in enumerate(objs, 1):
        offsets.append(len(out))
        out += ("%d 0 obj\n%s\nendobj\n" % (i, body)).encode("latin-1")
    xref = len(out)
    out += ("xref\n0 %d\n0000000000 65535 f \n" % (len(objs) + 1)).encode()
    for off in offsets:
        out += ("%010d 00000 n \n" % off).encode()
    out += ("trailer << /Size %d /Root 1 0 R >>\nstartxref\n%d\n%%%%EOF\n" % (len(objs) + 1, xref)).encode()
    with open(path, "wb") as f:
        f.write(bytes(out))
    return path


W = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"'
MC = 'xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006"'


def make_docx(path, body_xml, header_xml=None, extra=None):
    """A hand-built .docx: body_xml goes inside <w:body>."""
    import zipfile
    files = {
        "[Content_Types].xml": '<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/'
                               'package/2006/content-types"><Default Extension="xml" ContentType="application/xml"/>'
                               '</Types>',
        "word/document.xml": '<?xml version="1.0" encoding="UTF-8"?><w:document %s %s><w:body>%s</w:body>'
                             '</w:document>' % (W, MC, body_xml),
    }
    if header_xml:
        files["word/header1.xml"] = '<?xml version="1.0"?><w:hdr %s>%s</w:hdr>' % (W, header_xml)
    files.update(extra or {})
    with zipfile.ZipFile(path, "w") as z:
        for n, data in files.items():
            z.writestr(n, data)
    return path


def p(text, bullet=False):
    ppr = '<w:pPr><w:numPr><w:ilvl w:val="0"/><w:numId w:val="1"/></w:numPr></w:pPr>' if bullet else ""
    return '<w:p>%s<w:r><w:t xml:space="preserve">%s</w:t></w:r></w:p>' % (ppr, text)
