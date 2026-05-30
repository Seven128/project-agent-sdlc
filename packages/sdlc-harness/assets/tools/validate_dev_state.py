#!/usr/bin/env python3
from harness_utils import load_plan, require, run_main


def main() -> None:
    draft = load_plan(".codex/state/plan.draft.yaml")
    require("current_phase" not in draft, "plan.draft.yaml must not define current_phase; lifecycle.yaml is the single source for current_phase")
    require("current_task_id" not in draft, "plan.draft.yaml must not define current_task_id because drafts are not active task state")
    tasks = [task for task in draft.get("tasks", []) if isinstance(task, dict)]
    require(
        not tasks,
        "Unconsumed draft tasks remain in plan.draft.yaml: "
        + ", ".join(str(task.get("id") or "<missing id>") for task in tasks)
        + ". Promote the next draft into plan.yaml or remove already-consumed drafts before validate-dev.",
    )
    print("Dev state OK: 0 unconsumed draft task(s)")


if __name__ == "__main__":
    run_main(main)
