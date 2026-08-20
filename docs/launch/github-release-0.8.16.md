# GitHub Release Packet: 0.8.16

Snapshot date: 2026-08-20.

Use this packet to create the GitHub Release for the current public `project-tiny-context-harness` npm package line.

## Release Fields

Tag:

```text
v0.8.16
```

Target:

```text
Use the commit that bumps `packages/ty-context/package.json` to 0.8.16 and is published to npm.
```

Title:

```text
Project Tiny Context Harness 0.8.16
```

Update Mode: `manual-required`

Allowed modes: `sync-only`, `upgrade-required`, `manual-required`.

## Upgrade Impact

Upgrade Impact: `manual follow-up required`.

Release preparation classified this version as `manual-required`: automatic upgrade is insufficient for affected Long-Task consumers because the direct-process observation TCB now validates exact child-visible `root_argv` tokens more strictly. Consumers without an active Long-Task authority and without an older direct-process Contract need only the normal upgrade check. Affected consumers must audit their process target, argv and production Bindings, then recompile or adopt an explicit Authority Revision; prior Progress, evidence and Receipts are not reusable across the new Compile/TCB boundary.

## Release Body

````markdown
Project Tiny Context Harness 0.8.16 is the current public release line under the renamed npm package:

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

If the repository has no active Long-Task authority and no existing direct-process Contract authored against an earlier package, the upgrade commands above complete the update. Otherwise, inspect the affected workdir before forming a new authority:

```sh
npx --yes --package project-tiny-context-harness@latest ty-context long-task doctor <workdir>
npx --yes --package project-tiny-context-harness@latest ty-context long-task preflight <workdir>
```

Audit every direct-process target's exact child-visible `root_argv`, canonical Source target and production Bindings. Quote-bearing tokens, POSIX/UNC absolute paths, drive-prefixed paths, slash/backslash-ambiguous forms and unsupported scheme or compound syntax now fail closed. The general `upgrade --check` plan does not validate this closed argv grammar; affected consumers must use Long-Task `doctor`/`preflight` and treat `process_root_argv_unsafe` as the actionable diagnostic. Replace shell-style quoting with the real child token and a repository-relative production Binding where that is the intended meaning, or explicitly re-author the affected proof as blocking External Confirmation. Existing Active Authority must be recompiled or adopted through an explicit Authority Revision; do not reuse old Progress, evidence or Receipts as acceptance.

Use direct `sync` only for an intentional managed-asset refresh after reviewing the upgrade plan; sync does not run migrations. Upgrade plans report `safe_pending`, `manual_required` and `blocked`.

Publishing a new npm version does not automatically migrate existing repositories. Users receive new upgrade behavior only when they run the newly published CLI through `ty-context upgrade`, `ty-context sync` or another `@latest` package invocation.

## What Changed

- Publishes `project-tiny-context-harness@0.8.16` with the synchronized package assets and CLI build.
- Keeps the install path on the renamed package: `project-tiny-context-harness`.
- Hardens direct-process observation around a Source-backed product root, exact child-visible argv, repository-contained production Bindings, isolated runtime closure, bounded stdout observation and process-tree cleanup. Older ambiguous argv/proof routes now fail closed and require the manual migration above.
- Adds the current Level-4 evidence-governance, acquisition, package-identity and promotion-boundary machinery while keeping the shipped capability at Level 3; real incident/provider/state evidence, independent audit, owner approval and promotion remain external pending.
- Adds and then converges the packet-first positive-default delegation guidance, fixed optional Codex implementation profile and Hook safeguards without adding a scheduler, worker registry, second authority or delegated acceptance path.
- Strengthens workspace snapshot extraction, Git operation ordering, release/Trust routing and package materialization identity so current-candidate verification remains fail closed under partial extraction, concurrent index access and stale artifacts.
- Restores design-resource verification-method Source Claim coverage as the union of the target-root Assertion and the method Assertion, while preserving the general zero-or-one-Claim Assertion contract and semantic-Fact single-Claim attribution.
- Accepts literal parentheses in repository patterns, including Expo Router paths such as `apps/mobile/app/(map)/**`, without adding extglob semantics or weakening existing containment and unsupported-syntax checks.
- Replaces generic checkpoint continuation with the explicit reply `model checkpoint cleared, continue` (`模型切换卡点解除，继续` in Chinese guidance) and states that this remains host prompt guidance: Harness observes neither the next host message nor the model change.
- Separates verifier content changes and evidence invalidation from concrete semantic/proof reduction. Verifier changes remain protected and fail closed when semantic preservation is not independently established, while diagnostics now identify changed verifier files.
- Refreshes canonical Context, managed Workflow surfaces, public documentation, regression coverage and the compact semantic carrier against the same synchronized authority.

## Boundary

This release does not admit generic multi-Claim Assertions, broaden repository patterns into extglob, preserve ambiguous argv as machine proof, weaken observer or External Confirmation boundaries, self-authorize verifier changes, promote the capability to Level 4, or claim that Harness can verify a host model switch. It also does not claim benchmark-proven speedups, production adoption, awards, or replacement of tests, CI, review, specs or project management. It packages the smaller recovery surface: keep the memory, drop the ceremony.

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
node tools/github_release_publish.mjs --version 0.8.16
```

The npm Trusted Publishing workflow runs this automatically for real publish runs. Dry runs do not create or edit GitHub releases.

## Manual UI Fallback

1. Open `https://github.com/Seven128/project-tiny-context-harness/releases/new`.
2. Choose tag `v0.8.16`.
3. Confirm the target is the commit that was published to npm for `project-tiny-context-harness@0.8.16`.
4. Use title `Project Tiny Context Harness 0.8.16`.
5. Paste the release body above.
6. Publish the release.
7. Run `npm run launch:strict-external`.

## Do Not

- Do not retarget `v0.8.16` after the npm publish; it should point to the commit used by the published package.
- Do not claim benchmark wins or adoption in the release.
- Do not mark this as a pre-release if npm `project-tiny-context-harness@0.8.16` remains live and installable.
