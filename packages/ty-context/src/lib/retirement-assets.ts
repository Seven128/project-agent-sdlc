import { readFile, readdir, lstat } from "node:fs/promises";
import path from "node:path";
import { packageRoot } from "./paths.js";
import { captureMutationFileState } from "./context-mutation/mutation-file-state.js";
import type { MutationFileState } from "./context-mutation/mutation-types.js";
import {
  assertProtectedRepositoryDirectory,
  resolveInsideRepository,
} from "./repository-path-safety.js";
import { MAKEFILE_BLOCK_START, MAKEFILE_BLOCK_END } from "./managed-file.js";

export interface RetirementFile {
  path: string;
  before: MutationFileState;
  after: string | null;
  reason: string;
}
export interface RetirementAssets {
  files: RetirementFile[];
  blockers: string[];
  review: string[];
}

export async function inspectRetirementAssets(
  repository: string,
  root: string,
): Promise<RetirementAssets> {
  const inventory = JSON.parse(
    await readFile(
      path.join(packageRoot(), "migrations/schema-4-owned-assets.json"),
      "utf8",
    ),
  ) as { files: Array<{ path: string; sha256: string }> };
  const result: RetirementAssets = { files: [], blockers: [], review: [] };
  const knownPaths = new Set(
    inventory.files.map((asset) => asset.path.replace("{root}", root)),
  );
  const skillRoots = new Set(
    [...knownPaths]
      .filter((file) => file.startsWith(`${root}/skills/`))
      .map((file) =>
        file
          .split("/")
          .slice(0, root.split("/").length + 2)
          .join("/"),
      ),
  );
  for (const skill of skillRoots) {
    try {
      await inspectExtraSkillFiles(
        repository,
        skill,
        knownPaths,
        result.blockers,
      );
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT")
        result.blockers.push(`${skill}: ${String(error)}`);
    }
  }
  for (const asset of inventory.files) {
    const relative = asset.path.replace("{root}", root);
    try {
      const before = await captureMutationFileState(repository, relative);
      if (!before.exists) continue;
      if (before.sha256 === asset.sha256)
        result.files.push({
          path: relative,
          before,
          after: null,
          reason: "exact schema-4 package asset",
        });
      else if (
        relative.includes("/skills/") ||
        relative === ".codex/agents/long-task-implementation.toml"
      )
        result.blockers.push(
          `${relative}: modified old executable guidance; preserve and explicitly reconcile before retirement`,
        );
      else
        result.review.push(
          `${relative}: customized file retained; review any active old command dependencies`,
        );
    } catch (error) {
      result.blockers.push(`${relative}: ${String(error)}`);
    }
  }
  const makefile = await captureMutationFileState(repository, "Makefile");
  if (
    makefile.exists &&
    !result.files.some((file) => file.path === "Makefile")
  ) {
    const content = Buffer.from(makefile.bytes_base64!, "base64").toString(
      "utf8",
    );
    if (
      content.includes(MAKEFILE_BLOCK_START) ||
      content.includes(MAKEFILE_BLOCK_END)
    ) {
      const start = content.indexOf(MAKEFILE_BLOCK_START),
        end = content.indexOf(MAKEFILE_BLOCK_END);
      const expected = [
        MAKEFILE_BLOCK_START,
        "# Included before project targets so project recipes win on name conflicts.",
        `-include ${root}/ty-context-managed/make/ty-context.mk`,
      ];
      const block = content.slice(start, end + MAKEFILE_BLOCK_END.length);
      if (
        start < 0 ||
        end < start ||
        content.indexOf(MAKEFILE_BLOCK_START, start + 1) >= 0 ||
        content.indexOf(MAKEFILE_BLOCK_END, end + 1) >= 0 ||
        ![
          expected.concat(MAKEFILE_BLOCK_END).join("\n"),
          expected.concat(".DEFAULT_GOAL :=", MAKEFILE_BLOCK_END).join("\n"),
        ].includes(block.replaceAll("\r\n", "\n"))
      )
        result.blockers.push(
          "Makefile: modified or malformed managed include; reconcile before removing its package target file",
        );
      else
        result.files.push({
          path: "Makefile",
          before: makefile,
          after:
            content.slice(0, start) +
            content.slice(end + MAKEFILE_BLOCK_END.length),
          reason: "remove exact package include, preserve user targets",
        });
    }
  }
  const hooks = await captureMutationFileState(repository, ".codex/hooks.json");
  if (hooks.exists) {
    try {
      const raw = JSON.parse(
        Buffer.from(hooks.bytes_base64!, "base64").toString("utf8"),
      );
      if (
        !raw ||
        typeof raw !== "object" ||
        Array.isArray(raw) ||
        (raw.hooks !== undefined &&
          (!raw.hooks ||
            typeof raw.hooks !== "object" ||
            Array.isArray(raw.hooks)))
      )
        throw new Error("unsupported hooks configuration shape");
      let changed = false;
      const next = structuredClone(raw);
      for (const [event, groups] of Object.entries(next.hooks ?? {})) {
        if (!Array.isArray(groups)) continue;
        next.hooks[event] = groups.flatMap((group: unknown) => {
          if (
            !group ||
            typeof group !== "object" ||
            !Array.isArray((group as { hooks?: unknown }).hooks)
          )
            return [group];
          const row = group as { matcher?: string; hooks: unknown[] };
          const retained = row.hooks.filter((entry) => {
            if (!isExactBaselineHook(entry, event)) {
              if (JSON.stringify(entry).includes("long-task-hook"))
                result.blockers.push(
                  `.codex/hooks.json ${event}: customized old Hook requires reconciliation`,
                );
              return true;
            }
            changed = true;
            return false;
          });
          if (retained.length === row.hooks.length) return [group];
          const expectedMatcher =
            event === "PreToolUse"
              ? "^(spawn_agent|Agent)$"
              : event === "SubagentStart"
                ? "^long_task_implementation$"
                : undefined;
          if (
            !retained.length &&
            row.matcher === expectedMatcher &&
            Object.keys(row).every((key) => ["hooks", "matcher"].includes(key))
          )
            return [];
          return [{ ...row, hooks: retained }];
        });
        if (!next.hooks[event].length) delete next.hooks[event];
      }
      if (changed)
        result.files.push({
          path: ".codex/hooks.json",
          before: hooks,
          after: JSON.stringify(next, null, 2) + "\n",
          reason:
            "remove exact baseline Hook entries, preserve mixed user configuration",
        });
    } catch (error) {
      result.blockers.push(`.codex/hooks.json: ${String(error)}`);
    }
  }
  return result;
}

