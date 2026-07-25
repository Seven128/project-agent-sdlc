# GitHub Release Packet: 0.8.1

Snapshot date: 2026-07-25.

Use this packet to create the GitHub Release for the current public `project-tiny-context-harness` npm package line.

## Release Fields

Tag:

```text
v0.8.1
```

Target:

```text
Use the commit that bumps `packages/ty-context/package.json` to 0.8.1 and is published to npm.
```

Title:

```text
Project Tiny Context Harness 0.8.1
```

Update Mode: `sync-only`

Allowed modes: `sync-only`, `upgrade-required`, `manual-required`.

## Upgrade Impact

Upgrade Impact: `none`.

Release preparation classified this version as `sync-only`: no user-project migration is required. Users receive any new managed assets or CLI behavior only after running the newly published CLI, and `ty-context upgrade --check` remains the default diagnostic path before a direct managed-asset `sync`.

## Release Body

````markdown
Project Tiny Context Harness 0.8.1 is the current public release line under the renamed npm package:

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

- Publishes `project-tiny-context-harness@0.8.1` with the synchronized package assets and CLI build.
- Defines complete selected-design conformance once for a selected `design-resource-handoff-v1`, with lightweight default Contract Conformance and Long-Task Final Gate as mutually exclusive carriers.
- Conserves every covered Source Item, declared verification method, blocker, selected target and applicable condition through the production owner, cold-start journey and independently failing current-candidate proof.
- Adds deterministic Design Source Projection across all eight UI/UX dimensions and exactly one canonical adoption record per target in `DESIGN.md` or the owning Screen Contract.
- Extends the managed Screen template, Design Authority guidance and default workflow routing without adding a design lifecycle, second Gate, persisted matrix, readiness state or Long-Task schema/runtime.
- Adds a fixed fresh-agent UI/UX Context/target recovery benchmark fixture, routing gold and hidden oracle while keeping static checks honest that only independent paired Agent runs can support effectiveness or ROI claims.
- Keeps default Context byte budgets advisory: genuine recovery facts take precedence, `doctor` warns on overages and the source release suite no longer converts the absolute byte heuristic into an acceptance gate.
- Normalizes package TypeScript formatting required by Trusted Publish; no user-project migration is required.

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
node tools/github_release_publish.mjs --version 0.8.1
```

The npm Trusted Publishing workflow runs this automatically for real publish runs. Dry runs do not create or edit GitHub releases.

## Manual UI Fallback

1. Open `https://github.com/Seven128/project-tiny-context-harness/releases/new`.
2. Choose tag `v0.8.1`.
3. Confirm the target is the commit that was published to npm for `project-tiny-context-harness@0.8.1`.
4. Use title `Project Tiny Context Harness 0.8.1`.
5. Paste the release body above.
6. Publish the release.
7. Run `npm run launch:strict-external`.

## Do Not

- Do not retarget `v0.8.1` after the npm publish; it should point to the commit used by the published package.
- Do not claim benchmark wins or adoption in the release.
- Do not mark this as a pre-release if npm `project-tiny-context-harness@0.8.1` remains live and installable.
