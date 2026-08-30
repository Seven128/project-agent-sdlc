---
name: design-system-authoring
description: Use only when the user explicitly asks to bootstrap, revise, reconcile, choose, adopt, replace or repair a project design system or design style with Open Design; asks for “初始化设计系统”, “生成设计系统”, “确定设计风格”, “采纳 Open Design 设计系统”, explicitly promotes a DRA Authority delta candidate, or invokes design-system-authoring in a Minimal Context Harness project. This capability never runs merely because DESIGN.md is missing, a project is new, DRA found a candidate delta, another Skill needs visual style, or ordinary UI work begins.
---

# Design System Authoring

Bootstrap, revise or reconcile an Open Design design-system candidate, obtain an explicit selection, then require a separate explicit adoption confirmation before changing the project's durable Design Authority. Installation only makes the Skill available.

## Hard boundaries

- Run only from an explicit user request. Never auto-run from `init`, `sync`, the default Workflow, `design-resource-authoring`, a missing/starter `DESIGN.md`, or a new-project inference.
- A DRA `authority_delta_candidate` is non-authoritative input, not permission to invoke this Skill or adopt anything. The user must explicitly start `reconcile` mode.
- A combined explicit user request to initialize the system and then generate resources authorizes that sequence; a resource gate alone does not.
- Open Design owns generation, revision, previews and its catalogue. Use its live structured capabilities; do not copy its prompts, emulate its generator, vendor a catalogue or invent provider IDs.
- Keep candidate generation, human/delegated selection, and the later explicit adoption confirmation distinct. A successful job, attractive preview, selected task resource or selected system candidate is not project authority.
- Root `DESIGN.md` is the unique Authority entry and revision owner. In this bundle version its supported front matter remains the editable exact Token authority; `design_system/tokens.json` is deterministic generated output, and a sparse `design_system/authority.manifest.json` owns closure membership/digest only. Bundle adoption must insert the exact `<!-- ty-context-design-authority-format: bundle-v1 -->` line at the fixed first non-empty Markdown body position and create the manifest in the same adoption. None is a second independently editable Authority.
- Create subordinate component/pattern/motion/platform owners only for real reusable durable rules. Never scaffold a mandatory full taxonomy.
- Put durable surface, information-architecture and interaction facts in their owning `project_context/**`; put visual-system semantics, rationale, token direction and reference interpretation in `DESIGN.md`. Do not duplicate facts across owners.
- Do not create a design registry, receipt, workflow state, Contract, acceptance gate or provider runtime inside Tiny Context. The package's local `@google/design.md` adapter and Authority codecs are deterministic lint/export/validation tools, not Open Design generation.
- Do not persistently install/configure MCP, plugins, authentication or disclosure paths without separate authorization. Task-local use of an already available Open Design MCP/daemon is allowed.
- Do not implement production UI or claim downstream fidelity, accessibility, product correctness or acceptance.

## Read the references

1. Always read [open-design-design-system-provider.md](references/open-design-design-system-provider.md) before discovery, generation, revision, selection or provider synchronization.
2. Always read [authority-adoption.md](references/authority-adoption.md) before changing `DESIGN.md`, its token source, relevant Context or provider bindings.

## Core workflow

1. **Confirm explicit mode and scope.** Use `bootstrap` for an unconfigured project, `revise` for an explicit current-system change, or `reconcile` for a user-promoted DRA Authority delta candidate. Capture product/brand purpose, supported surfaces/platforms, accessibility, modes, immutable constraints and supplied references. Ask only when an unresolved aesthetic or brand choice materially changes candidates and selection was not delegated.
2. **Inspect the complete current authority.** Read core and relevant surface Context, root `DESIGN.md`, optional sparse manifest/subordinate owners, generated Tokens and provider provenance. Run read-only closure inspection. Classify `unconfigured`, `configured` or `configured-but-inconsistent` as a task-local finding, not state.
3. **Validate reconcile input.** In `reconcile`, require the strict non-authoritative Authority Delta Assessment, validate that its `based_on` closure is still current, then use only its proposed changes, supporting resources, representative scenarios and immutable constraints. A stale packet returns to DRA reassessment.
4. **Discover live Open Design capabilities.** Prefer structured MCP. List/read `od://design-systems/<id>/DESIGN.md`, inspect tool schemas, and feature-detect creation/revision/acceptance plus project binding. Record live provider/MCP version and fallback.
5. **Reuse or generate candidates.** Reuse an existing provider system only when identity and meaning fit. Otherwise use a live structured creation/revision capability or the official daemon fallback. In `revise`/`reconcile`, generate bounded deltas against the current closure rather than an unrelated replacement. Keep every output a candidate.
6. **Review representative scenarios and iterate.** Inspect candidate `DESIGN.md`, exact Token delta, sparse owner delta, preview/showcase and representative scenes. Preserve immutable constraints, migration impact, provider diagnostics and provenance. Pending revisions remain non-authoritative.
7. **Obtain system-candidate selection.** Require explicit user/team selection, or explicit delegated selection with known criteria. Record basis, provider ID/revision and immutable digest/snapshot. Reject or leave other candidates unselected.
8. **Stop for separate adoption confirmation.** Present the exact project-owner diff, migration impact, new/removed subordinate owners, generated Token change and affected DRA resources. Ask the user to explicitly confirm adoption of this selected system candidate. Candidate selection or an earlier page-resource approval does not satisfy this confirmation.
9. **Adopt once after confirmation.** Follow the authority-adoption reference: update root `DESIGN.md`, insert/preserve the canonical body-leading `bundle-v1` marker, update only necessary sparse subordinate owners, deterministic generated Tokens, closure-only manifest/digest, owning Context and provider provenance. Create or remove marker and manifest only as one explicit Authority-format change. Do not copy revision or Token values into the manifest.
10. **Rebind and synchronize.** Calculate the new complete closure identity. Rebind affected DRA resources/handoffs to it and rerun affected preflight/representative verification. Accept the selected provider revision when applicable, confirm it is readable, and verify downstream provider project binding.
11. **Validate and report.** Run project-owned closure, Token, Context/design lint, source/package and affected DRA checks. Separately report mode, provider execution, artifact readiness, selection, explicit adoption confirmation, changed owners, old/new closure identities, rebinding, provider synchronization, verification and unresolved issues.

## Readiness classification

Treat Design Authority as unconfigured when `DESIGN.md` is absent, explicitly says `Design authority status: unconfigured`, remains an unedited starter, contains only style adjectives/inspiration, or lacks supported authored exact Token values. A configured visual system still does not make every surface implementation-ready; selected exact/constraint targets and declared coverage remain separate.

If authority is already configured and the user did not ask to replace or repair it, prefer reuse and explain the current system. Never generate a competing system as filler.

## Completion response

Report:

- requested operation and design-system scope;
- `bootstrap`, `revise` or `reconcile` mode and the exact base closure identity;
- Open Design transport/version and capabilities actually used;
- candidate IDs and review performed;
- explicit or delegated selection basis and separate adoption confirmation;
- adopted `DESIGN.md`, sparse subordinate owners, generated Tokens, manifest and Context owners changed;
- new closure identity and affected DRA rebinding/revalidation;
- provider ID, revision/digest and project-binding verification;
- validations run, limitations and decisions still required.

Always distinguish `provider succeeded`, `artifact ready`, `selected`, `authority adopted` and `binding verified`; none implies the next.
