import assert from "node:assert/strict";
import { mkdir, symlink } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { preflightDesignResourceHandoff } from "../../packages/ty-context/dist/index.js";
import { deriveComponentFamilySubjectClosure } from "../../packages/ty-context/dist/lib/design-resource-implementation-feasibility-model.js";
import { parseDesignResourceFeasibilityDecisionProjections } from "../../packages/ty-context/dist/lib/design-resource-implementation-feasibility-source-decision.js";
import { validateDesignFactRefs } from "../../packages/ty-context/dist/lib/design-resource-implementation-feasibility-validation-facts.js";
import { validateNoExactVisualValueCarriers } from "../../packages/ty-context/dist/lib/design-resource-implementation-feasibility-validation-support.js";
import {
  DESIGN_FEASIBILITY_PATH,
  DESIGN_HANDOFF_PATH,
  DESIGN_TARGET_KEY,
  DESIGN_TECHNICAL_SOURCE_PATH,
  addDesignResourceImplementationFeasibility,
  addV1FeasibilityDecisionSource,
  v1FeasibilityConditionScopeSha256,
  writeDesignResourceHandoff,
  writeDesignResourceHandoffFixture,
} from "./design-resource-handoff-fixture.mjs";
import {
  withRoot,
  withV1Mutation,
} from "./design-resource-implementation-feasibility-test-support.mjs";

test("V1 feasibility is Source-bound, complete and outside canonical resources", async () => {
  await withRoot(async (root) => {
    const { handoff } = await writeDesignResourceHandoffFixture(
      root,
      undefined,
      { feasibility: true },
    );
    const result = await preflightDesignResourceHandoff(
      root,
      DESIGN_HANDOFF_PATH,
    );
    assert.deepEqual(result.limitations, []);
    assert.deepEqual(result.technical_feasibility_identities, [
      {
        key: "main-default-feasibility",
        target_ref: "main-default",
        path: DESIGN_FEASIBILITY_PATH,
        sha256: handoff.technical_feasibility_inputs[0].sha256,
        realization_mode: "native_substrate",
        component_family_cells: 1,
        blockers: 0,
      },
    ]);
    assert.equal(result.technical_feasibility_documents.length, 1);
    assert.ok(
      result.technical_feasibility_documents[0].component_family_cells[0]
        .design_fact_refs.length > 0,
    );
    assert.ok(
      !result.handoff.resources.some(
        (resource) =>
          resource.path === DESIGN_FEASIBILITY_PATH ||
          resource.path === DESIGN_TECHNICAL_SOURCE_PATH,
      ),
    );
    assert.ok(
      !result.handoff.targets[0].resource_refs.includes(
        "main-default-feasibility",
      ),
    );
    assert.equal(result.resource_hashes["main-default-feasibility"], undefined);
  });
});

test("one technical file may expose distinct bounded Source locators", async () => {
  await withV1Mutation(
    (document) => {
      const source = document.source_records[0];
      document.source_records.push({
        key: "technical.fixture-platform",
        path: source.path,
        media_type: source.media_type,
        sha256: source.sha256,
        locator: {
          kind: "source_anchor",
          value: "export const platform",
        },
        roles: ["technical_platform"],
      });
      const platform = document.substrate_observations.find(
        (item) => item.kind === "platform",
      );
      platform.source_record_refs = ["technical.fixture-platform"];
    },
    (root) => preflightDesignResourceHandoff(root, DESIGN_HANDOFF_PATH),
  );
});

