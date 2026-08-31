import assert from "node:assert/strict";
import test from "node:test";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  applyStatusHints,
  buildNextSteps,
  findOpenedCuratedListPrs,
  findShowHnFeedbackNote,
  recommendedNext,
  renderMarkdown,
  showHnPrefillUrl,
} from "../../tools/launch_next_steps.mjs";

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);
const scriptPath = path.join(repoRoot, "tools/launch_next_steps.mjs");
const packageManifest = JSON.parse(
  readFileSync(
    path.join(repoRoot, "packages", "ty-context", "package.json"),
    "utf8",
  ),
);
const packageVersionPattern = packageManifest.version.replace(/\./g, "\\.");
const steps = buildNextSteps({ packageVersion: packageManifest.version });
assert.deepEqual(
  steps.map((step) => step.id),
  [
    "npm-trusted-publish",
    `github-release-${packageManifest.version}`,
    "show-hn",
    "feedback-note",
    "show-hn-first-comment",
    "curated-list-prs",
    "monitor-feedback",
  ],
);

const markdown = renderMarkdown(steps);
assert.match(markdown, /Launch Next Steps/);
assert.match(
  markdown,
  /read-only: it does not publish to npm, create releases, post to HN or open PRs/,
);
assert.match(markdown, /npm run launch:unblock -- --strict/);
assert.match(
  markdown,
  /https:\/\/github\.com\/Seven128\/project-tiny-context-harness\/actions\/workflows\/npm-publish\.yml/,
);
assert.match(
  markdown,
  new RegExp(`expected_version: ${packageVersionPattern}`),
);
assert.match(markdown, /dry_run: false/);
assert.doesNotMatch(markdown, /then dry_run: false/);
assert.match(
  markdown,
  new RegExp(
    `https://github\\.com/Seven128/project-tiny-context-harness/releases/new\\?tag=v${packageVersionPattern}`,
  ),
);
assert.match(
  markdown,
  new RegExp(`docs/launch/github-release-${packageVersionPattern}\\.md`),
);
assert.match(markdown, /https:\/\/news\.ycombinator\.com\/submit/);
assert.match(
  markdown,
  /https:\/\/news\.ycombinator\.com\/submitlink\?u=https%3A%2F%2Fgithub\.com%2FSeven128%2Fproject-tiny-context-harness&t=Show%20HN%3A%20Tiny%20project%20memory%20for%20coding%20agents/,
);
assert.match(markdown, /docs\/launch\/primary-launch\.md/);
assert.match(
  markdown,
  /npm run launch:feedback-note -- --channel show-hn --url <show-hn-url>/,
);
assert.match(markdown, /show-hn-first-comment/);
assert.match(markdown, /Post the first regular HN comment/);
assert.match(markdown, /npm run launch:external-prs -- --live --clean/);
assert.match(markdown, /Monitor launch feedback and first-day metrics/);
assert.match(markdown, /show-hn-hn-6h\.md/);
assert.match(markdown, /NPM_TOKEN \/ NODE_AUTH_TOKEN/);
assert.doesNotMatch(markdown, /npm publish --workspace/);

const jsonResult = spawnSync(process.execPath, [scriptPath, "--json"], {
  cwd: repoRoot,
  encoding: "utf8",
  timeout: 30_000,
  windowsHide: true,
});
assert.equal(jsonResult.status, 0, jsonResult.stderr);
const json = JSON.parse(jsonResult.stdout);
assert.equal(json.steps[0].id, "npm-trusted-publish");
assert.equal(
  json.steps[0].inputs[0],
  `expected_version: ${packageManifest.version}`,
);
assert.deepEqual(json.steps[0].inputs, [
  `expected_version: ${packageManifest.version}`,
  "dry_run: false",
]);
assert.equal(
  json.steps[2].prefillUrl,
  "https://news.ycombinator.com/submitlink?u=https%3A%2F%2Fgithub.com%2FSeven128%2Fproject-tiny-context-harness&t=Show%20HN%3A%20Tiny%20project%20memory%20for%20coding%20agents",
);
assert.equal(json.live, false);
assert.equal(json.recommendedNext, "npm-trusted-publish");

assert.equal(
  showHnPrefillUrl(),
  "https://news.ycombinator.com/submitlink?u=https%3A%2F%2Fgithub.com%2FSeven128%2Fproject-tiny-context-harness&t=Show%20HN%3A%20Tiny%20project%20memory%20for%20coding%20agents",
);

