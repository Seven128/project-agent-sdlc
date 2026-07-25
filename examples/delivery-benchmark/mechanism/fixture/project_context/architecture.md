# Architecture Context

## System Boundary

- The fixture owns in-memory invoice creation, totals, payment state, receipt-notification requests, UI projection, retry/dead-letter behavior, protected audit export, and health reporting.
- External live-provider delivery is outside machine-local acceptance and remains an explicit external confirmation.

## Component Map

- `src/billing/invoiceService.mjs`: invoice state owner and orchestration facade.
- `src/billing/money.mjs`: monetary rounding and total calculation.
- `src/billing/invoiceSchema.mjs`: input normalization and compatibility boundary.
- `src/notifications/receiptNotifier.mjs`: notification provider boundary and delivery evidence level.
- `src/ui/invoiceBoard.mjs`: read-only invoice presentation.
- `src/worker/retryWorker.mjs`: bounded retry and dead-letter lifecycle.
- `src/admin/auditExport.mjs`: permission-protected export.
- `src/health.mjs`: deployment health contract.

## Data / Control Flow

`invoice input -> schema normalization -> invoice service -> money policy -> stored invoice -> UI projection`

`paid transition -> invoice service -> notification boundary -> mock receipt evidence`

`delivery job -> retry worker -> delivered | bounded retry -> dead letter`

## Design Rationale

- Dependency direction flows from orchestration toward specialized policy/provider modules; UI and admin read through stable product objects rather than owning invoice state.
- The invoice-board Screen Contract owns durable screen/control semantics and its screen-specific canonical target record; `DESIGN.md` points to that owner, immutable design resources own exact target facts and `src/ui/invoiceBoard.mjs` is the production projection.
- Idempotency belongs at the state transition/provider boundary that can observe duplicate delivery intent.

## Constraints And Tradeoffs

- The fixture stays dependency-free and deterministic.
- Compatibility aliases may be accepted at input boundaries but canonical stored/output fields must use the current contract name.
- Retry exhaustion and permission denial must be observable, not inferred from logs.

## Verification Implications

- Unit tests prove local policy; cross-module tasks require tests that observe both the owner and the dependent surface.
- Health behavior must be observable through both the exported function and the CLI exit/result contract.

## Open Risks

- Mock provider results do not prove live delivery.
- A code-only fix can leave durable contract, verification, or deployment Context stale.
