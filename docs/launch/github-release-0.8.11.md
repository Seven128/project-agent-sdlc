# GitHub Release Packet: 0.8.11

Snapshot date: 2026-07-31.

Use this packet to create the GitHub Release for the current public `project-tiny-context-harness` npm package line.

## Release Fields

Tag:

```text
v0.8.11
```

Target:

```text
Use the commit that bumps `packages/ty-context/package.json` to 0.8.11 and is published to npm.
```

Title:

```text
Project Tiny Context Harness 0.8.11
```

Update Mode: `sync-only`

Allowed modes: `sync-only`, `upgrade-required`, `manual-required`.

## Upgrade Impact

Upgrade Impact: `none`.

Release preparation classified this version as `sync-only`: no user-project migration is required. Users receive any new managed assets or CLI behavior only after running the newly published CLI, and `ty-context upgrade --check` remains the default diagnostic path before a direct managed-asset `sync`.

## Release Body

````markdown
Project Tiny Context Harness 0.8.11 is the current public release line under the renamed npm package:

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

- Publishes `project-tiny-context-harness@0.8.11` with the synchronized package assets and CLI build.
- Keeps the install path on the renamed package: `project-tiny-context-harness`.
- Keeps the shipped `design-resource-handoff-v1` marker and adds the compact `representation: manifest_backed` profile: the canonical per-target observable-Fact manifest remains the sole complete Fact/Census/proof index, while the handoff carries only residual Source, scope, resource, target, closure, coverage and proposal bindings.
- Adds `ty-context design-resource bundle` for one-target-per-file DSA output with an explicit UTF-8 byte ceiling, complete manifest/target identity checks, sequential bounded preflight and whole-directory atomic publication. Capacity pressure never permits splitting a semantic target, sampling, truncation or Fact coarsening.
- Retains read compatibility for older embedded V1 handoffs and runs both representations through the same normalized semantic, locator, dependency, universe and proof validators.
- Replaces whole-document multiline fence matching with bounded line scanning and removes duplicate resource reads and large transient Fact-universe/projection copies.
- Limits Long-Task changes to its existing handoff-consumption adapter seam; Contract, Authority, Outcome, Final Gate, state/recovery and completion semantics are unchanged.
- Splits draft staging, handoff input types and public type forwarding into focused internal owners while preserving the package root API, satisfying the fail-on-warning Harness modularity gate without a waiver.
- Makes package updates explicit through release update modes: `sync-only`, `upgrade-required`, `manual-required`.

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
node tools/github_release_publish.mjs --version 0.8.11
```

The npm Trusted Publishing workflow runs this automatically for real publish runs. Dry runs do not create or edit GitHub releases.

## Manual UI Fallback

1. Open `https://github.com/Seven128/project-tiny-context-harness/releases/new`.
2. Choose tag `v0.8.11`.
3. Confirm the target is the commit that was published to npm for `project-tiny-context-harness@0.8.11`.
4. Use title `Project Tiny Context Harness 0.8.11`.
5. Paste the release body above.
6. Publish the release.
7. Run `npm run launch:strict-external`.

## Do Not

- Do not retarget `v0.8.11` after the npm publish; it should point to the commit used by the published package.
- Do not claim benchmark wins or adoption in the release.
- Do not mark this as a pre-release if npm `project-tiny-context-harness@0.8.11` remains live and installable.
