import assert from "node:assert/strict";
import test from "node:test";
import {
  appendContextManifestBlock,
  replaceContextManifestPath,
} from "../../packages/ty-context/dist/lib/context-mutation/manifest-lossless-patch.js";

test("lossless register append preserves every existing CRLF byte and complex TOML form", () => {
  const before = [
    "# lead",
    'title = "观测"',
    'metadata = { owner = "core", enabled = true }',
    "values = [",
    '  "one", # retained',
    '  "two",',
    "]",
    'description = """',
    "multi",
    "line",
    '"""',
    "",
    "[[areas]]",
    'id = "main"',
    'root = "."',
    'context = "project_context/areas/main.md"',
    'kind = "app"',
    "default = true",
    "",
  ].join("\r\n");
  const result = appendContextManifestBlock(before, {
    path: "project_context/areas/main/weather.md",
    role: "domain",
    read_policy: "on-demand",
    read_when: "修改天气观测规则时",
    triggers: ["weather", "天气"],
  });
  assert.equal(result.content.slice(0, before.length), before);
  assert.equal(result.line_ending, "crlf");
  assert.ok(result.inserted_block.includes("\r\n"));
  assert.doesNotMatch(result.inserted_block.replaceAll("\r\n", ""), /\n/u);
  assert.match(result.content, /\[\[context\]\]\r\npath = "project_context\/areas\/main\/weather\.md"/u);
  assert.match(result.content, /triggers = \["weather", "天气"\]/u);
});

test("lossless move replaces only one parser-confirmed basic path literal", () => {
  const before = `# keep
[[areas]]
id = "main"
root = "."
context = "project_context/areas/main.md"
default = true

[[context]]
path = "project_context/deployment.md"
role = "deployment"
read_policy = "on-demand"
triggers = ["deploy"] # keep

[[context]]
path = "project_context/root.md"
role = "domain"
read_policy = "default"
default_children = ["project_context/deployment.md"] # keep child
`;
  const result = replaceContextManifestPath(
    before,
    "project_context/deployment.md",
    "project_context/deployment/index.md",
  );
  assert.equal(result.replacements.length, 2);
  assert.deepEqual(
    result.replacements.map((entry) => entry.kind),
    ["owner", "default_child"],
  );
  assert.equal(result.previous_literal, '"project_context/deployment.md"');
  assert.equal(
    result.next_literal,
    '"project_context/deployment/index.md"',
  );
  assert.match(result.content, /triggers = \["deploy"\] # keep/u);
  assert.match(
    result.content,
    /default_children = \["project_context\/deployment\/index\.md"\] # keep child/u,
  );
  assert.doesNotMatch(result.content, /"project_context\/deployment\.md"/u);
});

test("lossless move supports one Area Context owner without rewriting its table", () => {
  const before = `# keep
[[areas]]
id = "main"
root = "."
context = "project_context/areas/main.md"
kind = "app"
default = true
`;
  const result = replaceContextManifestPath(
    before,
    "project_context/areas/main.md",
    "project_context/areas/main/index.md",
  );
  assert.equal(result.replacements.length, 1);
  assert.equal(result.replacements[0].kind, "owner");
  assert.match(
    result.content,
    /context = "project_context\/areas\/main\/index\.md"/u,
  );
  assert.match(result.content, /kind = "app"\ndefault = true/u);
});

test("lossless patcher fails closed for mixed line endings and unsupported path strings", () => {
  assert.throws(
    () =>
      appendContextManifestBlock(
        'title = "x"\r\nother = "y"\n',
        {
          path: "project_context/x.md",
          role: "domain",
          read_policy: "on-demand",
        },
      ),
    /mixed_line_endings_not_supported/u,
  );
  const literal = `[[areas]]
id = "main"
root = "."
context = "project_context/areas/main.md"
default = true

[[context]]
path = 'project_context/deployment.md'
role = "deployment"
`;
  assert.throws(
    () =>
      replaceContextManifestPath(
        literal,
        "project_context/deployment.md",
        "project_context/deployment/index.md",
      ),
    /context_path_literal_unsupported/u,
  );
});
