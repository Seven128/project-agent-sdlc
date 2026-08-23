import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  addDesignResourceImplementationFeasibility,
  writeDesignResourceHandoff,
  writeDesignResourceHandoffFixture,
} from "./design-resource-handoff-fixture.mjs";

const repo = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);

export const cli = path.join(repo, "packages", "ty-context", "dist", "cli.js");

export async function withV1Mutation(mutate, action) {
  await withRoot(async (root) => {
    const { handoff } = await writeDesignResourceHandoffFixture(root);
    await addDesignResourceImplementationFeasibility(root, handoff, mutate);
    await writeDesignResourceHandoff(root, handoff);
    await action(root, handoff);
  });
}

export async function withRoot(action) {
  const root = await mkdtemp(path.join(os.tmpdir(), "design-feasibility-"));
  try {
    await action(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}
