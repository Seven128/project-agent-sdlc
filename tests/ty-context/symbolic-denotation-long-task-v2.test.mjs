import test from "node:test";
import { exerciseMixedSymbolicLongTaskClosure } from "./symbolic-denotation-long-task-v2-exercise.mjs";

export { exerciseMixedSymbolicLongTaskClosure };

test(
  "one Contract compiles and reaches one Final Gate with mixed V1 and opt-in UI V2 targets",
  exerciseMixedSymbolicLongTaskClosure,
);
