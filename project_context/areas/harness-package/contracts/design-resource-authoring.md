---
context_role: contract
read_policy: on-demand
---

# Design Resource Authoring Contract

## Role And Authority Boundary

`design-resource-authoring` is an explicit, upstream commissioner. It owns bounded resource scope, task-local semantic replay, Provider adaptation, current-resource audit, selected-proposal writeback and optional interruption recovery. It does not own product/business/permission/data/algorithm/commercial/security meaning, durable Design Authority, Provider lifecycle, implementation acceptance or Long-Task completion.

Candidate resources remain ordinary Source. A selected resource may uniquely own exact visual values for its declared conditions, but selection cannot authorize the reason those values or any new material meaning are adopted. Material decisions keep four independent dimensions:

- `origin`: `user-direct`, `necessary-derived`, `repository-evidence-backed` or `provider-suggested`;
- `decision_authority`: `explicit-user`, `delegated:<bounded-scope>` or `none`;
- `evidence_refs`: resources which display or support the meaning; and
- `status`: `accepted`, `rejected` or `unresolved`.

A Provider suggestion becomes accepted only through explicit user acceptance or a bounded delegation which covers that choice. Repository evidence can support a decision but cannot silently create product authority. Every `explicit-user` authority, bounded delegation and accepted Delta `source_ref` resolves to an actual marked Source item in a repository-readable file and is bound to both the file's current raw-byte digest and the item's current semantic digest; an accepted delegated Delta also binds the delegation's decision Source itself. A free-form locator, anchor-like string or resource identity cannot create authority. Conversation-only authority is ineligible for deterministic checkpoint recovery until it has been safely materialized as project-native Source under the disclosure rules below. Accepted product, business, permission, data, algorithm, commercial, safety/security and technical meaning additionally binds an authoritative meaning Source item. A specific explicit-user decision may carry both meaning and acceptance, but a general bounded-delegation decision alone is not the meaning carrier. Rejected and unresolved meaning never enters accepted requirements through resource selection or Proposal writeback.

## Base And Replayable Delta

Every material authoring/revision loop has one Base identified by repository-relative locator, raw-byte digest, encoding, EOL policy, scope ceiling, in-scope keys and explicitly excluded keys. Deterministic recovery is promised only when the Base is repository-readable, immutable or raw-digest verifiable, an already materialized project-native Proposal, or a Provider resource whose identity can be re-read and verified.

Conversation-only input, expiring external documents, unavailable attachments and sensitive material are not recoverable from a locator alone. Materialization requires explicit user authorization and either creates user-authorized project-native Source or a task-local non-authoritative snapshot after disclosure review. Credentials, keys, tokens, protected raw values and sensitive originals never enter DRA recovery state. Without safe materialization, report `cross-session deterministic recovery unavailable`.

Each Delta retains complete replay meaning rather than only an ID: stable ID and sequence, earlier accepted identities it legally supersedes, unresolved/rejected proposal identities it merely `proposes_replacement_of`, operation, target keys, before and after semantics, origin, decision authority, evidence and Source refs, explicitly unchanged keys and current status. Sequence and replacement relationships must be valid and recoverable; all accepted, rejected and unresolved rows remain visible. Only an accepted superseder with the same exact target set, matching prior semantics and a valid replacement meaning deactivates an earlier accepted Delta. Rejected or unresolved proposals never change effective requirements, and cross-target supersession fails closed. Missing actual semantics, stale Base identity, an out-of-scope target or invalid authority fails closed.

Each effective round is rebuilt from:

`current Base@raw digest + ordered active accepted Delta semantics + current unresolved decisions + current scope/exclusions + current Design Authority identity`.

An Agent summary or a prior generated resource is never the next Base.

## Narrow Recovery-State Exception

The project owner explicitly permits one versioned, task-local, non-authoritative and deletable DRA recovery checkpoint when a real cross-interruption recovery need exists. This is persistent workflow recovery state and is the sole exception to the earlier absolute no-DRA-state wording. It is not Context, Source, a Contract, Authority, Evidence, Receipt, Gate, Provider registry, scheduler, acceptance state or a completion conclusion, and it never enters Long-Task Source/Contract/Authority/Final Gate/Evidence.

