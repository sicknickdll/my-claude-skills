# hiring-panel

A Claude Code skill that puts your resume in front of an independent hiring panel. Seven reviewer sub-agents judge it the way a real pile gets judged: an ATS screener, a hiring manager and five personas (HR recruiter, team lead, senior peer, rival applicant, CEO). A stdlib Python script validates and aggregates their verdicts deterministically. Then a rewrite agent improves the resume without inventing anything. You get the new resume as LaTeX and a compiled PDF, a change log and a short report.

## Install

Paste this into Claude Code:

> `https://github.com/Maxikozie/hiring-panel`. Install this skill, then confirm /hiring-panel works.

Or do it by hand:

```bash
git clone https://github.com/Maxikozie/hiring-panel ~/.claude/skills/hiring-panel
```

If the folder already exists, update it instead:

```bash
git -C ~/.claude/skills/hiring-panel pull
```

Check the install. It checks Python 3.9+, the roster, rendering every brief, which PDF/DOCX extractors are present and which TeX engine will build the PDF:

```bash
python ~/.claude/skills/hiring-panel/scripts/panel.py doctor
```

On Windows, if `python` opens the Microsoft Store, use `py -3` instead.

Type `/hiring-panel` in Claude Code. It should be listed: skills in `~/.claude/skills/` are picked up live. If `~/.claude/skills/` didn't exist when your session started, run `/reload-skills` once.

## Usage

```text
/hiring-panel <resume> [--jd file|url|text] [--role "title"] [--region be|eu|us|auto]
              [--lang en|nl|fr] [--reviewers sonnet|opus|inherit] [--quick] [--recheck] [--seed N]
```

| Flag | Meaning |
|---|---|
| `<resume>` | `.pdf`, `.docx`, `.md` or `.txt`. Paths with spaces work unquoted when the joined path exists. With no file, paste the resume in the chat and Claude saves it first. |
| `--jd` | The job description: a file, an `http(s)` URL or pasted text (40+ words). An unquoted value runs until the next flag. |
| `--role` | A job title, when you have no job description. Without `--jd` or `--role`, Claude infers the title from the resume and the report says so up front. |
| `--region` | `be`, `eu`, `us` or `auto` (the default: inferred from phone prefix, postcode and country, before anything is redacted). |
| `--lang` | Language of the rewrite. The default is the resume's own language. |
| `--reviewers` | Model for the 7 reviewers in this run: `sonnet` (default), `opus` or `inherit` (your session model). The rewrite always uses your session model. |
| `--quick` | Only the ATS screener and the hiring manager, then the rewrite. |
| `--recheck` | After the rewrite, run the full panel again on the new version and show before and after. |
| `--seed` | Reproduce the pile size, persona variants and order of an earlier run. |

Examples:

```text
/hiring-panel cv.pdf --jd https://jobs.example.com/frontend-123
/hiring-panel "My CV.docx" --role "Medior Frontend Developer" --region be --recheck
/hiring-panel examples/sample-resume.md --jd examples/sample-jd.md --quick
```

Wrong flags fail fast with a specific message, such as `--region needs a value: be|eu|us|auto`, `unknown --region 'xx'` or `give either --jd or --role, not both`. Nothing runs until the arguments are clean.

## What happens

