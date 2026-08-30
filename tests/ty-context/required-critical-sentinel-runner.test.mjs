import assert from "node:assert/strict";
import { access } from "node:fs/promises";
import path from "node:path";
import { after, test } from "node:test";
import { setTimeout as delay } from "node:timers/promises";
import {
  cleanupFixtures,
  createFixture,
  finalJsonLine,
  ordinaryOwner,
  ownerName,
  passingOwner,
  replaceRequired,
  runFixture,
  sentinelId,
  suite,
  testDeclaration,
  testOwner,
} from "./required-critical-sentinel-runner-fixture.mjs";

const supportedPlatforms = ["linux", "darwin", "win32"];

after(cleanupFixtures);

test("required sentinel runner accepts one applicable, selected-owner passing occurrence", async () => {
  const fixture = await createFixture({ ownerSource: passingOwner() });
  const result = await runFixture(fixture);

  assert.equal(result.code, 0, result.stderr);
  assert.equal(result.signal, null);
  const report = finalJsonLine(result.stdout);
  assert.equal(report.schema_version, "required-critical-sentinel-report-v1");
  assert.equal(report.result_scope, "registration-projection");
  assert.equal(report.projection_status, "passed");
  assert.equal(report.complete_suite, false);
  assert.equal(report.registry_runtime_observation_complete, false);
  assert.equal(report.semantic_test_population_executed, false);
  assert.equal(report.population_suite, "long-task");
  assert.deepEqual(report.verified_ids, [sentinelId]);
  assert.equal(report.timing.test_status, "passed");
  assert.equal(report.timing.imported_test_count, 0);
  assert.equal(report.timing.unattributed_test_count, 0);
  assert.deepEqual(report.timing.critical_sentinel_coverage.required_ids, [
    sentinelId,
  ]);
  assert.deepEqual(report.timing.critical_sentinel_coverage.observed_ids, [
    sentinelId,
  ]);
  assert.equal(report.timing.critical_sentinel_coverage.status, "passed");
  assert.ok(
    report.timing.critical_sentinel_coverage.applicable_ids.includes(
      sentinelId,
    ),
  );
  assert.ok(
    !report.timing.critical_sentinel_coverage.not_selected_ids.includes(
      sentinelId,
    ),
  );
  assert.ok(
    !report.timing.critical_sentinel_coverage.non_applicable_ids.includes(
      sentinelId,
    ),
  );
  assert.equal(
    report.timing.execution.owner_file,
    `tests/ty-context/${ownerName}`,
  );
  assert.equal(report.timing.execution.platform, process.platform);
  assert.equal(
    report.timing.execution.reporter,
    "tests/ty-context/test-suite-file-reporter.mjs",
  );
});

test("required sentinel runner bounds registration projection time and settles descendants", async () => {
  const fixture = await createFixture({
    name: "bounded-process-tree",
    ownerSource: `import { spawn } from "node:child_process";
import { writeFileSync } from "node:fs";
import test from "node:test";
const survivor = spawn(
  process.execPath,
  [
    "-e",
    'setTimeout(() => require("node:fs").writeFileSync("descendant-survived.txt", "survived"), 2_000)',
  ],
  { stdio: "ignore" },
);
writeFileSync("descendant-started.txt", String(survivor.pid));
await new Promise(() => {});
test("[critical:${sentinelId}] unreachable sentinel", () => {});
`,
    runnerTransform: (source) =>
      replaceRequired(
        source,
        "const REGISTRATION_PROJECTION_TIMEOUT_MS = 300_000;",
        "const REGISTRATION_PROJECTION_TIMEOUT_MS = 1_000;",
      ),
  });
  const result = await runFixture(fixture);

  assert.notEqual(result.code, 0);
  assert.match(result.stderr, /command_timeout/u);
  const report = finalJsonLine(result.stdout);
  assert.equal(report.projection_status, "failed");
  assert.equal(report.timing.execution.timeout_ms, 1_000);
  await access(path.join(fixture, "descendant-started.txt"));
  await delay(2_500);
  await assert.rejects(() =>
    access(path.join(fixture, "descendant-survived.txt")),
  );
});

