import { execFile } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const exec = promisify(execFile);
const childEnvironment = { ...process.env };
delete childEnvironment.NODE_TEST_CONTEXT;

const semanticManifestModule = "./long-task-semantic-manifest-policy.cases.mjs";
const caseGroups = [
  {
    name: "non-UI semantic completeness guidance and custom extensions remain complete",
    module: "./long-task-semantic-guidance.cases.mjs",
  },
  {
    name: "Contract projection preserves exact semantic Fact closure",
    module: "./long-task-semantic-contract.cases.mjs",
  },
  {
    name: "runtime evidence remains attributable per semantic Fact",
    module: "./long-task-semantic-evidence.cases.mjs",
  },
  {
    name: "self-host evidence resolves one independent observation per semantic Fact",
    module: "./long-task-semantic-verifier.cases.mjs",
  },
  {
    name: "complete-delivery closure blocks Source and proof-strength drift",
    module: "./long-task-complete-delivery-closure.cases.mjs",
  },
];

test("[critical:non-ui-semantic-fact-closure] semantic Fact manifest closes every standard identity and rejects omission or aggregation", async () => {
  await runCaseModule(semanticManifestModule);
});

for (const group of caseGroups)
  test(group.name, async () => {
    await runCaseModule(group.module);
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
