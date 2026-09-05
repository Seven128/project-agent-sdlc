import path from "node:path";
import { existsSync } from "node:fs";
import { readConfig } from "./config.js";
import type { CatalogFile } from "./context-catalog/catalog-types.js";
import type { ContextRole } from "./context-manifest-schema.js";
import {
  CONTEXT_READ_POLICY_SET,
  normalizeContextRole,
} from "./context-catalog/catalog-portable-contract.js";
import {
  catalogErrors,
  catalogWarnings,
} from "./context-catalog/catalog-diagnostics.js";
import { loadContextCatalog } from "./context-catalog/catalog-load.js";
import { analyzeContextMarkdownCatalog } from "./context-markdown/context-markdown-analysis.js";
import { extractContextMarkdown } from "./context-markdown/context-markdown-extract.js";
import {
  compareUtf8Paths,
  isPathWithin,
  normalizeContextPath,
} from "./context-catalog/catalog-paths.js";
import { harnessPath, harnessRoot } from "./harness-root.js";
import { listFiles, pathExists, readText } from "./fs.js";
import { runModularityCheck } from "./modularity.js";
import { unsupportedSchemaMessage } from "./schema-guard.js";

export interface ValidatorReport {
  info: string[];
  warnings?: string[];
  hygiene?: string[];
  errors: string[];
}

type Validator = (
  projectRoot: string,
  args?: string[],
) => Promise<ValidatorReport>;

type SectionSpec = {
  label: string;
  headings: string[];
};

const VALIDATORS: Record<string, Validator> = {
  "validate-context": validateContext,
  "validate-code-modularity": validateCodeModularity,
  "validate-harness": validateHarness,
};

const GLOBAL_REQUIRED_SECTIONS = [
  ...sectionSpecs([
    "Project Goal",
    "Non-goals / Boundaries",
    "Background",
    "Design Rationale",
    "Architecture Context",
    "Verification Entry Points",
    "Current State",
    "Next Safe Action",
  ]),
  sectionSpec("Context Index", ["Context Index", "Module Index"]),
];

const ARCHITECTURE_REQUIRED_SECTIONS = sectionSpecs([
  "System Boundary",
  "Component Map",
  "Data / Control Flow",
  "Design Rationale",
  "Constraints And Tradeoffs",
  "Verification Implications",
  "Open Risks",
]);

const FAKE_VERIFICATION_PATTERNS = [
  /\btests?\s+(?:pass(?:ed|es)?|green)\b/i,
  /\bverified\b/i,
  /\bdeployed\s+successfully\b/i,
  /\bvalidation\s+passed\b/i,
  /测试(?:已)?通过/,
  /验证(?:已)?通过/,
  /部署(?:已)?成功/,
];

export async function runValidator(
  projectRoot: string,
  gate: string,
  args: string[] = [],
): Promise<ValidatorReport> {
  const validator = VALIDATORS[gate];
  if (!validator) {
    return {
      info: [],
      errors: [
        `unknown validator: ${gate}. Minimal Context Harness supports validate-context, validate-code-modularity and validate-harness only.`,
      ],
    };
  }
  return validator(projectRoot, args);
}

async function validateHarness(projectRoot: string): Promise<ValidatorReport> {
  const contextReport = await validateContext(projectRoot);
  const modularityReport = await validateCodeModularity(projectRoot);
  return {
    info: [...contextReport.info, ...modularityReport.info],
    warnings: [
      ...(contextReport.warnings ?? []),
      ...(modularityReport.warnings ?? []),
    ],
    hygiene: [
      ...(contextReport.hygiene ?? []),
      ...(modularityReport.hygiene ?? []),
    ],
    errors: [...contextReport.errors, ...modularityReport.errors],
  };
}

async function validateCodeModularity(
  projectRoot: string,
): Promise<ValidatorReport> {
  const report = await runModularityCheck(projectRoot, { touched: true });
  const info = [
    `code modularity audited=${report.files.length} warning=${report.warnings.length} waived=${report.waivedWarnings.length} limit=${report.limit}`,
  ];
  if (report.files.length === 0) {
    info.push("No handwritten source files matched the selected scope.");
  }
  for (const file of report.files) {
    const prefix =
      file.regressed && file.waived
        ? "waived"
        : file.regressed
          ? "over-limit"
          : file.overLimit
            ? "observed-risk"
            : "ok";
    info.push(`${prefix}: ${file.relativePath} ${file.lines} lines`);
  }
  for (const waiver of report.waivedWarnings) {
    info.push(`waived: ${waiver}`);
  }
  if (report.errors.length === 0 && report.warnings.length === 0) {
    info.push("Code modularity validation passed");
  }
  return {
    info,
    errors: [...report.errors, ...report.warnings],
  };
}

