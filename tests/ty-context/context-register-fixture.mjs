import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createContextProject } from "./context-manifest-fixtures.mjs";

export const contextPath = "project_context/areas/main/weather.md";

const repository = fileURLToPath(new URL("../..", import.meta.url));
const cli = path.join(repository, "packages", "ty-context", "dist", "cli.js");

export async function projectWithUnregisteredContext() {
  return createContextProject({
    extraFiles: { [contextPath]: durableContext() },
  });
}

export function registerInput(root) {
  return {
    project_root: root,
    context_path: contextPath,
    role: "domain",
    read_policy: "on-demand",
    read_when: "weather ownership changes",
    triggers: ["weather", "天气"],
  };
}

export function durableContext() {
  return `---
context_role: domain
read_policy: on-demand
---
# Weather Domain

## Responsibility

- This Context owns durable weather observation and provider-selection rules.
`;
}

export function runRegisterCli(cwd, args) {
  return spawnSync(process.execPath, [cli, ...args], {
    cwd,
    encoding: "utf8",
    windowsHide: true,
  });
}