test("V1 permits composite and planned candidates while requiring candidate-or-blocker closure", async () => {
  await withRoot(async (root) => {
    const { handoff } = await writeDesignResourceHandoffFixture(root);
    await addDesignResourceImplementationFeasibility(
      root,
      handoff,
      async (document) => {
        const cell = document.component_family_cells[0];
        const authorizationSource = await addV1FeasibilityDecisionSource(
          root,
          document,
          {
            recordKey: "technical.planned-card-owner",
            itemKey: "planned-card-owner",
            itemKind: "technical_obligation",
            roles: ["planned_owner_authorization"],
            projections: [
              {
                mode: "planned_owner_authorization",
                target_ref: cell.target_ref,
                component_family_ref: cell.component_family_ref,
                condition_scope_sha256:
                  v1FeasibilityConditionScopeSha256(
                    document,
                    cell.condition_profile_ref,
                  ),
                owner_locator: "planned-card-owner",
              },
            ],
          },
        );
        document.component_family_cells[0].feasible_realizations.push({
          key: "compose-planned-card",
          strategy_steps: [
            "compose_existing",
            "create_shared_component",
            "theme_with_tokens",
          ],
          primitive_refs: [
            "fixture-surface",
            "fixture-content",
            "fixture-theme",
          ],
          owner_candidates: [
            {
              kind: "planned_logical_owner",
              locator: "planned-card-owner",
              existence: "planned",
              authorization_source_refs: [authorizationSource.recordRef],
            },
          ],
          supported_customization_surfaces: ["composition", "theme_tokens"],
          feasibility_basis_refs: ["technical.fixture-substrate"],
          observed_costs: ["one shared owner must be added"],
          observed_risks: [],
        });
      },
    );
    await writeDesignResourceHandoff(root, handoff);
    const result = await preflightDesignResourceHandoff(
      root,
      DESIGN_HANDOFF_PATH,
    );
    assert.equal(
      result.technical_feasibility_documents[0].component_family_cells[0]
        .feasible_realizations.length,
      2,
    );
  });

  await withV1Mutation(
    async (document, root) => {
      const cell = document.component_family_cells[0];
      const blockerSource = await addV1FeasibilityDecisionSource(
        root,
        document,
        {
          recordKey: "technical.card-owner-blocker",
          itemKey: "card-owner-blocker",
          itemKind: "decision",
          roles: ["feasibility_basis"],
          projections: [
            {
              mode: "feasibility_blocker",
              target_ref: cell.target_ref,
              component_family_ref: cell.component_family_ref,
              condition_scope_sha256: v1FeasibilityConditionScopeSha256(
                document,
                cell.condition_profile_ref,
              ),
              blocker_ref: "blocker.card-owner",
            },
          ],
        },
      );
      cell.feasible_realizations = [];
      cell.blocker_refs = ["blocker.card-owner"];
      const unresolved = document.substrate_observations.find(
        (observation) => observation.kind === "ui_system",
      );
      unresolved.disposition = "decision_required";
      unresolved.value = null;
      unresolved.source_record_refs = [];
      unresolved.reason = "The shared UI owner still requires a decision.";
      document.blockers = [
        {
          key: "blocker.card-owner",
          component_family_ref: cell.component_family_ref,
          target_ref: cell.target_ref,
          condition_profile_ref: cell.condition_profile_ref,
          source_record_refs: [blockerSource.recordRef],
          description: "The approved shared owner is unresolved.",
        },
      ];
    },
    async (root) => {
      const result = await preflightDesignResourceHandoff(
        root,
        DESIGN_HANDOFF_PATH,
      );
      assert.equal(result.technical_feasibility_identities[0].blockers, 1);
    },
  );

  await withV1Mutation(
    (document) => {
      document.component_family_cells[0].feasible_realizations = [];
    },
    (root) =>
      assert.rejects(
        preflightDesignResourceHandoff(root, DESIGN_HANDOFF_PATH),
        /cell_candidate_or_blocker_required/u,
      ),
  );
});

test("V1 rejects unowned plans, unauthorized mandatory choices and visual-value smuggling fields", async () => {
  await withV1Mutation(
    (document) => {
      document.component_family_cells[0].feasible_realizations[0].owner_candidates =
        [
          {
            kind: "planned_logical_owner",
            locator: "unapproved-card-owner",
            existence: "planned",
            authorization_source_refs: [],
          },
        ];
    },
    (root) =>
      assert.rejects(
        preflightDesignResourceHandoff(root, DESIGN_HANDOFF_PATH),
        /planned_owner_authorization_required/u,
      ),
  );

  await withV1Mutation(
    (document) => {
      document.component_family_cells[0].required_realization.realization_ref =
        "reuse-project-card";
    },
    (root) =>
      assert.rejects(
        preflightDesignResourceHandoff(root, DESIGN_HANDOFF_PATH),
        /required_realization_authority_required/u,
      ),
  );

  await withV1Mutation(
    (document) => {
      document.component_family_cells[0].feasible_realizations[0].exact_visual_values =
        { color: "#fff", radius: 12 };
    },
    (root) =>
      assert.rejects(
        preflightDesignResourceHandoff(root, DESIGN_HANDOFF_PATH),
        /unknown keys: exact_visual_values/u,
      ),
  );

  await withV1Mutation(
    (document) => {
      document.production_conformance = "passed";
    },
    (root) =>
      assert.rejects(
        preflightDesignResourceHandoff(root, DESIGN_HANDOFF_PATH),
        /unknown keys: production_conformance/u,
      ),
  );

  await withV1Mutation(
    (document) => {
      document.component_family_cells[0].feasible_realizations[0].observed_risks =
        ["fallback would copy border-radius: 12px"];
    },
    (root) =>
      assert.rejects(
        preflightDesignResourceHandoff(root, DESIGN_HANDOFF_PATH),
        /exact_visual_value_forbidden/u,
      ),
  );
});