async function validateContext(projectRoot: string): Promise<ValidatorReport> {
  const info: string[] = [];
  const warnings: string[] = [];
  const errors: string[] = [];
  const root = await harnessRoot(projectRoot);

  const globalPath = path.join(projectRoot, "project_context", "global.md");
  const architecturePath = path.join(
    projectRoot,
    "project_context",
    "architecture.md",
  );
  const projectContextRoot = path.join(projectRoot, "project_context");
  const configPath = path.join(projectRoot, harnessPath(root, "config.yaml"));
  const manifestPath = path.join(
    projectRoot,
    "project_context",
    "context.toml",
  );
  let manifestRoles = new Map<string, ContextRole>();
  let manifestReadPolicies = new Map<string, string>();
  let manifestCatalogLoaded = false;
  let catalogContextFiles: string[] | undefined;
  let catalogMarkdownFiles: CatalogFile[] = [];
  let catalogFilesByPath = new Map<string, string>();
  let schemaVersion = "4";

  if (!(await pathExists(configPath))) {
    errors.push(`${harnessPath(root, "config.yaml")} is missing`);
  } else {
    schemaVersion = (await readConfig(projectRoot)).core.schema_version;
    const unsupportedSchema = unsupportedSchemaMessage(
      schemaVersion,
      "validate-context",
    );
    if (unsupportedSchema) {
      errors.push(unsupportedSchema);
      return { info, warnings, errors };
    }
  }

  if (!(await pathExists(globalPath))) {
    errors.push("project_context/global.md is missing");
  } else {
    const global = await readText(globalPath);
    assertSections(
      "project_context/global.md",
      global,
      GLOBAL_REQUIRED_SECTIONS,
      errors,
    );
    assertSectionHasContent(
      "project_context/global.md",
      global,
      sectionSpec("Verification Entry Points"),
      errors,
    );
    assertSectionHasContent(
      "project_context/global.md",
      global,
      sectionSpec("Next Safe Action"),
      errors,
    );
    assertNoFakeVerification("project_context/global.md", global, errors);
    validateContextFile(
      projectRoot,
      "project_context/global.md",
      global,
      "global",
      errors,
    );
  }

  if (!(await pathExists(architecturePath))) {
    errors.push("project_context/architecture.md is missing");
  } else {
    const architecture = await readText(architecturePath);
    assertSections(
      "project_context/architecture.md",
      architecture,
      ARCHITECTURE_REQUIRED_SECTIONS,
      errors,
    );
    assertSectionHasContent(
      "project_context/architecture.md",
      architecture,
      sectionSpec("System Boundary"),
      errors,
    );
    assertSectionHasContent(
      "project_context/architecture.md",
      architecture,
      sectionSpec("Component Map"),
      errors,
    );
    assertNoFakeVerification(
      "project_context/architecture.md",
      architecture,
      errors,
    );
    validateContextFile(
      projectRoot,
      "project_context/architecture.md",
      architecture,
      "architecture",
      errors,
    );
  }

  if (await pathExists(manifestPath)) {
    const catalog = await loadContextCatalog(projectRoot);
    catalogMarkdownFiles = catalog.context_files;
    manifestCatalogLoaded = true;
    catalogContextFiles = catalog.context_files
      .map((entry) => entry.absolute_path)
      .filter((file) => file !== globalPath && file !== architecturePath);
    catalogFilesByPath = new Map(
      catalog.context_files.map((entry) => [entry.path, entry.absolute_path]),
    );
    errors.push(...catalogErrors(catalog.diagnostics));
    warnings.push(...catalogWarnings(catalog.diagnostics));
    manifestRoles = catalog.roles_by_path;
    manifestReadPolicies = catalog.read_policies_by_path;
    if (catalog.manifest) {
      const manifest = catalog.manifest;
      info.push(
        `loaded project_context/context.toml with ${manifest.areas.length} area(s) and ${manifest.contexts.length} context node(s)`,
      );
    }
  } else if (schemaRequiresContextManifest(schemaVersion)) {
    errors.push(
      "project_context/context.toml is missing; run ty-context upgrade to create the Schema v4 Context graph manifest",
    );
  }

  const contextFiles = (
    catalogContextFiles ??
    (await listFiles(projectContextRoot))
      .filter((file) => file.endsWith(".md"))
      .filter((file) => file !== globalPath && file !== architecturePath)
  ).sort((left, right) =>
    compareUtf8Paths(
      repoRelative(projectRoot, left),
      repoRelative(projectRoot, right),
    ),
  );

  const validatedContextFiles = new Map<string, ContextRole>();
  for (const file of contextFiles) {
    const relative = repoRelative(projectRoot, file);
    const content = await readText(file);
    const frontMatter = parseFrontMatter(content);
    const frontMatterRole = frontMatterContextRole(
      frontMatter,
      relative,
      errors,
    );
    if (
      frontMatter.read_policy &&
      !CONTEXT_READ_POLICY_SET.has(frontMatter.read_policy)
    ) {
      errors.push(
        `${relative} has unsupported read_policy: ${frontMatter.read_policy}`,
      );
    }
    const manifestRole = manifestRoles.get(relative);
    const manifestReadPolicy = manifestReadPolicies.get(relative);
    if (manifestRole && frontMatterRole && manifestRole !== frontMatterRole) {
      errors.push(
        `${relative} front matter context_role ${frontMatterRole} does not match manifest role ${manifestRole}`,
      );
    }
    if (
      manifestReadPolicy &&
      frontMatter.read_policy &&
      manifestReadPolicy !== frontMatter.read_policy
    ) {
      errors.push(
        `${relative} front matter read_policy ${frontMatter.read_policy} does not match manifest read_policy ${manifestReadPolicy}`,
      );
    }
    if (!manifestRole && !manifestCatalogLoaded) {
      warnings.push(
        `${relative} is an unregistered Context Markdown file; add it to project_context/context.toml or move it out of project_context/**`,
      );
    }
    const role = manifestRole ?? frontMatterRole;
    if (!role) {
      continue;
    }
    validateContextFile(projectRoot, relative, content, role, errors);
    validatedContextFiles.set(relative, role);
  }

  for (const [relative, role] of manifestRoles.entries()) {
    if (!validatedContextFiles.has(relative)) {
      const absolute = catalogFilesByPath.get(relative);
      if (absolute && (await pathExists(absolute))) {
        validateContextFile(
          projectRoot,
          relative,
          await readText(absolute),
          role,
          errors,
        );
        validatedContextFiles.set(relative, role);
      }
    }
  }

  if (catalogMarkdownFiles.length) {
    const markdown = await analyzeContextMarkdownCatalog({
      project_root: projectRoot,
      files: catalogMarkdownFiles,
      long_line_threshold: Number.MAX_SAFE_INTEGER,
    });
    for (const declaration of markdown.controlling_sources)
      if (declaration.status !== "valid")
        errors.push(
          `${declaration.source_path}:${declaration.line} has ${declaration.status.replaceAll("_", " ")} controlling Source ${JSON.stringify(declaration.target_path ?? declaration.declared_path)}${declaration.detail ? `: ${declaration.detail}` : ""}`,
        );
    for (const conflict of markdown.controlling_source_conflicts)
      errors.push(
        `controlling Source ${conflict.target_path} has ${conflict.kind.replaceAll("_", " ")} declarations: ${conflict.owners.map((owner) => `${owner.source_path}:${owner.line}:${owner.domain}`).join(", ")}`,
      );
  }

  info.push(
    `checked project_context/global.md, project_context/architecture.md and ${validatedContextFiles.size} context graph file(s)`,
  );
  if (errors.length === 0) {
    info.push("Minimal Context validation passed");
  }
  return { info, warnings, errors };
}

