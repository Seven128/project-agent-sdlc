# Default Skill Governance

Use this reference whenever a package-managed default Skill's trigger, workflow, output boundary, Context decision or inter-Skill routing changes.

## Ownership

- `context_product_plan` owns goals, scope, users, business/product rules, user flows, product feedback and acceptance meaning. It routes durable Product Surface responsibility to `context_surface_contract`; it is not the surface compiler.
- `context_surface_contract` is the sole owner of durable main/drilldown/surface responsibility, information/action/feedback placement and cross-surface ownership. It does not own visual values, resource generation, implementation acceptance or a Gate.
- `context_uiux_design` owns durable Design Authority: root `DESIGN.md`, tokens, visual rationale, adopted target interpretation, adoption records, UI Authority Closure and selected-design alignment. It routes surface responsibility to `context_surface_contract` and resource creation to `design-resource-authoring`; it does not generate resources.
- `context_development_engineer` adds explicit engineering-design/architecture judgment to the default Workflow Contract. It is not a generic coding trigger, implementation runner, agent allocator or second plan.
- `design-resource-authoring` commissions task-local resources and prepares a selected implementation handoff. It owns neither Design Authority nor product acceptance.
- `long-task-workflow` alone owns Long-Task lifecycle, Source/Contract machine authority and Final Gate when explicitly selected or validly resumed.

## Trigger discipline

Descriptions are executable routing policy. Prefer narrow, explicit intent over role names or ubiquitous verbs. Generic `implement`, coding, bug-fix, refactor, package/release, `subagent`, `multi-agent` and role-only mentions must not activate the development design Skill. Resource generation, durable authority adoption, surface ownership and ordinary implementation route to their respective owners.

When triggers change, update the managed source, installed/package copies through source sync, root routing language if applicable, `PROJECT_SPEC.md` design reason/anti-goals, owning Context and activation/negative tests. Every localized trigger needs an equivalent narrow English trigger.

## Project-local specialization

Consumer customization uses separate project-local Skills such as `<harnessRoot>/skills/product_plan/SKILL.md`, `<harnessRoot>/skills/uiux_design/SKILL.md` and `<harnessRoot>/skills/development_engineer/SKILL.md`. The repo-local Skill is more specific; durable facts still live in Context. Never ask users to edit generated managed copies or restore `ty-context-managed/override_skills` merging. Keep local and default front-matter triggers aligned when a project intentionally specializes them.

## Design sync and boundaries

For any stable user-visible Skill semantic change, synchronize the causal design and anti-goals in `PROJECT_SPEC.md`, durable current facts in owning Context, public READMEs, managed source, package assets and tests. A wording-only or source-workspace-only authoring change may stay local only when that classification is explicit and true.

Default Skills must preserve the shared Workflow Contract rather than restating it as a competing lifecycle. They may add role-specific judgment, but cannot create required `plan.md`, matrices, verdicts, evidence ledgers, phase gates, role-specific acceptance, or another Context/Source authority. Active Long-Task keeps exactly one lifecycle and Final Gate; role Skills contribute domain judgment only.

Product, UI/UX and engineering Skills must keep current code as implementation truth and Context/`DESIGN.md` as intended durable truth. Test output and generated screenshots are evidence, never durable authority. Each handoff reports one Context status and separates implemented, verified, unverified and decision-required scope.
