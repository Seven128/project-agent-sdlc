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
  exerciseSymbolicUiObserverBoundaryRejectsCounterexample,
  exerciseSymbolicUiObserverBoundaryRejectsCurrentProductionDependency,
  exerciseSymbolicUiObserverBoundaryRejectsCurrentSourceDependency,
  exerciseSymbolicUiObserverBoundaryRejectsUnsupportedCurrentSource,
  exerciseSymbolicUiObserverBoundaryRejectsNarrowApplicability,
} from "./symbolic-denotation-long-task-v2-exercise.mjs";

export { exerciseMixedSymbolicLongTaskClosure };

test("[critical:symbolic-mixed-representation-closure] mixed V1 and opt-in UI V2 targets preserve symbolic closure and require External Confirmation without an admitted UI observer", () =>
  exerciseMixedSymbolicLongTaskClosure());

test("compact profiles and trusted non-interference preserve symbolic closure but require an admitted UI observer", () =>
  exerciseCompactTrustedSymbolicLongTaskClosure());

test("Long-Task compile accepts all three package-derived current Source proof methods before enforcing the UI observer boundary", () =>
  exerciseSymbolicCompileAcceptsAllCurrentSourceMethods());

test("Long-Task compile rejects a dynamic dependency that cannot be proved absent", () =>
  exerciseSymbolicCompileRejectsUntrustedDynamicDependency());

test("Long-Task compile rejects an internally self-consistent proof when current production reads an omitted axis", () =>
  exerciseSymbolicCompileRejectsCurrentProductionDependency());

test("Long-Task compile reruns the package Source Oracle and rejects a freshly rehashed forged graph", () =>
  exerciseSymbolicCompileRejectsForgedCurrentSourceDependency());

test("Long-Task compile fails closed for unsupported current Source", () =>
  exerciseSymbolicCompileRejectsUnsupportedCurrentSource());

test("Long-Task compile rejects narrowed text, control, asset and single-property applicability", () =>
  exerciseSymbolicCompileRejectsNarrowApplicability());

test("Long-Task compile rejects an unresolved symbolic disposition through preflight", () =>
  exerciseSymbolicCompileRejectsUnresolvedDisposition());

test("an unsupported UI observer blocks a production non-interference counterexample before machine Final Gate", () =>
  exerciseSymbolicUiObserverBoundaryRejectsCounterexample());

test("an unsupported UI observer blocks a current-production candidate before machine Final Gate", () =>
  exerciseSymbolicUiObserverBoundaryRejectsCurrentProductionDependency());

test(
  "an unsupported UI observer blocks a current-Source candidate before machine Final Gate even when a historical artifact remains",
  { timeout: 300000 },
  () => exerciseSymbolicUiObserverBoundaryRejectsCurrentSourceDependency(),
);

test(
  "an unsupported UI observer blocks an unsupported-Source candidate before machine Final Gate",
  { timeout: 120000 },
  () => exerciseSymbolicUiObserverBoundaryRejectsUnsupportedCurrentSource(),
);

test("an unsupported UI observer blocks narrowed-applicability candidates before machine Final Gate", () =>
  exerciseSymbolicUiObserverBoundaryRejectsNarrowApplicability());
