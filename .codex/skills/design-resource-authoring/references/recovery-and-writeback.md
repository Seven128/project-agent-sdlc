# DRA Semantic Replay, Recovery And Proposal Writeback

Load this reference only for a material generation/revision loop which needs complete semantic replay, a selected-Proposal writeback, current bidirectional audit or real recovery across interruption. It strengthens upstream Source quality and does not become Design Authority, implementation acceptance or Long-Task proof.

## Simple path and admission

A simple scoped preview creates zero recovery files and persisted recovery bytes, adds no user pause or Provider generation beyond the one requested commission, runs no formal handoff/preflight, performs no Proposal writeback and opens no helper write transaction. Its ordinary requested preview is the commission itself; recovery adds and reports zero tool actions. Keep its temporary reasoning in the current turn.

Ordinary conversational review and selection remains legal outside this deterministic path. It creates no approval record or persistent selection state and must be reconfirmed if lost before authorized materialization. Deterministic cross-interruption selection uses only the existing raw-digest-bound marked Source, `ty-dra-authority-v1`, selected-resource binding and conditional checkpoint below; do not invent `review_set_id`, approval status or another checkpoint kind.

Without the complete bindings below, an ordinary loop may report only conservative impact analysis from readable Source, identify unverified scope and regenerate conservatively within the hard ceiling or return `decision-required`. It cannot claim that only identified resources are affected. When this recoverable path has a complete current catalog, change and preservation claims remain bounded to its exact Requirements-to-Resource, Resource-to-Requirements, explicitly unchanged, blast-radius and inactive-leakage universes.

Use a recovery checkpoint only when interruption would otherwise lose material accepted/rejected/unresolved semantics, immutable Provider identity or a pending CAS writeback. It is versioned, ignored, task-local, non-authoritative and deletable. It is not Source, Context, a Contract, Authority, Evidence, Receipt, Gate, Provider registry, scheduler, acceptance state or completion conclusion. There is no global session registry, event log, heartbeat, polling loop or state-machine service.

For deterministic classification, apply four fail-closed invariants before details: validate every semantic key independently; retain every valid accepted/rejected/unresolved decision and its authority row even when a later patch, audit or owner fails; reject deterministic checkpoint input whose claimed Source authority is invalid; and report a requested or pending unsafe reconciliation/writeback as blocked rather than as no action. Provider/resource selection never fills a missing authority row, and one key's authority never covers another key.

## Base and replayable Delta

Freeze one current Base with:

```yaml
locator: repository/relative/file
raw_byte_digest: sha256
encoding: detected-by-helper
eol_policy: detected-by-helper
scope_ceiling: bounded-scope-key
in_scope_keys: []
explicitly_excluded_keys: []
```

The Base must be repository-readable and raw-digest verifiable: ordinary project Source, a materialized project-native Proposal, or an explicitly authorized disclosure-reviewed recovery snapshot. A Provider resource is recoverable only when its immutable identity can be fetched again and checked. Conversation-only input, expiring external documents, unavailable attachments and sensitive inputs are not recovered from locators. Materialize only with explicit user authorization. Never persist credentials, tokens, secrets, protected raw values or sensitive originals. Otherwise report exactly `cross-session deterministic recovery unavailable`; when no checkpoint exists, its checkpoint disposition is `none`, not rejection of a nonexistent file.

Every Delta stores actual replay semantics, never only an ID:

```yaml
delta_id: stable-key
sequence: 1
supersedes: []
proposes_replacement_of: []
operation: add | replace | remove | preserve
semantic_kind: exact-visual | product | business | permission | data | algorithm | commercial | safety-security | technical
target_keys: []
before_semantics: complete-value-or-null
after_semantics: complete-value-or-null
origin: user-direct | necessary-derived | repository-evidence-backed | provider-suggested
decision_authority: explicit-user | delegated:<bounded-scope-key> | none
evidence_refs: []
source_refs: []
explicitly_unchanged_keys: []
status: accepted | rejected | unresolved
```

Retain all statuses, exact ordering, one-way supersession and explicit unchanged keys. Only an accepted Delta may supersede an earlier active accepted Delta, and it must replace the same target set, semantic kind and exact prior `after_semantics`; a rejected or unresolved Delta never deactivates accepted meaning. Use `proposes_replacement_of` for a rejected/unresolved proposal which may be decided later. Cross-target or semantic mismatch fails closed.

