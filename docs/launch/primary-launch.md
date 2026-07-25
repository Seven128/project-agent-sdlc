# Primary Launch Packet

Snapshot date: 2026-06-10.

This is the copy-ready launch packet for the first public push after `project-tiny-context-harness@0.8.0` is published.

## Launch Decision

Primary first channel: Hacker News Show HN.

Why: after npm publish, the project will be immediately installable, the pitch is technical, and the most valuable early signal is whether experienced agent users recognize the recovery problem. Product Hunt should follow after a public demo GIF or video exists because its launch surface depends more on visual media and broad product clarity.

Do not post to multiple broad channels on the same day. Use the first channel to collect objections, then patch README, FAQ, demo or issues before the second channel.

## Preflight

Run these before posting:

```sh
npm run launch:check
npm run launch:strict-external
npm run launch:metrics -- --output tmp/ty-context/launch-metrics/show-hn-before.md
npm run launch:demo -- --out-dir tmp/ty-context/launch-demo/latest --package-spec project-tiny-context-harness@latest --clean
```

Confirm:

- `npm run launch:strict-external` passes; if npm ever returns 404 again, use `docs/launch/npm-publish-runbook.md` before broad posting.
- GitHub stars/forks and npm downloads baseline are recorded with `npm run launch:metrics`.
- npm `project-tiny-context-harness@0.8.0` is published and installable.
- The `v0.8.0` GitHub Release is published from [github-release-0.8.0.md](github-release-0.8.0.md); future npm Trusted Publishing real runs create or update this release automatically after publish.
- Issue #4 is pinned and open for adoption reports.
- Issue #5 has the current demo packet and repo-hosted GIF URL.
- README first screen still shows install, 60-second trial and non-goals.
- Public-facing copy is English-first; any Chinese or other non-English strings are clearly literal trigger examples, generated filenames or maintainer notes.
- [claims-boundary.md](claims-boundary.md) has been checked against the exact final Show HN, Product Hunt or Reddit text.
- Agent surface recipes are linked for Codex, Claude Code, Cursor, Gemini CLI, OpenCode and custom harness folders.
- Response templates in `docs/launch/response-templates.md` are open for AGENTS.md overlap, benchmark asks, stage-ceremony questions and feedback triage.
- No copy claims benchmark wins, adoption, awards or productivity multipliers.

## Show HN

