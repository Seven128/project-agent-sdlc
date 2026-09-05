import { compareUtf8Paths } from "../context-catalog/catalog-paths.js";
import type {
  CatalogFile,
  CatalogRegisteredContext,
} from "../context-catalog/catalog-types.js";
import { loadContextCatalog } from "../context-catalog/catalog-load.js";
import { CONTEXT_LEGACY_READ_POLICY_SET } from "../context-catalog/catalog-portable-contract.js";
import { analyzeContextMarkdownCatalog } from "../context-markdown/context-markdown-analysis.js";
import type {
  ContextDoctorAnalysis,
  ContextDoctorOptions,
} from "./context-doctor-types.js";
import { resolveContextDoctorOptions } from "./context-doctor-types.js";

interface TriggerFanout {
  trigger: string;
  paths: string[];
  cumulative_bytes: number;
}

export async function inspectContextCatalogHealth(
  projectRoot: string,
  options: ContextDoctorOptions = {},
): Promise<ContextDoctorAnalysis> {
  const resolved = resolveContextDoctorOptions(options);
  const result: ContextDoctorAnalysis = {
    info: [],
    warnings: [],
    errors: [],
  };
  const catalog = await loadContextCatalog(projectRoot);
  for (const diagnostic of catalog.diagnostics) {
    const location = diagnostic.path
      ? `${diagnostic.path}${diagnostic.line ? `:${diagnostic.line}` : ""}: `
      : "";
    result[diagnostic.severity === "error" ? "errors" : "warnings"].push(
      `${location}${diagnostic.message}`,
    );
  }

  const registeredByPath = new Map(
    catalog.registered_contexts.map((entry) => [entry.path, entry]),
  );
  const unregisteredPaths = new Set(
    catalog.unregistered_context_files.map((entry) => entry.path),
  );
  const defaultPaths = new Set(catalog.default_footprint.keys());
  const markdown = await analyzeContextMarkdownCatalog({
    project_root: catalog.project_root,
    files: catalog.context_files,
    long_line_threshold: resolved.long_line_code_points,
  });

  const distribution = distributionFor(
    catalog.context_files,
    registeredByPath,
    defaultPaths,
    unregisteredPaths,
  );
  result.info.push(
    `all Context Markdown: ${catalog.context_files.length} file(s), ${sumBytes(catalog.context_files)} bytes`,
  );
  result.info.push(
    `Context distribution: default=${distribution.default.files} file(s)/${distribution.default.bytes} bytes, on-demand=${distribution.on_demand.files} file(s)/${distribution.on_demand.bytes} bytes, legacy=${distribution.legacy.files} file(s)/${distribution.legacy.bytes} bytes, unregistered=${distribution.unregistered.files} file(s)/${distribution.unregistered.bytes} bytes`,
  );
  const largestOnDemand = [...catalog.context_files]
    .filter((file) =>
      isOnDemandRegistered(file.path, registeredByPath, defaultPaths),
    )
    .sort(
      (left, right) =>
        right.bytes - left.bytes || compareUtf8Paths(left.path, right.path),
    )[0];
  if (largestOnDemand)
    result.info.push(
      `largest on-demand Context: ${largestOnDemand.path}, ${largestOnDemand.bytes} bytes`,
    );

  for (const file of markdown.files) {
    const registered = registeredByPath.get(file.path);
    const classification = classifyFile(
      file.path,
      registered,
      defaultPaths,
      unregisteredPaths,
    );
    result.info.push(
      `Context file: ${file.path}, ${file.bytes} bytes, ${classification}, max line ${file.max_line_code_points} code point(s)`,
    );
    if (file.bytes > resolved.context_file_soft_budget_bytes)
      result.warnings.push(
        `${file.path} is ${file.bytes} bytes, above the ${resolved.context_file_soft_budget_bytes}-byte all-Context per-file soft budget; this is advisory and necessary recoverable facts take precedence`,
      );
    for (const line of file.long_lines)
      result.warnings.push(
        `${file.path}:${line.line} has ${line.code_points} Unicode code points, above the ${resolved.long_line_code_points}-code-point advisory threshold`,
      );
  }

  for (const fanout of collectTriggerFanout(
    catalog.registered_contexts,
    catalog.context_files,
  )) {
    result.info.push(
      `Context trigger: ${JSON.stringify(fanout.trigger)}, ${fanout.paths.length} Context(s), ${fanout.cumulative_bytes} cumulative bytes, paths=${fanout.paths.join(", ")}`,
    );
    if (fanout.paths.length >= resolved.trigger_fanout_contexts)
      result.warnings.push(
        `trigger ${JSON.stringify(fanout.trigger)} fans out to ${fanout.paths.length} Contexts (${fanout.cumulative_bytes} bytes): ${fanout.paths.join(", ")}; review whether this literal trigger remains selective`,
      );
  }

  for (const reference of markdown.references) {
    if (reference.status === "valid") continue;
    const target = reference.target_path ?? reference.destination;
    result.warnings.push(
      `${reference.source_path}:${reference.line} has ${reference.status.replaceAll("_", " ")} explicit Markdown Context reference ${JSON.stringify(target)}${reference.detail ? `: ${reference.detail}` : ""}`,
    );
  }
  for (const declaration of markdown.invalid_declarations)
    result[
      declaration.raw.includes("ty-context-controlling-source")
        ? "errors"
        : "warnings"
    ].push(
      `${declaration.path}:${declaration.line} has invalid ty-context declaration ${JSON.stringify(declaration.raw)}: ${declaration.reason}`,
    );
  for (const declaration of markdown.controlling_sources)
    if (declaration.status !== "valid")
      result.errors.push(
        `${declaration.source_path}:${declaration.line} has ${declaration.status.replaceAll("_", " ")} controlling Source ${JSON.stringify(declaration.target_path ?? declaration.declared_path)}${declaration.detail ? `: ${declaration.detail}` : ""}`,
      );
  for (const conflict of markdown.controlling_source_conflicts)
    result.errors.push(
      `controlling Source ${conflict.target_path} has ${conflict.kind.replaceAll("_", " ")} declarations: ${conflict.owners.map((owner) => `${owner.source_path}:${owner.line}:${owner.domain}`).join(", ")}`,
    );
  for (const conflict of markdown.declaration_conflicts)
    result.warnings.push(
      `${conflict.type} ${conflict.id} is declared by multiple candidate owners: ${conflict.owners.map((owner) => `${owner.path}:${owner.line}`).join(", ")}`,
    );
  return result;
}

