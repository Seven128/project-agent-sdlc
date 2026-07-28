import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parsePackJson } from "../../tools/release_publish_helpers.mjs";
import { stableTextSha256 } from "../../tools/release_artifact_identity.mjs";

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);
const prepareScript = path.join(repoRoot, "tools/release_prepare.mjs");
const publishScript = path.join(repoRoot, "tools/release_publish.mjs");
const legacyNpmScript = path.join(repoRoot, "tools/release_npm.mjs");
const preparedReleaseDir = path.join(".artifacts", "releases", "prepared");

const rootPackage = JSON.parse(
  readFileSync(path.join(repoRoot, "package.json"), "utf8"),
);
const workspacePackage = JSON.parse(
  readFileSync(path.join(repoRoot, "packages/ty-context/package.json"), "utf8"),
);
assert.equal(
  rootPackage.scripts["release:prepare"],
  "node tools/release_prepare.mjs",
);
assert.equal(
  rootPackage.scripts["release:publish"],
  "node tools/release_publish.mjs",
);
assert.equal(rootPackage.scripts["release:npm"], "node tools/release_npm.mjs");
assert.equal(
  workspacePackage.scripts["test:default:built"],
  "node ../../tests/ty-context/run-package-suite.mjs default",
);
assert.equal(
  workspacePackage.scripts["test:built"],
  "npm run test:default:built && npm run test:long-task-workflow:built",
);
assert.equal(
  workspacePackage.scripts["test:long-task-workflow:built"],
  "node ../../tests/ty-context/run-package-suite.mjs long-task",
);

const trustedPublishWorkflow = readFileSync(
  path.join(repoRoot, ".github/workflows/npm-publish.yml"),
  "utf8",
);
assert.match(
  trustedPublishWorkflow,
  /npm test --workspace project-tiny-context-harness/u,
);
assert.equal(
  trustedPublishWorkflow.match(/npm test --workspace project-tiny-context-harness/gu)?.length,
  1,
);
assert.equal(trustedPublishWorkflow.match(/npm pack --json/gu)?.length, 1);
assert.equal(trustedPublishWorkflow.match(/release_tarball_smoke\.mjs/gu)?.length, 1);
assert.match(trustedPublishWorkflow, /prepare:[\s\S]*publish:/u);
assert.match(trustedPublishWorkflow, /needs: prepare/u);
assert.match(trustedPublishWorkflow, /actions\/upload-artifact@[a-f0-9]{40}/u);
assert.match(trustedPublishWorkflow, /actions\/download-artifact@[a-f0-9]{40}/u);
assert.match(trustedPublishWorkflow, /name: npm-release-\$\{\{ github\.run_id \}\}/u);
assert.match(trustedPublishWorkflow, /overwrite: true/u);
assert.doesNotMatch(trustedPublishWorkflow, /github\.run_attempt/u);
assert.match(trustedPublishWorkflow, /verify_workflow_release_artifact\.mjs/u);
assert.match(trustedPublishWorkflow, /publish_prepared_artifact\.mjs/u);
assert.match(trustedPublishWorkflow, /release_tarball_smoke\.mjs --tarball/u);
assert.doesNotMatch(
  trustedPublishWorkflow,
  /release_tarball_smoke\.mjs[^\r\n]*--portable-only/u,
);

const legacyNoArgs = runNode(legacyNpmScript, []);
assert.equal(
  legacyNoArgs.status,
  0,
  `${legacyNoArgs.stdout}\n${legacyNoArgs.stderr}`,
);
assert.match(legacyNoArgs.stdout, /release:prepare/);
assert.match(legacyNoArgs.stdout, /release:publish/);
assert.doesNotMatch(
  legacyNoArgs.stdout,
  /Prepared project-tiny-context-harness@/,
);

const legacyOldPublishArgs = runNode(legacyNpmScript, [
  "--version",
  "patch",
  "--publish",
  "--yes",
]);
assert.notEqual(legacyOldPublishArgs.status, 0);
assert.match(
  `${legacyOldPublishArgs.stdout}\n${legacyOldPublishArgs.stderr}`,
  /no longer accepts --version, --publish or --full-gate/,
);

