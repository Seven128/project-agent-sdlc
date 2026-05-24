#!/usr/bin/env python3
from harness_utils import load_lifecycle, load_plan, run_main


def main() -> None:
    lifecycle = load_lifecycle()
    tasks_data = load_plan()
    tasks = tasks_data.get("tasks", [])
    current_task_id = tasks_data.get("current_task_id") or ""
    current_task = next((task for task in tasks if task.get("id") == current_task_id), None)
    active_count = len(tasks)

    print(f"Current phase: {lifecycle.get('current_phase')}")
    print(f"Active role: {lifecycle.get('active_role')}")
    print(f"Active skill: {lifecycle.get('active_skill')}")
    print(f"Milestone: {lifecycle.get('current_milestone')}")
    print(f"Allowed next phases: {', '.join(lifecycle.get('allowed_next_phases') or []) or 'none'}")
    print(f"Plan tasks: {active_count} active/future")
    print(f"Next task sequence: {tasks_data.get('next_task_sequence') or 'unset'}")
    if current_task:
        print(f"Current task: {current_task.get('id')} {current_task.get('title')} [{current_task.get('status')}]")
    else:
        print("Current task: none")
    if lifecycle.get("blocked_reason"):
        print(f"Blocked reason: {lifecycle.get('blocked_reason')}")


if __name__ == "__main__":
    run_main(main)
