---
name: context_uiux_design
description: Use when the user explicitly asks to establish, adopt or repair durable UI/UX Design Authority, DESIGN.md, design-system governance, visual tokens/rationale, adopted target interpretation, UI Authority Closure, selected-design alignment or durable visual standards; or when actual task content requires material UI/UX analysis or audit for a new page/flow/complex control, information hierarchy, fixed/scroll/overlay/sheet/sidebar/modal topology, map/canvas/editor work, primary task and feedback loop, client adaptation, navigation/recovery/states or accessibility in a Minimal Context Harness project. Do not trigger merely for product/surface responsibility, design-resource generation, ordinary local UI implementation, CSS/copy/icon/image fixes, local exact-target alignment, a single-control visual preview or an unselected visual exploration.
---

# Context UI/UX Design

## Ownership

Own durable Design Authority only: root `DESIGN.md`, visual identity and exact-value token source/generation direction, visual rationale, canonical adopted-target interpretation/selection basis, adoption records, UI Authority Closure and selected-design alignment.

This Skill does not own product goals/business rules/acceptance (`context_product_plan`), information/action/feedback and main/drilldown responsibility (`context_surface_contract`), resource generation (`design-resource-authoring`), implementation, or acceptance. Route rather than duplicate those owners.

Project-specific UI/UX rules may live in `<harnessRoot>/skills/uiux_design/SKILL.md`; durable facts remain in `DESIGN.md` and owning `project_context/**`. When a valid Long-Task binding is active, `long-task-workflow` alone owns Source/Contract lifecycle, formal verification, Final Gate and completion. This Skill may contribute non-authoritative task-level UI/UX analysis and Design Authority closure, but creates no second plan, lifecycle, Authority, Gate or acceptance path.

## Task-level analysis adapter

For a material task-analysis trigger, read [task-uiux-analysis.md](references/task-uiux-analysis.md) completely and apply only the relevant methods. This adapter is non-authoritative: Product/Surface/Screen Source owns the user, page duty, primary task/work object, information/action/feedback and interaction-topology facts; this Skill still owns durable Design Authority only. The current Goal may compare and select implementation candidates under those constraints. A conflicting candidate cannot proceed to resource generation or implementation until the stale owner is authoritatively updated or a genuine decision is obtained.

## UI Authority Closure

1. Read core/default and owning surface/interaction Context, root `DESIGN.md`, its authored token source/generation direction, existing production route/components and every affected selected `exact-target` or `constraint` through its immutable locator. Run `ty-context design-resource preflight <handoff.md>` before treating a formal handoff as input.
2. Classify references as `exact-target`, `constraint` or `inspiration`. Inspiration authorizes no reproduction claim. Provider success, a hash/index or an implementation screenshot proves neither selection nor fidelity.
3. For every affected stable surface/control/target key, classify durable meaning as Context/`DESIGN.md` covered, requiring update, task-local, out of scope or decision-required. Conflicting, missing, stale, unreadable or unselected authority fails closed for the affected claim.
4. Confirm exactly one canonical adoption record per adopted target:
   - project/system/component-family targets are fully owned by `DESIGN.md`;
   - screen/interaction targets are fully owned by the owning Screen Contract, with `DESIGN.md` keeping only the stable key and owner/anchor;
   - the record preserves interpretation, selection basis, immutable path/URI and digest, applicable conditions and editable upstream owner/locator/update route.
5. Never overwrite an adopted baseline. Create a new immutable version/digest, review it deliberately and update the unique canonical record. An implementation render/diff is evidence and cannot become the target it claims to match.
6. Decide exactly one `Context Delta: none|required`. Skill activation, analysis, audit or candidate comparison alone authorizes no durable write. Durable visual-system, token, rationale, adopted interpretation, owner/anchor or verification-route change is `required`; ordinary UI/CSS fixes that preserve authority are `none`. When product/UI implementation is already authorized and the current Goal independently finds a durable Surface/Screen change, update the smallest owning Surface Context before code or return `decision-required`.
7. Route unresolved surface placement to `context_surface_contract`; route any request to generate/iterate a wireframe, prototype, visual candidate, state study or handoff to `design-resource-authoring`. Do not invoke resource generation implicitly.

## Selected-design alignment

For a selected implementation handoff, consume the actual canonical resource and its dependency/Fact closure; do not stop at an index or aggregate `complete` label. Preserve exact located values and design-system lineage through stable keys rather than duplicating them into Context.

An `exact-target` claim requires condition-specific full-target layout and pixel comparison through a project-owned Oracle; a named constraint requires proof of that constraint only. Validate affected state, viewport/platform, theme/mode, content stress, accessibility/input and motion conditions declared by Source. Never replace declared combinations with representative/pairwise sampling unless Source narrows scope or a project-owned complete equivalence proof exists.

Implementation conformance runs on the real production route/component and affected cold-start journey after the final change. Detached specimens and deep links are supplemental. Report conditions not established; resource integrity/preflight is not production conformance, and screenshot baseline replacement merely to erase a failure is forbidden.

## DESIGN.md boundary

Use Google `@google/design.md` compatible structure: supported YAML tokens plus Markdown rationale. Maintain Design Authority status, one authored exact-value token source/generation direction and the canonical records owned at project/system/component-family scope. Do not add unsupported front-matter keys or duplicate exact values already owned by a project-native token source.

If available after a change, run `npx @google/design.md lint DESIGN.md`. Exported CSS/theme files are generated implementation outputs, not competing authored truth.

Missing/unconfigured authority blocks invented style-bearing production design. Only an explicit request to initialize/generate/select/adopt the project design system routes to `design-system-authoring`; local fixes and explicit non-fidelity prototypes remain lightweight.

## Output

Report affected authority owners/keys, selected resource classification and condition coverage, immutable/editable provenance, closure/update decisions, implementation-alignment checks, unresolved claims and `Context: updated ...` or `Context: no durable fact change`.

Do not create a UI lifecycle, resource pack, Product Surface Contract, acceptance record, fixed plan/matrix, phase or second Authority/Gate. Do not write one-time screenshots, test logs, debug notes or implementation summaries into Context/`DESIGN.md`.
