## Summary

-

## Change Type

- [ ] Package behavior / CLI
- [ ] Managed assets / source sync
- [ ] Documentation / launch surface
- [ ] Tests / CI
- [ ] Benchmark protocol

## Validation

- [ ] `npm run test:affected` (or the exact focused tests listed in Notes)
- [ ] `npm run test:long-task:trust` after freezing a Long-Task/authority candidate, when applicable
- [ ] `npm test --workspace project-tiny-context-harness` only when affected routing selects complete coverage, a shared package/dependency boundary changed, or this is a release rehearsal
- [ ] `node packages/ty-context/dist/cli.js package sync-source`
- [ ] `node packages/ty-context/dist/cli.js package check-source`
- [ ] `make validate-context`
- [ ] `git diff --check`

## Context

Context:

## Notes

-