After legal supersession, every stable semantic target key has at most one active accepted Delta owner. Two active accepted Deltas for one target without a legal replacement relationship fail closed. This version deliberately has no generic merge or composition DSL; a future need to compose one semantic key from several Deltas requires a separately admitted mechanism.

Derive the complete inactive universe as rejected plus unresolved plus superseded accepted Delta IDs. The current audit supplies exactly one leakage row for every inactive ID with the matching reason and `leaked: false`; missing, extra, duplicate or active-ID rows fail closed. If an inactive meaning remains in the Proposal, selected-resource projection or resulting writeback, reconciliation is blocked.

Status inventories contain stable target-key identities, never `key=value` strings; semantic values stay in the Delta rows. The same key can therefore remain in the accepted inventory while a later rejected or unresolved proposal for that key remains visible in its own inventory. A blocked audit or illegal final owner does not rewrite an independently authorized accepted Delta as unresolved.

Each `source_ref` resolves through `authority_sources` to one repository-contained Source document, its current raw-byte digest, one actual marked Source item, the item kind and item-text digest. An arbitrary string or conversation-only locator cannot create authority or enter deterministic recovery. For deterministic accepted authority, that same marked Source Item also contains one strict, non-rendered, package-owned single-line `ty-dra-authority-v1` JSON projection covered by the Item text digest. Free text without this projection can continue through ordinary conversational DRA, but it cannot machine-close deterministic recovery authority or enter a checkpoint as accepted authority.

An explicit projection uses `mode: explicit-user` and enumerates exact target keys, semantic kinds, allowed origins and the canonical `after_semantics` SHA-256. Its `target_keys` set must equal the bound Delta target set; a coupled `[A, B]` decision cannot be rebound as an independently authorized `[A]` meaning. A delegation projection uses `mode: delegation` and enumerates its stable delegation key plus exact allowed target keys, semantic kinds and origins. `delegated:<id>` names the matching task-local delegation row, and the accepted Delta binds that same decision Source. Delegation is deliberately a bounded superset: every Delta target must be a member of the delegation's allowed targets. Do not substitute an incidental target path for delegation identity. A hierarchical-looking key such as `checkout.confirmation` does not implicitly authorize `checkout.confirmation.fade_duration`, a sibling or a broader target.

`origin` records where the meaning arose, not where its Source item happens to be stored. Materializing a direct user choice in the repository leaves it `user-direct`; use `repository-evidence-backed` only when repository evidence itself supplies the meaning. A separate decision Source can authorize a meaning without changing that meaning's origin.

A selected resource is evidence and never authorizes itself. An accepted Provider suggestion requires explicit user authority or a delegation which covers its origin, semantic kind and every target. Delegation authorizes bounded choice; it is not automatically the Source for the chosen non-visual meaning. Product capability, business, permission, data, algorithm, commercial and safety/security meaning additionally binds an independent authoritative Source Item, separate from the delegation item, whose own projection simultaneously matches the exact target set, semantic kind, origin and canonical `after_semantics` digest. An unrelated requirement kind cannot fill that slot. A specific explicit-user decision item may carry both meaning and acceptance, but a general bounded-delegation decision alone is not the meaning. Exact visual values may remain exclusively resource-owned, but their adoption authority remains independently Source-bound. A visual-color delegation therefore cannot be rebound to product, business or permission meaning. Provider-added meaning lacking authority remains `unresolved` unless an authoritative decision explicitly rejects it. Rejected/unresolved meaning never enters accepted requirements or writeback.

The helper proves consistency between Source-owned structured scope and Delta fields. Interpreting the higher-level semantics of arbitrary free text remains part of the Authoring TCB; the helper does not implement general natural-language entailment.

Reconstruct each round only from:

```text
current Base@raw digest
+ ordered active accepted Delta semantics
+ current unresolved decisions
+ current scope/exclusions
+ current Design Authority identity
```

Never use a prior Agent summary or generated resource as the next Base. Missing semantics, stale Base, invalid sequence/supersession/delegation or an out-of-scope/excluded target fails closed.

## Conditional checkpoint and helper

