import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  areaContext,
  createContextProject,
} from "../context-manifest-fixtures.mjs";

export const repository = fileURLToPath(new URL("../../..", import.meta.url));
const cli = path.join(repository, "packages", "ty-context", "dist", "cli.js");

export async function createRouteProject({ duplicateClientRoot = false } = {}) {
  const duplicate = duplicateClientRoot
    ? `
[[areas]]
id = "client-shadow"
root = "apps/client"
context = "project_context/areas/client-shadow.md"
kind = "app"
default = false
`
    : "";
  const manifest = `[[areas]]
id = "main"
root = "."
context = "project_context/areas/main.md"
kind = "repository"
default = true

[[areas]]
id = "client"
root = "apps/client"
context = "project_context/areas/client.md"
kind = "app"
default = false
${duplicate}
[[context]]
path = "project_context/areas/main/verification.md"
role = "verification"
read_policy = "default"
triggers = ["test"]

[[context]]
path = "project_context/areas/client/weather.md"
role = "domain"
read_policy = "on-demand"
read_when = "Read for weather-map behavior."
triggers = ["天气地图", "map.*[x]"]

[[context]]
path = "project_context/areas/client/legacy.md"
role = "contract"
read_policy = "always"
triggers = ["legacy"]
`;
  return createContextProject({
    manifest,
    extraFiles: {
      "apps/client/src/map.ts": "export const map = true;\n",
      "project_context/areas/client.md": areaContext("client"),
      "project_context/areas/client-shadow.md": areaContext("client-shadow"),
      "project_context/areas/client/weather.md":
        "# Weather\n\n天气地图 map.*[x] literal[.*] Cafe\u0301 Alpha Context\n",
      "project_context/areas/client/legacy.md": "# Legacy Contract\n",
      "project_context/areas/client/unregistered.md":
        "# Unregistered\n\n天气地图 literal[.*]\n",
    },
  });
}

export function candidate(result, contextPath) {
  const value = result.candidates.find((entry) => entry.path === contextPath);
  assert.ok(value, `missing candidate ${contextPath}`);
  return value;
}

export function runCli(cwd, args) {
  return spawnSync(process.execPath, [cli, ...args], {
    cwd,
    encoding: "utf8",
    windowsHide: true,
  });
}

export async function snapshotTree(root) {
  const values = [];
  await visit(root, "", values);
  return values;
}

async function visit(root, relative, values) {
  const absolute = relative ? path.join(root, relative) : root;
  const entries = await readdir(absolute, { withFileTypes: true });
  entries.sort((left, right) => left.name.localeCompare(right.name));
  for (const entry of entries) {
    const child = relative ? path.join(relative, entry.name) : entry.name;
    if (entry.isDirectory()) await visit(root, child, values);
    else if (entry.isFile()) {
      const content = await readFile(path.join(root, child));
      values.push([
        child.split(path.sep).join("/"),
        createHash("sha256").update(content).digest("hex"),
      ]);
    }
  }
}

export function compareUtf8(left, right) {
  return Buffer.compare(Buffer.from(left, "utf8"), Buffer.from(right, "utf8"));
}
