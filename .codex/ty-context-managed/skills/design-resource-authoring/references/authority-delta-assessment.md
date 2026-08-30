# Authority Delta Assessment

Run this lightweight assessment only after the task resource direction is selected and, for a formal Web/App handoff, its selected-source closure is stable. It asks whether the selected task design changes durable Design Authority. It is neither Proposal–Resource reconciliation nor an acceptance/adoption Gate.

## Bind the current Authority

Read the complete current project Design Authority closure. A new style-bearing or mixed handoff binds the exact `repository-closure` identity: `format_version`, root `DESIGN.md`, optional `design_system/authority.manifest.json`, closure digest and human revision diagnostic. Bundle format additionally requires the exact body-leading `<!-- ty-context-design-authority-format: bundle-v1 -->` declaration; marker/manifest mismatch is invalid rather than legacy. Legacy omission is only backward compatibility for a true unmarked one-file project. Never compare revision alone.

If the closure changed after resource selection, re-read it and reassess the selected task design. Do not reuse a stale assessment.

## Exactly three assessments

### `consistent_with_current_authority`

Use only when concrete current tokens/components/rules cover the selected task design and `observed_variances` is empty. Cite exact token keys, component keys and local Authority rule anchors. This is evidence-backed Agent judgment, not machine acceptance, and it does not invoke Design System Authoring.

### `task_local_variance`

Use for a deliberate deviation that must not silently become a system rule.

- A one-task deviation declares `durability: task_only` and `precedent: forbidden`. It may remain in the task handoff, creates no cross-task memory and is never reused as precedent.
- A reusable local rule declares `durability: cross_task_candidate` and one required Screen Contract owner. Before handoff, the user must explicitly update that owner, explicitly start Design System Authoring for a system-level rule, or abandon the durable claim. DRA changes neither owner automatically.

State scope, reason and affected current rule anchors. Do not accumulate ownerless exceptions.

### `authority_delta_candidate`

Use only when the selected task design proposes a reusable long-lived Token, component, pattern, motion or platform change. Produce a non-authoritative packet based on the exact current closure identity, with keyed proposed changes/rationales, supporting resource anchors and representative scenarios. At least one proposal and one representative scenario are required.

DRA stops after producing the packet. Tell the user to explicitly invoke `$design-system-authoring` in `reconcile` mode. DRA never invokes it, selects a system candidate or adopts Authority.

## Strict data boundary

When a replayable assessment file is warranted, use the package `design-authority-delta-assessment-v1` JSON shape and validate it read-only:

```text
ty-context design-resource authority-delta validate <assessment.json> --json
```

The codec accepts only:

- `consistent_with_current_authority` with concrete evidence and no variance;
- `task_local_variance` with exactly one durability branch;
- `authority_delta_candidate` with the complete proposed-change categories.

It rejects `status`, `passed`, `selected`, `adopted`, `authority_updated` and unknown fields. Validation proves structural integrity and current base identity only. It performs no write, selection, DSA invocation, adoption or production conformance.

## Handoff consequence

For `consistent_with_current_authority` and a valid task-only variance, return the assessment with the normal DRA handoff. A cross-task candidate blocks an unqualified durable-memory claim until its owner decision closes. An Authority delta candidate blocks system-adoption claims and waits for explicit DSA; the selected task resource may continue only as a user-approved task-only variance or after adoption/rebinding.

After a DSA adoption, bind the DRA handoff to the new complete closure identity and rerun affected preflight/resource verification before downstream handoff. Page/resource selection never implies system adoption.
