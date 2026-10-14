**Hiring panel** · target **inferred from the resume** (no --jd or --role): Frontend Developer · region: BE (inferred: Belgian postcode and city) · language: en (inferred) · mode: full + recheck · reviewers: roster · seed 45245 · pile of 120 applications

**6 of 7 reviewers that reached a decision rejected**

ATS: most real applicant tracking systems rank and filter for a recruiter rather than auto-reject, so read the ATS reviewer as "would this surface". No score is given because none would be real.

| Stage | Reviewer | Verdict | Confidence |
|---|---|---|---|
| 1 screen | ATS screener | ADVANCE (PASS) | 3 |
| 1 screen | HR recruiter | REJECT | 4 |
| 2 manager | Hiring manager | REJECT (interview NO) | 4 |
| 3 team | Team lead | REJECT | 4 |
| 3 team | Senior peer | REJECT | 4 |
| 3 team | Rival applicant | REJECT | 4 |
| 4 final | CEO | REJECT | 4 |

**Issues, ranked**
1. ×7 · sev 3 · The experience bullets state duties with no result, metric, scale or technology. 'Improved the performance' tells a recruiter nothing, and 'Responsible for the frontend of several client projects' and 'Helped the juniors' are just as thin. Against 120 applications, nothing here separates this candidate from the rest, and it is the main reason a recruiter would pass. "Improved the performance of the main web app" (ats, hr, hm, lead, peer, applicant, ceo)
2. ×7 · sev 2 · A date of birth on a Belgian CV breaks the regional convention and brings no benefit. It exposes the candidate to age bias and is clutter for the recruiter. "Date of birth: {{PII_DOB}}" (ats, hr, hm, lead, peer, applicant, ceo)
3. ×2 · sev 2 · A generic summary of clichés ('hardworking', 'passionate' twice, 'team player') that every applicant uses. It says nothing about years of experience, specialisation or what the candidate offers the employer. 'Where I can grow' puts the candidate's needs first, and the emoji in the heading is out of place on a Belgian CV. "Hardworking and passionate frontend developer and team player with a passion for clean code and great user experiences. Looking for a new challenge where I can grow!" (applicant, ceo)
4. ×2 · sev 2 · Language levels are not on the CEFR scale. 'Very good' and 'basic' can't be compared against a posting's requirement, and for a Ghent employer French level often decides the shortlist. The dot ratings in the skills table (e.g. Node.js ●●○○○) have the same problem: they are subjective and show a weak spot without context. "Dutch: native · English: very good · French: basic" (hr, ats)
5. ×1 · sev 3 · This describes a duty, not what was done. It doesn't say how many projects, which stack, whether the candidate owned them alone or in a team, or whether they worked with designers, backend and QA. After about 5 years I can't judge whether this person can ship a feature by day 30 without hand-holding. 'Helped the juniors' and 'Worked on a React design system' are just as vague, and the design system line doesn't say what the candidate contributed. "Responsible for the frontend of several client projects" (lead)
6. ×1 · sev 2 · Self-rated dot scales tell a senior reader nothing and can hurt. A 3/5 for TypeScript on a frontend CV, next to a 5/5 for 'CSS / Sass', suggests this person is still weak in the language most React teams now require. Parsers drop the dot glyphs and the table, so the level information is lost anyway. The list also leaves out testing (Jest, Testing Library, Cypress or Playwright), Git, build tooling, accessibility and any named framework or router. The Vue internship and WordPress freelance work aren't connected to it. "| TypeScript | ●●●○○ |" (peer)
7. ×1 · sev 2 · A typical Frontend Developer posting searches on JavaScript, HTML, Git, testing, accessibility, responsive design, REST APIs and Agile. None of these terms appear anywhere in the resume, so keyword filters will rank it below candidates who list them. Four skills in total is a thin list for a candidate with about 5 years of experience. "Skills" (ats)
8. ×1 · sev 2 · The Skills section is a table with dot rating bars. A parser flattens it into 'React ●●●●○' strings, and the glyphs are noise. The self-ratings also hurt: TypeScript at 3/5 and Node.js at 2/5 invite a recruiter to screen on the weakest rating. The emoji in 'About me 🚀' and the non-standard heading 'Where I've worked' add further parse risk, since some systems look for 'Experience'. "| React | ●●●●○ |" (ats)

