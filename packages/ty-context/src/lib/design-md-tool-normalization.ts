import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type {
  DesignSystemState,
  Finding as GoogleDesignMdFinding,
} from "@google/design.md/linter";
import { stableJson } from "./stable-json.js";
import type {
  DesignMdComponentSnapshot,
  DesignMdFinding,
  DesignMdSystemSnapshot,
  DesignMdTokenChangeSet,
  DesignMdToolIdentity,
} from "./design-md-tool-types.js";

export function loadDesignMdToolIdentity(): DesignMdToolIdentity {
  let directory = path.dirname(
    fileURLToPath(import.meta.resolve("@google/design.md")),
  );
  for (let depth = 0; depth < 4; depth += 1) {
    const packagePath = path.join(directory, "package.json");
    if (existsSync(packagePath)) {
      const parsed = JSON.parse(readFileSync(packagePath, "utf8")) as {
        name?: unknown;
        version?: unknown;
      };
      if (
        parsed.name === "@google/design.md" &&
        typeof parsed.version === "string"
      ) {
        return {
          package_name: "@google/design.md",
          package_version: parsed.version,
          api_surface: "@google/design.md/linter",
        };
      }
    }
    directory = path.dirname(directory);
  }
  throw new Error("unable to resolve @google/design.md package identity");
}

export function normalizeDesignMdFinding(
  finding: GoogleDesignMdFinding,
): DesignMdFinding {
  return {
    severity: finding.severity,
    ...(finding.path ? { path: finding.path } : {}),
    message: finding.message,
    ...(finding.rule ? { rule: finding.rule } : {}),
  };
}

export function snapshotDesignSystem(
  state: DesignSystemState,
): DesignMdSystemSnapshot {
  return {
    ...(state.name ? { name: state.name } : {}),
    ...(state.description ? { description: state.description } : {}),
    colors: mapToRecord(state.colors),
    typography: mapToRecord(state.typography),
    rounded: mapToRecord(state.rounded),
    spacing: mapToRecord(state.spacing),
    components: Object.fromEntries(
      [...state.components.entries()]
        .sort(([left], [right]) => compareText(left, right))
        .map(([key, component]) => [
          key,
          {
            properties: mapToRecord(component.properties),
            unresolved_refs: [...component.unresolvedRefs].sort(compareText),
          },
        ]),
    ),
    sections: [...(state.sections ?? [])],
    unknown_keys: [...(state.unknownKeys ?? [])].sort(compareText),
  };
}

export function componentProperties(
  components: Record<string, DesignMdComponentSnapshot>,
): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(components).map(([key, component]) => [
      key,
      component.properties,
    ]),
  );
}

export function diffDesignMdRecords(
  before: Record<string, unknown>,
  after: Record<string, unknown>,
): DesignMdTokenChangeSet {
  const beforeKeys = Object.keys(before).sort(compareText);
  const afterKeys = Object.keys(after).sort(compareText);
  return {
    added: afterKeys.filter((key) => !(key in before)),
    removed: beforeKeys.filter((key) => !(key in after)),
    modified: afterKeys.filter(
      (key) =>
        key in before && stableJson(before[key]) !== stableJson(after[key]),
    ),
  };
}

function mapToRecord(
  map: ReadonlyMap<string, unknown>,
): Record<string, unknown> {
  return Object.fromEntries(
    [...map.entries()]
      .sort(([left], [right]) => compareText(left, right))
      .map(([key, value]) => [key, toJsonValue(value)]),
  );
}

function toJsonValue(value: unknown): unknown {
  return JSON.parse(JSON.stringify(value)) as unknown;
}

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}
