# Source-Bound Draft Input Reference

Read this alongside `contract-authoring.md` when raw, mixed, attachment-heavy or incomplete inputs need Source-quality repair while the same Contract Draft is being mapped. Inputs enter the Draft immediately; this reference is neither an earlier Source-authoring phase nor a standalone intermediary planning stage or second lifecycle.

## Objective and boundary

Preserve every material user, product, technical, visual and acceptance constraint from the initial/revised proposal and supplied resources. Add only traceable necessary derivations, defensible delegated choices and evidence-backed repository facts. Make the real Source understandable without the original conversation before Preflight/Compile, while allowing Draft decomposition and repository binding to proceed incrementally.

Do not create an intermediary planning schema, CLI, Preflight, Compile, Receipt, cache, authority, state or internal Source-authoring stage. Contract YAML cannot become the sole owner of a choice or missing semantic. Do not let current implementation silently redefine intent. A pre-existing planning or proposal document is simply one possible input.

## Input inventory

1. Assign every proposal, selected design resource, screenshot, document, diagram, table and other attachment a stable input ID.
2. Inspect all pages/frames/screens/tables/visible states; never silently sample a multi-part artifact. Every non-empty line in a declared Markdown Source file must ultimately belong to exactly one Material Source Item, one keyed and reasoned non-authoritative `ty-source-background:start/end` block, or the one validated `design-resource-handoff-v1` formal block.
3. Classify each input as user instruction, product requirement, technical constraint, existing proposal, selected target, repository/Context evidence, constraint, inspiration or background. Background is a closed grammar: `markdown-structure` contains only text-free anchors or horizontal rules, and `provenance` contains only `ty-source-provenance input=<key> mode=<direct|derived|delegated|evidence-backed> [source=<key>] [sha256=<64-lowercase-hex>]` comments; non-direct modes require `source`. Text-bearing headings, free-form provenance and explanatory prose are material or unclassified even when intended as non-authoritative; background must never hide a qualifier, requirement, acceptance fact, architecture meaning, design meaning or other delivery authority.
4. For visual resources, preserve selection basis, classification (`exact-target`, `constraint` or `inspiration`), stable resource/surface/control/state/target keys, declared platform/viewport/mode/state/content applicability, source profile/canonical entry/dependency set, provider/project/run/entry provenance and immutable digest/snapshot, plus typed locators. A mutable link, metadata-only response, partial file set or prose locator is incomplete. Unselected candidates authorize no fidelity.
5. Record incorporated meaning and every unreadable, conflicting or intentionally unused part. Higher authority and user-stated precedence win; unresolved conflicts remain decisions.

## Preference and research gate

Before comparative research or a material product, technical, architecture or provider selection, identify decision-changing criteria such as fidelity versus cost, delivery speed, reliability/support, privacy/compliance, lock-in/control, operational burden, platform scope and extensibility.

Infer preferences only from user words, Source, Context or controlling constraints. If an unknown preference would materially change research or recommendation, ask one concise targeted clarification before proceeding. Do not impose a questionnaire, re-ask known preferences or pause for minor reversible choices with the same defensible recommendation.

Use current primary/authoritative evidence for changing external facts. Record source, scope and retrieval date. Preference clarification authorizes plan meaning, not payment, contracting, deployment/publication, destructive production mutation, permission grants, sensitive-data transmission or required legal/security/human approval; those remain typed external confirmations.

## Working strategies, not phases

Choose locally as needed while revising the same Draft; do not expose these as lifecycle stages or ask the user to choose:

- **refinement:** preserve and complete a substantially developed proposal;
- **synthesis:** build coherent Source from a goal plus mixed inputs;
- **hybrid:** use one proposal as backbone and fill gaps from other inputs.

A short request is sufficient when roles, goal and reference authority are recoverable. Reuse an authorized writable proposal as the real Source. If the delivery exists only in conversation, materialize exactly one project-native Markdown Source according to repository convention. Do not create a parallel planning artifact.

## Semantic authoring

For every material item, preserve one origin:

- `direct`: stated by user or controlling input, with all qualifiers;
- `derived`: unavoidable for completeness/falsifiability, identifies `Derived From`, states why necessary and changes no user capability, business rule or scope;
- `delegated`: a defensible choice requested by instructions to synthesize/refine/use judgment, records `Delegated By`, preference/evidence basis and exact added meaning;
- `evidence-backed`: repository/Context fact with exact source and no promotion of incidental code shape to product intent;
- `decision_required`: conflicting authority, explicitly user-reserved choice, missing material preference or no defensible recommendation.

