# Open Design Design-System Provider

Use Open Design's live structured surface. Do not assume the installed version matches any compatibility evidence below; discover first and branch on actual tool/resource schemas.

## Capability order

1. Open Design MCP resources/tools.
2. The same installed Open Design daemon's structured API when MCP lacks a required design-system lifecycle or reference-input operation.
3. Open Design CLI/UI only for bootstrap, preview inspection, unavoidable signed-in interaction or a capability unavailable through the structured routes.

Never call a copied prompt, a local imitation or direct use of Open Design's Web implementation a Provider result. Persistent MCP registration, plugin/authentication changes and new disclosure paths require separate authorization.

The package-local `@google/design.md` adapter performs deterministic lint, parse/validate, export and diff only. It is not Open Design, does not generate candidates and owns no Provider authentication, polling, selection or adoption.

Before every generation or material candidate revision, create the complete task-local System Design Reasoning Brief from the sibling reference. Transmit it through an input the selected live route actually supports, preserve its accepted/rejected/unresolved preference sets during iteration, and retain the exact transmitted commission with the run evidence. Never invent a Provider field or treat task-local notes as Authority.

## Verified compatibility evidence, not runtime truth

The original compatibility audit observed Open Design 0.15.1 with MCP server 0.2.0 and protocol `2025-06-18`. It found concrete `od://design-systems/<id>/DESIGN.md`, `od://skills/<id>/SKILL.md` and `od://focus/active` resources, and returned `-32601` for `resources/templates/list`. It also observed `create_project.designSystem`, `get_project`, general project/run tools and no dedicated create/update design-system MCP tool. These facts remain historical compatibility evidence; the resource count, method set and version are not a permanent contract.

A source audit on 2026-09-05 inspected Open Design package 0.21.1 at commit `d4138ea81832c792f28cb69f2637a35e52f20f5a`:

- MCP `start_run` advertises `prompt`, `requestId`, `skill`, `skills`, `agent`, `model`, `serviceTier` and plugin `inputs` in that snapshot. It does not advertise top-level image attachments/paths or reasoning-effort control.
- Advertising both `skill` and `skills` proves only that the request accepts several identifiers. It does not prove their execution order, shared-input semantics, file ownership or conflict behavior.
- `apps/daemon/src/design-systems/generation-jobs.ts` creates or revises a design-system draft and progress record without launching an Agent/model in that path. A missing supplied body is filled by generic draft construction.
- The current Web design-system flow instead ensures a backing workspace and uses an Agent chat/run to generate or regenerate design-system files before synchronization and package audit. This proves that an Agent-backed capability exists in that source snapshot; the Web component's internal call sequence is not a public API contract and must not be copied into this Skill.
- `reference-design-contract` is one current functional-skill mapping for evidence-based `keep`/`change`/`do-not-copy` interpretation and candidate design-contract output. Its ID and exact output remain live Provider capabilities, not Tiny Context vocabulary or Authority.

For current execution, retain the installed Provider/MCP version and a normalized digest of the relevant live tool schemas. Feature-detect future structured methods before use. A tool or endpoint name alone is insufficient: inspect its input schema, result fields and observable behavior.

## Task-local capability profile

Discover only the capabilities needed by the bounded system commission:

- design-system record creation, workspace binding and readable file synchronization;
- Agent-backed project/run control, cancellation, diagnostics and output retrieval;
- functional visual-intent interpretation and design-system authoring capabilities;
- model/Agent selection and effective provenance fields actually exposed;
- structured screenshot/file/URL ingestion and selected-runtime visual capability;
- preview/showcase rendering and package/design-system audit;
- revision of a current candidate without changing project Authority; and
- provider-revision selection plus downstream project `designSystemId` binding.

Classify the usable route by demonstrated behavior, not by a remembered endpoint or Skill ID:

