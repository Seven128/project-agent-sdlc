import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import YAML from "yaml";
import {
  releaseTarballSemanticManifest,
  refreshFixtureSemanticManifest,
  semanticManifestIdentity,
} from "../tests/ty-context/long-task-delivery-fixtures.mjs";

export async function writeReleaseTarballLongTaskFixture(root) {
  const semanticManifest = releaseTarballSemanticManifest();
  const verificationContextRef =
    "project_context/areas/main/verification.md";
  const verificationContext = await readFile(
    path.join(root, ...verificationContextRef.split("/")),
  );
  semanticManifest.inputs.push({
    key: "input.context-main-verification",
    kind: "context",
    source_ref: verificationContextRef,
    sha256: createHash("sha256")
      .update(verificationContext)
      .digest("hex"),
    disposition: "non_ui_material",
    fact_refs: semanticManifest.facts.map((fact) => fact.key),
    basis_refs: ["packaged-architecture"],
    rationale:
      "The package-generated verification Context is classified in the full Context snapshot.",
  });
  for (const fact of semanticManifest.facts)
    if (
      !fact.provenance.basis_refs.includes(
        "input.context-main-verification",
      )
    )
      fact.provenance.basis_refs.push("input.context-main-verification");
  for (const input of semanticManifest.inputs.filter(
    (candidate) => candidate.kind === "context",
  ))
    input.sha256 = createHash("sha256")
      .update(
        await readFile(path.join(root, ...input.source_ref.split("/"))),
      )
      .digest("hex");
  refreshFixtureSemanticManifest(semanticManifest);
  const semanticManifestSha256 = semanticManifestIdentity(semanticManifest);
  const semanticAuthority = JSON.stringify({
    manifestSha256: semanticManifestSha256,
    fact: semanticManifest.facts[0],
    proof: semanticManifest.proof_obligations[0],
    environment: semanticManifest.environments[0],
    oracle: semanticManifest.oracles[0],
  });
  const workdir = path.join(root, ".long-task");
  await mkdir(path.join(root, "src"), { recursive: true });
  await mkdir(path.join(root, "tests"), { recursive: true });
  await mkdir(workdir, { recursive: true });
  await writeFile(
    path.join(root, "src/state.json"),
    '{"ready":true,"relations_applicable":false}\n',
  );
  await writeFile(
    path.join(root, "tests/semantic-false.json"),
    '{"ready":false}\n',
  );
  await writeFile(
    path.join(root, "source.md"),
    `<!-- ty-source-background:start key=tarball-heading reason=markdown-structure -->
<a id="tarball-smoke-source"></a>
<!-- ty-source-background:end -->

<!-- ty-source-item:start key=packaged-verifier kind=technical_obligation -->
Use the packaged verifier.
<!-- ty-source-item:end -->

<!-- ty-source-item:start key=packaged-architecture kind=technical_obligation aspect=architecture -->
Preserve the packaged state owner and verifier boundary.
<!-- ty-source-item:end -->

\`\`\`yaml semantic-fact-manifest-v1
${YAML.stringify(JSON.parse(JSON.stringify(semanticManifest)), { lineWidth: 0 }).trimEnd()}
\`\`\`
`,
  );
  await writeFile(
    path.join(root, "tests/oracle.mjs"),
    `import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
let state = { ready: false, relations_applicable: false };
try { state = JSON.parse(await readFile(new URL("../src/state.json", import.meta.url), "utf8")); } catch {}
const target=(assertion_key)=>({assertion_key,capability:"target_runtime",target_ref:"installed-runtime",root_entrypoint:"tests/oracle.mjs",session_id:"tarball-session",cold_start:true});
const delta=(assertion_key)=>({assertion_key,capability:"state_delta",before_sha256:"0".repeat(64),after_sha256:"1".repeat(64),changed_fields:["ready"]});
const claimAssertions=["installed-result","installed-obligation","installed-architecture","installed-relations-na"];
const semantic=${semanticAuthority};
const artifact=await readFile(new URL("../src/state.json",import.meta.url));
const artifactSha256=createHash("sha256").update(artifact).digest("hex");
const actualSha256=createHash("sha256").update(JSON.stringify(state.ready===true)).digest("hex");
const canonicalize=(value)=>Array.isArray(value)?value.map(canonicalize):value&&typeof value==="object"?Object.fromEntries(Object.keys(value).sort().map((key)=>[key,canonicalize(value[key])])):value;
const comparisonPassed=state.ready===true;
const comparisonResultSha256=createHash("sha256").update(JSON.stringify(canonicalize({fact_ref:semantic.fact.key,proof_ref:semantic.proof.key,target_ref:"installed-runtime",actual_value_sha256:actualSha256,expected_value_sha256:semantic.fact.expected.sha256,comparator:semantic.proof.comparison.comparator,mode:semantic.proof.comparison.mode,parameters_sha256:semantic.proof.comparison.parameters.sha256,tolerance_sha256:semantic.proof.comparison.tolerance?.sha256??null,mask_sha256:semantic.proof.comparison.mask?.sha256??null,passed:comparisonPassed}))).digest("hex");
const semanticRecord={assertion_key:"installed-semantic-fact",capability:"semantic_fact",manifest_ref:"tarball-semantic-facts",manifest_sha256:semantic.manifestSha256,outcome_ref:"installed",target_ref:"installed-runtime",fact_ref:semantic.fact.key,proof_ref:semantic.proof.key,method:semantic.proof.method,subject_ref:semantic.fact.unit_ref,condition_ref:semantic.fact.condition_ref,property_ref:semantic.fact.property_ref,actual_observation:{artifact_path:"src/state.json",artifact_sha256:artifactSha256,locator:{kind:"json_pointer",value:"/ready"},value_sha256:actualSha256,sensitivity:"plain",redaction:null},actual_environment:{artifact_path:"src/state.json",artifact_sha256:artifactSha256,locator:{kind:"json_pointer",value:"/environment"},value_sha256:semantic.environment.definition.sha256},expected:semantic.fact.expected,comparison:{artifact_path:"src/state.json",artifact_sha256:artifactSha256,locator:{kind:"json_pointer",value:"/comparison"},result_sha256:comparisonResultSha256,comparator:semantic.proof.comparison.comparator,mode:semantic.proof.comparison.mode,parameters:semantic.proof.comparison.parameters,tolerance:semantic.proof.comparison.tolerance,mask:semantic.proof.comparison.mask,passed:comparisonPassed},verdict:comparisonPassed?"passed":"failed",oracle:semantic.oracle,environment:semantic.environment,observer_results:[]};
console.log(JSON.stringify({schema_version:"long-task-check-result-v3",execution_status:"completed",observations:{ready:state.ready,obligation_ready:state.ready,architecture_ready:state.ready,semantic_fact_result:state.ready,relations_applicable:state.relations_applicable,target_live:true},evidence_records:[...claimAssertions.flatMap((key)=>[target(key),delta(key)]),target("installed-liveness"),semanticRecord]}));
`,
  );
  await writeFile(
    path.join(workdir, "delivery-contract.yaml"),
    `schema_version: long-task-delivery-v2
semantic_fact_manifest: {key: tarball-semantic-facts, source_path: source.md, sha256: "${semanticManifestSha256}"}
task:
  id: tarball-smoke
  title: Tarball smoke
  goal: Prove the installed long-task workflow.
  target_profile:
    key: installed-target
    description: The installed workflow is usable through its declared runtime.
    required_state: target_profile_usable
    required_target_refs: [installed-runtime]
  execution_targets:
    - key: installed-runtime
      description: Installed fixture runtime
      role: product
      runtime_family: process
      root_entrypoint: tests/oracle.mjs
      capabilities: [process-runtime, cold-start, production-root]
  source_paths: [source.md]
  context_refs: [project_context/areas/main.md]
  context_snapshot_mode: full
source_claims:
  - key: packaged-verifier
    source_ref: source.md
    statement: Use the packaged verifier.
    disposition:
      type: claim
      refs: [installed.obligation.packaged-verifier]
  - key: packaged-architecture
    source_ref: source.md
    statement: Preserve the packaged state owner and verifier boundary.
    disposition:
      type: claim
      refs: [installed.obligation.architecture]
stages:
  - key: delivery
    title: Delivery
    depends_on: []
    gate_outcome: installed
risk:
  facts: {}
global: {}
outcomes:
  - key: installed
    title: Installed workflow runs
    stage: delivery
    applicability:
      - key: installed-root-success
        target_ref: installed-runtime
        journey_role: success
        dimensions: [{key: installed-state, value: ready}]
        given_refs: [state-ready]
        when_refs: [inspect-installed]
    semantic_fact_bindings:
      manifest_ref: tarball-semantic-facts
      facts:
        - fact_ref: installed.result.observable
          claim_ref: semantic_fact.installed.result.observable
          applicability_ref: installed-root-success
      proofs:
        - proof_ref: installed.result.observable.runtime
          fact_ref: installed.result.observable
          method: exact_value
          proof_surface: runtime_behavior
          evidence_capabilities: [semantic_fact]
          authority: machine
          check_ref: installed-check
          assertion_ref: installed-semantic-fact
    product:
      observable_result: Installed CLI verifies current behavior.
      result_applicability_refs: [installed-root-success]
      success_path_required: true
      degradation_path_required: false
      owner:
        label: fixture
        context_refs: [project_context/areas/main.md]
        path_globs: [src/**]
      control_relation_closure:
        state: not_applicable
        statement: This Outcome declares no user-visible Controls.
        applicability_refs: [installed-root-success]
    technical:
      obligations:
        - key: packaged-verifier
          statement: Use the packaged verifier.
          required_proof_surfaces: [runtime_behavior]
          applicability_refs: [installed-root-success]
        - key: architecture
          statement: Preserve the packaged state owner and verifier boundary.
          required_proof_surfaces: [runtime_behavior]
          applicability_refs: [installed-root-success]
      expected_change_paths: [src/**]
      bindings:
        - key: state
          kind: file
          target: src/state.json
          carrier_paths: [src/state.json]
          existence: existing
    acceptance:
      checks:
        - key: installed-check
          journey_roles: [success, stage_gate]
          execution_target: {target_ref: installed-runtime, entrypoint: root}
          scenario:
            given: [{key: state-ready, statement: The fixture state exists.}]
            when: [{key: inspect-installed, statement: Inspect it with the installed verifier.}]
          proof_surface: runtime_behavior
          runner:
            type: node_oracle
            target: tests/oracle.mjs
            effect: read_only
          verification_inputs: [tests/oracle.mjs, tests/semantic-false.json]
          input_paths: [src/state.json]
          artifact_globs: [src/state.json]
          positive_assertions:
            - key: installed-result
              criterion: The installed packaged verifier reports the fixture ready.
              claims: [result]
              applicability_ref: installed-root-success
              observation: ready
              evidence_capabilities: [state_delta, target_runtime]
              operator: equals
              expected: true
            - key: installed-obligation
              criterion: The packaged verifier obligation is satisfied.
              claims: [obligation.packaged-verifier]
              applicability_ref: installed-root-success
              observation: obligation_ready
              evidence_capabilities: [state_delta, target_runtime]
              operator: equals
              expected: true
            - key: installed-semantic-fact
              criterion: The exact installed semantic Fact passes its frozen comparison.
              claims: [semantic_fact.installed.result.observable]
              applicability_ref: installed-root-success
              observation: semantic_fact_result
              evidence_capabilities: [semantic_fact]
              operator: equals
              expected: true
            - key: installed-architecture
              criterion: The packaged state owner and verifier boundary remain conformant.
              claims: [obligation.architecture]
              applicability_ref: installed-root-success
              observation: architecture_ready
              evidence_capabilities: [state_delta, target_runtime]
              operator: equals
              expected: true
            - key: installed-liveness
              criterion: The installed runtime remains live under semantic mutation.
              claims: []
              observation: target_live
              evidence_capabilities: [target_runtime]
              operator: equals
              expected: true
          negative_assertions:
            - key: installed-relations-na
              criterion: Cross-Control relations remain inapplicable when no Controls are declared.
              claims: [control_relation_closure]
              applicability_ref: installed-root-success
              observation: relations_applicable
              evidence_capabilities: [state_delta, target_runtime]
              operator: equals
              expected: false
      counterfactual_controls:
        - key: replace-state-semantics
          binding_key: state
          claims: [result, obligation.packaged-verifier, obligation.architecture, semantic_fact.installed.result.observable]
          check_key: installed-check
          mutation:
            type: replace_json_value
            path: src/state.json
            pointer: /ready
            value: false
          expected_assertion_failures: [installed-result, installed-obligation, installed-architecture, installed-semantic-fact]
          preserved_assertions: [installed-liveness]
        - key: make-relations-applicable
          binding_key: state
          claims: [control_relation_closure]
          check_key: installed-check
          mutation:
            type: replace_json_value
            path: src/state.json
            pointer: /relations_applicable
            value: true
          expected_assertion_failures: [installed-relations-na]
          preserved_assertions: [installed-liveness]
`,
  );
  return workdir;
}
