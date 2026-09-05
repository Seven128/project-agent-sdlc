import { scoreBuildReuseBuyInvocation } from "./admission-score-build-reuse-buy.mjs";
import { scoreDraAdmissionInvocation } from "./admission-score-dra.mjs";
import { scoreDsaArtifactCategoryInvocation } from "./admission-score-dsa-artifact-category.mjs";

export function scoreAdmissionInvocation(track, mode, result, trace, hidden) {
  if (track === "dra-semantic-recovery")
    return scoreDraAdmissionInvocation(mode, result, trace, hidden);
  if (track === "build-reuse-buy")
    return scoreBuildReuseBuyInvocation(mode, result, trace, hidden);
  if (track === "dsa-artifact-category")
    return scoreDsaArtifactCategoryInvocation(mode, result, trace, hidden);
  throw new Error(`admission_score_track_unsupported:${track}`);
}
