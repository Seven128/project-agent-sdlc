#!/usr/bin/env python3
from harness_utils import dump_yaml, load_lifecycle, load_phase_contracts, make_arg_parser, require, run_main


def phase_targets(phase: dict) -> list[str]:
    targets: list[str] = []
    next_phase = phase.get("next")
    if next_phase:
        targets.append(str(next_phase))
    for return_phase in phase.get("returns") or []:
        if return_phase:
            targets.append(str(return_phase))
    return list(dict.fromkeys(targets))


def main() -> None:
    parser = make_arg_parser("Transition AI SDLC Harness lifecycle phase")
    parser.add_argument("--to", required=True, help="Target lifecycle phase")
    parser.add_argument("--reason", default="", help="Short compatibility note; not persisted in active state")
    parser.add_argument("--force", action="store_true", help="Allow transition outside configured next phases")
    args = parser.parse_args()

    lifecycle = load_lifecycle()
    phases = load_phase_contracts()
    target = args.to
    current = lifecycle.get("current_phase")
    require(target in phases, f"Unknown target phase: {target}")
    require(current in phases, f"Current phase is not declared in phase_contracts.yaml: {current}")

    legal = set(lifecycle.get("allowed_next_phases") or [])
    legal.update(phase_targets(phases[current]))
    if target in {"RFC_RECALIBRATION", "BLOCKED"}:
        legal.add(target)
    suspended = lifecycle.get("suspended_phase")
    if current == "BLOCKED" and suspended:
        legal.add(suspended)

    require(args.force or target in legal, f"Illegal transition {current} -> {target}. Legal: {sorted(legal)}")

    if target in {"RFC_RECALIBRATION", "BLOCKED"} and current not in {"RFC_RECALIBRATION", "BLOCKED"}:
        lifecycle["suspended_phase"] = current
    elif suspended and target == suspended:
        lifecycle["suspended_phase"] = ""

    phase = phases[target]
    lifecycle["current_phase"] = target
    lifecycle["active_role"] = phase.get("role", "")
    lifecycle["active_skill"] = phase.get("skill", "")

    lifecycle["allowed_next_phases"] = phase_targets(phase)
    if target == "BLOCKED" and lifecycle.get("suspended_phase"):
        lifecycle["allowed_next_phases"] = [lifecycle["suspended_phase"]]

    dump_yaml(lifecycle, ".codex/state/lifecycle.yaml")
    print(f"Transitioned {current} -> {target}")
    if args.reason:
        print(f"Note: {args.reason}")


if __name__ == "__main__":
    run_main(main)
