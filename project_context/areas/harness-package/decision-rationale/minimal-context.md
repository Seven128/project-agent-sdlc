---
context_role: decision-rationale
read_policy: on-demand
---
# Minimal Context Rationale

## Decision And Design Purpose

Minimal Context is the repository-owned durable project-memory layer. Its stable purpose is:

> At the lowest practical repeated reading, search and maintenance cost, let a new Agent, a different Agent and an Agent continuing after context compaction accurately recover durable project facts that code cannot reliably explain, and let newly established durable facts reach their one correct owner. Context never replaces code, tests, CI, runtime evidence or human acceptance.

## Rationale

The protected admission order is lexicographic:

`Effect_new >= Effect_current` and `Effect_new >= DesignPurposeFloor` must hold before efficiency or ROI is compared. A known current gap is repaired rather than frozen as the legal baseline. Among designs that satisfy the purpose and high-quality effect floor, prefer the sufficient design with the lowest known total cost and highest total ROI.

## Current Mechanism

The current recovery and writeback path is:

`AGENTS startup routing -> core/default Context -> context.toml Area/role/trigger candidates -> one bounded high-signal Context search -> Agent semantic filtering -> dependency-driven widening -> read scope separated from intended change scope -> Context Delta: none|required -> durable change updates one owner before implementation -> final Context drift check`

- Core/default files and the default Area are the near-universal starting set, not a complete graph or read ACL.
- Manifest triggers are low-cost retrieval hints. The bounded search supplements trigger wording and never turns a keyword hit into Authority.
- Later code or semantic discovery may widen the read set to any relevant Area, shared dependency, `DESIGN.md` or selected Source.
- Read scope answers what must be understood. Intended workspace/change scope answers what the user authorized this task to modify. Directory placement, Area selection and `read_policy` grant neither permission nor prohibition.
- Every task chooses exactly one `Context Delta: none|required`. Durable ownership, architecture, interface/API/schema/data, state/recovery, dependency, security, surface responsibility or repeatable verification/deployment change is `required`; a semantics-preserving local repair is `none`.
- Context owns durable intended truth; code owns current implementation truth; project evidence proves behavior. Missing, unreadable or conflicting controlling Context blocks an unqualified conclusion for the affected scope.

## Shared Catalog And Experimental Routing

Manifest parsing, safe path interpretation, registered/unregistered discovery, default-footprint calculation and reusable diagnostics converge in one package-owned Shared Context Catalog. Existing validate and default-footprint entrypoints delegate to that read model only after characterization fixtures prove the same accepted Schema v4 policies, paths, order, byte totals, diagnostic categories and default CLI behavior. The extraction removes duplicate interpretation; it does not create a registry, persisted discovery state, permission model or automatic owner inference.

The first Router release is intentionally experimental and additive. It scans all eligible `project_context/**` with literal terms under explicit file, byte, term and output budgets, distinguishes registered and unregistered candidates, reports ambiguity and incomplete scans deterministically and writes nothing. The existing Workflow search remains mandatory and unchanged. Router promotion requires frozen fresh-Agent baseline/candidate pairs proving zero critical-owner omission, no recovery regression, bounded fixed cost and no systematic unregistered loss; static JSON determinism or lower candidate bytes alone cannot authorize replacing the search.

Legacy read-policy cleanup follows compatibility rather than naming intuition. In Schema v4 only `default` directly enters the default set, while every transitive `default_children` edge currently selects its child irrespective of policy. Therefore `always -> default` can expand the footprint and `never-default` cannot currently override an incoming edge. Version 0.10 preserves this behavior and adds diagnostics only; any later conversion is explicit, diffed and fixture-backed.

## Manifest Mutation Build / Reuse / Buy Decision

Manifest mutation reuses `toml-eslint-parser@1.0.3` as the package's exact TOML 1.0 syntax/range dependency and builds only a narrow repository-owned source-span patcher. The parser owns AST, token, comment and source-range discovery; it does not own Manifest meaning or serialization. The Shared Context Catalog remains the only semantic parser/validator and must accept the staged candidate before any write can commit.

