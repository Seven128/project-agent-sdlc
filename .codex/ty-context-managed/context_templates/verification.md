# Verification Context: main

This role Context records critical repeat-execution paths for the owning area. Keep it minimal: enough for a future agent to rerun verification without rediscovering setup, not a test report.

## Owner

- Owning area: `main`.

## Verification Paths

- `npm test` or the shortest project-specific test, smoke, CI, probe or validation command.
- Verification paths are reusable execution instances, not independent definitions of the verification target. For capability, metric or acceptance claims, first use the owning module's design Context to decide what claim should be proven, then choose the command or probe.
- Prefer project-native type/compiler/lint/architecture/contract/behavior/benchmark/probe paths. Name what each path can and cannot falsify; a broad pass, Harness heuristic or static shape signal must not be presented as overall code quality or runtime-performance proof.
- For a multi-workspace repository with a project-owned changed-path/target-scope verifier, record its stable command and inputs here. It validates intended workspace(s) plus allowed supporting changes for task-attributable paths; it does not restrict which Context or code may be read.

## Required Preparation

- List only durable setup such as services, env files, fixtures, local runtimes or external dependencies needed before rerun.

## Expected Signals

- Name the stage, health check, status, artifact shape or observable signal that means the path reached the intended point.
- For repeatable performance/capacity checks, record the stable workload/fixture, metric, environment or environment class, baseline or budget, comparator/tolerance and result location. Keep one-off measured values and pass/fail claims out of Context.

## Acceptable Warnings

- List warnings that are expected and should not trigger repeated investigation.

## Excluded Dead Ends

- List previously ruled-out commands, providers, endpoints or setup paths only when remembering them prevents repeated wasted work.

## Forbidden Content

- Do not record one-off logs, full command output, temporary JSON, CI artifacts, test reports, secrets, tokens, cookies, device ids, raw payloads or pass/fail claims.
