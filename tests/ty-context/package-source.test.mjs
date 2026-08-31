import assert from "node:assert/strict";
import test from "node:test";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  checkSource,
  syncSource,
} from "../../packages/ty-context/dist/lib/package-source.js";

const fixture = await mkdtemp(path.join(tmpdir(), "ty-context-source-"));

try {
  const managed = path.join(fixture, ".agent/ty-context-managed");
  for (const directory of [
    "agents",
    "context_templates",
    "skills/context_product_plan",
    "skills/long-task-workflow/agents",
    "minimal_tools",
    "make",
    "hooks",
  ]) {
    await mkdir(path.join(managed, directory), { recursive: true });
  }
  await mkdir(path.join(fixture, ".github/workflows"), { recursive: true });
  await mkdir(path.join(fixture, "packages/ty-context"), { recursive: true });

  await writeFile(path.join(managed, "agents/AGENTS_CORE.md"), "# Minimal Context Harness\n");
  await writeFile(path.join(fixture, "README.md"), "# User Guide\n\nSingle-Goal Rolling Delivery.\n");
  await writeFile(path.join(fixture, "README.zh-CN.md"), "# 中文指南\n\n单目标滚动交付。\n");
  await writeFile(path.join(managed, "hooks/long-task-hook.mjs"), "export default {};\n");
  await writeFile(path.join(managed, "context_templates/global.md"), "# Global\n");
  await writeFile(path.join(managed, "skills/context_product_plan/SKILL.md"), "---\nname: context_product_plan\n---\n");
  await writeFile(path.join(managed, "skills/long-task-workflow/SKILL.md"), "---\nname: long-task-workflow\n---\n");
  await writeFile(path.join(managed, "skills/long-task-workflow/agents/openai.yaml"), "name: Long Task\n");
  await writeFile(path.join(managed, "minimal_tools/validate_context.py"), "print('ok')\n");
  await writeFile(path.join(managed, "make/ty-context.mk"), "validate-context:\n\t@echo ok\n");
  await writeFile(path.join(fixture, ".github/workflows/harness.yml"), "name: Harness\n");
  await writeFile(
    path.join(fixture, "packages/ty-context/source-mappings.yaml"),
    `source_mappings:
  - source: ".agent/ty-context-managed/agents/AGENTS_CORE.md"
    target: "packages/ty-context/assets/agents/AGENTS_CORE.md"
    mode: "copy-file"
  - source: "README.md"
    target: "packages/ty-context/assets/README.md"
    mode: "copy-file"
  - source: "README.zh-CN.md"
    target: "packages/ty-context/assets/README.zh-CN.md"
    mode: "copy-file"
  - source: ".agent/ty-context-managed/context_templates"
    target: "packages/ty-context/assets/context_templates"
    mode: "copy-tree"
  - source: ".agent/ty-context-managed/skills"
    target: "packages/ty-context/assets/skills"
    mode: "copy-tree"
  - source: ".agent/ty-context-managed/make/ty-context.mk"
    target: "packages/ty-context/assets/make/ty-context.mk"
    mode: "copy-file"
  - source: ".agent/ty-context-managed/minimal_tools"
    target: "packages/ty-context/assets/tools"
    mode: "copy-tree"
  - source: ".agent/ty-context-managed/hooks"
    target: "packages/ty-context/assets/hooks"
    mode: "copy-tree"
  - source: ".github/workflows/harness.yml"
    target: "packages/ty-context/assets/github/harness.yml"
    mode: "copy-file"
`,
  );

  assert.ok((await syncSource(fixture)).changed.length > 0);
  assert.deepEqual((await syncSource(fixture)).changed, []);
  assert.deepEqual((await checkSource(fixture)).drift, []);
  assert.match(
    await readFile(
      path.join(fixture, "packages/ty-context/assets/skills/long-task-workflow/SKILL.md"),
      "utf8",
    ),
    /name: long-task-workflow/,
  );
  await mkdir(path.join(fixture, "packages/ty-context/assets/skills/stale"), {
    recursive: true,
  });
  await writeFile(
    path.join(fixture, "packages/ty-context/assets/skills/stale/SKILL.md"),
    "# stale\n",
  );
  assert.ok((await checkSource(fixture)).drift.some((item) => item.includes("stale")));
  assert.ok((await syncSource(fixture)).changed.some((item) => item.includes("stale")));
  assert.deepEqual((await syncSource(fixture)).changed, []);
} finally {
  await rm(fixture, { recursive: true, force: true });
}

test("top-level script assertions completed", () => {});