test("required sentinel runner rejects removed, renamed, and duplicate markers", async () => {
  const cases = [
    {
      name: "removed",
      ownerSource: ordinaryOwner(),
      diagnostics: ["critical_sentinel_missing"],
    },
    {
      name: "renamed",
      ownerSource: testOwner(
        `[critical:${sentinelId}-renamed] renamed sentinel`,
        "() => {}",
      ),
      diagnostics: ["critical_sentinel_missing"],
    },
    {
      name: "duplicate",
      ownerSource: `${passingOwner()}\n${testDeclaration(
        `[critical:${sentinelId}] duplicate sentinel`,
        "() => {}",
      )}\n`,
      diagnostics: ["critical_sentinel_duplicate"],
    },
  ];

  for (const scenario of cases) {
    const fixture = await createFixture({
      name: scenario.name,
      ownerSource: scenario.ownerSource,
    });
    const result = await runFixture(fixture);
    assert.notEqual(result.code, 0, scenario.name);
    for (const diagnostic of scenario.diagnostics)
      assert.match(result.stderr, new RegExp(diagnostic, "u"), scenario.name);
  }
});

test("required sentinel runner rejects wrong-owner, imported, and unattributed events", async () => {
  const wrongOwner = await createFixture({
    name: "wrong-owner",
    ownerSource: 'import "./long-task-relocated.test.mjs";\n',
    extraFiles: {
      "long-task-relocated.test.mjs": passingOwner(),
    },
  });
  const wrongOwnerResult = await runFixture(wrongOwner);
  assert.notEqual(wrongOwnerResult.code, 0);
  assert.match(wrongOwnerResult.stderr, /critical_sentinel_misplaced/u);

  const imported = await createFixture({
    name: "imported",
    ownerSource: passingOwner(),
    reporterTransform: (source) =>
      replaceRequired(
        source,
        "        file: data.file ?? null,",
        `        file: typeof data.name === "string" && data.name.includes("[critical:")
          ? fileURLToPath(new URL("./long-task-imported.test.mjs", import.meta.url))
          : data.file ?? null,`,
      ),
  });
  const importedResult = await runFixture(imported);
  assert.notEqual(importedResult.code, 0);
  assert.match(importedResult.stderr, /imported_tests_observed/u);

  const unattributed = await createFixture({
    name: "unattributed",
    ownerSource: passingOwner(),
    reporterTransform: (source) =>
      replaceRequired(
        replaceRequired(
          source,
          "        file: data.file ?? null,",
          "        file: null,",
        ),
        "        nesting: data.nesting ?? null,",
        "        nesting: 1,",
      ),
  });
  const unattributedResult = await runFixture(unattributed);
  assert.notEqual(unattributedResult.code, 0);
  assert.match(unattributedResult.stderr, /unattributed_tests_observed/u);
});

test("required sentinel runner rejects suite-wide wrong owners and unloaded duplicates", async () => {
  const cases = [
    {
      name: "wrong-owner-only",
      ownerSource: ordinaryOwner(),
      extraFiles: {
        "long-task-path-canonicalization.test.mjs": passingOwner(),
      },
      diagnostic: "critical_sentinel_misplaced",
    },
    {
      name: "correct-and-wrong-owner",
      ownerSource: passingOwner(),
      extraFiles: {
        "long-task-path-canonicalization.test.mjs": passingOwner(),
      },
      diagnostic: "critical_sentinel_duplicate",
    },
    {
      name: "duplicate-in-trust-owner",
      ownerSource: passingOwner(),
      extraFiles: {
        "long-task-active-authority-continuity.test.mjs": passingOwner(),
      },
      diagnostic: "critical_sentinel_duplicate",
    },
    {
      name: "duplicate-via-node-test-it",
      ownerSource: passingOwner(),
      extraFiles: {
        "long-task-path-canonicalization.test.mjs": `import { it } from "node:test";
it("[critical:${sentinelId}] duplicate through the Node test alias", () => {});
`,
      },
      diagnostic: "critical_sentinel_duplicate",
    },
  ];

  for (const scenario of cases) {
    const fixture = await createFixture(scenario);
    const result = await runFixture(fixture);
    assert.notEqual(result.code, 0, scenario.name);
    assert.match(
      result.stderr,
      new RegExp(scenario.diagnostic, "u"),
      scenario.name,
    );
    assert.doesNotMatch(
      result.stdout,
      /critical_sentinel_coverage/u,
      scenario.name,
    );
  }
});

