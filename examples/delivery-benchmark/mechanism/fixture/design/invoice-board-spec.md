# Invoice Board Implementation Specification

## State And Interaction

- Loading copy is `Loading invoice queue` and uses a polite live region.
- Empty copy is `No invoices yet` and uses the `invoice-stack` decorative asset.
- Error copy is `Invoice board unavailable`.
- The error recovery control has stable id `retry-invoices` and visible label `Retry`.

## Motion

- State transitions use `120ms`.
- Reduced-motion transitions use `0ms`.

## Responsive And Input

- The selected 1440 × 900 desktop condition uses layout mode `desktop-table`.
- Column order is `id`, `status`, `region`, `total`.
- Retry remains keyboard-operable through the native button control.
