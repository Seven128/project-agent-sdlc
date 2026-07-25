# Open Design Provider Orchestration

Use Open Design as the generation engine. This Skill supplies a bounded product commission and retrieves results; it does not recreate the provider's prompts, template logic or catalogue.

## Execution priority

1. **Structured Open Design MCP** for discovery, project/run control and artifact retrieval.
2. **Open Design CLI or daemon API** when MCP is unavailable or cannot expose a required current capability but equivalent structured behavior is locally available.
3. **Browser/desktop interaction** only for bootstrap, unavoidable UI-only selection, signed-in provider interaction, visual preview inspection or recovery. Prefer browser-specific control over general Computer Use when both can operate the page.

Do not silently install an MCP server/plugin, alter the user's global Open Design/Codex configuration, sign in, create a paid-provider dependency or expand data disclosure. Explain the exact setup need and obtain separate authorization when persistence or a new disclosure path is required.

## Live capability discovery

Discover rather than remember:

- configured agents and models, including whether Open Design's inner agent is Codex CLI;
- functional skills and plugins;
- rendering templates or project types;
- design systems and their selected project binding;
- specialist paths such as collaborative design platforms, image, video or 3D/WebGL;
- supported project creation, run, cancellation, file and artifact operations.

Current structured tool names may include `list_agents`, `list_skills`, `list_plugins`, `create_project`, `get_project`, `get_active_context`, `start_run`, `get_run`, `cancel_run`, `list_files`, `get_file` and `get_artifact`. Feature-detect them; tool names and provider versions may evolve.

Functional skills and rendering templates are different registries. Finding `frontend-design` does not prove that a `mobile-app` or `wireframe-mobile-flow` template is installed, and a remembered template ID is not live capability evidence.

### Rendering-template discovery compatibility

Prefer, in order:

1. a live `list_design_templates`-style method/resource when the provider exposes one;
2. an explicit template ID supplied by the current project/user and validated by the provider;
3. a version-guarded structured daemon query that reads the provider's current registry;
4. provider UI inspection when no structured registry is exposed;
5. an honest `unavailable` or degraded-discovery result.

Never vendor a fallback template catalogue or guess a template ID from prior runs. Do not implement a transport helper unless the live host truly lacks a safe structured path; any helper may normalize metadata and transport only.

## Conditional Design Authority gate and binding

Before any style-bearing commission, read project `DESIGN.md` and its declared authored exact-value token source/generation direction. Style-bearing means the resource materially expresses visual fidelity, brand, typography/color/density, component visual treatment or a production-style prototype. Low-fidelity structure, IA/flow topology and semantics-only behavior/state studies are non-fidelity and do not require the gate.

If authority is absent, explicitly `unconfigured`, still a starter, style-only/inspiration-only, or lacks one authored token source/generation direction, stop before creating a project or run. Direct the user to explicitly invoke `$design-system-authoring`; never auto-run it. A combined explicit request authorizes the sequence.

For configured style-bearing work:

1. read the adopted Open Design design-system ID and digest/provenance from project Design Authority;
2. confirm `od://design-systems/<id>/DESIGN.md` is readable through MCP;
3. pass that ID as `designSystem` to `create_project`;
4. immediately call `get_project` and require `designSystemId` to match;
5. when reusing a project, check its binding before every new style-bearing run;
6. on missing/mismatch, prefer a new bounded project with the correct binding when MCP has no safe update method; otherwise feature-detect and verify the provider's structured update.

Never silently use the provider's default or a different system. A provider-side mismatch is a synchronization/rebinding issue; it does not erase the canonical project `DESIGN.md`.

## Structured commission sequence

1. Record provider version, selected agent/model, functional capability, rendering template, adopted design system and relevant plugin/export readiness as reported live.
2. Reuse an existing task-local project only when its scope, prior inputs and required design-system binding match; otherwise create a bounded project. For style-bearing work, pass `designSystem` and verify `get_project.designSystemId` before the run.
3. Start a run with the product-specific commission envelope and the provider-native capability identifier.
4. Poll with a bounded cadence. During a long run, report meaningful progress at least once per minute without flooding the user.
5. Preserve run IDs and the latest provider diagnostic. Support cancellation when the user requests it and the provider exposes it.
6. Resolve the actual entry explicitly, retrieve the artifact/source, inspect it according to intent and preserve its immutable identity before later iterations or handoff.

Open Design may launch Codex CLI as its configured inner agent. That is provider execution, not recursive invocation of this outer Skill. Do not hardcode a model when the provider can report the current configured model.

## Separate three kinds of state

### Provider execution state

Examples: queued, running, succeeded, failed, cancelled, timed out or unknown.

### Artifact readiness

