import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  findUserHomeLocatorViolations,
  verifyActiveSourcePortability,
} from "../../tools/verify_active_source_portability.mjs";

const repository = path.resolve(
  fileURLToPath(new URL("../..", import.meta.url)),
);

test("current owner-scoped repository surfaces are portable", async () => {
  const report = await verifyActiveSourcePortability({ repository });
  assert.equal(report.status, "passed");
  assert.ok(report.checked_file_count > 0);
  assert.deepEqual(report.violations, []);
  assert.match(report.historical_scope, /not_inferred/u);
  assert.ok(
    report.categories.some(
      (category) => category.key === "runtime-resolved-source",
    ),
  );
});

test("real Windows and POSIX homes fail without exposing the username", () => {
  const violations = findUserHomeLocatorViolations(
    "one C:\\Users\\alice\\draft.md\ntwo /home/bob/draft.md\nthree /Users/carol/draft.md",
    "active.md",
  );
  assert.deepEqual(
    violations.map((violation) => violation.kind),
    ["windows_user_home", "posix_user_home", "posix_user_home"],
  );
  assert.ok(violations.every((violation) => !JSON.stringify(violation).match(/alice|bob|carol/u)));
});

test("explicit placeholders and non-resolvable provenance locators remain portable", () => {
  const violations = findUserHomeLocatorViolations(
    [
      "C:\\Users\\<username>\\project",
      "/home/<username>/project",
      "/Users/${USER}/project",
      "attachment-provenance://fixture/pasted-text.txt",
      "https://example.test/home/member/page",
    ].join("\n"),
  );
  assert.deepEqual(violations, []);
});

test("historical files are not inferred but exact active Source is checked", async () => {
  const fixture = await mkdtemp(path.join(tmpdir(), "ty-portability-"));
  try {
    await mkdir(path.join(fixture, "history"));
    await writeFile(path.join(fixture, "active.md"), "portable\n", "utf8");
    await writeFile(
      path.join(fixture, "history", "receipt.md"),
      "frozen C:\\Users\\historical\\source.md\n",
      "utf8",
    );

    const scoped = await verifyActiveSourcePortability({
      repository: fixture,
      surfaces: [],
      activeSources: ["active.md"],
    });
    assert.equal(scoped.status, "passed");

    const selectedHistory = await verifyActiveSourcePortability({
      repository: fixture,
      surfaces: [],
      activeSources: ["history/receipt.md"],
    });
    assert.equal(selectedHistory.status, "failed");
    assert.equal(selectedHistory.violations[0].source, "history/receipt.md");
  } finally {
    await rm(fixture, { recursive: true, force: true });
  }
});

test("the checker has no blanket Git inventory or cleanup behavior", async () => {
  const source = await readFile(
    path.join(repository, "tools", "verify_active_source_portability.mjs"),
    "utf8",
  );
  assert.doesNotMatch(source, /git\s+ls-files/u);
  assert.doesNotMatch(source, /rmSync|unlink|remove-item/iu);
});
