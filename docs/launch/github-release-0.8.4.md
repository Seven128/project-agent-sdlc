# GitHub Release Packet: 0.8.4

Snapshot date: 2026-07-28.

Use this packet to create the GitHub Release for the current public `project-tiny-context-harness` npm package line.

## Release Fields

Tag:

```text
v0.8.4
```

Target:

```text
Use the commit that bumps `packages/ty-context/package.json` to 0.8.4 and is published to npm.
```

Title:

```text
Project Tiny Context Harness 0.8.4
```

Update Mode: `upgrade-required`

Allowed modes: `sync-only`, `upgrade-required`, `manual-required`.

## Upgrade Impact

Upgrade Impact: `safe migration included`.

Release preparation classified this version as `upgrade-required`: the release must ship upgrade/migration implementation and upgrade test evidence before publish. Users should run `ty-context upgrade --check` and then `ty-context upgrade`; direct `sync` is not the release path.

## Release Body

````markdown
Project Tiny Context Harness 0.8.4 is the current public release line under the renamed npm package:

```sh
npm install -D project-tiny-context-harness@latest
npx --yes --package project-tiny-context-harness@latest ty-context init
make validate-context
```

Update mode: `upgrade-required`. After updating the package, run:

```sh
npx --yes --package project-tiny-context-harness@latest ty-context upgrade --check
npx --yes --package project-tiny-context-harness@latest ty-context upgrade
```

Use `sync` directly only for releases explicitly marked `sync-only`; sync does not run migrations. Upgrade plans report `safe_pending`, `manual_required` and `blocked`.

Publishing a new npm version does not automatically migrate existing repositories. Users receive new upgrade behavior only when they run the newly published CLI through `ty-context upgrade`, `ty-context sync` or another `@latest` package invocation.

## What Changed

- Publishes `project-tiny-context-harness@0.8.4` with the synchronized package assets and CLI build.
- Keeps the install path on the renamed package: `project-tiny-context-harness`.
- Adds the explicit-only `design-system-authoring` cold-start flow for generating, selecting and adopting Open Design systems into canonical project Design Authority.
- Gates only style-bearing `design-resource-authoring` work on configured Design Authority, verifies Open Design project binding, and reconciles accepted final decisions into the initial proposal once.
- Sends revised proposals and selected resources directly into the `long-task-workflow` Skill's Source-bound Contract Draft loop; Source completeness and Contract mapping converge there without an internal Source-authoring stage, while `source-plan-authoring` remains only a retired compatibility pointer.
- Keeps the authority boundary explicit: provider candidates and bindings are provenance, while `DESIGN.md`, its one authored token source and owning `project_context/**` remain canonical.
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
node tools/github_release_publish.mjs --version 0.8.4
```

The npm Trusted Publishing workflow runs this automatically for real publish runs. Dry runs do not create or edit GitHub releases.

## Manual UI Fallback

1. Open `https://github.com/Seven128/project-tiny-context-harness/releases/new`.
2. Choose tag `v0.8.4`.
3. Confirm the target is the commit that was published to npm for `project-tiny-context-harness@0.8.4`.
4. Use title `Project Tiny Context Harness 0.8.4`.
5. Paste the release body above.
6. Publish the release.
7. Run `npm run launch:strict-external`.

## Do Not

- Do not retarget `v0.8.4` after the npm publish; it should point to the commit used by the published package.
- Do not claim benchmark wins or adoption in the release.
- Do not mark this as a pre-release if npm `project-tiny-context-harness@0.8.4` remains live and installable.
