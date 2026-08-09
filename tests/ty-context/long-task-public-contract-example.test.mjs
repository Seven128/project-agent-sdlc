import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import {
  chmod,
  copyFile,
  mkdir,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import YAML from "yaml";
import { preflightDeliveryContract } from "../../packages/ty-context/dist/lib/long-task-authoring-preflight.js";
import {
  createDeliveryFixture,
  publicExampleSemanticManifest,
  runCli,
  runCliFailure,
  semanticManifestIdentity,
  writeContract,
} from "./long-task-delivery-fixtures.mjs";
import { parseDeliveryContractText } from "../../packages/ty-context/dist/lib/long-task-delivery-parser.js";
import { executionTargetSourceStatement } from "../../packages/ty-context/dist/lib/long-task-source-target-index.js";
import { admitPackageExactFixtureSemanticManifest } from "./long-task-package-machine-fixture.mjs";

const exec = promisify(execFile);
const repo = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);

test("README public Contract example runs through Preflight, Compile and Final Gate", async () => {
  const fixture = await createDeliveryFixture();
  try {
    const readme = await readFile(path.join(repo, "README.md"), "utf8");
    const yaml = extractPublicExample(readme);
    const contract = parseDeliveryContractText(yaml);
    const [executionTarget] = contract.task.execution_targets;
    const semanticManifest = admitPackageExactFixtureSemanticManifest(
      publicExampleSemanticManifest(executionTarget),
    );
    contract.semantic_fact_manifest.sha256 =
      semanticManifestIdentity(semanticManifest);
    await mkdir(path.join(fixture.root, "plans"), { recursive: true });
    await mkdir(path.join(fixture.root, "bin"), { recursive: true });
    const runtimeRoot = path.join(fixture.root, "bin", "example-runtime.exe");
    await copyFile(process.execPath, runtimeRoot);
    if (process.platform !== "win32") await chmod(runtimeRoot, 0o755);
    await writeFile(
      path.join(fixture.root, "plans", "example.md"),
      `<!-- ty-source-background:start key=example-heading reason=markdown-structure -->
<a id="observable-requirement"></a>
<!-- ty-source-background:end -->

<!-- ty-source-item:start key=observable-requirement kind=requirement -->
The outcome is observable.
<!-- ty-source-item:end -->

<!-- ty-source-background:start key=architecture-anchor reason=markdown-structure -->
<a id="architecture-owner"></a>
<!-- ty-source-background:end -->

<!-- ty-source-item:start key=architecture-owner kind=technical_obligation aspect=architecture -->
Preserve the observable module as the single state owner.
<!-- ty-source-item:end -->

<!-- ty-source-background:start key=example-runtime-heading reason=markdown-structure -->
<a id="example-runtime-target"></a>
<!-- ty-source-background:end -->

<!-- ty-source-item:start key=example-execution-target kind=technical_obligation -->
${executionTargetSourceStatement(executionTarget)}
<!-- ty-source-item:end -->

\`\`\`yaml semantic-fact-manifest-v1
${YAML.stringify(JSON.parse(JSON.stringify(semanticManifest)), { lineWidth: 0 }).trimEnd()}
\`\`\`
`,
    );
    await writeFile(
      path.join(fixture.root, "tests", "runtime.mjs"),
      `import { readFile } from "node:fs/promises";
let source = "";
try { source = await readFile(new URL("../src/observable.ts", import.meta.url), "utf8"); } catch {}
const result = source.includes("observable = true") && source.includes("enabled = true");
const relationsApplicable = source.includes("relationsApplicable = true");
const assertion = (key) => "assertion.observable-outcome.runtime." + key;
console.log(JSON.stringify({
  schema_version: "ty-context-product-observation-v1",
  observations: {
    "example.result.observable": result,
    [assertion("result-ac")]: result,
    [assertion("observable-ac")]: result,
    [assertion("architecture-ac")]: result,
    [assertion("runtime-liveness")]: true,
    [assertion("relations-na-ac")]: relationsApplicable
  }
}));
`,
    );
    await writeFile(
      path.join(fixture.root, "tests", "verify-runtime.mjs"),
      'export const verifierBoundary = "package-observation";\n',
    );
    await writeFile(
      path.join(fixture.root, "src", "observable.ts"),
      "export const observable = true;\nexport const enabled = false;\nexport const relationsApplicable = false;\n",
    );
    await writeContract(fixture.workdir, contract);
    await git(fixture.root, [
      "add",
      "plans/example.md",
      "bin/example-runtime.exe",
      "src/observable.ts",
      "tests/runtime.mjs",
      "tests/verify-runtime.mjs",
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
    assert.equal(missing.outcome_results["observable-outcome"], "failed");

    await writeFile(
      path.join(fixture.root, "src", "observable.ts"),
      "export const observable = true;\nexport const enabled = true;\nexport const relationsApplicable = false;\n",
    );
    await git(fixture.root, ["add", "src/observable.ts"]);
    await git(fixture.root, ["commit", "-m", "implement public example"]);
    const accepted = await runCli(fixture.root, [
      "long-task",
      "final-gate",
      fixture.workdir,
    ]);
    assert.equal(
      accepted.workflow_status,
      "machine_accepted",
      JSON.stringify(accepted.findings),
    );
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