High impact or several options is not itself a reason to pause when criteria support one recommendation. Keep real high-risk actions as external confirmations. Never introduce a requirement for the first time only inside acceptance criteria.

## Structure and stable keys

Use stable semantic lowercase-kebab keys and Markdown anchors where practical. Preserve keys when wording changes but meaning does not; never renumber for ordering or reuse a retired key for new meaning.

Define vertical Outcomes only when observable results are independently decidable and later verifiable. Do not split by response length, frontend/backend layer, module count, agent capacity or desired parallelism; do not merge distinct results merely for brevity.

Use only applicable semantic types:

- result/Outcome;
- Requirement (`REQ`);
- user-visible Control (`CTRL`);
- technical obligation (`OBL`);
- explicitly non-completing meaning (`NCOMP`);
- acceptance scenario (`AC`);
- global non-goal/constraint and forbidden shortcut;
- risk with exact Fact, Affected Outcome, Basis and Consequence;
- external confirmation (`EXT`);
- genuine decision (`DEC`);
- advisory implementation hint (`HINT`), which is not a material requirement.

## Non-UI semantic completeness

For every non-UI delivery, the authoring default is the finest independently decidable semantic Fact supported by direct Source, necessary logical derivation, explicit delegation or evidence-backed preservation. Do not stop at prose paragraphs, Requirements, Product Controls, user stories, broad acceptance scenarios, an `all-states`/`all-errors` catalogue or whatever fields current code happens to expose.

Before implementation and formal Compile:

1. Inventory every material request fragment, attachment, controlling Context unit, canonical schema/specification, selected external constraint, repository-preservation source and delegated instruction with stable identity, digest, disposition and basis. Derive one internal material-text view from the existing Semantic Fact Manifest for every Source item and every strict-UTF-8 material attachment, canonical specification, repository-preservation input, external constraint, delegated instruction and textual design resource. Do not infer text from an extension. Unreadable, invalid-UTF-8 or ambiguous content blocks; binary/design content continues only through its formal handoff route. Deterministically derive headings, paragraphs, nested list items, table rows, quotations, Given/When/Then steps, fenced code/configuration and textual HTML, then prove that every nonblank line belongs to exactly one Fragment or one allowed pure-separator line with no overlap. Each Fragment has exactly one explicit `fact_bearing`, `supporting_basis`, `superseded`, `decision_required` or `scope_excluded` disposition; missing, duplicate, conflicting and dangling dispositions block. Migration may generate current refs/digests plus `decision_required`, but never infer Fact lineage, support, polarity, supersession or exclusion.
2. Classify every Fragment and Fact as `delivery_semantic` or `source_integrity`, and derive its `product`, `technical`, `design`, `acceptance` or `external` authority domain. A `fact_bearing` Fragment requires owning-Source and reverse Fragment provenance, exact Claim/applicability, complete anchor coverage and matching modal polarity. A `supporting_basis` produces no independent Fact and is legal only when reverse delivery-Fact provenance mechanically carries every modal and high-signal value; an empty, integrity-only or merely same-domain target cannot hide a requirement. Supersession requires an authorized new Source and successor Facts in the same semantic cell (`Outcome + unit + family + condition + property + value-kind`); Expected may change, but subject/condition/property/domain may not. Scope exclusion names the exact Fragment plus excluded Fact/Claim/obligation, same-domain owner and rationale. A design/presentation statement cannot exclude or supersede product/technical meaning without that exact same-domain authority.
3. Derive and conserve high-signal code spans, API/route paths, versions, enum/symbol names, filenames/schema/config keys, numbers/ranges/units, exact quoted text, modal terms and frozen provider/protocol identifiers. Classify `must/shall/required/必须/应当` as positive-required and `must not/shall not/forbidden/never/不得/禁止/不可/只能/仅可` as negative-required; each maps to a Claim with matching `required_polarity`, and independent modals require split or an explicit compound cell. Every anchor maps to a delivery-semantic Fact, exact supersession, `decision_required` or exact scope exclusion; integrity-only coverage does not count. Reuse the existing Source inventory and Semantic Fact Manifest—never create a second Source ledger or generic NLP registry.
4. Explicitly disposition every standard semantic family for every Outcome and add custom families discovered from Source/repository/domain structure. The standard floor covers goal/scope/glossary; actors/roles/tenants/entitlements; business rules/calculations; data; operations/workflows/state/time; validation/output/error/API/protocol/event/job; persistence/cache/search/transactions/consistency/concurrency/idempotency; fault/retry/degradation/recovery/backup; configuration/flags/secrets; compatibility/migration/rollout; performance/capacity/cost/reliability/SLO; security/privacy/safety/compliance; observability/deployment/operations; integrations/notification/file/media/localization/commercial; hardware; AI/ML; architecture ownership/boundaries/debt.
5. Give every applicable outcome, actor, policy, entity/field/relation, operation, state/transition, interface/message/job, store/index/transaction/cache, configuration/migration/deployment/dependency, security/privacy boundary, SLO/signal/alert/runbook, device/AI/custom unit a stable subject/relation/population identity. Preserve hierarchy, owner, cardinality, causality, ordering, producer/consumer, source-of-truth and dependency relations. Static/dynamic populations need exact universe/partition/enumeration/exclusion identity.
6. Disposition every standard and custom condition axis. Enumerate each atomic applicable value and exact combination across actors/roles/tenants/jurisdictions/environments/regions/platforms/versions/features/configuration/entitlements/permissions/consent/sessions/states/input/boundary/data volume/locale/time/concurrency/repetition/dependency health/connectivity/failure/retry/consistency/freshness/migration/rollout/topology/threat/mode. Continuous domains use explicit ranges/boundaries; invariance/equivalence may share execution only while retaining distinct Fact identity and verdict. No aggregate, representative, pairwise or default-path substitute.
7. Disposition every standard and custom atomic property per unit and condition. One specified cell creates one Fact with typed value semantics, exact Source locator/digest, owner, quantifier, observation boundary, sensitivity and provenance. Every N/A/exclusion names exact affected identities, basis and rationale; `decision_required`, `unavailable`, unreadable or conflicting meaning remains blocking.
8. Expand every Fact into all required proof methods—exact/schema/decision-table/formula/invariant/transition/sequence/durable roundtrip/boundary/external effect/population/concurrency/idempotency/fault/recovery/migration/compatibility/performance/capacity/security/privacy/audit/observability/deployment/structure or custom TCB method. Freeze comparator, parameters, tolerance/mask, Oracle identity/capability, environment, observer and protected-value policy. Reach the furthest independently failing boundary; request issuance, parser success, self-reported success, artifact existence or a nearer proxy does not prove downstream persistence/effect/recovery.
9. Embed one complete `semantic-fact-manifest-v1` in declared Source. Its Inspector Census and collection counts/identity digests prove deterministic complete generation with no truncation or sampling. Require `Expected Semantic Facts = Source Indexed Facts`; later Contract authoring requires exact Fact and Fact×method projection. Values remain in Source/Context; Contract receives identities, located digests and comparison authority only.

