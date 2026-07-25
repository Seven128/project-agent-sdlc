---
context_role: contract
read_policy: on-demand
---
# Design Resource Handoff Adapter Contract

## Purpose And Boundary

One design-specific purpose of the Single-Goal Long-Task Workflow—and the corresponding outcome on the default Workflow path—is that Agent implementation, acceptance and testing fully conform to every material UI/UX fact selected design resources explicitly express within their declared scope and conditions.

This does not authorize inference from silence. A static frame does not imply an unshown interaction, and the workflow cannot prove that the user never omitted a requirement. An unexpressed fact must be added to Source, classified `not_applicable`/`excluded_by_scope`, or remain `decision_required`/`unavailable` and block fidelity work.

The causal chain has three owners:

1. **Canonical resources** own exact code-expressible layout, visual, content, control, state, interaction, motion, adaptation/input, accessibility and asset facts.
2. **`design-resource-handoff-v1`** is the residual scope, applicability, semantic and index adapter. It points to resource facts, adds product meaning/exclusions/unresolved items and binds them downstream; it does not retype every CSS value.
3. **Context, Contract, Checks and Final Gate/Contract Conformance** force consumption on the production owner and reject current-snapshot drift.

Open Design has demonstrated source-rich output (`index.html`, component/design specifications, tokens and asset manifests), but capability is not a per-run invariant. `design-resource-authoring` must explicitly commission, retrieve and freeze an implementation-level source before a Web/App handoff may pass.

The adapter connects upstream authoring to both development workflows. It creates no provider-specific schema, Design Authority, plan, registry, Claim kind, Gate, acceptance lifecycle or second source of truth.

## One Shared Handoff

- Exploration and unselected previews need no handoff or validator.
- A selected implementation handoff is one project-native Markdown Source at an authorized path, with readable marked Source Items and exactly one fenced `design-resource-handoff-v1` block.
- Immutable repository resources plus the handoff remain ordinary Source/verifier inputs. The editable upstream owner/locator/update route is recorded separately.
- `ty-context design-resource preflight <handoff.md>` is the sole shared input adapter: authoring runs it before `ready`, default Workflow reruns it before UI Authority Closure, and Long-Task Preflight/Compile reruns it before Authority Lock.
- No fixed directory, live provider, artifact count, one-file-per-control rule or screenshot Cartesian product is required.

## Implementation Source Profile

Every target declares one `source_profile`:

- `implementation_web`: canonical HTML/XHTML entry, all declared dependencies and `acquisition: complete`;
- `implementation_app`: a canonical machine-readable code/spec entry, all declared dependencies and `acquisition: complete`;
- `reference`: bounded non-Web/non-code resource input; it is not forced into HTML.

The canonical entry plus `dependency_resource_refs` must exactly equal the target's resource set. Every resource has an exact repository path, media type and SHA-256. For `implementation_web`, preflight also discovers local HTML/CSS/JS dependencies and rejects any path outside the frozen declared set. A PNG may be a derived visual baseline, but cannot be the sole implementation source for state, interaction, motion, adaptation or accessibility.

Before authoring may emit `ready`, it exercises every declared verification method against the canonical entry under the claimed conditions and cross-checks any fact repeated across code, specifications, tokens and asset manifests. A mismatch is refined or remains `decision_required`/`unavailable` with a blocker. The checked hashes make that source-QA conclusion stale when bytes change; it is not production conformance, and shared preflight deliberately does not pretend to be a universal browser/semantic comparator.

## Canonical V1 Meaning

The embedded block records:

- `scope`: stable scope key, style dependency, surface keys, necessary context and exclusions;
- `provenance`: provider/version, project/run, capability, agent/model and verified design-system binding;
- `resources`: stable role, path, media type, SHA-256 and editable-upstream route;
- `conditions`: platform, viewport, modes, states, content cases, input methods and motion mode;
- `subjects`: stable semantic keys plus the selected targets to which each subject applies;
- `targets`: interpretation, complete resource set, condition set, source profile and selection basis;
- `evidence`: kind, condition set and a typed local locator;
- `coverage`: explicit applicability cells, Source Items and verification methods;
- `acceptance_blockers`: target/subject/dimension plus Source Item and verification-method lineage;
- `proposal`: final proposal-reconciliation status/path/revision.

Supported typed locator kinds are deliberately bounded: `html_selector`, `markdown_anchor`, `json_pointer`, `css_selector`, `css_custom_property` and `whole_resource`. Shared preflight resolves each typed locator against its declared immutable resource. Unsupported selector syntax and prose placeholders fail rather than becoming opaque strings. Whole-resource locators are bounded to facts naturally carried by a complete binary/frame/asset; machine-readable semantic evidence cannot be relabeled as an image.

The eight dimensions are `surface_flow`, `visual_content`, `component_control`, `state_interaction`, `motion`, `adaptation_input`, `accessibility` and `assets`.

After grouped refs are expanded, every applicable **subject × target × condition × dimension** cell appears exactly once. Each cell is `covered`, `not_applicable`, `excluded_by_scope`, `decision_required` or `unavailable`. Covered cells require evidence from the same target and condition, real marked `requirement`/`control`/`acceptance` Source Items and dimension-compatible verification methods. Non-covered cells retain explicit applicability and rationale; `decision_required`/`unavailable` blocks `ready`.

