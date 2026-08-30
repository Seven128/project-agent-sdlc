import assert from "node:assert/strict";
import test from "node:test";
import { patchMarkdownLinksForContextMove } from "../../packages/ty-context/dist/lib/context-mutation/markdown-link-patch.js";

const from = "project_context/deployment.md";
const to = "project_context/deployment/index.md";

test("Markdown move patch updates all explicit inbound link forms and no prose or code", () => {
  const content = `# Links

[relative](../../deployment.md#part)
[repository](project_context/deployment.md)
[root](/project_context/deployment.md?mode=full#part)
[encoded](project_context/deployment%2Emd)
[windows](..\\..\\deployment.md)
![image](../../deployment.md "title")
[reference][deploy]

[deploy]: ../../deployment.md#reference "title"
<../../deployment.md>
project_context/deployment.md
\`project_context/deployment.md\`

\`\`\`md
[fenced](project_context/deployment.md)
\`\`\`
`;
  const result = patchMarkdownLinksForContextMove({
    content,
    source_path: "project_context/areas/main/links.md",
    source_physical_path: "project_context/areas/main/links.md",
    from_path: from,
    from_physical_path: from,
    to_path: to,
    to_physical_path: to,
  });
  assert.equal(result.changes.length, 8);
  assert.match(result.content, /\.\.\/\.\.\/deployment\/index\.md#part/u);
  assert.match(result.content, /project_context\/deployment\/index\.md\)/u);
  assert.match(
    result.content,
    /\/project_context\/deployment\/index\.md\?mode=full#part/u,
  );
  assert.match(result.content, /project_context\/deployment\/index\.md/u);
  assert.match(result.content, /\.\.\\\.\.\\deployment\\index\.md/u);
  assert.match(
    result.content,
    /\[deploy\]: \.\.\/\.\.\/deployment\/index\.md#reference "title"/u,
  );
  assert.match(result.content, /<\.\.\/\.\.\/deployment\/index\.md>/u);
  assert.match(result.content, /\nproject_context\/deployment\.md\n/u);
  assert.ok(result.content.includes("`project_context/deployment.md`"));
  assert.match(
    result.content,
    /\[fenced\]\(project_context\/deployment\.md\)/u,
  );
});

test("moving Markdown rebases its own relative links while preserving root and repository styles", () => {
  const content = `# Deployment

[architecture](architecture.md)
[area](areas/main.md#owner)
[repository](project_context/global.md)
[root](/DESIGN.md)
<architecture.md>
[anchor](#local)
`;
  const result = patchMarkdownLinksForContextMove({
    content,
    source_path: from,
    source_physical_path: from,
    from_path: from,
    from_physical_path: from,
    to_path: to,
    to_physical_path: to,
  });
  assert.equal(result.changes.length, 3);
  assert.match(result.content, /\[architecture\]\(\.\.\/architecture\.md\)/u);
  assert.match(result.content, /\[area\]\(\.\.\/areas\/main\.md#owner\)/u);
  assert.match(result.content, /<\.\.\/architecture\.md>/u);
  assert.match(
    result.content,
    /\[repository\]\(project_context\/global\.md\)/u,
  );
  assert.match(result.content, /\[root\]\(\/DESIGN\.md\)/u);
  assert.match(result.content, /\[anchor\]\(#local\)/u);
});

test("invalid and escaping destinations are reported but never rewritten", () => {
  const content = `[invalid](bad%ZZ.md)\n[outside](../../../../outside.md)\n`;
  const result = patchMarkdownLinksForContextMove({
    content,
    source_path: from,
    source_physical_path: from,
    from_path: from,
    from_physical_path: from,
    to_path: to,
    to_physical_path: to,
  });
  assert.equal(result.content, content);
  assert.deepEqual(
    result.references.map((entry) => entry.status),
    ["invalid", "outside"],
  );
});