Examples: missing, partial, corrupt, retrievable, rendered or snapshot-preserved.

### Design suitability

Examples: unreviewed, scope-sane, handoff-checked, human-selected or rejected.

Never collapse these into one “success.” A provider success does not prove a good design; a complete artifact can exist even when a provider run later fails.

Use these qualifiers when needed:

- `artifact-ready/run-unreconciled`: a complete retrievable artifact exists, but the provider run remains nonterminal or inconsistent;
- `artifact-ready/provider-failed`: the artifact remains complete and retrievable, but the provider later reports failure/timeout.

In both cases preserve the exact run locator, last update, failure diagnostic and artifact hash. Do not claim provider success or downstream acceptance. Retry only when the promised resource is incomplete/corrupt or the user requests another attempt; do not discard a useful independently inspected artifact merely because the terminal state differs.

## Implementation-level output profile

Open Design has demonstrated that a complex Web page can emit a machine-readable implementation set such as `index.html`, component/design specifications, tokens and an asset manifest. Capability is not a per-run guarantee. When the selected resource will drive Web/App implementation, make this an explicit commission and retrieval invariant:

1. request a canonical machine-readable entry and implementation-readable state, interaction, responsive, motion, semantic/accessibility and asset facts for the declared conditions;
2. enumerate the complete output set and retrieve every selected entry/dependency without truncation;
3. preserve exact bytes, media types and SHA-256 digests in repository-local immutable files;
4. record `implementation_web` or `implementation_app`, the canonical entry, every dependency and `acquisition: complete`;
5. for Web output, require every local HTML/CSS/JS dependency discovered from the frozen source to be present in the declared target set;
6. use stable IDs/data attributes, Markdown anchors, JSON Pointers, CSS selectors/custom properties or bounded whole-file binary locators that shared preflight can resolve.
7. before emitting `ready`, exercise every declared verification method against the canonical entry under its claimed conditions and compare facts repeated across code, specifications, tokens and asset manifests. Refine any mismatch; if it cannot be resolved, keep the affected cell `decision_required`/`unavailable` with a blocker. Preserve the checked immutable hashes and report this only as authoring source QA, never production acceptance.

A PNG may be a useful derived visual baseline, but it cannot be the sole source for implementation-level state, interaction, adaptation, accessibility or motion facts. Non-Web resources use the `reference` profile; do not manufacture HTML merely to satisfy this profile.

## Explicit entry and immutable identity

Provider project metadata may omit or stale its entry file. Resolve in this order:

1. validate an explicit project entry path when present;
2. enumerate project files;
3. identify the intended provider-native entry from the current run/output rather than guessing;
4. retrieve that exact file/artifact;
5. preserve an SHA-256 digest or immutable snapshot before selection/handoff.

A preview URL is mutable navigation, not immutable identity. It may be reported for convenience only beside project/run/entry provenance and a digest. If the user explicitly selects the resource for durable use, export or snapshot it to a user-approved location; never silently choose a repository path.

## Review proportional to intent

- **Exploration:** open/render the requested entry, confirm artifact count/scope and obvious corruption, then show it. Do not launch a packaging or validator sequence.
- **Handoff:** additionally perform the method-proportional source QA above, including relevant structure, states/transitions, viewport behavior, accessibility semantics, assets, obvious console/runtime errors and requested interaction hooks. State exactly what was and was not checked.
- **Selected-source preparation:** require explicit human selection basis, preserve identity/snapshot, and prepare downstream metadata. It still does not verify production behavior.

Provider self-checks, outer artifact sanity review and downstream project verification are separate evidence layers. Never claim native rendering, accessibility, responsive coverage, product correctness or acceptance unless the appropriate downstream project checks actually prove them.

## Specialist paths

Figma, Penpot, OpenPencil, image, video, 3D/WebGL and other providers are optional upstream producers. Use one only when its collaboration/editability or native inspection value is material and its connector/auth/read/export path is operational. A listed plugin, URL, thumbnail or metadata response is not proof of usable native input. If a requested provider is unavailable, report the missing capability precisely, offer another artifact only when it preserves the requested design decision, and never relabel an export as native editable design. Every selected provider still emits repository-readable immutable resources through the same provider-neutral handoff.

## Failure and recovery

- Preserve provider diagnostics; do not replace failures with generated placeholders.
- Avoid unbounded polling or repeated blind reruns.
- Re-discover capability after provider upgrades or registry mismatches.
- If structured paths fail but a UI artifact exists, UI inspection may recover it while retaining the degraded-provider qualifier.
- If the provider is unavailable and no justified fallback exists, return `unavailable` with the minimum setup needed rather than generating with an unrelated image tool and calling it equivalent.
