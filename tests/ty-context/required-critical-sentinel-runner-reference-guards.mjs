import assert from "node:assert/strict";
import {
  createFixture,
  passingOwner,
  runFixture,
  sentinelId,
} from "./required-critical-sentinel-runner-fixture.mjs";

export async function assertEscapedCallableAndOpaqueCallbackRejection() {
  const cases = [
    {
      name: "named-test-context-callback",
      source: `import test from "node:test";
function registerSubtest(t) {
  return t.test("[critical:${sentinelId}] hidden named callback", () => {});
}
test("ordinary outer test", registerSubtest);
`,
      diagnostic:
        "critical_test_title_inventory_unsupported_registration_callback",
    },
    {
      name: "function-arguments-test-context",
      source: `import test from "node:test";
test("ordinary outer test", function () {
  return arguments[0].test("[critical:${sentinelId}] hidden arguments callback", () => {});
});
`,
      diagnostic:
        "critical_test_title_inventory_unsupported_registration_callback",
    },
    {
      name: "missing-registration-callback",
      source: `import test from "node:test";
test("[critical:${sentinelId}] hidden callback-free placeholder");
`,
      diagnostic:
        "critical_test_title_inventory_unsupported_registration_callback",
    },
    {
      name: "options-only-registration",
      source: `import test from "node:test";
test("[critical:${sentinelId}] hidden options-only placeholder", { skip: false });
`,
      diagnostic:
        "critical_test_title_inventory_unsupported_registration_callback",
    },
    {
      name: "ignored-trailing-registration-callback",
      source: `import test from "node:test";
test("ordinary outer", (t) => {
  t.test("[critical:${sentinelId}] hidden behind ignored argument", () => {});
}, () => {});
`,
      diagnostic:
        "critical_test_title_inventory_unsupported_registration_callback",
    },
    {
      name: "exported-callable-alias",
      source: `import test from "node:test";
export const escapedTest = test;
`,
      diagnostic: "critical_test_title_inventory_unsupported_node_test_export",
    },
    {
      name: "direct-node-test-reexport",
      source: `export { default as escapedTest } from "node:test";
`,
      diagnostic:
        "critical_test_title_inventory_unsupported_node_test_reexport",
    },
    {
      name: "indirect-global-loader-transfer",
      source: `const loadBuiltin = globalThis.process.getBuiltinModule;
Reflect.apply(loadBuiltin, globalThis.process, ["node:test"])
  .test("[critical:${sentinelId}] hidden indirect loader", () => {});
`,
      diagnostic:
        "critical_test_title_inventory_unsupported_node_test_reference",
    },
    {
      name: "reflected-process-loader-transfer",
      source: `const loadBuiltin = Reflect.get(process, "getBuiltinModule");
const nodeTest = loadBuiltin("node:test");
nodeTest.test("[critical:${sentinelId}] hidden reflected loader", () => {});
`,
      diagnostic:
        "critical_test_title_inventory_unsupported_node_test_reference",
    },
    {
      name: "aliased-reflected-process-loader-transfer",
      source: `const runtimeReflect = globalThis.Reflect;
const reflectGet = runtimeReflect.get;
const runtimeProcess = process;
const loadBuiltin = reflectGet(runtimeProcess, "getBuiltinModule");
loadBuiltin("node:test");
`,
      diagnostic:
        "critical_test_title_inventory_unsupported_node_test_reference",
    },
    {
      name: "global-this-reflected-process-loader-transfer",
      source: `globalThis.Reflect.get(process, "getBuiltinModule");
`,
      diagnostic:
        "critical_test_title_inventory_unsupported_node_test_reference",
    },
    {
      name: "unresolved-dynamic-node-test-namespace",
      source: `const specifier = process.argv.length > 0 ? "node:test" : "./ordinary.mjs";
const nodeTest = await import(specifier);
nodeTest.test("[critical:${sentinelId}] hidden dynamic namespace", () => {});
`,
      diagnostic: "critical_test_title_inventory_unsupported_dynamic_import",
    },
    {
      name: "unresolved-dynamic-node-test-destructure",
      source: `const specifier = process.argv.length > 0 ? "node:test" : "./ordinary.mjs";
const { test: hiddenTest } = await import(specifier);
hiddenTest("[critical:${sentinelId}] hidden dynamic destructure", () => {});
`,
      diagnostic: "critical_test_title_inventory_unsupported_dynamic_import",
    },
    {
      name: "unresolved-dynamic-module-wrapper",
      source: `async function loadModule(specifier) { return import(specifier); }
const nodeTest = await loadModule("node:test");
nodeTest.test("[critical:${sentinelId}] hidden dynamic wrapper", () => {});
`,
      diagnostic: "critical_test_title_inventory_unsupported_dynamic_import",
    },
    {
      name: "deferred-unresolved-dynamic-module",
      source: `import test from "node:test";
test("ordinary deferred module test", async () => {
  const specifier = process.argv.length > 0 ? "./ordinary.mjs" : "./ordinary.mjs";
  const module = await import(specifier);
  return module.verifyProduct;
});
`,
      diagnostic: "critical_test_title_inventory_unsupported_dynamic_import",
    },
    {
      name: "direct-eval-registration",
      source: `import test from "node:test";
test("ordinary eval host", () => {
  eval('test("[critical:${sentinelId}] hidden eval duplicate", () => {});');
});
`,
      diagnostic:
        "critical_test_title_inventory_unsupported_node_test_reference",
    },
    {
      name: "reflected-eval-registration",
      source: `import test from "node:test";
test("ordinary reflected eval host", () => {
  Reflect.get(globalThis, "eval")(
    'test("[critical:${sentinelId}] hidden reflected eval duplicate", () => {});',
  );
});
`,
      diagnostic:
        "critical_test_title_inventory_unsupported_node_test_reference",
    },
    {
      name: "aliased-reflected-eval-registration",
      source: `import test from "node:test";
const runtimeGlobal = globalThis;
const runtimeReflect = Reflect;
const reflectedEval = runtimeReflect.get(runtimeGlobal, "eval");
test("ordinary aliased reflected eval host", () => {
  reflectedEval(
    'test("[critical:${sentinelId}] hidden aliased reflected eval duplicate", () => {});',
  );
});
`,
      diagnostic:
        "critical_test_title_inventory_unsupported_node_test_reference",
    },
    {
      name: "dynamic-global-reflection",
      source: `const property = process.argv.length > 0 ? "eval" : "Function";
Reflect.get(globalThis, property);
`,
      diagnostic:
        "critical_test_title_inventory_unsupported_node_test_reference",
    },
    {
      name: "constructor-chain-registration",
      source: `import test from "node:test";
test("ordinary constructor host", () => {
  globalThis.constructor.constructor(
    'process.getBuiltinModule("node:test").test("[critical:${sentinelId}] hidden constructor duplicate", () => {});',
  )();
});
`,
      diagnostic:
        "critical_test_title_inventory_unsupported_node_test_reference",
    },
    {
      name: "constructor-value-of-registration",
      source: `const { constructor: compile } = () => {};
compile.valueOf()(
  'process.getBuiltinModule("node:test").test("[critical:${sentinelId}] hidden valueOf constructor duplicate", () => {});',
)();
`,
      diagnostic:
        "critical_test_title_inventory_unsupported_node_test_reference",
    },
    {
      name: "node-vm-registration",
      source: `import test from "node:test";
import vm from "node:vm";
test("ordinary vm host", () => {
  vm.runInThisContext(
    'process.getBuiltinModule("node:test").test("[critical:${sentinelId}] hidden vm duplicate", () => {});',
  );
});
`,
      diagnostic:
        "critical_test_title_inventory_unsupported_node_test_reference",
    },
    {
      name: "module-load-registration",
      source: `import test from "node:test";
import { Module } from "node:module";
test("ordinary module loader host", () => {
  Module._load("node:test").test(
    "[critical:${sentinelId}] hidden Module load duplicate",
    () => {},
  );
});
`,
      diagnostic:
        "critical_test_title_inventory_unsupported_node_test_reference",
    },
    {
      name: "module-compile-registration",
      source: `import test from "node:test";
import { Module } from "node:module";
const compiledModule = new Module("hidden-critical-fixture");
test("ordinary module compile host", () => {
  compiledModule._compile(
    'process.getBuiltinModule("node:test").test("[critical:${sentinelId}] hidden Module compile duplicate", () => {});',
    "hidden-critical-fixture.cjs",
  );
});
`,
      diagnostic:
        "critical_test_title_inventory_unsupported_node_test_reference",
    },
  ];
  for (const scenario of cases) {
    const fixture = await createFixture({
      name: scenario.name,
      ownerSource: passingOwner(),
      extraFiles: {
        "long-task-path-canonicalization.test.mjs": scenario.source,
      },
    });
    const result = await runFixture(fixture);
    assert.notEqual(result.code, 0, scenario.name);
    assert.match(result.stderr, new RegExp(scenario.diagnostic, "u"));
    assert.doesNotMatch(result.stdout, /critical_sentinel_coverage/u);
  }
}
