import { createHash } from "node:crypto";
import { evaluateCanonicalSymbolicDenotation } from "./symbolic-denotation-engine.js";
import type {
  CompiledSymbolicDenotationV1,
  SymbolicDenotationAxisDomain,
  SymbolicDenotationScalar,
} from "./symbolic-denotation-types.js";
import { domainCardinality } from "./symbolic-denotation-support.js";
import {
  compareText,
  stableJson,
} from "./design-resource-symbolic-validation-support.js";

export const MAX_SOURCE_EXHAUSTIVE_DOMAIN_CARDINALITY = 100_000n;

export interface SymbolicSourceExhaustiveCaseV1 {
  fact_rule_refs: string[];
  source: CompiledSymbolicDenotationV1;
  rule: CompiledSymbolicDenotationV1;
}

export interface SymbolicSourceExhaustiveCounterexampleV1 {
  kind: "source_rule_denotation_mismatch" | "complete_domain_counterexample";
  axis_ref: string | null;
  fact_rule_ref: string;
  assignment: Record<string, SymbolicDenotationScalar>;
  detail: string;
}

export function evaluateCompleteSymbolicSourceDomain(
  domains: SymbolicDenotationAxisDomain[],
  omittedAxisRefs: string[],
  cases: SymbolicSourceExhaustiveCaseV1[],
): {
  cardinality: string;
  evaluation_sha256: string;
  counterexample: SymbolicSourceExhaustiveCounterexampleV1 | null;
} {
  const sortedDomains = [...domains].sort((left, right) =>
    compareText(left.key, right.key),
  );
  const cardinality = sortedDomains.reduce(
    (total, domain) => total * domainCardinality(domain),
    1n,
  );
  if (cardinality > MAX_SOURCE_EXHAUSTIVE_DOMAIN_CARDINALITY)
    throw new Error(
      `source_complete_domain_capacity_exceeded:actual=${cardinality}:limit=${MAX_SOURCE_EXHAUSTIVE_DOMAIN_CARDINALITY}`,
    );
  const omitted = new Set(omittedAxisRefs);
  const anchor = Object.fromEntries(
    sortedDomains.map((domain) => [domain.key, domainValues(domain)[0]]),
  );
  const hash = createHash("sha256");
  let independenceCounterexample: SymbolicSourceExhaustiveCounterexampleV1 | null =
    null;
  let ruleCounterexample: SymbolicSourceExhaustiveCounterexampleV1 | null =
    null;
  for (const assignment of enumerateAssignments(sortedDomains)) {
    const axisErasedAssignment = { ...assignment };
    for (const axisRef of omitted)
      axisErasedAssignment[axisRef] = anchor[axisRef];
    for (const proofCase of cases) {
      const source = evaluateCanonicalSymbolicDenotation(
        proofCase.source.canonical_dag,
        assignment,
      );
      const rule = evaluateCanonicalSymbolicDenotation(
        proofCase.rule.canonical_dag,
        assignment,
      );
      const axisErased = evaluateCanonicalSymbolicDenotation(
        proofCase.source.canonical_dag,
        axisErasedAssignment,
      );
      hash.update(
        stableJson({
          assignment,
          axis_erased: axisErased,
          rule,
          source,
          rule_refs: proofCase.fact_rule_refs,
        }),
      );
      hash.update("\n");
      if (!independenceCounterexample && source !== axisErased) {
        const axisRef = omittedAxisRefs.find(
          (ref) => assignment[ref] !== anchor[ref],
        );
        independenceCounterexample = {
          kind: "complete_domain_counterexample",
          axis_ref: axisRef ?? omittedAxisRefs[0] ?? null,
          fact_rule_ref: proofCase.fact_rule_refs[0],
          assignment: { ...assignment },
          detail:
            "current Source denotation changes after omitted axes are erased",
        };
      }
      if (!ruleCounterexample && source !== rule)
        ruleCounterexample = {
          kind: "source_rule_denotation_mismatch",
          axis_ref: null,
          fact_rule_ref: proofCase.fact_rule_refs[0],
          assignment: { ...assignment },
          detail:
            "current Source denotation differs from the current Rule region",
        };
    }
  }
  return {
    cardinality: cardinality.toString(),
    evaluation_sha256: hash.digest("hex"),
    counterexample: independenceCounterexample ?? ruleCounterexample,
  };
}

function* enumerateAssignments(
  domains: SymbolicDenotationAxisDomain[],
  index = 0,
  current: Record<string, SymbolicDenotationScalar> = {},
): Generator<Record<string, SymbolicDenotationScalar>> {
  if (index === domains.length) {
    yield { ...current };
    return;
  }
  const domain = domains[index];
  for (const value of domainValues(domain)) {
    current[domain.key] = value;
    yield* enumerateAssignments(domains, index + 1, current);
  }
  delete current[domain.key];
}

function domainValues(
  domain: SymbolicDenotationAxisDomain,
): SymbolicDenotationScalar[] {
  if (domain.kind === "enum") return [...domain.values];
  return Array.from(
    { length: domain.maximum - domain.minimum + 1 },
    (_, index) => domain.minimum + index,
  );
}
