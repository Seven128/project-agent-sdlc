import assert from "node:assert/strict";
import test from "node:test";
import { mkdtempSync, readFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const scriptPath = path.join(repoRoot, "tools/launch_feedback_note.mjs");
const tempDir = mkdtempSync(path.join(os.tmpdir(), "launch-feedback-note-"));
const outputPath = path.join(tempDir, "note.md");

const first = spawnSync(
  process.execPath,
  [
    scriptPath,
    "--channel",
    "Show HN!",
    "--url",
    "https://news.ycombinator.com/item?id=123",
    "--posted-at",
    "2026-06-10T12:00:00Z",
    "--output",
    outputPath
  ],
  { cwd: repoRoot, encoding: "utf8" }
);

assert.equal(first.status, 0, `${first.stdout}\n${first.stderr}`);
assert.match(first.stdout, /Wrote/);

const note = readFileSync(outputPath, "utf8");
assert.match(note, /Channel: Show HN!/);
assert.match(note, /URL: https:\/\/news\.ycombinator\.com\/item\?id=123/);
assert.match(note, /Posted at: 2026-06-10T12:00:00Z/);
assert.match(note, /tmp\/ty-context\/launch-metrics\/show-hn-before\.md/);
assert.match(note, /npm run launch:hn-snapshot -- --url https:\/\/news\.ycombinator\.com\/item\?id=123 --output tmp\/ty-context\/launch-metrics\/show-hn-hn-6h\.md/);
assert.match(note, /npm run launch:hn-snapshot -- --url https:\/\/news\.ycombinator\.com\/item\?id=123 --output tmp\/ty-context\/launch-metrics\/show-hn-hn-24h\.md/);
assert.match(note, /Do not store raw private logs/);
assert.match(note, /Use adoption reports only for concrete recovery evidence/);
assert.match(note, /Do not ask for stars, upvotes, awards or nominations/);

const overwrite = spawnSync(process.execPath, [scriptPath, "--channel", "Show HN", "--output", outputPath], {
  cwd: repoRoot,
  encoding: "utf8"
});

assert.notEqual(overwrite.status, 0);
assert.match(overwrite.stderr, /Refusing to overwrite existing note/);

const forced = spawnSync(process.execPath, [scriptPath, "--channel", "Reddit", "--output", outputPath, "--force"], {
  cwd: repoRoot,
  encoding: "utf8"
});

assert.equal(forced.status, 0, `${forced.stdout}\n${forced.stderr}`);
const redditNote = readFileSync(outputPath, "utf8");
assert.match(redditNote, /Channel: Reddit/);
assert.doesNotMatch(redditNote, /launch:hn-snapshot/);

test("top-level script assertions completed", () => {});
