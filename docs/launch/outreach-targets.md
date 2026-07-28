# Outreach Targets

Snapshot date: 2026-06-10.

This is the execution map after the GitHub repository and npm package were renamed to Project Tiny Context Harness. Recheck rules, deadlines and categories before submitting anywhere.

Use [prelaunch-external-blockers.md](prelaunch-external-blockers.md) as the current strict external launch gate for `npm-fetch` and `github-homepage`.

## Current Launch Position

Ready now:

- GitHub description, MIT license and discovery topics are visible.
- `project-tiny-context-harness` is published on npm and installable through `@latest`.
- GitHub repository homepage points to the npm package page; the primary public post should still link to the GitHub repository.
- `v0.8.2` is published on npm through Trusted Publishing, and the current latest GitHub Release is `Project Tiny Context Harness 0.8.2`.
- Adoption handoff issue #4 is pinned; starter issues #6-#8 remain open for follow-up docs/examples/benchmark work, and #5 is closed after the repo-hosted demo packet landed.
- Repo-hosted launch media exists: README GIF, two Product Hunt gallery PNGs and a 240x240 thumbnail.
- Trust surface exists: `SECURITY.md`, Dependabot, OpenSSF Scorecard workflow, OpenSSF Best Practices self-assessment prep and issue templates.
- Fresh-agent recovery walkthrough and Minimal Context sample project are linked from README.
- Agent surface recipes explain Codex, Claude Code, Cursor, Gemini CLI, OpenCode and custom harness-folder adoption without splitting `project_context/**`.
- FAQ answers AGENTS.md overlap, README overlap, benchmark boundaries, Context update rules and source preview.
- Response templates cover predictable HN/Reddit/Product Hunt questions without benchmark, adoption, award or star claims.
- Launch claims boundary checklist exists for final public copy review before posting or submitting.
- Codex for Open Source application copy exists for maintainer-reviewed submission without claiming official OpenAI integration.
- HN first regular comment is posted at https://news.ycombinator.com/item?id=48481205.

Still pending:

