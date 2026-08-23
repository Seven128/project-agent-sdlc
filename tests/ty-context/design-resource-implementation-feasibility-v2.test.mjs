import assert from "node:assert/strict";
import test from "node:test";
import { preflightDesignResourceHandoff } from "../../packages/ty-context/dist/index.js";
import { validateLongTaskDesignFeasibilityBindings } from "../../packages/ty-context/dist/lib/long-task-design-feasibility-binding.js";
import {
  SYMBOLIC_HANDOFF_PATH,
  SYMBOLIC_TARGET_KEY,
  writeDesignResourceSymbolicHandoffFixture,
} from "./design-resource-symbolic-handoff-fixture.mjs";
import { buildSymbolicFixtureModel } from "./design-resource-symbolic-handoff-fixture-model.mjs";
import { withRoot } from "./design-resource-implementation-feasibility-test-support.mjs";

test("Symbolic V2 validates exact reachable feasibility regions and legacy limitation", async () => {
  await withRoot(async (root) => {
    await writeDesignResourceSymbolicHandoffFixture(root, undefined, {
      feasibility: true,
    });
    const result = await preflightDesignResourceHandoff(
      root,
      SYMBOLIC_HANDOFF_PATH,
    );
    assert.deepEqual(result.limitations, []);
    assert.equal(result.technical_feasibility_identities.length, 1);
    assert.equal(
      result.technical_feasibility_documents[0].condition_model.kind,
      "symbolic_regions_v2",
    );
  });

  await withRoot(async (root) => {
    await writeDesignResourceSymbolicHandoffFixture(root);
    const result = await preflightDesignResourceHandoff(
      root,
      SYMBOLIC_HANDOFF_PATH,
    );
    assert.deepEqual(result.technical_feasibility_identities, []);
    assert.deepEqual(result.limitations, [
      "technical feasibility not declared",
    ]);
  });
});

test("Symbolic V2 rejects overlapping or incomplete feasibility regions", async () => {
  await withRoot(async (root) => {
    await writeDesignResourceSymbolicHandoffFixture(root, undefined, {
      feasibility: true,
      mutateFeasibility(document) {
        const region = structuredClone(
          document.condition_model.profiles[0].region,
        );
        document.condition_model.profiles.push({
          key: "overlap",
          region,
        });
      },
    });
    await assert.rejects(
      preflightDesignResourceHandoff(root, SYMBOLIC_HANDOFF_PATH),
      /symbolic_condition_profile_overlap/u,
    );
  });

  await withRoot(async (root) => {
    await writeDesignResourceSymbolicHandoffFixture(root, undefined, {
      feasibility: true,
      mutateFeasibility(document) {
        document.condition_model.profiles[0].region = {
          op: "eq",
          axis_ref: "condition.color-scheme",
          value: "light",
        };
      },
    });
    await assert.rejects(
      preflightDesignResourceHandoff(root, SYMBOLIC_HANDOFF_PATH),
      /symbolic_condition_profile_coverage_gap/u,
    );
  });
});

test("Symbolic V2 family cells bind the complete intersecting Rule set", async () => {
  for (const omitRule of [false, true]) {
    await withRoot(async (root) => {
      let ruleKeys = [];
      await writeDesignResourceSymbolicHandoffFixture(root, undefined, {
        modelFactory(resources, values) {
          const model = buildSymbolicFixtureModel(resources, values);
          model.manifest.subjects[0].kind = "component_family";
          ruleKeys = model.manifest.fact_rules.map((rule) => rule.key);
          return model;
        },
        feasibility: true,
        mutateFeasibility(document) {
          document.component_family_cells = [
            {
              key: "symbolic-family-all-reachable",
              component_family_ref: "surface.root",
              target_ref: document.target_ref,
              condition_profile_ref: "all-reachable",
              design_fact_refs: omitRule ? ruleKeys.slice(1) : ruleKeys,
              feasible_realizations: [
                {
                  key: "reuse-symbolic-root",
                  strategy_steps: ["reuse_existing", "theme_with_tokens"],
                  primitive_refs: ["fixture-symbolic-root"],
                  owner_candidates: [
                    {
                      kind: "existing_path",
                      locator: "design/technical-source.ts",
                      existence: "existing",
                    },
                  ],
                  supported_customization_surfaces: ["theme_tokens"],
                  feasibility_basis_refs: ["technical.symbolic-substrate"],
                  observed_costs: [],
                  observed_risks: [],
                },
              ],
              required_realization: {
                realization_ref: null,
                technical_authority_source_refs: [],
              },
              blocker_refs: [],
            },
          ];
        },
      });
      if (omitRule)
        await assert.rejects(
          preflightDesignResourceHandoff(root, SYMBOLIC_HANDOFF_PATH),
          /cell_design_rule_set_mismatch/u,
        );
      else {
        const preflight = await preflightDesignResourceHandoff(
          root,
          SYMBOLIC_HANDOFF_PATH,
        );
        const binding = {
          key: "symbolic-component",
          kind: "file",
          target: "design/technical-source.ts",
          carrier_paths: ["design/technical-source.ts"],
          existence: "existing",
        };
        assert.doesNotThrow(() =>
          validateLongTaskDesignFeasibilityBindings(
            {
              task: { source_paths: [] },
              source_claims: [],
              global: { acceptance: { external_confirmations: [] } },
              outcomes: [
                {
                  key: "symbolic-outcome",
                  technical: { bindings: [binding] },
                },
              ],
            },
            {
              outcome_key: "symbolic-outcome",
              binding: {
                route_binding_ref: binding.key,
                component_binding_refs: [binding.key],
              },
              target: { key: SYMBOLIC_TARGET_KEY, claim_refs: [] },
            },
            preflight,
            [],
          ),
        );
      }
    });
  }
});
