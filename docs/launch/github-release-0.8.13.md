# GitHub Release Packet: 0.8.13

Snapshot date: 2026-08-12.

Use this packet to create the GitHub Release for the current public `project-tiny-context-harness` npm package line.

## Release Fields

Tag:

```text
v0.8.13
```

Target:

```text
Use the commit that bumps `packages/ty-context/package.json` to 0.8.13 and is published to npm.
```

Title:

```text
Project Tiny Context Harness 0.8.13
```

Update Mode: `sync-only`

Allowed modes: `sync-only`, `upgrade-required`, `manual-required`.

## Upgrade Impact

Upgrade Impact: `none`.

Release preparation classified this version as `sync-only`: no user-project migration is required. Users receive any new managed assets or CLI behavior only after running the newly published CLI, and `ty-context upgrade --check` remains the default diagnostic path before a direct managed-asset `sync`.

## Release Body

````markdown
Project Tiny Context Harness 0.8.13 is the current public release line under the renamed npm package:

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

- Publishes `project-tiny-context-harness@0.8.13` with the synchronized package assets and CLI build.
- Keeps the install path on the renamed package: `project-tiny-context-harness`.
- Adds bounded, task-local `design-resource-authoring` recovery with replayable decisions, digest/CAS-guarded updates, semantic reconciliation and owner-scoped writeback; simple previews still create no recovery state.
- Extends Long-Task machine observation with frozen static carriers and Harness-spawned direct-process JSON observation, binding execution roots, argv closure, runtime values and exact comparisons to current Source and production Bindings.
- Hardens Counterfactual and observer trust boundaries against historical replay, verifier/evidence proxying, runner-mutated carriers, wrong execution roots and non-causal production observations while retaining admitted must-allow controls.
- Adds the real-process workload and admission evidence lanes used to measure known-path lifecycle behavior and implementation cost without promoting the capability beyond Level 3 or claiming complete total-cost ROI.
- Fixes the package compiler fixture's cross-platform product-root assertion and recalibrates controlled Ubuntu CI to the versioned `github-ubuntu-v2` catastrophic ceilings for the expanded complete test population without removing tests or weakening sentinel coverage.
- Strengthens shared engineering guidance and regression routing while preserving one Context owner, one workflow conformance carrier and the existing `sync-only` consumer update path for this release.

## Boundary

This release does not claim benchmark-proven speedups, production adoption, awards, or replacement of tests, CI, review, specs or project management. It packages the smaller recovery surface: keep the memory, drop the ceremony.

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
node tools/github_release_publish.mjs --version 0.8.13
```

The npm Trusted Publishing workflow runs this automatically for real publish runs. Dry runs do not create or edit GitHub releases.

## Manual UI Fallback

1. Open `https://github.com/Seven128/project-tiny-context-harness/releases/new`.
2. Choose tag `v0.8.13`.
3. Confirm the target is the commit that was published to npm for `project-tiny-context-harness@0.8.13`.
4. Use title `Project Tiny Context Harness 0.8.13`.
5. Paste the release body above.
6. Publish the release.
7. Run `npm run launch:strict-external`.

## Do Not

- Do not retarget `v0.8.13` after the npm publish; it should point to the commit used by the published package.
- Do not claim benchmark wins or adoption in the release.
- Do not mark this as a pre-release if npm `project-tiny-context-harness@0.8.13` remains live and installable.
