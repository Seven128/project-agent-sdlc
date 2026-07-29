import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
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

const exec = promisify(execFile);
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

test("README public Contract example runs through Preflight, Compile and Final Gate", async () => {
  const fixture = await createDeliveryFixture();
  try {
    const readme = await readFile(path.join(repo, "README.md"), "utf8");
    const yaml = extractPublicExample(readme);
    const contract = parseDeliveryContractText(yaml);
    const semanticManifest = publicExampleSemanticManifest();
    contract.semantic_fact_manifest.sha256 =
      semanticManifestIdentity(semanticManifest);
    const semanticAuthority = JSON.stringify({
      manifestSha256: contract.semantic_fact_manifest.sha256,
      fact: semanticManifest.facts[0],
      proof: semanticManifest.proof_obligations[0],
      environment: semanticManifest.environments[0],
      oracle: semanticManifest.oracles[0],
    });
    await mkdir(path.join(fixture.root, "plans"), { recursive: true });
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

\`\`\`yaml semantic-fact-manifest-v1
${YAML.stringify(JSON.parse(JSON.stringify(semanticManifest)), { lineWidth: 0 }).trimEnd()}
\`\`\`
`,
    );
    await writeFile(
      path.join(fixture.root, "tests", "runtime.mjs"),
      `import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
let source = "";
try { source = await readFile(new URL("../src/observable.ts", import.meta.url), "utf8"); } catch {}
const result = source.includes("observable = true");
const relationsApplicable = source.includes("relationsApplicable = true");
const target = (assertion_key) => ({assertion_key,capability:"target_runtime",target_ref:"example-runtime",root_entrypoint:"tests/runtime.mjs",session_id:"example-session",cold_start:true});
const delta = (assertion_key) => ({assertion_key,capability:"state_delta",before_sha256:"0".repeat(64),after_sha256:"1".repeat(64),changed_fields:["result"]});
const claimAssertions = ["result-ac","observable-ac","architecture-ac","relations-na-ac"];
const semantic = ${semanticAuthority};
const artifact = await readFile(new URL("../artifacts/proof.json", import.meta.url));
const artifactSha256 = createHash("sha256").update(artifact).digest("hex");
const actualSha256 = createHash("sha256").update(JSON.stringify(result)).digest("hex");
const canonicalize = (value) => Array.isArray(value) ? value.map(canonicalize) : value && typeof value === "object" ? Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonicalize(value[key])])) : value;
const comparisonResultSha256 = createHash("sha256").update(JSON.stringify(canonicalize({fact_ref:semantic.fact.key,proof_ref:semantic.proof.key,target_ref:"example-runtime",actual_value_sha256:actualSha256,expected_value_sha256:semantic.fact.expected.sha256,comparator:semantic.proof.comparison.comparator,mode:semantic.proof.comparison.mode,parameters_sha256:semantic.proof.comparison.parameters.sha256,tolerance_sha256:semantic.proof.comparison.tolerance?.sha256??null,mask_sha256:semantic.proof.comparison.mask?.sha256??null,passed:result}))).digest("hex");
const semanticRecord = {assertion_key:"semantic-fact-ac",capability:"semantic_fact",manifest_ref:"example-semantic-facts",manifest_sha256:semantic.manifestSha256,outcome_ref:"observable-outcome",target_ref:"example-runtime",fact_ref:semantic.fact.key,proof_ref:semantic.proof.key,method:semantic.proof.method,subject_ref:semantic.fact.unit_ref,condition_ref:semantic.fact.condition_ref,property_ref:semantic.fact.property_ref,actual_observation:{artifact_path:"artifacts/proof.json",artifact_sha256:artifactSha256,locator:{kind:"json_pointer",value:"/observable"},value_sha256:actualSha256,sensitivity:"plain",redaction:null},actual_environment:{artifact_path:"artifacts/proof.json",artifact_sha256:artifactSha256,locator:{kind:"json_pointer",value:"/environment"},value_sha256:semantic.environment.definition.sha256},expected:semantic.fact.expected,comparison:{artifact_path:"artifacts/proof.json",artifact_sha256:artifactSha256,locator:{kind:"json_pointer",value:"/comparison"},result_sha256:comparisonResultSha256,comparator:semantic.proof.comparison.comparator,mode:semantic.proof.comparison.mode,parameters:semantic.proof.comparison.parameters,tolerance:semantic.proof.comparison.tolerance,mask:semantic.proof.comparison.mask,passed:result},verdict:result?"passed":"failed",oracle:semantic.oracle,environment:semantic.environment,observer_results:[]};
console.log(JSON.stringify({schema_version:"long-task-check-result-v3",execution_status:"completed",observations:{result,requirement_result:result,architecture_result:result,semantic_fact_result:result,relations_applicable:relationsApplicable,target_live:true},evidence_records:[...claimAssertions.flatMap((key)=>[target(key),delta(key)]),target("runtime-liveness"),semanticRecord]}));
`,
    );
    await writeContract(fixture.workdir, contract);
    await git(fixture.root, [
      "add",
      "plans/example.md",
      "tests/runtime.mjs",
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
      "export const observable = true;\nexport const relationsApplicable = false;\n",
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
