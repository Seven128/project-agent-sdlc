# Migrations

Schema migrations for Harness config and managed file layout belong here.

Version 0.6.0 includes `long-task-v1-retirement`. It safely removes the
retired repo-local Hook, reports a legacy active projection as
`manual_required`, and deliberately does not import V1 progress or receipts
into the V2 Claim/Evidence authority.

Version 0.7.2 includes `long-task-v2-semantic-drift-authority`. It reports a
conventional `.long-task/delivery-contract.yaml` as `manual_required` when the
V2 file predates explicit Stage, target-profile/root-runtime, journey-scenario,
success/degradation, evidence-capability or external-impact authority. Those
meanings must be re-authored from Source; migration never infers them from old
Progress or Receipts.

## Admitted-observation/runtime-TCB revision

The next Long-Task compatibility boundary intentionally does not provide a
mechanical Contract rewrite. Machine evidence that depends on a custom Oracle,
a project-submitted runtime/interaction/state/verdict row, a runner-created or
runner-modified carrier, an indirect wrapper, an unsupported target family or
a Counterfactual with no package-admitted actual must be re-authored explicitly.
Migration must never silently:

- replace a custom Oracle with a package Oracle;
- turn machine proof into `external_confirmation`;
- replace a verifier wrapper with a product root entrypoint;
- infer a static structure carrier from `Binding`/`input_paths` alone; or
- preserve a known false-acceptance path as compatibility behavior.

Preflight and doctor should report the narrow failing obligation and an
actionable manual route through diagnostics such as
`machine_observer_not_admitted`,
`semantic_fact_machine_observer_not_admitted`,
`unsupported_observer_requires_external_confirmation`,
`custom_oracle_machine_completion_forbidden`,
`static_observation_not_in_pre_run_snapshot`,
`static_observation_changed_by_runner`,
`process_observer_direct_root_required`,
`process_observer_root_invocation_required`,
`process_observer_root_argv_mismatch`,
`process_observation_input_changed_by_runner`,
`legacy_target_runtime_non_authoritative`,
`counterfactual_admitted_observation_required`,
`counterfactual_runtime_reachability_unproven` and
`project_submitted_verdict_disagrees_with_harness`. The user or Agent must then
choose an admitted static/direct-process observation or the existing blocking
External Confirmation. That semantic choice is `manual_required`, not ordinary
`sync` or a migration-registry inference; release guidance must therefore use
the `manual-required` update mode for affected consumers.

When the whole affected Outcome is unsupported, re-author it explicitly as an
external-only route: set `success_path_required: false`, remove machine Checks,
bind every ordinary/global and Semantic Fact Claim through exact
`impact_claims`, keep every Semantic Fact proof's explicit `confirmation_ref`,
and ensure a `blocks_target: true` confirmation impacts each
Stage Gate result Claim. A non-blocking confirmation or one missing gate-result
lineage cannot replace a Stage Gate, and migration never invents these choices.
The valid route ends as `blocked_external`, not either machine-accepted status.

Changing verifier identity, Compile admission policy or the observation TCB
invalidates the prior Active Authority. The Contract must be recompiled or
adopted through an explicit Authority Revision; old Progress, evidence and
Receipt are not reusable on the new boundary. Public
`long-task-check-result-v3` remains the compatibility payload, but its
project-authored actual/pass/verdict/runtime fields are non-authoritative. The
Harness-owned process adapter captures the separate
`ty-context-product-observation-v1` envelope from bounded stdout inside an
isolated frozen runtime-closure snapshot. It exposes no output-path, challenge
or protocol environment variable to the child; any execution nonce remains
internal host-attestation data. No v4 is introduced by this revision; a future
v4 requires a distinct need to carry a live browser/native session handle
across processes.
