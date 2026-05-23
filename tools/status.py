#!/usr/bin/env python3
from harness_utils import load_lifecycle, load_tasks, repo_path, run_main


def main() -> None:
    lifecycle = load_lifecycle()
    tasks_data = load_tasks()
    tasks = tasks_data.get("tasks", [])
    current_task_id = tasks_data.get("current_task_id") or ""
    current_task = next((task for task in tasks if task.get("id") == current_task_id), None)
    done_count = sum(1 for task in tasks if task.get("status") == "done")

    print(f"Current phase: {lifecycle.get('current_phase')}")
    print(f"Active role: {lifecycle.get('active_role')}")
    print(f"Active skill: {lifecycle.get('active_skill')}")
    print(f"Milestone: {lifecycle.get('current_milestone')}")
    print(f"Allowed next phases: {', '.join(lifecycle.get('allowed_next_phases') or []) or 'none'}")
    print(f"Tasks: {done_count}/{len(tasks)} done")
    if current_task:
        print(f"Current task: {current_task.get('id')} {current_task.get('title')} [{current_task.get('status')}]")
        if current_task.get("checkpoint"):
            print(f"Checkpoint: {current_task.get('checkpoint')}")
    else:
        print("Current task: none")
    if lifecycle.get("blocked_reason"):
        print(f"Blocked reason: {lifecycle.get('blocked_reason')}")

    gate_log = repo_path(".agent/state/gate_results.log")
    if gate_log.exists():
        recent = [line for line in gate_log.read_text(encoding="utf-8").splitlines() if line and not line.startswith("#")]
        if recent:
            print("Recent gate result:")
            print(recent[-1])


if __name__ == "__main__":
    run_main(main)
