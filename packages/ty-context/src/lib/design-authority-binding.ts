import {
  loadCurrentDesignAuthorityClosure,
  inspectDesignAuthorityClosure,
} from "./design-authority-closure.js";
import {
  DESIGN_AUTHORITY_ENTRY_PATH,
  DESIGN_AUTHORITY_IDENTITY_FORMAT_VERSION,
  DESIGN_AUTHORITY_MANIFEST_PATH,
  isDesignAuthorityDigest,
  type DesignAuthorityHandoffBinding,
  type DesignAuthorityHandoffResolution,
} from "./design-authority-types.js";
import { designResourceShapeFail } from "./design-resource-handoff-shape-primitives.js";
import { literal, object, string } from "./long-task-shape-primitives.js";

export function parseDesignAuthorityHandoffBinding(
  value: unknown,
  label: string,
): DesignAuthorityHandoffBinding {
  const base = object(
    value,
    label,
    ["kind"],
    [
      "format_version",
      "entry_path",
      "manifest_path",
      "closure_digest",
      "revision",
      "rationale",
    ],
  );
  const kind = literal(
    base.kind,
    ["repository-closure", "not-applicable"] as const,
    `${label}.kind`,
  );
  if (kind === "not-applicable") {
    const row = object(value, label, ["kind", "rationale"]);
    return {
      kind,
      rationale: string(row.rationale, `${label}.rationale`),
    };
  }
  const row = object(value, label, [
    "kind",
    "format_version",
    "entry_path",
    "manifest_path",
    "closure_digest",
    "revision",
  ]);
  if (row.format_version !== DESIGN_AUTHORITY_IDENTITY_FORMAT_VERSION)
    designResourceShapeFail(
      `${label}.format_version`,
      `must equal ${DESIGN_AUTHORITY_IDENTITY_FORMAT_VERSION}`,
    );
  if (row.entry_path !== DESIGN_AUTHORITY_ENTRY_PATH)
    designResourceShapeFail(
      `${label}.entry_path`,
      `must equal ${DESIGN_AUTHORITY_ENTRY_PATH}`,
    );
  if (
    row.manifest_path !== null &&
    row.manifest_path !== DESIGN_AUTHORITY_MANIFEST_PATH
  )
    designResourceShapeFail(
      `${label}.manifest_path`,
      `must be null or ${DESIGN_AUTHORITY_MANIFEST_PATH}`,
    );
  if (!isDesignAuthorityDigest(row.closure_digest))
    designResourceShapeFail(
      `${label}.closure_digest`,
      "must be a sha256:<64 lowercase hex> identity",
    );
  if (row.revision !== null && typeof row.revision !== "string")
    designResourceShapeFail(`${label}.revision`, "must be a string or null");
  if (typeof row.revision === "string" && !row.revision.trim())
    designResourceShapeFail(`${label}.revision`, "must not be empty");
  return {
    kind,
    format_version: DESIGN_AUTHORITY_IDENTITY_FORMAT_VERSION,
    entry_path: DESIGN_AUTHORITY_ENTRY_PATH,
    manifest_path: row.manifest_path,
    closure_digest: row.closure_digest,
    revision: row.revision,
  } as DesignAuthorityHandoffBinding;
}

export async function resolveDesignAuthorityHandoffBinding(input: {
  repository: string;
  style_dependency: "style-bearing" | "non-fidelity" | "mixed";
  binding?: DesignAuthorityHandoffBinding;
}): Promise<DesignAuthorityHandoffResolution> {
  if (!input.binding) {
    const inspection = await inspectDesignAuthorityClosure(input.repository);
    if (inspection.status !== "valid" || !inspection.identity)
      invalid("legacy_omission_without_current_authority");
    if (inspection.mode !== "legacy")
      invalid("legacy_omission_bundle_not_allowed");
    return {
      identity: inspection.identity,
      member_paths: inspection.member_paths,
      compatibility_derived: true,
    };
  }
  if (input.binding.kind === "not-applicable") {
    if (input.style_dependency !== "non-fidelity")
      invalid("not_applicable_requires_non_fidelity");
    return {
      identity: null,
      member_paths: [],
      compatibility_derived: false,
    };
  }
  const current = await loadCurrentDesignAuthorityClosure(input.repository);
  for (const field of [
    "format_version",
    "entry_path",
    "manifest_path",
    "closure_digest",
    "revision",
  ] as const)
    if (current.identity[field] !== input.binding[field])
      invalid(
        `identity_mismatch:${field}:${String(input.binding[field])}:${String(current.identity[field])}`,
      );
  return {
    identity: current.identity,
    member_paths: current.member_paths,
    compatibility_derived: false,
  };
}

function invalid(reason: string): never {
  throw new Error(
    `design_resource_handoff_invalid:project_design_authority:${reason}`,
  );
}
