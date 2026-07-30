# Launch Kit

This is the maintainer launch kit for Project Tiny Context Harness. It is copy-ready material for public release posts, repository metadata, demo scripting and submission prep.

Do not claim benchmark wins yet. Current public positioning is based on product design and smoke evidence: the package installs a small, durable recovery surface and `validate-context` gate. Fresh Minimal Context benchmark runs are still required before publishing efficiency claims.

For reusable external-submission fields, see [profile.md](profile.md). For GitHub About metadata setup, see [github-metadata.md](github-metadata.md). For strict external stop/go checks, see [prelaunch-external-blockers.md](prelaunch-external-blockers.md). For the long-form technical narrative, see [../articles/fresh-agent-project-memory.md](../articles/fresh-agent-project-memory.md). For adjacent-tool fit, see [../comparison.md](../comparison.md). For competitor and feasibility context, see [market-map.md](market-map.md). For current launch, award and curated-list execution targets, see [outreach-targets.md](outreach-targets.md). For launch claims boundaries, see [claims-boundary.md](claims-boundary.md). For Codex for Open Source application copy, see [codex-for-oss-application.md](codex-for-oss-application.md). For OpenSSF Best Practices / Baseline self-assessment prep, see [openssf-best-practices.md](openssf-best-practices.md). For small pre-launch feedback before broad promotion, send [reviewer-quickstart.md](reviewer-quickstart.md), then use [private-review.md](private-review.md), [private-review-shortlist.md](private-review-shortlist.md) and [private-review-log-template.md](private-review-log-template.md), then convert consented examples with [adoption-story-template.md](adoption-story-template.md). For copy-ready primary launch execution, see [primary-launch.md](primary-launch.md). For launch reply handling, see [response-templates.md](response-templates.md). For post-channel feedback triage, see [feedback-triage.md](feedback-triage.md). For metrics snapshots, see [metrics.md](metrics.md). For npm publication and future credential issues, see [npm-publish-runbook.md](npm-publish-runbook.md), [npm-credential-unblock.md](npm-credential-unblock.md) and [npm-trusted-publishing.md](npm-trusted-publishing.md). For the `0.8.7` GitHub Release fields, see [github-release-0.8.7.md](github-release-0.8.7.md). For curated-list PR copy, see [awesome-list-submissions.md](awesome-list-submissions.md), [external-prs/README.md](external-prs/README.md) and `npm run launch:external-prs`. For the recording packet, see [demo.md](demo.md).

Readiness boundary: `npm run launch:check` means the metadata, docs, launch packets and repo-hosted media are internally coherent. Run `npm run launch:next -- --live` for the ordered owner action board with current status hints, then run `npm run launch:strict-external` before broad public posting to check live GitHub/npm metadata. It does not mean Product Hunt, curated-list submissions or awards are ready. Those still require final account-specific submission review, first feedback or adoption evidence. After each channel post, create a temporary triage note with `npm run launch:feedback-note` so metrics, repeated objections, adoption evidence and the next-channel decision are captured without becoming project Context.

Launch media:

- GitHub/social preview image: [assets/social-preview.png](assets/social-preview.png)
- README demo GIF: [assets/demo-terminal.gif](assets/demo-terminal.gif)
- Product Hunt gallery images: [assets/product-hunt-gallery-1.png](assets/product-hunt-gallery-1.png), [assets/product-hunt-gallery-2.png](assets/product-hunt-gallery-2.png)
- Product Hunt thumbnail: [assets/product-hunt-thumbnail.png](assets/product-hunt-thumbnail.png)

## Core Positioning

Core message:

```text
Keep the memory. Drop the ceremony.
```

One-line description:

```text
Minimal project memory for AI coding agents: keep the repo facts a fresh agent needs to recover intent, boundaries and validation paths without Tiny Context-stage ceremony.
```

Short description:

```text
Project Tiny Context Harness packages the Minimal Context Harness approach into a repository: compact project_context files, a short AGENTS.md startup router, role Skills and a validate-context gate. It keeps the useful part of earlier stage-based workflows, durable project memory, without making every task pass through phase gates, task state or work-product trees.
```

Not this:

```text
Another autonomous Tiny Context framework, task manager, spec generator or benchmark-proven productivity multiplier.
```

## Language Posture

Keep public-facing launch material English-first: GitHub description, README first screen, npm copy, Show HN, Product Hunt, curated-list PRs and social posts. Optional localized docs can exist behind secondary links, but they should not be the first evaluation path for strangers.

