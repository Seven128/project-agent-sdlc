import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { preflightDeliveryContract } from "../lib/long-task-authoring-preflight.js";

export async function initializeLongTask(workdir: string): Promise<void> {
  await mkdir(workdir, { recursive: true });
  try {
    await writeFile(path.join(workdir, "delivery-contract.yaml"), template(), {
      flag: "wx",
    });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
  }
}

export async function preflightLongTask(workdir: string): Promise<void> {
  const result = await preflightDeliveryContract(workdir, process.cwd());
  console.log(JSON.stringify(result, null, 2));
  if (result.status !== "ready") process.exitCode = 1;
}

export function compactLongTaskTemplate(): string {
  return template();
}

function template(): string {
  return `schema_version: long-task-delivery-v2
semantic_fact_manifest: {key: replace-semantic-facts, source_path: plans/replace-me.md, sha256: "1111111111111111111111111111111111111111111111111111111111111111"}
task:
  id: replace-me
  title: Replace me
  goal: Describe the complete observable delivery goal.
  target_profile:
    key: replace-target
    description: The declared product target is usable from its root entrypoint.
    required_state: target_profile_usable
    required_target_refs: [replace-runtime]
    completion_authority: machine_only
  execution_targets:
    - key: replace-runtime
      description: The product runtime used by the acceptance oracle.
      role: product
      runtime_family: process
      root_entrypoint: tests/replace-oracle.mjs
      capabilities: [process-runtime, cold-start, production-root]
  source_paths: [plans/replace-me.md]
  context_refs: [project_context/areas/replace-me.md]
  context_snapshot_mode: full
source_claims:
  - key: replace-requirement
    source_ref: plans/replace-me.md#replace-requirement
    statement: Preserve one atomic source requirement.
    disposition:
      type: claim
      refs: [replace-outcome.requirement.replace-requirement]
  - key: replace-architecture
    source_ref: plans/replace-me.md#replace-architecture
    statement: Preserve the declared owner, dependency direction, verifier boundary and architecture conformance.
    disposition:
      type: claim
      refs: [replace-outcome.obligation.architecture]
stages:
  - key: delivery
    title: Delivery
    depends_on: []
    gate_outcome: replace-outcome
risk:
  facts: {}
global:
  applicability: []
outcomes:
  - key: replace-outcome
    title: Replace outcome
    stage: delivery
    applicability:
      - key: root-success
        target_ref: replace-runtime
        journey_role: success
        dimensions: [{key: delivery-state, value: ready}]
        given_refs: [source-ready]
        when_refs: [inspect-result]
    semantic_fact_bindings:
      manifest_ref: replace-semantic-facts
      facts:
        - fact_ref: replace.result.observable
          claim_ref: semantic_fact.replace.result.observable
          applicability_ref: root-success
        - {fact_ref: replace.architecture.boundary, claim_ref: semantic_fact.replace.architecture.boundary, applicability_ref: root-success}
      proofs:
        - proof_ref: replace.result.observable.runtime
          fact_ref: replace.result.observable
          method: exact_value
          proof_surface: runtime_behavior
          evidence_capabilities: [semantic_fact]
          authority: machine
          check_ref: replace-check
          assertion_ref: replace-semantic-fact
        - proof_ref: replace.architecture.boundary.runtime
          fact_ref: replace.architecture.boundary
          method: exact_value
          proof_surface: runtime_behavior
          evidence_capabilities: [semantic_fact]
          authority: machine
          check_ref: replace-check
          assertion_ref: replace-architecture-semantic-fact
    product:
      observable_result: Describe what a user or system can observe.
      result_applicability_refs: [root-success]
      success_path_required: true
      degradation_path_required: false
      owner:
        label: replace-owner
        context_refs: [project_context/areas/replace-me.md]
        path_globs: ["src/**", "tests/**"]
      requirements:
        - key: replace-requirement
          statement: Preserve one atomic source requirement.
          required_proof_surfaces: [runtime_behavior]
          applicability_refs: [root-success]
      control_relation_closure:
        state: not_applicable
        statement: This Outcome declares no user-visible Controls.
        applicability_refs: [root-success]
    technical:
      obligations:
        - key: architecture
          statement: Preserve the declared owner, dependency direction, verifier boundary and architecture conformance.
          required_proof_surfaces: [runtime_behavior]
          applicability_refs: [root-success]
      expected_change_paths: ["src/**"]
      bindings:
        - key: replace-carrier
          kind: file
          target: src/replace-me.ts
          carrier_paths: [src/replace-me.ts]
          existence: planned
    acceptance:
      checks:
        - key: replace-check
          journey_roles: [success, stage_gate]
          execution_target: {target_ref: replace-runtime, entrypoint: root}
          scenario:
            given: [{key: source-ready, statement: The planned source carrier is available.}]
            when: [{key: inspect-result, statement: Inspect the product result through the declared runtime.}]
          proof_surface: runtime_behavior
          runner:
            type: node_oracle
            target: tests/replace-oracle.mjs
            effect: read_only
          verification_inputs: ["tests/replace-oracle.mjs"]
          input_paths: [src/replace-me.ts]
          expected_output_paths: [src/replace-me.ts]
          artifact_globs: [artifacts/replace-semantic-fact.json]
          positive_assertions:
            - key: replace-result
              criterion: The declared outcome is observable.
              claims: [result]
              applicability_ref: root-success
              observation: result
              evidence_capabilities: [state_delta, target_runtime]
              operator: equals
              expected: true
            - key: replace-semantic-fact
              criterion: The exact Source-indexed semantic Fact passes its frozen comparison on the current target.
              claims: [semantic_fact.replace.result.observable]
              applicability_ref: root-success
              observation: semantic_fact_replace_result_observable
              evidence_capabilities: [semantic_fact]
              operator: equals
              expected: true
            - key: replace-architecture-semantic-fact
              criterion: The exact Source-indexed architecture Fact passes its frozen comparison on the current target.
              claims: [semantic_fact.replace.architecture.boundary]
              applicability_ref: root-success
              observation: semantic_fact_replace_architecture_boundary
              evidence_capabilities: [semantic_fact]
              operator: equals
              expected: true
            - key: replace-requirement
              criterion: The atomic Source requirement is observable.
              claims: [requirement.replace-requirement]
              applicability_ref: root-success
              observation: requirement_result
              evidence_capabilities: [state_delta, target_runtime]
              operator: equals
              expected: true
            - key: replace-architecture
              criterion: The declared architecture obligation remains conformant.
              claims: [obligation.architecture]
              applicability_ref: root-success
              observation: architecture_result
              evidence_capabilities: [state_delta, target_runtime]
              operator: equals
              expected: true
            - key: replace-liveness
              criterion: The declared target remains live under semantic mutation.
              claims: []
              observation: target_live
              evidence_capabilities: [target_runtime]
              operator: equals
              expected: true
          negative_assertions:
            - key: replace-relations-na
              criterion: Cross-Control relations remain inapplicable when no Controls are declared.
              claims: [control_relation_closure]
              applicability_ref: root-success
              observation: relations_applicable
              evidence_capabilities: [state_delta, target_runtime]
              operator: equals
              expected: false
      counterfactual_controls:
        - key: replace-semantic-carrier
          binding_key: replace-carrier
          claims: [result, requirement.replace-requirement, obligation.architecture, semantic_fact.replace.result.observable, semantic_fact.replace.architecture.boundary]
          check_key: replace-check
          mutation:
            type: replace_text
            path: src/replace-me.ts
            match: IMPLEMENTED_STATE
            replacement: SEMANTIC_FAILURE_STATE
          expected_assertion_failures: [replace-result, replace-requirement, replace-architecture, replace-semantic-fact, replace-architecture-semantic-fact]
          preserved_assertions: [replace-liveness]
        - key: replace-relation-applicability
          binding_key: replace-carrier
          claims: [control_relation_closure]
          check_key: replace-check
          mutation:
            type: replace_text
            path: src/replace-me.ts
            match: NO_CROSS_CONTROL_RELATIONS
            replacement: CROSS_CONTROL_RELATIONS_APPLY
          expected_assertion_failures: [replace-relations-na]
          preserved_assertions: [replace-liveness]
`;
}