1. **Init**: `panel.py` extracts and cleans the text and detects the language. It infers the region, replaces your contact details with tokens like `{{PII_NAME}}` and `{{PII_PHONE}}`, and measures ATS signals: columns, tables, text boxes, header/footer text, icons, rating bars, non-standard headings, hidden text and embedded instructions.
2. **Briefs**: each reviewer gets one self-contained brief with its lens, the region rules, the schema and the redacted resume, marked as data, not instructions. Every reviewer is told the same thing: *"You have N applications for this role and roughly 10% advance. Is this one of them?"* N is drawn once per run from the seed.
3. **The wave**: all reviewers start in one message, each in a fresh context, and reply with one JSON object.
4. **Validation**: the script checks every reply. Small slips are fixed and logged: `"3"` becomes 3, `reject` becomes `REJECT`, a code fence is removed. Quotes that nearly match the resume are snapped to the real text. Invalid replies get exactly one retry with the exact errors, and after that the agent is NO DECISION. NO DECISION is never counted as a rejection.
5. **Aggregation**: issues are merged and ranked by how many reviewers raised them times their worst severity, with deterministic tie-breaks.
6. **Rewrite**: one agent rewrites the resume against the ranked issues. `finalize` then checks it:
   - Every number, percentage, amount, date and CEFR level must appear in your original. Anything else becomes `[FILL IN: verify — "…" not in original]`.
   - Every issue must be handled or explicitly marked as needing your input or as a real gap.
   - A missing keyword may only be added with evidence from the original.
   - Your name, email and phone must survive.
   - No tables, images, HTML or emoji.
7. **Output**, in `./.hiring-panel/<timestamp>/`:
   - `resume.tex` and `resume.pdf`: single column, TeX Gyre Heros 10pt, A4 or Letter, `[FILL IN]` in bold red. The script renders the checked rewrite into a fixed template and escapes every character of resume text, so nothing in a resume or job ad can run as a TeX command. The engine runs with shell escape off. The PDF is then read back to check that its text layer parses and to count its pages against the region's limit.
   - Without a TeX engine you still get `resume.tex`, and finalize says the PDF was skipped.
   - `changes.md`: every edit with who raised it.
   - `report.md`: the full report, with a short version in the chat.
   - The folder also holds every brief, raw reply, validation result and `panel.json`.

A committed real run is in [`examples/sample-run/`](examples/sample-run/), from `/hiring-panel examples/sample-resume.md --recheck`. The sample resume is fake and deliberately flawed.

## What "local" means

Your resume is not uploaded anywhere by this skill, but it is read by Claude: the redacted text goes to the Claude model as part of normal Claude Code use, like any file you show it. Before any agent sees it:

- Name, email, phone, address, LinkedIn, GitHub, personal URLs and date of birth are replaced by tokens.
- The real values stay in `input/pii.json` on your disk and are put back only in the final `resume.tex`, `resume.pdf` and `changes.md`.
- The script prints counts, never values.
- `.hiring-panel/.gitignore` contains `*`, so a run folder can't be committed by accident.

The only network call the script makes itself is fetching a `--jd` URL. Name detection is a heuristic anchored on your email address. When it isn't sure, Claude asks you once.

## Cost per mode

| Mode | Sub-agent calls |
|---|---|
| default | 8: 7 reviewers on Sonnet, rewrite on your session model |
| `--recheck` | 15: the above plus a 7-reviewer recheck |
| `--quick` | 3: ATS screener and hiring manager, plus the rewrite |
| `--quick --recheck` | 10: the recheck always runs the full panel |

