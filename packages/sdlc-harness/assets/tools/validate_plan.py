#!/usr/bin/env python3
from harness_utils import (
    make_arg_parser,
    load_plan,
    run_main,
    validate_plan_contract,
)


def main() -> None:
    parser = make_arg_parser("Validate plan.yaml shape and active task contract")
    parser.add_argument("--allow-open", action="store_true", help="Allow open tasks while validating an in-progress workflow task")
    args = parser.parse_args()

    data = load_plan()
    tasks = data.get("tasks", [])
    validate_plan_contract(data, allow_open=args.allow_open)

    suffix = "open tasks allowed" if args.allow_open else "none open"
    print(f"Plan OK: {len(tasks)} active/future task(s), {suffix}")


if __name__ == "__main__":
    run_main(main)
