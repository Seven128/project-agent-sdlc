import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { preflightDeliveryContract } from "../../packages/ty-context/dist/lib/long-task-authoring-preflight.js";
import {
  createDeliveryFixture,
  runCli,
  runCliFailure,
  writeContract,
} from "./long-task-delivery-fixtures.mjs";
import { parseDeliveryContractText } from "../../packages/ty-context/dist/lib/long-task-delivery-parser.js";

const exec = promisify(execFile);
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

test("README public Contract example runs through Preflight, Compile and Final Gate", async () => {
  const fixture = await createDeliveryFixture();
  try {
    const readme = await readFile(path.join(repo, "README.md"), "utf8");
    const yaml = extractPublicExample(readme);
    const contract = parseDeliveryContractText(yaml);
    await mkdir(path.join(fixture.root, "plans"), { recursive: true });
    await writeFile(
      path.join(fixture.root, "plans", "example.md"),
      `<!-- ty-source-background:start key=example-heading reason=markdown-structure -->
# Example

<a id="observable-requirement"></a>
<!-- ty-source-background:end -->

<!-- ty-source-item:start key=observable-requirement kind=requirement -->
The outcome is observable.
<!-- ty-source-item:end -->
`,
    );
    await writeFile(
      path.join(fixture.root, "tests", "observable-false.ts"),
      "export const hidden = false;\n",
    );
    await writeFile(
      path.join(fixture.root, "tests", "runtime.mjs"),
      `import { readFile } from "node:fs/promises";
let result = false;
try { result = (await readFile(new URL("../src/observable.ts", import.meta.url), "utf8")).includes("observable"); } catch {}
const target = (assertion_key) => ({assertion_key,capability:"target_runtime",target_ref:"example-runtime",root_entrypoint:"tests/runtime.mjs",session_id:"example-session",cold_start:true});
const delta = (assertion_key) => ({assertion_key,capability:"state_delta",before_sha256:"0".repeat(64),after_sha256:"1".repeat(64),changed_fields:["result"]});
console.log(JSON.stringify({schema_version:"long-task-check-result-v3",execution_status:"completed",observations:{result,requirement_result:result,target_live:true},evidence_records:[target("result-ac"),delta("result-ac"),target("observable-ac"),delta("observable-ac"),target("runtime-liveness")]}));
`,
    );
    await writeContract(fixture.workdir, contract);
    await git(fixture.root, [
      "add",
      "plans/example.md",
      "tests/runtime.mjs",
      "tests/observable-false.ts",
    ]);
    await git(fixture.root, ["commit", "-m", "public example inputs"]);

    const preflight = await preflightDeliveryContract(
      fixture.workdir,
      fixture.root,
    );
    assert.equal(preflight.status, "ready", JSON.stringify(preflight));
    await runCli(fixture.root, ["enable", "long-task"]);
    await runCli(fixture.root, ["long-task", "compile", fixture.workdir]);
    const missing = await runCliFailure(fixture.root, [
      "long-task",
      "final-gate",
      fixture.workdir,
    ]);
    assert.equal(missing.workflow_status, "needs_work");
    assert.ok(missing.findings.some((item) => item.code === "binding_missing"));

    await writeFile(
      path.join(fixture.root, "src", "observable.ts"),
      "export const observable = true;\n",
    );
    await git(fixture.root, ["add", "src/observable.ts"]);
    await git(fixture.root, ["commit", "-m", "implement public example"]);
    const accepted = await runCli(fixture.root, [
      "long-task",
      "final-gate",
      fixture.workdir,
    ]);
    assert.equal(accepted.workflow_status, "machine_accepted");
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

function extractPublicExample(readme) {
  const match = readme.match(
    /<!-- long-task-public-contract-example:start -->\s*```yaml\s*([\s\S]*?)\s*```\s*<!-- long-task-public-contract-example:end -->/u,
  );
  assert.ok(match, "stable public Contract example markers are required");
  return match[1];
}

async function git(cwd, args) {
  await exec("git", args, { cwd });
}
