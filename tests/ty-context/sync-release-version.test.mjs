import assert from "node:assert/strict";
import test from "node:test";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const scriptPath = path.join(repoRoot, "tools/sync_release_version.mjs");
const fixture = mkdtempSync(path.join(os.tmpdir(), "sync-release-version-"));

write("packages/ty-context/package.json", JSON.stringify({ version: "1.2.3" }, null, 2));
for (const relativePath of [
  "README.md",
  "packages/ty-context/README.md",
  "packages/ty-context/assets/README.md",
  "docs/adopt-existing-repo.md",
  "docs/launch/private-review.md",
  "docs/launch/profile.md"
]) {
  write(relativePath, "npm install -D /tmp/project-tiny-context-harness-1.2.2.tgz\n");
}
write(
  ".github/workflows/npm-publish.yml",
  [
    "on:",
    "  workflow_dispatch:",
    "    inputs:",
    "      expected_version:",
    "        default: \"1.2.2\"",
    ""
  ].join("\n")
);
write(
  "docs/launch/README.md",
  "For the `1.2.2` GitHub Release fields, see [github-release-1.2.2.md](github-release-1.2.2.md).\n"
);
write(
  "docs/launch/primary-launch.md",
  [
    "This is the copy-ready launch packet after `project-tiny-context-harness@1.2.2` is published.",
    "- npm `project-tiny-context-harness@1.2.2` is published and installable.",
    "- The `v1.2.2` GitHub Release is published from [github-release-1.2.2.md](github-release-1.2.2.md).",
    ""
  ].join("\n")
);
write(
  "docs/launch/market-map.md",
  [
    "| GitHub release | Latest release is `Project Tiny Context Harness 1.2.2` |",
    "| npm package | `project-tiny-context-harness@1.2.2` is published and installable through `@latest` |",
    ""
  ].join("\n")
);
write(
  "docs/launch/outreach-targets.md",
  "- `v1.2.2` is published on npm through Trusted Publishing, and the current latest GitHub Release is `Project Tiny Context Harness 1.2.2`.\n"
);
write(
  "docs/launch/npm-trusted-publishing.md",
  "The current published package is `project-tiny-context-harness@1.2.2`. It is published through the GitHub Actions Trusted Publishing workflow.\n"
);

const checkBefore = run(["--root", fixture, "--check"]);
assert.notEqual(checkBefore.status, 0);
assert.match(`${checkBefore.stdout}\n${checkBefore.stderr}`, /release version surfaces are out of sync/);

const sync = run(["--root", fixture]);
assert.equal(sync.status, 0, sync.stderr);
assert.match(sync.stdout, /changed=13/);

const checkAfter = run(["--root", fixture, "--check"]);
assert.equal(checkAfter.status, 0, checkAfter.stderr);
assert.match(checkAfter.stdout, /release version surfaces OK/);

for (const relativePath of [
  "README.md",
  "packages/ty-context/README.md",
  "packages/ty-context/assets/README.md",
  "docs/adopt-existing-repo.md",
  "docs/launch/private-review.md",
  "docs/launch/profile.md",
  ".github/workflows/npm-publish.yml",
  "docs/launch/README.md",
  "docs/launch/primary-launch.md",
  "docs/launch/market-map.md",
  "docs/launch/outreach-targets.md",
  "docs/launch/npm-trusted-publishing.md",
  "docs/launch/github-release-1.2.3.md"
]) {
  const content = read(relativePath);
  assert.match(content, /1\.2\.3/, `${relativePath} should contain current version`);
  assert.doesNotMatch(content, /1\.2\.2/, `${relativePath} should not contain stale version`);
}

