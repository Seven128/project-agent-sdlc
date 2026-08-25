# GitHub Release Packet: 0.9.0

Snapshot date: 2026-08-25.

Use this packet to create the GitHub Release for the current public `project-tiny-context-harness` npm package line.

## Release Fields

Tag:

```text
v0.9.0
```

Target:

```text
Use the commit that bumps `packages/ty-context/package.json` to 0.9.0 and is published to npm.
```

Title:

```text
Project Tiny Context Harness 0.9.0
```

Update Mode: `manual-required`

Allowed modes: `sync-only`, `upgrade-required`, `manual-required`.

## Upgrade Impact

Upgrade Impact: `manual follow-up required`.

Release preparation classified this version as `manual-required`: automatic upgrade is insufficient for the full user-project change, and the release body must tell users which `manual_required` items to inspect or change after `ty-context upgrade --check`.

## Release Body

````markdown
Project Tiny Context Harness 0.9.0 is the current public release line under the renamed npm package:

```sh
npm install -D project-tiny-context-harness@latest
npx --yes --package project-tiny-context-harness@latest ty-context init
make validate-context
```

Update mode: `manual-required`. After updating the package, run:

```sh
npx --yes --package project-tiny-context-harness@latest ty-context upgrade --check
npx --yes --package project-tiny-context-harness@latest ty-context upgrade
```

Use `sync` directly only for releases explicitly marked `sync-only`; sync does not run migrations. Upgrade plans report `safe_pending`, `manual_required` and `blocked`.

Publishing a new npm version does not automatically migrate existing repositories. Users receive new upgrade behavior only when they run the newly published CLI through `ty-context upgrade`, `ty-context sync` or another `@latest` package invocation.

## What Changed

- Publishes `project-tiny-context-harness@0.9.0` with the synchronized package assets and CLI build.
- Conserves every strict-UTF-8 material Source/attachment/specification/preservation/constraint/delegation/text-design input through complete non-overlapping Fragment line coverage, one explicit disposition, reverse Fact provenance, exact semantic-cell supersession/exclusion and Claim modal polarity; unreadable or ambiguous text fails closed.
- Enforces closed typed method/property proof floors for product effects, external boundaries, persistence, identity/data state, complete populations, failure/recovery, concurrency, performance, selected visual meaning and target runtime. Custom semantics cannot machine-close, claimless Checks remain diagnostic and Expected authority cannot be self-authored by implementation output.
- Resolves completion authority per exact Claim/Fact × method × applicability obligation. Exactly one machine route or one external route is allowed; machine/external overlap, duplicate same-kind routes and no route block before Authority Lock, and broad `impact_claims` never removes machine proof.
- Adds authenticated per-obligation External Confirmation Record v2 through `external prepare`, `submit`, `status`, `rotate` and `revoke`: protected Source-bound Ed25519 public-key identity, current challenge, whole-candidate binding, immutable content-addressed artifact snapshots and Source-backed judgment. Record v1 remains audit-only.
- Adds `delivery_accepted` as the external-fulfilled terminal while retaining `machine_accepted` for all-machine delivery; pending, failed, unable, stale or invalid external rows cannot close or clear Active Authority.
- Adds a short existing-lock Finalization CAS after the one machine-check execution. It binds `finalization_identity_sha256` into Receipt v3 and atomically publishes the Receipt plus accepted Stop/Close Authority cleanup; candidate, Authority, verifier, record, challenge, signature or artifact races fail closed without clearing Authority.
- Enriches Findings and derives a non-authoritative Repair Frontier with minimum diagnostic reruns and still-valid evidence, without adding a scheduler, queue, second Gate or acceptance cache.
- Keeps the admitted machine observer set closed to package-owned exact static JSON and direct process JSON. Ed25519 proves possession of the Source-bound key, not real-world identity beyond that binding; this release adds no generic Browser/Native/Device adapter registry or authentication-provider registry.

## Manual Migration

- A missing `task.target_profile.completion_authority` deterministically defaults to `machine_only` and emits migration guidance. Keep that value explicitly for all-machine delivery, or make a real Source/owner decision to select `declared_authorities`.
- Exact unchanged Fragment projections are preserved. Changed or missing projections receive current refs/digests with `decision_required`; migration does not infer Fact lineage, polarity, supporting status, supersession or scope exclusion and removes stale anchors/provenance.
- Every blocking external route under `declared_authorities` must be re-authored with exact actor Ed25519 identity assurance/public-key Source, target, environment, Given/When, evidence requirements and per-obligation Expected/Actual-or-Source-backed-judgment decomposition. Migration never invents authority or signatures; Record v1 cannot fulfill.
- New Final Gates emit `long-task-final-receipt-v3` with `finalization_identity_sha256`. Historical v2 Receipts and v3 Receipts without that identity remain audit-readable only; `machine_accepted_external_pending` cannot be upgraded or used to close.
- Run `ty-context upgrade --check`, review every `manual_required` item, update owning Source/Contract, then recompile and rerun the current Final Gate. Historical Progress, Receipts and external records are not reusable acceptance evidence.

## Boundary

This release does not claim benchmark-proven speedups, production adoption, awards, or replacement of tests, CI, review, specs or project management. The sanitized Starward-shaped replay is mechanism-only because original public material, mapping, authorization and representativeness are unavailable. The existing ten-category Real Process ROI result remains `not_evaluated`/unsupported until its external formal inputs exist; no positive ROI claim is made. It preserves the smaller recovery surface: keep the memory, drop the ceremony.

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
node tools/github_release_publish.mjs --version 0.9.0
```

The npm Trusted Publishing workflow runs this automatically for real publish runs. Dry runs do not create or edit GitHub releases.

## Manual UI Fallback

1. Open `https://github.com/Seven128/project-tiny-context-harness/releases/new`.
2. Choose tag `v0.9.0`.
3. Confirm the target is the commit that was published to npm for `project-tiny-context-harness@0.9.0`.
4. Use title `Project Tiny Context Harness 0.9.0`.
5. Paste the release body above.
6. Publish the release.
7. Run `npm run launch:strict-external`.

## Do Not

- Do not retarget `v0.9.0` after the npm publish; it should point to the commit used by the published package.
- Do not claim benchmark wins or adoption in the release.
- Do not mark this as a pre-release if npm `project-tiny-context-harness@0.9.0` remains live and installable.
