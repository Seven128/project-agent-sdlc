# Implementation Feasibility Source

Read this reference only when DRA will commission or publish a Web/App implementation handoff against a real repository substrate. It makes implementation intent concrete without turning DRA into production architecture authority.

## Boundary

The canonical design resources and observable-Fact manifest remain the sole owners of exact selected design values. A separate `design-resource-implementation-feasibility-v1` JSON document records only Source-backed implementation possibilities, costs, risks and blockers. It must not copy colors, geometry, typography, motion values, content or other canonical design facts.

This document is ordinary technical Source:

- DRA may observe the current substrate and enumerate feasible realizations;
- DRA may not select a production owner or require one realization from preference alone;
- a `required_realization` needs an exact current marked `technical_obligation` Source Item decision;
- a planned logical owner needs an exact current marked `technical_obligation` Source Item authorization;
- every blocker needs an exact current marked `decision` or `external_confirmation` Source Item decision;
- Default Workflow chooses among still-allowed candidates in its Architecture Deliberation and implements through the real owner;
- Long-Task projects the document only through existing `task.source_paths`, Source claims, technical/surface bindings, Checks and Assertions; and
- preflight validates input closure only. It never proves that production uses the candidate, renders correctly or passes acceptance.

Create no implementation registry, readiness flag, workflow state, second Design Authority, new Gate or production acceptance record.

## Inspect real technical Source

Read repository-owned Source and code/config owners before the formal Provider commission. Record safe repository-relative path, media type, SHA-256, a resolvable whole-resource/JSON-pointer/Markdown-anchor/source-anchor locator and one or more roles. Ordinary observations and capability bases may use those locators. Planned-owner authorization, required-realization authority and blocker authority must instead use `{"kind":"source_item","value":"<marked-item-key>","text_sha256":"<current-normalized-item-digest>"}`. One current file may expose several distinct bounded locators; those records share its media type and digest, while duplicate path-plus-locator identities fail closed. Inspect all six substrate questions:

1. `platform`;
2. `framework_runtime`;
3. `ui_system`;
4. `token_theming_adapter`;
5. `component_owner_roots`; and
6. `route_owner_roots`.

For a native or mapped implementation, each question appears exactly once as `observed`, `not_applicable`, `decision_required` or `unavailable`. An observed value needs matching role-bearing Source and carries no reason; every non-observed disposition carries a concrete non-empty reason and no value. `platform`, `framework_runtime` and `ui_system` use `identifier`; `component_owner_roots` and `route_owner_roots` use `repository_paths`; `token_theming_adapter` may use either. Every repository path is repository-relative, currently exists without following a symlink/junction, remains inside the repository and is a directory. Existing component owners must fall within observed component roots, and downstream route bindings must fall within observed route roots. A `decision_required` or `unavailable` formal observation must reach at least one affected cell through a Source-backed blocker. `not_applicable` needs a non-empty reason but no blocker. Missing or conflicting material Source stays unresolved; do not infer it from the visual resource or create a speculative owner.

## Exact marked technical decisions

Put each authoritative feasibility decision inside its real marked Source Item as strict JSON:

```html
<!-- ty-design-feasibility-decision-v1 {"schema_version":"design-resource-feasibility-decision-v1","mode":"required_realization","target_ref":"target.main","component_family_ref":"family.button","condition_scope_sha256":"<applicability-digest>","realization_ref":"reuse-project-button"} -->
```

The one schema has three modes. `required_realization` carries `realization_ref`; `planned_owner_authorization` carries `owner_locator`; `feasibility_blocker` carries `blocker_ref`. Every projection also carries exactly `schema_version`, `mode`, `target_ref`, `component_family_ref` and `condition_scope_sha256`, with no unknown or duplicate JSON fields. V1 hashes canonical JSON of sorted condition refs. V2 uses the current canonical compiled SHA-256 of the symbolic profile region. That binds the decision to actual applicability rather than a renameable profile key.

The projection is not a new Authority. Authority is the current marked Source Item, its admitted kind, current file digest, current normalized-text digest and—under Long-Task—its exact Source Claim. Multiple non-conflicting projections may share one item; each required match is unique. A role such as `technical_authority`, an unrelated item in the same file or an imprecise path-level claim cannot substitute.

Keep the feasibility document and its technical Source outside the canonical design-resource dependency set. Preflight rejects either one when mixed into `resources` or the canonical manifest closure.

## Realization modes and condition partition

- `native_substrate`: realizations use the project's current UI substrate and owners.
- `mapped_substrate`: realizations map the selected design to another already authorized project substrate or adapter boundary.
- `reference`: descriptive only. Formal `implementation_web` and `implementation_app` targets cannot use it.

Treat the observed target platform and the exact condition profile as hard candidate-applicability boundaries. Browser HTML/CSS capability alone cannot support a native-App or React Native realization. An independent HTML phone frame for such a target is at most a `mapped_substrate` candidate when current capability Source proves the complete mapping; otherwise the affected family cell carries a blocker. Never relabel a renderable Web artifact as `native_substrate`.

Do not force one realization across platforms or profiles. Different platform/condition profiles for the same component family may carry different candidate sets, primitives, costs, risks or blockers, provided every cell remains exact and Source-backed.

V1 uses `explicit_conditions_v1`: profiles are non-empty, non-overlapping sets whose union equals the target's declared conditions. V2 uses `symbolic_regions_v2`: profiles must be reachable, pairwise disjoint and exhaustive over the target's reachable region. Never sample representative conditions or silently collapse a remainder.

## Complete family coverage