test("required sentinel runner fails closed on every dynamic node:test title form", async () => {
  const cases = [
    {
      name: "template-expression",
      source: `import test from "node:test";
const hiddenId = ["windows", "finalization", "tree", "settlement"].join("-");
test(\`[critical:\${hiddenId}] hidden template duplicate\`, () => {});
`,
    },
    {
      name: "string-concatenation",
      source: `import test from "node:test";
const hiddenId = "${sentinelId}";
test("[critical:" + hiddenId + "] hidden concatenated duplicate", () => {});
`,
    },
    ...["only", "skip", "todo"].map((modifier) => ({
      name: `dynamic-${modifier}`,
      source: `import test from "node:test";
const hiddenTitle = "[critical:${sentinelId}] hidden ${modifier} duplicate";
test.${modifier}(hiddenTitle, () => {});
`,
    })),
    {
      name: "local-wrapper",
      source: `import test from "node:test";
function registerHidden(title) { test(title, () => {}); }
registerHidden("[critical:${sentinelId}] hidden wrapper duplicate");
`,
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
    assert.match(
      result.stderr,
      /critical_test_title_inventory_dynamic_title/u,
      scenario.name,
    );
    assert.doesNotMatch(
      result.stdout,
      /critical_sentinel_coverage/u,
      scenario.name,
    );
  }
});

test("required sentinel runner resolves immutable aliases and imported helper declarations", async () => {
  const aliased = await createFixture({
    name: "const-alias",
    ownerSource: passingOwner(),
    extraFiles: {
      "long-task-path-canonicalization.test.mjs": `import { default as nodeTest } from "node:test";
const sentinelTest = nodeTest;
sentinelTest("[critical:${sentinelId}] duplicate through const alias", () => {});
`,
    },
  });
  const aliasedResult = await runFixture(aliased);
  assert.notEqual(aliasedResult.code, 0);
  assert.match(aliasedResult.stderr, /critical_sentinel_duplicate/u);

  const imported = await createFixture({
    name: "imported-cases",
    ownerSource: passingOwner(),
    extraFiles: {
      "long-task-path-canonicalization.test.mjs": `import test from "node:test";
import "./hidden-sentinel.cases.mjs";
test("ordinary importing owner", () => {});
`,
      "hidden-sentinel.cases.mjs": `import * as nodeTest from "node:test";
nodeTest.test("[critical:${sentinelId}] duplicate from imported cases", () => {});
`,
    },
  });
  const importedResult = await runFixture(imported);
  assert.notEqual(importedResult.code, 0);
  assert.match(importedResult.stderr, /critical_sentinel_duplicate/u);
  assert.match(importedResult.stderr, /hidden-sentinel\.cases\.mjs/u);
});

test("required sentinel runtime attributes module-initialization tests outside declaration ownership", async () => {
  const ordinaryDependency = await createFixture({
    name: "ordinary-production-dependency",
    ownerSource: passingOwner(),
    extraFiles: {
      "long-task-path-canonicalization.test.mjs": `import { verifyProduct } from "../../product.mjs";
import test from "node:test";
test("ordinary production dependency", () => {
  if (verifyProduct() !== true) throw new Error("invalid product dependency");
});
`,
      "../../product.mjs": `const fs = await import("node:fs/promises");
export function verifyProduct() { return typeof fs.readFile === "function"; }
`,
    },
  });
  const ordinaryResult = await runFixture(ordinaryDependency);
  assert.equal(ordinaryResult.code, 0, ordinaryResult.stderr);

  const externalReexport = await createFixture({
    name: "production-node-test-reexport",
    ownerSource: `import test from "node:test";
import { wrappedTest } from "../../product.mjs";
if (false) {
  test("[critical:${sentinelId}] canonical declaration", () => {});
}
wrappedTest("[critical:${sentinelId}] alternate declaration", () => {});
`,
    extraFiles: {
      "../../product.mjs": `export { test as wrappedTest } from "node:test";
`,
    },
  });
  const externalReexportResult = await runFixture(externalReexport);
  assert.notEqual(externalReexportResult.code, 0);
  assert.deepEqual(
    finalJsonLine(externalReexportResult.stdout).timing
      .critical_sentinel_coverage.declaration_mismatch_ids,
    [sentinelId],
  );

  const hiddenRegistration = await createFixture({
    name: "production-module-initialization-registration",
    ownerSource: passingOwner(),
    extraFiles: {
      "long-task-path-canonicalization.test.mjs": `import "../../product.mjs";
import test from "node:test";
test("ordinary production dependency", () => {});
`,
      "../../product.mjs": `await import("./product-child.mjs");
`,
      "../../product-child.mjs": `import test from "node:test";
test("[critical:${sentinelId}] hidden production initialization duplicate", () => {});
`,
    },
  });
  const hiddenResult = await runFixture(hiddenRegistration);
  assert.notEqual(hiddenResult.code, 0);
  assert.match(hiddenResult.stderr, /critical_sentinel_duplicate/u);
  assert.match(hiddenResult.stderr, /critical_sentinel_misplaced/u);
});

test("required sentinel inventory closes TestContext and suite registration paths", async () => {
  const cases = [
    {
      name: "test-context",
      source: `import test from "node:test";
test("ordinary outer test", async (t) => {
  await t.test("[critical:${sentinelId}] duplicate from TestContext", () => {});
});
`,
    },
    {
      name: "named-suite",
      source: `import { describe } from "node:test";
describe("[critical:${sentinelId}] duplicate through describe", () => {});
`,
    },
    {
      name: "namespace-suite-alias",
      source: `import * as nodeTest from "node:test";
const registerSuite = nodeTest.suite;
registerSuite("[critical:${sentinelId}] duplicate through suite alias", () => {});
`,
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
    assert.match(result.stderr, /critical_sentinel_duplicate/u, scenario.name);
  }
});

test("required sentinel inventory rejects escaped callables and opaque test callbacks", async () => {
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
});

test("required sentinel inventory rejects hidden node:test acquisition and follows static local loaders", async () => {
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

  const moduleHookReexport = await createFixture({
    name: "node-module-register-hooks-reexport",
    ownerSource: passingOwner(),
    extraFiles: {
      "long-task-path-canonicalization.test.mjs": `import { registerHooks } from "./hook-bridge.mjs";
registerHooks({
  load(url, context, nextLoad) {
    return nextLoad(url, context);
  },
});
`,
      "hook-bridge.mjs": `export { registerHooks } from "node:module";
`,
    },
  });
  const moduleHookReexportResult = await runFixture(moduleHookReexport);
  assert.notEqual(moduleHookReexportResult.code, 0);
  assert.match(
    moduleHookReexportResult.stderr,
    /critical_test_title_inventory_unsupported_module_loader_reexport/u,
  );
  assert.match(moduleHookReexportResult.stderr, /hook-bridge\.mjs/u);

  const shorthandModuleHookReexport = await createFixture({
    name: "node-module-register-hooks-shorthand-reexport",
    ownerSource: passingOwner(),
    extraFiles: {
      "long-task-path-canonicalization.test.mjs": `import { hook } from "./hook-bridge.mjs";
hook({
  load(url, context, nextLoad) {
    return nextLoad(url, context);
  },
});
`,
      "hook-bridge.mjs": `import { registerHooks as hook } from "node:module";
export { hook };
`,
    },
  });
  const shorthandModuleHookReexportResult = await runFixture(
    shorthandModuleHookReexport,
  );
  assert.notEqual(shorthandModuleHookReexportResult.code, 0);
  assert.match(
    shorthandModuleHookReexportResult.stderr,
    /critical_test_title_inventory_unsupported_node_test_export/u,
  );
  assert.match(shorthandModuleHookReexportResult.stderr, /hook-bridge\.mjs/u);

  const dynamicImport = await createFixture({
    name: "static-resolved-dynamic-local-import",
    ownerSource: passingOwner(),
    extraFiles: {
      "long-task-path-canonicalization.test.mjs": `const helper = ["./hidden-sentinel", ".cases.mjs"].join("");
await import(helper);
`,
      "hidden-sentinel.cases.mjs": `import test from "node:test";
test("[critical:${sentinelId}] duplicate from resolved dynamic import", () => {});
`,
    },
  });
  const dynamicImportResult = await runFixture(dynamicImport);
  assert.notEqual(dynamicImportResult.code, 0);
  assert.match(dynamicImportResult.stderr, /critical_sentinel_duplicate/u);
  assert.match(dynamicImportResult.stderr, /hidden-sentinel\.cases\.mjs/u);

  const localRequire = await createFixture({
    name: "create-require-local-helper",
    ownerSource: passingOwner(),
    extraFiles: {
      "long-task-path-canonicalization.test.mjs": `import { createRequire } from "node:module";
const load = createRequire(import.meta.url);
load("./hidden-sentinel.cases.cjs");
`,
      "hidden-sentinel.cases.cjs": `const test = require("node:test");
test("[critical:${sentinelId}] duplicate from CommonJS helper", () => {});
`,
    },
  });
  const localRequireResult = await runFixture(localRequire);
  assert.notEqual(localRequireResult.code, 0);
  assert.match(
    localRequireResult.stderr,
    /critical_test_title_inventory_unsupported_node_test_import/u,
  );
  assert.match(localRequireResult.stderr, /hidden-sentinel\.cases\.cjs/u);

  const moduleRequire = await createFixture({
    name: "commonjs-module-require-local-helper",
    ownerSource: passingOwner(),
    extraFiles: {
      "long-task-path-canonicalization.test.mjs": `import { createRequire } from "node:module";
const load = createRequire(import.meta.url);
load("./middle.cjs");
`,
      "middle.cjs": `module.require("./hidden-sentinel.cases.cjs");
`,
      "hidden-sentinel.cases.cjs": `const test = require("node:test");
test("[critical:${sentinelId}] duplicate behind module.require", () => {});
`,
    },
  });
  const moduleRequireResult = await runFixture(moduleRequire);
  assert.notEqual(moduleRequireResult.code, 0);
  assert.match(
    moduleRequireResult.stderr,
    /critical_test_title_inventory_unsupported_node_test_import/u,
  );
  assert.match(moduleRequireResult.stderr, /hidden-sentinel\.cases\.cjs/u);

  for (const [name, source] of [
    [
      "aliased-commonjs-module-require",
      `const localModule = module;
localModule.require("./hidden-sentinel.cases.cjs");
`,
    ],
    [
      "optional-commonjs-module-require",
      `module?.require("./hidden-sentinel.cases.cjs");
`,
    ],
  ]) {
    const fixture = await createFixture({
      name,
      ownerSource: passingOwner(),
      extraFiles: {
        "long-task-path-canonicalization.test.mjs": `import { createRequire } from "node:module";
const load = createRequire(import.meta.url);
load("./middle.cjs");
`,
        "middle.cjs": source,
        "hidden-sentinel.cases.cjs": `const test = require("node:test");
test("[critical:${sentinelId}] duplicate behind ${name}", () => {});
`,
      },
    });
    const result = await runFixture(fixture);
    assert.notEqual(result.code, 0, name);
    assert.match(
      result.stderr,
      /critical_test_title_inventory_unsupported_node_test_import/u,
      name,
    );
  }

  const extensionless = await createFixture({
    name: "extensionless-commonjs-helper",
    ownerSource: passingOwner(),
    extraFiles: {
      "long-task-path-canonicalization.test.mjs": `import test from "node:test";
import { createRequire } from "node:module";
const load = createRequire(import.meta.url);
const helper = load("./ordinary-helper");
test("ordinary extensionless helper", () => {
  if (helper.verifyProduct() !== true) throw new Error("invalid helper");
});
`,
      "ordinary-helper.js": `module.exports = { verifyProduct() { return true; } };
`,
    },
  });
  const extensionlessResult = await runFixture(extensionless);
  assert.equal(extensionlessResult.code, 0, extensionlessResult.stderr);
});

test("required sentinel inventory permits lexical shadowing and inert critical source text", async () => {
  const fixture = await createFixture({
    name: "shadowing-and-inert-source",
    ownerSource: passingOwner(),
    extraFiles: {
      "long-task-path-canonicalization.test.mjs": `import test from "node:test";
function invokeLocal(test, title) {
  test(title, () => {});
}
invokeLocal(() => {}, "[critical:${sentinelId}] ordinary callback text");
function invokeProcess(process) {
  process.getBuiltinModule("node:test");
}
invokeProcess({ getBuiltinModule() {} });
const productSpecifier = ["./ordinary-runtime-product", ".mjs"].join("");
const runtimeProduct = await import(productSpecifier);
const { verifyProduct: namedProduct } = await import(productSpecifier);
const { ["verifyProduct"]: computedProduct } = await import(productSpecifier);
{
  const test = () => {};
  test("[critical:${sentinelId}] block-local callback text", () => {});
}
class StaticBlockFixture {
  static {
    var test = () => {};
    test("[critical:${sentinelId}] static-block callback text", () => {});
  }
}
const Function = { constructor: { name: "ordinary" } };
const ordinaryConstructorName = Function.constructor.name;
const reflectedConstructorName = Reflect.get(Function, "constructor").name;
const { constructor: destructuredConstructor } = Function;
const destructuredConstructorName = destructuredConstructor.name;
const valueOfConstructorName = destructuredConstructor.valueOf().name;
const optionalValueOfConstructorName =
  (destructuredConstructor?.valueOf)().name;
const { constructor: { name: nestedConstructorName } } = Function;
const ordinaryKey = "verify";
const ordinaryObject = { verify() { return true; } };
const { [ordinaryKey]: computedVerify } = ordinaryObject;
const { [0]: numericComputedVerify } = { 0() { return true; } };
const outerConstructorKey = "constructor";
{
  const outerConstructorKey = "verify";
  var { [outerConstructorKey]: scopedVarVerify } = ordinaryObject;
}
let assignedConstructor;
({ constructor: assignedConstructor } = Function);
const assignedConstructorName = assignedConstructor.name;
let assignedVerify;
({ [ordinaryKey]: assignedVerify } = ordinaryObject);
const fixtureSource = 'test("[critical:${sentinelId}] inert fixture source", () => {})';
// test("[critical:${sentinelId}] inert comment", () => {});
test("ordinary static node test declaration", () => {
  if (fixtureSource.length === 0) throw new Error("missing fixture source");
  if (
    runtimeProduct.verifyProduct() !== true ||
    namedProduct() !== true ||
    computedProduct() !== true ||
    ordinaryConstructorName !== "ordinary" ||
    reflectedConstructorName !== "ordinary" ||
    destructuredConstructorName !== "ordinary" ||
    valueOfConstructorName !== "ordinary" ||
    optionalValueOfConstructorName !== "ordinary" ||
    nestedConstructorName !== "ordinary" ||
    computedVerify() !== true ||
    numericComputedVerify() !== true ||
    scopedVarVerify() !== true ||
    assignedConstructorName !== "ordinary" ||
    assignedVerify() !== true
  )
    throw new Error("missing product inspector");
});
`,
      "ordinary-runtime-product.mjs": `export function verifyProduct() { return true; }
`,
    },
  });
  const result = await runFixture(fixture);
  assert.equal(result.code, 0, result.stderr);
  assert.equal(finalJsonLine(result.stdout).timing.test_status, "passed");
});

test("required sentinel inventory preserves the parameter/body environment boundary", async () => {
  const cases = [
    {
      name: "default-parameter-environment",
      source: `import test from "node:test";
function registerDefaultParameter(
  registered = test("[critical:${sentinelId}] default-parameter duplicate", () => {}),
) {
  var test;
  return registered;
}
registerDefaultParameter();
`,
    },
    {
      name: "simple-parameter-var-redeclaration",
      source: `import test from "node:test";
test("ordinary outer", (t) => {
  var t;
  t.test("[critical:${sentinelId}] simple parameter duplicate", () => {});
});
`,
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
    assert.match(result.stderr, /critical_sentinel_duplicate/u, scenario.name);
  }
});

test("required sentinel inventory rejects unresolved and nonlocal dynamic module loading", async () => {
  const cases = [
    {
      name: "unresolved-local-side-effect",
      source: `import test from "node:test";
const helperName = process.argv.length > 0
  ? "./hidden-runtime.cases.mjs"
  : "./hidden-runtime.cases.mjs";
const runtimeProduct = await import(helperName);
if (runtimeProduct.verifyProduct() !== true) throw new Error("invalid helper");
test("ordinary dynamic product test", () => {});
`,
    },
    {
      name: "conditional-local-modules",
      source: `const helper = process.argv.length > 0 ? "./left.mjs" : "./right.mjs";
await import(helper);
`,
    },
    {
      name: "node-vm-dynamic-import",
      source: `await import("node:vm");
`,
    },
    {
      name: "data-url-dynamic-import",
      source: `await import("data:text/javascript,export default true");
`,
    },
    {
      name: "bare-package-dynamic-import",
      source: `await import("acorn");
`,
    },
    {
      name: "escaped-local-dynamic-import",
      source: `await import("../../outside-helper.mjs");
`,
    },
    {
      name: "external-file-url-dynamic-import",
      source: `await import("file:///C:/outside-helper.mjs");
`,
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
    assert.match(
      result.stderr,
      /critical_test_title_inventory_unsupported_dynamic_import/u,
      scenario.name,
    );
    assert.doesNotMatch(
      result.stdout,
      /critical_sentinel_coverage/u,
      scenario.name,
    );
  }
});

test("required sentinel runner rejects skipped and failed sentinel results", async () => {
  const skipped = await createFixture({
    name: "skipped",
    ownerSource: testOwner(
      `[critical:${sentinelId}] skipped sentinel`,
      '{ skip: "fixture skip" }, () => {}',
    ),
  });
  const skippedResult = await runFixture(skipped);
  assert.notEqual(skippedResult.code, 0);
  assert.match(skippedResult.stderr, /critical_sentinel_non_passing/u);

  const failed = await createFixture({
    name: "failed",
    ownerSource: testOwner(
      `[critical:${sentinelId}] failed sentinel`,
      '() => { throw new Error("fixture failure"); }',
    ),
  });
  const failedResult = await runFixture(failed);
  assert.notEqual(failedResult.code, 0);
  assert.match(failedResult.stderr, /critical_sentinel_non_passing/u);
  assert.match(failedResult.stderr, /execution_exit_code/u);

  const todo = await createFixture({
    name: "todo",
    ownerSource: `import test from "node:test";\ntest.todo("[critical:${sentinelId}] todo sentinel", () => {});\n`,
  });
  const todoResult = await runFixture(todo);
  assert.notEqual(todoResult.code, 0);
  assert.match(todoResult.stderr, /critical_sentinel_non_passing/u);
});

test("required sentinel runner derives and enforces current platform applicability", async () => {
  const wrongPlatform = supportedPlatforms.find(
    (platform) => platform !== process.platform,
  );
  assert.ok(wrongPlatform, `unsupported test platform: ${process.platform}`);
  const fixture = await createFixture({
    name: "wrong-platform",
    ownerSource: passingOwner(),
    requiredPlatform: wrongPlatform,
  });
  const result = await runFixture(fixture);

  assert.notEqual(result.code, 0);
  assert.match(result.stderr, /required_critical_sentinel_wrong_platform/u);
  assert.doesNotMatch(result.stdout, /critical_sentinel_coverage/u);
});

test("required sentinel runner rejects missing and corrupt reporter output", async () => {
  const missing = await createFixture({
    name: "missing-report",
    ownerSource: passingOwner(),
    reporterTransform: (source) =>
      replaceRequired(
        source,
        "    const serialized = serializeEvent(event);",
        "    const serialized = null;",
      ),
  });
  const missingResult = await runFixture(missing);
  assert.notEqual(missingResult.code, 0);
  assert.match(missingResult.stderr, /report_missing_or_empty/u);

  const corrupt = await createFixture({
    name: "corrupt-report",
    ownerSource: passingOwner(),
    reporterTransform: (source) =>
      replaceRequired(
        source,
        "    if (serialized) yield `${JSON.stringify(serialized)}\\n`;",
        '    if (serialized) yield "{corrupt-json\\n";',
      ),
  });
  const corruptResult = await runFixture(corrupt);
  assert.notEqual(corruptResult.code, 0);
  assert.match(corruptResult.stderr, /report_read_failed/u);
});

test("required sentinel runner accepts no caller-selected owner, platform, reporter, or test options", async () => {
  const fixture = await createFixture({
    name: "extra-option",
    ownerSource: passingOwner(),
  });
  const result = await runFixture(fixture, [
    suite,
    sentinelId,
    "--owner",
    ownerName,
  ]);

  assert.notEqual(result.code, 0);
  assert.match(result.stderr, /Usage: node tools\/run_required/u);
  assert.doesNotMatch(result.stdout, /critical_sentinel_coverage/u);
});
