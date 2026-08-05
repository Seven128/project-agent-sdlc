# GitHub Release Packet: 0.8.12

Snapshot date: 2026-08-05.

Use this packet to create the GitHub Release for the current public `project-tiny-context-harness` npm package line.

## Release Fields

Tag:

```text
v0.8.12
```

Target:

```text
Use the commit that bumps `packages/ty-context/package.json` to 0.8.12 and is published to npm.
```

Title:

```text
Project Tiny Context Harness 0.8.12
```

Update Mode: `upgrade-required`

Allowed modes: `sync-only`, `upgrade-required`, `manual-required`.

## Upgrade Impact

Upgrade Impact: `safe migration included`.

Release preparation classified this version as `upgrade-required`: the release must ship upgrade/migration implementation and upgrade test evidence before publish. Users should run `ty-context upgrade --check` and then `ty-context upgrade`; direct `sync` is not the release path.

## Release Body

````markdown
Project Tiny Context Harness 0.8.12 is the current public release line under the renamed npm package:

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

- Publishes `project-tiny-context-harness@0.8.12` with the synchronized package assets and CLI build.
- Keeps the install path on the renamed package: `project-tiny-context-harness`.
- Adds the explicit opt-in UI symbolic V2 representation while retaining V1 as the default and allowing mixed V1/V2 targets in one Contract. V2 preserves complete extensional design meaning and fails closed unless Source-side and production-side non-interference are recomputed from frozen current inputs.
- Adds compact selected-design and non-UI semantic carriers that preserve exact Fact and proof-obligation identities without expanded shadow rows, with structural-cost guards and current-snapshot proof retained.
- Separates the default Workflow Contract from explicit Long-Task routing by assurance need: complexity controls engineering depth, while machine completion authority, recovery or auditability selects Long-Task.
- Retires the managed `source-plan-authoring` pointer. The versioned upgrade removes only the exact former package-owned Skill and reports modified same-name content for manual review; legacy Source Plan documents remain ordinary Source.
- Adds the optional fixed Codex `long_task_implementation` profile after the Authority-Lock checkpoint. Exact selector checks fail closed, parent execution remains the fallback, and Source, Contract, Context, verification and Final Gate authority stay with the parent Goal.
- Converges package-managed Skills onto compact routers with on-demand references, refreshes generated/package assets, and hardens Git EOL/current-input binding plus affected/CI verification routing.
- Marks the release `upgrade-required`; users should run `ty-context upgrade --check` and `ty-context upgrade` rather than relying on direct `sync`.

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
node tools/github_release_publish.mjs --version 0.8.12
```

The npm Trusted Publishing workflow runs this automatically for real publish runs. Dry runs do not create or edit GitHub releases.

## Manual UI Fallback

1. Open `https://github.com/Seven128/project-tiny-context-harness/releases/new`.
2. Choose tag `v0.8.12`.
3. Confirm the target is the commit that was published to npm for `project-tiny-context-harness@0.8.12`.
4. Use title `Project Tiny Context Harness 0.8.12`.
5. Paste the release body above.
6. Publish the release.
7. Run `npm run launch:strict-external`.

## Do Not

- Do not retarget `v0.8.12` after the npm publish; it should point to the commit used by the published package.
- Do not claim benchmark wins or adoption in the release.
- Do not mark this as a pre-release if npm `project-tiny-context-harness@0.8.12` remains live and installable.
