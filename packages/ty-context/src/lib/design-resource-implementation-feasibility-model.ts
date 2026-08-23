import type { DesignResourceHandoffV1 } from "./design-resource-handoff-types.js";
import type {
  DesignResourceObservableRuleManifestV2,
  DesignResourceSymbolicFactRuleV2,
  DesignResourceSymbolicHandoffTargetV2,
} from "./design-resource-symbolic-fact-types.js";
import type {
  SymbolicDenotationAxisDomain,
  SymbolicDenotationPredicate,
} from "./symbolic-denotation-types.js";

interface FeasibilityTargetModelBase {
  target_ref: string;
  source_profile_kind:
    "implementation_web" | "implementation_app" | "reference";
  component_family_refs: string[];
  component_family_subject_refs: Map<string, Set<string>>;
}

export interface DesignResourceImplementationFeasibilityV1TargetModel extends FeasibilityTargetModelBase {
  representation: "fact_cells_v1";
  condition_refs: string[];
  facts: Map<
    string,
    {
      target_ref: string;
      subject_ref: string;
      condition_ref: string;
    }
  >;
}

export interface DesignResourceImplementationFeasibilityV2TargetModel extends FeasibilityTargetModelBase {
  representation: "symbolic_rules_v2";
  axis_domains: SymbolicDenotationAxisDomain[];
  reachable_region: SymbolicDenotationPredicate;
  fact_rules: Map<string, DesignResourceSymbolicFactRuleV2>;
}

export type DesignResourceImplementationFeasibilityTargetModel =
  | DesignResourceImplementationFeasibilityV1TargetModel
  | DesignResourceImplementationFeasibilityV2TargetModel;

export function createV1ImplementationFeasibilityTargetModel(
  handoff: DesignResourceHandoffV1,
  target: DesignResourceHandoffV1["targets"][number],
): DesignResourceImplementationFeasibilityV1TargetModel {
  const componentFamilies = handoff.subjects.filter(
    (subject) =>
      subject.kind === "component_family" &&
      subject.target_refs.includes(target.key),
  );
  return {
    representation: "fact_cells_v1",
    target_ref: target.key,
    source_profile_kind: target.source_profile.kind,
    component_family_refs: componentFamilies.map((subject) => subject.key),
    component_family_subject_refs: familySubjectRefs(
      componentFamilies.map((subject) => subject.key),
      handoff.subjects,
    ),
    condition_refs: [...target.condition_refs],
    facts: new Map(
      handoff.facts.map((fact) => [
        fact.key,
        {
          target_ref: fact.target_ref,
          subject_ref: fact.subject_ref,
          condition_ref: fact.condition_ref,
        },
      ]),
    ),
  };
}

export function createV2ImplementationFeasibilityTargetModel(
  target: DesignResourceSymbolicHandoffTargetV2,
  manifest: DesignResourceObservableRuleManifestV2,
): DesignResourceImplementationFeasibilityV2TargetModel {
  const componentFamilies = manifest.subjects.filter(
    (subject) =>
      subject.kind === "component_family" &&
      subject.target_refs.includes(target.key),
  );
  return {
    representation: "symbolic_rules_v2",
    target_ref: target.key,
    source_profile_kind: target.source_profile.kind,
    component_family_refs: componentFamilies.map((subject) => subject.key),
    component_family_subject_refs: familySubjectRefs(
      componentFamilies.map((subject) => subject.key),
      manifest.subjects,
    ),
    axis_domains: manifest.axis_domains,
    reachable_region: manifest.reachable_region,
    fact_rules: new Map(manifest.fact_rules.map((rule) => [rule.key, rule])),
  };
}

function familySubjectRefs(
  familyRefs: string[],
  subjects: Array<{
    key: string;
    family_ref: string | null;
    instance_of_ref: string | null;
  }>,
): Map<string, Set<string>> {
  return new Map(
    familyRefs.map((familyRef) => [
      familyRef,
      new Set(
        subjects
          .filter(
            (subject) =>
              subject.key === familyRef ||
              subject.family_ref === familyRef ||
              subject.instance_of_ref === familyRef,
          )
          .map((subject) => subject.key),
      ),
    ]),
  );
}