Prepare one disclosure-reviewed JSON input using schema `design-resource-recovery-input-v4`, including session identity, Base, `authority_sources`, delegations/Deltas, exact accepted/rejected/unresolved sets, current Design Authority identity, immutable Provider project/run/resource references, `selected_resource_bindings`, one frozen `audit_expectations` catalog and optional writeback. The catalog owns the exact changed, unchanged, resource-decision, blast-radius and inactive-leakage row expectations, including Delta/resource/condition/basis/binding identities. Every resource-decision binding freezes one and only one `final_disposition`: `proposal-written` with its exact operation ID, `resource-owned-exact-visual` with its selected resource/conditions/structured owner, `not-adopted` for rejected or superseded meaning, or `unresolved` for unresolved meaning. Audit observes and verifies this owner; it never selects it. Changing an owner requires checkpoint `update` with digest CAS. The catalog is the only checkpoint audit-universe/owner owner; current audit rows must be set-equal to it rather than merely non-empty. Selected resource bindings declare one unique resource key, generic `repository-snapshot` or `external-immutable` identity, locator, raw-byte digest and exact condition identities. Arbitrary condition strings and duplicate identities fail closed.

The existing selected-resource, condition, Design-Authority and authority-Source fields jointly bind deterministic selection to the canonical selected-source digest, target, declared conditions and controlling Source/Design-Authority identity; no new selection field or status is added. Preview URLs, names and exports are derived outputs. A proved equivalent export does not change the selection binding, while a visible or semantic difference requires a new user review/selection and, when retained here, the existing digest-CAS checkpoint update.

Create/retain a checkpoint for a real interruption or pending CAS writeback; use `none` when neither exists, and `reject` when a requested new checkpoint, input, destination or existing checkpoint cannot be admitted. Never turn an invalid authority request into `none` merely because no file was written. Then explicitly create it when required:

```text
ty-context design-resource recovery create <session> --input <state.json>
```

When a real recovered loop changes Delta, resource or pending writeback inputs, replace the existing checkpoint only through digest CAS:

```text
ty-context design-resource recovery update <session> --input <state.json> --expected-sha256 <current-checkpoint-sha256>
```

The helper writes the next canonical checkpoint to an exclusive same-directory temporary file, rechecks the current digest, atomically replaces and rereads it. A mismatch retains the old checkpoint and fails closed. Repeated identical input is an idempotent no-write. This creates no session registry.

The helper writes only:

```text
tmp/ty-context/design-resource-recovery/<session>/checkpoint.json
```

and requires the path to be ignored and untracked. It validates strict schema/version, canonical bytes, Base identity, complete Delta/delegation semantics, repository containment/no-follow parents, symlink/junction/hardlink and user collision boundaries. The checkpoint adds detected Base encoding/EOL and, when applicable, detected target encoding/EOL. It stores no current activity, live Provider execution, Artifact readiness, Design suitability, next action, readiness/completion or acceptance.

Use `inspect` after interruption. It re-reads Base and repository Design Authority, validates raw identities, reconstructs ordered active accepted/rejected/unresolved semantics and derives writeback state. External Provider/resource and external Design Authority identities remain explicitly listed for current revalidation; the helper does not contact or manage Providers.

```text
ty-context design-resource recovery inspect <session> [--json]
```

Unknown schema, corrupt JSON, stale Base/authority or unavailable semantics fails closed. In particular, v3 input/checkpoint/audit and exact-patch-v3 are never silently interpreted as v4/exact-patch-v4; reconstruct current state from Source, Provider identities and Proposal instead of inferring missing bindings or establishing a migration registry. The helper's deterministic boundary is supported repository files and exact bytes; a locator alone is not proof of recoverability.

## Current audits and status card

Before selection/writeback and after every material revision, re-read current resources and perform three upstream audits:

