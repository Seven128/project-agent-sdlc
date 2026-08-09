import assert from "node:assert/strict";
import { readFile, rm } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import YAML from "yaml";
import { expandedPatterns } from "../../packages/ty-context/dist/lib/long-task-authority-revision-details.js";
import { parseDeliveryContractText } from "../../packages/ty-context/dist/lib/long-task-delivery-parser.js";
import { proveRepositoryPatternSubset } from "../../packages/ty-context/dist/lib/long-task-paths.js";
import {
  createDeliveryFixture,
  deliveryContract,
  runCli,
  writeContract,
} from "./long-task-delivery-fixtures.mjs";

test("conservative repository pattern containment proves only supported subsets", () => {
  const proven = [
    ["src/a.ts", "src/**"],
    ["src/a.ts", "src/*.ts"],
    ["src/safe/*.ts", "src/safe/**"],
    ["src/safe/*", "src/safe/**"],
    ["src/safe/**", "src/**"],
    ["src/safe/a.ts", "src/safe/*"],
    ["src/safe/*.ts", "src/safe/*"],
    ["src/safe/a.ts", "src/safe/*.ts"],
    ["src/safe/*.ts", "src/safe/*.ts"],
    ["src/a?.ts", "**"],
    ["src/**/*.ts", "src/**/*.ts"],
    ["src\\safe\\a.ts", "src/safe/**"],
  ];
  for (const [candidate, owner] of proven)
    assert.equal(
      proveRepositoryPatternSubset(candidate, owner).status,
      "proven_subset",
      `${candidate} must be a proven subset of ${owner}`,
    );

  const rejected = [
    ["src/safe/**", "src/safe/*.ts"],
    ["src/safe/**", "src/safe/*"],
    ["src/safe/*", "src/safe/*.ts"],
    ["src-other/**", "src/**"],
  ];
  for (const [candidate, owner] of rejected)
    assert.equal(
      proveRepositoryPatternSubset(candidate, owner).status,
      "not_subset",
      `${candidate} must not be a subset of ${owner}`,
    );

  assert.equal(
    proveRepositoryPatternSubset("src/**", "src/a?.ts").status,
    "unknown",
  );
  assert.deepEqual(
    expandedPatterns("scope", ["src/safe/*.ts"], ["src/safe/**"]),
    ["scope:src/safe/**"],
  );
  assert.deepEqual(expandedPatterns("scope", ["src/a?.ts"], ["src/**"]), [
    "scope:src/**",
  ]);
});

test("owner, support, and binding boundaries fail closed for widening patterns", () => {
  const expectedPath = deliveryContract();
  expectedPath.outcomes[0].product.owner.path_globs = [
    "src/safe/*.ts",
    "tests/legacy-oracle.mjs",
  ];
  expectedPath.outcomes[0].technical.expected_change_paths = ["src/safe/**"];
  assert.throws(
    () => parse(expectedPath),
    /path_outside_owner_boundary:first:src\/safe\/\*\*/u,
  );

  const supportPath = deliveryContract();
  supportPath.outcomes[0].product.owner.path_globs = [
    "src/safe/*.ts",
    "tests/legacy-oracle.mjs",
  ];
  supportPath.outcomes[0].technical.expected_change_paths = ["src/safe/a.ts"];
  supportPath.outcomes[0].technical.allowed_support_paths = ["src/safe/**"];
  assert.throws(
    () => parse(supportPath),
    /path_outside_owner_boundary:first:src\/safe\/\*\*/u,
  );

  const binding = deliveryContract();
  binding.outcomes[0].product.owner.path_globs = [
    "src/safe/*",
    "tests/legacy-oracle.mjs",
  ];
  binding.outcomes[0].technical.expected_change_paths = ["src/safe/*.ts"];
  binding.outcomes[0].technical.bindings[0].carrier_paths = ["src/safe/**"];
  assert.throws(
    () => parse(binding),
    /binding_carrier_outside_owner_boundary:first:state-first:src\/safe\/\*\*/u,
  );
});

test("binding carriers must be contained by declared change paths", async () => {
  const fixture = await createDeliveryFixture();
  try {
    const outcome = fixture.contract.outcomes[0];
    outcome.technical.expected_change_paths = ["src/safe/*.ts"];
    outcome.technical.allowed_support_paths = [];
    outcome.technical.bindings[0] = {
      key: "safe-files",
      kind: "path_glob",
      target: "src/safe/**",
      carrier_paths: ["src/safe/**"],
      existence: "planned",
    };
    await writeContract(fixture.workdir, fixture.contract);
    await runCli(fixture.root, ["enable", "long-task"]);
    await assert.rejects(
      () => runCli(fixture.root, ["long-task", "compile", fixture.workdir]),
      /binding_carrier_outside_change_paths:first:src\/safe\/\*\*/u,
    );
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("same-prefix glob widening is visible but auto-adopts as repo-bound scope expansion", async () => {
  const fixture = await createDeliveryFixture();
  try {
    const outcome = fixture.contract.outcomes[0];
    outcome.technical.expected_change_paths = ["src/safe/*.ts"];
    outcome.technical.allowed_support_paths = ["src/state.json"];
    await writeContract(fixture.workdir, fixture.contract);
    await runCli(fixture.root, ["enable", "long-task"]);
    await runCli(fixture.root, ["long-task", "compile", fixture.workdir]);
    await runCli(fixture.root, ["long-task", "verify", fixture.workdir]);

    outcome.technical.expected_change_paths = ["src/safe/**"];
    await writeContract(fixture.workdir, fixture.contract);
    const diagnosis = await runCli(fixture.root, [
      "long-task",
      "diagnose-revision",
      fixture.workdir,
    ]);
    assert.deepEqual(
      diagnosis.revision.approval_summary.expanded_expected_change_paths,
      ["first:src/safe/**"],
    );
    assert.equal(diagnosis.revision.change_class, "scope_only_expansion");
    assert.equal(diagnosis.revision.user_decision_required, false);
    const adopted = await runCli(fixture.root, [
      "long-task",
      "compile",
      fixture.workdir,
      "--revise",
    ]);
    assert.equal(
      adopted.authority_revision_change.change_class,
      "scope_only_expansion",
    );
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

function parse(contract) {
  return parseDeliveryContractText(YAML.stringify(contract));
}
