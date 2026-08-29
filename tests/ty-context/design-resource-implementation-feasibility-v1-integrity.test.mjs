import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { promisify } from "node:util";
import { preflightDesignResourceHandoff } from "../../packages/ty-context/dist/index.js";
import {
  DESIGN_FACT_MANIFEST_PATH,
  DESIGN_HANDOFF_PATH,
  addDesignResourceImplementationFeasibility,
  manifestBackedDesignResourceHandoff,
  writeDesignResourceHandoff,
  writeDesignResourceHandoffFixture,
} from "./design-resource-handoff-fixture.mjs";
import {
  LEGACY_DESIGN_AUTHORITY_LIMITATION,
  cli,
  withRoot,
  withV1Mutation,
} from "./design-resource-implementation-feasibility-test-support.mjs";

const exec = promisify(execFile);

test("V1 rejects incomplete coverage, canonical mixing and stale technical Source", async () => {
  await withV1Mutation(
    (document) => {
      document.component_family_cells[0].design_fact_refs.pop();
    },
    (root) =>
      assert.rejects(
        preflightDesignResourceHandoff(root, DESIGN_HANDOFF_PATH),
        /cell_design_fact_set_mismatch/u,
      ),
  );

  await withV1Mutation(
    (document) => {
      document.source_records[0].roles =
        document.source_records[0].roles.filter(
          (role) => role !== "capability_basis",
        );
    },
    (root) =>
      assert.rejects(
        preflightDesignResourceHandoff(root, DESIGN_HANDOFF_PATH),
        /realization_capability_basis_role_missing/u,
      ),
  );

  await withV1Mutation(
    (document) => {
      document.component_family_cells = [];
    },
    (root) =>
      assert.rejects(
        preflightDesignResourceHandoff(root, DESIGN_HANDOFF_PATH),
        /component_family_condition_cell_set_mismatch/u,
      ),
  );

  await withV1Mutation(
    (document) => {
      const duplicate = structuredClone(document.component_family_cells[0]);
      duplicate.key = "duplicate-card-cell";
      document.component_family_cells.push(duplicate);
    },
    (root) =>
      assert.rejects(
        preflightDesignResourceHandoff(root, DESIGN_HANDOFF_PATH),
        /component_family_condition_cell_duplicate/u,
      ),
  );

  await withV1Mutation(
    (document) => {
      document.component_family_cells[0].target_ref = "foreign-target";
    },
    (root) =>
      assert.rejects(
        preflightDesignResourceHandoff(root, DESIGN_HANDOFF_PATH),
        /cell_target_mismatch/u,
      ),
  );

  await withRoot(async (root) => {
    const { handoff } = await writeDesignResourceHandoffFixture(root);
    await addDesignResourceImplementationFeasibility(root, handoff);
    const canonicalManifest = handoff.resources.find(
      (item) => item.path === DESIGN_FACT_MANIFEST_PATH,
    );
    handoff.technical_feasibility_inputs[0].path = DESIGN_FACT_MANIFEST_PATH;
    handoff.technical_feasibility_inputs[0].sha256 = canonicalManifest.sha256;
    await writeDesignResourceHandoff(root, handoff);
    await assert.rejects(
      preflightDesignResourceHandoff(root, DESIGN_HANDOFF_PATH),
      /input_mixed_into_canonical_resources/u,
    );
  });

  await withV1Mutation(
    (document) => {
      document.source_records[0].sha256 = "0".repeat(64);
    },
    (root) =>
      assert.rejects(
        preflightDesignResourceHandoff(root, DESIGN_HANDOFF_PATH),
        /source_record_digest_mismatch/u,
      ),
  );

  await withRoot(async (root) => {
    const { handoff } = await writeDesignResourceHandoffFixture(root);
    await addDesignResourceImplementationFeasibility(root, handoff);
    handoff.technical_feasibility_inputs[0].sha256 = "0".repeat(64);
    await writeDesignResourceHandoff(root, handoff);
    await assert.rejects(
      preflightDesignResourceHandoff(root, DESIGN_HANDOFF_PATH),
      /input_digest_mismatch/u,
    );
  });

  await withRoot(async (root) => {
    const { handoff } = await writeDesignResourceHandoffFixture(root);
    await addDesignResourceImplementationFeasibility(root, handoff);
    handoff.technical_feasibility_inputs[0].target_ref = "foreign-target";
    await writeDesignResourceHandoff(root, handoff);
    await assert.rejects(
      preflightDesignResourceHandoff(root, DESIGN_HANDOFF_PATH),
      /input_target_unknown/u,
    );
  });
});

test("reference targets may truthfully omit or carry reference-only feasibility", async () => {
  await withRoot(async (root) => {
    await writeDesignResourceHandoffFixture(root, (handoff) => {
      handoff.targets[0].source_profile.kind = "reference";
    });
    const result = await preflightDesignResourceHandoff(
      root,
      DESIGN_HANDOFF_PATH,
    );
    assert.deepEqual(result.limitations, [LEGACY_DESIGN_AUTHORITY_LIMITATION]);
  });

  await withRoot(async (root) => {
    await writeDesignResourceHandoffFixture(
      root,
      (handoff) => {
        handoff.targets[0].source_profile.kind = "reference";
      },
      {
        feasibility: true,
        mutateFeasibility(document) {
          document.realization_mode = "reference";
          document.source_records = [];
          document.substrate_observations = [];
          document.condition_model.profiles = [];
          document.component_family_cells = [];
          document.blockers = [];
        },
      },
    );
    const result = await preflightDesignResourceHandoff(
      root,
      DESIGN_HANDOFF_PATH,
    );
    assert.deepEqual(result.limitations, [LEGACY_DESIGN_AUTHORITY_LIMITATION]);
    assert.equal(
      result.technical_feasibility_documents[0].realization_mode,
      "reference",
    );
  });
});

test("new implementation bundle rejects a legacy handoff without feasibility input", async () => {
  await withRoot(async (root) => {
    const { handoff } = await writeDesignResourceHandoffFixture(root);
    await writeDesignResourceHandoff(
      root,
      manifestBackedDesignResourceHandoff(handoff),
      { handoffPath: "draft/main.md" },
    );
    await mkdir(path.join(root, "handoffs"));
    await assert.rejects(
      exec(
        process.execPath,
        [
          cli,
          "design-resource",
          "bundle",
          "draft",
          "handoffs/rejected",
          "--manifest",
          DESIGN_FACT_MANIFEST_PATH,
          "--max-handoff-bytes",
          "1048576",
        ],
        { cwd: root },
      ),
      /implementation_feasibility_input_required/u,
    );
  });
});
