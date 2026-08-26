import type {
  ExternalAuthorityRouteV1,
  MachineAuthorityRouteV1,
  ObligationAuthorityCandidatesV1,
} from "./long-task-acceptance-reachability-types.js";

export type ObligationAuthorityResolutionV1 =
  | { status: "machine_admitted"; machine: MachineAuthorityRouteV1 }
  | { status: "external_candidate"; external: ExternalAuthorityRouteV1 }
  | {
      status: "unreachable";
      reason:
        | "machine_external_authority_conflict"
        | "authority_route_ambiguous"
        | "proof_surface_authority_ambiguous"
        | "no_admitted_proof_route";
    };

export function resolveObligationAuthority(
  candidates: ObligationAuthorityCandidatesV1,
): ObligationAuthorityResolutionV1 {
  const machine = candidates.machine_candidates;
  const external = candidates.external_candidates;
  if (candidates.proof_surface_selection === "optional") {
    const semanticProfiles = new Set(
      [...machine, ...external].map((route) => routeSemanticProfile(route)),
    );
    if (semanticProfiles.size > 1)
      return {
        status: "unreachable",
        reason: "proof_surface_authority_ambiguous",
      };
    if (
      machine.length === 1 &&
      external.length > 0 &&
      external.every(
        (route) =>
          route.advisory_to_machine === true &&
          route.proof_surface !== machine[0].proof_surface,
      )
    )
      return { status: "machine_admitted", machine: machine[0] };
  }
  if (machine.length && external.length)
    return {
      status: "unreachable",
      reason: "machine_external_authority_conflict",
    };
  if (machine.length > 1 || external.length > 1)
    return { status: "unreachable", reason: "authority_route_ambiguous" };
  if (machine.length === 1)
    return { status: "machine_admitted", machine: machine[0] };
  if (external.length === 1)
    return { status: "external_candidate", external: external[0] };
  return { status: "unreachable", reason: "no_admitted_proof_route" };
}

function routeSemanticProfile(
  route: MachineAuthorityRouteV1 | ExternalAuthorityRouteV1,
): string {
  return `${route.method ?? "unknown"}\0${[
    ...(route.required_evidence_capabilities ?? []),
  ]
    .sort()
    .join("\0")}`;
}
