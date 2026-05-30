#!/usr/bin/env python3
from harness_utils import load_plan, require, run_main, validate_task_shape


def main() -> None:
    data = load_plan(".codex/state/plan.draft.yaml")
    require("current_phase" not in data, "plan.draft.yaml must not define current_phase; lifecycle.yaml is the single source for current_phase")
    require("current_task_id" not in data, "plan.draft.yaml must not define current_task_id because drafts are not active task state")
    tasks = data.get("tasks", [])
    require(tasks, "plan.draft.yaml must contain at least one task before leaving ARCHITECTING")
    for index, task in enumerate(tasks):
        require(isinstance(task, dict), f"Task draft #{index + 1} must be a mapping")
        validate_task_shape(task, index)
        require(task.get("status") == "pending", f"Draft task {task.get('id')} should start as pending")
    print(f"Task draft OK: {len(tasks)} task(s)")


if __name__ == "__main__":
    run_main(main)