test("substrate dispositions carry an explicit reason without inventing values", async () => {
  await withV1Mutation(
    (document) => {
      const observation = document.substrate_observations.find(
        (item) => item.kind === "route_owner_roots",
      );
      observation.disposition = "not_applicable";
      observation.value = null;
      observation.source_record_refs = [];
      observation.reason =
        "The selected component workbench has no route boundary.";
    },
    (root) => preflightDesignResourceHandoff(root, DESIGN_HANDOFF_PATH),
  );

  await withV1Mutation(
    (document) => {
      const observation = document.substrate_observations.find(
        (item) => item.kind === "route_owner_roots",
      );
      observation.disposition = "not_applicable";
      observation.value = null;
      observation.source_record_refs = [];
      observation.reason = null;
    },
    (root) =>
      assert.rejects(
        preflightDesignResourceHandoff(root, DESIGN_HANDOFF_PATH),
        /unobserved_substrate_reason_required/u,
      ),
  );
});

test("exact marked technical Source Items authorize mandatory feasibility decisions", async () => {
  await withRoot(async (root) => {
    const { handoff } = await writeRequiredDecisionFixture(root);
    await writeDesignResourceHandoff(root, handoff);
    await preflightDesignResourceHandoff(root, DESIGN_HANDOFF_PATH);
  });

  const cases = [
    {
      name: "ordinary source locator",
      mutate({ record }) {
        record.locator = {
          kind: "source_anchor",
          value: "Technical feasibility decision source",
        };
      },
      expected: /source_item_authority_required/u,
    },
    {
      name: "missing item key",
      mutate({ record }) {
        record.locator.value = "missing-feasibility-item";
      },
      expected: /source_item_missing/u,
    },
    {
      name: "stale item digest",
      mutate({ record }) {
        record.locator.text_sha256 = "0".repeat(64);
      },
      expected: /source_item_text_digest_mismatch/u,
    },
    {
      name: "wrong item kind",
      itemKind: "requirement",
      expected: /source_decision_item_kind_invalid/u,
    },
    {
      name: "wrong projection mode",
      projection: {
        mode: "planned_owner_authorization",
        owner_locator: "planned-card-owner",
      },
      expected: /source_decision_projection_count/u,
    },
    {
      name: "wrong target",
      projection: { target_ref: "other-target" },
      expected: /source_decision_projection_count/u,
    },
    {
      name: "wrong family",
      projection: { component_family_ref: "component-family.other" },
      expected: /source_decision_projection_count/u,
    },
    {
      name: "wrong condition scope",
      projection: { condition_scope_sha256: "1".repeat(64) },
      expected: /source_decision_projection_count/u,
    },
    {
      name: "wrong realization",
      projection: { realization_ref: "other-realization" },
      expected: /source_decision_projection_count/u,
    },
  ];
  for (const scenario of cases)
    await withRoot(async (root) => {
      const { handoff } = await writeRequiredDecisionFixture(root, scenario);
      await writeDesignResourceHandoff(root, handoff);
      await assert.rejects(
        preflightDesignResourceHandoff(root, DESIGN_HANDOFF_PATH),
        scenario.expected,
        scenario.name,
      );
    });

  await withRoot(async (root) => {
    const { handoff } = await writeRequiredDecisionFixture(root, {
      extraProjections: [
        {
          mode: "planned_owner_authorization",
          target_ref: DESIGN_TARGET_KEY,
          component_family_ref: "component-family.card",
          condition_scope_sha256: null,
          owner_locator: "future-card-owner",
        },
      ],
    });
    await writeDesignResourceHandoff(root, handoff);
    await preflightDesignResourceHandoff(root, DESIGN_HANDOFF_PATH);
  });

  assert.throws(
    () =>
      parseDesignResourceFeasibilityDecisionProjections(
        "technical.md",
        "decision-item",
        '<!-- ty-design-feasibility-decision-v1 {"schema_version":"design-resource-feasibility-decision-v1","mode":"required_realization","mode":"required_realization","target_ref":"main-default","component_family_ref":"component-family.card","condition_scope_sha256":"0000000000000000000000000000000000000000000000000000000000000000","realization_ref":"reuse-project-card"} -->',
      ),
    /source_decision_projection_invalid/u,
  );
});

