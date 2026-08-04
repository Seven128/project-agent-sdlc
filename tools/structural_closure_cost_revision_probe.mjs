import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import {
  mkdir,
  mkdtemp,
  rm,
  writeFile,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import YAML from "yaml";
import { createLongTaskCompactContract } from "../packages/ty-context/dist/lib/long-task-compact-authoring.js";
import { createSemanticFactCompactCarrier } from "../packages/ty-context/dist/lib/semantic-fact-compact-authoring.js";
import { parseSemanticFactCompactCarrierShape } from "../packages/ty-context/dist/lib/semantic-fact-compact-carrier.js";
import {
  canonicalValueJson,
  sha256Hex,
} from "../packages/ty-context/dist/lib/strict-codec.js";

const exec = promisify(execFile);
const repository = path.resolve(fileURLToPath(new URL("..", import.meta.url)));

export async function measureRevisionBlastRadius(
  sourceText,
  manifest,
  contract,
) {
  const beforeSource = createSemanticFactCompactCarrier(manifest);
  const beforeIdentity = parseSemanticFactCompactCarrierShape(beforeSource);
  const changedManifest = structuredClone(manifest);
  const changedFact = changedManifest.facts.find(
    (fact) => typeof fact.expected.value === "boolean",
  );
  assert.ok(changedFact, "revision blast fixture requires a Boolean Fact");
  changedFact.expected.value = !changedFact.expected.value;
  changedFact.expected.sha256 = sha256Hex(
    canonicalValueJson(changedFact.expected.value),
  );
  const afterSource = createSemanticFactCompactCarrier(changedManifest);
  const afterIdentity = parseSemanticFactCompactCarrierShape(afterSource);
  const beforeContract = createLongTaskCompactContract(
    contract,
    beforeIdentity.fact_revisions,
    beforeIdentity.obligation_revisions,
  );
  const changedContract = structuredClone(contract);
  changedContract.semantic_fact_manifest.sha256 = sha256Hex(
    canonicalValueJson(afterSource),
  );
  const afterContract = createLongTaskCompactContract(
    changedContract,
    afterIdentity.fact_revisions,
    afterIdentity.obligation_revisions,
  );
  const changedFactRevisionKeys = changedRevisionKeys(
    beforeIdentity.fact_revisions,
    afterIdentity.fact_revisions,
  );
  const changedObligationRevisionKeys = changedRevisionKeys(
    beforeIdentity.obligation_revisions,
    afterIdentity.obligation_revisions,
  );
  const expectedObligations = manifest.proof_obligations
    .filter((proof) => proof.fact_ref === changedFact.key)
    .map((proof) => proof.key)
    .sort();
  const beforeFiles = {
    "source.md": replaceSemanticCarrier(sourceText, beforeSource),
    "delivery-contract.yaml": serializeYaml(beforeContract),
  };
  const afterFiles = {
    "source.md": replaceSemanticCarrier(sourceText, afterSource),
    "delivery-contract.yaml": serializeYaml(afterContract),
  };
  const physical = await gitDiffMeasurement(beforeFiles, afterFiles);
  return {
    fact_key: changedFact.key,
    linked_obligation_keys: expectedObligations,
    changed_files: physical.changed_files,
    changed_lines: physical.changed_lines,
    changed_bytes: physical.changed_bytes,
    changed_file_details: physical.files,
    changed_fact_revision_keys: changedFactRevisionKeys,
    expected_changed_fact_revision_keys: [changedFact.key],
    changed_obligation_revision_keys: changedObligationRevisionKeys,
    expected_changed_obligation_revision_keys: expectedObligations,
    unrelated_fact_revision_identities_unchanged:
      changedFactRevisionKeys.length === 1 &&
      changedFactRevisionKeys[0] === changedFact.key,
    unrelated_obligation_revision_identities_unchanged:
      canonicalValueJson(changedObligationRevisionKeys) ===
      canonicalValueJson(expectedObligations),
    shared_structure_catalog_unchanged:
      canonicalValueJson(beforeSource.shared_structures) ===
      canonicalValueJson(afterSource.shared_structures),
    necessary_summary_changes: [
      "Source capacity counts/canonical byte count",
      "Contract semantic_fact_manifest.sha256",
    ],
  };
}

export function measureUnrelatedAxis(manifest) {
  const before = createSemanticFactCompactCarrier(manifest);
  const changed = structuredClone(manifest);
  const axis = structuredClone(changed.axis_dispositions[0]);
  axis.key = "axis.custom-unrelated-structural-probe";
  axis.axis = "custom-unrelated-structural-probe";
  axis.standard = false;
  changed.axis_dispositions.push(axis);
  const after = createSemanticFactCompactCarrier(changed);
  const parsed = parseSemanticFactCompactCarrierShape(after);
  return {
    axis_key: axis.key,
    K_fact_growth: parsed.manifest.facts.length - manifest.facts.length,
    M_value_growth:
      parsed.manifest.proof_obligations.length -
      manifest.proof_obligations.length,
    persisted_shared_metadata_growth_bytes:
      sharedMetadataBytes(after) - sharedMetadataBytes(before),
    total_source_growth_bytes:
      Buffer.byteLength(canonicalValueJson(after), "utf8") -
      Buffer.byteLength(canonicalValueJson(before), "utf8"),
  };
}

function sharedMetadataBytes(carrier) {
  return Buffer.byteLength(
    canonicalValueJson({
      selectors: carrier.selectors,
      shared_structures: carrier.shared_structures,
      proof_templates: carrier.proof_templates,
    }),
    "utf8",
  );
}

async function gitDiffMeasurement(beforeFiles, afterFiles) {
  const root = await mkdtemp(path.join(os.tmpdir(), "structural-blast-"));
  const beforeRoot = path.join(root, "before");
  const afterRoot = path.join(root, "after");
  try {
    await mkdir(beforeRoot);
    await mkdir(afterRoot);
    for (const [name, content] of Object.entries(beforeFiles))
      await writeFile(path.join(beforeRoot, name), content, "utf8");
    for (const [name, content] of Object.entries(afterFiles))
      await writeFile(path.join(afterRoot, name), content, "utf8");
    const numstat = await expectedGitDifference([
      "diff",
      "--no-index",
      "--numstat",
      "--no-renames",
      "--",
      beforeRoot,
      afterRoot,
    ]);
    const files = numstat
      .trim()
      .split(/\r?\n/u)
      .filter(Boolean)
      .map((line) => {
        const [added, deleted, file] = line.split("\t");
        const normalizedFile = file.replace(/\\/gu, "/");
        const logicalFile = Object.keys(beforeFiles)
          .sort((left, right) => right.length - left.length)
          .find((name) => normalizedFile.includes(`/${name}`));
        return {
          file: logicalFile ?? normalizedFile,
          added_lines: Number(added),
          deleted_lines: Number(deleted),
        };
      });
    const patch = await expectedGitDifference([
      "diff",
      "--no-index",
      "--unified=0",
      "--no-renames",
      "--",
      beforeRoot,
      afterRoot,
    ]);
    const changedBytes = patch
      .split(/\r?\n/u)
      .filter(
        (line) =>
          (line.startsWith("+") && !line.startsWith("+++")) ||
          (line.startsWith("-") && !line.startsWith("---")),
      )
      .reduce(
        (sum, line) => sum + Buffer.byteLength(line.slice(1), "utf8") + 1,
        0,
      );
    return {
      changed_files: files.length,
      changed_lines: files.reduce(
        (sum, file) => sum + file.added_lines + file.deleted_lines,
        0,
      ),
      changed_bytes: changedBytes,
      files,
    };
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

async function expectedGitDifference(args) {
  try {
    const result = await exec("git", args, {
      cwd: repository,
      windowsHide: true,
      maxBuffer: 16 * 1024 * 1024,
    });
    return result.stdout;
  } catch (error) {
    if (error.code === 1) return error.stdout;
    throw error;
  }
}

function changedRevisionKeys(before, after) {
  const afterByKey = new Map(after.map((item) => [item.key, item]));
  assert.deepEqual(
    [...before.map((item) => item.key)].sort(),
    [...after.map((item) => item.key)].sort(),
  );
  return before
    .filter(
      (item) =>
        afterByKey.get(item.key).revision_digest !== item.revision_digest,
    )
    .map((item) => item.key)
    .sort();
}

function replaceSemanticCarrier(source, carrier) {
  const body = serializeYaml(carrier).trimEnd();
  const pattern =
    /```yaml (?:semantic-fact-manifest-v1|semantic-fact-compact-carrier-v1)\r?\n[\s\S]*?\r?\n```/u;
  assert.match(source, pattern);
  const replacement = `\`\`\`yaml semantic-fact-compact-carrier-v1\n${body}\n\`\`\``;
  return source.replace(pattern, replacement);
}

function serializeYaml(value) {
  return YAML.stringify(JSON.parse(JSON.stringify(value)), {
    lineWidth: 0,
    indentSeq: false,
    aliasDuplicateObjects: false,
  });
}
