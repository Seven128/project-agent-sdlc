import assert from "node:assert/strict";
import test from "node:test";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const scriptPath = path.join(repoRoot, "tools/github_release_publish.mjs");
const fixture = mkdtempSync(path.join(os.tmpdir(), "github-release-publish-"));

try {
  write(
    "docs/launch/github-release-1.2.3.md",
    `# GitHub Release Packet: 1.2.3

## Release Fields

Tag:

\`\`\`text
v1.2.3
\`\`\`

Title:

\`\`\`text
Project Tiny Context Harness 1.2.3
\`\`\`

Update Mode: \`manual-required\`

## Release Body

\`\`\`\`markdown
Project Tiny Context Harness 1.2.3 is live.

\`\`\`sh
npm install -D project-tiny-context-harness@latest
\`\`\`

Use \`sync\` only for releases explicitly marked \`sync-only\`.
\`\`\`\`

## Manual UI Path

This maintainer-only section must not enter the GitHub Release notes.
`
  );

  const result = spawnSync(
    process.execPath,
    [scriptPath, "--root", fixture, "--version", "1.2.3", "--target", "abc123", "--dry-run"],
    {
      cwd: repoRoot,
      encoding: "utf8",
      timeout: 30_000,
      windowsHide: true
    }
  );

  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  assert.match(result.stdout, /would publish GitHub Release v1\.2\.3/);
  assert.match(result.stdout, /title: Project Tiny Context Harness 1\.2\.3/);
  assert.match(result.stdout, /target: abc123/);
  assert.match(result.stdout, /body: \d+ characters from docs\/launch\/github-release-1\.2\.3\.md/);
  assert.doesNotMatch(result.stdout, /Manual UI Path/);

  const ghStubPath = path.join(fixture, "gh-stub.mjs");
  const ghLogPath = path.join(fixture, "gh-calls.jsonl");
  writeFileSync(
    ghStubPath,
    `import { appendFileSync } from "node:fs";

const args = process.argv.slice(2);
appendFileSync(process.env.GH_STUB_LOG, JSON.stringify(args) + "\\n");
if (args[0] === "release" && args[1] === "view") {
  process.exit(1);
}
`,
    "utf8"
  );

  const publishResult = spawnSync(
    process.execPath,
    [scriptPath, "--root", fixture, "--version", "1.2.3", "--target", "abc123"],
    {
      cwd: repoRoot,
      encoding: "utf8",
      env: {
        ...process.env,
        GH_STUB_LOG: ghLogPath,
        TY_CONTEXT_GH_COMMAND: JSON.stringify([process.execPath, ghStubPath])
      },
      timeout: 30_000,
      windowsHide: true
    }
  );

  assert.equal(publishResult.status, 0, `${publishResult.stdout}\n${publishResult.stderr}`);
  assert.match(publishResult.stdout, /created GitHub Release v1\.2\.3/);

  const ghCalls = readFileSync(ghLogPath, "utf8")
    .trim()
    .split("\n")
    .map((line) => JSON.parse(line));
  assert.deepEqual(ghCalls[0], ["release", "view", "v1.2.3", "--json", "tagName"]);
  assert.deepEqual(ghCalls[1], [
    "release",
    "create",
    "v1.2.3",
    "--target",
    "abc123",
    "--title",
    "Project Tiny Context Harness 1.2.3",
    "--notes-file",
    path.join(fixture, ".artifacts", "releases", "github-release-1.2.3-notes.md"),
    "--latest"
  ]);
} finally {
  rmSync(fixture, { recursive: true, force: true });
}

function write(relativePath, content) {
  const absolutePath = path.join(fixture, relativePath);
  mkdirSync(path.dirname(absolutePath), { recursive: true });
  writeFileSync(absolutePath, content, "utf8");
}

test("top-level script assertions completed", () => {});