assert.deepEqual(
  parsePackJson(`${JSON.stringify([{ filename: "pkg-1.0.0.tgz" }])}\n`),
  {
    filename: "pkg-1.0.0.tgz",
  },
);
assert.deepEqual(
  parsePackJson(
    `${JSON.stringify({ "project-tiny-context-harness": { filename: "pkg-1.0.0.tgz" } })}\n`,
  ),
  { filename: "pkg-1.0.0.tgz" },
);
assert.deepEqual(
  parsePackJson(
    [
      "> project-tiny-context-harness@1.0.0 prepack",
      '{"schema_version":"package-build-fingerprint-command-v1"}',
      JSON.stringify([{ filename: "pkg-1.0.0.tgz" }], null, 2),
      "",
    ].join("\n"),
  ),
  { filename: "pkg-1.0.0.tgz" },
);
assert.throws(
  () =>
    parsePackJson(
      JSON.stringify({
        first: { filename: "first.tgz" },
        second: { filename: "second.tgz" },
      }),
    ),
  /one npm pack result/u,
);

const fixture = mkdtempSync(path.join(os.tmpdir(), "release-flow-scripts-"));
const fastFixture = mkdtempSync(path.join(os.tmpdir(), "release-flow-fast-"));
const guardFixture = mkdtempSync(path.join(os.tmpdir(), "release-flow-guard-"));
const missingEvidenceFixture = mkdtempSync(
  path.join(os.tmpdir(), "release-flow-missing-evidence-"),
);
const fastUpgradeFixture = mkdtempSync(
  path.join(os.tmpdir(), "release-flow-fast-upgrade-"),
);