### I1 · impact · line
Quote: "Improved the performance of the main web app"
- ats (sev 3): The experience bullets state duties with no result, metric, scale or technology. 'Improved the performance' tells a recruiter nothing, and 'Responsible for the frontend of several client projects' and 'Helped the juniors' are just as thin. Against 120 applications, nothing here separates this candidate from the rest, and it is the main reason a recruiter would pass. Fix: Rewrite each bullet as action, tech and measured result, for example 'Cut Largest Contentful Paint from X s to Y s on the main React/TypeScript web app by code-splitting and image optimisation'. Add the number of client projects, the users or traffic served, the size of the design system and how many developers use it, and how many juniors were mentored.
- hr (sev 3): Every bullet in the current role is a task description with no result, stack or scale. 'Several client projects', 'main web app' and 'helped the juniors' tell a recruiter nothing, and a frontend performance claim without a number reads as filler. Against 120 applications, others will show a metric. A 2021-now role is the only real evidence of seniority, and it shows none. Fix: Rewrite each bullet as action + tech + measurable outcome, e.g. 'Cut Largest Contentful Paint on the main web app from X s to Y s via code-splitting and image optimisation (Lighthouse Z to W)'. Name the number of client projects, the team size, the design-system component count and adoption, and how many juniors you mentored.
- hm (sev 3): Five years of experience is described only as duties, with no outcome anywhere. 'Improved performance' gives no metric, no method and no sense of scale. 'Responsible for the frontend of several client projects' gives no number of projects, team size or stack. I can't tell whether this person owned the work or just contributed to it, and in a pile of 120 the candidates with measured results get the interviews. Fix: Rewrite each bullet as action, method and result, for example 'Cut Largest Contentful Paint on the main web app from 4.1s to 2.2s by code-splitting and image optimisation'. State the number of client projects, the team size and the stack for each. Drop 'Helped the juniors' or give it numbers (how many juniors, what changed).
- lead (sev 3): No metric, no method, no outcome. I can't tell whether this was a Lighthouse tweak or a real bundle-splitting and rendering overhaul. In a pile of 120 frontend CVs, a claim with no number is treated as filler. It is also the only bullet that suggests the candidate delivers measurable results. Fix: State what you measured, what you changed and the result, for example 'Cut LCP from 4.1s to 1.9s on the main app by code-splitting routes and lazy-loading images (React, Webpack)'. Do the same for the other bullets, adding a user, traffic or team-size number wherever you can.
- peer (sev 3): Five years of experience reduced to four vague bullets with no stack, no metric and no scope. I can't tell what was slow, what was changed (bundle splitting, memoisation, image handling, caching) or what the result was. 'Responsible for the frontend of several client projects' says nothing about size, team or difficulty. 'Helped the juniors' is filler. Against a pile of CVs that quote Lighthouse scores, load times and conversion changes, this reads as someone who can't show what they did. Fix: Rewrite each bullet as action, tool and result, e.g. 'Cut LCP on the main web app from 4.1s to 1.9s by code-splitting routes and lazy-loading images (React, Vite)'. Name the client types, team size, your part in the design system (components built, adoption, Storybook, a11y) and how you mentored the juniors (code reviews, pairing). If you don't have exact numbers, give honest approximate ones.
- applicant (sev 3): Every bullet under Brightwave Digital is a vague duty with no number, stack, scale or outcome. 'Improved performance' doesn't say what was slow, what changed or by how much. The strong resumes in this pile say things like 'cut LCP from 4.1s to 1.8s' or 'reduced bundle size by 40%'. After 5 years in the role this reads as junior-level ownership. Fix: Rewrite each Brightwave bullet as action + tech + measurable result. For example: 'Cut main web app LCP from X to Y by code-splitting and image optimisation (React, Vite), lifting Lighthouse score from A to B'. Do the same for the design system (number of components, teams, projects using it) and for the client projects (how many, what stack, what scale).
- ceo (sev 3): Five years of experience and not one number or outcome. I can't tell what was slow, what was done, or what changed for users or the business. 'Responsible for', 'worked on' and 'helped the juniors' describe duties, not results. Most of the 120 applications will be equally vague, and the ~10% that advance will show measurable impact. Fix: Rewrite each Brightwave bullet as action plus measurable result, e.g. 'Cut Largest Contentful Paint from 4.1s to 1.8s on the main web app by code-splitting and image optimisation, lifting checkout conversion X%'. Name the clients or product types, the team size, the design system's adoption (components, teams, hours saved) and how many juniors you mentored.

