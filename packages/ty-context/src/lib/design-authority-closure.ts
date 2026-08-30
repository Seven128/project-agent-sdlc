import path from "node:path";
import {
  digestDesignAuthorityMembers,
  enforceDesignAuthorityTotalLimit,
  projectDesignAuthorityMembers,
  type DesignAuthorityDigestMember,
} from "./design-authority-digest.js";
import {
  acquireDesignAuthorityManifest,
  acquireDesignAuthorityText,
  designAuthorityPathExists,
} from "./design-authority-files.js";
import { declaredDesignAuthorityFormat } from "./design-authority-format.js";
import {
  designAuthorityManifestProjection,
  parseDesignAuthorityManifest,
} from "./design-authority-manifest.js";
import { analyzeDesignAuthorityLinks } from "./design-authority-links.js";
import {
  designAuthorityRevision,
  projectDesignAuthorityTokens,
} from "./design-authority-tokens.js";
import {
  DESIGN_AUTHORITY_ENTRY_PATH,
  DESIGN_AUTHORITY_IDENTITY_FORMAT_VERSION,
  DESIGN_AUTHORITY_LIMITS,
  DESIGN_AUTHORITY_MANIFEST_PATH,
  type DesignAuthorityClosureMember,
  type DesignAuthorityClosureSnapshot,
  type DesignAuthorityDiagnostic,
  type DesignAuthorityInspection,
  type DesignAuthorityManifestV1,
} from "./design-authority-types.js";

export async function inspectDesignAuthorityClosure(
  repositoryInput: string,
): Promise<DesignAuthorityInspection> {
  const repository = path.resolve(repositoryInput);
  const entryExists = await designAuthorityPathExists(
    path.join(repository, DESIGN_AUTHORITY_ENTRY_PATH),
  );
  const manifestExists = await designAuthorityPathExists(
    path.join(repository, DESIGN_AUTHORITY_MANIFEST_PATH),
  );
  if (!entryExists && manifestExists)
    return emptyInspection("invalid", "bundle", [
      {
        severity: "error",
        code: "bundle_entry_missing",
        path: DESIGN_AUTHORITY_ENTRY_PATH,
        detail: `${DESIGN_AUTHORITY_MANIFEST_PATH} exists without the canonical DESIGN.md entry`,
      },
    ]);
  if (!entryExists)
    return emptyInspection("missing", "missing", [
      {
        severity: "warning",
        code: "design_authority_missing",
        path: DESIGN_AUTHORITY_ENTRY_PATH,
        detail: "DESIGN.md does not exist",
      },
    ]);
  try {
    const snapshot = await buildDesignAuthorityClosure(repository);
    return {
      schema_version: 1,
      status: snapshot.diagnostics.some((item) => item.severity === "error")
        ? "invalid"
        : "valid",
      ...snapshot,
    };
  } catch (error) {
    return emptyInspection(
      "invalid",
      manifestExists ? "bundle" : await declaredModeHint(repository),
      [
        {
          severity: "error",
          code: "design_authority_invalid",
          detail: message(error),
        },
      ],
    );
  }
}

export async function loadCurrentDesignAuthorityClosure(
  repository: string,
): Promise<DesignAuthorityClosureSnapshot> {
  const inspection = await inspectDesignAuthorityClosure(repository);
  if (inspection.status !== "valid" || !inspection.identity)
    throw new Error(
      `design_authority_invalid:${inspection.diagnostics
        .map((item) => `${item.code}:${item.detail}`)
        .join("|")}`,
    );
  if (inspection.mode === "missing")
    throw new Error("design_authority_invalid:missing_mode");
  return {
    mode: inspection.mode,
    identity: inspection.identity,
    manifest: inspection.manifest,
    claimed_closure_digest: inspection.claimed_closure_digest,
    members: inspection.members,
    member_paths: inspection.member_paths,
    generated_tokens: inspection.generated_tokens,
    diagnostics: inspection.diagnostics,
  };
}

