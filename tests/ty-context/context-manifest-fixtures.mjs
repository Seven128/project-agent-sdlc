import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

export async function createContextProject({
  manifest = baseManifest(),
  extraFiles = {},
} = {}) {
  const root = await mkdtemp(path.join(os.tmpdir(), "ty-context-manifest-"));
  const files = {
    ".agent/config.yaml":
      'core:\n  package: project-tiny-context-harness\n  schema_version: "5"\n',
    "project_context/global.md": globalContext(),
    "project_context/architecture.md": architectureContext(),
    "project_context/context.toml": manifest,
    "project_context/areas/main.md": areaContext("main"),
    "project_context/areas/main/verification.md": verificationContext(),
    ...extraFiles,
  };
  for (const [relative, content] of Object.entries(files)) {
    const target = path.join(root, ...relative.split("/"));
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, content, "utf8");
  }
  return root;
}

export function baseManifest() {
  return `default_files = ["project_context/architecture.md"]

[[areas]]
id = "main"
root = "."
context = "project_context/areas/main.md"
kind = "app"
default = true

[[context]]
path = "project_context/areas/main/verification.md"
role = "verification"
read_policy = "default"
triggers = ["test"]
`;
}

function globalContext() {
  return `# Project / Delivery Context

## Project Goal
- Maintain a recoverable Minimal Context project.
## Non-goals / Boundaries
- Product tests remain outside the Context validator.
## Background
- Tiny Context preserves the smallest durable recovery facts.
## Design Rationale
- Durable facts remain separate from one-time execution evidence.
## Architecture Context
- See project_context/architecture.md for system boundaries.
## Verification Entry Points
- \`npm test\`
## Current State
- Context files are the durable facts.
## Next Safe Action
- Read the affected Context before editing code.
## Context Index
- [main](areas/main.md)
`;
}

function architectureContext() {
  return `# Architecture Context

## System Boundary
- The package owns Context parsing and validation.
## Component Map
- The CLI delegates validation to library modules.
## Data / Control Flow
- The validator reads Context and returns diagnostics.
## Design Rationale
- Formal parsing keeps graph semantics deterministic.
## Constraints And Tradeoffs
- Context validation does not prove product quality.
## Verification Implications
- \`npm test\`
## Open Risks
- Invalid graph references can block recovery.
`;
}

export function areaContext(name) {
  return `# Area Context: ${name}

## Responsibility
- Maintain concrete durable facts for the ${name} product area.
`;
}

function verificationContext() {
  return `---
context_role: verification
read_policy: default
---
# Verification

## Verification Paths
- \`npm test\`
`;
}
