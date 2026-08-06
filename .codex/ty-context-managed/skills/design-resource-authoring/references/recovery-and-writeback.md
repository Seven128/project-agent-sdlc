# DRA Semantic Replay, Recovery And Proposal Writeback

Load this reference only for a material generation/revision loop which needs complete semantic replay, a selected-Proposal writeback, current bidirectional audit or real recovery across interruption. It strengthens upstream Source quality and does not become Design Authority, implementation acceptance or Long-Task proof.

## Simple path and admission

A simple scoped preview creates zero recovery files and persisted recovery bytes, adds no user pause or Provider generation beyond the one requested commission, runs no formal handoff/preflight, performs no Proposal writeback and opens no helper write transaction. Its ordinary requested preview is the commission itself; recovery adds and reports zero tool actions. Keep its temporary reasoning in the current turn.

Use a recovery checkpoint only when interruption would otherwise lose material accepted/rejected/unresolved semantics, immutable Provider identity or a pending CAS writeback. It is versioned, ignored, task-local, non-authoritative and deletable. It is not Source, Context, a Contract, Authority, Evidence, Receipt, Gate, Provider registry, scheduler, acceptance state or completion conclusion. There is no global session registry, event log, heartbeat, polling loop or state-machine service.

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

Each `source_ref` resolves through `authority_sources` to one repository-contained Source document, its current raw-byte digest, one actual marked Source item, the item kind and item-text digest. An arbitrary string or conversation-only locator cannot create authority or enter deterministic recovery. `explicit-user` includes a digest-bound `decision` item. `delegated:<id>` names the stable task-local delegation row; that row carries a digest-bound decision Source ref, bounded scope, allowed origins and allowed target keys, and the accepted Delta binds the same delegation Source ref. Do not substitute an incidental target path for the delegation identity.

A selected resource is evidence and never authorizes itself. An accepted Provider suggestion requires explicit user authority or a delegation which actually covers its origin and every target. Product capability, business, permission, data, algorithm, commercial and safety/security meaning additionally binds an independent authoritative meaning Source item; a specific explicit-user decision item may carry both meaning and acceptance, but a general bounded-delegation decision alone is not the meaning. Exact visual values may remain exclusively resource-owned, but their adoption authority remains independently Source-bound. Provider-added meaning lacking authority remains `unresolved` unless an authoritative decision explicitly rejects it. Rejected/unresolved meaning never enters accepted requirements or writeback.

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

Prepare one disclosure-reviewed JSON input using schema `design-resource-recovery-input-v2`, including session identity, Base, `authority_sources`, delegations/Deltas, exact accepted/rejected/unresolved sets, global unchanged keys, frozen `blast_radius_keys` and `resource_decision_keys`, current Design Authority identity, immutable Provider project/run/resource references, selected resource keys and optional writeback. Create/retain a checkpoint for a real interruption or pending CAS writeback; use `none` when neither exists, and `reject` for an existing invalid/unsupported checkpoint. Then explicitly create it when required:

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

Unknown schema, corrupt JSON, stale Base/authority or unavailable semantics fails closed. The helper's deterministic boundary is supported repository files and exact bytes; a locator alone is not proof of recoverability.

## Current audits and status card

Before selection/writeback and after every material revision, re-read current resources and perform three upstream audits:

1. **Requirements → Resource:** every frozen active accepted changed key has exact Delta, selected immutable resource and condition bindings. Every frozen explicit-unchanged key has its resource, condition and authority-basis Source bindings. Missing, extra, duplicate, unresolved, distorted or falsely claimed coverage fails closed.
2. **Resource → Requirements:** freeze every material resource-decision key. Each row binds exact Delta IDs and a separate requirement-key/Delta/origin/decision-authority/Source tuple for every key; authorization of one key never covers another. Each accepted decision has exactly one final disposition: `proposal-written` or `resource-owned-exact-visual`. Resource ownership binds one selected immutable resource, exact conditions and downstream owner and is invalid for product/business/permission/data/algorithm/commercial/safety-security meaning. Rejected uses `not-adopted`; unresolved uses `unresolved` and blocks readiness. Provider success or a selected file cannot create authority.
3. **Unexpected Blast Radius:** freeze the audit universe, including every explicit Base exclusion, then inspect every row for out-of-scope pages, controls, copy, layout, tokens, states and reappearance of rejected/unresolved meaning. Missing, extra, duplicate, unexpected or unresolved rows fail closed.

Provider execution, Artifact readiness and Design suitability are independent. Provider success, complete fields or repeated values never prove suitability; a valid shared Token or inherited component variant must not be rejected merely because a value repeats. Block direct/Design-Authority conflict, wrong target/condition, missing material state, placeholder-final content, unsupported added meaning, unresolved promotion, stale identity and incomplete formal closure.

