import { collectRepositoryCandidate } from "../../../../tools/self_hosting_cost_repository.mjs";

export async function collectDelegationSourceIdentity() {
  const candidate = await collectRepositoryCandidate();
  return {
    head_commit: candidate.head_commit,
    head_tree: candidate.head_tree,
    working_tree: {
      clean: candidate.working_tree.clean,
      digest: candidate.working_tree.digest,
    },
  };
}

export async function delegationSourceIdentityMetrics(expected, options = {}) {
  const current = options.current ?? (await collectDelegationSourceIdentity());
  const expectedComplete = complete(expected);
  const currentMatch = expectedComplete && sameDelegationSourceIdentity(expected, current);
  return {
    correct: currentMatch && current.working_tree.clean,
    expected_complete: expectedComplete,
    current_match: currentMatch,
    current_clean: current.working_tree.clean,
    expected,
    current,
  };
}

export function delegationPairSourceIdentityMetrics(left, right, current) {
  const pairMatch = sameDelegationSourceIdentity(left, right);
  const currentMatch = sameDelegationSourceIdentity(left, current);
  const currentClean = current?.working_tree?.clean === true;
  return {
    correct: pairMatch && currentMatch && currentClean,
    pair_match: pairMatch,
    current_match: currentMatch,
    current_clean: currentClean,
  };
}

export function sameDelegationSourceIdentity(left, right) {
  return complete(left) && complete(right) && JSON.stringify(left) === JSON.stringify(right);
}

function complete(value) {
  return (
    /^[0-9a-f]{40}$/u.test(value?.head_commit ?? "") &&
    /^[0-9a-f]{40}$/u.test(value?.head_tree ?? "") &&
    typeof value?.working_tree?.clean === "boolean" &&
    /^[0-9a-f]{64}$/u.test(value?.working_tree?.digest ?? "") &&
    JSON.stringify(Object.keys(value ?? {}).sort()) ===
      JSON.stringify(["head_commit", "head_tree", "working_tree"]) &&
    JSON.stringify(Object.keys(value?.working_tree ?? {}).sort()) ===
      JSON.stringify(["clean", "digest"])
  );
}