try {
  seedReleaseFixture(fixture, "1.2.3");

  const prepareLog = path.join(fixture, "prepare-commands.jsonl");
  const prepare = runNode(
    prepareScript,
    [
      "--root",
      fixture,
      "--version",
      "patch",
      "--update-mode",
      "upgrade-required",
    ],
    {
      TY_CONTEXT_RELEASE_COMMAND_LOG: prepareLog,
      TY_CONTEXT_RELEASE_CHANGED_FILES: [
        "packages/ty-context/src/lib/migrations.ts",
        "tests/ty-context/upgrade.test.mjs",
      ].join("\n"),
    },
  );
  assert.equal(prepare.status, 0, `${prepare.stdout}\n${prepare.stderr}`);
  assert.match(prepare.stdout, /Prepared project-tiny-context-harness@1\.2\.4/);
  assert.match(prepare.stdout, /Release preparation timings:/);
  assert.match(
    read("packages/ty-context/package.json"),
    /"version": "1\.2\.4"/,
  );
  assert.match(read("package-lock.json"), /"version": "1\.2\.4"/);
  assert.match(
    read("docs/launch/github-release-1.2.4.md"),
    /Update Mode: `upgrade-required`/,
  );
  assert.match(
    read("docs/launch/github-release-1.2.4.md"),
    /Upgrade Impact: `safe migration included`/,
  );
  assert.match(
    read("docs/launch/github-release-1.2.4.md"),
    /upgrade\/migration implementation and upgrade test evidence/,
  );
  assert.match(
    read("docs/launch/github-release-1.2.4.md"),
    /synchronized package assets and CLI build/,
  );
  const attestation = JSON.parse(
    read("docs/launch/release-artifact-1.2.4.json"),
  );
  assert.equal(attestation.schema_version, "ty-context-release-artifact-v2");
  assert.equal(attestation.node_version, process.version);
  assert.match(attestation.npm_version, /^\d+\.\d+\.\d+/);
  assert.equal(
    attestation.lockfile_sha256,
    stableTextSha256(readFileSync(path.join(fixture, "package-lock.json"), "utf8")),
  );

  const prepareCommands = readJsonLines(prepareLog);
  assert.deepEqual(
    prepareCommands.map((entry) => entry.argv.join(" ")),
    [
      "npm run build --workspace project-tiny-context-harness",
      "node packages/ty-context/dist/cli.js package sync-source",
      "node packages/ty-context/dist/cli.js package check-source",
      "npm run release:check-version",
      "node packages/ty-context/dist/cli.js upgrade --check --json",
      "npm run test:default:built --workspace project-tiny-context-harness",
      `npm pack --json --workspace project-tiny-context-harness --pack-destination ${preparedReleaseDir}`,
      "git diff --check",
    ],
  );
  assert.ok(
    prepareCommands.every((entry) => entry.shell === false),
    "prepare commands should use shell-safe spawning",
  );

  seedReleaseFixture(fastFixture, "2.0.0");
  const fastLog = path.join(fastFixture, "prepare-fast-commands.jsonl");
  const fastPrepare = runNode(
    prepareScript,
    [
      "--root",
      fastFixture,
      "--fast",
      "--version",
      "patch",
      "--update-mode",
      "sync-only",
    ],
    {
      TY_CONTEXT_RELEASE_COMMAND_LOG: fastLog,
      TY_CONTEXT_RELEASE_CHANGED_FILES: [
        ".codex/ty-context-managed/skills/design-resource-authoring/SKILL.md",
        "packages/ty-context/assets/skills/design-resource-authoring/SKILL.md",
      ].join("\n"),
    },
  );
  assert.equal(
    fastPrepare.status,
    0,
    `${fastPrepare.stdout}\n${fastPrepare.stderr}`,
  );
  assert.match(
    fastPrepare.stdout,
    /Prepared project-tiny-context-harness@2\.0\.1/,
  );
  assert.match(fastPrepare.stdout, /fast gate/i);
  assert.match(
    readFileSync(
      path.join(fastFixture, "docs/launch/github-release-2.0.1.md"),
      "utf8",
    ),
    /Upgrade Impact: `none`/,
  );
  const fastCommands = readJsonLines(fastLog).map((entry) =>
    entry.argv.join(" "),
  );
  assert.deepEqual(fastCommands, [
    "npm run build --workspace project-tiny-context-harness",
    "node packages/ty-context/dist/cli.js package sync-source",
    "node packages/ty-context/dist/cli.js package check-source",
    "npm run release:check-version",
    "node packages/ty-context/dist/cli.js upgrade --check --json",
    [
      "node --test",
      "tests/ty-context/release-flow-scripts.test.mjs",
      "tests/ty-context/sync-release-version.test.mjs",
      "tests/ty-context/launch-unblock-script.test.mjs",
      "tests/ty-context/launch-readiness-script.test.mjs",
      "tests/ty-context/npm-publish-access-script.test.mjs",
    ].join(" "),
    `npm pack --json --workspace project-tiny-context-harness --pack-destination ${preparedReleaseDir}`,
    "git diff --check",
  ]);
  assert.ok(
    !fastCommands.includes(
      "npm run test:default:built --workspace project-tiny-context-harness",
    ),
  );

  seedReleaseFixture(guardFixture, "3.0.0");
  const guard = runNode(
    prepareScript,
    [
      "--root",
      guardFixture,
      "--fast",
      "--version",
      "patch",
      "--update-mode",
      "sync-only",
    ],
    {
      TY_CONTEXT_RELEASE_COMMAND_LOG: path.join(
        guardFixture,
        "guard-commands.jsonl",
      ),
      TY_CONTEXT_RELEASE_CHANGED_FILES:
        "packages/ty-context/src/lib/sync-engine.ts",
    },
  );
  assert.notEqual(guard.status, 0);
  assert.match(
    `${guard.stdout}\n${guard.stderr}`,
    /upgrade-sensitive changes require --update-mode upgrade-required or manual-required/i,
  );

  seedReleaseFixture(missingEvidenceFixture, "3.1.0");
  const missingEvidence = runNode(
    prepareScript,
    [
      "--root",
      missingEvidenceFixture,
      "--version",
      "patch",
      "--update-mode",
      "upgrade-required",
    ],
    {
      TY_CONTEXT_RELEASE_COMMAND_LOG: path.join(
        missingEvidenceFixture,
        "missing-evidence-commands.jsonl",
      ),
      TY_CONTEXT_RELEASE_CHANGED_FILES:
        "packages/ty-context/src/lib/sync-engine.ts",
    },
  );
  assert.notEqual(missingEvidence.status, 0);
  assert.match(
    `${missingEvidence.stdout}\n${missingEvidence.stderr}`,
    /requires upgrade impact evidence/i,
  );
  assert.match(
    `${missingEvidence.stdout}\n${missingEvidence.stderr}`,
    /upgrade\/migration implementation evidence/i,
  );
  assert.match(
    `${missingEvidence.stdout}\n${missingEvidence.stderr}`,
    /upgrade test evidence/i,
  );

  seedReleaseFixture(fastUpgradeFixture, "3.2.0");
  const fastUpgrade = runNode(
    prepareScript,
    [
      "--root",
      fastUpgradeFixture,
      "--fast",
      "--version",
      "patch",
      "--update-mode",
      "upgrade-required",
    ],
    {
      TY_CONTEXT_RELEASE_COMMAND_LOG: path.join(
        fastUpgradeFixture,
        "fast-upgrade-commands.jsonl",
      ),
      TY_CONTEXT_RELEASE_CHANGED_FILES: [
        "packages/ty-context/src/lib/migrations.ts",
        "tests/ty-context/upgrade.test.mjs",
      ].join("\n"),
    },
  );
  assert.notEqual(fastUpgrade.status, 0);
  assert.match(
    `${fastUpgrade.stdout}\n${fastUpgrade.stderr}`,
    /Fast release preparation is only allowed with --update-mode sync-only/i,
  );

  const publishNoFallback = runNode(publishScript, ["--root", fixture], {
    TY_CONTEXT_RELEASE_COMMAND_LOG: path.join(
      fixture,
      "publish-guidance.jsonl",
    ),
  });
  assert.equal(
    publishNoFallback.status,
    0,
    `${publishNoFallback.stdout}\n${publishNoFallback.stderr}`,
  );
  assert.match(publishNoFallback.stdout, /Trusted Publishing is preferred/);
  assert.match(publishNoFallback.stdout, /dry_run: false/);
  assert.match(publishNoFallback.stdout, /prepares and tests once/u);
  assert.doesNotMatch(publishNoFallback.stdout, /rerun with dry_run: false/u);
  assert.doesNotMatch(
    publishNoFallback.stdout,
    /Published project-tiny-context-harness@1\.2\.4/,
  );

  const publishMissingYes = runNode(
    publishScript,
    ["--root", fixture, "--local-fallback"],
    {
      TY_CONTEXT_RELEASE_COMMAND_LOG: path.join(
        fixture,
        "publish-missing-yes.jsonl",
      ),
    },
  );
  assert.notEqual(publishMissingYes.status, 0);
  assert.match(
    `${publishMissingYes.stdout}\n${publishMissingYes.stderr}`,
    /requires --yes/,
  );

  const publishLog = path.join(fixture, "publish-commands.jsonl");
  const publish = runNode(
    publishScript,
    ["--root", fixture, "--local-fallback", "--yes"],
    {
      TY_CONTEXT_RELEASE_COMMAND_LOG: publishLog,
    },
  );
  assert.equal(publish.status, 0, `${publish.stdout}\n${publish.stderr}`);
  assert.match(
    publish.stdout,
    /Published project-tiny-context-harness@1\.2\.4/,
  );
  assert.match(publish.stdout, /Release publication timings:/);
  assert.match(publish.stdout, /GitHub Release skipped: gh not authenticated/);

  const publishEntries = readJsonLines(publishLog);
  assert.ok(
    publishEntries.every((entry) => entry.shell === false),
    "publish commands should use shell-safe spawning",
  );
  const publishCommands = publishEntries.map((entry) => entry.argv.join(" "));
  assert.ok(
    publishCommands.includes(
      "npm test --workspace project-tiny-context-harness",
    ),
  );
  assert.ok(
    !publishCommands.some((command) => command.includes("test:default")),
  );
  assert.ok(
    publishCommands.includes(
      "node tools/release_tarball_smoke.mjs --tarball .artifacts/releases/prepared/project-tiny-context-harness-1.2.4.tgz",
    ),
  );
  assert.ok(
    publishCommands.includes(
      "npm publish .artifacts/releases/prepared/project-tiny-context-harness-1.2.4.tgz --access public",
    ),
  );
  assert.ok(
    publishCommands.indexOf(
      "npm test --workspace project-tiny-context-harness",
    ) <
      publishCommands.indexOf(
        "npm publish .artifacts/releases/prepared/project-tiny-context-harness-1.2.4.tgz --access public",
      ),
  );
  assert.ok(
    publishCommands.indexOf(
      "node tools/release_tarball_smoke.mjs --tarball .artifacts/releases/prepared/project-tiny-context-harness-1.2.4.tgz",
    ) <
      publishCommands.indexOf(
        "npm publish .artifacts/releases/prepared/project-tiny-context-harness-1.2.4.tgz --access public",
      ),
  );
  assert.ok(
    publishCommands.includes(
      "git tag -a v1.2.4 -m Project Tiny Context Harness 1.2.4",
    ),
  );
  assert.ok(publishCommands.includes("git push origin v1.2.4"));
  assert.ok(
    !publishCommands.some((command) =>
      command.startsWith("npm install -D project-tiny-context-harness@1.2.4"),
    ),
  );

  const smokeLog = path.join(fixture, "publish-smoke-commands.jsonl");
  const publishSmoke = runNode(
    publishScript,
    ["--root", fixture, "--local-fallback", "--yes", "--registry-smoke"],
    {
      TY_CONTEXT_RELEASE_COMMAND_LOG: smokeLog,
    },
  );
  assert.equal(
    publishSmoke.status,
    0,
    `${publishSmoke.stdout}\n${publishSmoke.stderr}`,
  );
  const smokeCommands = readJsonLines(smokeLog).map((entry) =>
    entry.argv.join(" "),
  );
  assert.ok(
    smokeCommands.some((command) =>
      command.startsWith("npm install -D project-tiny-context-harness@1.2.4"),
    ),
  );
} finally {
  rmSync(fixture, { recursive: true, force: true });
  rmSync(fastFixture, { recursive: true, force: true });
  rmSync(guardFixture, { recursive: true, force: true });
  rmSync(missingEvidenceFixture, { recursive: true, force: true });
  rmSync(fastUpgradeFixture, { recursive: true, force: true });
}