test("planned owners and blockers cannot rely on role-only Source", async () => {
  await withV1Mutation(
    (document) => {
      document.source_records[0].roles.push("planned_owner_authorization");
      document.component_family_cells[0].feasible_realizations[0].owner_candidates =
        [
          {
            kind: "planned_logical_owner",
            locator: "role-only-owner",
            existence: "planned",
            authorization_source_refs: ["technical.fixture-substrate"],
          },
        ];
    },
    (root) =>
      assert.rejects(
        preflightDesignResourceHandoff(root, DESIGN_HANDOFF_PATH),
        /source_item_authority_required/u,
      ),
  );

  await withV1Mutation(
    (document) => {
      const cell = document.component_family_cells[0];
      cell.feasible_realizations = [];
      cell.blocker_refs = ["blocker.role-only"];
      document.blockers = [
        {
          key: "blocker.role-only",
          component_family_ref: cell.component_family_ref,
          target_ref: cell.target_ref,
          condition_profile_ref: cell.condition_profile_ref,
          source_record_refs: ["technical.fixture-substrate"],
          description: "The technical owner remains unresolved.",
        },
      ];
    },
    (root) =>
      assert.rejects(
        preflightDesignResourceHandoff(root, DESIGN_HANDOFF_PATH),
        /source_decision_projection_count/u,
      ),
  );
});

test("component family closure is transitive and cycle-safe for V1 and V2", () => {
  const subjects = [
    subject("family", null, null, null),
    subject("instance", null, "family", null),
    subject("anatomy", "instance", null, "cycle-tail"),
    subject("text", "anatomy", null, null),
    subject("asset", "instance", null, null),
    subject("cycle-tail", "text", null, "anatomy"),
  ];
  const closure = deriveComponentFamilySubjectClosure(["family"], subjects);
  assert.deepEqual(
    [...closure.get("family")].sort(),
    ["anatomy", "asset", "cycle-tail", "family", "instance", "text"],
  );

  const v1Document = feasibilityFactValidationDocument(
    "explicit_conditions_v1",
  );
  const v1Cell = v1Document.component_family_cells[0];
  const v1Model = {
    representation: "fact_cells_v1",
    target_ref: DESIGN_TARGET_KEY,
    source_profile_kind: "implementation_web",
    component_family_refs: ["family"],
    component_family_subject_refs: closure,
    condition_refs: ["condition.default"],
    facts: new Map([
      [
        "fact.family",
        {
          target_ref: DESIGN_TARGET_KEY,
          subject_ref: "family",
          condition_ref: "condition.default",
        },
      ],
      [
        "fact.anatomy",
        {
          target_ref: DESIGN_TARGET_KEY,
          subject_ref: "anatomy",
          condition_ref: "condition.default",
        },
      ],
      [
        "fact.asset",
        {
          target_ref: DESIGN_TARGET_KEY,
          subject_ref: "asset",
          condition_ref: "condition.default",
        },
      ],
    ]),
  };
  v1Cell.design_fact_refs = ["fact.family", "fact.anatomy", "fact.asset"];
  assert.doesNotThrow(() => validateDesignFactRefs(v1Cell, v1Model, v1Document));
  v1Cell.design_fact_refs = ["fact.family", "fact.asset"];
  assert.throws(
    () => validateDesignFactRefs(v1Cell, v1Model, v1Document),
    /cell_design_fact_set_mismatch/u,
  );
  v1Cell.design_fact_refs = ["fact.family", "fact.anatomy"];
  assert.throws(
    () => validateDesignFactRefs(v1Cell, v1Model, v1Document),
    /cell_design_fact_set_mismatch/u,
  );

  const v2Document = feasibilityFactValidationDocument("symbolic_regions_v2");
  const v2Cell = v2Document.component_family_cells[0];
  const always = {
    op: "in",
    axis_ref: "condition.mode",
    values: ["default"],
  };
  const v2Model = {
    representation: "symbolic_rules_v2",
    target_ref: DESIGN_TARGET_KEY,
    source_profile_kind: "implementation_web",
    component_family_refs: ["family"],
    component_family_subject_refs: closure,
    axis_domains: [
      { key: "condition.mode", kind: "enum", values: ["default"] },
    ],
    reachable_region: always,
    fact_rules: new Map([
      ["rule.family", symbolicRule("rule.family", "family", always)],
      ["rule.anatomy", symbolicRule("rule.anatomy", "anatomy", always)],
    ]),
  };
  v2Cell.design_fact_refs = ["rule.family"];
  assert.throws(
    () => validateDesignFactRefs(v2Cell, v2Model, v2Document),
    /cell_design_rule_set_mismatch/u,
  );
});