const tempRoot = mkdtempSync(path.join(os.tmpdir(), "launch-next-steps-"));
const tempFeedbackDir = path.join(
  tempRoot,
  "tmp",
  "ty-context",
  "launch-feedback",
);
mkdirSync(tempFeedbackDir, { recursive: true });
writeFileSync(
  path.join(tempFeedbackDir, "show-hn-template-smoke.md"),
  [
    "# Launch Feedback Note",
    "",
    "Channel: show-hn",
    "URL: https://news.ycombinator.com/item?id=11111111",
    "",
  ].join("\n"),
  "utf8",
);
writeFileSync(
  path.join(tempFeedbackDir, "2026-06-10-show-hn.md"),
  [
    "# Launch Feedback Note",
    "",
    "Channel: show-hn",
    "URL: https://news.ycombinator.com/item?id=48479619",
    "HN first comment: https://news.ycombinator.com/item?id=48481205",
    "",
  ].join("\n"),
  "utf8",
);
mkdirSync(path.join(tempRoot, "docs", "launch", "external-prs"), {
  recursive: true,
});
writeFileSync(
  path.join(tempRoot, "docs", "launch", "external-prs", "README.md"),
  [
    "# External PR Packets",
    "",
    "Curated-list direct PRs opened:",
    "",
    "- https://github.com/ai-boost/awesome-harness-engineering/pull/58",
    "- https://github.com/Picrew/awesome-agent-harness/pull/22",
    "- https://github.com/Transcenda/awesome-agentic-coding/pull/4",
    "- https://github.com/jordimas/awesome-agentic-engineering/pull/4",
    "- https://github.com/jamesmurdza/awesome-ai-devtools/pull/636",
    "- https://github.com/bradAGI/awesome-cli-coding-agents/pull/125",
    "- https://github.com/ai-for-developers/awesome-ai-coding-tools/pull/408",
    "",
  ].join("\n"),
  "utf8",
);
assert.deepEqual(findShowHnFeedbackNote({ root: tempRoot }), {
  url: "https://news.ycombinator.com/item?id=48479619",
  path: "tmp/ty-context/launch-feedback/2026-06-10-show-hn.md",
  firstCommentUrl: "https://news.ycombinator.com/item?id=48481205",
});
assert.deepEqual(findOpenedCuratedListPrs({ root: tempRoot }), [
  {
    repo: "ai-boost/awesome-harness-engineering",
    url: "https://github.com/ai-boost/awesome-harness-engineering/pull/58",
  },
  {
    repo: "Picrew/awesome-agent-harness",
    url: "https://github.com/Picrew/awesome-agent-harness/pull/22",
  },
  {
    repo: "Transcenda/awesome-agentic-coding",
    url: "https://github.com/Transcenda/awesome-agentic-coding/pull/4",
  },
  {
    repo: "jordimas/awesome-agentic-engineering",
    url: "https://github.com/jordimas/awesome-agentic-engineering/pull/4",
  },
  {
    repo: "jamesmurdza/awesome-ai-devtools",
    url: "https://github.com/jamesmurdza/awesome-ai-devtools/pull/636",
  },
  {
    repo: "bradAGI/awesome-cli-coding-agents",
    url: "https://github.com/bradAGI/awesome-cli-coding-agents/pull/125",
  },
  {
    repo: "ai-for-developers/awesome-ai-coding-tools",
    url: "https://github.com/ai-for-developers/awesome-ai-coding-tools/pull/408",
  },
]);

const liveSteps = applyStatusHints(steps, {
  status: "ready-with-cleanup",
  npm: { summary: { status: "published" } },
  releaseDelta: {
    localVersion: packageManifest.version,
    publishedVersion: "0.2.41",
  },
  readiness: {
    externalChecks: [
      {
        id: "github-release-title",
        detail:
          "GitHub latest release title: Project Tiny Context Harness 0.2.39 - legacy npm package",
      },
    ],
  },
});
assert.equal(liveSteps[0].status, "pending-cleanup");
assert.match(
  liveSteps[0].statusDetail,
  new RegExp(`local ${packageVersionPattern}; npm latest 0\\.2\\.41`),
);
assert.equal(liveSteps[1].status, "pending-cleanup");
assert.equal(liveSteps[2].status, "ready");
assert.equal(liveSteps[3].status, "waiting-for-url");
assert.equal(liveSteps[4].status, "waiting-for-url");
assert.equal(liveSteps[5].status, "wait-for-first-feedback");
assert.equal(liveSteps[6].status, "waiting-for-url");
assert.equal(recommendedNext(liveSteps).id, "npm-trusted-publish");

const liveMarkdown = renderMarkdown(liveSteps);
assert.match(liveMarkdown, /Recommended Next/);
assert.match(
  liveMarkdown,
  new RegExp(
    `npm-trusted-publish: Refresh npm package page with ${packageVersionPattern}`,
  ),
);
assert.match(
  liveMarkdown,
  new RegExp(
    `status: pending-cleanup \\(local ${packageVersionPattern}; npm latest 0\\.2\\.41\\)`,
  ),
);
assert.match(
  liveMarkdown,
  /status: ready \(required broad-launch gate is clear\.\)/,
);

const livePostedSteps = applyStatusHints(
  steps,
  {
    status: "ready",
    npm: { summary: { status: "published" } },
    readiness: {
      externalChecks: [
        {
          id: "github-release-title",
          detail: `GitHub latest release title: Project Tiny Context Harness ${packageManifest.version}`,
        },
      ],
    },
  },
  {
    showHnFeedback: {
      url: "https://news.ycombinator.com/item?id=48479619",
      path: "tmp/ty-context/launch-feedback/2026-06-10-show-hn.md",
      firstCommentUrl: "https://news.ycombinator.com/item?id=48481205",
    },
    curatedListPrs: findOpenedCuratedListPrs({ root: tempRoot }),
  },
);
assert.equal(livePostedSteps[0].status, "done");
assert.equal(livePostedSteps[1].status, "done");
assert.equal(livePostedSteps[2].status, "done");
assert.equal(livePostedSteps[3].status, "done");
assert.equal(livePostedSteps[4].status, "done");
assert.equal(
  livePostedSteps[4].url,
  "https://news.ycombinator.com/item?id=48479619",
);
assert.equal(
  livePostedSteps[4].commentUrl,
  "https://news.ycombinator.com/item?id=48481205",
);
assert.equal(livePostedSteps[5].status, "open");
assert.equal(livePostedSteps[5].prs.length, 7);
assert.equal(livePostedSteps[6].status, "ready");
assert.equal(recommendedNext(livePostedSteps).id, "monitor-feedback");

const blockedFirst = recommendedNext([
  { id: "later-cleanup", status: "pending-cleanup" },
  { id: "fix-first", status: "blocked" },
  { id: "ready-later", status: "ready" },
]);
assert.equal(blockedFirst.id, "fix-first");

test("top-level script assertions completed", () => {});
