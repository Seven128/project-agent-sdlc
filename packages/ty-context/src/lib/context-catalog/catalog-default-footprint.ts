import type { ContextManifest } from "../context-manifest-schema.js";
import { normalizeContextPath } from "./catalog-paths.js";

export type DefaultContextSelectionReason =
  "core" | "default_area" | "default_role" | "default_child";

// This is the advisory startup set only. It does not restrict later reads or
// turn default Area/read-policy selection into a Context or edit permission.
export function selectDefaultContextPaths(
  manifest: ContextManifest,
): Map<string, Set<DefaultContextSelectionReason>> {
  const selected = new Map<string, Set<DefaultContextSelectionReason>>();
  const add = (value: string, reason: DefaultContextSelectionReason): void => {
    const normalized = normalizeContextPath(value);
    const reasons = selected.get(normalized) ?? new Set();
    reasons.add(reason);
    selected.set(normalized, reasons);
  };

  for (const core of [
    "project_context/context.toml",
    "project_context/global.md",
    "project_context/architecture.md",
  ]) {
    add(core, "core");
  }

  for (const area of manifest.areas) {
    if (area.default) add(area.context, "default_area");
  }

  const children = new Map(
    manifest.contexts.map(
      (context) =>
        [
          normalizeContextPath(context.path),
          context.default_children.map(normalizeContextPath),
        ] as const,
    ),
  );
  const queue: string[] = [];
  const queued = new Set<string>();
  const enqueue = (contextPath: string): void => {
    if (queued.has(contextPath)) return;
    queued.add(contextPath);
    queue.push(contextPath);
  };
  for (const context of manifest.contexts) {
    if (context.read_policy !== "default") continue;
    const normalized = normalizeContextPath(context.path);
    add(normalized, "default_role");
    enqueue(normalized);
  }
  while (queue.length > 0) {
    const parent = queue.shift()!;
    for (const child of children.get(parent) ?? []) {
      add(child, "default_child");
      enqueue(child);
    }
  }
  return selected;
}
