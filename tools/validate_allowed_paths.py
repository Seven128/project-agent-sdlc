#!/usr/bin/env python3
from harness_utils import (
    OPEN_TASK_STATUSES,
    changed_files,
    expand_harness_root,
    load_plan,
    load_yaml,
    matches_any,
    require,
    run_main,
    task_by_id,
)


def main() -> None:
    data = load_plan()
    tasks = [task for task in data.get("tasks", []) if isinstance(task, dict)]
    open_tasks = [task for task in tasks if task.get("status") in OPEN_TASK_STATUSES]

    policies = load_yaml(".agent/policies/allowed_paths.yaml")
    sprint_policy = ((policies.get("phases") or {}).get("SPRINTING") or {})
    always_allow = expand_harness_root(sprint_policy.get("always_allow") or [])

    if open_tasks:
        current_task_id = data.get("current_task_id") or ""
        task = task_by_id(data, current_task_id) if current_task_id else None
        require(task, "current_task_id must point to the task being validated")
        require(task.get("status") in OPEN_TASK_STATUSES, "current_task_id must point to an open task for path validation")
        allowed = list(task.get("allowed_paths") or []) + list(always_allow)
    else:
        print("Allowed paths skipped: no open task")
        return

    changed = [path for path in changed_files() if not path.startswith(".git/")]
    blocked = [path for path in changed if not matches_any(path, allowed)]
    require(not blocked, "Changed files outside current task allowed_paths: " + ", ".join(blocked))
    print(f"Allowed paths OK: {len(changed)} changed file(s) checked")


if __name__ == "__main__":
    run_main(main)
