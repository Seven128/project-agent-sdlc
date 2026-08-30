# Design-System Authority Adoption

Adopt one explicitly selected Open Design result through existing Minimal Context owners. This is a reconciliation step, not a new authority lifecycle.

## Preconditions

- Selection is explicit, or the user explicitly delegated selection and the stated criteria support one defensible choice.
- After seeing the selected candidate's exact project diff and migration impact, the user separately and explicitly confirmed Authority adoption. Page/resource approval and system-candidate selection are insufficient.
- The current complete project Authority closure identity is readable and still matches the candidate base. A stale `reconcile` packet returns to DRA assessment.
- The exact provider design-system ID and selected revision/body are readable.
- `DESIGN.md`, optional sparse manifest/subordinate owners, generated token artifacts and relevant preview/workspace files have been inspected.
- The selected content has a stable digest or user-approved snapshot.
- Conflicts with product/surface Context are resolved or remain an explicit decision; provider output never silently overrides product meaning.

## Single-owner writeback

Use these owners:

- `project_context/**`: durable surface responsibility, information hierarchy, navigation, stable interaction/state, product accessibility requirements and repeatable verification entrypoints;
- root `DESIGN.md`: unique Authority entry/revision owner, visual principles, supported front-matter exact Token authority and the canonical body-leading `<!-- ty-context-design-authority-format: bundle-v1 -->` bundle declaration;
- sparse `design_system/**` subordinate owners: only real reusable component/pattern/motion/platform rules, indexed from the entry;
- `design_system/tokens.json`: deterministic generated DTCG output from `DESIGN.md`, never independently authored;
- `design_system/authority.manifest.json`: complete closure membership and digest only, never revision, direction or Token values;
- selected authored targets: concrete composition/condition coverage, kept as ordinary versioned project Source.

Do not copy the same fact into several owners. Open Design metadata is provenance only.

## Adoption procedure

1. Inspect the complete current closure and preserve its identity as the adoption CAS base. Read the project's `DESIGN.md` format and lint expectations. Preserve valid project-specific content unless the user explicitly authorized replacement.
2. Reconcile selected provider semantics against controlling Context. Provider-invented business, permission, data or algorithmic rules are excluded unless independently authorized by product Source.
3. Write selected system semantics and exact Token values into root `DESIGN.md`. When adopting or retaining bundle format, place the exact `<!-- ty-context-design-authority-format: bundle-v1 -->` declaration on the first non-empty Markdown body line after supported YAML front matter. Add or revise a subordinate owner only for an actual reusable durable rule; do not scaffold an empty taxonomy. Avoid style-only adjectives without implementation meaning.
4. Record provider provenance in a normal `DESIGN.md` section unless the format explicitly permits metadata fields. Include provider name/version, design-system ID, selected revision when applicable, selection basis, immutable source/snapshot locator and SHA-256 digest, plus the editable upstream owner/locator/update/export route. State that project files are canonical.
5. Update only relevant Context when durable surface/interaction/verification facts changed. Use stable surface/control/target keys to make every adopted decision-relevant target Context-reachable without duplicating the visual prose.
6. Deterministically project DTCG `design_system/tokens.json` from the adopted `DESIGN.md`; never hand-edit generated Token values. The read-only `ty-context design-authority tokens --from-entry` command may project while the old bundle digest is intentionally stale. Create/update the sparse manifest together with the canonical marker, without revision or Token semantics, calculate the canonical complete-closure digest and make a second current-base check immediately before writeback. A deliberate bundle-to-one-file adoption removes both marker and manifest in the same explicit Authority Revision; never leave either half orphaned.
7. Put concrete selected targets in project-native versioned paths selected by the user or existing convention. Never silently choose a repository directory merely because Open Design has a mutable workspace. Never overwrite an adopted selected-resource baseline in place; create a new immutable version/digest and update its owner.
8. Inspect the new closure and require its claimed digest, generated Tokens, links, file identities and extra-file policy to validate. Rebind affected DRA handoffs/resources to the new identity and rerun their affected preflight/representative verification.
9. Accept the selected provider revision if one exists, then re-read the MCP resource and compare identity/body or digest with the adopted selection.
10. Verify downstream project binding by creating or reading a provider project with the selected ID. Provider mismatch is synchronization drift, not evidence that project Authority is absent.

## Validation

Run the repository-owned Design Authority lint, Context validation and token generation/check paths. At minimum confirm:

- `DESIGN.md` is no longer an unconfigured starter;
- root `DESIGN.md` is the sole revision and editable exact-Token owner;
- the exact bundle marker is the first non-empty Markdown body line and exists if and only if the sparse manifest exists;
- generated `tokens.json` exactly matches deterministic projection;
- the sparse manifest contains only complete closure membership/digest and the claimed closure validates;
- provenance points to the selected provider ID/revision/digest;
- each adopted target has a readable immutable locator and a verified editable upstream/update route or an explicit manual/external-update boundary;
- no competing design-system authority or duplicate token owner was introduced;
- MCP can read the provider design system;
- a downstream Open Design project reports the matching `designSystemId`;
- candidate resources remain candidates unless independently selected.
- affected DRA handoffs bind the new closure identity and their current validation was rerun.

Report changed owners and validation results. Do not claim production visual acceptance from these checks.