Use English labels for first-screen localization links, such as `Chinese (Simplified)`, so repository and npm previews do not look Chinese-first to global visitors.

Chinese or other non-English strings are acceptable when they are literal generated filenames, request-trigger examples or maintainer notes. If they appear in launch-facing docs, frame them as multilingual compatibility examples, not as the default product language.

## GitHub Metadata

Repository description:

```text
Minimal project memory and validation harness for AI coding agents.
```

Primary launch URL:

```text
https://github.com/Seven128/project-tiny-context-harness
```

GitHub repository homepage:

```text
https://www.npmjs.com/package/project-tiny-context-harness
```

Suggested topics:

```text
ai-agents
coding-agent
codex
claude-code
cursor
gemini-cli
opencode
agent-context
context-engineering
context-management
agents-md
project-memory
agent-memory
ai-coding
developer-tools
developer-productivity
cli
ty-context
workflow
```

Pinned repository note:

```text
Use this if agents keep losing project intent between chats. It adds a small project_context fact source, AGENTS.md router and validate-context gate; it does not replace tests, CI or review.
```

## Launch Checklist

- Merge current launch-readiness changes into the GitHub default branch.
- Run `npm run launch:check` locally; run `npm run launch:next -- --live` for the ordered owner action board with status hints; run `npm run launch:unblock` to summarize current npm/GitHub blockers; then run `npm run launch:strict-external` before external launch.
- Review [prelaunch-external-blockers.md](prelaunch-external-blockers.md); do not post broad launch copy if `npm-fetch` or `github-homepage` returns as a TODO.
- Confirm README first screen shows badges, including OpenSSF Scorecard, install command, positioning and 60-second trial.
- Run `npm run launch:github-metadata` to inspect GitHub description, homepage and topics; apply it with `GITHUB_TOKEN` or `GH_TOKEN`, or set those values manually from this file.
- Run `npm run launch:npm-access` to inspect npm login, registry reachability and package existence before future publishes.
- Use [npm-publish-runbook.md](npm-publish-runbook.md) only for future publish retries or registry drift.
- Prepare an ordinary Skill/assets patch with `npm run release:prepare -- --fast --version patch --update-mode sync-only`, then commit and push. Prefer one real Trusted Publishing workflow run, which tests/packs/smokes once and publishes that exact artifact after the protected environment gate; use `npm run release:publish -- --local-fallback --yes` only as the emergency local path. `release:prepare` owns the upgrade impact review, so upgrade-sensitive releases must use the full gate with `upgrade-required` or `manual-required`.
- After the first renamed npm publish succeeds, configure GitHub Actions Trusted Publishing with [npm-trusted-publishing.md](npm-trusted-publishing.md) so future publishes use OIDC instead of a long-lived publish token.
- Confirm npm package page renders the updated package README and MIT license; if `npm run launch:strict-external` reports stale `npm-readme-renamed-surfaces` info, refresh it with the next patch version rather than republishing an immutable version.
- Run `npm run smoke:quickstart` after publish against `project-tiny-context-harness@latest` or a clean test project.
- Confirm `SECURITY.md`, `CODE_OF_CONDUCT.md`, `SUPPORT.md`, `GOVERNANCE.md`, Dependabot and adoption-report issue template are visible on GitHub.
- Confirm OpenSSF Scorecard badge is visible from README and OpenSSF Scorecard workflow runs on `main`, weekly schedule and manual dispatch.
- If starting an OpenSSF Best Practices or Baseline self-assessment, use [openssf-best-practices.md](openssf-best-practices.md) and do not add a badge until the official site grants one.
- Confirm the fresh-agent recovery walkthrough and Minimal Context sample project are linked from README.
- Confirm the long-form technical article is linked from README for DEV, Reddit or follow-up launch replies.
- Confirm agent surface recipes are linked from README and explain Codex, Claude Code, Cursor, Gemini CLI, OpenCode and custom harness folders without splitting `project_context/**`.
- Confirm the FAQ is linked from README and answers AGENTS.md overlap, README overlap, benchmark boundaries, Context update rules and source preview.
- Confirm [../benchmarking.md](../benchmarking.md) is linked from README/FAQ and explains why public speedup claims need fresh baseline and Minimal Context comparisons.
- Confirm [claims-boundary.md](claims-boundary.md) is open before writing final Show HN, Product Hunt, Reddit, award or curated-list text.
- Confirm response templates cover AGENTS.md overlap, benchmark asks, stage-ceremony questions, test/CI boundaries, existing-repo adoption and feedback triage.
- Before broad promotion, invite a small private review group with [reviewer-quickstart.md](reviewer-quickstart.md), [private-review.md](private-review.md) and [private-review-shortlist.md](private-review-shortlist.md) if more product clarity is needed.
- Convert consented private feedback with [adoption-story-template.md](adoption-story-template.md) before quoting it in README, launch replies or future case-study docs.
- Run `npm run launch:external-prs` before preparing curated-list PRs; run `npm run launch:external-prs -- --live --clean` just before opening them to check patches against current upstream repositories.
- Run `npm run launch:metrics -- --output tmp/ty-context/launch-metrics/baseline.md` before the first public post.
- After each public post or private-review batch, run `npm run launch:feedback-note -- --channel <channel> --url <channel-url>` and keep the note under `tmp/ty-context/launch-feedback/**`.
- If applying to Codex for Open Source, use [codex-for-oss-application.md](codex-for-oss-application.md) after a fresh metrics snapshot and maintainer review.
- Confirm the adoption handoff issue and starter issues are visible and labeled for discovery.
- Record a short terminal demo from the 60-second trial.
- Post to one primary technical venue first, then reuse the same claim across smaller channels.
- Ask for feedback on whether the recovery surface is useful, not for stars.

