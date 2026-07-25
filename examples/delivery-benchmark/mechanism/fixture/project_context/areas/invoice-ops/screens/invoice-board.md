---
context_role: subdomain
read_policy: on-demand
---
# Invoice Board Screen Contract

## Screen Identity

- Surface Key: `surface.invoice-board`
- Surface / Route / Command: read-only invoice board projection
- Platform: desktop Web projection
- Owning Product Domain: invoice operations
- Primary User Question: which invoices exist, what state are they in and what is each total?

## Information And Interaction

- The board is read-only and never owns invoice state.
- Ready rows expose invoice id, status, region and total in that semantic order.
- Loading, empty and error states must remain distinguishable.
- Error recovery exposes stable control `control.invoice-board.retry`; invoking it asks the owning shell to reload and does not mutate billing state.
- The board region is labelled `Invoices`; loading feedback uses a polite status live region.

## Design Target References

| Target ID | Canonical Owner / Anchor | Interpretation | Immutable Adopted Path + Digest | Editable Upstream / Owner / Update Route | Declared Condition Coverage | Selection Basis | Local Applicability |
|---|---|---|---|---|---|---|---|
| `invoice-board-desktop-v1` | `this Screen Contract#design-target-references` | `exact-target` | `design/invoice-board.html` + `sha256:f285fac663d8d08f1d201918a6ce7ebaebc417d80e77bd483f25dc397f24ef98` | `od://projects/invoice-operations-lab/invoice-board`; owner `invoice-experience`; create, review and select a new immutable export | desktop Web, 1440 × 900, light; default/loading/empty/error/focused; mouse/keyboard; full and reduced motion | Explicit fixture selection for invoice-board implementation | Whole screen and retry/status controls |

`DESIGN.md` contains only the stable target key and this anchor. The strict handoff at `design/handoffs/invoice-board.md` owns its changing coverage/provenance/method index and is not copied here.

## Verification

- Run `node tools/ty-context.mjs design-resource preflight design/handoffs/invoice-board.md` in a prepared formal benchmark run.
- Run `npm test` and `npm run test:ui`.
- Verify the production `src/ui/invoiceBoard.mjs` projection through the cold-start invoice-board entry represented by `renderInvoiceBoard`.

## Durable Boundary

- Target values and exact condition facts remain in the immutable selected resources.
- This Screen Contract owns durable screen/control semantics and the exactly-one canonical adoption record.
- A target or implementation change requires affected current-candidate checks; resource integrity alone is not implementation conformance.