1. **Requirements → Resource:** every frozen active accepted changed key has the catalog's exact Delta, selected immutable resource and condition bindings. Every frozen explicit-unchanged key has exactly the catalog's resource, condition and authority-basis Source bindings. A referenced condition must belong to the selected resource's declared conditions. Missing, extra, duplicate, unresolved, distorted or falsely claimed coverage fails closed.
2. **Resource → Requirements:** freeze every material resource-decision row and its one final disposition per binding in the checkpoint catalog. Each row binds exact Delta IDs and a separate stable binding ID plus requirement-key/Delta/origin/decision-authority/Source tuple for every key; authorization of one key never covers another. The global `(resource_ref, requirement_key, delta_id)` and `(delta_id, target_key)` identities are unique across all rows; duplicate arrays or cross-row bindings fail before any Map/Set normalization. Every active non-preserve `Delta × target` has exactly one final disposition. `proposal-written` binds one real patch operation ID. `resource-owned-exact-visual` is limited to exact visual meaning and binds one immutable selected resource, exact declared conditions and a structured `selected-source-record` or `external-immutable` owner. Rejected/superseded uses `not-adopted`; unresolved uses `unresolved` and blocks readiness. Provider success, audit choice or a selected file cannot create authority.
3. **Unexpected Blast Radius and inactive leakage:** the catalog freezes the complete blast-radius universe, including every explicit Base exclusion, and every inactive Delta leakage row. Inspect every blast row for out-of-scope pages, controls, copy, layout, tokens and states, and every leakage row for reappearance of rejected, unresolved or superseded meaning. Missing, extra, duplicate, unexpected or unresolved rows fail closed.

Provider execution, Artifact readiness and Design suitability are independent. Provider success, complete fields or repeated values never prove suitability; a valid shared Token or inherited component variant must not be rejected merely because a value repeats. Block direct/Design-Authority conflict, wrong target/condition, missing material state, placeholder-final content, unsupported added meaning, unresolved promotion, stale identity and incomplete formal closure.

Derive—not restore—a status card containing Base identity; accepted/rejected/unresolved Delta; current changed and explicitly unchanged keys; Provider run identity; current live Provider execution; current Artifact readiness; freshly audited Design suitability; all three audit findings; current digest-derived writeback CAS state; and next action. A requested status card re-runs the current audits: an executing run or incomplete current resource is `blocked`, not a restored or `not-applicable` audit conclusion. The checkpoint contains none of those live conclusions.

Derive status fields with one meaning each:

- checkpoint: `none` when no checkpoint exists or is needed, `create` for a real interruption/pending CAS writeback, `retain` for an existing valid checkpoint, and `reject` for a proposed or existing invalid/unsupported checkpoint, input or unsafe destination;
- write action: `none` when no Proposal writeback/promotion is pending or requested (including a recovery-availability inquiry), `preview` for a safe pending patch not yet approved for apply, `apply` only for pre-digest plus balanced audit, `idempotent-no-write` for expected-post bytes, and `block` when a requested/pending writeback is unauthorized, stale, conflicting or audit-blocked;
- audit: `not-applicable` only when no current selected/resource surface is available to audit, `blocked` when any current audit cannot balance, and `balanced` only after all three current audits and leakage checks pass.

An unauthorized meaning in a selected resource therefore blocks its Proposal promotion/writeback even if the file remains valid visual evidence; an unavailable conversation-only Base with no writeback request reports no write action.

Project the decision inventory before projecting the action result. An independently Source-valid accepted Delta stays in the accepted inventory and keeps its authority row when a later patch, resource identity, condition/basis binding, audit row or final owner is invalid; those later defects block reconciliation, readiness and writeback but do not demote or erase the accepted meaning. When balanced reconciliation, promotion, handoff or writeback is requested or imminent, any duplicate identity/cross-row binding, condition/basis mismatch, illegal/multiple/unreadable final owner, inactive leakage or patch mismatch means a blocked result, blocked current audit and blocked write action—not `none` or `unavailable`—with every affected audit direction reported. If the authority Source/projection itself fails target, semantic kind, origin, meaning digest or repository identity, reject the deterministic input/checkpoint and do not accept that meaning. For a deterministic create/update input, this is checkpoint `reject` even when no prior checkpoint exists; normalizing the invalid claimed acceptance into rejected or unresolved meaning does not turn the invalid input into checkpoint `none`. Retain an existing valid checkpoint when an update/cleanup conflict or partial cleanup prevents the requested operation.

Apply the table to imminent work, not only completed commands: a valid authorized Delta plus an immutable resource and a real interruption expected before writeback requires checkpoint `create` and write action `preview`; a handoff-ready request with any current audit/authority gap requires write action `block`; and frozen pre/post digests plus a balanced current audit are a pending CAS writeback requiring checkpoint `create` or `retain` and write action `apply`.

## Safe writeback and reconciliation

