import path from "node:path";
import { pathExists, readText, writeTextIfChanged } from "./fs.js";
import { harnessPath } from "./harness-root.js";

export interface UserOwnedSectionReport {
  changed: string[];
  skipped: string[];
}

const MEMORY_GUIDANCE_HEADING = "## Harness Guidance";
const DOCS_INDEX_RULES_HEADING = "## Harness Maintenance Rules";

const LEGACY_MEMORY_PARAGRAPHS = [
  "短期执行计划写入 plan.yaml；长期稳定知识只在这里记录简短摘要和链接。完整决策背景、备选方案、取舍和后果写入 `.docs/05_decisions/` ADR 或其它 `.docs/**` 正式事实源。",
  "记录跨阶段长期有效知识的简短摘要和链接。完整决策背景、备选方案、取舍和后果写入 `.docs/05_decisions/` ADR 或其它 `.docs/**` 正式事实源。",
  "内容保持简短，详细说明链接到 `.docs/` 下的对应文档。完整决策背景、备选方案、取舍和后果应写入 `.docs/05_decisions/` ADR 或其它正式 `.docs/**` 事实源。"
];

const LEGACY_INDEX_MAINTENANCE_SECTION = [
  "## 维护规则",
  "",
  "- 每个新增产物都要从本索引链接。",
  "- 仍属于产品、架构、实现、测试或 RFC 事实源的过时产物标记为 superseded；短期执行计划和历史发布流水以 git、tag、registry、CI 或外部 release 系统追溯。",
  "- task/release 的历史动作记录以 git commit、tag 或外部 release 系统为准，不再维护 `<harnessRoot>/archive/` 常规归档。",
  "- implementation docs 必须对齐真实代码，而不只是原始技术方案。"
].join("\n");

export async function syncProjectGuidanceSections(
  projectRoot: string,
  root: string,
  report: UserOwnedSectionReport
): Promise<void> {
  await syncMemoryGuidanceSection(projectRoot, root, report);
  await syncDocsIndexMaintenanceSection(projectRoot, report);
}

export async function syncMemoryGuidanceSection(
  projectRoot: string,
  root: string,
  report: UserOwnedSectionReport
): Promise<void> {
  const relativePath = harnessPath(root, "state", "memory.md");
  const targetPath = path.join(projectRoot, relativePath);
  const existing = (await pathExists(targetPath)) ? await readText(targetPath) : "# Project Memory\n";
  const next = mergeMarkdownSection(
    removeLegacyMemoryGuidance(existing),
    MEMORY_GUIDANCE_HEADING,
    renderMemoryGuidanceSection(root)
  );
  await writeSectionIfChanged(targetPath, relativePath, next, report);
}

export async function syncDocsIndexMaintenanceSection(
  projectRoot: string,
  report: UserOwnedSectionReport
): Promise<void> {
  const relativePath = ".docs/INDEX.md";
  const targetPath = path.join(projectRoot, relativePath);
  const existing = (await pathExists(targetPath))
    ? await readText(targetPath)
    : "# Documentation Index\n\n本文件是 AI SDLC Harness 的文档路由表。\n";
  const next = mergeMarkdownSection(
    removeLegacyIndexMaintenanceSection(existing),
    DOCS_INDEX_RULES_HEADING,
    renderDocsIndexMaintenanceSection()
  );
  await writeSectionIfChanged(targetPath, relativePath, next, report);
}

function renderMemoryGuidanceSection(root: string): string {
  const planPath = harnessPath(root, "state", "plan.yaml");
  return [
    MEMORY_GUIDANCE_HEADING,
    "",
    "- 内容保持简短，详细说明链接到 `.docs/` 下的对应文档。",
    `- 短期执行计划写入 \`${planPath}\`；长期稳定知识只在这里记录简短摘要和链接。`,
    "- 完整决策背景、备选方案、取舍和后果应写入 `.docs/05_decisions/` ADR 或其它正式 `.docs/**` 事实源。"
  ].join("\n");
}

function renderDocsIndexMaintenanceSection(): string {
  return [
    DOCS_INDEX_RULES_HEADING,
    "",
    "- `overview.md` 是 generated artifact，用于浏览和阶段交接；不要手写或局部编辑。",
    "- Markdown slices 和 `.docs/INDEX.md` 是事实源。",
    "- 任意 `.docs/<stage>/**/*.md` 新增、修改、拆分、合并或废弃后，运行 `make docs-overview`。",
    "- 提交或阶段交付前，运行 `make validate-doc-overviews` 或 `make validate-harness` 确认 overview 未过期。",
    "- 每个新增产物都要从本索引链接；implementation docs 必须对齐真实代码。"
  ].join("\n");
}

function removeLegacyMemoryGuidance(content: string): string {
  let next = content;
  for (const paragraph of LEGACY_MEMORY_PARAGRAPHS) {
    next = next.replace(paragraph, "");
  }
  return compactBlankLines(next);
}

function removeLegacyIndexMaintenanceSection(content: string): string {
  return compactBlankLines(content.replace(LEGACY_INDEX_MAINTENANCE_SECTION, ""));
}

function mergeMarkdownSection(existing: string, heading: string, section: string): string {
  const normalizedExisting = existing.replace(/\r\n/g, "\n").trimEnd();
  const normalizedSection = section.trimEnd();
  if (!normalizedExisting) {
    return `${normalizedSection}\n`;
  }

  const lines = normalizedExisting.split("\n");
  const startIndex = lines.findIndex((line) => line.trim() === heading);
  if (startIndex < 0) {
    return `${normalizedExisting}\n\n${normalizedSection}\n`;
  }

  const headingLevel = heading.match(/^#+/)?.[0].length ?? 2;
  let endIndex = lines.length;
  for (let index = startIndex + 1; index < lines.length; index += 1) {
    const match = lines[index].match(/^(#{1,6})\s+/);
    if (match && match[1].length <= headingLevel) {
      endIndex = index;
      break;
    }
  }

  const before = lines.slice(0, startIndex).join("\n").trimEnd();
  const after = lines.slice(endIndex).join("\n").trimStart();
  const parts = [before, normalizedSection, after].filter((part) => part.trim());
  return `${parts.join("\n\n")}\n`;
}

async function writeSectionIfChanged(
  targetPath: string,
  relativePath: string,
  content: string,
  report: UserOwnedSectionReport
): Promise<void> {
  if (await writeTextIfChanged(targetPath, content)) {
    report.changed.push(relativePath);
  } else {
    report.skipped.push(relativePath);
  }
}

function compactBlankLines(content: string): string {
  return content.replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n");
}
