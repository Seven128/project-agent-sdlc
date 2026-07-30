# Architecture Context

This is the restrained architecture context. Keep only facts that help a fresh agent recover system shape, boundaries and durable constraints quickly.

## System Boundary

- Describe what is inside this project and what external systems, providers or runtime assumptions sit outside it.

## Component Map

- List the smallest useful set of components, areas or context units and how they relate.
- In a monorepo, record durable Area-to-code/workspace ownership and shared dependency direction where it helps recovery. Do not assume one Area per workspace or turn the map into a read/edit ACL.

## Data / Control Flow

- Summarize only the durable request, event, state or data flow that is hard to infer from code alone.

## Design Rationale

- Record architecture-level choices, rejected alternatives and tradeoffs that still constrain future work; leave this empty when no stable architecture reason exists.
- Do not invent rationale or store implementation summaries, PR notes, command output, test result claims, debug history, agent reasoning or reasons inferred only from current code shape.
- Architecture boundary changes should be captured here before implementation alignment.

## Constraints And Tradeoffs

- Capture performance, safety, integration, deployment or maintainability constraints that matter for future changes.

## Verification Implications

- List project-specific verification entry points affected by architectural changes; do not claim tests already passed.

## Open Risks

- List unresolved architectural risks or unknowns.
