import type {
  CompiledDeliveryContractV2,
  EvidenceCapabilityV2,
} from "./long-task-delivery-types.js";
import { compiledDesignCandidates } from "./long-task-compiled-design-expectation.js";
import type {
  CompiledDesignFactObligationDescriptorV1,
  CompiledDesignFactObligationResolutionV1,
  CompiledDesignObligationIdentity,
} from "./long-task-compiled-design-obligation-types.js";
import { sameDesignObligationSet } from "./long-task-design-obligation-identity.js";

export type {
  CompiledDesignFactObligationDescriptorV1,
  CompiledDesignFactObligationResolutionV1,
} from "./long-task-compiled-design-obligation-types.js";

type EffectiveExternalRoute =
  CompiledDeliveryContractV2["acceptance_reachability"]["effective_external_routes"][number];

/**
 * Resolves a design obligation after compilation, where an externally owned
 * assertion is intentionally absent from the executable Check. The compiled
 * observation authority and effective external route are the owners here;
 * authored assertions are deliberately not consulted as a fallback.
 */
export function resolveCompiledDesignFactObligation(
  compiled: Pick<
    CompiledDeliveryContractV2,
    "acceptance_reachability" | "outcomes"
  >,
  identity: CompiledDesignObligationIdentity,
): CompiledDesignFactObligationResolutionV1 {
  if (!identity.outcome_key || !identity.fact_ref || !identity.proof_ref)
    return { status: "missing" };
  const sourceObligationRef =
    identity.source_obligation_ref ?? identity.proof_ref;
  if (sourceObligationRef !== identity.proof_ref) return { status: "missing" };
  const capabilities = designIdentityCapabilities(identity);
  if (new Set(capabilities).size !== capabilities.length)
    return { status: "missing" };

  const outcomes = compiled.outcomes.filter(
    (candidate) => candidate.key === identity.outcome_key,
  );
  if (outcomes.length !== 1)
    return { status: outcomes.length ? "ambiguous" : "missing" };
  const [outcome] = outcomes;
  const applicability = outcome.applicability.filter(
    (candidate) => candidate.key === identity.applicability_ref,
  );
  if (applicability.length !== 1)
    return { status: applicability.length ? "ambiguous" : "missing" };
  const localClaimRef = localClaimRefFor(
    identity.outcome_key,
    identity.claim_ref,
  );
  if (!localClaimRef) return { status: "missing" };

  const routes = matchingExternalRoutes(
    compiled.acceptance_reachability.effective_external_routes,
    identity,
    sourceObligationRef,
    localClaimRef,
    applicability[0].target_ref,
    capabilities,
  );
  if (routes.length !== 1)
    return { status: routes.length ? "ambiguous" : "missing" };
  const [route] = routes;
  if (route.expected_authority_ref !== `design-proof:${sourceObligationRef}`)
    return { status: "missing" };

  const candidates = outcome.acceptance.checks.flatMap((check) =>
    compiledDesignCandidates(
      check,
      identity,
      route.expected_authority_ref,
      localClaimRef,
    ),
  );
  if (candidates.length !== 1)
    return { status: candidates.length ? "ambiguous" : "missing" };
  return { status: "resolved", descriptor: candidates[0] };
}

export function findCompiledDesignFactObligation(
  compiled: Pick<
    CompiledDeliveryContractV2,
    "acceptance_reachability" | "outcomes"
  >,
  identity: CompiledDesignObligationIdentity,
): CompiledDesignFactObligationDescriptorV1 | null {
  const resolution = resolveCompiledDesignFactObligation(compiled, identity);
  return resolution.status === "resolved" ? resolution.descriptor : null;
}

function matchingExternalRoutes(
  routes: readonly EffectiveExternalRoute[],
  identity: CompiledDesignObligationIdentity,
  sourceObligationRef: string,
  localClaimRef: string,
  targetRef: string,
  capabilities: readonly EvidenceCapabilityV2[],
): EffectiveExternalRoute[] {
  return routes.filter(
    (route) =>
      route.source_obligation_ref === sourceObligationRef &&
      route.outcome_key === identity.outcome_key &&
      route.claim_ref === identity.claim_ref &&
      route.local_claim_ref === localClaimRef &&
      route.applicability_ref === identity.applicability_ref &&
      route.target_ref === targetRef &&
      route.fact_ref === identity.fact_ref &&
      route.proof_ref === identity.proof_ref &&
      route.method === identity.method &&
      route.proof_surface === identity.proof_surface &&
      sameDesignObligationSet(
        route.required_evidence_capabilities,
        capabilities,
      ) &&
      route.authority === "external_confirmation" &&
      route.status === "external_fulfillable" &&
      route.completion_role === "blocking" &&
      route.acceptance_effect === "required" &&
      (identity.obligation_ref === undefined ||
        route.obligation_ref === identity.obligation_ref) &&
      (identity.confirmation_ref === undefined ||
        route.confirmation_ref === identity.confirmation_ref) &&
      (identity.expected_authority_ref === undefined ||
        route.expected_authority_ref === identity.expected_authority_ref),
  );
}

function designIdentityCapabilities(
  identity: CompiledDesignObligationIdentity,
): EvidenceCapabilityV2[] {
  return [
    ...(identity.evidence_capabilities ??
      identity.required_evidence_capabilities ??
      []),
  ].sort();
}

function localClaimRefFor(outcomeKey: string, claimRef: string): string | null {
  const prefix = `${outcomeKey}.`;
  return claimRef.startsWith(prefix) && claimRef.length > prefix.length
    ? claimRef.slice(prefix.length)
    : null;
}
