# Tiny Context

Tiny Context has two responsibilities: preserve durable project facts and install one automatically applicable short development contract. Initialization, Context discovery/maintenance, structural validation, sync, explicit upgrade and export support those responsibilities.

Save goals/non-goals, ownership, dependency and state boundaries, confirmed user decisions, rationale and repeatable operation entrypoints that are difficult to recover from code. Reference exact implementation values rather than copying them. Context expresses intended meaning; code expresses current implementation; tests and observations establish only what they actually check.

Read this file plus explicitly selected defaults, then relevant owners as dependencies become clear. CLI queries are optional; files remain directly readable offline. Reading another workspace grants no permission to modify it. Update durable facts when they change; task progress belongs in conversation or optional temporary handoff material.

The project owner has retired Long-Task, DSA, DRA, formal design handoff, machine completion authority, exact Fact/Obligation accounting and their role workflows. Do not restore them as a lighter workflow or require old proof/ROI equivalence to retire them. Existing user requirements, design decisions, project tests and security boundaries remain valid.

See [architecture](architecture.md), [package ownership](areas/harness-package.md) and [manifest](context.toml). Canonical portable guidance lives in .codex/ty-context-managed; package assets are derived through packages/ty-context/source-mappings.yaml. Repository-only authoring guidance is never distributed.
