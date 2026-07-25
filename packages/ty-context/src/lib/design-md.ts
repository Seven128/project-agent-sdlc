import path from "node:path";
import { pathExists, readText, writeTextIfChanged } from "./fs.js";

export const DESIGN_MD_PATH = "DESIGN.md";
export const UNCONFIGURED_DESIGN_AUTHORITY_MARKER =
  "Design authority status: `unconfigured`";

export type DesignAuthorityStatus = "missing" | "unconfigured" | "configured";

export interface DesignAuthorityInspection {
  status: DesignAuthorityStatus;
  has_authority_index: boolean;
  token_source_selected: boolean;
  classified_reference_count: number;
}

export async function createDesignMdIfMissing(
  projectRoot: string,
): Promise<boolean> {
  const target = path.join(projectRoot, DESIGN_MD_PATH);
  if (await pathExists(target)) {
    return false;
  }
  return writeTextIfChanged(target, designMdTemplate());
}

export async function inspectDesignAuthorityStatus(
  projectRoot: string,
): Promise<DesignAuthorityStatus> {
  return (await inspectDesignAuthority(projectRoot)).status;
}

export async function inspectDesignAuthority(
  projectRoot: string,
): Promise<DesignAuthorityInspection> {
  const target = path.join(projectRoot, DESIGN_MD_PATH);
  if (!(await pathExists(target))) {
    return {
      status: "missing",
      has_authority_index: false,
      token_source_selected: false,
      classified_reference_count: 0,
    };
  }
  const content = await readText(target);
  const legacyStarter =
    content.includes('name: "Starter Design System"') &&
    content.includes(
      'description: "Neutral baseline design guidance for projects that have not defined their own visual system."',
    );
  const status =
    content.includes(UNCONFIGURED_DESIGN_AUTHORITY_MARKER) || legacyStarter
      ? "unconfigured"
      : "configured";
  const index = designAuthorityIndex(content);
  return {
    status,
    has_authority_index: index !== null,
    token_source_selected: index ? tokenSourceSelected(index) : false,
    classified_reference_count: index ? classifiedReferenceCount(index) : 0,
  };
}

function designAuthorityIndex(content: string): string | null {
  const match = /^###\s+Design Authority Index\s*$/imu.exec(content);
  if (!match) return null;
  const remainder = content.slice(match.index + match[0].length);
  const nextSection = /^#{1,3}\s+/mu.exec(remainder);
  return nextSection ? remainder.slice(0, nextSection.index) : remainder;
}

function tokenSourceSelected(index: string): boolean {
  const line = index
    .split(/\r?\n/u)
    .find((candidate) =>
      /authored(?: exact-value)? token source\s*:/iu.test(candidate),
    );
  if (!line) return false;
  const value = line.slice(line.indexOf(":") + 1).trim();
  return (
    value.length > 0 &&
    !/(?:not selected|unselected|none|n\/a|tbd|todo|unknown)/iu.test(value)
  );
}

function classifiedReferenceCount(index: string): number {
  return index.split(/\r?\n/u).filter((line) => {
    if (/(?:none|not) selected/iu.test(line)) return false;
    const matches = line.match(
      /\b(?:exact-target|constraint|inspiration)\b/giu,
    );
    return matches?.length === 1;
  }).length;
}

