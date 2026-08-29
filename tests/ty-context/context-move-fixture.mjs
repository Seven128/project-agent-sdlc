import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  baseManifest,
  createContextProject,
} from "./context-manifest-fixtures.mjs";

export const from = "project_context/deployment.md";
export const to = "project_context/deployment/index.md";

const repository = fileURLToPath(new URL("../..", import.meta.url));
const cli = path.join(repository, "packages", "ty-context", "dist", "cli.js");

export async function moveProject({ unresolved = false } = {}) {
  return createContextProject({
    manifest: `${baseManifest()}
[[context]]
path = "${from}"
role = "deployment"
read_policy = "on-demand"
triggers = ["deploy"] # retained

[[context]]
path = "project_context/areas/main/owner.md"
role = "domain"
read_policy = "default"
default_children = ["${from}"]
`,
    extraFiles: {
      [from]: `---
context_role: deployment
read_policy: on-demand
---
# Deployment

## Responsibility

- This Context owns current deployment boundaries and recovery entry points.

[architecture](architecture.md)
`,
      "project_context/areas/main/owner.md": `---
context_role: domain
read_policy: default
---
# Owner

## Responsibility

- This Context owns the durable parent domain.
`,
      "project_context/areas/main/links.md": `# Links

[deploy](../../deployment.md#top)
![diagram](../../deployment.md)
[reference][deployment]

[deployment]: ../../deployment.md "Deployment"
<../../deployment.md>
`,
      ...(unresolved
        ? { "README.md": `See ${from} before release.\n` }
        : {}),
    },
  });
}

export function moveInput(root) {
  return {
    project_root: root,
    from_path: from,
    to_path: to,
  };
}

export function runMoveCli(cwd, args) {
  return spawnSync(process.execPath, [cli, ...args], {
    cwd,
    encoding: "utf8",
    windowsHide: true,
  });
}