async function inspectExtraSkillFiles(
  repository: string,
  relative: string,
  known: Set<string>,
  blockers: string[],
): Promise<void> {
  const target = resolveInsideRepository(
    repository,
    relative,
    "retirement_skill",
  );
  await lstat(target);
  const safe = await assertProtectedRepositoryDirectory(
    repository,
    target,
    "retirement_skill",
  );
  for (const entry of await readdir(safe, { withFileTypes: true })) {
    const child = `${relative}/${entry.name}`;
    if (entry.isSymbolicLink())
      blockers.push(
        `${child}: linked old Skill content requires explicit reconciliation`,
      );
    else if (entry.isDirectory())
      await inspectExtraSkillFiles(repository, child, known, blockers);
    else if (!known.has(child))
      blockers.push(
        `${child}: additional user Skill content; preserve and reconcile before removing its owning Skill`,
      );
  }
}

function isExactBaselineHook(value: unknown, event: string): boolean {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const row = value as Record<string, unknown>;
  if (
    ![
      "PreToolUse",
      "SessionStart",
      "PostCompact",
      "Stop",
      "SubagentStart",
    ].includes(event) ||
    Object.keys(row).sort().join(",") !==
      "command,commandWindows,statusMessage,timeout,type"
  )
    return false;
  if (
    row.type !== "command" ||
    row.statusMessage !== "Tiny Context long-task live authority gate" ||
    row.timeout !== (event === "Stop" ? 3600 : 10) ||
    row.commandWindows !== row.command ||
    typeof row.command !== "string"
  )
    return false;
  const matched = /^node "([^"\r\n]+)"$/.exec(row.command);
  if (
    !matched ||
    (!path.isAbsolute(matched[1]) && !path.win32.isAbsolute(matched[1]))
  )
    return false;
  return /\/(?:node_modules\/project-tiny-context-harness|packages\/ty-context)\/dist\/long-task-hook\.js$/.test(
    matched[1].replaceAll("\\", "/"),
  );
}