## Launch Operating Plan

Do not post everywhere at once. Use one primary launch to test whether strangers understand the wedge, then update copy from the actual questions people ask.

### Required Assets

| Asset | Owner action | Ready signal |
|---|---|---|
| Launch profile sheet | Keep `docs/launch/profile.md` aligned with README, package metadata and launch copy. | External submissions reuse one English-first name, tagline, description, category, tag and claims-boundary source. |
| Prelaunch external blockers | Run `npm run launch:unblock` and keep [prelaunch-external-blockers.md](prelaunch-external-blockers.md) aligned with current `npm-fetch` and `github-homepage` stop/go state. | Broad launch is held only if `npm run launch:strict-external` reports a required external blocker. |
| Launch claims boundary | Review `docs/launch/claims-boundary.md` before posting or submitting public copy. | Final channel text stays inside evidence: no benchmark, adoption, award, test-replacement or Tiny Context-automation overclaim. |
| External PR packet check | Run `npm run launch:external-prs`; before opening PRs, run `npm run launch:external-prs -- --live --clean`. | Curated-list patch packets still use the renamed project, avoid benchmark/adoption claims and apply cleanly to current upstream clones. |
| GitHub metadata | Run `npm run launch:github-metadata` to dry-run description, npm homepage and topics; apply with `GITHUB_TOKEN` or `GH_TOKEN`, or use [github-metadata.md](github-metadata.md) manually. | Online `launch_readiness_check` no longer reports GitHub metadata TODOs. |
| npm metadata | Run `npm run launch:npm-access`, then publish a new package version after PR merge. Use `npm-readme-renamed-surfaces` from the strict external check as a non-blocking signal for whether npm's live README still needs a new patch release. | npm page shows updated README, MIT license, homepage and description. |
| Source preview path | Keep the Codespaces link, local smoke command, source-preview tarball path and source-preview report form visible as an alternate review/package-development path. | Private reviewers can open `https://codespaces.new/Seven128/project-tiny-context-harness`, run `npm run smoke:quickstart` / `npm run preview:pack`, use the generated tarball in a disposable repo, or report setup failure through `source_preview_report.yml`. |
| Reviewer quickstart | Send `docs/launch/reviewer-quickstart.md` to private reviewers before asking them to navigate the full launch kit. | A 5-minute no-install path, 10-15 minute source-preview path, feedback questions and consent boundary are visible in one English-first page. |
| npm credential unblock | Use `npm run launch:npm-access` and `docs/launch/npm-credential-unblock.md` if publish reaches npm and fails with a 403 credentials error. | The maintainer can distinguish login, registry and package-existence state before choosing interactive OTP login or a website-created granular token. |
| npm trusted publishing | Use `docs/launch/npm-trusted-publishing.md` after the first renamed package exists. | Future releases can use GitHub Actions OIDC and npm provenance without storing a long-lived npm publish token. |
| 60-90 second demo | Record the demo storyboard below. | Viewer can see install, generated files and fresh-agent recovery prompt. |
| README recovery diagram | Keep the Mermaid "What gets added" diagram in root README and package README. | New visitors can see the fresh-agent recovery path and the tests/CI/review quality boundary before reading detailed docs. |
| No-install preview | Keep the first-screen README and package README links to the fresh-agent walkthrough, Minimal Context sample guide and browseable sample repository. | Visitors can understand the generated recovery surface before local setup, source checkout or Codespaces startup. |
| First support surface | Keep the Source preview report form, Context recovery gap form, adoption-report issue form, issue chooser routing and pinned feedback issue visible. | Launch posts have one low-friction feedback link and one adoption-evidence link beyond the README; consented reports can become public adoption stories without another authorization round. |
| First contribution queue | Keep low-risk demo/docs/example issues labeled with `good first issue`, `help wanted` and `documentation` where appropriate. | New visitors can contribute without understanding package internals. |
| Trust surface | Keep `SECURITY.md`, `CODE_OF_CONDUCT.md`, `SUPPORT.md`, `GOVERNANCE.md`, Dependabot, OpenSSF Scorecard badge, OpenSSF Scorecard workflow, OpenSSF Best Practices self-assessment prep and issue templates visible. | New users can see how to report risk, conduct concerns, support needs, governance boundaries, dependency drift, supply-chain posture, badge-readiness work and adoption feedback. |
| Example surface | Keep a before/after fresh-agent walkthrough, Minimal Context sample guide and browseable sample repository linked from README. | New visitors can see how Context prevents rediscovery and what the generated recovery surface looks like without claiming benchmark wins. |
| Technical article | Keep `docs/articles/fresh-agent-project-memory.md` linked from README and this launch kit. | Follow-up posts can explain the design thesis without expanding README or claiming benchmark wins. |
| Agent-surface recipes | Keep `docs/agent-surface-recipes.md` linked from README. | Users of Codex, Claude Code, Cursor, Gemini CLI, OpenCode or custom tools can adopt without assuming separate project memories. |
| FAQ surface | Keep `docs/faq.md` linked from README. | Launch replies can point to concise answers for AGENTS.md overlap, README overlap, benchmarks, Context update rules and source preview. |
| Benchmark integrity | Keep `docs/benchmarking.md` linked from README and FAQ. | Visitors can see why single-run speed claims are avoided and what evidence would be needed for future claims. |
| Comparison guide | Keep `docs/comparison.md` linked from README and FAQ. | Launch replies can explain adjacent-tool fit without claiming superiority over agents, specs, task planners or retrieval tools. |
| Response templates | Keep `docs/launch/response-templates.md` linked from this launch kit. | Maintainer replies stay narrow, factual and non-hype when HN/Reddit/Product Hunt comments ask predictable questions. |
| Feedback triage runbook | Keep `docs/launch/feedback-triage.md` linked from this launch kit and primary launch packet. | Real comments become README/FAQ/profile patches, issues or consented adoption stories without turning distribution telemetry into product proof. |
| Feedback note command | Run `npm run launch:feedback-note` after each channel post or private-review batch. | Channel notes stay in `tmp/ty-context/launch-feedback/**` and capture metrics commands, repeated themes, docs/package fixes, adoption evidence and next-channel decisions. |
| Existing-repo adoption guide | Keep `docs/adopt-existing-repo.md` linked from README. | Visitors with real repositories can try `init --adopt` without duplicating project memory across tool-specific agent files. |
| Private review packet | Use `docs/launch/private-review.md` for 5-10 high-signal reviewers before broad launch. | Feedback identifies concrete agent-memory drift, README confusion or missing recovery facts without asking for stars. |
| Private review shortlist | Keep `docs/launch/private-review-shortlist.md` linked from the private review packet. | Reviewer selection prioritizes real coding-agent handoff pain instead of generic encouragement or star asks. |
| Private review log template | Keep `docs/launch/private-review-log-template.md` linked from the private review packet. | Review notes capture consent, repeated confusion and conversion actions without leaking private details or becoming project Context. |
| Adoption story template | Use `docs/launch/adoption-story-template.md` only after consented feedback exists. | Concrete recovery stories can be quoted without leaking private details or claiming proof. |
| Metrics snapshot | Run `npm run launch:metrics` before and after public channels. | Stars, forks, issues and npm downloads are recorded as distribution telemetry without implying product quality. |
| Codex for OSS application | Use `docs/launch/codex-for-oss-application.md` only after maintainer review and a fresh metrics snapshot. | Application copy stays factual, under field limits and separate from product-quality claims. |
| OpenSSF Best Practices self-assessment | Use `docs/launch/openssf-best-practices.md` before starting a Baseline or Best Practices badge application. | The maintainer can reuse current repo evidence while avoiding premature badge or compliance claims. |