## Fail-Closed Validation

Preflight rejects unknown fields, duplicate/unknown keys, unsafe paths, missing/stale files, digest mismatch, source-profile closure mismatch, undeclared Web dependencies, unsupported or absent locators, evidence/media/dimension substitution, unreferenced inputs, missing/duplicate applicability cells, cross-target/condition evidence substitution, unresolved cells and blocker lineage without matching covered facts.

Preflight proves semantic-input completeness, addressability and immutable resource integrity only. It does not judge taste, reproduce authoring's runtime/cross-resource source QA, prove verifier sensitivity or establish production conformance. The project verifier remains trusted within the Harness boundary, so mutation tests must demonstrate that each declared implementation method actually fails when its production fact is broken.

## Default Workflow Consumption

The default Workflow:

1. reruns preflight and opens every affected exact/constraint resource;
2. reconciles stable subject/target/condition keys through owning Surface/Screen/Control Context and `DESIGN.md`;
3. routes every covered Source Item and verification method to the production route/component owner and real root-entry journey;
4. verifies declared geometry/pixel/token/content, component state/interaction, motion, responsive/input, accessibility and asset obligations independently where applicable;
5. performs current-candidate Contract Conformance plus Context drift checking.

Resource presence, hash success, provider success, a screenshot or detached route cannot substitute for production checks.

## Long-Task Consumption

Long-Task Preflight/Compile requires each Contract `design_target` to match exactly one handoff target's key, interpretation, conditions and complete handoff/resource file set. The handoff is real `task.source_paths` Source; the handoff and every target entry/dependency are Check `verification_inputs`.

Covered Source Items map through `source_claims` into the root conformance Assertion. The exact set of handoff verification methods maps through `verification_method_bindings` to distinct positive Assertions in the same target Check; each method Assertion carries the relevant Source Claims and required typed capabilities. Runtime `design_conformance` records accept either the root Assertion or one of those explicit method bindings, so method-level failures remain independently attributable.

Each handoff acceptance blocker binds the same Source Items and verification methods in `surface_binding.acceptance_blockers`. A machine blocker must reference the corresponding target-local Claims; an external blocker must use a target-blocking External Confirmation whose impact includes those Claims. A matching key with unrelated proof is invalid.

Existing Controls/`surface_bindings`, production owners/root journey, Evidence Kernel, Counterfactual sensitivity, Authority Revision and one-snapshot Final Gate remain the only acceptance/lifecycle owners.

## Provider Selection Background

The default remains Open Design source-rich output plus the provider-neutral residual handoff and existing Final Gate.

- **Figma** is valuable when an existing Figma authority/team needs native Components/Variables/Variants, shared libraries, Dev Mode or Code Connect. It also introduces paid-seat/plan and MCP quota/authentication boundaries plus a second-representation synchronization cost, so it is optional rather than a default conversion target. See [pricing](https://www.figma.com/pricing/) and [MCP access/rate limits](https://developers.figma.com/docs/figma-mcp-server/rate-limits-access/).
- **Penpot** is a credible open/self-hosted collaborative platform with an open ZIP/JSON format and MCP. It is appropriate when self-hosted multi-user design infrastructure is itself required; otherwise service/plugin/open-file/deployment/backup operations and a second representation do not close a distinct workflow-enforcement gap. See [file format](https://help.penpot.app/technical-guide/developer/data-model/penpot-file-format/), [MCP](https://help.penpot.app/mcp/) and [self-hosting](https://penpot.app/pricing/self-host).
- **OpenPencil** is a useful MIT local static-design sidecar with CLI/MCP and HTML/CSS conversion. Its documented prototype flow/trigger/action/overlay/Smart Animate gaps prevent it from being the sole eight-dimension interaction/motion source today. See its [repository](https://github.com/open-pencil/open-pencil) and [compatibility roadmap](https://openpencil.dev/development/roadmap).

Any of the three may become an optional upstream adapter when the project has that real collaboration/authority need. Converting an already complete Open Design source into another format does not create missing information and never replaces handoff/Contract enforcement.

## Evolution And Ownership

V1 is strict and currently unreleased, so these stronger invariants replace its earlier permissive shape rather than creating a parallel V2. A genuinely new dimension, locator semantics or interpretation requires a versioned change; a provider tool-name/transport change does not.

Implementation owners are:

- parser, shape, addressability/source-profile/integrity/coverage validators and CLI: `packages/ty-context/src/lib/design-resource-handoff-*.ts` and `packages/ty-context/src/commands/design-resource.ts`;
- Contract schema/UI surface and Long-Task activation/runtime binding: `long-task-ui-surface-*`, `long-task-design-resource-handoff.ts`, Evidence Capability runtime/Playwright adapters and shared activation;
- authoring/consumer guidance: package-managed `design-resource-authoring`, UIUX/engineering and `long-task-workflow` Skills;
- deterministic input/Contract/runtime mutations: `tests/ty-context/design-resource-handoff*.mjs`, `long-task-delivery-compiler.test.mjs`, `long-task-playwright-ac-evidence.test.mjs` and guidance/parity suites.
