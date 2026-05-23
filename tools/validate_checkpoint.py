#!/usr/bin/env python3
from __future__ import annotations

from harness_utils import OPEN_TASK_STATUSES, extract_task_contract, load_tasks, repo_path, require, run_main


REQUIRED_SECTIONS = [
    "## 1. 当前状态",
    "## 2. 已读取事实源",
    "## 3. 已完成工作",
    "## 4. 当前改动文件",
    "## 5. 未完成工作",
    "## 6. Gate 状态",
    "## 7. 风险和阻塞",
    "## 8. 下一步",
]

def validate_checkpoint_file(task: dict, is_current: bool) -> None:
    task_id = task.get("id")
    checkpoint = task.get("checkpoint")
    require(checkpoint, f"{task_id} requires checkpoint but has no checkpoint path")

    path = repo_path(checkpoint)
    require(path.exists(), f"{task_id} checkpoint file does not exist: {checkpoint}")

    content = path.read_text(encoding="utf-8")
    require(task_id in content, f"{checkpoint} must contain task id: {task_id}")
    contract = extract_task_contract(checkpoint)
    require(isinstance(contract.get("allowed_paths"), list) and contract["allowed_paths"], f"{checkpoint} Task Contract missing allowed_paths")
    require(isinstance(contract.get("required_gates"), list) and contract["required_gates"], f"{checkpoint} Task Contract missing required_gates")
    for section in REQUIRED_SECTIONS:
        require(section in content, f"{checkpoint} missing section: {section}")

    if is_current:
        latest = repo_path(".agent/state/checkpoints/latest.md")
        if latest.exists():
            latest_content = latest.read_text(encoding="utf-8")
            require(task_id in latest_content, f"latest.md must reference current task id: {task_id}")


def main() -> None:
    data = load_tasks()
    current_task_id = data.get("current_task_id") or ""
    tasks = [task for task in data.get("tasks", []) if isinstance(task, dict)]
    required_tasks = [task for task in tasks if task.get("status") in OPEN_TASK_STATUSES]
    stale = [task.get("id") for task in tasks if task.get("status") not in OPEN_TASK_STATUSES and task.get("checkpoint")]
    require(not stale, "Closed tasks must not retain checkpoint: " + ", ".join(stale))

    if not required_tasks:
        print("No open task checkpoints required")
        return

    for task in required_tasks:
        validate_checkpoint_file(task, task.get("id") == current_task_id)

    print(f"Checkpoint OK: {len(required_tasks)} open task(s)")


if __name__ == "__main__":
    run_main(main)