### Channel Matrix

| Channel | Primary audience | CTA | Success signal | Follow-up |
|---|---|---|---|---|
| Private review | 5-10 developers already using coding agents on real repos. | Ask whether the recovery surface solves a real handoff problem. | Specific comments about missing project facts, README clarity or trial friction. | Patch README/FAQ before broad launch and convert consented examples with the adoption story template. |
| Hacker News | Developers using agents on real repos. | Ask whether this recovery surface solves their handoff problem. | Comments discuss agent drift, AGENTS.md, Context files or workflow overhead. | Patch README/FAQ from confusion points within 24 hours. |
| Product Hunt | Broader developer-tool audience. | Watch the demo and try the 60-second install. | Upvotes plus concrete comments from agent users. | Add screenshots/GIF and answer every substantive comment. |
| Reddit / niche communities | Codex, Claude Code, Cursor and local-first tooling users. | Ask what facts their agents rediscover. | Replies describe real repo pain, not generic AI enthusiasm. | Convert repeated asks into issues or FAQ entries. |
| GitHub issues / adoption reports | People who tried the package. | Share adoption reports and missing recovery facts through issue #4 or the adoption-report template. | Real examples of Context preventing drift. | Extract durable product lessons into README, FAQ or future Context only when they become stable product facts. |
| Awesome lists / directories | Maintainers of curated AI dev-tool indexes. | Submit only after README/npm metadata and demo are live. | Listing accepted or maintainers give positioning feedback. | Use rejection reasons to improve description/category fit. |
| X / LinkedIn | Existing network and second-wave traffic. | Point to the primary launch post and demo. | Clicks/stars from people already using coding agents. | Post milestone updates only when there is real adoption evidence. |

