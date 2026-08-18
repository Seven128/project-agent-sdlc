import { lstat, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { inspectDefaultContextFootprint } from "../packages/ty-context/dist/lib/context-default-footprint.js";
import { runInit } from "../packages/ty-context/dist/lib/init.js";

const LONG_TASK_SKILL_ROOT =
  ".codex/ty-context-managed/skills/long-task-workflow";

export async function collectDefaultInstall(repository) {
  const temporary = await mkdtemp(
    path.join(os.tmpdir(), "ty-context-self-hosting-install-"),
  );
  try {
    await writeFile(
      path.join(temporary, "package.json"),
      `${JSON.stringify({
        name: "self-hosting-cost-probe",
        private: true,
        tyContext: { harnessFolderName: ".codex" },
      })}\n`,
      "utf8",
    );
    await runInit(temporary, { adopt: false, force: false });
    const installedFiles = (await listRegularFiles(temporary))
      .filter((entry) => entry.path !== "package.json")
      .sort(byPath);
    const agents = installedFiles.find((entry) => entry.path === "AGENTS.md");
    if (!agents) throw new Error("self_hosting_default_agents_missing");
    const agentsText = await readFile(path.join(temporary, "AGENTS.md"), "utf8");
    const workflowText = markdownSection(agentsText, "Default Workflow Contract");
    const footprint = await inspectDefaultContextFootprint(temporary);
    const canonicalAgentsPath =
      ".codex/ty-context-managed/agents/AGENTS_CORE.md";
    const canonicalAgents = await regularFileRecord(repository, canonicalAgentsPath);
    return {
      status: "measured",
      definitions: {
        installed_surface:
          "files created by a real default init in an otherwise empty project; the probe seed package.json is excluded",
        prompt_bytes:
          "UTF-8 bytes on disk, not tokenizer input or evidence that a host read the file",
      },
      installed_surface: {
        file_count: installedFiles.length,
        bytes: sum(installedFiles.map((entry) => entry.bytes)),
        files: installedFiles,
      },
      injected_agents: {
        runtime_projection: { ...agents, component_id: "runtime.agents" },
        canonical_source: {
          ...canonicalAgents,
          component_id: "source.agents_core",
          relationship: "projection_source",
          additive_to_runtime_or_installed_total: false,
        },
      },
      default_workflow_prompt: {
        component_id: "runtime.agents.default_workflow_contract",
        path: "AGENTS.md#default-workflow-contract",
        bytes: Buffer.byteLength(workflowText, "utf8"),
        relationship: "contained_in:runtime.agents",
        additive_to_runtime_or_installed_total: false,
      },
      default_context: {
        ...footprint,
        relationship: "contained_in:installed_surface",
        additive_to_installed_total: false,
      },
    };
  } finally {
    await rm(temporary, { recursive: true, force: true });
  }
}

export async function collectDeclaredMinimumRoutes(repository, defaultContext) {
  const mainPath = `${LONG_TASK_SKILL_ROOT}/SKILL.md`;
  const main = await regularFileRecord(repository, mainPath);
  const mainText = await readFile(containedPath(repository, mainPath), "utf8");
  const referencePaths = declaredReferencePaths(mainText).map(
    (relative) => `${LONG_TASK_SKILL_ROOT}/${relative}`,
  );
  const references = await Promise.all(
    referencePaths.map((file) => regularFileRecord(repository, file)),
  );
  const referenceRoutes = references.map((reference) => ({
    route: path.basename(reference.path, ".md").replaceAll("-", "_"),
    status: "declared_not_observed",
    declaration_owner: main.path,
    components: [main.path, reference.path],
    unique_bytes: main.bytes + reference.bytes,
    additive_across_reference_routes: false,
  }));
  return {
    status: "declared_not_observed",
    definition:
      "the canonical Skill plus its directly linked one-level references; multi-reference activities are not precomposed and no route is an assertion that a host opened a file",
    route_owner: {
      path: main.path,
      section: "Progressive Reference Loading",
    },
    skill_components: [main, ...references],
    main_skill_route: {
      route: "main_skill",
      status: "declared_not_observed",
      components: [main.path],
      unique_bytes: main.bytes,
    },
    reference_routes: referenceRoutes,
    minimum_context_route: {
      status: "declared_not_observed",
      files: defaultContext.files,
      total_bytes: defaultContext.total_bytes,
    },
  };
}

function declaredReferencePaths(skillText) {
  const references = [
    ...skillText.matchAll(/\]\((references\/[a-z0-9-]+\.md)\)/gu),
  ].map((match) => match[1]);
  const unique = [...new Set(references)].sort();
  if (unique.length === 0 || unique.length !== references.length) {
    throw new Error("self_hosting_declared_reference_closure_invalid");
  }
  return unique;
}

async function regularFileRecord(repository, relative) {
  const absolute = containedPath(repository, relative);
  const info = await lstat(absolute);
  if (info.isSymbolicLink() || !info.isFile())
    throw new Error(`self_hosting_file_not_regular:${normalizePath(relative)}`);
  return { path: normalizePath(relative), bytes: info.size };
}

async function listRegularFiles(root, current = root) {
  const entries = [];
  for (const item of (await readdir(current, { withFileTypes: true })).sort(
    (left, right) => left.name.localeCompare(right.name),
  )) {
    const absolute = path.join(current, item.name);
    const relative = normalizePath(path.relative(root, absolute));
    if (item.isSymbolicLink())
      throw new Error(`self_hosting_probe_symlink_not_allowed:${relative}`);
    if (item.isDirectory()) entries.push(...(await listRegularFiles(root, absolute)));
    else if (item.isFile())
      entries.push({ path: relative, bytes: (await lstat(absolute)).size });
    else throw new Error(`self_hosting_probe_nonregular:${relative}`);
  }
  return entries;
}

function markdownSection(content, heading) {
  const marker = `## ${heading}`;
  const start = content.indexOf(marker);
  if (start < 0) throw new Error(`self_hosting_agents_section_missing:${heading}`);
  const next = content.indexOf("\n## ", start + marker.length);
  return `${content.slice(start, next < 0 ? content.length : next).trim()}\n`;
}

function containedPath(repository, relative) {
  const target = path.resolve(repository, ...normalizePath(relative).split("/"));
  const relation = path.relative(repository, target);
  if (relation === ".." || relation.startsWith(`..${path.sep}`) || path.isAbsolute(relation))
    throw new Error(`self_hosting_path_outside_repository:${relative}`);
  return target;
}

function normalizePath(value) {
  return String(value).replaceAll("\\", "/").replace(/^\.\//u, "");
}

function byPath(left, right) {
  return left.path < right.path ? -1 : left.path > right.path ? 1 : 0;
}

function sum(values) {
  return values.reduce((total, value) => total + value, 0);
}