Create a writeback only when at least one frozen active binding is `proposal-written`. Freeze target locator, pre-write raw digest, exact `design-resource-exact-patch-v4`, canonical patch digest, expected post bytes/digest, selected resource identities and `proposal_written_delta_ids`. The immutable replay Base and mutable writeback target must be distinct locators; if the current Proposal itself must be updated, first use an explicitly authorized immutable Source/snapshot as Base. The exact patch universe is only the active accepted `Delta × target` bindings frozen as `proposal-written`; resource-owned exact values remain in effective requirements and audit but never enter or get copied into Proposal.

Every patch operation has one unique ID, exactly one Delta, one target, one semantic binding and one `source_span` in `utf16-code-unit-v1` coordinates over the original decoded pre-write Proposal. Every non-null before/after semantics has exactly one JSON scalar leaf, and the declared local text projection must cover that leaf. Ordinary string scalars containing CR, LF, NUL or another control character are unsupported; never permit a value such as `red\npermission.admin: true` to escape its scalar carrier.

For `replace`, split each local before/after text at its projected scalar. The complete prefix before the scalar and suffix after it must be character-for-character equal; only the projected scalar may change. Adding a permission line, renaming a label or deleting nearby prose inside the same operation is blocked and requires a separately authorized Delta rather than piggybacking on the scalar replacement.

Free-text add/remove cannot establish non-interference. `add` requires null before semantics, preserves one exact nonempty insertion anchor and adds exactly one package-canonical single-line `ty-dra-proposal-scalar-v1` carrier plus the current uniform EOL. That carrier contains only `target_key`, `semantic_path` and the canonical JSON scalar value. `remove` projects one before leaf to null, requires empty `after_text` and deletes exactly one already canonical carrier whose target/path/value match the Delta; it cannot widen over an adjacent heading, requirement, explanation or other target. `disabled`, `removed`, `deprecated` or another non-empty substitute is new meaning requiring a separate Delta. If the current Proposal has no supported anchor/carrier, report exactly `deterministic Proposal writeback unavailable`; return a complete revised Proposal for user confirmation or retain the exact value as resource-owned instead of falling back to generic string replacement.

Fail closed from the actual patch-v4 operation and Proposal bytes, not from omitted detail in a concise audit summary. A statement that an operation exactly projects its one leaf and that its anchor/carrier, preimage and expected post bytes are current is a positive claim of those named invariants unless another fact contradicts it; do not invent a missing carrier, malformed carrier or free-text fallback merely because the summary does not repeat the serialized carrier. Conversely, a claimed valid operation never overrides an observed parser, target/path/value, anchor, scaffold or span mismatch.

For a decision-only review whose supplied facts are an invariant summary rather than the serialized operation, treat these as sufficient positive patch-v4 claims unless another supplied fact names a mismatch: an add with null before semantics, exactly one after scalar, `before_text` used only as a preserved structural anchor, exact after projection and current pre/post bytes; or a remove with exactly one before scalar, null after semantics, empty `after_text`, exact before projection and current post bytes in which the old `before_text` is absent. Such a positive summary is `allow`/balanced and does not itself reveal missing carrier bytes. This interpretation never relaxes create/update: when actual operation bytes are available, the helper must parse and verify the canonical carrier, anchor and source span and fail closed on any mismatch.

A carrier, scaffold, projection or source-span defect is a downstream patch defect, not a new authority decision. When the Delta's Source and decision authority remain valid, preserve that Delta in `accepted_keys` and preserve its authority row while returning a blocked disposition/audit/write action and rejecting the invalid checkpoint input. Never erase or demote already accepted meaning merely to express that its proposed patch cannot be applied; only an actual Source/authority failure changes the accepted inventory.

Checkpoint create/update resolves every source span against the same original Proposal before mutation. The frozen interval must equal `before_text` and both text digests, and all spans must be pairwise disjoint and non-nested; operations cannot share a character or insertion anchor. Apply sorts original spans by descending offset and replaces only those intervals, so a later operation cannot consume output generated by an earlier operation. Readback calculates each final interval from original offsets and length deltas, checks its exact output plus the whole-file expected digest and thereby conserves untouched prefix, suffix and inter-operation gaps. A source span cannot represent two independent meanings. Inactive, unknown or resource-owned bindings cannot enter the patch, and changing red semantics to purple text without changing the Delta is rejected during create/update. For an active superseder, the declared prior `before_text` projection must also be absent from the computed and reread post-write Proposal; its survival is inactive-meaning leakage. This is a bounded scalar-carrier projection proof, not general NLP entailment or arbitrary text-diff semantics. Preview before mutation:

