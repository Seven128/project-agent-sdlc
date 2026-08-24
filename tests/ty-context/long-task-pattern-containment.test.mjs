import assert from "node:assert/strict";
import { readFile, rm } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import YAML from "yaml";
import { expandedPatterns } from "../../packages/ty-context/dist/lib/long-task-authority-revision-details.js";
import { parseDeliveryContractText } from "../../packages/ty-context/dist/lib/long-task-delivery-parser.js";
import { validateFeasibilityBindingOwnerRoots } from "../../packages/ty-context/dist/lib/long-task-design-feasibility-binding-owners.js";
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
    ["apps/mobile/app/(map)/_layout.tsx", "apps/mobile/app/(map)/**"],
    ["apps/mobile/app/(map)/**", "apps/mobile/**"],
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
    ["apps/mobile/app/(map)/**", "apps/mobile/app/(settings)/**"],
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
  const expectedProductionOwnerPaths = productionOwnerPaths(expectedPath);
  expectedPath.outcomes[0].product.owner.path_globs = [
    "src/safe/*.ts",
    ...expectedProductionOwnerPaths,
  ];
  expectedPath.outcomes[0].technical.expected_change_paths = ["src/safe/**"];
  assert.throws(
    () => parse(expectedPath),
    /path_outside_owner_boundary:first:src\/safe\/\*\*/u,
  );

  const supportPath = deliveryContract();
  const supportProductionOwnerPaths = productionOwnerPaths(supportPath);
  const supportProductionPaths = productionSupportPaths(supportPath);
  supportPath.outcomes[0].product.owner.path_globs = [
    "src/safe/*.ts",
    ...supportProductionOwnerPaths,
  ];
  supportPath.outcomes[0].technical.expected_change_paths = ["src/safe/a.ts"];
  supportPath.outcomes[0].technical.allowed_support_paths = [
    "src/safe/**",
    ...supportProductionPaths,
  ];
  assert.throws(
    () => parse(supportPath),
    /path_outside_owner_boundary:first:src\/safe\/\*\*/u,
  );

  const binding = deliveryContract();
  const bindingProductionOwnerPaths = productionOwnerPaths(binding);
  binding.outcomes[0].product.owner.path_globs = [
    "src/safe/*",
    ...bindingProductionOwnerPaths,
  ];
  binding.outcomes[0].technical.expected_change_paths = ["src/safe/*.ts"];
  const stateBinding = binding.outcomes[0].technical.bindings.find(
    (candidate) => candidate.key === "state-first",
  );
  assert.ok(stateBinding);
  stateBinding.carrier_paths = ["src/safe/**"];
  assert.throws(
    () => parse(binding),
    /binding_carrier_outside_owner_boundary:first:state-first:src\/safe\/\*\*/u,
  );
});