The default simple preview creates no checkpoint, persisted recovery bytes, helper write transaction, fixed user pause, additional Provider generation, formal handoff/preflight or Proposal writeback. There is no global session registry, event log, state-machine service, heartbeat, polling owner or automatic scheduler.

The checkpoint stores only non-rederivable recovery inputs: schema and session identity; an immutable Base reference or explicitly authorized safe snapshot; the exact raw-digest-bound marked Source items which authorize explicit/delegated/accepted meaning; complete ordered Delta semantics plus selected/rejected/unresolved and explicit-unchanged identities; frozen blast-radius and resource-decision audit universes; Design Authority identity; immutable Provider project/run/resource references; and, when a writeback is pending, the target locator/pre-write raw digest, patch identity/content or immutable patch reference and expected post-write raw digest. It never persists current activity, live Provider execution, Artifact readiness, Design suitability, next action or ready/not-ready conclusions. Resume re-reads the current Base, Source items, Provider/resource identities, writeback target and fresh audit inputs and derives those views again.

## Owner-Local Helper

`ty-context design-resource recovery` is a narrow deterministic helper for checkpoint codec/schema validation, raw-byte and Source-item identity, replay validation, repository containment and no-follow checks, symlink/junction and collision rejection, checkpoint/Base/writeback CAS, same-directory atomic publication, encoding/EOL preservation, post-write readback, current Proposal–Resource reconciliation and helper-owned temporary cleanup. It reuses the package's strict codec, marked-Source parser, shared repository-path guard and atomic writer. Its JSON schema is versioned and unknown/corrupt state fails closed. `update <session> --input ... --expected-sha256 ...` replaces one existing checkpoint only when its current raw digest matches, preserves the old checkpoint on conflict, rereads the published bytes and creates no registry; this supports multiple authoring rounds without treating a prior status projection as state.

The helper does not inspect aesthetics, discover or manage Provider lifecycle, choose a design, create a second Contract/result, run Long-Task, scan unrelated temporary directories or remove unowned files. Sensitive-data admission remains an explicit disclosure decision; no generic secret scanner is claimed.

Writeback state is derived rather than stored:

- current target digest equals the pre-write digest: patch is not yet applied;
- current target digest equals the expected post-write digest: patch is already idempotently applied;
- any other digest: concurrent modification/conflict, fail closed.

The implementation uses a same-directory exclusive temporary file, write/readback and atomic rename at the filesystem boundary. Pre-rename and post-rename digest checks catch ordinary same-user concurrent modification; the local filesystem and OS rename implementation remain the named TCB rather than a hostile-writer linearizability claim. Windows and macOS behavior is exercised separately. Before removing a checkpoint, cleanup inventories the exact session directory and completes deletion only when every entry is helper-owned; an unowned entry yields an explicit partial result without deleting that entry or pretending full cleanup. A race or later cleanup failure reports the exact removed/retained boundary and never hides the primary failure.

## Current Audits, Status And Writeback

Material generation/revision performs three upstream audits over current Base/Delta and current resource bytes:

1. Requirements → Resource checks every accepted changed key, its exact Delta and resource/condition binding, and missing, extra, duplicate, unresolved or falsely claimed coverage.
2. Resource → Requirements inventories the frozen resource-decision universe. Every requirement key binds exact `delta_id` values and independently validates origin, decision authority, target and raw-digest-bound Source item; authorization for one key cannot cover another. Every accepted decision has exactly one final owner: `proposal-written`, or `resource-owned-exact-visual` only for an exact visual value bound to one immutable resource, declared conditions and a downstream owner. Product, business, permission, data, algorithm, commercial and safety/security meaning always resolves to independent authoritative Source and cannot use resource-owned disposition.
3. Unexpected Blast Radius closes the frozen `blast_radius_keys` universe, including every explicitly excluded key, across out-of-scope pages, controls, copy, layout, tokens, states and reappearance of rejected meaning. Missing, extra, duplicate or unresolved rows fail closed. Explicitly unchanged rows likewise bind the exact resource set, conditions and Source-backed preservation basis rather than storing a `preserved` Boolean.

