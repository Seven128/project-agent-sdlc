import { readFile } from "node:fs/promises";
import { loadContextCatalog } from "./context-catalog/catalog-load.js";
import {
  catalogErrors,
  catalogWarnings,
} from "./context-catalog/catalog-diagnostics.js";
import { analyzeContextMarkdownCatalog } from "./context-markdown/context-markdown-analysis.js";
import { extractContextMarkdown } from "./context-markdown/context-markdown-extract.js";
import type { ContextRole } from "./context-manifest-schema.js";
import { parseYaml } from "./yaml.js";

export interface ValidatorReport {
  info: string[];
  warnings?: string[];
  hygiene?: string[];
  errors: string[];
}

export async function runValidator(
  projectRoot: string,
  name: string,
  _args: string[] = [],
): Promise<ValidatorReport> {
  if (name !== "validate-context")
    return {
      info: [],
      errors: [
        name +
          " is retired or unknown. Use validate-context for structural checks; project tests own engineering verification.",
      ],
    };
  const catalog = await loadContextCatalog(projectRoot);
  const errors = catalogErrors(catalog.diagnostics);
  const warnings = catalogWarnings(catalog.diagnostics);
  for (const file of catalog.context_files) {
    try {
      const content = await readFile(file.absolute_path, "utf8");
      const registered = catalog.registered_contexts.find(
        (entry) => entry.path === file.path,
      );
      errors.push(
        ...(registered
          ? validateContextRegistrationContent(
              projectRoot,
              file.path,
              content,
              registered.role,
              registered.read_policy,
            )
          : validateContextContentForRole(
              projectRoot,
              file.path,
              content,
              catalog.roles_by_path.get(file.path) ?? "domain",
            )),
      );
    } catch (error) {
      errors.push(file.path + ": " + String(error));
    }
  }
  const markdown = await analyzeContextMarkdownCatalog({
    project_root: catalog.project_root,
    files: catalog.context_files,
    long_line_threshold: 1000,
  });
  for (const declaration of markdown.controlling_sources)
    if (declaration.status !== "valid")
      errors.push(
        declaration.source_path +
          ":" +
          declaration.line +
          " declared local dependency " +
          declaration.declared_path +
          ": " +
          declaration.status,
      );
  for (const conflict of markdown.controlling_source_conflicts)
    errors.push(
      `${conflict.target_path}: ${conflict.kind} controlling-source declarations at ${conflict.owners.map((owner) => `${owner.source_path}:${owner.line}`).join(", ")}`,
    );
  return {
    info: [
      "Checked manifest paths and explicit ty-context-controlling-source declarations. Ordinary Markdown links, examples, external links and factual correctness are not validated.",
    ],
    warnings,
    errors,
  };
}

export function validateContextContentForRole(
  _root: string,
  file: string,
  content: string,
  _role: ContextRole,
): string[] {
  return extractContextMarkdown(content, file)
    .invalid_declarations.filter((entry) =>
      entry.raw.includes("ty-context-controlling-source"),
    )
    .map(
      (entry) =>
        file +
        ":" +
        entry.line +
        " invalid declared dependency: " +
        entry.reason,
    );
}

export function validateContextRegistrationContent(
  root: string,
  file: string,
  content: string,
  role: ContextRole,
  readPolicy?: string,
): string[] {
  const errors = validateContextContentForRole(root, file, content, role);
  const front = /^---\s*\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/.exec(content);
  if (front) {
    try {
      const value = parseYaml(front[1]) as Record<string, unknown> | null;
      if (value?.context_role && value.context_role !== role)
        errors.push(
          file +
            " front matter context_role does not match requested manifest role " +
            role,
        );
      if (
        readPolicy !== undefined &&
        value?.read_policy &&
        value.read_policy !== readPolicy
      )
        errors.push(
          file +
            " front matter read_policy does not match requested manifest read_policy " +
            readPolicy,
        );
    } catch (error) {
      errors.push(file + " invalid front matter: " + String(error));
    }
  }
  return errors;
}
