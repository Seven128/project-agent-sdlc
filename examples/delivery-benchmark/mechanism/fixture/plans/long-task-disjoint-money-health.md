# Money And Health Long-Task Source

<!-- ty-source-item:start key=money-rounding-result kind=outcome_result -->
Positive invoice money rounds deterministically to two decimal places under half-up semantics at the existing money-policy owner.
<!-- ty-source-item:end -->

<!-- ty-source-item:start key=money-rounding-requirement kind=requirement -->
`roundMoney(1.005)` is exactly `1.01`, `roundMoney(10.075)` is exactly `10.08`, ordinary positive two-decimal inputs remain unchanged, and non-finite input retains its current explicit failure.
<!-- ty-source-item:end -->

<!-- ty-source-item:start key=money-rounding-owner kind=technical_obligation -->
`src/billing/money.mjs` remains the sole rounding implementation owner; direct regression coverage belongs in `tests/money.test.mjs`, and the parent reconciles `project_context/areas/invoice-ops/foundation/money.md`.
<!-- ty-source-item:end -->

<!-- ty-source-item:start key=money-rounding-acceptance kind=acceptance -->
The focused money test and the repository test entry both pass on the same current Final-Gate candidate.
<!-- ty-source-item:end -->

<!-- ty-source-item:start key=health-degraded-result kind=outcome_result -->
Deployment health exposes an exact degraded result for explicitly failed owned components while preserving the existing no-argument healthy result.
<!-- ty-source-item:end -->

<!-- ty-source-item:start key=health-degraded-requirement kind=requirement -->
`healthStatus()` remains exactly `{ status: "ok", checks: ["billing", "notifications", "worker"] }`. `healthStatus({ worker: false })` returns status `degraded`, the same ordered `checks`, and ordered `failed: ["worker"]`; multiple false known components appear in canonical checks order, and unknown input keys do not become checks.
<!-- ty-source-item:end -->

<!-- ty-source-item:start key=health-degraded-owner kind=technical_obligation -->
`src/health.mjs` remains the sole health projection owner; direct regression coverage belongs in `tests/health.test.mjs`, and the parent reconciles `project_context/areas/invoice-ops/deployment.md`.
<!-- ty-source-item:end -->

<!-- ty-source-item:start key=health-degraded-acceptance kind=acceptance -->
The focused health test and the repository test entry both pass on the same current Final-Gate candidate without weakening the healthy result.
<!-- ty-source-item:end -->

<!-- ty-source-item:start key=delegation-safety kind=technical_obligation -->
Money code/test and health code/test are independent owner/path packets. Source, Contract, Authority, Context, packet selection, integration, current-candidate checks and Final Gate remain parent-owned. A worker never changes the other packet or protected owners, never reverts concurrent edits and never supplies acceptance evidence.
<!-- ty-source-item:end -->
