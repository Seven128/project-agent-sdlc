import test from "node:test";
import {
  exerciseMixedSymbolicLongTaskClosure,
  exerciseSymbolicCompileRejectsUnresolvedDisposition,
  exerciseSymbolicFinalGateRejectsCounterexample,
} from "./symbolic-denotation-long-task-v2-exercise.mjs";

export { exerciseMixedSymbolicLongTaskClosure };

test(
  "one Contract compiles and reaches one Final Gate with mixed V1 and opt-in UI V2 targets",
  exerciseMixedSymbolicLongTaskClosure,
);

test(
  "Long-Task compile rejects an unresolved symbolic disposition through preflight",
  exerciseSymbolicCompileRejectsUnresolvedDisposition,
);

test(
  "the sole Final Gate rejects a current symbolic certificate counterexample",
  exerciseSymbolicFinalGateRejectsCounterexample,
);
