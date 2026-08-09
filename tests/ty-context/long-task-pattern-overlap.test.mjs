import assert from "node:assert/strict";
import { rm } from "node:fs/promises";
import test from "node:test";
import {
  classifyRepositoryPatternOverlap,
  matchesRepoPattern,
  normalizeRepositoryCwd,
  normalizeRepositoryFile,
  parseRepositoryPattern,
} from "../../packages/ty-context/dist/lib/long-task-paths.js";
import {
  createDeliveryFixture,
  runCli,
  writeContract,
} from "./long-task-delivery-fixtures.mjs";

test("repository pattern overlap proves only safe overlap or disjoint relations", () => {
  const cases = [
    ["src/**", "tests/**", "proven_disjoint"],
    ["src/**", "src/test.ts", "proven_overlap"],
    ["**", "tests/oracle.mjs", "proven_overlap"],
    ["src/*.ts", "src/a.ts", "proven_overlap"],
    ["src/*.ts", "src/*.js", "proven_disjoint"],
    ["src/*.ts", "src/*.test.ts", "proven_overlap"],
    ["*/file", "src/file", "proven_overlap"],
    ["*/file", "src/other", "proven_disjoint"],
    ["**", "*/file", "proven_overlap"],
    ["src/a*", "src/*b", "unknown"],
  ];
  for (const [left, right, expected] of cases)
    assert.equal(
      classifyRepositoryPatternOverlap(left, right).status,
      expected,
      `${left} vs ${right}`,
    );
  assert.equal(matchesRepoPattern("src/a.ts", "src/*.ts"), true);
  assert.equal(matchesRepoPattern("src/nested/a.ts", "src/**/*.ts"), true);
  assert.equal(matchesRepoPattern("src/a.js", "src/*.ts"), false);
});

test("unsupported repository pattern syntax is rejected by the shared parser", () => {
  for (const pattern of [
    "src/[ab].ts",
    "src/{a,b}.ts",
    "src/@(a).ts",
    "src/**suffix",
    "src/prefix**",
  ])
    assert.throws(
      () => parseRepositoryPattern(pattern),
      /unsupported_repository_pattern_syntax/u,
      pattern,
    );
});

test("literal route-group parentheses are allowed only in repository files and cwd", () => {
  const route = "apps/mobile/app/(map)/_layout.tsx";
  assert.equal(normalizeRepositoryFile(route), route);
  assert.equal(
    normalizeRepositoryCwd("apps/mobile/app/(map)"),
    "apps/mobile/app/(map)",
  );
  assert.equal(matchesRepoPattern(route, "apps/mobile/**"), true);
  assert.throws(
    () => parseRepositoryPattern(route),
    /unsupported_repository_pattern_syntax/u,
  );
  for (const unsafe of [
    "apps/mobile/app/*/_layout.tsx",
    "apps/mobile/app/[map]/_layout.tsx",
    "apps/mobile/app/../_layout.tsx",
    "C:/apps/mobile/app/(map)/_layout.tsx",
  ])
    assert.throws(() => normalizeRepositoryFile(unsafe), undefined, unsafe);
});

test("overlap call sites fail closed for global wildcards and protected evidence roles", async () => {
  const scenarios = [
    {
      name: "implementation wildcard",
      mutate(contract) {
        contract.outcomes[0].product.owner.path_globs = ["**"];
        contract.outcomes[0].technical.expected_change_paths = ["**"];
      },
      error:
        /protected_path_declared|verification_input_overlaps_implementation/u,
    },
    {
      name: "allowed and forbidden wildcard",
      mutate(contract) {
        contract.outcomes[0].product.owner.path_globs = ["**"];
        contract.outcomes[0].technical.expected_change_paths = ["src/**"];
        contract.global.technical.forbidden_paths.push({
          key: "runtime-state",
          path: "src/**",
        });
      },
      error: /allowed_forbidden_path_overlap/u,
    },
    {
      name: "artifact wildcard",
      mutate(contract) {
        contract.outcomes[0].acceptance.checks[0].artifact_globs = ["**"];
      },
      error:
        /machine_observer_not_admitted:.*process_carrier_evidence_role_forbidden/u,
    },
  ];
  for (const scenario of scenarios) {
    const fixture = await createDeliveryFixture();
    try {
      scenario.mutate(fixture.contract);
      await writeContract(fixture.workdir, fixture.contract);
      await runCli(fixture.root, ["enable", "long-task"]);
      await assert.rejects(
        runCli(fixture.root, ["long-task", "compile", fixture.workdir]),
        scenario.error,
        scenario.name,
      );
    } finally {
      await rm(fixture.root, { recursive: true, force: true });
    }
  }
});

test("only proven expected-output overlap permits a missing input path", async () => {
  const accepted = await createDeliveryFixture();
  try {
    const check = accepted.contract.outcomes[0].acceptance.checks[0];
    check.input_paths = ["src/state.json", "generated/report.json"];
    check.expected_output_paths = ["generated/**"];
    await writeContract(accepted.workdir, accepted.contract);
    await runCli(accepted.root, ["enable", "long-task"]);
    await runCli(accepted.root, ["long-task", "compile", accepted.workdir]);
  } finally {
    await rm(accepted.root, { recursive: true, force: true });
  }

  const rejected = await createDeliveryFixture();
  try {
    const check = rejected.contract.outcomes[0].acceptance.checks[0];
    check.input_paths = ["src/state.json", "generated/report.txt"];
    check.expected_output_paths = ["generated/*.json"];
    await writeContract(rejected.workdir, rejected.contract);
    await runCli(rejected.root, ["enable", "long-task"]);
    await assert.rejects(
      runCli(rejected.root, ["long-task", "compile", rejected.workdir]),
      /input_path_not_found:first-check:generated\/report\.txt/u,
    );
  } finally {
    await rm(rejected.root, { recursive: true, force: true });
  }
});

test("unsupported patterns fail during compile instead of reaching a divergent matcher", async () => {
  for (const pattern of [
    "src/[ab].ts",
    "src/{a,b}.ts",
    "src/@(a).ts",
    "src/**suffix",
  ]) {
    const fixture = await createDeliveryFixture();
    try {
      fixture.contract.outcomes[0].product.owner.path_globs = ["src/**"];
      fixture.contract.outcomes[0].technical.expected_change_paths = [pattern];
      await writeContract(fixture.workdir, fixture.contract);
      await runCli(fixture.root, ["enable", "long-task"]);
      await assert.rejects(
        runCli(fixture.root, ["long-task", "compile", fixture.workdir]),
        /unsupported_repository_pattern_syntax/u,
        pattern,
      );
    } finally {
      await rm(fixture.root, { recursive: true, force: true });
    }
  }
});
