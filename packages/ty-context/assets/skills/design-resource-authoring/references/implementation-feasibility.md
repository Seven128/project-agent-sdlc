# Implementation Feasibility Source

Read this reference only when DRA will commission or publish a Web/App implementation handoff against a real repository substrate. It makes implementation intent concrete without turning DRA into production architecture authority.

## Boundary

The canonical design resources and observable-Fact manifest remain the sole owners of exact selected design values. A separate `design-resource-implementation-feasibility-v1` JSON document records only Source-backed implementation possibilities, costs, risks and blockers. It must not copy colors, geometry, typography, motion values, content or other canonical design facts.

This document is ordinary technical Source:

- DRA may observe the current substrate and enumerate feasible realizations;
- DRA may not select a production owner or require one realization from preference alone;
- a `required_realization` needs current `technical_authority` Source;
- a planned logical owner needs current `planned_owner_authorization` Source;
- Default Workflow chooses among still-allowed candidates in its Architecture Deliberation and implements through the real owner;
- Long-Task projects the document only through existing `task.source_paths`, Source claims, technical/surface bindings, Checks and Assertions; and
- preflight validates input closure only. It never proves that production uses the candidate, renders correctly or passes acceptance.

Create no implementation registry, readiness flag, workflow state, second Design Authority, new Gate or production acceptance record.

## Inspect real technical Source

Read repository-owned Source and code/config owners before the formal Provider commission. Record safe repository-relative path, media type, SHA-256, a resolvable whole-resource/JSON-pointer/Markdown-anchor/source-anchor locator and one or more roles. One current file may expose several distinct bounded locators; those records share its media type and digest, while duplicate path-plus-locator identities fail closed. Inspect all six substrate questions:

1. `platform`;
2. `framework_runtime`;
3. `ui_system`;
4. `token_theming_adapter`;
5. `component_owner_roots`; and
6. `route_owner_roots`.

For a native or mapped implementation, each question appears exactly once as `observed`, `not_applicable`, `decision_required` or `unavailable`. An observed value needs matching role-bearing Source and carries no reason; every non-observed disposition carries a concrete non-empty reason and no value. Use `repository_paths` for owner roots and an `identifier` plus optional version Source for named substrate elements. Missing or conflicting material Source stays unresolved; do not infer it from the visual resource or create a speculative owner.

Keep the feasibility document and its technical Source outside the canonical design-resource dependency set. Preflight rejects either one when mixed into `resources` or the canonical manifest closure.

## Realization modes and condition partition

- `native_substrate`: realizations use the project's current UI substrate and owners.
- `mapped_substrate`: realizations map the selected design to another already authorized project substrate or adapter boundary.
- `reference`: descriptive only. Formal `implementation_web` and `implementation_app` targets cannot use it.

Treat the observed target platform and the exact condition profile as hard candidate-applicability boundaries. Browser HTML/CSS capability alone cannot support a native-App or React Native realization. An independent HTML phone frame for such a target is at most a `mapped_substrate` candidate when current capability Source proves the complete mapping; otherwise the affected family cell carries a blocker. Never relabel a renderable Web artifact as `native_substrate`.

Do not force one realization across platforms or profiles. Different platform/condition profiles for the same component family may carry different candidate sets, primitives, costs, risks or blockers, provided every cell remains exact and Source-backed.

V1 uses `explicit_conditions_v1`: profiles are non-empty, non-overlapping sets whose union equals the target's declared conditions. V2 uses `symbolic_regions_v2`: profiles must be reachable, pairwise disjoint and exhaustive over the target's reachable region. Never sample representative conditions or silently collapse a remainder.

## Complete family coverage

For every material `component_family × target × condition_profile`, author exactly one cell. Bind the cell to the complete matching canonical V1 Fact set or intersecting V2 Fact Rule set for that family, its instances/parts and the profile; neither omissions nor extras are legal. Each cell contains at least one feasible realization or at least one Source-backed blocker; both may be present when a partial candidate still has a known blocking dependency.

A feasible realization records:

- an ordered, non-empty strategy drawn from `reuse_existing`, `compose_existing`, `extend_shared_component`, `theme_with_tokens` and `create_shared_component`;
- the actual primitive/component candidates it uses;
- one or more existing repository owner paths, or explicitly authorized planned logical owners;
- the supported customization surfaces from `theme_tokens`, `component_variant`, `primitive_props`, `composition`, `content_slot`, `icon_slot`, `behavior_slot` and `style_api`;
- Source references carrying both feasibility-basis and substrate-capability evidence; and
- observed costs and risks without invented scores or universal ranking.

Do not force one primitive, owner or single-step strategy. Composition and multi-primitive realizations are valid. Reuse is preferred only when it is genuinely feasible; creating or extending a shared component remains allowed when Source and scope support it.

A blocker names the exact family, target and condition profile, cites current Source, and explains why no complete realization is presently supported. Every blocker must be referenced by its cell and every cell without a candidate must reference a blocker.

## Required realization authority

Leave `required_realization.realization_ref` null when technical Source merely permits alternatives. If current technical authority requires a specific candidate, set the exact candidate key and cite role-bearing `technical_authority` Source. The downstream Default Workflow still performs Architecture Deliberation and conformance; an active Long-Task additionally requires the cited Source to be in `task.source_paths`, claimed, and the selected owner to match an existing technical or surface binding.

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

The JSON root uses `schema_version: design-resource-implementation-feasibility-v1` and contains `key`, `target_ref`, `realization_mode`, `source_records`, `substrate_observations`, `condition_model`, `component_family_cells` and `blockers`. Unknown fields, stale digests, unresolved locators, unsafe paths, duplicate identities, wrong target/family/condition/Fact bindings, incomplete partitions, unauthorized planned owners or unauthorized required realizations fail closed.

New V1 bundle publication requires exactly one valid feasibility input for every `implementation_web` or `implementation_app` target. Direct preflight keeps older handoffs readable: a missing field normalizes to an empty array and reports the explicit limitation `technical feasibility not declared`. Explicit V2 remains direct-preflight only and validates the same feasibility semantics through symbolic regions.

Passing bundle or preflight establishes only that the declared technical Source is current, internally complete and compatible with the formal input identities. Report production-owner selection and production conformance separately.
