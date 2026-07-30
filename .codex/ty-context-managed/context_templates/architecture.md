# Architecture Context

This is the restrained architecture context. Keep only facts that help a fresh agent recover system shape, boundaries and durable constraints quickly.

## System Boundary

- Describe what is inside this project and what external systems, providers or runtime assumptions sit outside it.

## Component Map

- List the smallest useful set of components, areas or context units and how they relate.
- In a monorepo, record each represented `project_context/workspaces/<workspace-id>/**` to one code-root mapping, workspace-local Area responsibilities and cross-workspace/shared dependency direction. Do not list code workspaces that have no durable Context merely to complete a mirror, and do not turn the map into a read/edit ACL.

## Data / Control Flow

- Summarize only the durable request, event, state or data flow that is hard to infer from code alone.

## Design Rationale

- Record architecture-level choices, rejected alternatives and tradeoffs that still constrain future work; leave this empty when no stable architecture reason exists.
- Do not invent rationale or store implementation summaries, PR notes, command output, test result claims, debug history, agent reasoning or reasons inferred only from current code shape.
- Architecture boundary changes should be captured here before implementation alignment.

## Constraints And Tradeoffs

- Capture only durable engineering-quality constraints and tradeoffs that materially shape future work: failure/recovery or resource lifecycle, concurrency/consistency, performance/capacity/cost, security/privacy/safety, compatibility/migration/rollout, integration/deployment/operability or maintainability/changeability.
- Name the stable owner and extension point, one plausible future-change/load/failure/threat scenario when it explains the constraint, and any bounded debt/exception lifecycle. Do not create a generic quality checklist or duplicate exact product/technical values owned by a contract or other Context.

## Verification Implications

- List the project-native type/compiler/lint/architecture/contract/behavior/benchmark/probe entry points that can falsify durable boundaries or quality constraints; state only what each path is capable of proving.
- For a durable performance constraint, preserve workload, metric, environment, baseline or budget and comparator/tolerance ownership here or in the narrower owning Context. Static shape checks are not runtime-performance proof.
- Do not record one-off results or claim that checks already passed.

## Open Risks

- List unresolved architectural risks or unknowns.