- `agent-authored`: a correlated Agent run can consume the scoped commission and produce an attributable design-system artifact delta;
- `reference-intent-authoring`: a live capability can interpret the supplied visual evidence under the rules below;
- `draft-only`: a record/body/file-preparation route has no attributable Agent run;
- `unavailable`: the required structured behavior or evidence cannot be established; or
- `decision-required`: a genuine user choice, authorization or disclosure change is needed.

These are task-local findings. Do not persist a Provider registry, capability cache, route state or model ranking. A task-local discovery result may be reused only while its Provider version and relevant schema digest remain equal; rediscover after a version change, schema mismatch or missing capability.

## Resolve visual intent only when needed

Do not add an interpretation run when current Source and the user already provide a coherent, sufficiently specific visual direction. Use a reference-intent capability when informal taste, screenshots, URLs, conflicting references or a requested professional completion leave material visual interpretation work.

For each readable reference, require an attributable candidate interpretation of:

- evidence actually observed;
- qualities to `keep` and their applicable design dimensions;
- product/brand/context changes to make;
- literal layout, brand, asset, copy or other material which must not be copied;
- material confidence and unknowns; and
- which additions are Source-required, bounded professional completion which preserves current Source, or creative candidate choices which still need selection.

This result is task-local commission input and review material. A Provider-produced `DESIGN.md`, design contract or implementation handoff remains inside the isolated candidate workspace and cannot overwrite root project `DESIGN.md`, become accepted semantics or authorize a product/surface change.

Run intent interpretation and design-system authoring serially by default so the second run consumes one inspectable candidate direction. A single run using `skill` plus `skills[]` is allowed only when the live Provider contract or an attributable bounded probe establishes ordering, shared inputs and output ownership for that exact combination. Schema presence alone is not proof.

## Reference-ingestion handshake

When screenshots, files or URLs materially control the result:

1. establish a readable input locator and digest or equivalent immutable identity;
2. retain its role, applicable dimensions/scope and prohibited use;
3. transmit it through a structured input field or Provider path actually supported by the selected route;
4. verify that the selected runtime declares the required visual/file/network capability;
5. require the per-reference interpretation to be attributable to the same run; and
6. review the generated candidate for the intended design relationships and prohibited copying.

A path embedded in prompt prose, an uploaded-file status, a thumbnail or a URL string does not prove Agent observation. If MCP lacks the required attachment field, use another live structured Provider route only when its transport and disclosure boundary are established; otherwise report the visual input unavailable or ask for an explicitly sufficient text description. Never silently generate from a filename.

Send only relevant user-authorized material. Do not persist secrets, credentials, cookies, protected raw values, sensitive screenshots or transient Provider logs in Context or package guidance.

## Agent-backed candidate execution

Prefer a dedicated public design-system authoring operation when live discovery exposes one. Otherwise use the smallest structured same-daemon route which can create or bind a design-system workspace and start a general Agent run. The adapter may normalize transport metadata, but it must not reproduce the Web UI's orchestration or Provider prompts.

An `agent-authored` claim requires all applicable evidence:

1. one correlated request identity and run ID;
2. the selected intent/system capability and the effective Agent/model/service tier/reasoning fields the Provider actually reports—never invented fields;
3. the exact scoped commission, complete current System Design Reasoning Brief and reference bindings sent through supported inputs;
4. a before/after or run-attributed output set showing the candidate artifact delta;
5. terminal run diagnostics, including timeout/cancellation/failure when present;
6. readable candidate `DESIGN.md`, exact Token direction and the requested sparse supporting files; and
7. actual preview/showcase rendering and package audit when those capabilities were promised.

If the Provider accepts a requested Agent/model but does not expose effective provenance, report that part unverified. If it exposes no reasoning control, do not request or claim a reasoning effort.

Generate one recommended candidate by default. Generate more only when the user asks to compare or current references support materially conflicting coherent directions. Alternatives must differ in decision-material typography, composition, density, container grammar, imagery or another named dimension—not merely color—and remain separately identifiable. A Provider-supported controlled variant inside one artifact is acceptable only when each variant is genuinely rendered and independently reviewable.

## Draft/bootstrap routes

