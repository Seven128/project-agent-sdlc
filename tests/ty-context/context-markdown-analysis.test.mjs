import assert from "node:assert/strict";
import { mkdir, rm, symlink, writeFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { loadContextCatalog } from "../../packages/ty-context/dist/lib/context-catalog/catalog-load.js";
import {
  analyzeContextMarkdownCatalog,
  analyzeContextMarkdownFile,
} from "../../packages/ty-context/dist/lib/context-markdown/context-markdown-analysis.js";
import { createContextProject } from "./context-manifest-fixtures.mjs";

test("Markdown analysis resolves explicit local link forms and ignores prose, code, anchors, and external URLs", async () => {
  const root = await createContextProject({
    extraFiles: {
      "project_context/areas/main/links.md": `# Links

[relative](target.md#part)
[repository](project_context/global.md)
[root](/project_context/architecture.md)
[encoded](target%20space.md)
[windows](..\\main.md)
[directory](../)
[reference][main]

[main]: ../main.md#responsibility
<../main.md>
[external](https://example.com/project_context/no.md)
[protocol-relative](//example.com/no.md)
[anchor](#local)
project_context/missing-prose.md
\`[inline](missing-inline.md)\`

\`\`\`md
[fenced](missing-fenced.md)
<missing-fenced.md>
\`\`\`
`,
      "project_context/areas/main/target.md": "# Target\n",
      "project_context/areas/main/target space.md": "# Target Space\n",
    },
  });
  try {
    const catalog = await loadContextCatalog(root);
    const file = catalog.context_files.find(
      (entry) => entry.path === "project_context/areas/main/links.md",
    );
    assert.ok(file);
    const analysis = await analyzeContextMarkdownFile({
      project_root: root,
      file,
      long_line_threshold: 1_000,
    });
    assert.deepEqual(
      analysis.references.map((entry) => [
        entry.kind,
        entry.target_path,
        entry.fragment,
        entry.status,
      ]),
      [
        ["inline", "project_context/areas/main/target.md", "part", "valid"],
        ["inline", "project_context/global.md", null, "valid"],
        ["inline", "project_context/architecture.md", null, "valid"],
        ["inline", "project_context/areas/main/target space.md", null, "valid"],
        ["inline", "project_context/areas/main.md", null, "valid"],
        ["inline", "project_context/areas", null, "valid"],
        ["definition", "project_context/areas/main.md", "responsibility", "valid"],
        ["angle", "project_context/areas/main.md", null, "valid"],
      ],
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("Markdown analysis reports only explicit dangling, malformed, and escaping local links", async (t) => {
  const root = await createContextProject({
    extraFiles: {
      "project_context/areas/main/links.md": `# Links

[missing](missing.md)
[outside](../../../../outside.md)
[malformed](bad%ZZ.md)
`,
    },
  });
  try {
    const catalog = await loadContextCatalog(root);
    const file = catalog.context_files.find(
      (entry) => entry.path === "project_context/areas/main/links.md",
    );
    assert.ok(file);
    const analysis = await analyzeContextMarkdownFile({
      project_root: root,
      file,
      long_line_threshold: 1_000,
    });
    assert.deepEqual(
      analysis.references.map((entry) => entry.status),
      ["missing", "outside_repository", "invalid"],
    );

    const outside = `${root}-outside-link-target.md`;
    await writeFile(outside, "outside", "utf8");
    const linked = path.join(
      root,
      "project_context",
      "areas",
      "main",
      "linked.md",
    );
    try {
      await symlink(outside, linked, "file");
    } catch (error) {
      if (error?.code === "EPERM") {
        t.diagnostic("symlink creation is unavailable on this Windows host");
        return;
      }
      throw error;
    }
    await writeFile(
      path.join(root, "project_context", "areas", "main", "links.md"),
      "[linked](linked.md)\n",
      "utf8",
    );
    const linkedAnalysis = await analyzeContextMarkdownFile({
      project_root: root,
      file,
      long_line_threshold: 1_000,
    });
    assert.equal(linkedAnalysis.references[0].status, "outside_repository");
    await rm(outside, { force: true });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("stable key declarations are opt-in HTML comments and conflict only across owners", async () => {
  const root = await createContextProject({
    extraFiles: {
      "project_context/areas/main/one.md": `# One
<!-- ty-context-declare Fact-ID: OBS-001 -->
<!-- ty-context-declare Fact-ID: OBS-001 -->
\`<!-- ty-context-declare Rule-ID: CODE-001 -->\`
\`\`\`
<!-- ty-context-declare Rule-ID: CODE-002 -->
\`\`\`
<!-- ty-context-declare bad: nope -->
`,
      "project_context/areas/main/two.md": `# Two
<!-- ty-context-declare Fact-ID: OBS-001 -->
<!-- ty-context-declare Rule-ID: DEPLOY-004 -->
`,
    },
  });
  try {
    const catalog = await loadContextCatalog(root);
    const analysis = await analyzeContextMarkdownCatalog({
      project_root: root,
      files: catalog.context_files,
      long_line_threshold: 1_000,
    });
    assert.equal(
      analysis.declarations.filter(
        (entry) => entry.type === "Fact-ID" && entry.id === "OBS-001",
      ).length,
      3,
    );
    assert.equal(
      analysis.declarations.some((entry) => entry.id.startsWith("CODE-")),
      false,
    );
    assert.equal(analysis.invalid_declarations.length, 1);
    assert.deepEqual(analysis.declaration_conflicts, [
      {
        type: "Fact-ID",
        id: "OBS-001",
        owners: [
          { path: "project_context/areas/main/one.md", line: 2 },
          { path: "project_context/areas/main/two.md", line: 2 },
        ],
      },
    ]);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("line diagnostics count Unicode code points deterministically", async () => {
  const root = await createContextProject({
    extraFiles: {
      "project_context/areas/main/line.md": "😀😀😀\nshort\n",
    },
  });
  try {
    const catalog = await loadContextCatalog(root);
    const file = catalog.context_files.find(
      (entry) => entry.path === "project_context/areas/main/line.md",
    );
    assert.ok(file);
    const analysis = await analyzeContextMarkdownFile({
      project_root: root,
      file,
      long_line_threshold: 2,
    });
    assert.equal(analysis.max_line_code_points, 5);
    assert.deepEqual(analysis.long_lines, [
      { line: 1, code_points: 3 },
      { line: 2, code_points: 5 },
    ]);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