Provider success, complete fields or repeated values never prove suitability. Direct/Design-Authority conflicts, wrong targets/conditions, missing material states, placeholder-final content, unauthorized material meaning, unresolved promotion, stale identities and incomplete formal closure block suitability. Repeated values are an investigation signal only: a valid shared Token or inherited component variant remains allowed.

Status cards are derived from current facts and show Base identity; accepted/rejected/unresolved Delta; current changed and explicitly unchanged keys; Provider run identity; live Provider execution; live Artifact readiness; freshly audited Design suitability; bidirectional/blast-radius findings; writeback CAS state; and next action. No stale checkpoint conclusion supplies those fields.

Before selected Proposal writeback, freeze target locator, pre-write raw digest, exact patch and patch identity, expected post-write bytes/digest, selected resource identities and accepted Delta identities. The immutable replay Base and mutable writeback target are distinct locators; updating the Proposal itself therefore requires an explicitly authorized immutable Source or recovery snapshot as Base. The helper checks current identity, applies only accepted meaning, writes atomically, rereads, verifies expected bytes and evaluates a fresh reconciliation input against the checkpoint-frozen requirement, unchanged, resource-decision and blast-radius universes. `balanced` requires exact accepted coverage, one valid final owner for every accepted decision, complete resource/blast dispositions, Source/resource/condition-bound unchanged semantics, no unresolved audit row, no rejected/unresolved leakage and no unintended changes; otherwise the result is `blocked`. Reconciliation is diagnostic upstream handoff information only and never replaces Proposal, selected resources, formal handoff, downstream UI Authority Closure or Final Gate.

## Long-Task Boundary

Proposal → resource → revision history is DRA upstream quality responsibility. Long-Task may prove only the final Proposal, selected immutable resources, formal handoff, Contract bindings, current implementation and current Evidence which actually enter its Source authority. DRA checkpoints, status cards, audit findings and reconciliation cannot be used to claim that historical Provider execution was correct.

The protected Long-Task `P/K/R1/R2/B/F/E` model and accepted-terminal theorem remain unchanged. Semantic Granularity, Semantic Fidelity and Delegated-Choice Validity refine whether `K`, `B` and `R1` form adequate comparison authority; they do not replace `R1`/`R2`. `R2` remains the existing Source/Contract continuity, Authority, observer, repair-localization, freshness and sole Final-Gate responsibility.

## Verification And Admission

Behavior tests cover strict schema/version failure, raw-digest-bound Source-item authority and conversation-only rejection, Base/Delta replay, status-aware same-target supersession and proposal-only replacement relations, exact per-key decision binding, complete audit universes/final owners, stale Base, checkpoint and writeback pre/post/conflict CAS, path escape, symlink/junction/hardlink and collision rejection, encoding/EOL preservation, atomic failure/partial cleanup, writeback idempotence, fresh balanced/blocked reconciliation and the no-write simple path. Managed/generated/package parity proves distribution only.

The independent frozen DRA benchmark track measures semantic loss/distortion/unsupported gain, rejected/unresolved leakage, fake/conversation-only authority, multi-key authorization spread, illegal supersession, incomplete audit universes/final ownership, wrong-target/blast-radius handling, correct blocking, false blocking and simple-path token/wall/tool/persistence cost. Requested model/effort/Provider values are not reported as effective provenance: the runner verifies effective values from authoritative execution events when observable and otherwise marks them `unverified` with environment/trace doubt, which forces the five-pair rule. A sanitized admission attestation binds the frozen configuration, result identities and exact candidate Git tree without raw prompts, events or sensitive content. Static guidance, an attestation or one pair cannot establish Agent effect or ROI.