function designMdTemplate(): string {
  return [
    "---",
    'version: "alpha"',
    'name: "Unconfigured Project Design"',
    'description: "Starter tokens for explicit prototypes only; not an approved production visual system or page-layout target."',
    "colors:",
    '  canvas: "#F8FAFC"',
    '  surface: "#FFFFFF"',
    '  surface-muted: "#EEF2F7"',
    '  text: "#172033"',
    '  text-muted: "#5D6B82"',
    '  primary: "#2563EB"',
    '  primary-hover: "#1D4ED8"',
    '  on-primary: "#FFFFFF"',
    "typography:",
    "  display:",
    '    fontFamily: "system-ui"',
    '    fontSize: "2.5rem"',
    "    fontWeight: 700",
    "    lineHeight: 1.1",
    "  title:",
    '    fontFamily: "system-ui"',
    '    fontSize: "1.5rem"',
    "    fontWeight: 700",
    "    lineHeight: 1.25",
    "  body:",
    '    fontFamily: "system-ui"',
    '    fontSize: "1rem"',
    "    fontWeight: 400",
    "    lineHeight: 1.6",
    "  label:",
    '    fontFamily: "system-ui"',
    '    fontSize: "0.875rem"',
    "    fontWeight: 600",
    "    lineHeight: 1.3",
    "rounded:",
    "  sm: 4px",
    "  md: 8px",
    "  lg: 12px",
    "spacing:",
    "  xs: 4px",
    "  sm: 8px",
    "  md: 16px",
    "  lg: 24px",
    "  xl: 32px",
    "components: {}",
    "---",
    "",
    "# Design Authority",
    "",
    "## Overview",
    "",
    `- ${UNCONFIGURED_DESIGN_AUTHORITY_MARKER}.`,
    "- This file is a non-authoritative scaffold, not an approved brand, component system or page-layout target.",
    "- Material production UI must not use these starter tokens as permission to invent information hierarchy, layout or visual language.",
    "- Replace this status and the provisional tokens only after project-specific visual decisions stabilize.",
    "",
    "### Design Authority Index",
    "",
    "- Authored exact-value token source: not selected.",
    "- Generation direction and generated token targets: not selected.",
    "- Canonical project/system/component-family target records: none selected.",
    "- Every adopted target has exactly one canonical record. Record project/system/component-family targets here; for a screen-specific target record only its stable id plus owning Screen Contract anchor.",
    "- A canonical record owns interpretation, selection basis, declared condition coverage, a readable immutable adopted path/URI plus digest, and the editable upstream owner/locator/update route (or an explicit manual/external-update boundary). Do not duplicate that metadata in both `DESIGN.md` and a Screen Contract.",
    "- Relevant product/design/development work must open affected selected exact targets/constraints; an index entry alone is not resource consumption.",
    "",
    "## Colors",
    "",
    "- These colors are provisional accessibility-oriented prototype values only; they are not a project palette or brand decision.",
    "- Replace them from one authored token source before material production styling.",
    "",
    "## Typography",
    "",
    "- The system-font typography is provisional prototype scaffolding only.",
    "- Record the selected type family, hierarchy and loading behavior before fidelity implementation.",
    "",
    "## Layout",
    "",
    "- This scaffold declares no production page composition, information hierarchy or responsive layout.",
    "- Put durable screen responsibility, interaction structure and screen-specific canonical target records in `project_context/**`; keep project/system/component-family target records in this Design Authority Index.",
    "",
    "## Components",
    "",
    "- No production component visual language is selected yet.",
    "- When components are selected, record their visual tokens and relevant default, hover, active, focus, disabled, loading and error states without duplicating an authored code token source.",
    "",
    "## Do's and Don'ts",
    "",
    "- Do treat `unconfigured` as a stop/routing signal for material production UI, not as visual permission.",
    "- Do classify selected references as `exact-target`, `constraint` or `inspiration` before implementation.",
    "- Do use these tokens only for an explicitly throwaway prototype while authority remains unconfigured.",
    "- Don't promote an implementation screenshot or diff into its own target baseline.",
    "- Don't add generic AI-looking gradients, oversized cards, excessive rounding or decorative blobs without selected design authority.",
    "",
    "## Design Change Workflow",
    "",
    "- Read this file before creating design drafts, redesigning UI, changing visual systems or implementing material production UI.",
    "- When there is a scan target such as UI source, page files, build output or a local/remote URL, run `npx impeccable detect <target>` before finalizing design changes.",
    "- Treat Impeccable findings as design-review signals: fix issues that affect clarity, consistency, accessibility or trust, and note when there is no suitable scan target.",
    "- After design decisions stabilize, replace the unconfigured marker, record the authored token source/generation direction and each selected target at its exactly-one canonical owner, and record durable tokens, component rules and do/don't guidance.",
    "- Change an adopted target through its recorded upstream route, create or approve a new immutable version/digest, and update its index entry; never overwrite the adopted baseline in place.",
    "",
  ].join("\n");
}
