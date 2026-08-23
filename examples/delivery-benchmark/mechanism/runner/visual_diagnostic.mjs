#!/usr/bin/env node

import { createHash } from "node:crypto";
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  validateBindings,
  validateProtocol,
} from "./visual_diagnostic_protocol.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const MECHANISM_ROOT = path.resolve(HERE, "..");
const PROTOCOL_PATH = path.join(
  MECHANISM_ROOT,
  "visual-diagnostic",
  "protocol.json",
);

const command = process.argv[2];
const args = parseArgs(process.argv.slice(3));

if (command === "freeze-check") {
  const { protocol, digest } = await loadProtocol();
  process.stdout.write(
    `${JSON.stringify({
      status: "OK",
      schema_version: protocol.schema_version,
      protocol_sha256: digest,
      cases: protocol.cases.length,
      variants: protocol.variants.length,
      rubric_dimensions: protocol.rubric.length,
      admission_effect: protocol.authority.admission_effect,
      provider_ranking_effect: protocol.authority.provider_ranking_effect,
    })}\n`,
  );
} else if (command === "prepare") {
  await prepareDiagnostic(args);
} else {
  usage();
  process.exitCode = 1;
}

async function prepareDiagnostic(options) {
  const bindingsPath = required(options, "bindings");
  const runId = stableKey(required(options, "run-id"), "run-id");
  const seed = required(options, "seed");
  const outDir = path.resolve(required(options, "out"));
  const { protocol, digest } = await loadProtocol();
  const repeats = integer(
    options.repeats ??
      String(protocol.run_policy.minimum_repeats_per_case_variant),
    "repeats",
  );
  if (repeats < protocol.run_policy.minimum_repeats_per_case_variant)
    fail(
      `repeats must be >= ${protocol.run_policy.minimum_repeats_per_case_variant}`,
    );

  const bindings = JSON.parse(
    await readFile(path.resolve(bindingsPath), "utf8"),
  );
  validateBindings(bindings, protocol, digest);

  const cells = protocol.cases.flatMap((caseRow) =>
    protocol.variants.flatMap((variant) =>
      Array.from({ length: repeats }, (_, index) => ({
        case_key: caseRow.key,
        artifact_archetype: caseRow.artifact_archetype,
        fixed_input: caseRow.fixed_input,
        variant_key: variant.key,
        repeat: index + 1,
      })),
    ),
  );
  cells.sort((left, right) =>
    hash(`${seed}\0${cellIdentity(left)}`).localeCompare(
      hash(`${seed}\0${cellIdentity(right)}`),
    ),
  );

  const publicItems = cells.map((cell, index) => ({
    blind_item_key: `item-${String(index + 1).padStart(3, "0")}`,
    case_key: cell.case_key,
    artifact_archetype: cell.artifact_archetype,
    fixed_input: cell.fixed_input,
    repeat: cell.repeat,
    rubric: protocol.rubric.map((key) => ({
      key,
      finding: null,
      notes: null,
    })),
  }));
  const mapping = publicItems.map((item, index) => ({
    blind_item_key: item.blind_item_key,
    case_key: cells[index].case_key,
    repeat: cells[index].repeat,
    variant_key: cells[index].variant_key,
    execution_binding: bindings.variant_bindings.find(
      (binding) => binding.variant_key === cells[index].variant_key,
    ),
  }));

  const publicSchedule = {
    schema_version: "dra-visual-diagnostic-blind-schedule-v1",
    run_id: runId,
    protocol_sha256: digest,
    authority: protocol.authority,
    provider_identity_blinded: true,
    randomized_display_order: true,
    repeats_per_case_variant: repeats,
    review_findings: protocol.review_findings,
    items: publicItems,
    raw_limitations: [],
  };
  const privateKey = {
    schema_version: "dra-visual-diagnostic-private-key-v1",
    run_id: runId,
    protocol_sha256: digest,
    seed_sha256: hash(seed),
    bindings_sha256: hash(canonicalJson(bindings)),
    mapping,
  };

  const parent = path.dirname(outDir);
  const tempDir = path.join(
    parent,
    `.${path.basename(outDir)}.tmp-${process.pid}-${Date.now()}`,
  );
  await mkdir(parent, { recursive: true });
  await mkdir(tempDir, { recursive: false });
  try {
    await writeJson(path.join(tempDir, "blind-review.json"), publicSchedule);
    await writeJson(path.join(tempDir, "private-key.json"), privateKey);
    await rename(tempDir, outDir);
  } catch (error) {
    await rm(tempDir, { recursive: true, force: true });
    throw error;
  }
  process.stdout.write(
    `${JSON.stringify({
      status: "PREPARED",
      run_id: runId,
      protocol_sha256: digest,
      items: publicItems.length,
      out_dir: outDir,
      boundary: "descriptive_non_admission",
    })}\n`,
  );
}

async function loadProtocol() {
  const bytes = await readFile(PROTOCOL_PATH);
  const protocol = JSON.parse(bytes.toString("utf8"));
  validateProtocol(protocol);
  return { protocol, digest: hash(bytes) };
}

function cellIdentity(cell) {
  return `${cell.case_key}\0${cell.variant_key}\0${cell.repeat}`;
}

function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object")
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`)
      .join(",")}}`;
  return JSON.stringify(value);
}

function hash(value) {
  return createHash("sha256").update(value).digest("hex");
}

function parseArgs(values) {
  const result = {};
  for (let index = 0; index < values.length; index += 2) {
    const key = values[index];
    if (!key?.startsWith("--") || values[index + 1] === undefined) usage();
    result[key.slice(2)] = values[index + 1];
  }
  return result;
}

function required(values, key) {
  const value = values[key];
  if (!value) fail(`missing --${key}`);
  return value;
}

function stableKey(value, label) {
  if (!/^[a-z0-9][a-z0-9._-]*$/u.test(value)) fail(`${label} is invalid`);
  return value;
}

function integer(value, label) {
  if (!/^[1-9][0-9]*$/u.test(value))
    fail(`${label} must be a positive integer`);
  return Number(value);
}

async function writeJson(file, value) {
  await writeFile(file, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function fail(message) {
  throw new Error(`dra_visual_diagnostic_invalid:${message}`);
}

function usage() {
  process.stderr.write(
    "Usage:\n" +
      "  node visual_diagnostic.mjs freeze-check\n" +
      "  node visual_diagnostic.mjs prepare --bindings <bindings.json> --run-id <id> --seed <secret> --repeats <n> --out <new-dir>\n",
  );
}
