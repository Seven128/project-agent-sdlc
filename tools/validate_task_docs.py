#!/usr/bin/env python3
from harness_utils import load_plan, read_text, repo_path, require, run_main


def main() -> None:
    data = load_plan()
    index = read_text(".docs/INDEX.md")
    done_tasks = [task for task in data.get("tasks", []) if task.get("status") == "done"]
    require(done_tasks, "No done tasks found; implementation docs are required before leaving SPRINTING")
    for task in done_tasks:
        doc = task.get("implementation_doc")
        require(doc, f"Done task {task.get('id')} missing implementation_doc")
        require(repo_path(doc).exists(), f"Implementation doc missing for {task.get('id')}: {doc}")
        index_path = doc.removeprefix(".docs/")
        require(doc in index or index_path in index, f".docs/INDEX.md does not link implementation doc for {task.get('id')}: {doc}")
    print(f"Implementation docs OK: {len(done_tasks)} done task(s)")


if __name__ == "__main__":
    run_main(main)
