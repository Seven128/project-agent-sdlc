import test from "node:test";

// Trust-suite carrier reusing the same executable mixed-representation oracle.
import { exerciseMixedSymbolicLongTaskClosure } from "./symbolic-denotation-long-task-v2-exercise.mjs";

test(
  "[critical:symbolic-mixed-representation-closure] one Contract closes mixed V1 and opt-in UI V2 evidence in the sole Final Gate",
  exerciseMixedSymbolicLongTaskClosure,
);