test("all feasibility prose carriers reject exact visual values", () => {
  const values = [
    "Fallback color is #ffffff",
    "Fallback color is rgb(255, 255, 255)",
    "Needs 16px padding",
    "Use border-radius: 12px",
    "Could override --brand-color: red",
    "Animation lasts 200ms",
    "Shadow is 0 2px 8px rgba(0,0,0,.2)",
  ];
  for (const carrier of [
    "observation_reason",
    "observed_cost",
    "observed_risk",
    "blocker_description",
  ])
    for (const value of values) {
      const document = proseValidationDocument();
      if (carrier === "observation_reason")
        document.substrate_observations[0].reason = value;
      if (carrier === "observed_cost")
        document.component_family_cells[0].feasible_realizations[0].observed_costs =
          [value];
      if (carrier === "observed_risk")
        document.component_family_cells[0].feasible_realizations[0].observed_risks =
          [value];
      if (carrier === "blocker_description")
        document.blockers[0].description = value;
      assert.throws(
        () => validateNoExactVisualValueCarriers(document),
        /exact_visual_value_forbidden/u,
        `${carrier}: ${value}`,
      );
    }
});

test("substrate observation kinds and repository owner roots fail closed", async () => {
  await withV1Mutation(
    (document) => {
      const roots = document.substrate_observations.find(
        (item) => item.kind === "component_owner_roots",
      );
      roots.value = {
        kind: "identifier",
        name: "components",
        version_source_ref: null,
      };
    },
    (root) =>
      assert.rejects(
        preflightDesignResourceHandoff(root, DESIGN_HANDOFF_PATH),
        /observation_value_kind_invalid/u,
      ),
  );
  for (const [ownerRoot, expected] of [
    ["missing-components", /protected_input_not_found/u],
    [DESIGN_TECHNICAL_SOURCE_PATH, /protected_input_not_directory/u],
  ])
    await withV1Mutation(
      (document) => {
        const roots = document.substrate_observations.find(
          (item) => item.kind === "component_owner_roots",
        );
        roots.value.paths = [ownerRoot];
      },
      (root) =>
        assert.rejects(
          preflightDesignResourceHandoff(root, DESIGN_HANDOFF_PATH),
          expected,
        ),
    );
  await withV1Mutation(
    async (document, root) => {
      const target = path.join(root, "owned-components");
      const link = path.join(root, "linked-components");
      await mkdir(target);
      await symlink(target, link, "junction");
      const roots = document.substrate_observations.find(
        (item) => item.kind === "component_owner_roots",
      );
      roots.value.paths = ["linked-components"];
    },
    (root) =>
      assert.rejects(
        preflightDesignResourceHandoff(root, DESIGN_HANDOFF_PATH),
        /protected_input_symlink_not_allowed/u,
      ),
  );
  await withV1Mutation(
    (document) => {
      const roots = document.substrate_observations.find(
        (item) => item.kind === "component_owner_roots",
      );
      roots.value.paths = ["design"];
    },
    (root) =>
      assert.rejects(
        preflightDesignResourceHandoff(root, DESIGN_HANDOFF_PATH),
        /existing_owner_outside_component_roots/u,
      ),
  );
  for (const disposition of ["unavailable", "decision_required"])
    await withV1Mutation(
      (document) => {
        const uiSystem = document.substrate_observations.find(
          (item) => item.kind === "ui_system",
        );
        uiSystem.disposition = disposition;
        uiSystem.value = null;
        uiSystem.source_record_refs = [];
        uiSystem.reason = "The repository does not yet expose this owner.";
      },
      (root) =>
        assert.rejects(
          preflightDesignResourceHandoff(root, DESIGN_HANDOFF_PATH),
          /unresolved_substrate_blocker_required/u,
        ),
    );
  await withV1Mutation(
    async (document, root) => {
      await mkdir(path.join(root, "components"));
      const roots = document.substrate_observations.find(
        (item) => item.kind === "component_owner_roots",
      );
      roots.value.paths = ["src", "components"];
      const token = document.substrate_observations.find(
        (item) => item.kind === "token_theming_adapter",
      );
      token.value = {
        kind: "repository_paths",
        paths: [DESIGN_TECHNICAL_SOURCE_PATH],
      };
      const route = document.substrate_observations.find(
        (item) => item.kind === "route_owner_roots",
      );
      route.disposition = "not_applicable";
      route.value = null;
      route.source_record_refs = [];
      route.reason = "The component workbench has no route owner.";
    },
    (root) => preflightDesignResourceHandoff(root, DESIGN_HANDOFF_PATH),
  );
});

