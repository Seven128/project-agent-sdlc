import assert from "node:assert/strict";
import {
  createFixture,
  finalJsonLine,
  passingOwner,
  runFixture,
  sentinelId,
} from "./required-critical-sentinel-runner-fixture.mjs";

export async function assertConstructorCapabilityProvenance() {
  const cases = [
    {
      name: "commonjs-module-constructor-load",
      source: `module.constructor._load("node:test").test(
  "[critical:${sentinelId}] hidden module constructor load",
  () => {},
);
`,
    },
    {
      name: "computed-commonjs-module-constructor-load",
      source: `module["constructor"]["_load"]("node:test").test(
  "[critical:${sentinelId}] hidden computed module constructor load",
  () => {},
);
`,
    },
    {
      name: "aliased-commonjs-module-constructor-load",
      source: `const ModuleCtor = module.constructor;
ModuleCtor._load("node:test").test(
  "[critical:${sentinelId}] hidden aliased module constructor load",
  () => {},
);
`,
    },
    {
      name: "reflected-commonjs-module-constructor-load",
      source: `const ModuleCtor = Reflect.get(module, "constructor");
ModuleCtor._load("node:test").test(
  "[critical:${sentinelId}] hidden reflected module constructor load",
  () => {},
);
`,
    },
    {
      name: "destructured-commonjs-module-constructor-load",
      source: `const { constructor: ModuleCtor } = module;
ModuleCtor._load("node:test").test(
  "[critical:${sentinelId}] hidden destructured module constructor load",
  () => {},
);
`,
    },
    {
      name: "identity-commonjs-module-constructor-load",
      source: `module.constructor.valueOf()._load("node:test").test(
  "[critical:${sentinelId}] hidden identity module constructor load",
  () => {},
);
`,
    },
    {
      name: "optional-commonjs-module-constructor-load",
      source: `module?.constructor?._load("node:test").test(
  "[critical:${sentinelId}] hidden optional module constructor load",
  () => {},
);
`,
    },
    ...["_compile", "_extensions", "runMain"].map((property) => ({
      name: `commonjs-module-constructor-${property}`,
      source: `module.constructor.${property};\n`,
    })),
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
      /critical_test_title_inventory_unsupported_node_test_reference/u,
      scenario.name,
    );
  }

  const nestedHelper = await createFixture({
    name: "nested-commonjs-module-constructor-load",
    ownerSource: passingOwner(),
    extraFiles: {
      "long-task-path-canonicalization.test.mjs": `import { createRequire } from "node:module";
const load = createRequire(import.meta.url);
load("./module-constructor-helper.cjs");
`,
      "module-constructor-helper.cjs": `module.constructor._load("node:test").test(
  "[critical:${sentinelId}] hidden nested module constructor load",
  () => {},
);
`,
    },
  });
  const nestedResult = await runFixture(nestedHelper);
  assert.notEqual(nestedResult.code, 0);
  assert.match(
    nestedResult.stderr,
    /critical_test_title_inventory_unsupported_node_test_reference/u,
  );
  assert.match(nestedResult.stderr, /module-constructor-helper\.cjs/u);
}

export async function assertLexicalShadowingAndInertSource() {
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
const ordinaryConstructorLength = Function["constructor"].length;
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
function inspectShadowedModule(module) {
  return module.constructor.name;
}
const shadowedModuleConstructorName = inspectShadowedModule(Function);
if (false) {
  void module.constructor.name;
  void module.constructor.length;
}
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
    ordinaryConstructorLength !== undefined ||
    reflectedConstructorName !== "ordinary" ||
    destructuredConstructorName !== "ordinary" ||
    valueOfConstructorName !== "ordinary" ||
    optionalValueOfConstructorName !== "ordinary" ||
    nestedConstructorName !== "ordinary" ||
    computedVerify() !== true ||
    numericComputedVerify() !== true ||
    scopedVarVerify() !== true ||
    assignedConstructorName !== "ordinary" ||
    shadowedModuleConstructorName !== "ordinary" ||
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
}
