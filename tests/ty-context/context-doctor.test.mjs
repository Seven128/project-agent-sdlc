import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { rm } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { runDoctor } from "../../packages/ty-context/dist/lib/doctor.js";
import {
  baseManifest,
  createContextProject,
} from "./context-manifest-fixtures.mjs";

const repository = fileURLToPath(new URL("../..", import.meta.url));
const cli = path.join(repository, "packages", "ty-context", "dist", "cli.js");

test("Doctor reports full Context distribution, size, lines, fan-out, explicit links and declared-key conflicts as advisory", async () => {
  const contexts = ["one", "two", "three", "four"];
  const manifest = `${baseManifest()}\n${contexts
    .map(
      (name) => `[[context]]
path = "project_context/areas/main/${name}.md"
role = "contract"
read_policy = "on-demand"
triggers = ["shared-trigger"]
`,
    )
    .join("\n")}`;
  const root = await createContextProject({
    manifest,
    extraFiles: Object.fromEntries([
      ...contexts.map((name, index) => [
        `project_context/areas/main/${name}.md`,
        `# ${name}\n${"x".repeat(20 + index)}\n${
          index === 0
            ? "[missing](missing.md)\n<!-- ty-context-declare Fact-ID: SHARED-001 -->\n"
            : index === 1
              ? "<!-- ty-context-declare Fact-ID: SHARED-001 -->\n"
              : ""
        }`,
      ]),
      ["project_context/areas/main/unregistered.md", "# Unregistered\n"],
    ]),
  });
  try {
    const report = await runDoctor(root, {
      context_file_soft_budget_bytes: 16,
      long_line_code_points: 10,
      trigger_fanout_contexts: 4,
    });
    assert.deepEqual(report.errors, []);
    assert.ok(
      report.info.some((line) => line.startsWith("all Context Markdown:")),
    );
    assert.ok(
      report.info.some((line) =>
        line.includes("Context distribution: default=") &&
        line.includes("on-demand=4 file(s)") &&
        line.includes("unregistered=1 file(s)"),
      ),
    );
    assert.ok(
      report.info.some((line) => line.includes("largest on-demand Context:")),
    );
    assert.ok(
      report.info.some(
        (line) =>
          line.includes('Context trigger: "shared-trigger"') &&
          line.includes("4 Context(s)"),
      ),
    );
    assert.ok(
      report.warnings.some((line) =>
        line.includes("all-Context per-file soft budget"),
      ),
    );
    assert.ok(
      report.warnings.some((line) => line.includes("Unicode code points")),
    );
    assert.ok(
      report.warnings.some(
        (line) => line.includes("fans out to 4 Contexts") && line.includes("bytes"),
      ),
    );
    assert.ok(
      report.warnings.some(
        (line) => line.includes("missing explicit Markdown Context reference"),
      ),
    );
    assert.ok(
      report.warnings.some(
        (line) =>
          line.includes("Fact-ID SHARED-001") &&
          line.includes("multiple candidate owners"),
      ),
    );
    assert.ok(
      report.warnings.some((line) => line.includes("unregistered Context")),
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("Doctor keeps new findings non-blocking by default and exposes opt-in strict mode", async () => {
  const root = await createContextProject({
    extraFiles: {
      "project_context/areas/main/unregistered.md": "# Unregistered\n",
    },
  });
  try {
    const normal = spawnSync(process.execPath, [cli, "doctor"], {
      cwd: root,
      encoding: "utf8",
    });
    const strict = spawnSync(process.execPath, [cli, "doctor", "--strict"], {
      cwd: root,
      encoding: "utf8",
    });
    assert.equal(normal.status, 0, normal.stderr);
    assert.match(normal.stderr, /warning: .*unregistered Context/u);
    assert.equal(strict.status, 1);
    assert.match(strict.stderr, /warning: .*unregistered Context/u);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