async function buildDesignAuthorityClosure(
  repository: string,
): Promise<DesignAuthorityClosureSnapshot> {
  const entry = await acquireDesignAuthorityText(
    repository,
    DESIGN_AUTHORITY_ENTRY_PATH,
    "design_authority_entry",
  );
  const declaredFormat = declaredDesignAuthorityFormat(entry.content);
  const manifest = await acquireDesignAuthorityManifest(repository);
  if (declaredFormat === "bundle-v1" && !manifest)
    invalid("bundle_manifest_missing");
  if (declaredFormat === null && manifest) invalid("bundle_marker_missing");
  const digestMembers: DesignAuthorityDigestMember[] = [
    { ...entry, kind: "entry" },
  ];
  const markdownSources = [{ path: entry.path, content: entry.content }];
  let parsedManifest: DesignAuthorityManifestV1 | null = null;
  let claimedDigest: string | null = null;
  if (manifest) {
    parsedManifest = parseDesignAuthorityManifest(manifest.content);
    claimedDigest = parsedManifest.closure_digest;
    if (
      parsedManifest.authority_files.length +
        parsedManifest.generated_files.length +
        2 >
      DESIGN_AUTHORITY_LIMITS.max_members
    )
      invalid("member_limit_exceeded");
    for (const file of parsedManifest.authority_files) {
      const acquired = await acquireDesignAuthorityText(
        repository,
        file.path,
        "design_authority_member",
      );
      digestMembers.push({ ...acquired, kind: "authority" });
      markdownSources.push({ path: acquired.path, content: acquired.content });
    }
    for (const file of parsedManifest.generated_files)
      digestMembers.push({
        ...(await acquireDesignAuthorityText(
          repository,
          file.path,
          "design_authority_generated",
        )),
        kind: "generated",
      });
    const projection = designAuthorityManifestProjection(parsedManifest);
    digestMembers.push({
      path: DESIGN_AUTHORITY_MANIFEST_PATH,
      content: projection,
      raw: Buffer.from(projection),
      normalized: Buffer.from(projection),
      kind: "manifest",
    });
  }

  enforceDesignAuthorityTotalLimit(digestMembers);
  const generatedTokens = projectDesignAuthorityTokens(entry.content);
  const diagnostics: DesignAuthorityDiagnostic[] = [];
  if (parsedManifest?.generated_files.length) {
    const generated = digestMembers.find(
      (member) => member.kind === "generated",
    )!;
    if (!generatedTokens.success)
      diagnostics.push({
        severity: "error",
        code: "design_authority_token_projection_failed",
        path: DESIGN_AUTHORITY_ENTRY_PATH,
        detail: generatedTokens.error,
      });
    else if (!generated.raw.equals(Buffer.from(generatedTokens.content)))
      diagnostics.push({
        severity: "error",
        code: "design_authority_generated_tokens_stale",
        path: generated.path,
        detail: "bytes differ from the deterministic DESIGN.md DTCG projection",
      });
  }
  const declared = new Set(digestMembers.map((member) => member.path));
  diagnostics.push(
    ...(await analyzeDesignAuthorityLinks({
      repository,
      sources: markdownSources,
      declared_paths: declared,
    })),
  );
  const computedDigest = digestDesignAuthorityMembers(digestMembers);
  if (claimedDigest && claimedDigest !== computedDigest)
    diagnostics.push({
      severity: "error",
      code: "design_authority_closure_digest_mismatch",
      path: DESIGN_AUTHORITY_MANIFEST_PATH,
      detail: `claimed=${claimedDigest}; computed=${computedDigest}`,
    });
  const members = projectDesignAuthorityMembers(digestMembers);
  return {
    mode: parsedManifest ? "bundle" : "legacy",
    identity: {
      format_version: DESIGN_AUTHORITY_IDENTITY_FORMAT_VERSION,
      entry_path: DESIGN_AUTHORITY_ENTRY_PATH,
      manifest_path: parsedManifest ? DESIGN_AUTHORITY_MANIFEST_PATH : null,
      closure_digest: computedDigest,
      revision: designAuthorityRevision(entry.content),
    },
    manifest: parsedManifest,
    claimed_closure_digest: claimedDigest,
    members,
    member_paths: members.map((member) => member.path),
    generated_tokens: generatedTokens.success ? generatedTokens.content : null,
    diagnostics: diagnostics.sort(compareDiagnostic),
  };
}

function compareDiagnostic(
  left: DesignAuthorityDiagnostic,
  right: DesignAuthorityDiagnostic,
): number {
  const severity = Buffer.from(left.severity, "utf8").compare(
    Buffer.from(right.severity, "utf8"),
  );
  if (severity) return severity;
  return Buffer.from(
    `${left.path ?? ""}\0${left.code}\0${left.detail}`,
  ).compare(Buffer.from(`${right.path ?? ""}\0${right.code}\0${right.detail}`));
}

function emptyInspection(
  status: "missing" | "invalid",
  mode: "missing" | "legacy" | "bundle",
  diagnostics: DesignAuthorityDiagnostic[],
): DesignAuthorityInspection {
  return {
    schema_version: 1,
    status,
    mode,
    identity: null,
    manifest: null,
    claimed_closure_digest: null,
    members: [],
    member_paths: [],
    generated_tokens: null,
    diagnostics,
  };
}

async function declaredModeHint(
  repository: string,
): Promise<"legacy" | "bundle"> {
  try {
    const entry = await acquireDesignAuthorityText(
      repository,
      DESIGN_AUTHORITY_ENTRY_PATH,
      "design_authority_entry",
    );
    return declaredDesignAuthorityFormat(entry.content) === "bundle-v1"
      ? "bundle"
      : "legacy";
  } catch (error) {
    return /bundle_(?:marker|entry)/u.test(message(error))
      ? "bundle"
      : "legacy";
  }
}

function message(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function invalid(reason: string): never {
  throw new Error(`design_authority_invalid:${reason}`);
}
