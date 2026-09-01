import assert from "node:assert/strict";
import {
  createFixture,
  passingOwner,
  runFixture,
  sentinelId,
} from "./required-critical-sentinel-runner-fixture.mjs";

export async function assertStaticLocalLoaderClosure() {
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
}
