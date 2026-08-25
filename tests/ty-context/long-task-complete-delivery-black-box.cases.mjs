import { rm } from "node:fs/promises";
import { prepareDeliveryFixtureSeed } from "./long-task-delivery-fixtures.mjs";
import {
  assertControlledIncidentCatalog,
  createGenericCompleteDeliveryFixture,
  createStarwardCompleteDeliveryFixture,
  exerciseBadThenCorrectMachineCandidate,
  exerciseStarwardExternalClosure,
  loadCompleteDeliveryIncidentCatalog,
  scenarioByKey,
} from "./long-task-complete-delivery-black-box-fixture.mjs";

export async function exerciseCompleteDeliveryBlackBoxClosure() {
  const catalog = await loadCompleteDeliveryIncidentCatalog();
  assertControlledIncidentCatalog(catalog);
  const seed = await prepareDeliveryFixtureSeed();
  try {
    const starwardScenario = scenarioByKey(catalog, "starward-sanitized");
    const starward = await createStarwardCompleteDeliveryFixture(
      starwardScenario,
      seed.root,
    );
    try {
      await exerciseStarwardExternalClosure(starward, starwardScenario);
    } finally {
      await rm(starward.root, { recursive: true, force: true });
    }

    for (const key of [
      "backend-persistence-identity",
      "cli-provider-identity",
    ]) {
      const scenario = scenarioByKey(catalog, key);
      const fixture = await createGenericCompleteDeliveryFixture(
        scenario,
        seed.root,
      );
      try {
        await exerciseBadThenCorrectMachineCandidate(fixture, scenario);
      } finally {
        await rm(fixture.root, { recursive: true, force: true });
      }
    }
  } finally {
    await seed.cleanup();
  }
}