This expansion cannot invent a real product/legal/security/commercial/safety choice. A defensible delegated choice must first become traceable Material Source; an unsupported or user-reserved choice remains a blocker or typed External Confirmation. The named Inspector/Oracle is an explicit trusted-computing boundary, and custom extensions are mandatory when the standard catalog cannot observe the domain.

## UI and control completeness

For each in-scope surface, record purpose, entry/exit/navigation, regions/overlays and included Control keys. For every real material interactive Control, close every canonical field independently:

`surface`, `region`, `location`, `control type`, `label/content`, `user task`, `visibility`, `availability`, `trigger`, `input`, `validation`, `default`, `interaction`, `navigation/result`, `loading`, `empty`, `success`, `failure`, `recovery`, `permission`, `feedback` and `accessibility`.

For each field record concrete `specified` meaning, an explicit justified `not_applicable` statement, or blocking `unresolved`; omission is not non-applicability. Also preserve every material cross-Control and system relation—including shared state, ordering/dependency, mutual exclusion, navigation, permission, recovery, validation and feedback chains—and explicitly close the Outcome as `not_applicable` only when no such relation exists. Each specified or not-applicable fact, including relation closure, must name its actual target, atomic condition/input/state dimensions and Given/When journey applicability.

Do not invent controls for a non-interface delivery. A coarse frame or configured design system does not supply unshown states. Selected design resources and product/technical Source remain parallel: visuals cannot invent business/data/permission/algorithmic rules.

