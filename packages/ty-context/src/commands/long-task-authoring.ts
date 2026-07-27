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
task:
  id: replace-me
  title: Replace me
  goal: Describe the complete observable delivery goal.
  target_profile:
    key: replace-target
    description: The declared product target is usable from its root entrypoint.
    required_state: target_profile_usable
    required_target_refs: [replace-runtime]
  execution_targets:
    - key: replace-runtime
      description: The product runtime used by the acceptance oracle.
      role: product
      runtime_family: process
      root_entrypoint: tests/replace-oracle.mjs
  source_paths: [plans/replace-me.md]
  context_refs: [project_context/areas/replace-me.md]
source_claims:
  - key: replace-requirement
    source_ref: plans/replace-me.md#replace-requirement
    statement: Preserve one atomic source requirement.
    disposition:
      type: claim
      refs: [replace-outcome.requirement.replace-requirement]
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
        given_refs: [source-ready]
        when_refs: [inspect-result]
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
    technical:
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
          verification_inputs: ["tests/replace-oracle.mjs", "tests/replace-semantic-failure.ts"]
          input_paths: [src/replace-me.ts]
          expected_output_paths: [src/replace-me.ts]
          positive_assertions:
            - key: replace-result
              criterion: The declared outcome is observable.
              claims: [result]
              applicability_ref: root-success
              observation: result
              evidence_capabilities: [state_delta, target_runtime]
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
            - key: replace-liveness
              criterion: The declared target remains live under semantic mutation.
              claims: []
              observation: target_live
              evidence_capabilities: [target_runtime]
              operator: equals
              expected: true
      counterfactual_controls:
        - key: replace-semantic-carrier
          binding_key: replace-carrier
          claims: [result, requirement.replace-requirement]
          check_key: replace-check
          mutation:
            type: replace_file
            path: src/replace-me.ts
            fixture_path: tests/replace-semantic-failure.ts
          expected_assertion_failures: [replace-result, replace-requirement]
          preserved_assertions: [replace-liveness]
`;
}
