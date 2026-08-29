import assert from "node:assert/strict";
import test from "node:test";
import { planContextUnitsConversion } from "../../packages/ty-context/dist/lib/context-units-migration.js";

test("legacy context_units conversion is a bounded CRLF-preserving byte patch", () => {
  const source = [
    "# keep header",
    "[[areas]]",
    'id = "main"',
    'root = "."',
    'context = "project_context/areas/main.md"',
    "default = true",
    "",
    "[[context_units]] # legacy table",
    "# keep owner comment",
    'id = "main-verification" # retired identity',
    'path = "project_context/areas/main/verification.md"',
    'role = "verification"',
    'area = "main"',
    'triggers = ["test"]',
    "",
  ].join("\r\n");
  const planned = planContextUnitsConversion(source);
  assert.equal(planned.status, "safe");
  assert.equal(
    planned.content,
    [
      "# keep header",
      "[[areas]]",
      'id = "main"',
      'root = "."',
      'context = "project_context/areas/main.md"',
      "default = true",
      "",
      "[[context]] # legacy table",
      "# keep owner comment",
      'path = "project_context/areas/main/verification.md"',
      'role = "verification"',
      'triggers = ["test"]',
      "",
    ].join("\r\n"),
  );
});

test("legacy conversion refuses current-path conflicts and unsupported fields", () => {
  const conflict = planContextUnitsConversion(`[[areas]]
id = "main"
root = "."
context = "project_context/areas/main.md"
default = true

[[context]]
path = "project_context/areas/main/verification.md"
role = "verification"

[[context_units]]
id = "old"
path = "project_context/areas/main/verification.md"
role = "verification"
area = "main"
`);
  assert.equal(conflict.status, "manual");
  assert.match(conflict.reason, /path conflicts/u);

  const unknown = planContextUnitsConversion(`[[context_units]]
id = "old"
path = "project_context/areas/main/verification.md"
role = "verification"
area = "main"
owner = "invented"
`);
  assert.equal(unknown.status, "manual");
  assert.match(unknown.reason, /unsupported fields: owner/u);
});

test("legacy conversion refuses multiline and mixed-EOL structures instead of canonicalizing", () => {
  const multiline = planContextUnitsConversion(`[[context_units]]
id = "old"
path = "project_context/areas/main/verification.md"
role = "verification"
area = "main"
read_when = """
Read this later.
"""
`);
  assert.equal(multiline.status, "manual");
  assert.match(multiline.reason, /single-line/u);

  const mixed = planContextUnitsConversion(
    '[[context_units]]\r\nid = "old"\npath = "project_context/a.md"\r\nrole = "domain"\r\n',
  );
  assert.equal(mixed.status, "manual");
  assert.match(mixed.reason, /mixed line endings/u);
});

test("current Schema v4 manifests require no legacy mutation", () => {
  assert.deepEqual(
    planContextUnitsConversion(`[[context]]
path = "project_context/areas/main/domain.md"
role = "domain"
read_policy = "on-demand"
`),
    { status: "absent" },
  );
});