function runNode(script, args, extraEnv = {}) {
  return spawnSync(process.execPath, [script, ...args], {
    cwd: repoRoot,
    encoding: "utf8",
    env: { ...process.env, ...extraEnv },
    timeout: 30_000,
    windowsHide: true,
  });
}

function seedReleaseFixture(root, version) {
  write(
    "packages/ty-context/package.json",
    JSON.stringify({ name: "project-tiny-context-harness", version }, null, 2),
  );
  write(
    "package-lock.json",
    JSON.stringify(
      {
        packages: {
          "packages/ty-context": {
            name: "project-tiny-context-harness",
            version,
          },
        },
      },
      null,
      2,
    ),
  );
  for (const relativePath of [
    "README.md",
    "packages/ty-context/README.md",
    "packages/ty-context/assets/README.md",
    "docs/adopt-existing-repo.md",
    "docs/launch/private-review.md",
    "docs/launch/profile.md",
  ]) {
    write(
      relativePath,
      `npm install -D /tmp/project-tiny-context-harness-${version}.tgz\n`,
    );
  }
  write(
    ".github/workflows/npm-publish.yml",
    [
      "on:",
      "  workflow_dispatch:",
      "    inputs:",
      "      expected_version:",
      `        default: \"${version}\"`,
      "",
    ].join("\n"),
  );
  write(
    "docs/launch/README.md",
    `For the \`${version}\` GitHub Release fields, see [github-release-${version}.md](github-release-${version}.md).\n`,
  );
  write(
    "docs/launch/primary-launch.md",
    [
      `This is the copy-ready launch packet after \`project-tiny-context-harness@${version}\` is published.`,
      `- npm \`project-tiny-context-harness@${version}\` is published and installable.`,
      `- The \`v${version}\` GitHub Release is published from [github-release-${version}.md](github-release-${version}.md).`,
      "",
    ].join("\n"),
  );
  write(
    "docs/launch/market-map.md",
    [
      `| GitHub release | Latest release is \`Project Tiny Context Harness ${version}\` |`,
      `| npm package | \`project-tiny-context-harness@${version}\` is published and installable through \`@latest\` |`,
      "",
    ].join("\n"),
  );
  write(
    "docs/launch/outreach-targets.md",
    `- \`v${version}\` is published on npm, and the current latest GitHub Release is \`Project Tiny Context Harness ${version}\`.\n`,
  );
  write(
    "docs/launch/npm-trusted-publishing.md",
    `The current published package is \`project-tiny-context-harness@${version}\`. Prefer the GitHub Actions Trusted Publishing workflow.\n`,
  );

  function write(relativePath, content) {
    const absolutePath = path.join(root, relativePath);
    mkdirSync(path.dirname(absolutePath), { recursive: true });
    writeFileSync(absolutePath, content, "utf8");
  }
}

function read(relativePath) {
  return readFileSync(path.join(fixture, relativePath), "utf8");
}

function readJsonLines(filePath) {
  return readFileSync(filePath, "utf8")
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}