function validateContextFile(
  projectRoot: string,
  file: string,
  content: string,
  role: ContextRole,
  errors: string[],
): void {
  assertNoFakeVerification(file, content, errors);
  assertMinimumRecoverability(file, content, errors);
  assertRoleRecoverability(projectRoot, file, content, role, errors);
  for (const declaration of extractContextMarkdown(content, file)
    .invalid_declarations)
    if (declaration.raw.includes("ty-context-controlling-source"))
      errors.push(
        `${file}:${declaration.line} has invalid controlling Source declaration ${JSON.stringify(declaration.raw)}: ${declaration.reason}`,
      );
}

export function validateContextContentForRole(
  projectRoot: string,
  file: string,
  content: string,
  role: ContextRole,
): string[] {
  const errors: string[] = [];
  validateContextFile(projectRoot, file, content, role, errors);
  return errors;
}

export function validateContextRegistrationContent(
  projectRoot: string,
  file: string,
  content: string,
  role: ContextRole,
  readPolicy: string,
): string[] {
  const errors = validateContextContentForRole(
    projectRoot,
    file,
    content,
    role,
  );
  const frontMatter = parseFrontMatter(content);
  const frontMatterRole = frontMatterContextRole(frontMatter, file, errors);
  if (frontMatterRole && frontMatterRole !== role)
    errors.push(
      `${file} front matter context_role ${frontMatterRole} does not match requested manifest role ${role}`,
    );
  if (frontMatter.read_policy && frontMatter.read_policy !== readPolicy)
    errors.push(
      `${file} front matter read_policy ${frontMatter.read_policy} does not match requested manifest read_policy ${readPolicy}`,
    );
  return errors;
}

