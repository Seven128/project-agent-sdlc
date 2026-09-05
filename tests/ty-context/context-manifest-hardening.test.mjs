import assert from "node:assert/strict";
import { mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { runValidator } from "../../packages/ty-context/dist/lib/validators.js";
import {
  areaContext,
  baseManifest,
  createContextProject,
} from "./context-manifest-fixtures.mjs";

test("manifest_rejects_unknown_field", async () => {
  await withProject(
    { manifest: `${baseManifest()}\ninvalid = [\n` },
    async (root) => {
      const report = await validate(root);
      assert.match(report.errors.join("\n"), /is not valid TOML/);
    },
  );
  await withProject(
    {
      manifest: `unexpected = true\n${baseManifest()}\nunknown_node_field = "x"\n`,
    },
    async (root) => {
      const report = await validate(root);
      assert.match(report.errors.join("\n"), /unknown field unexpected/);
      assert.match(
        report.errors.join("\n"),
        /unknown field unknown_node_field/,
      );
    },
  );
});

test("manifest_allows_no_default_area", async () => {
  await withProject(
    { manifest: baseManifest().replace("default = true", "default = false") },
    async (root) => {
      const report = await validate(root);
      assert.deepEqual(report.errors, []);
    },
  );
});

test("manifest_rejects_duplicate_area_id", async () => {
  const manifest = `${baseManifest()}

[[areas]]
id = "main"
root = "."
context = "project_context/areas/other.md"
default = false

[[context]]
path = "project_context/areas/main/verification.md"
role = "verification"
`;
  await withProject(
    {
      manifest,
      extraFiles: {
        "project_context/areas/other.md": areaContext("other"),
      },
    },
    async (root) => {
      const report = await validate(root);
      const errors = report.errors.join("\n");
      assert.match(errors, /duplicate area id: main/);
      assert.match(
        errors,
        /duplicate Context path: project_context\/areas\/main\/verification\.md/,
      );
    },
  );
});

test("manifest_rejects_duplicate_context_path", async () => {
  const manifest = `${baseManifest()}

[[context]]
path = "project_context/areas/main/verification.md"
role = "verification"
read_policy = "default"
`;
  await withProject({ manifest }, async (root) => {
    const report = await validate(root);
    assert.match(
      report.errors.join("\n"),
      /duplicate Context path: project_context\/areas\/main\/verification\.md/,
    );
  });
});

test("manifest_rejects_missing_default_child", async () => {
  const manifest = baseManifest()
    .replace('root = "."', 'root = "missing-area-root"')
    .replace(
      'triggers = ["test"]',
      'triggers = ["test"]\ndefault_children = ["project_context/areas/main/missing.md"]',
    );
  await withProject({ manifest }, async (root) => {
    const report = await validate(root);
    const errors = report.errors.join("\n");
    assert.match(errors, /references missing area root: missing-area-root/);
    assert.match(
      errors,
      /default_children references unregistered Context path/,
    );
  });
});

test("manifest_rejects_frontmatter_role_mismatch", async () => {
  const verification = `---
context_role: deployment
read_policy: optional
---
# Verification

## Verification Paths

- \`npm test\`
`;
  await withProject(
    {
      extraFiles: {
        "project_context/areas/main/verification.md": verification,
      },
    },
    async (root) => {
      const report = await validate(root);
      const errors = report.errors.join("\n");
      assert.match(
        errors,
        /context_role does not match requested manifest role verification/,
      );
      assert.match(
        errors,
        /read_policy does not match requested manifest read_policy default/,
      );
    },
  );
});

test("unregistered Context Markdown is reported as a warning", async () => {
  await withProject(
    {
      extraFiles: {
        "project_context/areas/main/unregistered.md":
          areaContext("unregistered"),
      },
    },
    async (root) => {
      const report = await validate(root);
      assert.deepEqual(report.errors, []);
      assert.match(
        report.warnings?.join("\n") ?? "",
        /unregistered Context Markdown file/,
      );
    },
  );
});

test("manifest_rejects_dotdot_escape", async () => {
  const manifest = `${baseManifest()}

[[context]]
path = "project_context/../outside.md"
role = "foundation"
`;
  await withProject({ manifest }, async (root) => {
    const report = await validate(root);
    assert.match(report.errors.join("\n"), /must not contain '\.\.'/);
  });
});

test("manifest_rejects_symlink_escape", async () => {
  const outside = await mkdtemp(path.join(os.tmpdir(), "ty-context-outside-"));
  const outsideFile = path.join(outside, "outside.md");
  await writeFile(outsideFile, areaContext("outside"), "utf8");
  await withProject(
    {
      manifest: `${baseManifest()}

[[context]]
path = "project_context/areas/main/escape.md"
role = "foundation"
`,
    },
    async (root) => {
      const link = path.join(
        root,
        "project_context",
        "areas",
        "main",
        "escape.md",
      );
      await symlink(outsideFile, link, "file");
      const report = await validate(root);
      assert.match(
        report.errors.join("\n"),
        /symbolic link outside its allowed root/,
      );
    },
  );
  await rm(outside, { recursive: true, force: true });
});

test("context_allows_placeholder_only_content", async () => {
  const placeholder = `# Area Context: main

## Responsibility

- TODO
`;
  await withProject(
    { extraFiles: { "project_context/areas/main.md": placeholder } },
    async (root) => {
      const report = await validate(root);
      assert.deepEqual(report.errors, []);
    },
  );
});

test("cjk_historical_verification_text_is_not_a_structural_error", async () => {
  const area = `# Area Context: main

## Responsibility

- Maintain durable package behavior facts.

## 验证

- 测试已通过。
`;
  await withProject(
    { extraFiles: { "project_context/areas/main.md": area } },
    async (root) => {
      const report = await validate(root);
      assert.deepEqual(report.errors, []);
    },
  );
});

test("verification_text_in_multiple_sections_is_not_a_structural_error", async () => {
  const area = `# Area Context: main

## Responsibility

- Maintain durable package behavior facts.

## Verification

- \`npm test\`

## 验证

- 测试已通过。
`;
  await withProject(
    { extraFiles: { "project_context/areas/main.md": area } },
    async (root) => {
      const report = await validate(root);
      assert.deepEqual(report.errors, []);
    },
  );
});

async function withProject(options, assertion) {
  const root = await createContextProject(options);
  try {
    await assertion(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

async function validate(root) {
  return runValidator(root, "validate-context");
}
