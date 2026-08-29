import { sameMutationArray } from "../context-mutation/mutation-command-support.js";
import type { ContextFootprintState } from "../context-mutation/mutation-types.js";
import type { ContextMoveResult } from "./context-move-types.js";

export function contextMoveFootprintDiff(
  before: ContextFootprintState,
  after: ContextFootprintState,
): ContextMoveResult["default_footprint"] {
  return {
    changed:
      before.bytes !== after.bytes ||
      !sameMutationArray(before.paths, after.paths),
    before,
    after,
    added: after.paths.filter((file) => !before.paths.includes(file)),
    removed: before.paths.filter((file) => !after.paths.includes(file)),
  };
}