function assertSections(
  file: string,
  content: string,
  sections: SectionSpec[],
  errors: string[],
): void {
  for (const section of sections) {
    if (!hasAnyHeading(content, section)) {
      errors.push(`${file} is missing section: ${section.label}`);
    }
  }
}

function assertSectionHasContent(
  file: string,
  content: string,
  section: SectionSpec,
  errors: string[],
): void {
  const body = sectionBodyForSpec(content, section);
  if (!body || body.replace(/[-*`\s]/g, "").length === 0) {
    errors.push(
      `${file} section ${section.label} must describe concrete project facts`,
    );
  }
}

function assertNoFakeVerification(
  file: string,
  content: string,
  errors: string[],
): void {
  const verificationSections = sectionBodiesByHeading(
    content,
    /(?:verification|tests?|deployment|验证|测试|部署)/i,
  );
  if (verificationSections.length === 0) {
    return;
  }
  for (const verification of verificationSections) {
    for (const pattern of FAKE_VERIFICATION_PATTERNS) {
      if (pattern.test(verification)) {
        errors.push(
          `${file} must list verification entry points, not claim tests were already executed`,
        );
        return;
      }
    }
  }
}

function assertMinimumRecoverability(
  file: string,
  content: string,
  errors: string[],
): void {
  if (!/^#\s+\S.+$/m.test(content)) {
    errors.push(`${file} must contain a non-empty level-one title`);
  }
  const withoutFrontMatter = content.replace(
    /^---\s*\r?\n[\s\S]*?\r?\n---\s*\r?\n?/,
    "",
  );
  const facts = withoutFrontMatter
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(
      (line) =>
        line &&
        !line.startsWith("#") &&
        !line.startsWith("```") &&
        !line.startsWith("<!--"),
    )
    .map((line) => line.replace(/^[-*+>]\s*/, "").trim())
    .filter((line) => line.length >= 8)
    .filter(
      (line) =>
        !/^(?:todo|tbd|placeholder|coming soon|待补充|占位|暂无)[.!。…\s-]*$/i.test(
          line,
        ),
    );
  if (facts.length === 0) {
    errors.push(
      `${file} must contain at least one concrete fact paragraph and cannot be only TODO or placeholder text`,
    );
  }
}

function assertRoleRecoverability(
  projectRoot: string,
  file: string,
  content: string,
  role: ContextRole,
  errors: string[],
): void {
  if (role === "verification") {
    const hasRepeatableEntry =
      /`[^`\r\n]+`|\b(?:npm|pnpm|yarn|make|node|python|pytest|cargo|go)\s+[^\r\n]+|(?:^|\s)(?:\.\/|[\w.-]+\/)[\w./-]+/im.test(
        content,
      );
    if (!hasRepeatableEntry) {
      errors.push(
        `${file} verification Context must contain a command, repository path or repeatable entry point`,
      );
    }
  }
  if (role === "implementation-index") {
    const candidates = [...content.matchAll(/`([^`]+)`/g)]
      .map((match) => match[1])
      .filter((value) => /[\\/]/.test(value) && !value.includes(" "));
    const hasRepositoryPath = candidates.some((candidate) => {
      const clean = candidate.replace(/[.:,;]+$/, "").replace(/\\/g, "/");
      if (path.isAbsolute(clean) || clean.split("/").includes("..")) {
        return false;
      }
      const target = path.resolve(projectRoot, clean);
      return isPathWithin(projectRoot, target) && existsSync(target);
    });
    if (!hasRepositoryPath) {
      errors.push(
        `${file} implementation-index Context must contain at least one existing repository path`,
      );
    }
  }
  if (
    role === "contract" &&
    !/(?:producer|consumer|input|output|schema|compatibility|constraint|must|shall|禁止|必须|输入|输出|兼容)/i.test(
      content,
    )
  ) {
    errors.push(
      `${file} contract Context must state at least one constraint or input/output semantic`,
    );
  }
  if (role === "decision-rationale") {
    const hasDecision =
      /^##\s+(?:(?:Decision|Current Design Choice|Design Choice)(?:\b|\s|$)|决定(?:\s|$)|当前设计选择(?:\s|$))/im.test(
        content,
      );
    const hasReason =
      /^##\s+(?:(?:Reason|Rationale|Why)(?:\b|\s|$)|原因(?:\s|$)|理由(?:\s|$)|为什么(?:\s|$))/im.test(
        content,
      );
    if (!hasDecision || !hasReason) {
      errors.push(
        `${file} decision-rationale Context must contain both a Decision and a Reason`,
      );
    }
  }
}

