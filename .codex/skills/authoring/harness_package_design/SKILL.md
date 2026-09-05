---
name: harness_package_design
description: Use only in this repository when changing Project Tiny Context Harness workflow rules, Minimal Context package distribution, source sync, validators, release automation, delivery benchmarks, authoring overlay, or the Long-Task mechanism's time, size, performance, total cost, simplification, optimization, or efficiency（包括长程任务机制过慢、耗时、体积、性能、成本、简化、优化、效率或防劣化）. Do not use merely because an ordinary consumer-project task is long, large, or slow.
---

# Harness Package Design Authoring

Maintain this repository as the source workspace for Project Tiny Context Harness. The product keeps `project_context/**` as the smallest durable project fact source, supplies the automatically applicable default Workflow Contract, and optionally supplies one Single-Goal Long-Task authority path. Harness maintains Context and workflow mechanisms; project code, tests, runtime evidence, CI and human acceptance prove product quality.

This authoring Skill is repository-local. Never copy `.codex/skills/authoring/**` into consumer package assets. A rule that belongs in every consumer must reach its actual managed source, package asset, public guidance, Context and tests through the normal source-sync path.

## Effect-first Long-Task mechanism checkpoint

For every request to shorten, simplify or optimize the Long-Task mechanism, first freeze the reproducible incident and name the exact false-completion path that must stay closed. Before choosing by cost, enumerate the allowed solution set, must-allow controls, proof owner and current-final-snapshot check, select the structural comparator, and apply the Scope / Cost Drift Stop below. Preserve coverage, false-negative resistance, fail-closed Authority, semantic granularity and the admitted trust boundary first; when supported, prefer an existing compact or otherwise proof-equivalent representation over semantic deletion or a new control plane. This checkpoint governs changes to the Harness mechanism, not ordinary consumer implementation work that merely takes a long time.

## Always establish

1. Follow root `AGENTS.md`; read core Context, the default area and triggered owning Context before deciding the change.
2. Separate current implementation truth from intended product truth. Index the real owner, managed source, generated/install surface, package asset, public docs, tests, migration and release impact. Do not patch only the first failing copy.
3. Before the first implementation edit, surface the repository-bound Architecture Deliberation required by the default Workflow Contract and choose exactly one `Context Delta: none|required`. Durable mechanism or distribution meaning is normally `required` and reaches owning Context before code.
4. Preserve Minimal Context: no stage artifact chain, second Authority, second plan, second Gate, lifecycle, scheduler, registry or persistent orchestration state unless an explicit project-owner decision changes that boundary.
5. Keep public package surfaces English-complete. Non-English triggers/examples are additive and require an equivalent narrow English path plus drift coverage.
6. Make mechanism changes in the mechanism owner and prove them with current-candidate project checks. Documentation and tests cannot jointly redefine absent runtime behavior.

## Scope / Cost Drift Stop

During Long-Task mechanism work, refresh Architecture Deliberation and stop expansion immediately if an unplanned runtime owner, Schema/Authority/Gate/persistent state, benchmark/fixture/suite/lane, another independent PR, test/proof system larger than the core change, order-of-magnitude diff growth, duplicated semantic owner or ROI-governance cost greater than the cost being removed appears. Classify the affected work `keep | shrink | defer | remove` and return scope to the original Goal before continuing. This is an existing deliberation refresh rule, not a Gate, artifact or workflow state.

## Progressive references

Read only the references relevant to the change, but read every selected reference completely:

- [package-surface-and-sync.md](references/package-surface-and-sync.md) — package/managed/source mappings, placement, Context routing, cross-platform sync and public-surface parity.
- [default-skill-governance.md](references/default-skill-governance.md) — default Skill ownership, trigger discipline, project-local overrides and role-boundary changes.
- [long-task-mechanism-admission.md](references/long-task-mechanism-admission.md) — any Long-Task Source/Contract/runtime/Hook/profile/proof/quality/freedom-boundary change.
- [migration-and-release.md](references/migration-and-release.md) — `sync`, `upgrade`, migrations, release metadata/automation, compatibility cleanup or Git release convergence.
- [test-and-benchmark-governance.md](references/test-and-benchmark-governance.md) — tests, rerun policy, source parity, consumer/tarball smoke, benchmarks and final verification.

For a cross-cutting delivery, multiple references apply. Reference routing changes instruction loading only; it creates no phase, artifact, state or second authority.

## Stable placement rules

- `AGENTS.md`: startup routing, hard boundaries, Context entrypoints and shortest verification entry only. Prefer compression/replacement; 40–70 lines remains a soft budget, never a validator.
- `PROJECT_SPEC.md`: stable design purpose, causal mechanism reasoning, alternatives, anti-goals and concise history—not an operational runbook.
- `project_context/**`: this repository's durable current ownership, architecture, contracts, rationale, verification and deployment facts.
- package-managed Skills: portable role/workflow behavior. Project-specific role rules belong in separate project-local Skills.
- README/package README: human-facing installation, usage, CLI and compatibility behavior.
- code/tests: current implementation and attributable proof.

Historical stage notes may remain only as history in `PROJECT_SPEC.md`; never restore them as package capability, migration input, benchmark evidence or default fixture.

## Handoff

After the last relevant change, sync/check every affected generated surface, run focused and affected checks followed by the required current-candidate gate, perform Engineering/Architecture Conformance and the separate Context drift check, and report exactly one Context status. Do not claim package, release or product acceptance from prose or Context alone.
