import {
  bindFixtureSemanticManifest,
} from "./long-task-semantic-reconcile-bindings-fixture.mjs";
import {
  rebuildFixtureContextInputs,
  rebuildFixtureSemanticInputs,
} from "./long-task-semantic-reconcile-inputs-fixture.mjs";

export async function reconcileFixtureSemanticManifest(
  root,
  contract,
  manifest,
  inventory,
  authorityRefs,
  primaryAuthority,
) {
  rebuildFixtureSemanticInputs(
    manifest,
    inventory,
    authorityRefs,
    primaryAuthority,
  );
  await rebuildFixtureContextInputs(
    root,
    contract,
    manifest,
    authorityRefs,
    primaryAuthority,
  );
  bindFixtureSemanticManifest(
    contract,
    manifest,
    authorityRefs,
    primaryAuthority,
  );
}