```text
ty-context design-resource recovery preview <session> [--json]
```

Current target digest determines state:

```text
current == pre-write digest       => unapplied
current == expected post digest   => already applied/idempotent
otherwise                         => concurrent conflict; fail closed
```

Produce a fresh `design-resource-reconciliation-audit-v4` bound to the same Base, Design Authority, Provider run, selected resource digests, optional expected target digest, current decision sets and the checkpoint's complete audit-expectations catalog. Include Requirements→Resource, per-key Resource→Requirements, blast-radius and inactive-leakage rows. For a Proposal writeback, apply:

```text
ty-context design-resource recovery apply <session> --audit <audit.json>
```

The helper first requires a balanced fresh audit, validates checkpoint-frozen structured downstream owners and CAS, reapplies the exact patch from the frozen original spans in memory, preserves supported UTF-8/BOM or UTF-16 encoding and the existing non-mixed EOL policy, writes a same-directory exclusive temporary file, syncs it, rechecks the target, atomically renames, rereads expected bytes, verifies every operation's calculated final interval—or removed canonical carrier—plus whole-file digest, and reconciles again. An already-post state performs no write. A `selected-source-record` owner must be repository-readable at its bound digest; an external-only Provider locator stays revalidation-pending.

When no binding is `proposal-written`, omit writeback and do not invent an empty patch or transaction. Re-read Source, selected resources and downstream owners and reconcile the complete catalog read-only:

```text
ty-context design-resource recovery reconcile <session> --audit <audit.json>
```

Recovery uses only generic repository snapshot/source-record identity. It does not accept a `formal-handoff-target` label, an implementation-feasibility-readiness label, duplicate either formal parser, or persist a selected production strategy. Formal Web/App input closure remains owned by `ty-context design-resource preflight`, while production ownership remains downstream.

A valid resource-owned-only case may be `allow` plus `reconciliation-balanced` with `write_action: none`, but the helper-level `handoff_ready` projection remains false. Any later readiness claim waits for the Skill-owned composition of current Provider/resource revalidation, durable final ownership and applicable formal preflight; never infer readiness merely from a balanced read-only reconcile.

The helper reports only `reconciliation-balanced`, `writeback-applied`, `writeback-idempotent`, `blocked` or `external-resource-revalidation-pending`. It does not report `handoff-ready`. Missing/extra/duplicate/unresolved/distorted/unsupported coverage, per-key authority mismatch, ambiguous/illegal final ownership, inactive leakage, changed explicit-unchanged meaning, unexpected blast radius or any identity mismatch returns `blocked`. A selected external resource which the helper cannot currently reread keeps external revalidation pending even after a valid Proposal writeback.

Same-directory rename, filesystem durability and the remaining same-user pre-rename race are the named Windows/macOS filesystem TCB. This is not hostile-writer linearizability or crash-proof storage. Cleanup failure is explicit. The helper removes only an exact digest-matched valid checkpoint and its now-empty session directory:

```text
ty-context design-resource recovery remove <session> --expected-sha256 <sha256>
```

Before removal it inventories the session directory. It removes the checkpoint and directory only when the directory contains exactly the helper-owned digest-matched checkpoint. Any other entry returns an explicit `partial` result and preserves both the checkpoint and unowned content; a race after checkpoint removal also returns `partial` with the retained entries. It never scans or deletes unrelated `tmp`, `.work_products`, `artifacts` or reports.

## Downstream boundary

Proposal–Resource reconciliation is upstream diagnostic information. It never replaces the Proposal, selected immutable resources, formal handoff, downstream UI Authority Closure or project implementation checks. A later Long-Task can prove only final Source/Contract bindings, current implementation and current Evidence. Its sole Final Gate cannot prove historical Provider execution, and the checkpoint/audits/status card never enter Long-Task Source, Contract, Authority, Evidence or completion.

Only the DRA Skill may derive final `handoff-ready`, and only from helper reconciliation balance plus current Provider/resource revalidation, one durable final owner per active binding, every applicable formal handoff/preflight and no unresolved blocker. This composition is not a new Gate and says nothing about Provider history, subjective optimality, arbitrary natural-language truth or completed product implementation.
