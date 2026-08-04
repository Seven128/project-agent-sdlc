import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { validateDesignResourceImplementationDependencyClosure } from "./design-resource-handoff-web-dependency-validation.js";
import { parseDesignResourceObservableRuleManifestJson } from "./design-resource-symbolic-fact-shape.js";
import type {
  DesignResourceHandoffPreflightV2,
  ParsedDesignResourceHandoffV2,
} from "./design-resource-symbolic-fact-types.js";
import { validateDesignResourceSymbolicManifest } from "./design-resource-symbolic-manifest-validation.js";
import { validateSymbolicCoverage } from "./design-resource-symbolic-region-validation.js";
import {
  assertSameSet,
  invalid,
  requireExactRefs,
  unique,
} from "./design-resource-symbolic-validation-support.js";
import { assertProtectedRepositoryFile } from "./long-task-protected-files.js";
import { sha256Hex } from "./strict-codec.js";

export {
  designResourceSymbolicCertificateKey,
  designResourceSymbolicCombinedRuleDigest,
  designResourceSymbolicDependencyEdge,
  designResourceSymbolicNoninterferenceProofDigest,
  designResourceSymbolicObligationKey,
  designResourceSymbolicRuleKey,
} from "./design-resource-symbolic-validation-support.js";

const V2_MANIFEST_MAX_BYTES = 8_388_608;

export async function preflightParsedDesignResourceSymbolicHandoff(
  repository: string,
  parsed: ParsedDesignResourceHandoffV2,
): Promise<DesignResourceHandoffPreflightV2> {
  const { handoff } = parsed;
  validateHandoffIdentities(handoff);
  if (handoff.targets.length !== 1)
    invalid("v2_one_target_required", String(handoff.targets.length));
  const target = handoff.targets[0];
  if (!handoff.scope.surface_keys.length)
    invalid("v2_scope_surface_keys_required", target.key);
  const resources = new Map(
    handoff.resources.map((resource) => [resource.key, resource]),
  );
  requireExactRefs(target.resource_refs, resources, "v2_target_resource");
  const manifestResource = resources.get(
    target.source_profile.fact_manifest_resource_ref,
  );
  if (!manifestResource)
    invalid(
      "v2_manifest_resource_unknown",
      target.source_profile.fact_manifest_resource_ref,
    );
  validateManifestResource(target, manifestResource);
  assertSameSet(
    target.resource_refs,
    [
      target.source_profile.entry_resource_ref,
      ...target.source_profile.dependency_resource_refs,
    ],
    "v2_source_profile_resource_closure_mismatch",
    target.key,
  );
  const { contents, resourceHashes } = await readAndVerifyResources(
    repository,
    parsed,
    manifestResource.key,
  );
  if (
    target.source_profile.kind === "implementation_web" ||
    target.source_profile.kind === "implementation_app"
  )
    validateDesignResourceImplementationDependencyClosure(
      target,
      resources,
      contents,
    );
  const manifest = parseDesignResourceObservableRuleManifestJson(
    contents.get(manifestResource.key)!.toString("utf8"),
  );
  if (
    manifest.scope_key !== handoff.scope.key ||
    manifest.target_key !== target.key
  )
    invalid(
      "v2_manifest_identity_mismatch",
      `${manifest.scope_key}:${manifest.target_key}`,
    );
  const validated = validateDesignResourceSymbolicManifest(
    manifest,
    parsed,
    resources,
    contents,
  );
  validateSymbolicCoverage(parsed, manifest);
  return {
    ...parsed,
    preflight_schema_version: "design-resource-handoff-preflight-v2",
    status: "ready",
    manifest,
    resource_hashes: resourceHashes,
    rule_projections: validated.ruleProjections,
    metrics: validated.metrics,
  };
}

function validateHandoffIdentities(
  handoff: ParsedDesignResourceHandoffV2["handoff"],
): void {
  unique(
    handoff.resources.map((item) => item.key),
    "v2_resource_key_duplicate",
  );
  unique(
    handoff.resources.map((item) => item.path),
    "v2_resource_path_duplicate",
  );
  unique(
    handoff.targets.map((item) => item.key),
    "v2_target_key_duplicate",
  );
  unique(
    handoff.coverage.map((item) => item.key),
    "v2_coverage_key_duplicate",
  );
}

function validateManifestResource(
  target: ParsedDesignResourceHandoffV2["handoff"]["targets"][number],
  manifestResource: ParsedDesignResourceHandoffV2["handoff"]["resources"][number],
): void {
  if (
    manifestResource.role !== "supporting" ||
    manifestResource.media_type !== "application/json"
  )
    invalid(
      "v2_manifest_resource_invalid",
      `${manifestResource.key}:${manifestResource.role}:${manifestResource.media_type}`,
    );
  if (
    target.source_profile.entry_resource_ref === manifestResource.key ||
    !target.source_profile.dependency_resource_refs.includes(
      manifestResource.key,
    )
  )
    invalid("v2_manifest_dependency_invalid", target.key);
}

async function readAndVerifyResources(
  repository: string,
  parsed: ParsedDesignResourceHandoffV2,
  manifestResourceRef: string,
): Promise<{
  contents: Map<string, Buffer>;
  resourceHashes: Record<string, string>;
}> {
  const contents = new Map<string, Buffer>();
  const resourceHashes: Record<string, string> = {};
  for (const resource of parsed.handoff.resources) {
    if (resource.path === parsed.handoff_path)
      invalid("v2_resource_must_not_be_handoff", resource.key);
    const file = await assertProtectedRepositoryFile(
      repository,
      path.resolve(repository, ...resource.path.split("/")),
      `design_resource_v2:${resource.key}`,
    );
    if (resource.key === manifestResourceRef)
      await enforceManifestByteLimit(file);
    const bytes = await readFile(file);
    const digest = sha256Hex(bytes);
    if (digest !== resource.sha256)
      invalid(
        "v2_resource_digest_mismatch",
        `${resource.key}:${resource.sha256}:${digest}`,
      );
    contents.set(resource.key, bytes);
    resourceHashes[resource.key] = digest;
  }
  return { contents, resourceHashes };
}

async function enforceManifestByteLimit(file: string): Promise<void> {
  const size = (await stat(file)).size;
  if (size > V2_MANIFEST_MAX_BYTES)
    invalid(
      "v2_manifest_byte_limit_exceeded",
      `bytes=${size}:limit=${V2_MANIFEST_MAX_BYTES}`,
    );
}
