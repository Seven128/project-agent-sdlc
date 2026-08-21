# Default Skill Governance

Use this reference whenever a package-managed default Skill's trigger, workflow, output boundary, Context decision or inter-Skill routing changes.

## Ownership

- `context_product_plan` owns goals, scope, users, business/product rules, user flows, product feedback and acceptance meaning. It routes durable Product Surface responsibility to `context_surface_contract`; it is not the surface compiler.
- `context_surface_contract` is the sole owner of durable main/drilldown/surface responsibility, page duty, information/action/feedback placement, Screen/Control behavior and interaction topology. It does not own visual values, resource generation, implementation acceptance or a Gate.
- `context_uiux_design` owns durable Design Authority: root `DESIGN.md`, tokens, visual rationale, adopted target interpretation, adoption records, UI Authority Closure and selected-design alignment. Its on-demand task-analysis method is available under the Default Workflow and a valid Long-Task binding for non-authoritative UI/UX judgment under controlling Product/Surface/Screen Source, but creates no task-level durable owner. With a valid binding, `long-task-workflow` alone owns Source/Contract lifecycle, formal verification, Final Gate and completion; the UI/UX Skill may also contribute Design Authority closure but creates no second plan, lifecycle, Authority, Gate or acceptance path. It routes surface responsibility to `context_surface_contract` and resource creation to `design-resource-authoring`; it does not generate resources.
- `context_development_engineer` adds material engineering-design/architecture judgment to the default Workflow Contract when task content actually requires owner/source-of-truth, boundary, alternative, lifecycle, recovery or quality reasoning. It is not a generic coding trigger, implementation runner, agent allocator or second plan.
- `design-resource-authoring` commissions task-local resources and prepares a selected implementation handoff. Page/flow/complex-control commissions consume controlling Product/Surface/Screen Source for target user/context, client/host, page duty, primary task outcome, primary work object/task loop, operation-object-feedback and applicable state/recovery/accessibility meaning. They separately consume `DESIGN.md` and selected exact-target/constraint Source for visual-system and selected-design conditions. Non-authoritative task-level UI/UX analysis may inform candidate comparison but cannot supply missing product or surface meaning; a Provider cannot infer that meaning from a feature list, screenshot, route tree, component inventory or analysis output. The Skill owns neither Design Authority nor product acceptance.
- `long-task-workflow` alone owns Long-Task lifecycle, Source/Contract machine authority and Final Gate when explicitly selected or validly resumed.

## Trigger discipline

Descriptions are executable routing policy. Route by the material content of the task, not only by an explicit Skill name and not by role names or ubiquitous verbs. Generic `implement`, coding, bug-fix, refactor, package/release, `subagent`, `multi-agent` and role-only mentions must not activate the development design Skill merely by themselves; a request whose actual substance requires material architecture, API/data/state/lifecycle, dependency, complex-alternative, concurrency/recovery, external-integration, shared-abstraction, performance, security, compatibility/migration or architecture-audit judgment may activate it even when phrased as implementation. Small explicit-owner changes, tests, documentation and styling remain lightweight.

Material new-page/flow/complex-control, information hierarchy, interaction topology, task/feedback loop, client adaptation, navigation/recovery/state/accessibility or UI/UX audit content may activate the UI/UX Skill's non-authoritative task-analysis reference. Local CSS/copy/icon/image changes, local exact-target alignment and a single-control visual preview remain lightweight unless durable Design Authority or Surface responsibility is actually at issue. Resource generation, durable authority adoption, surface ownership and ordinary implementation still route to their respective owners.

When triggers change, update the managed source, installed/package copies through source sync, root routing language if applicable, `PROJECT_SPEC.md` design reason/anti-goals, owning Context and activation/negative tests. Every localized trigger needs an equivalent narrow English trigger.

Frontmatter and static tests can establish routing text, positive/negative analysis rules and distribution parity. They do not prove that a host actually activated a Skill, that a model produced high-quality architecture/UI decisions, or that the change improved runtime cost or ROI. Such claims require separate attributable observation and remain unverified otherwise.

## Context write authorization

Skill activation is never edit authorization. Audit, analysis, candidate comparison and resource exploration do not write durable Context by default. When the user already authorized product/UI implementation and the current Goal independently decides `Context Delta: required`, it may update the smallest owning Product Surface/Screen Context before implementation. A conflict between a task-local candidate and controlling Product/Surface/Screen/Design Source blocks that candidate until the stale owner is authoritatively updated or a genuine decision is obtained.

## Project-local specialization

Consumer customization uses separate project-local Skills such as `<harnessRoot>/skills/product_plan/SKILL.md`, `<harnessRoot>/skills/uiux_design/SKILL.md` and `<harnessRoot>/skills/development_engineer/SKILL.md`. The repo-local Skill is more specific; durable facts still live in Context. Never ask users to edit generated managed copies or restore `ty-context-managed/override_skills` merging. Keep local and default front-matter triggers aligned when a project intentionally specializes them.

## Design sync and boundaries

For any stable user-visible Skill semantic change, synchronize the causal design and anti-goals in `PROJECT_SPEC.md`, durable current facts in owning Context, public READMEs, managed source, package assets and tests. A wording-only or source-workspace-only authoring change may stay local only when that classification is explicit and true.

Default Skills must preserve the shared Workflow Contract rather than restating it as a competing lifecycle. They may add role-specific judgment, but cannot create required `plan.md`, matrices, verdicts, evidence ledgers, phase gates, role-specific acceptance, or another Context/Source authority. Active Long-Task keeps exactly one lifecycle and Final Gate; role Skills contribute domain judgment only.

Product, UI/UX and engineering Skills must keep current code as implementation truth and Context/`DESIGN.md` as intended durable truth. Test output and generated screenshots are evidence, never durable authority. Each handoff reports one Context status and separates implemented, verified, unverified and decision-required scope.