For every selected exact/constraint target, preserve the declared platform/viewport/mode/state/content conditions and identify which surface and Control keys it governs. A formal Web/App handoff also preserves its canonical Fact-manifest identity, frozen Inspector/Census and the exact handoff projection of condition axes/combinations, subject hierarchy, subject-local variations, atomic properties, Fact Cells/Facts, proof obligations, Oracles/environments, design-system lineage, assets and blockers. Product Controls and eight UI/UX dimensions are semantic/roll-up owners, not the Fact ceiling. Do not collapse a component instance or Anatomy Part into its family, several states into `all-states`, several conditions into one label, or several property/method obligations into one broad visual claim. Canonical resources retain exact values; Source and Contract retain stable Fact identities and located-digest/comparison authority rather than copied CSS.

Before Compile, confirm the formal handoff already proves `Expected Fact Universe = Canonical Resource Facts = Handoff Indexed Facts`, including explicit N/A/exclusion basis and non-sampling/non-truncation. Each covered Fact has all property-required verification methods, and each exact target condition has full-target layout and pixel Facts. Separately record any design-resource acceptance blocker supplied by the Source, including its exact Source items, verification methods and non-empty runtime-observation `required_capabilities`. Do not weaken a physical-device, sensor, camera, orientation, haptic, assistive-technology, pixel-density, safe-area or other target-local need into a generic browser/runtime label merely because the proxy is available. File identity, hashes, provider/export success, registry membership, Census counts and preflight are integrity/input-closure facts only; they do not state that a production owner, real-user journey or rendered interaction conforms.

## Acceptance and risk

Each AC has exactly one Given/When/Then scenario, names the REQ/CTRL/OBL/NCOMP meaning it accepts and introduces no undeclared product semantics. Keep representative/sample/framework checks distinct from full-population claims and partial delivery distinct from completion.

Use the Runtime's exact risk Fact names when marking risk. Data migration is `data_migration`; a weakly observable critical path is separate `critical_user_path` and `weak_observability` facts; preserve `multi_repository_change` in Source so Contract compilation can reject unsupported delivery honestly.

## Preflight/Compile convergence audit

Before Preflight/Compile confirm:

1. Every material original statement and qualifier is preserved.
2. Every supplied input is incorporated or has an explicit unreadable/unused/conflict disposition, and every non-empty Source line is owned by a Material Item, closed-grammar structure/provenance background block or validated formal block.
3. Distinct requirements and independently decidable Outcomes were not collapsed.
4. Every real Control has all 22 canonical fields closed as specified, justified not applicable or unresolved; every material cross-Control/shared-state/navigation/permission/recovery relation is specified or the Outcome explicitly declares that no such relation exists.
5. Every REQ, specified/not-applicable CTRL field and Control relation has exact applicability plus acceptance, external confirmation, decision or explicit exception; unresolved coverage blocks.
6. Derived/delegated/evidence-backed items have traceable basis and no hidden product expansion.
7. Non-goals, forbidden shortcuts, risks and recovery are concrete.
8. No unsupported number, threshold, metric or external claim appears.
9. Selected design resources retain stable identity and exact declared coverage; formal Web/App handoffs retain manifest-backed atomic Fact/proof universes with no aggregate, sampled or truncated coverage; candidates remain non-authoritative.
10. Every material UI Fact and Control can be mapped to a production target/owner, real-user entry journey and independently attributable acceptance route, while every declared design blocker has an explicit machine or target-blocking external-confirmation disposition. Removing one from scope requires an explicit Source revision; Contract prose cannot waive it.
11. The Source is self-contained enough to own every mapped Draft semantic and names every still-required external artifact.
12. At least one marked `technical_obligation` carries `aspect=architecture`, preserves the selected owner/dependency/debt conclusion, and maps to an independently falsifiable architecture obligation rather than only a Result Claim.
13. Every derived material fragment and high-signal anchor has exactly one allowed disposition and content-semantic coverage; cross-domain exclusion and implicit/unsupported supersession are absent.
14. The one `semantic-fact-manifest-v1` exactly inventories all material non-UI inputs and complete standard/custom family, unit/relation/population, condition, property, Fact and proof-obligation universes; every ordinary Material Source Item contributes exact Fact lineage, all generation collections have complete count/digest closure, and no aggregate/sample/ungrounded N/A/unresolved row is hidden.

Complete non-rendering `ty-source-item:start/end` markers in the real Markdown Source without rewriting direct text, wrap only recognized Markdown structure or structured provenance in uniquely keyed and reasoned `ty-source-background:start/end` blocks, retain at most one schema-valid `design-resource-handoff-v1` formal block, and finish the corresponding Contract mapping in the same loop. Unclassified text, arbitrary prose inside background, a background block used to hide material meaning, unresolved Control coverage or missing applicability blocks Preflight/Compile. Neither markers nor this audit delay opening the Draft.