### Community Handoff Surface

Keep these visible before the first broad launch:

- Pinned issue: `Show how Project Tiny Context Harness helped or failed in your repo`.
- Current labels: #4 uses `question`; #5, #6 and #8 use `documentation`, `good first issue` and `help wanted`; #7 uses `help wanted`.
- Starter issues:
  - Add a small example repository showing Minimal Context before and after.
  - Record an asciinema or GIF from the 60-second demo.
  - Improve docs for adopting an existing repo with `init --adopt`.
  - Test the package with Claude Code, Cursor, Codex and Gemini CLI and report rough friction.
  - Design a fresh Minimal Context benchmark rerun without old stage-result claims.

### Star / Adoption Milestones

Treat stars as distribution signals, not proof that the product works.

| Signal | Action |
|---|---|
| 10 stars or first external issue | Ask what made the repo worth saving; update README/FAQ from that reason. |
| 50 stars or 3 adoption reports | Publish a short follow-up with examples, not a victory claim. |
| 100 stars or first outside contribution | Create a small roadmap focused on examples, integrations and benchmark evidence. |
| 500 stars | Re-evaluate award submissions and curated-list outreach with visible adoption proof. |
| 1,000+ stars | Consider deeper integrations only if users consistently ask for them; do not abandon the minimal-memory wedge automatically. |

## Award / Recognition Targets

Verify current eligibility, deadlines and categories before submitting. Treat these as optional follow-up channels after the package has a clean public launch, working demo and at least some real adoption signal.