A reply that fails validation gets one retry, so a run can use a few more calls. When Claude picks this skill on its own (you didn't type `/hiring-panel`), it shows this cost and asks first.

## Honesty notes

- **ATS**: there is no ATS score here, because none would be real. Most real ATSes parse, rank and filter for a recruiter rather than auto-reject. The ATS reviewer judges whether your resume parses cleanly and would surface for the role.
- **Seeds**: `--seed` reproduces the pile size, the persona variants (recruiter skim time, company stage, peer focus, rival archetype) and the order. It can't make model answers deterministic: two runs with the same seed can still disagree.
- **Isolation**: each reviewer runs in a fresh context, all of them start in one wave, and the briefs forbid opening other files. They are general-purpose agents, though, and can't be hard-sandboxed from reading the run folder. Reviewers write no files, which removes the easiest way to peek.
- **Personas are simulations.** Treat the verdicts as a stress test of your resume, not a prediction of any real hiring decision.

## Optional dependencies

The core is Python standard library only (3.9+). For PDFs it uses `pdftotext` from [poppler](https://poppler.freedesktop.org/) or [xpdf](https://www.xpdfreader.com/) when that's on your PATH, otherwise `pypdf` if installed. DOCX is parsed with the standard library, including text boxes, headers and footers. `python-docx` is only a fallback.

```bash
pip install pypdf python-docx
```

DOCX, Markdown and TXT need nothing extra. Scanned PDFs without a text layer are refused with a clear message, because an ATS can't read those either.

The output PDF needs a TeX engine on your PATH. The script uses the first of `tectonic`, `xelatex`, `lualatex` and `pdflatex` it finds. [Tectonic](https://tectonic-typesetting.github.io/) is a single program that downloads only the packages it needs on the first compile (so that first run needs a network connection):

```bash
# Windows: unzip tectonic.exe from the latest release at github.com/tectonic-typesetting/tectonic/releases onto your PATH
brew install tectonic      # macOS
cargo install tectonic     # anywhere with Rust
```

MiKTeX or TeX Live work too. Set `HIRING_PANEL_TEX` to an engine's name or path to pick one, or to `none` to skip the PDF.

## Permissions

The skill grants itself four narrow rules while it runs:

```text
Bash(python "${CLAUDE_SKILL_DIR}/scripts/panel.py" *)
Bash(py -3 "${CLAUDE_SKILL_DIR}/scripts/panel.py" *)
Bash(python3 "${CLAUDE_SKILL_DIR}/scripts/panel.py" *)
Edit(./.hiring-panel/**)
```

The Bash rules are anchored on the skill's own script path. A command that merely mentions `panel.py`, such as `python -c "…" # panel.py` or `py -3 -c "…" panel.py`, does not match. Chained commands (`;`, `&&`) and `$( )` substitution still ask. Agent replies and your raw arguments are written to files under `./.hiring-panel/` rather than passed through heredocs. Claude Code asks about heredocs that contain `#`, `$` or backticks, and resumes are full of those.

Claude Code clears a skill's grant when you send your next message. If the skill has to ask you something mid-run (cost confirmation, a missing resume, your name), the commands after your answer may ask for permission. To skip that, add the same rules to your settings with the path written out, for example in `~/.claude/settings.json`:

```json
{
  "permissions": {
    "allow": [
      "Bash(python \"/home/you/.claude/skills/hiring-panel/scripts/panel.py\" *)",
      "Edit(./.hiring-panel/**)"
    ]
  }
}
```

Use the path that `panel.py doctor` prints, with forward slashes. On Windows that looks like `C:/Users/you/.claude/...`, and the rule then starts with `Bash(py -3 \"C:/Users/you/...`.

## Troubleshooting

- **`Python can't see the current folder`**: you're in a Claude desktop session without a project folder, and Python was started through a Windows app alias, which runs outside the app's private storage. Open a real folder (the one with your resume) and run `/hiring-panel` there.
- **`python` opens the Microsoft Store**: that's the Windows Store stub. The skill falls back to `py -3`, then `python3`, on its own.
- **A PDF is refused for having no text layer**: it's a scanned image. Export a text PDF from the original document, or use the DOCX.

## Tests

```bash
cd ~/.claude/skills/hiring-panel
python -m pytest tests -q
```

The suite covers flag parsing, extraction (with a hand-built PDF through `pdftotext`), PII redaction, validation, submit and retry, NO DECISION, merging and ranking, the fabrication guard, finalize, LaTeX escaping and output, and the report wording. Tests that need `pypdf` or `python-docx` skip when those aren't installed. Most tests skip the PDF build; `tests/test_latex.py` compiles real PDFs in English, Dutch and French (including hostile text like `\input{...}`) when a TeX engine is on PATH, and skips otherwise.

## Uninstall

```bash
rm -rf ~/.claude/skills/hiring-panel
```

Run folders live in `./.hiring-panel/` inside the projects where you used the skill. Delete those too when you no longer need them: they hold your contact details in `input/pii.json`.

## License

MIT
