import test from "node:test";
import {
  exerciseCompactTrustedSymbolicLongTaskClosure,
  exerciseMixedSymbolicLongTaskClosure,
  exerciseSymbolicCompileRejectsUntrustedDynamicDependency,
  exerciseSymbolicCompileRejectsCurrentProductionDependency,
  exerciseSymbolicCompileRejectsNarrowApplicability,
  exerciseSymbolicCompileRejectsUnresolvedDisposition,
  exerciseSymbolicFinalGateRejectsCounterexample,
  exerciseSymbolicFinalGateRejectsCurrentProductionDependency,
  exerciseSymbolicFinalGateRejectsNarrowApplicability,
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
  "Long-Task compile rejects an internally self-consistent proof when current production reads an omitted axis",
  exerciseSymbolicCompileRejectsCurrentProductionDependency,
);

test(
  "Long-Task compile rejects narrowed text, control, asset and single-property applicability",
  exerciseSymbolicCompileRejectsNarrowApplicability,
);

test(
  "Long-Task compile rejects an unresolved symbolic disposition through preflight",
  exerciseSymbolicCompileRejectsUnresolvedDisposition,
);

test(
  "the sole Final Gate rejects a current production non-interference proof counterexample",
  exerciseSymbolicFinalGateRejectsCounterexample,
);

test(
  "the sole Final Gate source recompile rejects a current production omitted-axis dependency",
  exerciseSymbolicFinalGateRejectsCurrentProductionDependency,
);

test(
  "the sole Final Gate source recompile rejects narrowed text, control, asset and single-property applicability",
  exerciseSymbolicFinalGateRejectsNarrowApplicability,
);