const releasePacket = read("docs/launch/github-release-1.2.3.md");
assert.match(releasePacket, /Project Tiny Context Harness 1\.2\.3/);
assert.match(releasePacket, /Update Mode: `sync-only`/);
assert.match(releasePacket, /## Upgrade Impact/);
assert.match(releasePacket, /Upgrade Impact: `none`/);
assert.match(releasePacket, /no user-project migration is required/);
assert.match(releasePacket, /Publishes `project-tiny-context-harness@1\.2\.3` with the synchronized package assets and CLI build/);
assert.doesNotMatch(releasePacket, /Publishes `project-tiny-context-harness@1\.2\.3` through npm Trusted Publishing/);
assert.match(releasePacket, /sync-only/);
assert.match(releasePacket, /upgrade-required/);
assert.match(releasePacket, /manual-required/);
assert.match(releasePacket, /ty-context sync/);
assert.match(releasePacket, /ty-context upgrade --check/);
assert.match(releasePacket, /Publishing a new npm version does not automatically migrate existing repositories/);
assert.match(releasePacket, /Users receive new upgrade behavior only when they run the newly published CLI/);
assert.match(releasePacket, /tools\/github_release_publish\.mjs/);
assert.match(releasePacket, /Dry runs do not create or edit GitHub releases/);
assert.match(releasePacket, /safe_pending/);
assert.match(releasePacket, /manual_required/);
assert.match(releasePacket, /blocked/);
assert.match(releasePacket, /Do not retarget `v1\.2\.3`/);
assert.match(releasePacket, /Do not claim benchmark wins or adoption/);

const manualFixture = mkdtempSync(path.join(os.tmpdir(), "sync-release-version-manual-"));
try {
  seedReleaseVersionFixture(manualFixture, "4.0.0");
  writeAt(
    manualFixture,
    "docs/launch/github-release-4.0.0.md",
    [
      "# GitHub Release Packet: 4.0.0",
      "",
      "v4.0.0",
      "Project Tiny Context Harness 4.0.0",
      "Update Mode: `manual-required`",
      "Allowed modes: `sync-only`, `upgrade-required`, `manual-required`.",
      "",
      "## Upgrade Impact",
      "",
      "Upgrade Impact: `manual follow-up required`.",
      "",
      "This placeholder mentions `manual_required` but omits the required manual follow-up explanation.",
      "",
      "```sh",
      "npm install -D project-tiny-context-harness@latest",
      "npx --yes --package project-tiny-context-harness@latest ty-context upgrade --check",
      "```",
      "",
      "Publishing a new npm version does not automatically migrate existing repositories.",
      "Users receive new upgrade behavior only when they run the newly published CLI.",
      "tools/github_release_publish.mjs",
      "Dry runs do not create or edit GitHub releases.",
      "safe_pending manual_required blocked",
      "keep the memory, drop the ceremony",
      "Do not retarget `v4.0.0`",
      "Do not claim benchmark wins or adoption",
      ""
    ].join("\n")
  );
  const manualCheck = run(["--root", manualFixture, "--update-mode", "manual-required", "--check"]);
  assert.notEqual(manualCheck.status, 0);
  assert.match(`${manualCheck.stdout}\n${manualCheck.stderr}`, /required manual-required upgrade impact evidence missing/i);
} finally {
  rmSync(manualFixture, { recursive: true, force: true });
}

function run(args) {
  return spawnSync(process.execPath, [scriptPath, ...args], {
    cwd: repoRoot,
    encoding: "utf8",
    timeout: 30_000,
    windowsHide: true
  });
}

function write(relativePath, content) {
  writeAt(fixture, relativePath, content);
}

function writeAt(root, relativePath, content) {
  const absolutePath = path.join(root, relativePath);
  mkdirSync(path.dirname(absolutePath), { recursive: true });
  writeFileSync(absolutePath, content, "utf8");
}

function read(relativePath) {
  return readFileSync(path.join(fixture, relativePath), "utf8");
}

function seedReleaseVersionFixture(root, version) {
  writeAt(root, "packages/ty-context/package.json", JSON.stringify({ version }, null, 2));
  for (const relativePath of [
    "README.md",
    "packages/ty-context/README.md",
    "packages/ty-context/assets/README.md",
    "docs/adopt-existing-repo.md",
    "docs/launch/private-review.md",
    "docs/launch/profile.md"
  ]) {
    writeAt(root, relativePath, `npm install -D /tmp/project-tiny-context-harness-${version}.tgz\n`);
  }
  writeAt(
    root,
    ".github/workflows/npm-publish.yml",
    ["on:", "  workflow_dispatch:", "    inputs:", "      expected_version:", `        default: \"${version}\"`, ""].join("\n")
  );
  writeAt(
    root,
    "docs/launch/README.md",
    `For the \`${version}\` GitHub Release fields, see [github-release-${version}.md](github-release-${version}.md).\n`
  );
  writeAt(
    root,
    "docs/launch/primary-launch.md",
    [
      `This is the copy-ready launch packet after \`project-tiny-context-harness@${version}\` is published.`,
      `- npm \`project-tiny-context-harness@${version}\` is published and installable.`,
      `- The \`v${version}\` GitHub Release is published from [github-release-${version}.md](github-release-${version}.md).`,
      ""
    ].join("\n")
  );
  writeAt(
    root,
    "docs/launch/market-map.md",
    [
      `| GitHub release | Latest release is \`Project Tiny Context Harness ${version}\` |`,
      `| npm package | \`project-tiny-context-harness@${version}\` is published and installable through \`@latest\` |`,
      ""
    ].join("\n")
  );
  writeAt(
    root,
    "docs/launch/outreach-targets.md",
    `- \`v${version}\` is published on npm through Trusted Publishing, and the current latest GitHub Release is \`Project Tiny Context Harness ${version}\`.\n`
  );
  writeAt(
    root,
    "docs/launch/npm-trusted-publishing.md",
    `The current published package is \`project-tiny-context-harness@${version}\`. It is published through the GitHub Actions Trusted Publishing workflow.\n`
  );
}

test("top-level script assertions completed", () => {});