| Target | Why it may fit | Gate before submitting |
|---|---|---|
| [Product Hunt Golden Kitty Awards](https://www.producthunt.com/golden-kitty-awards) | Product Hunt has Developer Tools, Open Source and AI-adjacent categories for products launched on Product Hunt. | First launch on Product Hunt with a clear demo and user feedback. |
| [The Commits](https://www.commits.dev/) | Open source categories include Small Project of the Year, Documentation & Design Excellence and Community Choice. | Public repo must show active maintenance, clear docs and real community use. |
| [JavaScript Open Source Awards](https://osawards.com/javascript/) | Relevant if the package is positioned as a JavaScript/TypeScript open source developer tool. | Wait until it meets the listed open-source requirements, including meaningful recent activity and the public star threshold. |
| [OpenUK Awards](https://openuk.uk/awards/) | Open technology awards include software and AI categories. | Only submit if maintainer/project eligibility and geography/community fit are confirmed. |
| [DevOps Dozen](https://devopsdozen.com/) | Developer workflow and DevOps tooling recognition channel. | Submit only if the project has DevOps/tooling adoption evidence and the current fee/category terms make sense. |

Do not submit to CI/CD-specific community awards unless the product scope changes; Minimal Context Harness is not a continuous delivery project.

## Demo Storyboard

Use a clean terminal and keep the recording under 90 seconds.

| Beat | Screen | Narration |
|---|---|---|
| Problem | Empty demo repo or new terminal. | "Agents are strong in one thread. The next thread often loses repo-specific intent." |
| Install | Run the 60-second install commands. | "This adds minimal repo-native project memory, not a task manager." |
| Generated surface | Show `AGENTS.md` and the `project_context/` tree. | "These are the files a fresh agent should read before changing the repo." |
| Recovery test | Paste the fresh-agent test prompt from README. | "A good result is a summary of intent, boundaries and validation paths before code changes." |
| Boundary | Show `make validate-context`. | "This validates recovery facts; it does not replace tests or review." |
| Ask | Show GitHub README. | "Try it where new agent chats currently drift, and tell me what facts are missing." |

Thumbnail text:

```text
Minimal project memory for AI coding agents
```

## Demo Script

Goal: show the problem, install path and generated recovery surface in under two minutes.

1. Start with: "AI agents are fast in one thread, but new chats lose project-specific intent."
2. Show an empty demo repository.
3. Run:

```sh
npm install -D project-tiny-context-harness@latest
npx --yes --package project-tiny-context-harness@latest ty-context init
make validate-context
```

4. Open `AGENTS.md`, `project_context/global.md` and `project_context/architecture.md`.
5. Say: "This is not a task manager or full Tiny Context workflow. It is a small memory surface any agent can read before changing the repo."
6. End with the ask: "Try it on a project where agent handoffs or new chats currently drift."

## Hacker News Draft

Use [primary-launch.md](primary-launch.md) as the canonical Show HN source. It contains the current title, repository URL, HN prefill URL, first-comment copy and first-hour response playbook.

Do not copy an older draft from this file. Run `npm run launch:next -- --live` and use the `show-hn` prefill URL after logging in to Hacker News.

## Product Hunt Draft

Tagline:

```text
Minimal project memory for AI coding agents
```

Description:

```text
Project Tiny Context Harness helps coding agents recover project intent across new chats, handoffs and debugging turns. It installs compact project_context files, AGENTS.md guidance and a validate-context gate without adding a full Tiny Context ceremony.
```

First comment:

```text
I built this for the boring failure mode of AI coding: the agent is capable, but each new chat has to rediscover the project goal, architecture boundaries, validation commands and what must not change.

Project Tiny Context Harness keeps those durable facts in the repo as Minimal Context. The idea is to keep the memory and drop the ceremony: no task state, phase gates or work-product trees by default. It is not a benchmark-proven productivity claim yet and it does not replace tests, CI or review. I would like feedback on whether this is the right minimal surface for teams using coding agents across real repos.
```

## Reddit Draft

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

## Social Thread Draft

```text
AI coding agents are strong inside one thread.

The boring failure mode is the next thread: project intent, architecture boundaries, validation commands and "do not change this" constraints get rediscovered again.

I built Project Tiny Context Harness as minimal project memory for that handoff.

The product bet: keep the memory, drop the ceremony.

It installs:
- project_context/** durable facts
- AGENTS.md startup router
- role Skills for product/design/engineering asks
- validate-context gate

It does not install:
- phase gates
- task state
- work-product trees
- benchmark victory claims

The goal is small repo-native memory that any agent can read before changing code.

npm install -D project-tiny-context-harness@latest
npx --yes --package project-tiny-context-harness@latest ty-context init
```

## Follow-Up Signals

Track:

- Stars and forks after each launch venue.
- npm downloads after publish.
- Issues that mention real repo adoption or confusion.
- Whether users understand "Minimal Context" without a long explanation.
- Whether people ask for task planning, spec generation or retrieval integrations; those are positioning signals, not automatic product scope changes.

Do not track:

- One-off benchmark anecdotes as proof.
- Raw private repo data.
- User secrets, logs or CI artifacts.
