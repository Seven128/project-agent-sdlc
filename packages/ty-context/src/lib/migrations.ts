import { planSchema5Retirement } from "./retirement-plan.js";
import { readRetirementJournal } from "./retirement-runner.js";
export type UpgradePlanItemStatus =
  "safe_pending" | "manual_required" | "blocked";

export interface UpgradePlanItem {
  id: string;
  introducedIn: string;
  description: string;
  scope: string;
  status: UpgradePlanItemStatus;
  message: string;
  path?: string;
}

export interface UpgradePlan {
  safe_pending: UpgradePlanItem[];
  manual_required: UpgradePlanItem[];
  blocked: UpgradePlanItem[];
}

export type ReleaseUpdateMode =
  "sync-only" | "upgrade-required" | "manual-required";

function item(message: string, status: UpgradePlanItemStatus): UpgradePlanItem {
  return {
    id: "schema-5-retirement",
    introducedIn: "schema-5",
    description: "Retire old workflow capabilities safely",
    scope: "installation",
    status,
    message,
  };
}
export async function createUpgradePlan(
  repository: string,
): Promise<UpgradePlan> {
  try {
    const pending = await readRetirementJournal(repository);
    if (pending)
      return {
        safe_pending: [
          item(
            "Resume unfinished schema-5 file migration after stopping old sessions",
            "safe_pending",
          ),
        ],
        manual_required: [],
        blocked: [],
      };
    const plan = await planSchema5Retirement(repository);
    return {
      safe_pending: plan.files.length
        ? [
            item(
              "Back up and retire exact owned assets; preserve exact default body selection",
              "safe_pending",
            ),
          ]
        : [],
      manual_required: [],
      blocked: plan.blockers.map((text) => item(text, "blocked")),
    };
  } catch (error) {
    return {
      safe_pending: [],
      manual_required: [],
      blocked: [item(String(error), "blocked")],
    };
  }
}
export function hasUpgradePlanWork(plan: UpgradePlan): boolean {
  return Boolean(
    plan.safe_pending.length ||
    plan.manual_required.length ||
    plan.blocked.length,
  );
}
export function updateModeForPlan(plan: UpgradePlan): ReleaseUpdateMode {
  return plan.blocked.length || plan.manual_required.length
    ? "manual-required"
    : plan.safe_pending.length
      ? "upgrade-required"
      : "sync-only";
}
export function formatUpgradePlan(plan: UpgradePlan): string[] {
  return [
    "Upgrade mode: " + updateModeForPlan(plan),
    ...[...plan.blocked, ...plan.manual_required, ...plan.safe_pending].map(
      (entry) => entry.status + ": " + entry.message,
    ),
  ];
}
