# Minimal Context Sample Project

This sample shows what a small project can look like after adopting Project Tiny Context Harness. It is not a benchmark, template requirement or product-quality proof. It is a concrete shape for the recovery surface a fresh coding agent should read first.

For a file-by-file version with tiny source code, tests and `validate-context`, browse [`examples/minimal-context-sample/`](../../examples/minimal-context-sample/).

## Scenario

Imagine a small issue-labeling service:

- It reads incoming GitHub issues.
- It proposes labels for a maintainer.
- It must not auto-apply labels without review.
- Most agent mistakes happen when a fresh chat forgets that boundary and edits the wrong workflow path.

The project does not need a full Tiny Context process. It needs a small durable memory surface.

## Files

After `ty-context init`, the important files are:

```text
AGENTS.md
project_context/
  context.toml
  global.md
  architecture.md
  areas/main.md
  areas/main/verification.md
```

## AGENTS.md

Keep this file as a startup router, not a full manual:

```md
# Minimal Context Harness Protocol

This project uses Minimal Context Harness.

## Fact Sources

- Project context: `project_context/global.md`
- Architecture context: `project_context/architecture.md`
- Context graph: `project_context/context.toml`
- Product area context: `project_context/areas/**/*.md`

## Work Rule

Read the relevant Context before changing code. If a change creates a durable product, architecture, API, state or validation fact, update `project_context/**`.

## Verification

- `make validate-context`
- `npm test -- label-routing`
```

The real generated `AGENTS.md` contains more guardrails, but the important product shape is that it points the agent to the fact sources and validation entry points.

## project_context/global.md

Keep only durable project-level facts:

```md
# Project / Delivery Context

## Project Goal

- Suggest labels for new GitHub issues so maintainers can triage faster.

## Non-goals / Boundaries

- Do not auto-apply labels without maintainer review.
- Do not store GitHub tokens in Context files.
- Do not turn label suggestions into issue-priority decisions.

## Background

- Fresh agent chats often rediscover the review boundary and accidentally inspect deployment automation first.

## Verification Entry Points

- `npm test -- label-routing`
- `make validate-context`

## Current State

- Label suggestions are produced by the label-routing module.
- GitHub webhook parsing is a separate boundary.

## Next Safe Action

- Inspect label-routing tests before changing suggestion behavior.
```

## project_context/architecture.md

Keep architecture facts short:

```md
# Architecture Context

## System Boundary

- The service proposes labels; maintainers decide whether to apply them.
- GitHub API writes belong only to the reviewed-apply workflow.

## Component Map

- `src/webhook/**`: receives GitHub issue events.
- `src/label-routing/**`: maps issue text to suggested labels.
- `src/review-ui/**`: shows suggestions to maintainers.

## Constraints And Tradeoffs

- Label-routing must not import reviewed-apply code.
- Tests should cover no-write behavior for suggestion-only paths.

## Verification Implications

- `npm test -- label-routing`
- `npm test -- webhook`
```

## project_context/areas/main.md

Use area Context for ownership and local constraints:

```md
# Main Area Context

## Responsibility

- Own label suggestion behavior for GitHub issue triage.

## User / System Contract

- Input: GitHub issue title and body.
- Output: suggested labels with a short reason.
- The output is advisory until a maintainer approves it.

## Key Constraints

- Do not mutate GitHub issue labels in suggestion code.
- Keep label taxonomy changes explicit in tests.

## Code Entry Points

- `src/label-routing/suggest-labels.ts`
- `tests/label-routing.test.ts`
```

## Multi-Area / Monorepo Variant

For a monorepo, add Areas for durable product or technical ownership—not mechanically for every workspace:

```toml
[[areas]]
id = "mobile"
root = "apps/mobile"
context = "project_context/areas/mobile.md"
kind = "app"
default = true

[[areas]]
id = "miniapp"
root = "apps/miniapp"
context = "project_context/areas/miniapp.md"
kind = "app"

[[areas]]
id = "shared-service"
root = "packages/service"
context = "project_context/areas/shared-service.md"
kind = "service"
```

One Area may own several workspace roots, and a shared/governance Area may own none. When the mapping matters, give each code/workspace root one primary Area owner and put that durable mapping in each Area's `Code Entry Points` or in `architecture.md`; no extra manifest field is required.

The default Area, `read_policy`, triggers and bounded search choose the initial Context working set only. A miniapp task may read shared-service or mobile contract Context when that is necessary to understand an interface, but those reads do not authorize mobile edits. If “change the homepage” could still mean several sibling clients after reading user and repository ownership facts, clarify the target before product edits. A cross-client request names every intended target.

If the repository has a project-specific changed-path scope verifier, index its stable command in verification Context and run it on the paths attributable to the current task. Otherwise review the final diff against Area/code ownership during Conformance. Do not add a generic workspace registry, read ACL, full-Context default or persisted target declaration merely because the repository is a monorepo.

## project_context/areas/main/verification.md

Use verification role Context for repeatable validation paths, not one-off logs:

```md
# Main Verification Context

## Critical Paths

- Label-routing behavior: `npm test -- label-routing`
- Webhook parsing: `npm test -- webhook`
- Context recovery: `make validate-context`

## Expected Signals

- Label-routing tests should include an advisory-only case.
- `validate-context` should pass without storing test-result claims in Context.

## Known Dead Ends

- Running only the webhook tests does not cover label taxonomy changes.
```

## Fresh-Agent Prompt

Start a new coding-agent chat with:

```text
Read AGENTS.md and project_context/** first. Summarize the project goal, non-goals, architecture boundaries, validation entry points and next safe action before proposing code changes.
```

A useful answer should recover:

- The service suggests labels but does not auto-apply them.
- Label routing, webhook parsing and reviewed apply are separate boundaries.
- The focused validation path starts with `npm test -- label-routing`.
- Context files should not store tokens, logs or fake "tests passed" claims.

## What To Copy

Copy the shape, not the domain:

- Keep `AGENTS.md` short and directive.
- Put durable project intent in `global.md`.
- Put stable system boundaries in `architecture.md`.
- Put owned product/module facts in `areas/**`.
- Put repeatable validation paths in `verification` role Context.
- Leave execution evidence in tests, CI and review.

## What Not To Copy

- Do not create phase gates or task state just because the project uses agents.
- Do not paste code, logs or release reports into Context.
- Do not claim benchmark speedups from this sample.
- Do not replace tests or human review with `validate-context`.