async function writeRequiredDecisionFixture(root, options = {}) {
  const { handoff } = await writeDesignResourceHandoffFixture(root);
  let authority;
  await addDesignResourceImplementationFeasibility(
    root,
    handoff,
    async (document) => {
      const cell = document.component_family_cells[0];
      const conditionScope = v1FeasibilityConditionScopeSha256(
        document,
        cell.condition_profile_ref,
      );
      const baseProjection = {
        mode: "required_realization",
        target_ref: cell.target_ref,
        component_family_ref: cell.component_family_ref,
        condition_scope_sha256: conditionScope,
        realization_ref: "reuse-project-card",
        ...(options.projection ?? {}),
      };
      if (baseProjection.mode !== "required_realization")
        delete baseProjection.realization_ref;
      const extraProjections = (options.extraProjections ?? []).map(
        (projection) => ({
          ...projection,
          condition_scope_sha256:
            projection.condition_scope_sha256 ?? conditionScope,
        }),
      );
      authority = await addV1FeasibilityDecisionSource(root, document, {
        recordKey: "technical.required-card-realization",
        itemKey: "required-card-realization",
        itemKind: options.itemKind ?? "technical_obligation",
        roles: ["technical_authority"],
        projections: [baseProjection, ...extraProjections],
      });
      cell.required_realization = {
        realization_ref: "reuse-project-card",
        technical_authority_source_refs: [authority.recordRef],
      };
      const record = document.source_records.find(
        (candidate) => candidate.key === authority.recordRef,
      );
      options.mutate?.({ document, cell, record, authority });
    },
  );
  return { handoff, authority };
}

function subject(key, parent_ref, instance_of_ref, override_of_ref) {
  return {
    key,
    family_ref: null,
    parent_ref,
    instance_of_ref,
    override_of_ref,
  };
}

function feasibilityFactValidationDocument(kind) {
  const profile =
    kind === "explicit_conditions_v1"
      ? { key: "profile", condition_refs: ["condition.default"] }
      : {
          key: "profile",
          region: {
            op: "in",
            axis_ref: "condition.mode",
            values: ["default"],
          },
        };
  return {
    target_ref: DESIGN_TARGET_KEY,
    condition_model: { kind, profiles: [profile] },
    component_family_cells: [
      {
        key: "cell",
        component_family_ref: "family",
        target_ref: DESIGN_TARGET_KEY,
        condition_profile_ref: "profile",
        design_fact_refs: [],
      },
    ],
  };
}

function symbolicRule(key, subjectRef, region) {
  return {
    key,
    target_ref: DESIGN_TARGET_KEY,
    subject_or_relation_ref: subjectRef,
    region,
  };
}

function proseValidationDocument() {
  return {
    substrate_observations: [{ kind: "ui_system", reason: null }],
    component_family_cells: [
      {
        feasible_realizations: [
          {
            key: "realization",
            observed_costs: [],
            observed_risks: [],
          },
        ],
      },
    ],
    blockers: [{ key: "blocker", description: "Owner is unresolved." }],
  };
}
