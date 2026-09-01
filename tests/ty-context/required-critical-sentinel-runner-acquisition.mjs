import assert from "node:assert/strict";
import {
  createFixture,
  passingOwner,
  runFixture,
  sentinelId,
} from "./required-critical-sentinel-runner-fixture.mjs";

export async function assertHiddenNodeTestAcquisition() {
  const acquisitionCases = [
    {
      name: "dynamic-import-node-test",
      source: `const nodeTest = await import("node:test");
nodeTest.test("[critical:${sentinelId}] hidden dynamic node:test acquisition", () => {});
`,
    },
    {
      name: "process-get-builtin-module",
      source: `const nodeTest = process.getBuiltinModule("node:test");
nodeTest.test("[critical:${sentinelId}] hidden process acquisition", () => {});
`,
    },
    {
      name: "aliased-get-builtin-module",
      source: `const loadBuiltin = process.getBuiltinModule;
const nodeTest = loadBuiltin("node:test");
nodeTest.test("[critical:${sentinelId}] hidden aliased process acquisition", () => {});
`,
    },
    {
      name: "global-this-get-builtin-module",
      source: `const nodeTest = globalThis.process.getBuiltinModule("node:test");
nodeTest.test("[critical:${sentinelId}] hidden globalThis acquisition", () => {});
`,
    },
    {
      name: "optional-process-get-builtin-module",
      source: `const nodeTest = process?.getBuiltinModule("node:test");
nodeTest.test("[critical:${sentinelId}] hidden optional process acquisition", () => {});
`,
    },
    {
      name: "create-require",
      source: `import { createRequire } from "node:module";
const load = createRequire(import.meta.url);
const nodeTest = load("node:test");
nodeTest.test("[critical:${sentinelId}] hidden require acquisition", () => {});
`,
    },
    {
      name: "namespace-create-require",
      source: `import * as nodeModule from "node:module";
const load = nodeModule.createRequire(import.meta.url);
load("node:test").test("[critical:${sentinelId}] hidden namespace require acquisition", () => {});
`,
    },
    {
      name: "commonjs-module-create-require",
      source: `const load = require("module").createRequire(import.meta.url);
load("node:test").test("[critical:${sentinelId}] hidden CommonJS module acquisition", () => {});
`,
    },
  ];
  for (const scenario of acquisitionCases) {
    const fixture = await createFixture({
      name: scenario.name,
      ownerSource: passingOwner(),
      extraFiles: {
        "long-task-path-canonicalization.test.mjs": scenario.source,
      },
    });
    const result = await runFixture(fixture);
    assert.notEqual(result.code, 0, scenario.name);
    assert.match(
      result.stderr,
      /critical_test_title_inventory_unsupported_node_test_import/u,
      scenario.name,
    );
  }

  for (const scenario of [
    {
      name: "node-module-register-hooks",
      source: `import { registerHooks } from "node:module";
registerHooks({
  load(url, context, nextLoad) {
    return nextLoad(url, context);
  },
});
`,
    },
    {
      name: "reflect-get-function-constructor",
      source: `const compile = Reflect.get(() => {}, "constructor");
compile('process.getBuiltinModule("node:test").test("[critical:${sentinelId}] hidden reflected constructor", () => {});')();
`,
    },
    {
      name: "constructor-object-destructure",
      source: `const { constructor: compile } = () => {};
compile('process.getBuiltinModule("node:test").test("[critical:${sentinelId}] hidden destructured constructor", () => {});')();
`,
    },
    {
      name: "computed-constructor-object-destructure",
      source: `const constructorKey = "constructor";
const { [constructorKey]: compile } = () => {};
compile('process.getBuiltinModule("node:test").test("[critical:${sentinelId}] hidden computed constructor", () => {});')();
`,
    },
    {
      name: "constructor-object-destructure-assignment",
      source: `let compile;
({ constructor: compile } = () => {});
compile('process.getBuiltinModule("node:test").test("[critical:${sentinelId}] hidden assigned constructor", () => {});')();
`,
    },
    {
      name: "computed-constructor-destructure-assignment",
      source: `const constructorKey = "constructor";
let compile;
({ [constructorKey]: compile } = () => {});
compile('process.getBuiltinModule("node:test").test("[critical:${sentinelId}] hidden computed assigned constructor", () => {});')();
`,
    },
    {
      name: "constructor-for-of-destructure-assignment",
      source: `let compile;
for ({ constructor: compile } of [() => {}]) break;
compile('process.getBuiltinModule("node:test").test("[critical:${sentinelId}] hidden for-of constructor", () => {});')();
`,
    },
    {
      name: "constructor-function-parameter-destructure",
      source: `function execute({ constructor: compile }) {
  compile('process.getBuiltinModule("node:test").test("[critical:${sentinelId}] hidden parameter constructor", () => {});')();
}
execute(() => {});
`,
    },
    {
      name: "constructor-catch-parameter-destructure",
      source: `try {
  throw () => {};
} catch ({ constructor: compile }) {
  compile('process.getBuiltinModule("node:test").test("[critical:${sentinelId}] hidden catch constructor", () => {});')();
}
`,
    },
    {
      name: "constructor-var-computed-key-lexical-scope",
      source: `const key = "verify";
{
  const key = "constructor";
  var { [key]: compile } = () => {};
  compile('process.getBuiltinModule("node:test").test("[critical:${sentinelId}] hidden var constructor", () => {});')();
}
`,
    },
    {
      name: "loader-alias-initializer-transfer",
      source: `import test from "node:test";
import { createRequire } from "node:module";
const load = createRequire(
  (globalThis.hiddenTest = test, import.meta.url),
);
globalThis.hiddenTest("[critical:${sentinelId}] hidden alias transfer", () => {});
void load;
`,
    },
  ]) {
    const fixture = await createFixture({
      name: scenario.name,
      ownerSource: passingOwner(),
      extraFiles: {
        "long-task-path-canonicalization.test.mjs": scenario.source,
      },
    });
    const result = await runFixture(fixture);
    assert.notEqual(result.code, 0, scenario.name);
    assert.match(
      result.stderr,
      /critical_test_title_inventory_unsupported_node_test_reference/u,
      scenario.name,
    );
  }
}
