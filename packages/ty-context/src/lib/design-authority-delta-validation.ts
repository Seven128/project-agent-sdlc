import { loadCurrentDesignAuthorityClosure } from "./design-authority-closure.js";
import {
  DESIGN_AUTHORITY_DELTA_ASSESSMENT_SCHEMA,
  type DesignAuthorityDeltaAssessmentV1,
  type DesignAuthorityDeltaValidationV1,
} from "./design-authority-delta-types.js";
import { canonicalValueJson } from "./strict-codec.js";

export async function validateDesignAuthorityDeltaAssessmentCurrent(
  repository: string,
  assessment: DesignAuthorityDeltaAssessmentV1,
): Promise<DesignAuthorityDeltaValidationV1> {
  const current = await loadCurrentDesignAuthorityClosure(repository);
  if (
    canonicalValueJson(assessment.based_on) !==
    canonicalValueJson(current.identity)
  )
    throw new Error(
      `design_authority_delta_invalid:assessment.based_on:identity_mismatch:${assessment.based_on.closure_digest}:${current.identity.closure_digest}`,
    );
  return {
    schema_version: DESIGN_AUTHORITY_DELTA_ASSESSMENT_SCHEMA,
    assessment: assessment.assessment,
    authority_identity: current.identity,
    authority_current: true,
    write_performed: false,
  };
}