test("feasibility production bindings prove every actual path inside observed owner roots", () => {
  const route = binding({
    key: "route",
    target: "src/routes/main.ts",
    carrier_paths: ["src/routes/main.ts"],
  });
  const positive = binding({
    key: "component",
    target: "src/components/Card.ts",
    carrier_paths: ["src/components/Card.ts", "src/shared/theme.ts"],
  });
  assert.doesNotThrow(() =>
    validateFeasibilityBindingOwnerRoots(
      feasibilityOwnerDocument({
        componentRoots: ["src/components", "src/shared"],
      }),
      [positive],
      route,
    ),
  );

  for (const [name, candidate, expectedDetail] of [
    [
      "file target inside and carrier outside",
      binding({
        target: "src/components/Card.ts",
        carrier_paths: ["legacy/Card.ts"],
      }),
      "legacy/Card.ts",
    ],
    [
      "file target outside and carrier inside",
      binding({
        target: "legacy/Card.ts",
        carrier_paths: ["src/components/Card.ts"],
      }),
      "legacy/Card.ts",
    ],
    [
      "path glob target outside",
      binding({
        kind: "path_glob",
        target: "legacy/**/*.ts",
        carrier_paths: ["src/components/**/*.ts"],
      }),
      "legacy/**/*.ts",
    ],
    [
      "verified carrier outside while logical target is ignored",
      binding({
        kind: "verified",
        target: "logical-component-owner",
        carrier_paths: ["legacy/Card.ts"],
        verification_check_key: "component-check",
      }),
      "legacy/Card.ts",
    ],
    [
      "planned carrier outside",
      binding({
        target: "src/components/PlannedCard.ts",
        carrier_paths: ["legacy/PlannedCard.ts"],
        existence: "planned",
      }),
      "legacy/PlannedCard.ts",
    ],
    [
      "one of several carriers outside",
      binding({
        target: "src/components/Card.ts",
        carrier_paths: ["src/components/Card.ts", "legacy/theme.ts"],
      }),
      "legacy/theme.ts",
    ],
    [
      "same-prefix wildcard is not an owner child",
      binding({
        kind: "path_glob",
        target: "src/components*/**",
        carrier_paths: ["src/components/Card.ts"],
      }),
      "src/components*/**",
    ],
    [
      "unknown subset fails closed",
      binding({
        kind: "path_glob",
        target: "src/**/Card.ts",
        carrier_paths: ["src/components/Card.ts"],
      }),
      "unknown",
    ],
  ]) {
    assert.throws(
      () =>
        validateFeasibilityBindingOwnerRoots(
          feasibilityOwnerDocument(),
          [candidate],
          route,
        ),
      (error) => {
        assert.match(
          error.message,
          /feasibility_component_binding_outside_owner_roots/u,
          name,
        );
        assert.match(error.message, new RegExp(escapeRegex(expectedDetail), "u"));
        return true;
      },
    );
  }

  assert.throws(
    () =>
      validateFeasibilityBindingOwnerRoots(
        feasibilityOwnerDocument(),
        [
          binding({
            target: "src/components/PlannedCard.ts",
            carrier_paths: [],
            existence: "planned",
          }),
        ],
        route,
      ),
    /feasibility_planned_binding_carrier_required/u,
  );

  assert.throws(
    () =>
      validateFeasibilityBindingOwnerRoots(
        feasibilityOwnerDocument(),
        [
          binding({
            target: "src/components/Card.ts",
            carrier_paths: ["src/components/Card.ts"],
          }),
        ],
        binding({
          key: "route",
          target: "legacy/routes/main.ts",
          carrier_paths: ["src/routes/main.ts"],
        }),
      ),
    /feasibility_route_binding_outside_owner_roots:route:legacy\/routes\/main\.ts/u,
  );

  assert.throws(
    () =>
      validateFeasibilityBindingOwnerRoots(
        feasibilityOwnerDocument({ routeDisposition: "not_applicable" }),
        [],
        route,
      ),
    /feasibility_route_owner_roots_required/u,
  );

  assert.doesNotThrow(() =>
    validateFeasibilityBindingOwnerRoots(
      feasibilityOwnerDocument({
        componentDisposition: "decision_required",
      }),
      [],
      route,
    ),
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
    const supportPaths = [...outcome.technical.allowed_support_paths];
    outcome.technical.expected_change_paths = ["src/safe/*.ts"];
    outcome.technical.allowed_support_paths = [
      "src/state.json",
      ...supportPaths,
    ];
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

function productionOwnerPaths(contract) {
  return contract.outcomes[0].product.owner.path_globs.filter(
    (pattern) => pattern !== "src/**",
  );
}

function productionSupportPaths(contract) {
  return contract.outcomes[0].technical.allowed_support_paths.filter(
    (pattern) => pattern !== "src/**",
  );
}

function binding(overrides = {}) {
  return {
    key: "component",
    kind: "file",
    target: "src/components/Card.ts",
    carrier_paths: ["src/components/Card.ts"],
    existence: "existing",
    ...overrides,
  };
}

function feasibilityOwnerDocument({
  componentRoots = ["src/components"],
  routeRoots = ["src/routes"],
  componentDisposition = "observed",
  routeDisposition = "observed",
} = {}) {
  return {
    substrate_observations: [
      {
        kind: "component_owner_roots",
        disposition: componentDisposition,
        value:
          componentDisposition === "observed"
            ? { kind: "repository_paths", paths: componentRoots }
            : null,
      },
      {
        kind: "route_owner_roots",
        disposition: routeDisposition,
        value:
          routeDisposition === "observed"
            ? { kind: "repository_paths", paths: routeRoots }
            : null,
      },
    ],
  };
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}
