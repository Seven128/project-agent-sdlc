import test from "node:test";
import {
  exerciseCompactTrustedSymbolicLongTaskClosure,
  exerciseMixedSymbolicLongTaskClosure,
  exerciseSymbolicCompileRejectsUntrustedDynamicDependency,
  exerciseSymbolicCompileRejectsUnresolvedDisposition,
  exerciseSymbolicFinalGateRejectsCounterexample,
} from "./symbolic-denotation-long-task-v2-exercise.mjs";

export { exerciseMixedSymbolicLongTaskClosure };

test(
  "one Contract compiles and reaches one Final Gate with mixed V1 and opt-in UI V2 targets",
  exerciseMixedSymbolicLongTaskClosure,
);

test(
  "compact profiles and trusted non-interference reach the existing sole Final Gate",
  exerciseCompactTrustedSymbolicLongTaskClosure,
);

test(
  "Long-Task compile rejects a dynamic dependency that cannot be proved absent",
  exerciseSymbolicCompileRejectsUntrustedDynamicDependency,
);

test(
  "Long-Task compile rejects an unresolved symbolic disposition through preflight",
  exerciseSymbolicCompileRejectsUnresolvedDisposition,
);

test(
  "the sole Final Gate rejects a current production non-interference proof counterexample",
  exerciseSymbolicFinalGateRejectsCounterexample,
);
