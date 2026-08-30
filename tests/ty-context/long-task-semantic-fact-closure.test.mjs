import { execFile } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const exec = promisify(execFile);
const childEnvironment = { ...process.env };
delete childEnvironment.NODE_TEST_CONTEXT;

const semanticManifestModule = "./long-task-semantic-manifest-policy.cases.mjs";
test("[critical:non-ui-semantic-fact-closure] semantic Fact manifest closes every standard identity and rejects omission or aggregation", async () => {
  await runCaseModule(semanticManifestModule);
});

test("non-UI semantic completeness guidance and custom extensions remain complete", async () => {
  await runCaseModule("./long-task-semantic-guidance.cases.mjs");
});

test("Contract projection preserves exact semantic Fact closure", async () => {
  await runCaseModule("./long-task-semantic-contract.cases.mjs");
});

test("runtime evidence remains attributable per semantic Fact", async () => {
  await runCaseModule("./long-task-semantic-evidence.cases.mjs");
});

test("self-host evidence resolves one independent observation per semantic Fact", async () => {
  await runCaseModule("./long-task-semantic-verifier.cases.mjs");
});

test("complete-delivery closure blocks Source and proof-strength drift", async () => {
  await runCaseModule("./long-task-complete-delivery-closure.cases.mjs");
});

async function runCaseModule(module) {
  await exec(
    process.execPath,
    ["--test", fileURLToPath(new URL(module, import.meta.url))],
    {
      env: childEnvironment,
      windowsHide: true,
      maxBuffer: 10 * 1024 * 1024,
    },
  );
}
