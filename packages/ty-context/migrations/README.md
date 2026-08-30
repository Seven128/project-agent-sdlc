# Migrations

Schema migrations for Harness config and managed file layout belong here.

The completed 0.10.x line adds opt-in, dry-run-first `context register`, `context move` and
`context transaction status|rollback|complete`. Current writes use
`context-mutation-journal-v3`, whose immutable generations bind each NFC logical
key to its exact physical path while retaining complete mode/file-identity
endpoint snapshots and the shared Active Authority lock.
`context-mutation-journal-v2` remains recovery-readable with equal logical and
physical paths. An unfinished pre-v2 journal is deliberately not guessed or
rewritten: use the matching older package to recover it, inspect/restore the
recorded bytes manually, or obtain project-owner recovery direction before a new
mutation. They do not migrate existing
projects or reinterpret legacy policies. Register losslessly appends one
recoverable Context node. Move preserves one registered Context/Area owner,
structured default-child references and explicit local Context-Markdown links;
unstructured exact references or an incomplete bounded scan block apply. Both
use current-byte/mode/file-identity endpoint comparison, candidate-tree
validation and one logical recoverable journal published as immutable
digest-linked generations. Recovery and Long-Task Authority changes serialize
through the existing Active Authority lock. There is no automatic policy
conversion, force bypass, hidden TOML normalization, hostile-writer mutex or
claim of cross-file physical atomicity.

Version 0.10.1 adds `ty-context context create --path <path> --role <role>`.
It writes one TODO-only, unregistered Markdown scaffold and does not modify
`project_context/context.toml` or the default footprint. Existing files,
registered paths, unsafe/link-traversing paths and concurrently appearing
destinations are refused rather than overwritten. Replace every TODO with
durable owner facts before a separate registration step; the unchanged
scaffold intentionally does not satisfy registered-Context recoverability.
This is a new opt-in command and requires no consumer migration.

Version 0.11.0 adds an opt-in sparse Design Authority bundle. Existing projects
with only an unmarked root `DESIGN.md` remain valid one-file closures and are
not rewritten. Adoption inserts the exact
`<!-- ty-context-design-authority-format: bundle-v1 -->` declaration as the
first non-empty Markdown body line after supported YAML front matter and creates
`design_system/authority.manifest.json` in the same explicit DSA/Authority
Revision. Generated `design_system/tokens.json` and subordinate owners remain
explicit adoption outputs, not upgrade migration. Marker and manifest are a
strict pair: either half missing, renamed, empty or invalid fails closure. DRA
recovery/handoff and Long-Task bindings use the complete entry plus closure
digest; a raw-file-only legacy binding fails closed and must be regenerated or
rebound. A deliberate return to one-file Authority removes both halves only
through explicit DSA adoption/Authority Revision. Static inspection can enforce
the current pair and stale bindings, but a fresh checkout containing neither
half has no authenticated historical adoption registry. Upgrade never infers
Token values, owner splits, candidate selection, adoption or a human revision.

Version 0.10.0 includes `context-units-to-context`. Explicit `upgrade` applies
only when every retired `[[context_units]]` table is a provably simple
single-line TOML table. It renames the table and removes only retired `id` and
`area` fields while preserving all untouched bytes and the existing EOL.
Complex/mixed-EOL input, unknown legacy fields and current/legacy path
conflicts are `manual_required`; ordinary `sync` never runs this migration.

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

## Version 0.9.0 complete-delivery authority

Version 0.9.0 retains the `long-task-delivery-v2` Contract marker. A Contract
that omits `task.target_profile.completion_authority` is parsed as
`machine_only`, preserving the older fail-safe machine-only meaning, and
Preflight emits the actionable
`completion_authority_legacy_default_machine_only` warning. New authoring
should state either `machine_only` or `declared_authorities` explicitly.

Material Source compilation now derives fragment and anchor projections below
the Source-item level. Every `supporting_basis` fragment/anchor projection must
name at least one known delivery-semantic Fact; an empty or integrity-only Fact
set is rejected. Legacy single-fragment Source-item projections that already
carry delivery Fact refs remain readable through deterministic projection, but
new authoring should classify every multi-fragment row explicitly. Superseding
Source must carry the same-domain replacement meaning in a delivery-semantic
Fact; migration does not invent that Fact or infer precedence.

Changing to `declared_authorities` is a semantic owner decision, not a
mechanical migration. Re-author every blocking external route from Source with
its declared actor/owner, target, environment, keyed Given/When scenario,
evidence requirements and exact per-obligation Claim/applicability/Fact/proof/
method/capability/Expected-authority decomposition. Migration must not infer an
actor, authenticate a real-world identity, weaken Expected, collapse rows into
an aggregate Boolean, or silently convert unsupported machine proof to an
external judgment.

New Final Gates emit `long-task-final-receipt-v3` with one of
`machine_accepted`, `delivery_accepted`, `blocked_external` or `needs_work`.
Version 2 Receipts remain readable for audit only. They are not current
acceptance evidence, cannot be upgraded by appending an External Confirmation
record and must be followed by a current Compile and complete Final Gate.
Legacy `machine_accepted_external_pending` remains compatibility-read-only and
cannot clear Active Authority or close. Only fresh `machine_accepted` and
`delivery_accepted` may close.

External fulfillment uses the strict
`long-task-external-confirmation-record-v1` input and the `external prepare`,
`submit`, `status` and `revoke` commands. Record hashes prove local integrity,
not signatures or actor authentication. Relevant-input changes invalidate only
when independence is soundly derivable; otherwise the whole record becomes
stale. These rules make the release `manual-required` for affected active
Long-Task consumers. No generic Browser, Native or Device observer SDK is part
of this migration.

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
- infer a process runtime dependency from `input_paths`, runner or verification membership;
- invent a Source-backed execution target or production Binding for an old root; or
- preserve a known false-acceptance path as compatibility behavior.

Greenfield authoring may declare an exact process root, argv repository file
or production carrier as `planned`. Its exact Source/Binding declaration is
stable through Preflight/Compile and later materialization, but Final Gate
requires every compiled closure member to exist. A glob, a manifest sibling or
an undeclared repository-file argv token cannot substitute; migration does not
invent these exact declarations or parse language dependencies.

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
`process_runtime_input_expected_authority_forbidden`,
`process_runtime_input_verification_role_forbidden`,
`process_runtime_input_evidence_role_forbidden`,
`process_root_source_binding_required`,
`process_root_production_binding_required`,
`process_root_source_identity_mismatch`,
`process_runtime_carrier_exact_path_required`,
`process_runtime_input_missing`,
`process_runtime_closure_identity_mismatch`,
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