Source: [Show HN guidelines](https://news.ycombinator.com/showhn.html), [HN FAQ](https://news.ycombinator.com/newsfaq.html), [HN guidelines](https://news.ycombinator.com/newsguidelines.html).

Recommended URL:

```text
https://github.com/Seven128/project-tiny-context-harness
```

Prefill URL for the HN submit form after login:

```text
https://news.ycombinator.com/submitlink?u=https%3A%2F%2Fgithub.com%2FSeven128%2Fproject-tiny-context-harness&t=Show%20HN%3A%20Tiny%20project%20memory%20for%20coding%20agents
```

Title:

```text
Show HN: Tiny project memory for coding agents
```

Submit the repository URL and title first. Do not put the long text below in the HN submit form; when a link needs context, the HN FAQ points submitters to add a regular comment after the story is live.

Before posting the comment, do one final maintainer pass so it sounds like you.

First comment after the story is live:

```text
I made this because I kept running into a boring problem: a coding agent can be useful in one chat, then a new chat has to rediscover the same project facts all over again.

Project Tiny Context Harness is a small npm package that adds a repo-native recovery surface:

- AGENTS.md stays a short startup router
- project_context/** keeps durable facts: goal, non-goals, boundaries, ownership and validation paths
- validate-context checks that the recovery surface exists and does not store fake "tests passed" notes

The earlier version of this project tried a heavier Tiny Context-style workflow. I removed that. For most small and medium tasks, the phase ceremony was the cost. The current version is just the memory layer.

It is not a task manager, spec generator, autonomous agent framework, or benchmark claim. It sits next to tests, CI, review and whatever agent you already use.

Try it:
npm install -D project-tiny-context-harness@latest
npx --yes --package project-tiny-context-harness@latest ty-context init
npx --no-install ty-context validate-context

Demo packet/transcript:
https://github.com/Seven128/project-tiny-context-harness/blob/main/docs/launch/demo.md

Long-form technical article:
https://github.com/Seven128/project-tiny-context-harness/blob/main/docs/articles/fresh-agent-project-memory.md

Adoption reports / missing facts:
https://github.com/Seven128/project-tiny-context-harness/issues/4

I would like feedback from people using Codex, Claude Code, Cursor, OpenCode or similar tools on real repos: what project facts do your agents keep rediscovering, and is this surface small enough that you would actually maintain it?
```

Comment if asked "How is this different from AGENTS.md?":

```text
AGENTS.md is the startup router. The part I found missing was a small maintained fact source behind it: project goal, non-goals, architecture boundary, ownership and repeatable validation paths. The harness keeps AGENTS.md short and uses validate-context to catch missing or misleading recovery facts.
```

For more comment replies, use [response-templates.md](response-templates.md).

Comment if asked "Isn't this just documentation?":

```text
Partly, yes. The bet is that the documentation surface has to be deliberately small, repo-native and maintained for fresh-agent recovery. It should not become a second spec system or task manager. The validator checks recoverability and false test claims, while product quality still belongs to the repo's own tests, CI and review.
```

Comment if asked for benchmarks:

```text
I am intentionally not claiming speedups yet. The old stage-heavy workflow was removed because it had obvious ceremony cost. The current claim is narrower: a minimal recovery surface is useful if agents repeatedly rediscover project intent and validation paths. Fresh benchmark work still has to be rerun against this minimal design.
```

## Product Hunt

Sources: [Product Hunt launch guide](https://www.producthunt.com/launch), [Preparing for Launch](https://www.producthunt.com/launch/preparing-for-launch), [How Product Hunt works](https://www.producthunt.com/launch/how-product-hunt-works).

Gate: wait for Show HN or first feedback unless there is a scheduling reason to move sooner. Repo-hosted Product Hunt media is ready under `docs/launch/assets/`, but the launch still needs a personal Product Hunt account, final draft review and same-day comment coverage.

Name:

```text
Project Tiny Context Harness
```

Tagline:

```text
Minimal project memory for AI coding agents
```

Topics:

```text
Developer Tools, Artificial Intelligence, Open Source
```

Description:

```text
Project Tiny Context Harness helps coding agents recover project intent across new chats, handoffs and debugging turns. It installs compact project_context files, AGENTS.md guidance and a validate-context gate without adding a full Tiny Context ceremony.
```

First comment:

```text
I built this for the boring failure mode of AI coding: the model is capable, but each new chat has to rediscover the project goal, architecture boundaries, validation commands and "do not change this" constraints.

Project Tiny Context Harness keeps those durable facts in the repo as Minimal Context. The idea is to keep the memory and drop the ceremony: no task state, phase gates or work-product trees by default. It is not a benchmark-proven productivity claim yet and it does not replace tests, CI or review.

I would like feedback from people using coding agents on real projects: what project facts should a fresh agent recover before it proposes code, and is this the smallest useful surface?
```

Media order:

1. `docs/launch/assets/product-hunt-gallery-1.png`
2. `docs/launch/assets/product-hunt-gallery-2.png`
3. `docs/launch/assets/product-hunt-thumbnail.png`
4. Optional YouTube demo video if recorded.

## Reddit / Niche Communities

Use only after the first broad post has at least a few comments or after the demo video is public. Pick communities where self-promotion rules allow project feedback posts.

Title:

```text
I made a minimal project-memory harness for AI coding agents
```

Body:

```text
I am working on Project Tiny Context Harness, an npm package for adding Minimal Context to a repo.

The idea is simple: new agent chats often lose project-specific context. Instead of adding a full Tiny Context workflow, the package keeps the memory and drops the ceremony: a small project_context fact source, AGENTS.md startup guidance and a validate-context gate so a fresh agent can recover intent, boundaries and validation paths.

It is meant to complement specs, tests, CI and code intelligence tools. It does not own task state or claim to replace review.

I would appreciate feedback from people using coding agents on non-trivial projects: what facts do your agents keep rediscovering, and would you want those facts maintained in the repo?
```

If the community expects an article rather than a product link, use `docs/articles/fresh-agent-project-memory.md` as the primary URL and keep the GitHub repo as the secondary link.

## Curated List PR

Use after a stable demo URL exists.

Candidate line:

```text
- [Project Tiny Context Harness](https://github.com/Seven128/project-tiny-context-harness) - Minimal repo-native project memory for AI coding agents. Installs project_context files, AGENTS.md guidance and a validate-context gate so fresh agent chats can recover project intent and validation paths.
```

PR note:

```text
This is a small npm/CLI tool for agent-context recovery rather than an autonomous coding agent. It fits best under developer tools, AI coding tools or context-engineering categories.
```

## 24-Hour Response Playbook

Use [feedback-triage.md](feedback-triage.md) for the full channel note template, issue rules, adoption-evidence rules and next-channel decision matrix.

Within 1 hour:

- Create the channel note: `npm run launch:feedback-note -- --channel show-hn --url <channel-url>`.
- Answer direct technical questions.
- Do not argue with dismissive comments.
- Link the exact README or demo section instead of pasting long explanations.
- Move valid confusion into a README/FAQ patch or GitHub issue.

Within 6 hours:

- Save HN story telemetry: `npm run launch:hn-snapshot -- --url <channel-url> --output tmp/ty-context/launch-metrics/show-hn-hn-6h.md`.
- Count comments by theme: unclear positioning, install friction, AGENTS.md overlap, benchmark ask, integration ask, examples ask.
- Patch the README only for repeated or high-severity confusion.
- Comment on issue #3 with launch URL, baseline metrics and major objections.
- Keep the channel note from `npm run launch:feedback-note` updated with repeated themes, docs/package changes and adoption evidence.

Within 24 hours:

- Save the final first-day HN telemetry: `npm run launch:hn-snapshot -- --url <channel-url> --output tmp/ty-context/launch-metrics/show-hn-hn-24h.md`.
- Record stars, forks, npm downloads, issues and external comments.
- Decide whether the next move is Product Hunt, a curated-list PR, or a docs/demo repair.
- Convert real adoption examples into issue #4 reports, linked issue comments or consented adoption-story notes.
- If the biggest objection is "this is just AGENTS.md", patch the README before any second-channel post.

Second action if comments are not exposing a major positioning flaw: monitor the seven open curated-list PRs from `docs/launch/awesome-list-submissions.md` and respond inside the same claim boundary. Any further list target should be scored by fit x maintenance activity x audience scale; defer Product Hunt and extra directory PRs if the first comments show unclear positioning, even though the media packet now exists.

## Claims Boundary

Use [claims-boundary.md](claims-boundary.md) as the final single-page check before posting.

Allowed:

- "Minimal project memory for AI coding agents."
- "Helps fresh chats recover project intent, boundaries and validation paths."
- "Complements tests, CI and review."
- "The package is installable from npm." only after npm publish succeeds.

Avoid:

- "Automates the Tiny Context."
- "Replaces tests, CI, review, specs or project management."
- "Benchmark-proven faster."
- "Award-winning."
- "Used by teams" unless public adoption exists.
- Asking for stars, upvotes or awards.

## Measurement

Baseline before first post:

```text
GitHub stars:
GitHub forks:
npm downloads last week:
Open issues:
Open external posts:
```

Use `npm run launch:metrics -- --output tmp/ty-context/launch-metrics/<channel>-before.md` for the baseline and repeat it after 6 hours / 24 hours. For Show HN, also use `npm run launch:hn-snapshot -- --url <channel-url> --output tmp/ty-context/launch-metrics/<channel>-hn-24h.md`. Treat the output as distribution telemetry, not product-quality evidence.

Post after each channel:

```text
Channel:
URL:
Posted at:
Stars after 24h:
Forks after 24h:
npm downloads after 24h:
New issues:
Most repeated question:
README/demo patch needed:
Next channel decision:
```
