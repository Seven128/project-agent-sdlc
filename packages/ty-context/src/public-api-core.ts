export { commands } from "./commands/index.js";
export { runInit } from "./lib/init.js";
export { runSync } from "./lib/sync-engine.js";
export { runUpgrade, runUpgradeReport } from "./lib/upgrade.js";
export { runDoctor } from "./lib/doctor.js";
export { runValidator } from "./lib/validators.js";
export { loadContextCatalog } from "./lib/context-catalog/catalog-load.js";
export { selectDefaultContextPaths } from "./lib/context-catalog/catalog-default-footprint.js";
export { inspectContext } from "./lib/context-inspect/context-inspect.js";
export { createContextScaffold } from "./lib/context-create/context-create.js";
export { registerContext } from "./lib/context-register/context-register.js";
export { moveContext } from "./lib/context-move/context-move.js";
export {
  contextMutationStatus,
  completeContextMutation,
  rollbackContextMutation,
} from "./lib/context-mutation/mutation-recovery.js";
export { runExportContext } from "./lib/context-export.js";
export { runSourcePackExport } from "./lib/source-pack-export.js";
