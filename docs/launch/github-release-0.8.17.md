# GitHub Release Packet: 0.8.17

Snapshot date: 2026-08-23.

Use this packet to create the GitHub Release for the current public `project-tiny-context-harness` npm package line.

## Release Fields

Tag:

```text
v0.8.17
```

Target:

```text
Use the commit that bumps `packages/ty-context/package.json` to 0.8.17 and is published to npm.
```

Title:

```text
Project Tiny Context Harness 0.8.17
```

Update Mode: `sync-only`

Allowed modes: `sync-only`, `upgrade-required`, `manual-required`.

## Upgrade Impact

Upgrade Impact: `none`.

Release preparation classified this version as `sync-only`: no user-project migration is required. Users receive any new managed assets or CLI behavior only after running the newly published CLI, and `ty-context upgrade --check` remains the default diagnostic path before a direct managed-asset `sync`.

Existing V1 and explicit Symbolic V2 handoffs remain directly preflight-readable when they omit technical feasibility; preflight reports `technical feasibility not declared`. Newly published V1 `implementation_web`/`implementation_app` bundles require one current feasibility input per target. This is a stricter new-authoring boundary, not an automatic rewrite of existing Source.

## Release Body

````markdown
Project Tiny Context Harness 0.8.17 is the current public release line under the renamed npm package:

```sh
npm install -D project-tiny-context-harness@latest
npx --yes --package project-tiny-context-harness@latest ty-context init
make validate-context
```

Update mode: `sync-only`. After updating the package, run:

```sh
npx --yes --package project-tiny-context-harness@latest ty-context upgrade --check
npx --yes --package project-tiny-context-harness@latest ty-context upgrade
```

This release mode means no new release migration is expected. Direct `sync` is an allowed shortcut only when you explicitly want managed-asset refresh without upgrade diagnostics:

```sh
npx --yes --package project-tiny-context-harness@latest ty-context sync
```

Sync does not run migrations. Upgrade plans report `safe_pending`, `manual_required` and `blocked`.

Publishing a new npm version does not automatically migrate existing repositories. Users receive new upgrade behavior only when they run the newly published CLI through `ty-context upgrade`, `ty-context sync` or another `@latest` package invocation.

## What Changed

- Publishes `project-tiny-context-harness@0.8.17` with the synchronized package assets and CLI build.
- Keeps the install path on the renamed package: `project-tiny-context-harness`.
- Adds a strict, Source-bound `design-resource-implementation-feasibility-v1` input for formal Web/App targets. It records the real platform/framework/UI-system/token/component/route substrate, reasoned non-observed dispositions, complete component-family × target × V1-condition or V2-region Fact/Rule and candidate/blocker coverage, composite/per-platform realization steps, capability/feasibility basis, customization surfaces and observed costs/risks without copying canonical visual values or mislabeling Browser-only output as native substrate.
- Keeps implementation choice on the existing authority path: DRA enumerates allowed candidates, Default Workflow selects in Architecture Deliberation, and an active Long-Task accepts a required realization only when existing `task.source_paths`, Source Claims and technical/surface bindings agree. No new Contract field, Claim type or Final Gate is added.
- Preserves legacy direct-preflight compatibility with the explicit `technical feasibility not declared` limitation, while new V1 bundle publication fails closed unless each implementation target has exactly one current feasibility input. Symbolic V2 stays explicit opt-in and uses the same feasibility semantics through exhaustive reachable regions.
- Strengthens DRA commissions with archetype-specific real-copy/data, visual-craft, distinctiveness, reference-role and shared-family guidance; requires inspection of a real render when renderable; and permits a zero-revision exit when the first candidate has no material defect.
- Adds an opt-in, blinded and repeated DRA visual diagnostic protocol. It emits no winner, threshold, score-based admission, Provider registry or workflow verdict and is not release acceptance.
- Adds an owner-scoped active-Source portability check for managed guidance/assets, public executable docs, durable Context, source mappings, runtime-resolved Source and caller-selected exact active Source. It does not inventory all Git files, rewrite frozen history or delete artifacts.
- Refreshes durable Context, package/public documentation, generated Skill parity and project-owned V1/V2/Long-Task/portability regressions around the same current candidate.

## Boundary

This release does not make preflight proof of production reuse, owner correctness, rendering, accessibility, interaction, tests or acceptance. It adds no second Design/Technical Authority, Gate, Registry, readiness state, design workflow or Provider ranking. The visual diagnostic has no published comparative run or admission meaning. It also does not claim benchmark-proven speedups, production adoption, awards, or replacement of tests, CI, review, specs or project management. It packages the smaller recovery surface: keep the memory, drop the ceremony.

## Useful Links

- npm: https://www.npmjs.com/package/project-tiny-context-harness
- README: https://github.com/Seven128/project-tiny-context-harness#readme
- Fresh-agent recovery walkthrough: https://github.com/Seven128/project-tiny-context-harness/blob/main/docs/examples/fresh-agent-recovery.md
- Minimal Context sample: https://github.com/Seven128/project-tiny-context-harness/blob/main/docs/examples/minimal-context-sample.md
- Comparison guide: https://github.com/Seven128/project-tiny-context-harness/blob/main/docs/comparison.md
````

## GitHub Release Automation

After npm publish and registry verification, run:

```sh
node tools/github_release_publish.mjs --version 0.8.17
```

The npm Trusted Publishing workflow runs this automatically for real publish runs. Dry runs do not create or edit GitHub releases.

## Manual UI Fallback

1. Open `https://github.com/Seven128/project-tiny-context-harness/releases/new`.
2. Choose tag `v0.8.17`.
3. Confirm the target is the commit that was published to npm for `project-tiny-context-harness@0.8.17`.
4. Use title `Project Tiny Context Harness 0.8.17`.
5. Paste the release body above.
6. Publish the release.
7. Run `npm run launch:strict-external`.

## Do Not

- Do not retarget `v0.8.17` after the npm publish; it should point to the commit used by the published package.
- Do not claim benchmark wins or adoption in the release.
- Do not mark this as a pre-release if npm `project-tiny-context-harness@0.8.17` remains live and installable.
