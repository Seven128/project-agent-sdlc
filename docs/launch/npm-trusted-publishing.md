# npm Trusted Publishing Runbook

Snapshot date: 2026-06-10.

This runbook records the post-first-publish release path for `project-tiny-context-harness`. The package now exists on npm, and Trusted Publishing is the preferred path for each new version.

## Official npm Sources Checked

- Trusted publishing for npm packages: <https://docs.npmjs.com/trusted-publishers/>
- Generating provenance statements: <https://docs.npmjs.com/generating-provenance-statements/>

Important current constraints:

- Trusted publishing uses OIDC from a supported CI/CD workflow instead of long-lived npm publish tokens.
- GitHub Actions trusted publishing requires npm CLI version 11.5.1 or later and Node version 22.14.0 or higher.
- GitHub Actions workflows need `permissions: id-token: write` for npm trusted publishing and `permissions: contents: write` for the post-publish GitHub Release create/update step.
- GitHub-hosted runners are supported; self-hosted runners are not currently supported.
- npm does not verify trusted publisher fields when saving them. Repository, workflow filename and environment details must match exactly.
- Trusted publishing from GitHub Actions for a public package in a public repository automatically generates provenance attestations.

## Current Boundary

The renamed package exists on npm. Use local token publishing only as an emergency fallback.

The current published package is `project-tiny-context-harness@0.8.3`. Prefer one real workflow run through GitHub Actions Trusted Publishing; use the local fallback only when workflow dispatch is unavailable and the normal release checks pass. `dry_run: true` remains an optional prepare-only diagnostic, not a mandatory rehearsal that duplicates the full suite. Do not publish different bytes for an existing version; npm versions are immutable.

Real publish runs also create or update the matching GitHub Release from `docs/launch/github-release-<version>.md` by running `node tools/github_release_publish.mjs --version <version> --target <github.sha>`. Dry runs do not create or edit GitHub releases.

Because npm package README content is also tied to the immutable published version, local README copy changes will not appear on npm until a new version is published. Treat a stale `npm-readme-renamed-surfaces` info item from `npm run launch:strict-external` as a conversion cleanup task for the next patch release, not as permission to republish the existing version.

Prepare a future release locally, then commit and push the versioned release surfaces before publishing:

```sh
npm run release:prepare -- --fast --version patch --update-mode sync-only
git diff --stat
git add -A
git commit -m "Release <new-version>"
git push origin main
```

Use the default preparation gate without `--fast` when the release touches upgrade/migration logic or broad package behavior. This local authoring check does not replace the complete release regression owned by the Trusted Publishing prepare job.

`release:prepare` owns the upgrade impact review for the release. Maintainers should not need a separate reminder to "check upgrade changes": if changed files are upgrade-sensitive, `sync-only` fails; `upgrade-required` must include upgrade/migration implementation plus upgrade test evidence; `manual-required` must generate release-packet text that tells users which manual follow-up remains.

For an emergency local fallback after that committed preparation, use:

```sh
npm run release:publish -- --local-fallback --yes
```

The fallback verifies the prepared artifact identity, runs the complete package suite with `npm test --workspace project-tiny-context-harness`, and runs the full exact-tarball smoke against those same bytes before `npm publish`. It never repacks an untested artifact. The fallback is an alternate publication channel, not a weaker completion authority, so it includes Long-Task package behavior rather than using `--portable-only`.

Add `--registry-smoke` only when you want the slower post-publish install smoke in addition to registry `latest` verification.

Publishing a new npm version does not automatically migrate existing repositories. It publishes the current CLI code and package assets; users receive new upgrade behavior only when they run the newly published CLI through `ty-context upgrade`, `ty-context sync` or another `@latest` package invocation.

Use [npm-credential-unblock.md](npm-credential-unblock.md) if that fails with a 403 credentials error.

Now that `project-tiny-context-harness` exists on npm, use `.github/workflows/npm-publish.yml` instead of a local long-lived publish token for future releases whenever possible. Direct GitHub Actions URL:

<https://github.com/Seven128/project-tiny-context-harness/actions/workflows/npm-publish.yml>

## npm Trusted Publisher Configuration

On npmjs.com, open the package settings for `project-tiny-context-harness` and configure:

| Field | Value |
|---|---|
| Publisher | GitHub Actions |
| Organization or user | `Seven128` |
| Repository | `project-tiny-context-harness` |
| Workflow filename | `npm-publish.yml` |
| Environment name | `npm-publish` |
| Allowed actions | `npm publish` |

Enter only `npm-publish.yml` for the workflow filename, not `.github/workflows/npm-publish.yml`.

If the npm settings page cannot be opened because the package unexpectedly returns 404, recover the registry state before using this runbook.

## GitHub Workflow

The repository workflow is `.github/workflows/npm-publish.yml`:

<https://github.com/Seven128/project-tiny-context-harness/actions/workflows/npm-publish.yml>

It is manual-only:

- `workflow_dispatch` prevents accidental publish on every push or tag.
- `dry_run` defaults to `true`.
- `expected_version` must match `packages/ty-context/package.json`.
- Versioned release surfaces must be prepared before commit with `npm run release:prepare -- --version <patch|minor|major|x.y.z> --update-mode <sync-only|upgrade-required|manual-required>`; the workflow verifies this with `npm run release:check-version`.
- The prepare and publish jobs run on `ubuntu-latest` with Node `24`; only the publish job receives the protected `npm-publish` environment and write/OIDC permissions.
- The workflow installs the explicitly pinned npm CLI version declared in the workflow (`12.0.1` at this snapshot); it never uses unbounded `npm@latest`.
- The prepare job builds/typechecks the package, runs the complete default and Long-Task Workflow test suites, package source drift, `make validate-harness` and Quickstart Smoke, then packs exactly once. The verifier accepts the npm 11 array and npm 12 workspace-keyed JSON shapes while requiring exactly one packed artifact.
- The prepare job records the dispatch source commit, tarball SHA-256, CRLF/LF-stable `package-lock.json` identity and Node/npm build provenance, runs the exact-tarball install smoke, then uploads only that verified tarball and runtime attestation.
- After environment approval, the publish job downloads that same-run artifact and verifies source commit, lockfile identity, filename and tarball SHA-256. It does not install dependencies, rebuild, rerun the complete suite, repack or rerun smoke. Node/npm versions are provenance rather than a requirement that the non-building publisher process reproduce the preparation environment.
- It installs that exact packed tarball into an empty temporary repository and runs `ty-context init`, `doctor`, `validate-context` and a `long-task-delivery-v2` final-gate black box before publishing only the tested tarball path. The full smoke uses a real marked Source file, a set-equal exact Source Claim, a criterion-identical Claim-bearing Assertion, an Outcome Binding and a same-Check Counterfactual that covers both `result` and its Source-backed non-Result Claim. The reusable fixture is also executed directly by the local built-CLI test; static YAML regex checks are not treated as Contract proof.
- Emergency fallback and Trusted Publishing both run this same full Long-Task verification against the exact prepared tarball, never `--portable-only`. This documents the release gate implemented in the repository; it does not claim that the currently published version contains unshipped local changes.
- The publish job runs only when `dry_run` is false. The artifact name is stable for the workflow run, so retrying only the failed publish job reuses the successful prepare artifact; rerunning all jobs replaces it only after prepare succeeds again. If a retry finds the same version already published, it proceeds only when registry integrity matches the prepared tarball exactly; mismatched bytes fail closed.
- The GitHub Release create/update step runs only after a real publish, uses the release packet body and marks `v<version>` as the latest release.
- The workflow must not define `NPM_TOKEN` or `NODE_AUTH_TOKEN`; publish authentication should come from OIDC.

## Optional Dry Run

Open <https://github.com/Seven128/project-tiny-context-harness/actions/workflows/npm-publish.yml>, click **Run workflow**, choose branch `main`, then run **npm Trusted Publish** with the next committed package version:

```text
expected_version: <new-version>
dry_run: true
```

Expected result:

- package build succeeds,
- source drift check passes,
- Context validation passes,
- the single packed tarball is bound to an ephemeral Release Artifact V2 byte/environment/lockfile attestation and that exact path passes the install smoke,
- no npm publish occurs,
- no GitHub Release is created or edited.

The maintainer verified the historical `0.2.41` dry run and real publish on 2026-06-10 after configuring npm Trusted Publishing. Current releases do not require both invocations.

## Real Publish

After a new package version is committed on `main`, run one real workflow with that version:

```text
expected_version: <new-version>
dry_run: false
```

That one run performs the complete prepare gate once, pauses at the protected publish environment if approval is configured, then publishes the already tested artifact. Do not precede every real run with a duplicate dry run.

Then verify:

```sh
npm run launch:strict-external
npm run launch:demo -- --out-dir tmp/ty-context/launch-demo/latest --package-spec project-tiny-context-harness@latest --clean
npm view project-tiny-context-harness readme --json
gh release view v<new-version>
```

The strict external check must no longer fail `npm-fetch`. The npm README should no longer report stale pre-rename display, package or repository names. The latest GitHub Release should be `Project Tiny Context Harness <new-version>`.

## After Trusted Publishing Works

- Prefer this workflow over local token-based publishing.
- Revoke unused npm publish tokens.
- Consider npm package settings that require two-factor authentication and disallow traditional tokens after the trusted path has completed at least one release.
- Keep `docs/launch/npm-publish-runbook.md` for emergency local publish fallback and first-publish notes.

## Do Not Do

- Do not configure `NPM_TOKEN` or `NODE_AUTH_TOKEN` for the publish job.
- Do not claim future releases used Trusted Publishing unless that specific version was actually published by this workflow.
- Do not post broad launch copy if `npm-fetch` fails.
- Do not change the workflow filename, GitHub environment name or repository owner without updating the npm trusted publisher configuration.