### I2 · region · line
Quote: "Date of birth: {{PII_DOB}}"
- ats (sev 2): A date of birth on a Belgian CV breaks the regional convention and brings no benefit. It exposes the candidate to age bias and is clutter for the recruiter. Fix: Delete the date of birth. Keep only name, city, phone, email and LinkedIn, and add a GitHub or portfolio link, which matters more for frontend roles.
- hr (sev 2): A date of birth on a Belgian CV breaks the local convention and invites age bias. It sits in the header, so a skim catches it immediately and reads it as someone unaware of norms. The 'About me 🚀' emoji heading adds to that impression. Fix: Delete the date of birth. Keep only name, city, phone, email and LinkedIn (plus GitHub or portfolio, which a frontend dev should show). Drop the emoji from the heading and use a plain 'Profile' heading.
- hm (sev 2): A date of birth on a Belgian CV breaks the local convention and signals the candidate doesn't know it. The same goes for language levels given as 'native · very good · basic' instead of CEFR (A1-C2), and for the emoji in the 'About me' heading. Each is small, but together they make the CV look careless in a pile where most applicants get these details right. Fix: Delete the date of birth. Give languages as 'Dutch: C2 · English: C1 · French: A2'. Remove the emoji and replace the generic 'Hardworking and passionate' summary with one line stating years of experience, stack and strongest result.
- lead (sev 2): Belgian CV convention is no date of birth or age, and it invites bias. The language line also doesn't use CEFR levels, so 'native', 'very good' and 'basic' can't be compared with the A1-C2 scale Belgian employers expect. The other presentation choices (an emoji in the 'About me' heading, dot-rating bars for skills) look unpolished and the bars are self-assessed numbers nobody can verify. Fix: Remove the date of birth. Write 'Dutch: C2 · English: C1 · French: A2' (use your real levels). Drop the emoji and replace the dot bars with a plain skills list grouped by use (React, TypeScript, CSS/Sass, Node.js), noting years of use or the project where you used each.
- peer (sev 2): A date of birth breaks Belgian CV convention and gives the reader nothing job-relevant. Together with the language line ('Dutch: native · English: very good · French: basic'), which has no CEFR levels, it shows the CV wasn't adapted to the Belgian market, where employers expect Dutch, French and English on the A1-C2 scale. Fix: Remove the date of birth. Change the languages line to CEFR levels, e.g. 'Dutch: C2 · English: C1 · French: A2'. Keep to one A4 page.
- applicant (sev 2): A Belgian CV should not include a date of birth, which invites age bias and is not expected. Language skills also don't use the CEFR scale ('Dutch: native · English: very good · French: basic'), which Belgian employers expect. The dot ratings in the skills table are self-assessed and unverifiable. Taken together, these show the candidate doesn't know local CV conventions, which costs ground against polished applicants. Fix: Delete the date of birth. Restate languages as 'Dutch: C2 · English: C1 · French: A2' (or the real levels). Replace the dot-rated skills table with a plain list of technologies grouped by area, for example 'React, TypeScript, Sass, Node.js', with years of use where helpful.
- ceo (sev 2): Date of birth on a Belgian CV breaks the convention and invites bias. The language line also uses 'native', 'very good' and 'basic' instead of CEFR levels, which Belgian employers expect to see for Dutch, French and English. Together these make the CV look unprepared for this market. Fix: Remove the date of birth. Write 'Dutch: C2 · English: C1 · French: A2' with your real levels. Keep the CV to one A4 page and drop the hobbies and 'References available on request' to make room for results.

