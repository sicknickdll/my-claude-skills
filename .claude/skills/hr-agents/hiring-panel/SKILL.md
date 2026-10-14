---
name: hiring-panel
description: Runs a resume or CV past an independent hiring panel of sub-agents (an ATS screener, a hiring manager and five personas - recruiter, team lead, senior peer, rival applicant, CEO), aggregates their verdicts with a deterministic script, then rewrites the resume without inventing anything and writes it as LaTeX and a compiled PDF with a change log. Use when the user wants a resume or CV reviewed, roasted, screened against a job description or job title, checked for ATS problems, or improved for a specific job, or types /hiring-panel.
argument-hint: <resume.pdf|.docx|.md|.txt> [--jd file|url|text] [--role "title"] [--region be|eu|us|auto] [--lang en|nl|fr] [--reviewers sonnet|opus|inherit] [--quick] [--recheck] [--seed N]
license: MIT
metadata:
  author: Maxikozie
  version: 1.1.0
allowed-tools: Bash(python "${CLAUDE_SKILL_DIR}/scripts/panel.py" *), Bash(py -3 "${CLAUDE_SKILL_DIR}/scripts/panel.py" *), Bash(python3 "${CLAUDE_SKILL_DIR}/scripts/panel.py" *), Edit(./.hiring-panel/**)
---

# Hiring panel

A panel of independent reviewer sub-agents judges a resume against a pile of applications. A stdlib Python script, `panel.py`, owns every file: it validates each reply, aggregates the verdicts, checks the rewrite and writes the report. You orchestrate.

Ground rules:

- Run every `panel.py` step with the **Bash** tool, exactly as shown. Each command checks the phase order and ends with a `next:` line; when a command refuses with "can't run in phase", do what its `next:` says.
- **Never write, fix, trim or reformat an agent's reply.** Copy it into its reply file exactly as received, even when it looks broken. Validation decides, and a broken reply gets one retry.
- Never write a verdict, issue or rewrite yourself, and never show the contents of `input/pii.json`.
- The script prints counts, never personal details. Keep it that way in chat.

## Setup

**Script path.** Write the script as `"${CLAUDE_SKILL_DIR}/scripts/panel.py"`: the quotes, the forward slashes and the path exactly as shown. The skill's permission rules only match that form, so any other spelling makes every command ask for approval. If `${CLAUDE_SKILL_DIR}` above didn't expand into a real path, use `"<this skill's base directory>/scripts/panel.py"` instead.

**Python.** Run `python "${CLAUDE_SKILL_DIR}/scripts/panel.py" version`. If that fails, or prints "Python was not found" (the Windows Store stub), try `py -3 "${CLAUDE_SKILL_DIR}/scripts/panel.py" version`, then `python3 …`. Use the first one that prints `hiring-panel …` for every command below. Below, `PANEL` means that interpreter plus the quoted script path, e.g. `py -3 "${CLAUDE_SKILL_DIR}/scripts/panel.py"`.

**Files you write.** You write only under `./.hiring-panel/`, always with the **Write** tool (absolute paths) and never through Bash heredocs. Permission checks block heredocs that contain `#`, `$` or backticks, and resumes are full of those.

## 0. Size check

If the user typed `/hiring-panel`, go straight to step 1. If you chose this skill yourself, first write the arguments (step 1), run `PANEL cost --args-file .hiring-panel/args.txt`, show the cost line and ask once whether to go ahead. Typical costs: a full run is 8 sub-agent calls, `--recheck` adds 7, and `--quick` is 3.

## 1. Init

Write the raw arguments exactly as the user typed them to `<cwd>/.hiring-panel/args.txt` (Write tool; an empty file if there are none). The raw arguments, character for character:

```
$ARGUMENTS
```

Then run `PANEL init --args-file .hiring-panel/args.txt`. Init consumes the file, so write it again before every rerun.

- **Exit 0** prints a JSON summary. Remember `run`, the run folder; below it's `RUN`.
- **Exit 2** is a bad flag or file. Show the `error:` line to the user as is and stop.
- **Exit 3 `needs_resume`**: if the conversation has pasted resume text, write it verbatim to `save_pasted_resume_to`. Then write `args.txt` again with that path first plus the original flags, and rerun init. If there is no pasted resume, ask the user once for a file or the text.
- **Exit 4 `needs_name`**: ask the user once for the candidate's full name as written on the resume. Write `args.txt` again and rerun `PANEL init --args-file .hiring-panel/args.txt --candidate-name "<name>"`. Use `--candidate-name -` if the user says there is no name.

## 2. Target

If the summary has `"target": null` (no `--jd` or `--role`), Read `RUN/input/resume.txt`. Pick the job title the resume is aiming at: its headline, else the most recent title. Then run `PANEL set-role --run RUN --inferred "<title>"`. The report says the target was inferred.

## 3. Briefs

Run `PANEL prompts --run RUN --phase panel`. It prints JSON with `jobs`. Each job has `id`, `name`, `model`, `prompt` and `reply_file`. Don't read the briefs yourself.

## 4. The wave

In **one message**, make one Agent call per job, so the reviewers run in parallel and share no context:

- `subagent_type`: `general-purpose`
- `description`: `<name> review`
- `prompt`: the job's `prompt`, exactly. Add nothing to it.
- `model`: the job's `model`. Leave the parameter out when it is `null`.

Reviewers write no files. Each one replies with a single JSON object.

## 5. Submit and check

For each reply:

1. Write the reply exactly as received to the job's `reply_file` with the Write tool.
2. Run `PANEL submit <id> --run RUN`. It saves the reply, validates it and prints `ok`, `invalid` (with the reasons) or `no decision`.

Then run `PANEL check --run RUN` and act on every `next:` line:

- `prompts --retry <id> --run RUN` prints a retry job whose brief lists the exact errors. Spawn all retries in one message, then write and submit each reply as above. Each agent gets one retry. After that it counts as NO DECISION, which is never counted as a rejection.
- `spawn <id> again`: the agent returned nothing. Run `PANEL prompts --run RUN --phase panel` again, which lists only the agents with no reply yet, and spawn those. If an agent fails twice, write whatever came back (even an empty reply) and submit it.

Repeat `check` until it prints `ready: yes`.

## 6. Aggregate

Run `PANEL aggregate --run RUN`. It writes `panel.json`: NO DECISION handling, merged and ranked issues, keywords and strengths.

## 7. Rewrite

1. Run `PANEL prompts --run RUN --phase rewrite`. It prints one job: spawn it the same way, leaving `model` out when it is `null`.
2. Write the reply verbatim to its `reply_file` and run `PANEL submit-rewrite --run RUN`. It splits the reply into `<<<RESUME_MD>>>`, `<<<CHANGES_JSON>>>` and `<<<END>>>` sections.
3. Run `PANEL finalize --run RUN`. It neutralises any number, date or language level that isn't in the original into a `[FILL IN: …]` marker, checks the rest and renders it into a fixed LaTeX template (`resume.tex`). Then it compiles `resume.pdf` with the first TeX engine on PATH (tectonic, xelatex, lualatex or pdflatex), with shell escape off, and reads the PDF back to check the text layer and page count. It also writes `changes.md`. Never edit `resume.tex` yourself. If no engine is found or the compile fails, finalize still succeeds, says so in a `note:` line, and the build log is in `RUN/rewrite/latex.log`.

If `submit-rewrite` exits 1, or `finalize` exits 5, the rewrite gets **one** retry. Run `PANEL prompts --retry rewrite --run RUN`, spawn it, write the reply to the `reply_file`, run `submit-rewrite`, then `finalize`. After the retry, `finalize` goes ahead and lists whatever still fails.

## 8. Recheck (only with `--recheck`)

Run `PANEL recheck-init --run RUN`, then repeat steps 3–6 with `--run RUN/recheck`. The recheck always uses the full panel of 7, with the same seed and pile size, even after `--quick`. Finish with `PANEL compare --run RUN`.

## 9. Report

Run `PANEL report --run RUN` and show its output to the user exactly as printed. Add at most two lines of your own: no praise and no softening. Name the output files with links: `RUN/resume.pdf`, `RUN/resume.tex`, `RUN/changes.md` and `RUN/report.md`. Leave out `resume.pdf` when finalize said there is no PDF, and tell the user to install a TeX engine (`tectonic` is the smallest) and run `tectonic resume.tex` in the run folder. If there are `[FILL IN]` markers, say the user must fill them in before sending.

## Notes

- Region rules: be/eu means CV, 1–2 pages, A4, CEFR language levels, no photo or date of birth. us means one page under 10 years of experience, Letter size, no photo or date of birth. The panel and the rewrite both apply them.
- `--seed` fixes the pile size, the persona variants and the order, not what the models answer.
- The ATS reviewer judges whether the resume would surface for a recruiter. Never present any number as an "ATS score".
