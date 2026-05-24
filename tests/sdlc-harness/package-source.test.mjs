import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { checkSource, syncSource } from "../../packages/sdlc-harness/dist/lib/package-source.js";

const fixture = await mkdtemp(path.join(tmpdir(), "sdlc-harness-source-"));

try {
  await mkdir(path.join(fixture, ".agent/skills/example"), { recursive: true });
  await mkdir(path.join(fixture, ".agent/managed/templates"), { recursive: true });
  await mkdir(path.join(fixture, ".agent/managed/policies"), { recursive: true });
  await mkdir(path.join(fixture, ".agent/managed/make"), { recursive: true });
  await mkdir(path.join(fixture, ".github/workflows"), { recursive: true });
  await mkdir(path.join(fixture, "tools"), { recursive: true });
  await mkdir(path.join(fixture, "packages/sdlc-harness"), { recursive: true });
  await writeFile(path.join(fixture, "AGENTS.md"), "# AI SDLC Harness\n", "utf8");
  await writeFile(path.join(fixture, ".agent/skills/example/SKILL.md"), "# Skill\n", "utf8");
  await writeFile(path.join(fixture, ".agent/managed/templates/EXAMPLE.md"), "# Template\n", "utf8");
  await writeFile(path.join(fixture, ".agent/managed/policies/example.yaml"), "ok: true\n", "utf8");
  await writeFile(path.join(fixture, ".agent/managed/make/sdlc-harness.mk"), "help:\n\t@echo ok\n", "utf8");
  await writeFile(path.join(fixture, ".github/workflows/harness.yml"), "name: Harness\n", "utf8");
  await writeFile(path.join(fixture, "Makefile"), "help:\n\t@echo ok\n", "utf8");
  await writeFile(path.join(fixture, "tools/example.py"), "print('ok')\n", "utf8");
  await writeFile(
    path.join(fixture, "packages/sdlc-harness/source-mappings.yaml"),
    `source_mappings:
  - source: "AGENTS.md"
    target: "packages/sdlc-harness/assets/agents/AGENTS_CORE.md"
    mode: "extract-managed-block"
  - source: ".agent/skills"
    target: "packages/sdlc-harness/assets/skills"
    mode: "copy-tree"
  - source: ".agent/managed/templates"
    target: "packages/sdlc-harness/assets/templates"
    mode: "copy-tree"
  - source: ".agent/managed/policies"
    target: "packages/sdlc-harness/assets/policies"
    mode: "copy-tree"
  - source: ".agent/managed/make/sdlc-harness.mk"
    target: "packages/sdlc-harness/assets/make/sdlc-harness.mk"
    mode: "copy-file"
  - source: ".github/workflows/harness.yml"
    target: "packages/sdlc-harness/assets/github/harness.yml"
    mode: "copy-file"
`,
    "utf8"
  );

  const syncReport = await syncSource(fixture);
  assert.ok(syncReport.changed.length > 0);

  const checkReport = await checkSource(fixture);
  assert.deepEqual(checkReport.drift, []);

  const agentsCore = await readFile(path.join(fixture, "packages/sdlc-harness/assets/agents/AGENTS_CORE.md"), "utf8");
  assert.match(agentsCore, /AI SDLC Harness/);
} finally {
  await rm(fixture, { recursive: true, force: true });
}
