import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  checkSource,
  inspectPackageSourceMappings,
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
  await writeFile(path.join(managed, "context_templates/z-last.md"), "# Last\n");
  await writeFile(path.join(managed, "context_templates/a-first.md"), "# First\n");
  await mkdir(path.join(managed, "context_templates/ignored"), {
    recursive: true,
  });
  await writeFile(
    path.join(managed, "context_templates/ignored/private.md"),
    "# Excluded\n",
  );
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
  - source: ".agent/ty-context-managed/skills"
    target: "packages/ty-context/assets/skills"
    mode: "copy-tree"
  - source: "README.md"
    target: "packages/ty-context/assets/README.md"
    mode: "copy-file"
  - source: "README.zh-CN.md"
    target: "packages/ty-context/assets/README.zh-CN.md"
    mode: "copy-file"
  - source: ".agent/ty-context-managed/context_templates"
    target: "packages/ty-context/assets/context_templates"
    mode: "copy-tree"
    exclude:
      - "ignored/**"
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
  const inspection = await inspectPackageSourceMappings(fixture);
  assert.deepEqual(
    inspection,
    await inspectPackageSourceMappings(fixture),
    "the read-only inspection must be deterministic",
  );
  assert.equal(inspection.parity, true);
  assert.deepEqual(inspection.drift, []);
  assert.deepEqual(
    inspection.mappings.map((mapping) => mapping.target),
    inspection.mappings.map((mapping) => mapping.target).toSorted(),
  );
  for (const mapping of inspection.mappings) {
    assert.deepEqual(
      mapping.canonical_source_files.map((file) => file.path),
      mapping.canonical_source_files.map((file) => file.path).toSorted(),
    );
    assert.deepEqual(
      mapping.projected_target_files.map((file) => file.path),
      mapping.projected_target_files.map((file) => file.path).toSorted(),
    );
    assert.equal(mapping.parity, true);
  }

  const contextTemplates = inspection.mappings.find(
    (mapping) =>
      mapping.target === "packages/ty-context/assets/context_templates",
  );
  assert.ok(contextTemplates);
  assert.equal(contextTemplates.mode, "copy-tree");
  assert.deepEqual(
    contextTemplates.canonical_source_files.map((file) => file.path),
    [
      ".agent/ty-context-managed/context_templates/a-first.md",
      ".agent/ty-context-managed/context_templates/global.md",
      ".agent/ty-context-managed/context_templates/z-last.md",
    ],
  );
  assert.deepEqual(
    contextTemplates.projected_target_files.map((file) => file.path),
    [
      "packages/ty-context/assets/context_templates/a-first.md",
      "packages/ty-context/assets/context_templates/global.md",
      "packages/ty-context/assets/context_templates/z-last.md",
    ],
  );
  assert.ok(
    contextTemplates.projected_target_files.every(
      (file) => file.status === "current",
    ),
  );
  assert.equal(
    await readFile(
      path.join(
        fixture,
        "packages/ty-context/assets/context_templates/ignored/private.md",
      ),
      "utf8",
    ).then(
      () => true,
      () => false,
    ),
    false,
    "excluded tree entries must not be projected or measured",
  );

  const localizedReadme = inspection.mappings.find(
    (mapping) =>
      mapping.target === "packages/ty-context/assets/README.zh-CN.md",
  );
  assert.ok(localizedReadme);
  assert.equal(localizedReadme.mode, "copy-file");
  assert.deepEqual(localizedReadme.canonical_source_files, [
    {
      path: "README.zh-CN.md",
      utf8_bytes: Buffer.byteLength("# 中文指南\n\n单目标滚动交付。\n", "utf8"),
    },
  ]);
  assert.deepEqual(localizedReadme.projected_target_files, [
    {
      path: "packages/ty-context/assets/README.zh-CN.md",
      expected_utf8_bytes: Buffer.byteLength(
        "# 中文指南\n\n单目标滚动交付。\n",
        "utf8",
      ),
      actual_utf8_bytes: Buffer.byteLength(
        "# 中文指南\n\n单目标滚动交付。\n",
        "utf8",
      ),
      status: "current",
    },
  ]);
  for (const totalName of [
    "canonical_source",
    "projected_expected",
    "projected_actual",
  ]) {
    assert.deepEqual(
      inspection.totals[totalName],
      inspection.mappings.reduce(
        (total, mapping) => ({
          file_count: total.file_count + mapping.totals[totalName].file_count,
          utf8_bytes:
            total.utf8_bytes + mapping.totals[totalName].utf8_bytes,
        }),
        { file_count: 0, utf8_bytes: 0 },
      ),
    );
  }
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
  await writeFile(
    path.join(fixture, "packages/ty-context/assets/README.md"),
    "# changed\n",
  );
  await rm(
    path.join(fixture, "packages/ty-context/assets/context_templates/global.md"),
  );
  const driftInspection = await inspectPackageSourceMappings(fixture);
  assert.equal(driftInspection.parity, false);
  assert.deepEqual(driftInspection.drift, [
    "packages/ty-context/assets/README.md",
    "packages/ty-context/assets/context_templates/global.md",
    "packages/ty-context/assets/skills/stale/SKILL.md",
  ]);
  assert.equal(
    driftInspection.mappings
      .flatMap((mapping) => mapping.projected_target_files)
      .find((file) => file.path.endsWith("README.md"))?.status,
    "changed",
  );
  assert.equal(
    driftInspection.mappings
      .flatMap((mapping) => mapping.projected_target_files)
      .find((file) => file.path.endsWith("context_templates/global.md"))
      ?.status,
    "missing",
  );
  assert.equal(
    driftInspection.mappings
      .flatMap((mapping) => mapping.projected_target_files)
      .find((file) => file.path.endsWith("skills/stale/SKILL.md"))?.status,
    "unexpected",
  );
  const checkDrift = (await checkSource(fixture)).drift;
  assert.deepEqual(
    checkDrift,
    [
      `packages/ty-context/assets/skills/${path.join("stale", "SKILL.md")}`,
      "packages/ty-context/assets/README.md",
      "packages/ty-context/assets/context_templates/global.md",
    ],
    "source check must preserve YAML mapping order while inspection stays sorted",
  );
  assert.deepEqual(
    driftInspection.drift,
    checkDrift.map((item) => item.replace(/\\/g, "/")).toSorted(),
    "inspection parity must use the existing source-check semantics",
  );
  assert.ok(checkDrift.some((item) => item.includes("stale")));
  assert.ok((await syncSource(fixture)).changed.some((item) => item.includes("stale")));
  assert.deepEqual((await syncSource(fixture)).changed, []);
} finally {
  await rm(fixture, { recursive: true, force: true });
}
