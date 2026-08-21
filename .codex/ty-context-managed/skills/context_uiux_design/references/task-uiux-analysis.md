# Task-Level UI/UX Analysis

Use this non-authoritative reference only for material UI/UX reasoning or audit. It helps the current Goal understand and compare candidates; it does not own product meaning, page duty, information/action/feedback placement, interaction topology, Design Authority, resources, implementation or acceptance. Product/Surface/Screen/Design Source remains controlling.

## 1. Recover the user and operating context

Read the available product and Surface/Screen Source before evaluating layout. Identify only what is authoritative or explicitly task-local:

- target user or role and usage context;
- primary task outcome and success feedback;
- client/host/platform, input mode, viewport/size class and environmental constraints;
- current page/surface duty and entry/exit context;
- permissions, data/state, recovery and accessibility constraints; and
- affected exact targets, constraints and inspirations.

Do not infer a user, task priority or product rule from a feature list, screenshot or current component tree. Missing meaning that changes the candidate remains `decision-required` or belongs in the stale owning Source.

## 2. Model the primary work object and task loop

Name the object the user is inspecting, creating, editing, moving or deciding about. Trace the shortest meaningful loop:

```text
orient -> inspect/select the work object -> act -> see local feedback -> recover or continue -> finish
```

For each material action, keep operation, affected object and feedback spatially and temporally understandable. Record which context must remain visible while acting, what state commits, how cancellation/retry works and where focus/selection returns. Secondary diagnostics or configuration must not displace the primary work object without an explicit Surface decision.

## 3. Test information hierarchy and topology

Evaluate semantic priority before visual polish:

- primary judgment, work object and action;
- critical context that must remain visible;
- supporting information and secondary actions;
- drilldown/evidence/diagnostic ownership; and
- loading, empty, partial, error, permission, offline and recovery states.

Compare the smallest material topology candidates: fixed versus scrolling regions; inline versus overlay; sidebar, sheet, modal or popover; split view; map/canvas/editor viewport; and navigation versus contextual reveal. For each candidate, explain what remains visible, what scrolls, who owns focus/back/cancel and how the primary loop changes across size classes.

Client-specific structure is allowed when host chrome, safe area, keyboard/input method, pointer/touch conventions, native navigation or viewport constraints materially differ. Do not treat a desktop layout shrunk to mobile width as mobile interaction design.

## 4. Walk the task and its counterfactuals

Run a concise cognitive walkthrough for the primary path and material failure/recovery path:

1. Can the user identify the current work object and next useful action?
2. Is the action discoverable and available at the moment it matters?
3. Is the affected object unambiguous before commit?
4. Is progress, success, failure or partial result visible near the action/object?
5. Can the user cancel, retry, undo, navigate back or recover without losing unexplained state?
6. Do keyboard, focus, touch target, screen-reader label/order, contrast and reduced-motion needs remain viable?

Challenge the leading candidate with long content, empty/error/permission states, narrow and wide size classes, localization/text scaling, keyboard or IME display, interrupted work and returning to the prior selection. Apply only conditions material to Source; do not invent a universal matrix.

## 5. Compare and select under authority

For each material candidate, state:

- which authoritative facts it satisfies;
- the primary-loop advantage and cognitive cost;
- repeated scroll, navigation or context-switch cost;
- state/recovery/accessibility consequences;
- client/size-class behavior; and
- what evidence or decision would change the choice.

The current Goal may select among implementation-equivalent candidates when Source delegates that freedom. If candidates change product meaning, page duty, main/drilldown placement or a durable interaction topology, update the smallest owning Product Surface/Screen Context only when writes are already authorized and `Context Delta: required`; otherwise return `decision-required`. If a candidate conflicts with an adopted exact target or Design Authority, repair/revise the owning authority first. Only then may explicit resource generation route to `design-resource-authoring`.

## Failure sentinels

Explicitly check for these common defects when relevant:

- repeated scrolling or cross-surface switching to compare information needed for one decision;
- a hidden, collapsed or displaced primary work object;
- critical actions detached from the object or hidden behind unrelated navigation;
- feedback that does not identify the operation and affected object;
- a keyboard or IME obscuring the editable object, commit/cancel actions or validation feedback;
- destructive, interrupted or failed work with no understandable recovery path; and
- mobile behavior produced only by shrinking desktop regions, with no touch/navigation/keyboard adaptation.

## Output

Return a concise task model, authoritative inputs and gaps, primary work object/loop, operation-object-feedback relationship, hierarchy/topology candidates, walkthrough/counterfactual findings, selected candidate or decision gap, owner/Context effect and verification suggestions. Do not create a required UI plan, matrix, lifecycle, resource pack, acceptance result or durable task-level UI/UX authority.
