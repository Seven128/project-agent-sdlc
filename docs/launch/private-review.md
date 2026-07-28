# Private Review Packet

Snapshot date: 2026-06-10.

Use this packet for a small, high-signal clarity pass before a broad launch or as targeted follow-up after the first public post. The goal is to get feedback from real coding-agent users, not to create a public launch wave.

Do not ask private reviewers for stars. Ask whether the recovery surface solves a real handoff problem and which facts were still missing.

## When To Use

Use this before Product Hunt, Reddit, additional community posts or curated-list PRs when any of these are true:

- The README and demo are ready, but the project has no outside adoption report.
- You want one concrete before/after story before spending a broad launch channel.

Do not use it as a substitute for the strict external launch gate or first-channel feedback triage. If running it before a broad public post, `npm run launch:strict-external` must pass first; if running it after Show HN, use it to clarify repeated questions before the next channel.

## Reviewer Profile

Invite 5-10 people who already use coding agents on non-trivial repositories:

- Codex, Claude Code, Cursor, Gemini CLI, OpenCode, Cline or Roo users.
- Maintainers who already write `AGENTS.md`, `CLAUDE.md`, `CONTRIBUTING.md` or handoff notes.
- Small-team developers who regularly restart chats, switch agents or hand off agent-generated changes.

Avoid generic AI-tool collectors for this pass. The useful signal is about project-memory recovery, not broad AI enthusiasm.

For candidate scoring and a two-wave outreach plan, use [private-review-shortlist.md](private-review-shortlist.md). Keep filled shortlists under `tmp/ty-context/private-review/**`, not in the repository.

## Copy-Paste DM

```text
I am preparing a small open-source tool called Project Tiny Context Harness.

It adds minimal repo-native project memory for AI coding agents: AGENTS.md plus project_context/** so fresh chats can recover project goal, non-goals, architecture boundaries and validation paths before changing code.

I am not asking for a star or a public post. I am looking for private feedback from people who use Codex, Claude Code, Cursor, OpenCode or similar agents on real repos.

If you have 10-15 minutes, could you skim the README and start with the no-install preview? If the idea looks relevant, try the npm install path or the source preview path in a disposable repo. This is a private clarity pass before broad launch.

Repo:
https://github.com/Seven128/project-tiny-context-harness

One-page reviewer quickstart:
https://github.com/Seven128/project-tiny-context-harness/blob/main/docs/launch/reviewer-quickstart.md

No-install preview:
https://github.com/Seven128/project-tiny-context-harness/blob/main/docs/examples/fresh-agent-recovery.md
https://github.com/Seven128/project-tiny-context-harness/tree/main/examples/minimal-context-sample

Source preview:
Open https://codespaces.new/Seven128/project-tiny-context-harness
Then run:
npm run smoke:quickstart
npm run preview:pack

Or use a local checkout:
git clone https://github.com/Seven128/project-tiny-context-harness.git
cd project-tiny-context-harness
npm ci
npm run smoke:quickstart
npm run preview:pack

If you want to try it in a disposable copy of your own repo:
cd /path/to/your/test-repo
npm install -D project-tiny-context-harness@latest
npx --yes --package project-tiny-context-harness@latest ty-context init --adopt
make validate-context

Or use the local source-preview tarball:
npm install -D /path/to/project-tiny-context-harness/tmp/ty-context/source-preview/package/project-tiny-context-harness-0.8.3.tgz
npx --no-install ty-context init --adopt
make validate-context

The main question: does this minimal recovery surface solve a real "new agent chat lost the project context" problem, or is the missing context somewhere else?
```

## Reviewer Task

Ask reviewers to answer only what they can answer from experience:

Send [reviewer-quickstart.md](reviewer-quickstart.md) when you want one link with the no-install path, source-preview path, feedback questions and consent boundary.

1. What project facts do your agents repeatedly rediscover?
2. Would `AGENTS.md` plus `project_context/**` have helped in that situation?
3. Which file or concept felt unclear in the README first screen?
4. Was the no-install preview enough before touching a real repository?
5. What would make this worth trying on one real repo through npm?

Optional hands-on path:

```sh
git clone https://github.com/Seven128/project-tiny-context-harness.git
cd project-tiny-context-harness
npm ci
npm run smoke:quickstart
npm run preview:pack
```

If local setup is inconvenient, open <https://codespaces.new/Seven128/project-tiny-context-harness> and run `npm run smoke:quickstart` / `npm run preview:pack` there.

Then either inspect the disposable smoke repo output, or install the generated `tmp/ty-context/source-preview/package/*.tgz` tarball into a disposable copy of one real repository and run `npx --no-install ty-context init --adopt`.

If the source preview path fails, ask reviewers to open a [Source preview report](https://github.com/Seven128/project-tiny-context-harness/issues/new?template=source_preview_report.yml) with the command, environment and shortest useful output.

Open `docs/examples/minimal-context-sample.md` and `docs/examples/fresh-agent-recovery.md` if a hands-on test is not practical.

## Feedback Log

Track private feedback with [private-review-log-template.md](private-review-log-template.md) in a temporary file, not in `project_context/**`:

```text
tmp/ty-context/private-review/YYYY-MM-DD-review-notes.md
```

Capture:

- reviewer profile, not private identity unless they consent
- agent/tool they use
- repo size/type in broad terms
- confusion points
- missing recovery facts
- whether they would try it through npm
- quote consent: none, anonymous, public name, or public link

Do not store secrets, private repo names, raw chat logs or private code.

## Convert Feedback

Within 24 hours of the private pass:

- Patch README or FAQ for repeated confusion.
- Turn repeated missing-fact requests into GitHub issues.
- Move public-consent examples into an adoption report, launch reply or [adoption story](adoption-story-template.md).
- Leave one-off private notes in `tmp/ty-context/private-review/**`.
- Do not claim adoption, benchmark wins or productivity multipliers from private feedback.

## Success Signals

Strong signal:

- A reviewer names a specific handoff/debug/new-chat failure this would have helped.
- A reviewer asks for one concrete missing Context field or recipe.
- A reviewer says they would try it through npm.

Weak signal:

- Generic "looks cool" feedback.
- Star without a trial or specific comment.
- Requests to turn it into an autonomous agent, task manager or full Tiny Context suite.

## Claims Boundary

Allowed after private review:

```text
Early reviewers confirmed that fresh-agent project-memory drift is a real pain point.
```

Only use this if reviewers actually said that, and avoid naming them without consent.

Avoid:

```text
Proven to improve delivery speed.
Validated by teams.
Trusted by developers.
```

Private review is for copy and product clarity, not proof of quality.
