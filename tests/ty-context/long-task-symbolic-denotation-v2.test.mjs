import test from "node:test";
import {
  exerciseCompactTrustedSymbolicLongTaskClosure,
  exerciseMixedSymbolicLongTaskClosure,
  exerciseSymbolicCompileAcceptsAllCurrentSourceMethods,
  exerciseSymbolicCompileRejectsUntrustedDynamicDependency,
  exerciseSymbolicCompileRejectsForgedCurrentSourceDependency,
  exerciseSymbolicCompileRejectsCurrentProductionDependency,
  exerciseSymbolicCompileRejectsUnsupportedCurrentSource,
  exerciseSymbolicCompileRejectsNarrowApplicability,
  exerciseSymbolicCompileRejectsUnresolvedDisposition,
  exerciseSymbolicFinalGateRejectsCounterexample,
  exerciseSymbolicFinalGateRejectsCurrentProductionDependency,
  exerciseSymbolicFinalGateRejectsCurrentSourceDependency,
  exerciseSymbolicFinalGateRejectsUnsupportedCurrentSource,
  exerciseSymbolicFinalGateRejectsNarrowApplicability,
} from "./symbolic-denotation-long-task-v2-exercise.mjs";

export { exerciseMixedSymbolicLongTaskClosure };

test(
  "[critical:symbolic-mixed-representation-closure] one Contract compiles and reaches one Final Gate with mixed V1 and opt-in UI V2 targets",
  exerciseMixedSymbolicLongTaskClosure,
);

test(
  "compact profiles and trusted non-interference reach the existing sole Final Gate",
  exerciseCompactTrustedSymbolicLongTaskClosure,
);

test(
  "Long-Task compile accepts all three package-derived current Source proof methods",
  exerciseSymbolicCompileAcceptsAllCurrentSourceMethods,
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
  "Long-Task compile reruns the package Source Oracle and rejects a freshly rehashed forged graph",
  exerciseSymbolicCompileRejectsForgedCurrentSourceDependency,
);

test(
  "Long-Task compile fails closed for unsupported current Source",
  exerciseSymbolicCompileRejectsUnsupportedCurrentSource,
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
  "the sole Final Gate source recompile rejects current Source drift while the historical artifact remains",
  { timeout: 300000 },
  exerciseSymbolicFinalGateRejectsCurrentSourceDependency,
);

test(
  "the sole Final Gate source recompile rejects unsupported current Source with a valid failed artifact",
  { timeout: 120000 },
  exerciseSymbolicFinalGateRejectsUnsupportedCurrentSource,
);

test(
  "the sole Final Gate source recompile rejects narrowed text, control, asset and single-property applicability",
  exerciseSymbolicFinalGateRejectsNarrowApplicability,
);