### I3 · clarity · section
Quote: "Hardworking and passionate frontend developer and team player with a passion for clean code and great user experiences. Looking for a new challenge where I can grow!"
- applicant (sev 2): A generic summary of clichés ('hardworking', 'passionate' twice, 'team player') that every applicant uses. It says nothing about years of experience, specialisation or what the candidate offers the employer. 'Where I can grow' puts the candidate's needs first, and the emoji in the heading is out of place on a Belgian CV. Fix: Replace it with 2 concrete lines: years of experience, core stack, and one proof point. For example: 'Frontend developer with 5 years of React/TypeScript experience, building a design system and improving the performance of a production web app at an agency in Gent.' Remove the emoji.
- ceo (sev 2): Generic filler that every applicant writes. It says nothing about seniority, domain, scale or what I would get by hiring this person. The rocket emoji in the heading and 'Looking for a new challenge where I can grow!' read as junior and make me skim past the whole top of the page. Fix: Replace it with a 2-line factual summary: years of experience, stack (React, TypeScript, design systems), the kind of products built, and your strongest result. Delete the emoji and the 'grow' line.

### I4 · language · line
Quote: "Dutch: native · English: very good · French: basic"
- hr (sev 2): Language levels are not on the CEFR scale. 'Very good' and 'basic' can't be compared against a posting's requirement, and for a Ghent employer French level often decides the shortlist. The dot ratings in the skills table (e.g. Node.js ●●○○○) have the same problem: they are subjective and show a weak spot without context. Fix: Use CEFR levels, e.g. 'Dutch: C2 (native) · English: C1 · French: A2'. Replace the dot table with a plain-text skills line grouped by type (React, TypeScript, CSS/Sass, Node.js, plus the tools you really use, such as Git, testing, accessibility, CI) so a parser and a skimmer both read it.
- ats (sev 1): Belgian employers expect CEFR levels. 'very good' and 'basic' are not comparable levels, and French is often a screening criterion in Belgium. Fix: Write 'Dutch: native · English: C1 · French: A2' (or the real levels), and add a CV-based or certificate-based level if you have one.

### I5 · relevance · section
Quote: "Responsible for the frontend of several client projects"
- lead (sev 3): This describes a duty, not what was done. It doesn't say how many projects, which stack, whether the candidate owned them alone or in a team, or whether they worked with designers, backend and QA. After about 5 years I can't judge whether this person can ship a feature by day 30 without hand-holding. 'Helped the juniors' and 'Worked on a React design system' are just as vague, and the design system line doesn't say what the candidate contributed. Fix: Rewrite as specific deliverables: number and type of projects, tech used (React, TypeScript, testing, CI), your role, and the working setup (team size, code review, working with designers). For the design system, name what you built (components, tokens, Storybook, accessibility), how many components, and who adopted it.

### I6 · ats_parse · section
Quote: "| TypeScript | ●●●○○ |"
- peer (sev 2): Self-rated dot scales tell a senior reader nothing and can hurt. A 3/5 for TypeScript on a frontend CV, next to a 5/5 for 'CSS / Sass', suggests this person is still weak in the language most React teams now require. Parsers drop the dot glyphs and the table, so the level information is lost anyway. The list also leaves out testing (Jest, Testing Library, Cypress or Playwright), Git, build tooling, accessibility and any named framework or router. The Vue internship and WordPress freelance work aren't connected to it. Fix: Drop the dot ratings and the table. Use a plain grouped list, e.g. 'Languages: TypeScript, JavaScript, HTML, CSS/Sass. Frameworks: React, Vue. Tooling: Vite, Git, Jest/Testing Library, Storybook.' Put each skill inside a bullet where you used it. Be ready to show real TypeScript work, or leave out the weak rating.

### I7 · keywords · section
Quote: "Skills"
- ats (sev 2): A typical Frontend Developer posting searches on JavaScript, HTML, Git, testing, accessibility, responsive design, REST APIs and Agile. None of these terms appear anywhere in the resume, so keyword filters will rank it below candidates who list them. Four skills in total is a thin list for a candidate with about 5 years of experience. Fix: Add a complete, honest tech list covering JavaScript (ES6+), HTML5, Git, a testing tool if used (Jest, Cypress, Testing Library), accessibility, responsive design, REST/GraphQL APIs, build tools and Agile/Scrum. Also name the stack in the experience bullets, for example the design-system tooling (Storybook, npm package).