`POST /api/design-systems/generation-jobs`, `revision-jobs` or an equivalent live operation may create a design-system record, body, pending revision or prepared file set. Unless the current route also supplies the Agent-run and artifact-delta evidence above, classify it `draft-only`.

A draft-only route may bootstrap the Provider container needed by a later Agent-backed run, but its terminal `succeeded` status cannot establish professional design-system generation, visual-intent interpretation, Artifact readiness, Design suitability or selection. If a future Provider version performs an Agent run behind the same endpoint, admit that behavior only from its live schema/result plus correlated run evidence—not from the endpoint name.

When the live draft route exposes `sourceNotes`, put the complete current System Design Reasoning Brief there. If a revision route lacks an equivalent supported field, revise only a candidate already carrying the current brief and send the exact changed decision rows through its supported feedback/commission input, or create a new bounded candidate. Field names from an older compatibility snapshot are never assumed.

## Review, revision and selection

Review at least one compact representative board or equivalent set which exercises:

- a core surface with the primary visual focus;
- a dense content/data surface or component family; and
- an empty, error, permission or other materially degraded state.

The representative set may share one preview artifact; it is not a mandatory three-page pack. Inspect candidate `DESIGN.md`, exact Token delta, sparse owner delta, reference interpretation, preview/showcase, immutable constraints, migration impact, Provider diagnostics and provenance.

The Provider preview must present an engineering design-system handbook as the primary artifact: system identity/purpose, Token families and relationships, component catalogue/contracts, interaction/adaptation and provenance come before application examples. Product-page galleries are supplemental validation only. A Provider preview remains a candidate artifact; the closure-external adopted showcase is created through the project adoption procedure and binds the resulting current Authority identity.

When a material defect exists, revise through an Agent-backed route and name the exact defect, affected owner/region and preservation boundary. Preserve unaffected color, typography, navigation, components or other candidate meaning explicitly. Avoid ungrounded requests such as “make it more premium.” A first candidate with no material Source, mechanical or Design-suitability defect may proceed directly to selection; no revision quota exists.

A Provider pending/accepted revision is still Provider state. After explicit system-candidate selection, accept or reject the exact Provider revision only through a live structured method which preserves its identity. Provider acceptance never substitutes for the separate project Authority-adoption confirmation.

## Provider binding for downstream resources

For a new Open Design resource project, call MCP `create_project` with the adopted Provider ID in `designSystem` when the live schema supports it. Immediately call `get_project` and require `get_project.designSystemId` to match.

For an existing project, inspect `get_project` first. When binding is missing or mismatched, prefer a new bounded project with the correct binding if MCP exposes no safe update. Use a structured update only after feature-detecting it and preserving project identity. Never proceed with a style-bearing run while silently bound to another system.

In DSA `reconcile` mode, send only current Authority material needed for the proposed Token/component/pattern/motion/platform delta, the user-promoted non-authoritative assessment, immutable constraints, affected platforms, supporting resources and representative scenarios. Provider output remains a system candidate and cannot emit an effective `selected`, `adopted` or `authority_updated` decision.

## Failure semantics

Keep these observations separate:

- capability discovery: current, stale, partial, unavailable or incompatible;
- Provider route: `agent-authored`, `reference-intent-authoring`, `draft-only` or unavailable;
- execution: queued, running, succeeded, failed, cancelled, timed out or unknown;
- reference ingestion: unreadable, untransported, transported, runtime-capable, interpreted or unverified;
- candidate artifacts: missing, partial, retrievable, rendered, audited or corrupt;
- selection: unreviewed, selected, rejected or decision-required;
- project adoption: unchanged, partially adopted, adopted or inconsistent; and
- Provider binding: unverified, matched or mismatched.

Preserve exact diagnostics and stop bounded polling. Do not turn a schema field, successful job, uploaded reference, attractive preview, selected candidate or Provider-accepted revision into evidence for the next observation. Recovery re-discovers live capabilities and re-reads current run/artifact identities; it never restores a suitability or Authority conclusion from stale Provider state.
