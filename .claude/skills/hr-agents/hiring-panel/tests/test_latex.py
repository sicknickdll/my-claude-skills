import os
import re

import pytest

import panel

HOSTILE = r"50% & $3k #1 a_b ^ ~ {x} \input{/etc/passwd} \write18{calc} \immediate\openout [x] €1.2M · é —"


def body(tex):
    return tex.split("\\begin{document}\n", 1)[1]


# -- escaping ------------------------------------------------------------------

def test_tex_escape_leaves_no_live_command_or_special():
    out = panel.tex_escape(HOSTILE)
    for cmd in ("input", "write18", "immediate", "openout"):
        assert "\\" + cmd not in out
    # every backslash left is one we emitted: \textbackslash, \textasciicircum, \textasciitilde or an escape
    rest = re.sub(r"\\(textbackslash|textasciicircum|textasciitilde)\{\}|\\[%&$#_{}]", "", out)
    assert "\\" not in rest and not re.search(r"(?<!\\)[%&$#_^]", out)
    assert "€1.2M · é —" in out and "{[}x{]}" in out


def test_control_characters_are_dropped():
    assert panel.tex_escape("a\x00b\x1bc\td") == "abc\td"


def test_brackets_cannot_become_an_optional_argument():
    tex = panel.md_to_latex("## S\n- [x] done\n")
    assert r"\item{} {[}x{]} done" in tex


def test_inline_markup_and_fill_in():
    tex = panel.md_to_latex("Built **40 jobs** in *Airflow* [FILL IN: 50% saved] [site](https://x.dev/a_b)\n")
    assert r"Built \textbf{40 jobs} in \textit{Airflow} \fillin{FILL IN: 50\% saved} site (https://x.dev/a\_b)\par" in tex


# -- layout ----------------------------------------------------------------------

MD = """# Robin Claes
robin@example.com | +32 470 00 00 00

## Experience

### Frontend Developer, Brightwave (2021 - present)
- Built a design system
- Mentored juniors

Plain paragraph.
---
## Languages
Dutch: C2
"""


def test_structure():
    b = body(panel.md_to_latex(MD))
    assert b.splitlines() == [
        r"{\LARGE\bfseries Robin Claes\par}\smallskip",
        r"robin@example.com | +32 470 00 00 00\par",
        r"\section*{Experience}",
        r"\subsection*{Frontend Developer, Brightwave (2021 - present)}",
        r"\begin{itemize}", r"\item{} Built a design system", r"\item{} Mentored juniors", r"\end{itemize}",
        r"Plain paragraph.\par",
        r"\section*{Languages}",
        r"Dutch: C2\par",
        r"\end{document}",
    ]


@pytest.mark.parametrize("paper,lang,needles", [
    ("A4", "en", ["a4paper", "margin=1.8cm", "[shorthands=off,english]{babel}", "pdftitle={CV Robin Claes}"]),
    ("Letter", "nl", ["letterpaper", "margin=0.7in", "[shorthands=off,dutch]{babel}", "pdftitle={Resume Robin Claes}"]),
    ("A4", "unknown", ["[shorthands=off,english]{babel}"]),
])
def test_paper_language_and_metadata(paper, lang, needles):
    tex = panel.md_to_latex(MD, paper, lang)
    for n in needles:
        assert n in tex, n


# -- engines -----------------------------------------------------------------------

def test_engine_override(monkeypatch):
    monkeypatch.setenv("HIRING_PANEL_TEX", "none")
    assert panel.find_tex_engine() is None
    monkeypatch.setenv("HIRING_PANEL_TEX", "surely-not-a-tex-engine")
    assert panel.find_tex_engine() is None


def test_build_pdf_without_engine(tmp_path):
    tex = tmp_path / "resume.tex"
    tex.write_text(panel.md_to_latex(MD), encoding="utf-8")
    pdf, engine, err = panel.build_pdf(str(tex), str(tmp_path / "latex.log"))
    assert pdf is None and engine is None and "no TeX engine found" in err


def _real_engine(monkeypatch):
    monkeypatch.delenv("HIRING_PANEL_TEX", raising=False)
    if not panel.find_tex_engine():
        pytest.skip("no TeX engine on PATH")


@pytest.mark.parametrize("lang", ["en", "nl", "fr"])
def test_compiles_hostile_text_to_a_readable_pdf(monkeypatch, tmp_path, lang):
    _real_engine(monkeypatch)
    md = MD + ("## Edge cases\n- " + HOSTILE + " **bold** [FILL IN: number]\n"
               "- Dutch: [FILL IN: verify — \"C2\" not in original] `tick` ; ! ? [site](https://x.dev)\n")
    tex = tmp_path / "resume.tex"
    tex.write_text(panel.md_to_latex(md, "A4", lang), encoding="utf-8")
    pdf, engine, err = panel.build_pdf(str(tex), str(tmp_path / "latex.log"))
    assert err is None, open(tmp_path / "latex.log", encoding="utf-8").read()[-2000:]
    assert not (tmp_path / "resume.aux").exists() and not (tmp_path / "resume.log").exists()
    pages, readable = panel.pdf_check(pdf)
    if pages is None:
        pytest.skip("no PDF text extractor to read the result back")
    assert pages == 1 and readable
    text = "\n".join(panel._pdf_pages(pdf)[0])
    assert r"\input{/etc/passwd}" in text and r"\write18{calc}" in text and "€1.2M" in text
    assert "[FILL IN: number]" in text and "Robin Claes" in text and "site (https://x.dev)" in text
    assert "Dutch: [FILL IN: verify — \"C2\" not in original] `tick` ; ! ?" in text
    assert not os.path.exists("/etc/passwd") or "root:" not in text


def test_finalize_builds_the_pdf(init_run, run_cli, monkeypatch):
    from test_finalize import reply, to_rewrite
    _real_engine(monkeypatch)
    run, ids, _ = to_rewrite(init_run, run_cli)
    run_cli(["submit-rewrite", "--run", run], stdin=reply(ids))
    code, out = run_cli(["finalize", "--run", run])
    engine = panel.find_tex_engine()[0]
    assert code == 0 and "ok: wrote resume.tex, resume.pdf (%s) and changes.md" % engine in out, out
    assert "no PDF" not in out and os.path.exists(os.path.join(run, "resume.pdf"))
    assert panel.load_state(run)["pdf"] is True
    assert "resume.pdf, resume.tex, changes.md" in run_cli(["report", "--run", run])[1]
