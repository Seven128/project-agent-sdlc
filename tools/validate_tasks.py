#!/usr/bin/env python3
from harness_utils import OPEN_TASK_STATUSES, load_tasks, require, run_main, task_by_id, validate_task_shape


def main() -> None:
    data = load_tasks()
    tasks = data.get("tasks", [])
    require(tasks, "tasks.yaml must contain at least one task before leaving SPRINTING")

    for index, task in enumerate(tasks):
        require(isinstance(task, dict), f"Task #{index + 1} must be a mapping")
        validate_task_shape(task, index)
        if task.get("status") == "done":
            require(task.get("gate_result") == "PASS", f"Done task {task.get('id')} must have gate_result PASS")
        if task.get("status") == "cancelled":
            require(not task.get("gate_result"), f"Cancelled task {task.get('id')} should not have gate_result")

    current_task_id = data.get("current_task_id") or ""
    if current_task_id:
        require(task_by_id(data, current_task_id), f"current_task_id does not match a task: {current_task_id}")

    open_tasks = [task.get("id") for task in tasks if task.get("status") in OPEN_TASK_STATUSES]
    require(not open_tasks, f"Open tasks remain: {', '.join(open_tasks)}")
    print(f"Tasks OK: {len(tasks)} task(s), all closed")


if __name__ == "__main__":
    run_main(main)
