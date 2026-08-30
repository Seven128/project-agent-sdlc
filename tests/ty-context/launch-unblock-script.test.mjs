import assert from "node:assert/strict";
import { renderMarkdown } from "../../tools/launch_unblock_check.mjs";

function baseReport(npmStatus) {
  return {
    generatedAt: "2026-06-10T00:00:00.000Z",
    status: "blocked",
    npm: {
      package: { version: "0.2.40" },
      summary: {
        status: npmStatus,
        nextAction:
          npmStatus === "auth-needed"
            ? "Run npm login or configure a publish-capable npm token, then rerun npm run launch:npm-access."
            : "Run npm run release:prepare -- --version 0.2.40 --update-mode sync-only, commit and push the prepared release, then run npm run release:publish -- --local-fallback --yes.",
      },
    },
    github: { aligned: false },
    readiness: { summary: { status: "fail" } },
    externalTodos: [
      {
        id: "npm-fetch",
        detail:
          "https://registry.npmjs.org/project-tiny-context-harness/latest returned HTTP 404",
      },
      {
        id: "github-homepage",
        detail:
          "GitHub homepage should point to the repository while npm returns 404",
      },
    ],
    externalInfoActions: [],
    releaseDelta: null,
  };
}

const authNeeded = renderMarkdown(baseReport("auth-needed"));
assert.match(authNeeded, /Status: auth-needed/);
assert.match(authNeeded, /npm login/);
assert.match(authNeeded, /After npm auth or token permissions are fixed/);
assert.match(authNeeded, /docs\/launch\/npm-credential-unblock\.md/);
assert.match(
  authNeeded,
  /Do not store tokens, OTP values or `\.npmrc` content/,
);

const firstPublish = renderMarkdown(baseReport("first-publish-needed"));
assert.match(firstPublish, /Status: first-publish-needed/);
assert.match(
  firstPublish,
  /npm run release:prepare -- --version 0\.2\.40 --update-mode sync-only/,
);
assert.match(firstPublish, /git add -A/);
assert.match(firstPublish, /git commit -m "Release 0\.2\.40"/);
assert.match(firstPublish, /npm run release:publish -- --local-fallback --yes/);
assert.match(
  firstPublish,
  /Add `--registry-smoke` only when you want the slower post-publish install smoke/,
);
assert.match(firstPublish, /If npm returns E403/);

const ready = renderMarkdown({
  generatedAt: "2026-06-10T00:00:00.000Z",
  status: "ready",
  npm: { summary: { status: "published", nextAction: "ok" } },
  github: { aligned: true },
  readiness: { summary: { status: "pass" } },
  externalTodos: [],
  externalInfoActions: [],
  releaseDelta: null,
});
assert.doesNotMatch(ready, /npm login/);
assert.doesNotMatch(ready, /npm run launch:github-metadata -- --apply/);
assert.doesNotMatch(ready, /Broad launch remains blocked/);
assert.match(ready, /Broad launch gate is clear/);

const readyWithCleanup = renderMarkdown({
  generatedAt: "2026-06-10T00:00:00.000Z",
  status: "ready-with-cleanup",
  npm: { summary: { status: "published", nextAction: "ok" } },
  github: { aligned: true },
  readiness: { summary: { status: "pass" } },
  externalTodos: [],
  externalInfoActions: [
    {
      id: "npm-readme-renamed-surfaces",
      detail: "npm README still contains stale pre-rename copy.",
    },
  ],
  releaseDelta: {
    localVersion: "0.2.41",
    publishedVersion: "0.2.40",
    workflowUrl:
      "https://github.com/Seven128/project-tiny-context-harness/actions/workflows/npm-publish.yml",
    nextAction:
      "Run GitHub Actions npm Trusted Publish with expected_version 0.2.41.",
  },
});
assert.match(readyWithCleanup, /Status: ready-with-cleanup/);
assert.match(
  readyWithCleanup,
  /required broad-launch gate: ready; npm publish cleanup remains/,
);
assert.match(readyWithCleanup, /Non-Blocking External Info/);
assert.match(readyWithCleanup, /npm-readme-renamed-surfaces/);
assert.match(readyWithCleanup, /npm Trusted Publishing cleanup/);
assert.match(
  readyWithCleanup,
  /local package is 0\.2\.41; npm latest is 0\.2\.40/,
);
assert.match(
  readyWithCleanup,
  /https:\/\/github\.com\/Seven128\/project-tiny-context-harness\/actions\/workflows\/npm-publish\.yml/,
);
assert.match(readyWithCleanup, /expected_version: 0\.2\.41/);
assert.match(readyWithCleanup, /dry_run: false/);
assert.match(readyWithCleanup, /optional prepare-only diagnostic/);
assert.doesNotMatch(readyWithCleanup, /If the dry run succeeds/);
assert.match(readyWithCleanup, /without `NPM_TOKEN` or `NODE_AUTH_TOKEN`/);
assert.match(
  readyWithCleanup,
  /Required broad launch gate is clear, but npm publish cleanup remains/,
);
