---
name: "Invoice Operations Lab"
colors:
  invoice-status-accent: "#1f6b45"
typography:
  family: "system-ui"
spacing:
  row-gap: "8px"
rounded:
  control: "4px"
components:
  invoice-status:
    treatment: "badge"
---

# Design Authority

## Overview

- Design authority status: `configured`.
- Authored exact-value token source: `design/tokens.css`.
- Generation direction: `DESIGN.md -> design/tokens.css -> production UI`.

### Design Authority Index

- `invoice-board-desktop-v1` is screen-specific; canonical owner: `project_context/areas/invoice-ops/screens/invoice-board.md#design-target-references`.
- This file intentionally does not duplicate that target's interpretation, locator/digest, condition coverage, selection basis or editable-upstream route.

## Components

- Invoice status uses the project component-family treatment `badge`.

## Do's and Don'ts

- Do follow the canonical Screen Contract record before implementing the invoice board target.
- Don't copy the handoff coverage index or screen-specific target metadata into this file.
