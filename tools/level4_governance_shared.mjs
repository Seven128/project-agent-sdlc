import {
  assert,
  canonical,
  sha256,
} from "./long_task_real_process_roi_scoring.mjs";
import {
  assertExactKeys,
  gitShaPattern,
  shaPattern,
} from "./long_task_formal_total_cost_shared.mjs";

export function validateLevel4CandidateIdentity(value, label) {
  assertExactKeys(
    value,
    ["commit", "package_sha256", "package_version", "tree"],
    `${label}_fields`,
  );
  assert(
    gitShaPattern.test(value.commit) &&
      gitShaPattern.test(value.tree) &&
      shaPattern.test(value.package_sha256) &&
      typeof value.package_version === "string" &&
      value.package_version.length > 0,
    label,
  );
}

export function validateLevel4DigestEntries(entries, label) {
  assert(Array.isArray(entries) && entries.length > 0, `${label}_entries`);
  const ids = new Set();
  const locators = new Set();
  for (const entry of entries) {
    assertExactKeys(
      entry,
      ["bytes", "id", "locator", "role", "sha256"],
      `${label}_fields`,
    );
    assert(
      typeof entry.id === "string" &&
        entry.id.length > 0 &&
        !ids.has(entry.id) &&
        typeof entry.role === "string" &&
        entry.role.length > 0 &&
        typeof entry.locator === "string" &&
        entry.locator.length > 0 &&
        !locators.has(entry.locator) &&
        Number.isSafeInteger(entry.bytes) &&
        entry.bytes > 0 &&
        shaPattern.test(entry.sha256),
      label,
    );
    ids.add(entry.id);
    locators.add(entry.locator);
  }
  assert(
    canonical(entries) ===
      canonical(
        [...entries].sort((left, right) => left.id.localeCompare(right.id)),
      ),
    `${label}_order`,
  );
  return new Map(entries.map((entry) => [entry.id, entry]));
}

export function level4IdentityWithout(record, field) {
  const projected = { ...record };
  delete projected[field];
  return sha256(canonical(projected));
}
