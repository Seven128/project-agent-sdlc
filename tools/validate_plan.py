#!/usr/bin/env python3
from harness_utils import (
    OPEN_TASK_STATUSES,
    load_plan,
    require,
    run_main,
    task_by_id,
    validate_parallel_execution_contract,
    validate_task_shape,
)


def main() -> None:
    data = load_plan()
    validate_parallel_execution_contract(data)
    tasks = data.get("tasks", [])
    next_task_sequence = data.get("next_task_sequence")
    require(isinstance(next_task_sequence, int) and next_task_sequence > 0, "plan.yaml must define positive integer next_task_sequence")

    for index, task in enumerate(tasks):
        require(isinstance(task, dict), f"Task #{index + 1} must be a mapping")
        validate_task_shape(task, index)
        require(task.get("status") in OPEN_TASK_STATUSES, f"Completed task {task.get('id')} must not remain in plan.yaml")

    max_sequence = 0
    for task in tasks:
        task_id = str(task.get("id") or "")
        if task_id.startswith("DEV-") and task_id[4:].isdigit():
            max_sequence = max(max_sequence, int(task_id[4:]))
    require(next_task_sequence > max_sequence, "next_task_sequence must be greater than task ids currently in plan.yaml")

    current_task_id = data.get("current_task_id") or ""
    if current_task_id:
        require(task_by_id(data, current_task_id), f"current_task_id does not match a task: {current_task_id}")

    open_tasks = [task.get("id") for task in tasks if task.get("status") in OPEN_TASK_STATUSES]
    require(not open_tasks, f"Open tasks remain: {', '.join(open_tasks)}")
    print(f"Plan OK: {len(tasks)} active/future task(s), none open")


if __name__ == "__main__":
    run_main(main)
