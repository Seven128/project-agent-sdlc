import assert from "node:assert/strict";
import {
  createFixture,
  finalJsonLine,
  passingOwner,
  runFixture,
  sentinelId,
  suite,
} from "./required-critical-sentinel-runner-fixture.mjs";

export async function assertDynamicTitleRejection() {
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
}

export async function assertAliasAndImportedDeclarationResolution() {
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
}

export async function assertModuleInitializationAttribution() {
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
}

export async function assertTestContextAndSuiteClosure() {
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
}
