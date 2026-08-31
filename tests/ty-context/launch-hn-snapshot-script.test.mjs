import assert from "node:assert/strict";
import test from "node:test";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildSnapshot,
  parseArgs,
  parseHnItemId,
  renderMarkdown,
} from "../../tools/launch_hn_snapshot.mjs";

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);
const scriptPath = path.join(repoRoot, "tools/launch_hn_snapshot.mjs");
assert.deepEqual(parseArgs(["--item-id", "48479619", "--json"]), {
  json: true,
  output: null,
  itemId: "48479619",
  url: null,
  help: false,
});
assert.equal(
  parseHnItemId({ url: "https://news.ycombinator.com/item?id=48479619" }),
  "48479619",
);
assert.equal(
  parseHnItemId({ url: "https://news.ycombinator.com/item?id=48479619&p=2" }),
  "48479619",
);
assert.equal(parseHnItemId({ itemId: "48479619" }), "48479619");
assert.throws(
  () => parseHnItemId({ url: "https://news.ycombinator.com/news" }),
  /Could not parse/,
);
assert.throws(() => parseHnItemId({ itemId: "not-an-id" }), /Could not parse/);

const snapshot = buildSnapshot(
  {
    id: 48479619,
    type: "story",
    by: "SevenQin",
    title: "Show HN: Tiny project memory for coding agents",
    score: 1,
    descendants: 0,
    kids: [],
    time: 1781112304,
    url: "https://github.com/Seven128/project-tiny-context-harness",
  },
  { generatedAt: "2026-06-10T17:57:00.000Z" },
);

assert.equal(snapshot.itemUrl, "https://news.ycombinator.com/item?id=48479619");
assert.equal(snapshot.score, 1);
assert.equal(snapshot.comments, 0);
assert.equal(snapshot.submittedAt, "2026-06-10T17:25:04.000Z");

const markdown = renderMarkdown(snapshot);
assert.match(markdown, /HN Launch Snapshot/);
assert.match(markdown, /Score: 1/);
assert.match(markdown, /Comments: 0/);
assert.match(markdown, /distribution telemetry only/);

const help = spawnSync(process.execPath, [scriptPath, "--help"], {
  cwd: repoRoot,
  encoding: "utf8",
  timeout: 30_000,
  windowsHide: true,
});
assert.equal(help.status, 0, help.stderr);
assert.match(help.stdout, /launch_hn_snapshot\.mjs/);

test("top-level script assertions completed", () => {});
