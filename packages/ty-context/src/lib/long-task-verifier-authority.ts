import type {
  VerifierContentAuthority,
  VerifierIdentityV2,
  VerifierRuntimeLocator,
} from "./long-task-delivery-types.js";
import { canonicalValueJson } from "./strict-codec.js";

export interface VerifierAuthorityDiffV2 {
  verifier_content_changed: boolean;
  verifier_runtime_locator_changed: boolean;
  verifier_files_changed: string[];
  previous_verifier: VerifierIdentityV2;
  next_verifier: VerifierIdentityV2;
}

export function verifierContentAuthority(
  identity: VerifierIdentityV2,
): VerifierContentAuthority {
  return {
    package_name: identity.package_name,
    bundle_sha256: identity.bundle_sha256,
    schema_sha256: identity.schema_sha256,
    hook_sha256: identity.hook_sha256,
    bundle_files: identity.bundle_files,
  };
}

export function verifierRuntimeLocator(
  identity: VerifierIdentityV2,
): VerifierRuntimeLocator {
  return {
    package_version: identity.package_version,
    package_root: identity.package_root,
  };
}

export function verifierAuthorityDiff(
  previous: VerifierIdentityV2,
  next: VerifierIdentityV2,
): VerifierAuthorityDiffV2 {
  const contentChanged =
    canonicalValueJson(verifierContentAuthority(previous)) !==
    canonicalValueJson(verifierContentAuthority(next));
  const locatorChanged =
    canonicalValueJson(verifierRuntimeLocator(previous)) !==
    canonicalValueJson(verifierRuntimeLocator(next));
  return {
    verifier_content_changed: contentChanged,
    verifier_runtime_locator_changed: locatorChanged,
    verifier_files_changed: changedVerifierFiles(previous, next),
    previous_verifier: previous,
    next_verifier: next,
  };
}

export function verifierIdentityMatches(
  previous: VerifierIdentityV2,
  next: VerifierIdentityV2,
): boolean {
  const diff = verifierAuthorityDiff(previous, next);
  return (
    !diff.verifier_content_changed && !diff.verifier_runtime_locator_changed
  );
}

function changedVerifierFiles(
  previous: VerifierIdentityV2,
  next: VerifierIdentityV2,
): string[] {
  const files = new Set([
    ...Object.keys(previous.bundle_files),
    ...Object.keys(next.bundle_files),
  ]);
  const changed = [...files].filter(
    (file) => previous.bundle_files[file] !== next.bundle_files[file],
  );
  if (previous.bundle_sha256 !== next.bundle_sha256) changed.push("<bundle>");
  if (previous.schema_sha256 !== next.schema_sha256) changed.push("<schema>");
  if (previous.hook_sha256 !== next.hook_sha256) changed.push("<hook>");
  if (previous.package_name !== next.package_name)
    changed.push("<package-name>");
  return [...new Set(changed)].sort();
}