### I8 · ats_parse · section
Quote: "| React | ●●●●○ |"
- ats (sev 2): The Skills section is a table with dot rating bars. A parser flattens it into 'React ●●●●○' strings, and the glyphs are noise. The self-ratings also hurt: TypeScript at 3/5 and Node.js at 2/5 invite a recruiter to screen on the weakest rating. The emoji in 'About me 🚀' and the non-standard heading 'Where I've worked' add further parse risk, since some systems look for 'Experience'. Fix: Replace the table with a plain-text list grouped by category, with no ratings, for example 'Languages: TypeScript, JavaScript, HTML, CSS/Sass'. Remove the emoji. Rename the headings to 'Profile' and 'Work experience'.

Output: .hiring-panel/20261011-135435/ · resume.pdf, resume.tex, changes.md, report.md · 18 [FILL IN] to complete

**Before / after (recheck, same seed and pile)**

| Reviewer | Before | After |
|---|---|---|
| ATS screener | ADVANCE | ADVANCE |
| HR recruiter | REJECT | REJECT |
| Hiring manager | REJECT | ADVANCE |
| Team lead | REJECT | ADVANCE |
| Senior peer | REJECT | REJECT |
| Rival applicant | REJECT | REJECT |
| CEO | REJECT | REJECT |

Before: 6 of 7 reviewers that reached a decision rejected. After: 4 of 7 reviewers that reached a decision rejected.

## Keywords and knockouts

- Source: role_typical
- Found: Frontend, React, TypeScript, CSS, Sass, Node.js, Vue, design system, performance, WordPress, SEO
- Missing, required: JavaScript, HTML, Git
- Missing, preferred: unit testing, accessibility, responsive design, REST APIs, Agile/Scrum, CI/CD, Next.js
- Knockout: Degree in computer science or a related field (or equivalent experience): **met** ("Bachelor in Applied Computer Science (2016 - 2019)")
- Knockout: 2+ years of professional frontend experience: **met** ("Frontend Developer, Brightwave Digital, Gent (2021 - now)")
- Knockout: Dutch and English working proficiency (typical Belgian posting): **met** ("Dutch: native")

## Strengths

- "Worked on a React design system used by the whole team" (hm): This is the strongest line on the CV. A shared React design system is the kind of ownership-level frontend work I want at 4+ years, and it matches the React, TypeScript and CSS/Sass skills listed. It is undermined by 'Worked on', which doesn't show what the candidate actually did, and by having no adoption or impact figures.
- "Worked on a React design system used by the whole team" (ceo): It is the one line that shows leverage: shared infrastructure other people depend on, in the stack this role needs. It would stand out if it carried scope and measurable adoption.
- "Worked on a React design system used by the whole team" (lead): It is the one line that points to reusable, shared frontend work and to collaboration, and it fits a React scale-up team. It would carry real weight once it says what the candidate built and how many people or projects used it.
- "Worked on a React design system used by the whole team" (peer): A shared design system is real frontend scope: component API design, reuse and consistency across projects. It is the one line that points to craft beyond building pages. It still needs detail on the stack, what the candidate built and how widely it was adopted.
- "Worked on a React design system used by the whole team" (hr): It is the one bullet that shows real frontend scope, shared ownership and a modern React stack. It is directly relevant to a Frontend Developer posting and gives a recruiter something concrete to ask about, though it needs numbers to carry full weight.
- "Worked on a React design system used by the whole team" (applicant): It shows work beyond building pages: shared component infrastructure that others rely on. That is relevant to mid-level frontend roles. It would be stronger with numbers (how many components, how many projects).

## Discarded items and NO DECISION

(none)

## Rewrite checks

- [FILL IN] markers: 18
- numbers, dates or levels replaced because they weren't in the original: none

Honesty notes: the seed fixes the pile size, the persona variants and the order, not what the models answer. Reviewers ran in separate contexts and were told not to read other files; they aren't sandboxed.
