# Invoice Board implementation handoff

<a id="invoice-board-selected"></a>
<!-- ty-source-item:start key=invoice-board-selected kind=requirement -->
The production invoice board must conform to every covered fact of the selected desktop target and preserve attributable verification for every declared method.
<!-- ty-source-item:end -->

```yaml design-resource-handoff-v1
schema_version: design-resource-handoff-v1
intent: implementation_handoff
scope:
  key: invoice-board
  style_dependency: style-bearing
  surface_keys:
    - surface.invoice-board
  necessary_context:
    - The invoice board is a read-only projection over canonical invoice objects.
  exclusions:
    - Billing mutation and notification behavior.
provenance:
  provider: fixture-open-design
  provider_version: 1.0.0
  project: invoice-operations-lab
  run: invoice-board-selected-v1
  capability: implementation-ready-single-screen
  agent: fixture-author
  model: fixture-model
  design_system_id: invoice-lab-v1
resources:
  - key: resource.invoice-board
    role: exact_target
    path: design/invoice-board.html
    media_type: text/html
    sha256: f285fac663d8d08f1d201918a6ce7ebaebc417d80e77bd483f25dc397f24ef98
    editable_upstream:
      owner: invoice-experience
      locator: od://projects/invoice-operations-lab/invoice-board
      update_route: Create, review and select a new immutable export.
  - key: resource.invoice-tokens
    role: supporting
    path: design/tokens.css
    media_type: text/css
    sha256: aa21eca655dff8c9b58206138d6b0858c0a4579baf6e7000c44d429b57868051
    editable_upstream:
      owner: invoice-experience
      locator: od://projects/invoice-operations-lab/invoice-board/tokens
      update_route: Create, review and select a new immutable export.
  - key: resource.invoice-spec
    role: supporting
    path: design/invoice-board-spec.md
    media_type: text/markdown
    sha256: df5b3164864f63c790f5e5d4b3e1fb0b191b48dec6b79b3c0b783d0679997fab
    editable_upstream:
      owner: invoice-experience
      locator: od://projects/invoice-operations-lab/invoice-board/spec
      update_route: Create, review and select a new immutable export.
  - key: resource.invoice-component
    role: supporting
    path: design/invoice-board-component.json
    media_type: application/json
    sha256: 45419e66e33328f40291f544a2a104988dc2f165a961e10fba072f5300b7646c
    editable_upstream:
      owner: invoice-experience
      locator: od://projects/invoice-operations-lab/invoice-board/component
      update_route: Create, review and select a new immutable export.
conditions:
  - key: desktop-default
    platform: desktop-web
    viewport:
      width: 1440
      height: 900
      unit: px
    modes:
      - light
    states:
      - default
      - loading
      - empty
      - error
      - focused
    content_cases:
      - nominal
      - long-copy
    input_methods:
      - mouse
      - keyboard
    motion: full
  - key: desktop-reduced
    platform: desktop-web
    viewport:
      width: 1440
      height: 900
      unit: px
    modes:
      - light
    states:
      - default
      - loading
      - empty
      - error
      - focused
    content_cases:
      - nominal
      - long-copy
    input_methods:
      - mouse
      - keyboard
    motion: reduced
subjects:
  - key: surface.invoice-board
    kind: surface
    stable_keys:
      - surface.invoice-board
      - control.invoice-board.retry
      - component.invoice-board.status
    target_refs:
      - invoice-board-desktop-v1
targets:
  - key: invoice-board-desktop-v1
    interpretation: exact_target
    resource_refs:
      - resource.invoice-board
      - resource.invoice-tokens
      - resource.invoice-spec
      - resource.invoice-component
    condition_refs:
      - desktop-default
      - desktop-reduced
    source_profile:
      kind: implementation_web
      entry_resource_ref: resource.invoice-board
      dependency_resource_refs:
        - resource.invoice-tokens
        - resource.invoice-spec
        - resource.invoice-component
      acquisition: complete
    selection_basis: Explicit fixture selection for the invoice board desktop implementation.
evidence:
  - key: invoice-frame
    resource_ref: resource.invoice-board
    kind: frame
    locator:
      kind: html_selector
      value: "#invoice-board"
    condition_refs:
      - desktop-default
      - desktop-reduced
  - key: invoice-columns
    resource_ref: resource.invoice-board
    kind: frame
    locator:
      kind: html_selector
      value: "#invoice-board-columns"
    condition_refs:
      - desktop-default
      - desktop-reduced
  - key: invoice-transition
    resource_ref: resource.invoice-board
    kind: prototype_transition
    locator:
      kind: html_selector
      value: "#retry-invoices"
    condition_refs:
      - desktop-default
      - desktop-reduced
  - key: invoice-responsive
    resource_ref: resource.invoice-spec
    kind: responsive_spec
    locator:
      kind: markdown_anchor
      value: responsive-and-input
    condition_refs:
      - desktop-default
      - desktop-reduced
  - key: invoice-accessibility
    resource_ref: resource.invoice-component
    kind: accessibility_spec
    locator:
      kind: json_pointer
      value: /accessibility/region_label
    condition_refs:
      - desktop-default
      - desktop-reduced
  - key: invoice-asset
    resource_ref: resource.invoice-board
    kind: asset
    locator:
      kind: html_selector
      value: "#invoice-empty-asset"
    condition_refs:
      - desktop-default
      - desktop-reduced
  - key: invoice-token
    resource_ref: resource.invoice-tokens
    kind: token_spec
    locator:
      kind: css_custom_property
      value: --invoice-status-accent
    condition_refs:
      - desktop-default
      - desktop-reduced
coverage:
  - key: coverage.invoice-surface-flow
    subject_refs:
      - surface.invoice-board
    dimension: surface_flow
    disposition: covered
    target_refs:
      - invoice-board-desktop-v1
    condition_refs:
      - desktop-default
      - desktop-reduced
    evidence_refs:
      - invoice-frame
      - invoice-columns
    source_item_refs:
      - invoice-board-selected
    verification_methods:
      - layout_geometry
    rationale: The selected target declares the board region and column order.
  - key: coverage.invoice-visual-content
    subject_refs:
      - surface.invoice-board
    dimension: visual_content
    disposition: covered
    target_refs:
      - invoice-board-desktop-v1
    condition_refs:
      - desktop-default
      - desktop-reduced
    evidence_refs:
      - invoice-frame
      - invoice-token
    source_item_refs:
      - invoice-board-selected
    verification_methods:
      - visual_pixel
      - design_token
    rationale: The target declares compact density and the status accent token.
  - key: coverage.invoice-component-control
    subject_refs:
      - surface.invoice-board
    dimension: component_control
    disposition: covered
    target_refs:
      - invoice-board-desktop-v1
    condition_refs:
      - desktop-default
      - desktop-reduced
    evidence_refs:
      - invoice-frame
      - invoice-token
    source_item_refs:
      - invoice-board-selected
    verification_methods:
      - component_state
    rationale: The selected target declares status-badge and retry-control presentation.
  - key: coverage.invoice-state-interaction
    subject_refs:
      - surface.invoice-board
    dimension: state_interaction
    disposition: covered
    target_refs:
      - invoice-board-desktop-v1
    condition_refs:
      - desktop-default
      - desktop-reduced
    evidence_refs:
      - invoice-transition
    source_item_refs:
      - invoice-board-selected
    verification_methods:
      - component_state
      - interaction_trace
    rationale: The selected target declares loading, empty, error and retry behavior.
  - key: coverage.invoice-motion
    subject_refs:
      - surface.invoice-board
    dimension: motion
    disposition: covered
    target_refs:
      - invoice-board-desktop-v1
    condition_refs:
      - desktop-default
      - desktop-reduced
    evidence_refs:
      - invoice-transition
    source_item_refs:
      - invoice-board-selected
    verification_methods:
      - motion_timeline
    rationale: The selected target declares full and reduced-motion transition durations.
  - key: coverage.invoice-adaptation-input
    subject_refs:
      - surface.invoice-board
    dimension: adaptation_input
    disposition: covered
    target_refs:
      - invoice-board-desktop-v1
    condition_refs:
      - desktop-default
      - desktop-reduced
    evidence_refs:
      - invoice-responsive
    source_item_refs:
      - invoice-board-selected
    verification_methods:
      - responsive_reflow
    rationale: The selected target declares the desktop layout and keyboard input.
  - key: coverage.invoice-accessibility
    subject_refs:
      - surface.invoice-board
    dimension: accessibility
    disposition: covered
    target_refs:
      - invoice-board-desktop-v1
    condition_refs:
      - desktop-default
      - desktop-reduced
    evidence_refs:
      - invoice-accessibility
    source_item_refs:
      - invoice-board-selected
    verification_methods:
      - accessibility_semantics
    rationale: The selected target declares the region and live-region semantics.
  - key: coverage.invoice-assets
    subject_refs:
      - surface.invoice-board
    dimension: assets
    disposition: covered
    target_refs:
      - invoice-board-desktop-v1
    condition_refs:
      - desktop-default
      - desktop-reduced
    evidence_refs:
      - invoice-asset
    source_item_refs:
      - invoice-board-selected
    verification_methods:
      - asset_integrity
    rationale: The selected target declares the empty-state asset key.
acceptance_blockers: []
proposal:
  reconciliation_status: applied
  path: design/proposal.md
  revision: invoice-board-selected-v1
```
