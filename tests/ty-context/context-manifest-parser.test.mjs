import assert from "node:assert/strict";
import test from "node:test";
import { parse, stringify } from "smol-toml";
import { parseContextManifest } from "../../packages/ty-context/dist/lib/context-manifest-schema.js";

const representativeManifest = `# Parser compatibility fixture: comments must not alter values.
[[areas]]
id = "主应用"
root = "."
context = "project_context/areas/main.md"
kind = "app"
default = true
forbidden_runtime_dependencies = [
  "node:fs", # trailing comments inside multiline arrays are valid TOML
  "node:path",
]

[[context]]
path = "project_context/areas/main/观测.md"
role = "domain"
read_when = "修改地图观测或 BFF 契约时读取"
read_policy = "on-demand"
triggers = [
  "地图筛选",
  "BFF.Query",
  "[literal].*",
]
default_children = []
`;

test("Context Manifest parser preserves comments, multiline arrays and Unicode semantics", () => {
  const result = parseContextManifest(representativeManifest);

  assert.deepEqual(result.errors, []);
  assert.equal(result.manifest?.areas[0]?.id, "主应用");
  assert.deepEqual(result.manifest?.areas[0]?.forbidden_runtime_dependencies, [
    "node:fs",
    "node:path",
  ]);
  assert.equal(
    result.manifest?.contexts[0]?.path,
    "project_context/areas/main/观测.md",
  );
  assert.deepEqual(result.manifest?.contexts[0]?.triggers, [
    "地图筛选",
    "BFF.Query",
    "[literal].*",
  ]);
});

test("Context Manifest schema reports unknown keys after successful TOML parsing", () => {
  const result = parseContextManifest(
    `future_top_level = true\n${representativeManifest}`,
  );

  assert.ok(result.manifest);
  assert.deepEqual(result.errors, [
    "project_context/context.toml has unknown field future_top_level",
  ]);
});

test("Context Manifest parser contains malformed TOML failures behind its stable error prefix", () => {
  const result = parseContextManifest('[[areas]\nid = "broken"\n');

  assert.equal(result.manifest, undefined);
  assert.equal(result.errors.length, 1);
  assert.match(
    result.errors[0],
    /^project_context\/context\.toml is not valid TOML:/u,
  );
});

test("smol-toml semantic round trip is stable without claiming format preservation", () => {
  const parsed = parse(representativeManifest);
  const serialized = stringify(parsed);

  assert.deepEqual(parse(serialized), parsed);
});
