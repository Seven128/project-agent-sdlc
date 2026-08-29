import type { ContextRole } from "../context-catalog/catalog-portable-contract.js";

const ROLE_SECTIONS: Record<ContextRole, readonly string[]> = {
  global: [
    "Project Goal",
    "Boundaries",
    "Durable Context",
    "Verification Entry Points",
  ],
  architecture: [
    "System Boundary",
    "Component Map",
    "Data / Control Flow",
    "Constraints And Tradeoffs",
  ],
  area: ["Responsibility", "Durable Facts", "Boundaries", "Code Entry Points"],
  domain: [
    "Responsibility",
    "Durable Domain Facts",
    "Boundaries",
    "Code Entry Points",
  ],
  subdomain: [
    "Responsibility",
    "Durable Subdomain Facts",
    "Parent Boundary",
    "Code Entry Points",
  ],
  foundation: [
    "Foundation Responsibility",
    "Shared Rules",
    "Consumers",
    "Change Boundaries",
  ],
  archive: [
    "Archive Scope",
    "Historical Context",
    "Current Applicability",
    "Successor Owners",
  ],
  contract: [
    "Contract Scope",
    "Inputs",
    "Outputs",
    "Compatibility And Constraints",
  ],
  verification: [
    "Owner",
    "Verification Paths",
    "Required Preparation",
    "Expected Signals",
    "Forbidden Evidence",
  ],
  deployment: [
    "Owner",
    "Runtime Topology",
    "Deployment Paths",
    "Recovery",
    "Forbidden Evidence",
  ],
  "implementation-index": [
    "Responsibility",
    "Repository Entry Points",
    "Change Routing",
    "Boundaries",
  ],
  "decision-rationale": [
    "Decision",
    "Reason",
    "Alternatives",
    "Revisit Trigger",
  ],
};

export function renderContextCreateScaffold(
  contextPath: string,
  role: ContextRole,
): string {
  const title = titleFromPath(contextPath);
  const lines = [
    `# ${roleLabel(role)} Context: ${title}`,
    "",
    `<!-- ty-context-scaffold role=${role} registration=unregistered -->`,
    "",
  ];
  for (const section of ROLE_SECTIONS[role])
    lines.push(`## ${section}`, "", "- TODO", "");
  return `${lines.join("\n").trimEnd()}\n`;
}

function titleFromPath(contextPath: string): string {
  const filename = contextPath.split("/").at(-1) ?? "Context";
  const stem = filename.replace(/\.md$/iu, "");
  const spaced = stem.replace(/[-_]+/gu, " ").trim();
  return spaced || "Context";
}

function roleLabel(role: ContextRole): string {
  return role
    .split("-")
    .map((word) => `${word.slice(0, 1).toUpperCase()}${word.slice(1)}`)
    .join(" ");
}