function sectionBodiesByHeading(
  content: string,
  headingPattern: RegExp,
): string[] {
  const matches = [...content.matchAll(/^(#{2,6})\s+(.+?)\s*$/gm)];
  const bodies: string[] = [];
  for (const [index, match] of matches.entries()) {
    if (!headingPattern.test(match[2])) {
      continue;
    }
    const start = (match.index ?? 0) + match[0].length;
    const next = matches[index + 1];
    const end = next?.index ?? content.length;
    bodies.push(content.slice(start, end).trim());
  }
  return bodies;
}

function hasAnyHeading(content: string, section: SectionSpec): boolean {
  return section.headings.some((heading) => hasHeading(content, heading));
}

function hasHeading(content: string, heading: string): boolean {
  const escaped = escapeRegExp(heading);
  return new RegExp(`^##\\s+${escaped}\\s*$`, "im").test(content);
}

function sectionBodyForSpec(
  content: string,
  section: SectionSpec,
): string | undefined {
  for (const heading of section.headings) {
    const body = sectionBody(content, heading);
    if (body !== undefined) {
      return body;
    }
  }
  return undefined;
}

function sectionBody(content: string, heading: string): string | undefined {
  const escaped = escapeRegExp(heading);
  const match = new RegExp(`^##\\s+${escaped}\\s*$`, "im").exec(content);
  if (!match) {
    return undefined;
  }
  const start = match.index + match[0].length;
  const rest = content.slice(start);
  const next = /^##\s+/m.exec(rest);
  return (next ? rest.slice(0, next.index) : rest).trim();
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function repoRelative(root: string, file: string): string {
  return normalizeContextPath(path.relative(root, file));
}

function schemaRequiresContextManifest(schemaVersion: string): boolean {
  const major = Number.parseInt(schemaVersion, 10);
  return Number.isNaN(major) || major >= 4;
}

function frontMatterContextRole(
  frontMatter: Record<string, string>,
  file: string,
  errors: string[],
): ContextRole | undefined {
  const role = frontMatter.context_role;
  if (!role) {
    return undefined;
  }
  const normalized = normalizeContextRole(role);
  if (!normalized) {
    errors.push(`${file} has unsupported context_role: ${role}`);
  }
  return normalized;
}

function parseFrontMatter(content: string): Record<string, string> {
  const lines = content.split(/\r?\n/);
  if (lines[0]?.trim() !== "---") {
    return {};
  }
  const values: Record<string, string> = {};
  for (let index = 1; index < lines.length; index += 1) {
    const line = lines[index].trim();
    if (line === "---") {
      return values;
    }
    const match = /^([A-Za-z0-9_-]+):\s*(.+?)\s*$/.exec(line);
    if (match) {
      values[match[1]] = stripQuotes(match[2]);
    }
  }
  return {};
}

function stripQuotes(value: string): string {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }
  return value;
}

function sectionSpec(label: string, headings = [label]): SectionSpec {
  return { label, headings };
}

function sectionSpecs(labels: string[]): SectionSpec[] {
  return labels.map((label) => sectionSpec(label));
}