function distributionFor(
  files: CatalogFile[],
  registered: Map<string, CatalogRegisteredContext>,
  defaults: Set<string>,
  unregistered: Set<string>,
): Record<
  "default" | "on_demand" | "legacy" | "unregistered",
  { files: number; bytes: number }
> {
  const result = {
    default: { files: 0, bytes: 0 },
    on_demand: { files: 0, bytes: 0 },
    legacy: { files: 0, bytes: 0 },
    unregistered: { files: 0, bytes: 0 },
  };
  for (const file of files) {
    const entry = registered.get(file.path);
    let key: keyof typeof result;
    if (unregistered.has(file.path)) key = "unregistered";
    else if (defaults.has(file.path)) key = "default";
    else if (
      entry?.read_policy &&
      CONTEXT_LEGACY_READ_POLICY_SET.has(entry.read_policy)
    )
      key = "legacy";
    else key = "on_demand";
    result[key].files += 1;
    result[key].bytes += file.bytes;
  }
  return result;
}

function classifyFile(
  contextPath: string,
  registered: CatalogRegisteredContext | undefined,
  defaults: Set<string>,
  unregistered: Set<string>,
): string {
  if (unregistered.has(contextPath)) return "unregistered";
  const policy = registered?.read_policy;
  const suffix = policy ? `, read_policy=${policy}` : "";
  if (defaults.has(contextPath)) return `default registered${suffix}`;
  if (policy && CONTEXT_LEGACY_READ_POLICY_SET.has(policy))
    return `legacy registered${suffix}`;
  return `on-demand registered${suffix}`;
}

function isOnDemandRegistered(
  contextPath: string,
  registered: Map<string, CatalogRegisteredContext>,
  defaults: Set<string>,
): boolean {
  const entry = registered.get(contextPath);
  return Boolean(
    entry &&
    !defaults.has(contextPath) &&
    !(
      entry.read_policy && CONTEXT_LEGACY_READ_POLICY_SET.has(entry.read_policy)
    ),
  );
}

function collectTriggerFanout(
  contexts: CatalogRegisteredContext[],
  files: CatalogFile[],
): TriggerFanout[] {
  const filesByPath = new Map(files.map((file) => [file.path, file]));
  const groups = new Map<string, { display: string; paths: Set<string> }>();
  for (const context of contexts) {
    for (const trigger of context.context?.triggers ?? []) {
      const normalized = trigger.normalize("NFC").toLocaleLowerCase("en-US");
      const group = groups.get(normalized) ?? {
        display: trigger.normalize("NFC"),
        paths: new Set<string>(),
      };
      group.paths.add(context.path);
      groups.set(normalized, group);
    }
  }
  return [...groups.values()]
    .map((group) => {
      const paths = [...group.paths].sort(compareUtf8Paths);
      return {
        trigger: group.display,
        paths,
        cumulative_bytes: paths.reduce(
          (total, contextPath) =>
            total + (filesByPath.get(contextPath)?.bytes ?? 0),
          0,
        ),
      };
    })
    .sort((left, right) => compareUtf8Paths(left.trigger, right.trigger));
}

function sumBytes(files: CatalogFile[]): number {
  return files.reduce((total, file) => total + file.bytes, 0);
}