Derive—not restore—a status card containing Base identity; accepted/rejected/unresolved Delta; current changed and explicitly unchanged keys; Provider run identity; current live Provider execution; current Artifact readiness; freshly audited Design suitability; all three audit findings; current digest-derived writeback CAS state; and next action. A requested status card re-runs the current audits: an executing run or incomplete current resource is `blocked`, not a restored or `not-applicable` audit conclusion. The checkpoint contains none of those live conclusions.

Derive status fields with one meaning each:

- checkpoint: `none` when no checkpoint exists or is needed, `create` for a real interruption/pending CAS writeback, `retain` for an existing valid checkpoint, and `reject` for an existing invalid/unsupported checkpoint or unsafe destination;
- write action: `none` when no Proposal writeback/promotion is pending or requested (including a recovery-availability inquiry), `preview` for a safe pending patch not yet approved for apply, `apply` only for pre-digest plus balanced audit, `idempotent-no-write` for expected-post bytes, and `block` when a requested/pending writeback is unauthorized, stale, conflicting or audit-blocked;
- audit: `not-applicable` only when no current selected/resource surface is available to audit, `blocked` when any current audit cannot balance, and `balanced` only after all three current audits and leakage checks pass.

An unauthorized meaning in a selected resource therefore blocks its Proposal promotion/writeback even if the file remains valid visual evidence; an unavailable conversation-only Base with no writeback request reports no write action.

Apply the table to imminent work, not only completed commands: a valid authorized Delta plus an immutable resource and a real interruption expected before writeback requires checkpoint `create` and write action `preview`; a handoff-ready request with any current audit/authority gap requires write action `block`; and frozen pre/post digests plus a balanced current audit are a pending CAS writeback requiring checkpoint `create` or `retain` and write action `apply`.

## Safe writeback and reconciliation

Before creating a pending writeback, freeze target locator, pre-write raw digest, exact `design-resource-exact-patch-v1`, canonical patch digest, expected post bytes/digest, selected resource identities and active accepted Delta identities. The immutable replay Base and mutable writeback target must be distinct locators; if the current Proposal itself must be updated, first use an explicitly authorized immutable Source/snapshot as Base. Patch operations use exact one-occurrence `before_text`/`after_text` anchors and stable target keys. Preview before mutation:

```text
ty-context design-resource recovery preview <session> [--json]
```

Current target digest determines state:

```text
current == pre-write digest       => unapplied
current == expected post digest   => already applied/idempotent
otherwise                         => concurrent conflict; fail closed
```

Produce a fresh `design-resource-reconciliation-audit-v2` bound to the same Base, Design Authority, Provider run, selected resource digests, expected target digest, current decision sets and frozen changed/unchanged/resource-decision/blast-radius universes. Include Requirements→Resource, per-key Resource→Requirements, blast-radius and rejected/unresolved-leakage rows. Then apply:

```text
ty-context design-resource recovery apply <session> --audit <audit.json>
```

The helper first requires a balanced fresh audit, validates CAS, reapplies the exact patch in memory, preserves supported UTF-8/BOM or UTF-16 encoding and the existing non-mixed EOL policy, writes a same-directory exclusive temporary file, syncs it, rechecks the target, atomically renames, rereads expected bytes and reconciles again. An already-post state performs no write. `handoff-ready` is reported only after balanced reconciliation; missing/extra/duplicate/unresolved/distorted/unsupported coverage, per-key authority mismatch, ambiguous/illegal final ownership, rejected/unresolved leakage, changed explicit-unchanged meaning, unexpected blast radius or any identity mismatch returns `blocked`.

Same-directory rename, filesystem durability and the remaining same-user pre-rename race are the named Windows/macOS filesystem TCB. This is not hostile-writer linearizability or crash-proof storage. Cleanup failure is explicit. The helper removes only an exact digest-matched valid checkpoint and its now-empty session directory:

```text
ty-context design-resource recovery remove <session> --expected-sha256 <sha256>
```

Before removal it inventories the session directory. It removes the checkpoint and directory only when the directory contains exactly the helper-owned digest-matched checkpoint. Any other entry returns an explicit `partial` result and preserves both the checkpoint and unowned content; a race after checkpoint removal also returns `partial` with the retained entries. It never scans or deletes unrelated `tmp`, `.work_products`, `artifacts` or reports.

## Downstream boundary

Proposal–Resource reconciliation is upstream diagnostic information. It never replaces the Proposal, selected immutable resources, formal handoff, downstream UI Authority Closure or project implementation checks. A later Long-Task can prove only final Source/Contract bindings, current implementation and current Evidence. Its sole Final Gate cannot prove historical Provider execution, and the checkpoint/audits/status card never enter Long-Task Source, Contract, Authority, Evidence or completion.
