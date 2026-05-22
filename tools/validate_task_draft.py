#!/usr/bin/env python3
from harness_utils import load_tasks, require, run_main, validate_task_shape


def main() -> None:
    data = load_tasks(".harness/state/tasks.draft.yaml")
    tasks = data.get("tasks", [])
    require(tasks, "tasks.draft.yaml must contain at least one task before leaving ARCHITECTING")
    for index, task in enumerate(tasks):
        require(isinstance(task, dict), f"Task draft #{index + 1} must be a mapping")
        validate_task_shape(task, index)
        require(task.get("status") == "pending", f"Draft task {task.get('id')} should start as pending")
    print(f"Task draft OK: {len(tasks)} task(s)")


if __name__ == "__main__":
    run_main(main)