- First-channel 6-hour and 24-hour metrics are not complete yet.
- Seven curated-list PRs are open and waiting for maintainer feedback: [ai-boost/awesome-harness-engineering#58](https://github.com/ai-boost/awesome-harness-engineering/pull/58), [Picrew/awesome-agent-harness#22](https://github.com/Picrew/awesome-agent-harness/pull/22), [Transcenda/awesome-agentic-coding#4](https://github.com/Transcenda/awesome-agentic-coding/pull/4), [jordimas/awesome-agentic-engineering#4](https://github.com/jordimas/awesome-agentic-engineering/pull/4), [jamesmurdza/awesome-ai-devtools#636](https://github.com/jamesmurdza/awesome-ai-devtools/pull/636), [bradAGI/awesome-cli-coding-agents#125](https://github.com/bradAGI/awesome-cli-coding-agents/pull/125) and [ai-for-developers/awesome-ai-coding-tools#408](https://github.com/ai-for-developers/awesome-ai-coding-tools/pull/408).
- No outside adoption report, testimonial or contribution.
- 0 GitHub stars and 0 forks at snapshot time.

Practical implication: broad public launch is no longer blocked by npm availability, GitHub About metadata, release metadata, demo media or HN maintainer context. The first public post and first regular HN comment are live, and seven curated-list PRs are open. The next work is feedback handling, 6-hour/24-hour metrics and PR-response handling. Awards and high-star outcomes are still evidence-gated.

## Priority Sequence

| Priority | Target | Why now | Required packet | Success signal |
|---:|---|---|---|---|
| 0 | Private review | 5-10 experienced coding-agent users can still catch README, install or positioning confusion before broad promotion. | `docs/launch/reviewer-quickstart.md`, `docs/launch/private-review.md`, `docs/launch/private-review-shortlist.md`, `docs/launch/adoption-story-template.md`, npm install path, optional source preview path, no star ask. | Reviewers describe concrete agent-memory drift, README confusion or missing recovery facts. |
| 1 | Hacker News Show HN | Live at https://news.ycombinator.com/item?id=48479619. | GitHub URL, first regular comment, demo link and explicit feedback ask. | Comments discuss agent handoff/context drift rather than generic AI tooling. |
| 2 | High-score curated-list PRs | Current best durable-discovery targets are selected by `fit x maintenance activity x audience scale`, not by stars alone. | Seven PRs are open: [#58](https://github.com/ai-boost/awesome-harness-engineering/pull/58), [#22](https://github.com/Picrew/awesome-agent-harness/pull/22), [Transcenda#4](https://github.com/Transcenda/awesome-agentic-coding/pull/4), [jordimas#4](https://github.com/jordimas/awesome-agentic-engineering/pull/4), [awesome-ai-devtools#636](https://github.com/jamesmurdza/awesome-ai-devtools/pull/636), [awesome-cli-coding-agents#125](https://github.com/bradAGI/awesome-cli-coding-agents/pull/125) and [awesome-ai-coding-tools#408](https://github.com/ai-for-developers/awesome-ai-coding-tools/pull/408). | Listing accepted or maintainer feedback clarifies the category. |
| 3 | P0-watch directories | `kyrolabs/awesome-agents` is very active but has stricter traction rules; `awesome-opencode` has high audience but lower recent activity. | Submit only after a feedback/listing signal, a specific category request, or activity improvement. | Maintainer rules and recent PR handling still support the submission. |
| 4 | Awesome OpenCode | The README now includes an OpenCode setup note; the list accepts project YAML entries for tools and utilities, but recent activity makes it lower priority than active targets. | `data/projects/` YAML patch from `docs/launch/external-prs/`, no plugin claim. | Listing accepted or maintainers clarify OpenCode relevance. |
| 5 | Product Hunt | Product Hunt is useful for distribution, feedback and social proof; submissions can be scheduled up to one month ahead. | Demo media, tagline, maker comment, at least two gallery images/GIFs, GitHub/npm links. | Reviews/comments from developer-tool users and enough traffic to validate messaging. |
| 6 | Reddit / niche communities | Good for focused feedback from Codex, Claude Code, Cursor and local-first tool users. | Reddit draft from launch kit, demo, #4 adoption issue link. | Replies describe missing facts agents rediscover in real repos. |
| 7 | Broader awesome lists | Higher-exposure lists create durable discovery after the README/demo are clear. | One-line description, category fit, demo link, no award/benchmark claims. | Listing accepted or maintainers give positioning feedback. |
| 8 | Awards | Awards need visible adoption or explicit eligibility thresholds. | Launch metrics, adoption reports, demo, docs quality evidence. | Nomination accepted or shortlist feedback. |
| 9 | Codex for Open Source | Direct fit with coding-agent maintainer workflows; application is rolling and maintainer-submitted. | `docs/launch/codex-for-oss-application.md`, fresh metrics snapshot, no official-integration claim. | Application submitted by maintainer or deferred with a clearer evidence gap. |
| 10 | OpenSSF Best Practices / Baseline | Trust signal for maintainers evaluating a new npm developer tool; no broad adoption required to begin self-assessment. | `docs/launch/openssf-best-practices.md`, fresh metrics snapshot, current repo evidence, no premature badge claim. | Self-assessment started, or badge added only after the official site grants it. |

## Channel Details

### Hacker News

Source: [Show HN Guidelines](https://news.ycombinator.com/showhn.html).

Use the live title: `Show HN: Tiny project memory for coding agents`.

Do:

- Link to the GitHub repository, not a blog post.
- Make clear that the package can be installed and tried immediately.
- Ask for technical feedback from people using agents on real repositories.
- Keep language factual and avoid award/star asks.

Do not:

- Post before the demo or README first screen can explain the product quickly.
- Claim benchmark-proven speedups.
- Frame it as a full autonomous Tiny Context framework.

### Product Hunt

Sources: [Product Hunt Launch Guide](https://www.producthunt.com/launch), [Preparing for Launch](https://www.producthunt.com/launch/preparing-for-launch), [How Product Hunt Works](https://www.producthunt.com/launch/how-product-hunt-works).

Use Product Hunt after Show HN or first feedback unless there is a scheduling reason to move sooner. Product Hunt is better for broader distribution than deep technical critique, so the page needs visuals and very simple language. The current repo already has a social preview image, GIF, two gallery images and a thumbnail under `docs/launch/assets/`.

Submission packet:

- URL: `https://github.com/Seven128/project-tiny-context-harness`
- Name: `Project Tiny Context Harness`
- Tagline: `Minimal project memory for AI coding agents`
- Topics: Developer Tools, Artificial Intelligence, Open Source
- First comment: use the Product Hunt draft in `docs/launch/README.md`, updated with the demo link.
- Media: `docs/launch/assets/social-preview.png`, `docs/launch/assets/product-hunt-gallery-1.png`, `docs/launch/assets/product-hunt-gallery-2.png`, `docs/launch/assets/product-hunt-thumbnail.png` and optional YouTube demo video. Product Hunt recommends a square 240x240 thumbnail under 3MB, a tagline under 60 characters, a description under 500 characters, up to three launch tags and a first maker comment.

### Curated Lists

The list-priority rule is:

```text
target score = category fit x maintenance activity x audience scale
```

Do not treat star count as a standalone priority. A high-star list with no recent PR handling should be lower than a smaller list whose maintainers are actively merging relevant entries.

Seven curated-list PRs are open:

- [ai-boost/awesome-harness-engineering#58](https://github.com/ai-boost/awesome-harness-engineering/pull/58), under `Context Delivery & Compaction`.
- [Picrew/awesome-agent-harness#22](https://github.com/Picrew/awesome-agent-harness/pull/22), under `Context & Working-State Engineering`.
- [Transcenda/awesome-agentic-coding#4](https://github.com/Transcenda/awesome-agentic-coding/pull/4), under `Agent instructions and Skills`.
- [jordimas/awesome-agentic-engineering#4](https://github.com/jordimas/awesome-agentic-engineering/pull/4), under `Team Adoption`.
- [jamesmurdza/awesome-ai-devtools#636](https://github.com/jamesmurdza/awesome-ai-devtools/pull/636), under `Agent Infrastructure / Configuration & Context Management`.
- [bradAGI/awesome-cli-coding-agents#125](https://github.com/bradAGI/awesome-cli-coding-agents/pull/125), under `Harnesses & orchestration / Agent infrastructure`.
- [ai-for-developers/awesome-ai-coding-tools#408](https://github.com/ai-for-developers/awesome-ai-coding-tools/pull/408), under `Developer Productivity Tools`.

Prioritization and listing copy live in [awesome-list-submissions.md](awesome-list-submissions.md). Exact patch files, PR titles, PR bodies and manual `gh` commands for remaining prepared lists live in [external-prs/README.md](external-prs/README.md). Keep future submissions factual: project memory and context recovery for coding agents, no benchmark/adoption/award claims.

`kyrolabs/awesome-agents` is a P0-watch target because its activity and audience are strong, but its contribution rules caution against brand-new projects without traction. Revisit after one accepted listing, an external comment, or visible stars/adoption.

Possible listing text:

```text
Project Tiny Context Harness - Minimal repo-native project memory for AI coding agents. Installs project_context files, AGENTS.md guidance and a validate-context gate so fresh agent chats can recover project intent and validation paths.
```

[awesome-opencode](https://github.com/awesome-opencode/awesome-opencode) is now plausible because the README links an OpenCode setup note in `docs/agent-surface-recipes.md`. Keep the listing narrow: root `AGENTS.md` and `project_context/**` are the portable contract; `.opencode` is only a custom support-assets folder. Use the exact `data/projects/` patch in [external-prs/README.md](external-prs/README.md).

### Awards

| Target | Current official signal | Fit now | Gate |
|---|---|---|---|
| [The Commits](https://www.commits.dev/) | 2026 event page lists Small/Large Project, Documentation & Design Excellence and Community Choice categories, with an August 11, 2026 award show. | Medium after first launch; docs angle is plausible. | Submit after demo, first launch and at least one real adoption signal, or submit Documentation & Design Excellence if nomination timing is at risk. |
| [JavaScript Open Source Awards](https://osawards.com/javascript/) | Requirements include OSI-approved license, active contribution in last 6 months and 100+ stars. | Not eligible now because stars are 0. | Revisit at 100+ stars. |
| [OpenUK Awards](https://openuk.uk/awards/) | 2026 awards are UK-focused open tech, with ceremony on 2026-11-05. | Low unless maintainer/project geography and category fit are confirmed. | Confirm UK presence and category eligibility before spending effort. |
| [DevOps Dozen](https://devopsdozen.com/) | 2025 process had public nominations, finalist voting and judge weighting; the OSS category recognizes community value around open source development assets. | Low now; project is not primarily DevOps and has no community evidence yet. | Revisit only with DevOps/tooling adoption evidence. |
| [Product Hunt Golden Kitty Awards](https://www.producthunt.com/golden-kitty-awards) | Product Hunt has Engineering & Development and AI Agents award surfaces. | Possible only after Product Hunt launch. | Product Hunt launch must happen first and show traction. |

### OpenSSF Best Practices / Baseline

Source: [OpenSSF Best Practices Badge Program](https://openssf.org/projects/best-practices-badge/), [Best Practices site](https://www.bestpractices.dev/en), [OpenSSF Baseline guide](https://openssf.org/blog/2026/02/25/getting-an-openssf-baseline-badge-with-the-best-practices-badge-system/).

This is a trust-readiness channel, not an award launch channel. It can start before broad public launch because the badge process is a maintainer self-assessment against current repository evidence.

Use [openssf-best-practices.md](openssf-best-practices.md) to gather:

- repository URL and homepage URL,
- current evidence from README, `LICENSE`, `CONTRIBUTING.md`, `SECURITY.md`, Dependabot, CI and Scorecard,
- known gaps that require maintainer review,
- claims boundary before and after a badge is actually granted.

Do not add a Best Practices or Baseline badge to README until the official site grants one.

## Operating Rules

- Lead with the problem: new agent chats lose project intent.
- Keep the claim narrow: repo-native Minimal Context for fresh-agent recovery.
- Keep README, npm and launch copy English-first; keep localized material behind secondary links or as literal compatibility examples.
- Ask for feedback and missing facts, not stars.
- Treat stars as distribution telemetry, not proof of quality.
- Prioritize directory PRs by `fit x maintenance activity x audience scale`; downgrade inactive targets even if they have more stars.
- Check [claims-boundary.md](claims-boundary.md) before final public copy, awards copy or directory PR wording.
- Turn repeated questions into README/FAQ or issues within 24 hours.
- Do not submit to award programs before the demo and first public feedback exist.

## Next Concrete Actions

1. Monitor the HN story and first regular comment for direct technical questions or repeated confusion.
2. Track stars, forks, npm downloads and comments for 6 hours and 24 hours with `npm run launch:metrics`.
3. Patch README/FAQ from repeated confusion.
4. Monitor the seven open curated-list PRs; open any further directory PR only after applying the `fit x activity x audience` rule and checking current maintainer responsiveness.
5. Use the Product Hunt media packet only after the first feedback loop or with a deliberate scheduling decision.
6. Apply to Codex for Open Source with `docs/launch/codex-for-oss-application.md` if the maintainer wants to disclose current metrics and can submit manually.
7. Start the OpenSSF Best Practices / Baseline self-assessment with `docs/launch/openssf-best-practices.md` if the maintainer wants another trust signal before broader launch.
