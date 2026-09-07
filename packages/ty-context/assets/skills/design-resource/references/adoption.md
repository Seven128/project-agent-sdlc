# Adoption and Context ownership

Use the existing owner and manifest mechanisms. Adoption changes the project's implementation requirements only within its confirmed scope; it is not a new registry, approval workflow or task state machine.

## Current basis and scope

A candidate is an exploration. A preferred direction guides further work. An adopted resource is a current requirement within its declared scope. A newer file, generation success or attractive preview cannot make that decision. Use the user's existing authorization; do not ask again for an already approved adoption. If adoption is undecided, retain the current basis and report the candidate without silently changing requirements.

The affected Context owner keeps the current entry, object and applicable platform, component or region, state and theme, as needed to distinguish it from other requirements. One scope has one current basis; an entry may map several nonconflicting scopes to different resources. Partial adoption replaces only the affected scope and preserves the remaining valid references. Shared component resources belong to the shared owner; page owners link there instead of repeating its rules.

Resolve affected authority conflicts as part of authorized adoption. Business meaning, shared design rules, accessibility and platform constraints retain their respective owners. Update superseded decisions and stale navigation within scope; neither an image nor an old rule silently overrides the others. Distinguish an approved requirement from an implementation that has not yet caught up. If the decision needed to resolve a conflict is not authorized or clear, explain that conflict and preserve the unresolved requirement rather than fabricating agreement.

## Resource location and entry

Use an existing equivalent layout when present. This is an example, not required scaffolding:

```text
project_context/areas/<area>/<owner>.md
docs/design-resources/<surface>/<component>/
  ADOPTED.md                  # Current entry mapping resources to scopes
  adopted/<resource>/
    README.md                 # Opening, coverage, behavior, comparison conditions
    source/                   # Available editable sources or prototype
    reference/                # Current visual or motion references
    assets/                   # Necessary assets and origins
  candidates/<run>/           # Exploration and revision material when needed
```

The names, folders and local-file layout are optional. Stable external project links are valid resources; preserve available exports when needed to reduce access or remote-change risk. Do not imply a local export is editable or that it matches the current remote version without checking.

Context holds durable adoption references, scope, confirmed decisions, reasons and authority boundaries. Source files, images, videos, asset lists, prompts, generation history and comparison evidence stay with resources or task material. Task progress and implementation migration notes stay task-local. Global Context needs only useful brief navigation; resource directories do not become default Context because an owner links to them.

## Reuse the existing source declaration

An existing component or feature owner may include this declaration and prose, adapted to the project's actual scope:

```markdown
<!-- ty-context-controlling-source domain="design" path="docs/design-resources/web/results/ADOPTED.md" -->

The current result-list composition and assets are requirements for desktop,
light theme and populated results, through the entry above. This owner retains
business and state meaning; shared visual rules belong to the existing shared
design owner. Other regions, themes and states retain their current requirements.
```

The path is repository-relative and names a local UTF-8 entry, not an image or design binary. Register the owner only as needed using the existing manifest. Declare a shared entry once in its owning Context; other owners link that owner, since duplicate declarations of the same target are diagnosed even within the same domain. Ordinary historical or candidate links are not controlling declarations. A required local text dependency can be explicitly declared from Context; links or declarations inside a resource entry outside Context are not recursively validated. Media files and remote resources require the appropriate explicit checks when the task needs them.

Development follows defaults and affected owners to the current entry, then reads relevant sources and behavior notes and actually views the current visuals. Scope does not depend on the user saying a trigger keyword. Missing current inputs are reported as specific missing constraints, never reinterpreted as an unconstrained design. Access limitations can leave a portion unverified while independent work continues.

## Implementation and evidence boundary

Within the adopted scope, implement faithfully in the target runtime and compare the actual UI and relevant behavior under the entry's material comparison conditions. Check owned layout, typography, colors, icons, assets and interaction as relevant. Report and resolve platform limitations and conflicts. Ordinary fixes follow existing adopted resources; authorized design changes update resources and their owners. Never revise design requirements just to make current code pass a comparison.

`validate-context` checks declared local paths, canonical identities, safety, UTF-8 readability and supported ownership conflicts. It does not recursively load images or prototypes, check remote access, run design tools, infer natural-language scope collisions or establish resource-bundle completeness. Overlapping design scopes need review; existing duplicate/domain diagnostics concern declarations of the same target, not semantic design agreement.

Neither these files nor a successful check prove user approval, agent viewing, a preview's correspondence to current code, aesthetic quality, working interaction or production completion. Report the actual resource and implementation checks separately. Do not add a design preflight, fixed handoff document, hash gate or completion certificate.
