import { execFile } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const exec = promisify(execFile);
const childEnvironment = { ...process.env };
delete childEnvironment.NODE_TEST_CONTEXT;

const caseGroups = [
  {
    name: "[critical:non-ui-semantic-fact-closure] semantic Fact manifest closes every standard identity and rejects omission or aggregation",
    module: "./long-task-semantic-manifest-policy.cases.mjs",
  },
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
];

for (const group of caseGroups)
  test(group.name, async () => {
    await exec(
      process.execPath,
      ["--test", fileURLToPath(new URL(group.module, import.meta.url))],
      {
        env: childEnvironment,
        windowsHide: true,
        maxBuffer: 10 * 1024 * 1024,
      },
    );
  });
