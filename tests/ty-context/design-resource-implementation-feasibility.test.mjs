import assert from "node:assert/strict";
import test from "node:test";
import { preflightDesignResourceHandoff } from "../../packages/ty-context/dist/index.js";
import {
  DESIGN_FEASIBILITY_PATH,
  DESIGN_HANDOFF_PATH,
  DESIGN_TECHNICAL_SOURCE_PATH,
  addDesignResourceImplementationFeasibility,
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
      (document) => {
        document.source_records[0].roles.push("planned_owner_authorization");
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
              authorization_source_refs: ["technical.fixture-substrate"],
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
    (document) => {
      const cell = document.component_family_cells[0];
      cell.feasible_realizations = [];
      cell.blocker_refs = ["blocker.card-owner"];
      document.blockers = [
        {
          key: "blocker.card-owner",
          component_family_ref: cell.component_family_ref,
          target_ref: cell.target_ref,
          condition_profile_ref: cell.condition_profile_ref,
          source_record_refs: ["technical.fixture-substrate"],
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