For every material `component_family × target × condition_profile`, author exactly one cell. Derive the family subject closure from the family subject plus direct `family_ref`/`instance_of_ref` seeds, then repeatedly add subjects whose `parent_ref`, `instance_of_ref` or `override_of_ref` points into the set until stable. Use a visited set so malformed cycles terminate. This includes instances, variants/overrides, Anatomy Parts, slots, primitives, text, icons, media and assets even when their own `family_ref` is null. Bind the cell to the complete matching canonical V1 Fact set or intersecting V2 Fact Rule set for that closure × target × profile applicability; neither omissions nor extras are legal. V1 uses the profile conditions, while V2 includes every Rule whose region intersects the profile region. Each cell contains at least one feasible realization or at least one Source-backed blocker; both may be present when a partial candidate still has a known blocking dependency.

A feasible realization records:

- an ordered, non-empty strategy drawn from `reuse_existing`, `compose_existing`, `extend_shared_component`, `theme_with_tokens` and `create_shared_component`;
- the actual primitive/component candidates it uses;
- one or more existing repository owner paths, or explicitly authorized planned logical owners;
- the supported customization surfaces from `theme_tokens`, `component_variant`, `primitive_props`, `composition`, `content_slot`, `icon_slot`, `behavior_slot` and `style_api`;
- Source references carrying both feasibility-basis and substrate-capability evidence; and
- observed costs and risks without invented scores or universal ranking.

Do not force one primitive, owner or single-step strategy. Composition and multi-primitive realizations are valid. Reuse is preferred only when it is genuinely feasible; creating or extending a shared component remains allowed when Source and scope support it.

A blocker names the exact family, target and condition profile, cites at least one exact `source_item` record with a matching `feasibility_blocker` projection, and explains why no complete realization is presently supported. The Source Item kind is `decision` or `external_confirmation`. Every blocker must be referenced by its cell and every cell without a candidate must reference a blocker. A partial candidate never cancels a blocker; resolution updates technical Source and feasibility before rerunning preflight rather than adding a passing result to stale blocker Source.

Run one exact-value-carrier check over every human free-text field: each substrate-observation reason, each observed cost, each observed risk and each blocker description. Hex/RGB/HSL colors, dimensions, CSS declarations/custom properties, typography, spacing, shadows and motion durations remain canonical-resource values and are forbidden here. Digests, repository paths, Source Item keys, logical primitive IDs and JSON Pointers are identities rather than prose carriers.

## Required realization authority

Leave `required_realization.realization_ref` null when technical Source merely permits alternatives. If current technical authority requires a specific candidate, set the exact candidate key and cite the unique matching `required_realization` projection. Every referenced planned logical owner similarly cites its unique `planned_owner_authorization` projection. The downstream Default Workflow still performs Architecture Deliberation and conformance.

An active Long-Task derives the actual selection without a new Contract field. Current component bindings must uniquely derive one allowed realization for each candidate-bearing cell. Match every candidate against current `surface_binding.component_binding_refs`: an existing owner matches an `existing` file binding target or carrier path; a planned owner matches a `planned` binding key or target and its exact authorization. A required cell must derive only its required candidate. An unrequired candidate-bearing cell must derive exactly one candidate; zero is missing and more than one is ambiguous. A blocker-only cell has no realization selection and proceeds directly to its exact blocking completion boundary. Every component binding ref must still be consumed by at least one current-target candidate-bearing cell, while sharing remains legal where every consuming cell allows that owner. Existing component and route bindings remain within the observed roots.

Each selected planned-owner authorization and each required-realization decision has an exact current `path#source-item-key` Source Claim; its file is in `task.source_paths`, its item digest matches, and its disposition reaches the current Outcome Claim or a Global Constraint. Each blocker item maps either to `decision_required`, which blocks compile, or to its existing target-blocking External Confirmation whose impact claims include an affected current-target Claim. Open blocker confirmation prevents `machine_accepted`. Same-file or path-only Claims never substitute.

## Handoff index and validation

Index one document per target in `technical_feasibility_inputs`:

```yaml
technical_feasibility_inputs:
  - key: dashboard-web-feasibility
    target_ref: dashboard-web
    path: design/handoffs/dashboard-web.feasibility.json
    media_type: application/json
    sha256: <sha256-of-current-bytes>
```

The JSON root uses `schema_version: design-resource-implementation-feasibility-v1` and contains `key`, `target_ref`, `realization_mode`, `source_records`, `substrate_observations`, `condition_model`, `component_family_cells` and `blockers`. Unknown fields, stale digests, unresolved locators, unsafe or non-directory owner roots, duplicate identities, wrong target/family/condition/Fact bindings, incomplete partitions, unresolved-observation omissions, unauthorized planned owners, unauthorized required realizations or unprojected blockers fail closed.

New V1 bundle publication requires exactly one valid feasibility input for every `implementation_web` or `implementation_app` target. Direct preflight keeps older handoffs readable: a missing field normalizes to an empty array and reports the explicit limitation `technical feasibility not declared`. Explicit V2 remains direct-preflight only and validates the same feasibility semantics through symbolic regions.

Passing bundle or preflight establishes only that the declared technical Source is current, internally complete and compatible with the formal input identities. Human preflight output says `Design resource handoff preflight valid`, reports input closure/input-cell-blocker counts and ends with `Production conformance: not evaluated`. Bundle output says `Design resource Source bundle published` and `Production readiness: not evaluated`. The compatible JSON `status: ready` means only that validation completed. Limitations or blockers do not create another status and do not by themselves change the zero exit code for structurally valid input. Report production-owner selection and production conformance separately.
