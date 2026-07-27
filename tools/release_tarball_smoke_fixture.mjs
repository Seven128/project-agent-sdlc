import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

export async function writeReleaseTarballLongTaskFixture(root) {
  const workdir = path.join(root, ".long-task");
  await mkdir(path.join(root, "src"), { recursive: true });
  await mkdir(path.join(root, "tests"), { recursive: true });
  await mkdir(workdir, { recursive: true });
  await writeFile(path.join(root, "src/state.json"), '{"ready":true}\n');
  await writeFile(
    path.join(root, "tests/semantic-false.json"),
    '{"ready":false}\n',
  );
  await writeFile(
    path.join(root, "source.md"),
    `<!-- ty-source-background:start key=tarball-heading reason=markdown-structure -->
# Tarball smoke source
<!-- ty-source-background:end -->

<!-- ty-source-item:start key=packaged-verifier kind=technical_obligation -->
Use the packaged verifier.
<!-- ty-source-item:end -->
`,
  );
  await writeFile(
    path.join(root, "tests/oracle.mjs"),
    `import { readFile } from "node:fs/promises";
let state = { ready: false };
try { state = JSON.parse(await readFile(new URL("../src/state.json", import.meta.url), "utf8")); } catch {}
const target=(assertion_key)=>({assertion_key,capability:"target_runtime",target_ref:"installed-runtime",root_entrypoint:"tests/oracle.mjs",session_id:"tarball-session",cold_start:true});
const delta=(assertion_key)=>({assertion_key,capability:"state_delta",before_sha256:"0".repeat(64),after_sha256:"1".repeat(64),changed_fields:["ready"]});
console.log(JSON.stringify({schema_version:"long-task-check-result-v3",execution_status:"completed",observations:{ready:state.ready,obligation_ready:state.ready,target_live:true},evidence_records:[target("installed-result"),delta("installed-result"),target("installed-obligation"),delta("installed-obligation"),target("installed-liveness")]}));
`,
  );
  await writeFile(
    path.join(workdir, "delivery-contract.yaml"),
    `schema_version: long-task-delivery-v2
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
  source_paths: [source.md]
  context_refs: [project_context/areas/main.md]
source_claims:
  - key: packaged-verifier
    source_ref: source.md
    statement: Use the packaged verifier.
    disposition:
      type: claim
      refs: [installed.obligation.packaged-verifier]
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
        given_refs: [state-ready]
        when_refs: [inspect-installed]
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
    technical:
      obligations:
        - key: packaged-verifier
          statement: Use the packaged verifier.
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
            - key: installed-liveness
              criterion: The installed runtime remains live under semantic mutation.
              claims: []
              observation: target_live
              evidence_capabilities: [target_runtime]
              operator: equals
              expected: true
      counterfactual_controls:
        - key: replace-state-semantics
          binding_key: state
          claims: [result, obligation.packaged-verifier]
          check_key: installed-check
          mutation:
            type: replace_file
            path: src/state.json
            fixture_path: tests/semantic-false.json
          expected_assertion_failures: [installed-result, installed-obligation]
          preserved_assertions: [installed-liveness]
`,
  );
  return workdir;
}
