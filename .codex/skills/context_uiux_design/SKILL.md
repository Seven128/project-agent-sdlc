---
name: context_uiux_design
description: Use when the user explicitly asks to establish, adopt or repair durable UI/UX Design Authority, DESIGN.md, design-system governance, visual tokens/rationale, adopted target interpretation, UI Authority Closure, selected-design alignment, or durable visual standards in a Minimal Context Harness project. Do not trigger for product/surface responsibility, design-resource generation, ordinary UI implementation, local CSS/UI fixes, copy edits, or an unselected visual exploration.
---

# Context UI/UX Design

## Ownership

Own durable Design Authority only: root `DESIGN.md`, visual identity and exact-value token source/generation direction, visual rationale, canonical adopted-target interpretation/selection basis, adoption records, UI Authority Closure and selected-design alignment.

This Skill does not own product goals/business rules/acceptance (`context_product_plan`), information/action/feedback and main/drilldown responsibility (`context_surface_contract`), resource generation (`design-resource-authoring`), implementation, or acceptance. Route rather than duplicate those owners.

Project-specific UI/UX rules may live in `<harnessRoot>/skills/uiux_design/SKILL.md`; durable facts remain in `DESIGN.md` and owning `project_context/**`. Active Long-Task retains its one Source/Contract lifecycle and Final Gate; this Skill contributes authority closure only.

## UI Authority Closure

1. Read core/default and owning surface/interaction Context, root `DESIGN.md`, its authored token source/generation direction, existing production route/components and every affected selected `exact-target` or `constraint` through its immutable locator. Run `ty-context design-resource preflight <handoff.md>` before treating a formal handoff as input.
2. Classify references as `exact-target`, `constraint` or `inspiration`. Inspiration authorizes no reproduction claim. Provider success, a hash/index or an implementation screenshot proves neither selection nor fidelity.
3. For every affected stable surface/control/target key, classify durable meaning as Context/`DESIGN.md` covered, requiring update, task-local, out of scope or decision-required. Conflicting, missing, stale, unreadable or unselected authority fails closed for the affected claim.
4. Confirm exactly one canonical adoption record per adopted target:
   - project/system/component-family targets are fully owned by `DESIGN.md`;
   - screen/interaction targets are fully owned by the owning Screen Contract, with `DESIGN.md` keeping only the stable key and owner/anchor;
   - the record preserves interpretation, selection basis, immutable path/URI and digest, applicable conditions and editable upstream owner/locator/update route.
5. Never overwrite an adopted baseline. Create a new immutable version/digest, review it deliberately and update the unique canonical record. An implementation render/diff is evidence and cannot become the target it claims to match.
6. Decide exactly one `Context Delta: none|required`. Durable visual-system, token, rationale, adopted interpretation, owner/anchor or verification-route change is `required`; ordinary UI/CSS fixes that preserve authority are `none`.
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