The allowed set considered a complete comment-preserving TOML patcher, a CST/range parser plus bounded patching, a fully custom parser and an explicit canonical rewrite. An isolated Node 24 exercise used CRLF, comments, Unicode, an inline table, a multiline array/string and an existing `[[areas]]` table. `@decimalturn/toml-patch@3.0.4` preserved the sample during scalar replacement/insertion, but failed the required new root `[[context]]` insertion with `Node not found at context`; `toml-eslint-parser@1.0.3` returned stable table, key/value, token and comment ranges for the same bytes. A full custom TOML parser adds unjustified mature-format risk, while parse/stringify canonicalization changes unrelated bytes.

Therefore `register` may append exactly one complete `[[context]]` block only at a parser-confirmed unambiguous document boundary, and `move` may replace only parser-confirmed basic-string spans belonging to the unique Context/Area owner path and its exact structured `default_children` references. The patcher preserves the original line-ending convention and every untouched byte. Multiline/literal/escaped or otherwise ambiguous target values, unsupported parser structure, duplicate normalized targets and unsafe insertion placement fail closed. Regular expressions never interpret TOML structure. A future `manifest normalize` may deliberately canonicalize only as a separate explicit command.

The dependency or patch boundary can change only after fixtures re-establish Node 24/Windows support, comments, arrays of tables, inline tables, multiline strings, key order, CRLF/LF, Unicode, malformed-input containment, minimal diff and the real register/move operations. Library availability alone cannot relax the bounded write surface.

Multi-file mutation uses recoverability rather than pretending that ordinary filesystem renames form one physical transaction. The selected owner records original and target bytes, SHA-256, mode, existence/file identity, Catalog identities, deterministic commit order and any target directories known absent; validates a logical overlay; and performs a second CAS after synchronized prewrite. Its one logical journal is published as immutable, monotonically numbered same-directory snapshots: every generation binds its predecessor digest, no update replaces an existing journal path, and an older generation is removed only after its successor is durably published. A crash may therefore leave one current generation or a validated contiguous suffix, including one exact owned hard-link temporary, without making the user guess which state won. Recovery can finish or reverse from any admitted state, but never overwrites bytes matching neither side, accepts an unowned hard link, follows links, removes a non-empty directory or exposes a generic force bypass. Active Long-Task conflicts are resolved only through its existing Authority Revision/rebinding owner.

## Effect Non-Degradation

Every Context mechanism or placement change must preserve or strengthen all of these recovery properties:

- project goals and non-goals remain recoverable;
- product, module, interface, state, verification and deployment owners remain recoverable;
- relevant on-demand Context cannot silently disappear merely because task wording no longer matches one remembered trigger;
- bounded search remains a discovery supplement and a keyword match never becomes automatic Authority;
- the default set remains a starting set rather than a maximum readable set or access-control boundary;
- reading another Area, workspace or shared dependency never silently authorizes its modification;
- a multi-workspace task cannot silently choose the wrong sibling product when user/product/path facts remain ambiguous;
- `Context Delta` distinguishes a durable fact change from a local implementation repair;
- Context never stores task progress, test-pass claims, delivery completion, raw evidence or temporary state;
- missing, conflicting, stale or unreadable controlling Context fails closed for the affected conclusion; and
- a byte target never authorizes deletion, opaque compression or incorrect on-demand placement of a genuinely necessary recovery fact.

Concrete failure example: “modify the home page” may refer to both a mobile and a miniapp workspace. Reading both workspaces is legitimate understanding scope. Editing either one while the intended product remains unresolved is an effect regression even if that client builds and its tests pass. Default work asks one concise target question or relies on explicit product/path facts before product edits.

The Context application boundary stays honest. Repository guidance and static checks can make owners discoverable and detect known structural drift, but they cannot prove that every future Agent correctly understood or applied every fact. Project-native checks and review retain that behavioral boundary.

## Efficiency Non-Degradation

After effect and the design-purpose floor are satisfied, protect recurring cost as follows:

- keep the default file count and byte footprint from growing without a near-universal recovery need;
- keep low-frequency Hook, worker, exact UI proof, migration and historical mechanism detail in existing on-demand owners;
- give each durable fact one primary owner and use short summaries or pointers elsewhere;
- do not copy the complete `PROJECT_SPEC.md` into default Context;
- add no full-repository default read, vector index, cache, registry or persisted search state;
- in a monorepo, create Context workspace directories only for code workspaces that actually own durable non-code facts; create no empty mirrors;
- keep bounded search to a small set of high-signal task terms and widen only from discovered semantic dependencies;
- require a new default fact to be genuinely near-universal, not merely “possibly useful”; and
- when default Context exceeds its advisory budget, first remove duplication, wrong placement and retired/history residue rather than compressing away necessary facts.

Total cost includes default Context bytes, prompt/attention cost, Agent search/tool rounds, authoring, runtime and verification, persisted state, recovery/migration, code/module complexity, test runtime/maintenance, release/consumer adaptation and future change blast radius. Lower cost cannot compensate for reduced recovery, wrong-owner selection or weaker fail-closed behavior.

The sparse Context workspace convention follows the same rule. Each represented `project_context/workspaces/<workspace-id>/**` maps one code root through existing manifest fields and may contain several workspace-local Areas. Cross-workspace/repository facts remain top-level; unrepresented code workspaces need no placeholder. This adds no workspace schema, topology scanner, registry, migration or implicit Design Authority.

## Admission Of Context Anti-Degradation Changes

A new default-read rule, validator, test, benchmark or static sentinel must answer, in order:

1. Which concrete recovery, owner-selection or efficiency regression path does it prevent?
2. Does an existing trigger, owner placement, bounded search, validator or project check already cover that path?
3. Can a lighter owner-local change close it before adding a default rule or new execution entry?
4. Is a new test file, tool or benchmark genuinely necessary, or can an existing table-driven consistency check carry the independent invariant?
5. What fixed cost does it add to every task, CI run, consumer, migration and future change?
6. Does its benefit exceed implementation, runtime, maintenance and migration cost?
7. Among known effect-equivalent designs, is it the lowest-total-cost sufficient choice?

New validation must never turn Context into product-quality evidence. Static wording/string checks prove routing, distribution or structure only. Add or extend the existing fresh-Agent benchmark only when real Agent recall, intended owner/workspace selection, `Context Delta` behavior or total cost needs conclusion-grade evidence. Benchmark tasks, host/model/tools/settings, baseline/candidate identity, hidden oracle and repeated paired runs must be frozen before execution; without normalized traces, report only static continuity and boundaries.

These principles add no Anti-Degradation Matrix, registry, state, second `Context Delta`, Contract, Authority, Gate, workflow route or generic scanner.

## Placement And Update Boundary

- This file completely owns Minimal Context purpose, mechanism rationale, effect/efficiency non-degradation and change admission.
- `foundation/context-model.md` owns normative vocabulary and current structure.
- `project_context/architecture.md` owns the minimum component and data-flow map.
- `project_context/global.md` and the default Area keep only near-universal recovery summaries and pointers.
- `implementation-index.md` and `verification.md` own current code/test navigation.
- Single-Goal, Authority, model-checkpoint, Final-Gate and retired Long-Task architecture rationale belongs only in `decision-rationale/long-task-workflow.md`.

Retrieval metadata is not delivery Authority. Trigger/read-policy edits may change future discovery without changing selected Context meaning. Long-Task owns its existing Context authority projection and full-current-snapshot proof; the default route does not duplicate it.

## Stable Anti-Goals And Evidence Limits

- Do not restore thick plan/result documents, stage artifact chains, agent/process/Git orchestration or persistent model routing as Context behavior.
- Do not make Context-first edit order, full-graph reading, a byte ceiling or an internal plan into a validator Gate.
- Do not claim complete requirement discovery, hostile-host security, Agent adherence or product correctness from Context.
- Do not store tests, runtime output, screenshots, receipts, logs, secrets or completion claims in Context.
- Keep necessary durable facts readable even when an advisory footprint warning remains.
