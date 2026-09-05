# Adopted Design-System Showcase Projection

This is the exact persistent DSA showcase contract. It produces one human-readable handbook for the adopted system without creating another Design Authority, Context owner, selected-design Fact source, implementation-conformance proof or aesthetic verdict.

## Fixed placement and declaration

Use only:

```text
docs/design-system-showcase/
  index.html
  showcase.manifest.json
  assets/...  # optional, local and manifest-bound
```

Place exactly one live declaration in root `DESIGN.md`, outside examples and fenced code:

```markdown
<!-- ty-context-design-showcase path="docs/design-system-showcase/showcase.manifest.json" -->
```

The declaration is part of the Authority entry and therefore its closure digest. The referenced HTML, sidecar and assets remain outside `design_system/**` and outside that closure/digest.

## Strict manifest shape

Write UTF-8 JSON with no unknown fields. Replace illustrative keys, anchors, digest and revision with the adopted project's exact values:

```json
{
  "schema_version": "design-authority-showcase-v1",
  "artifact_category": "design_system_handbook",
  "authority": {
    "entry_path": "DESIGN.md",
    "closure_digest": "sha256:<64 lowercase hex>",
    "revision": "<current non-empty human revision>"
  },
  "status": "adopted",
  "html": {
    "path": "docs/design-system-showcase/index.html",
    "sha256": "sha256:<raw-byte digest>"
  },
  "assets": [
    {
      "path": "docs/design-system-showcase/assets/<local-file>",
      "sha256": "sha256:<raw-byte digest>"
    }
  ],
  "coverage": [
    { "key": "identity", "disposition": "rendered", "anchor": "identity" },
    { "key": "color", "disposition": "rendered", "anchor": "color" },
    { "key": "typography", "disposition": "rendered", "anchor": "typography" },
    { "key": "layout-spacing-density", "disposition": "rendered", "anchor": "layout-spacing-density" },
    { "key": "container-grammar", "disposition": "rendered", "anchor": "container-grammar" },
    { "key": "icons-assets", "disposition": "rendered", "anchor": "icons-assets" },
    { "key": "component-catalog", "disposition": "rendered", "anchor": "component-catalog" },
    { "key": "component-contracts", "disposition": "rendered", "anchor": "component-contracts" },
    { "key": "relationship-contracts", "disposition": "rendered", "anchor": "relationship-contracts" },
    { "key": "interaction-accessibility", "disposition": "rendered", "anchor": "interaction-accessibility" },
    { "key": "motion", "disposition": "rendered", "anchor": "motion" },
    { "key": "adaptation", "disposition": "rendered", "anchor": "adaptation" },
    { "key": "implementation-provenance", "disposition": "rendered", "anchor": "implementation-provenance" },
    { "key": "supplemental-validation", "disposition": "rendered", "anchor": "supplemental-validation" }
  ],
  "token_families": [
    { "key": "<stable-token-family-key>", "anchor": "<matching-id>" }
  ],
  "components": [
    { "key": "<stable-component-key>", "anchor": "<matching-id>" }
  ],
  "target_conditions": [
    {
      "target_key": "<selected-target-key>",
      "condition_key": "<declared-condition-key>",
      "anchor": "<matching-id>"
    }
  ],
  "external_network_dependencies": []
}
```

Every coverage key appears exactly once in that order. Use `{"key":"...","disposition":"not_applicable","rationale":"specific reason"}` only when the adopted system truly makes the category inapplicable. `identity`, `component-catalog`, `component-contracts`, `implementation-provenance` and `supplemental-validation` must be rendered. Token-family, component and target-condition indices are non-empty and use stable unique keys and anchors. The component index represents the complete adopted catalogue, not a sample.

## Restricted inert HTML

- Start with one `<!doctype html>` and one lowercase, explicitly closed HTML tree with double-quoted attributes.
- On the `<html>` start tag set `data-ty-showcase-artifact="design_system_handbook"`, `data-ty-showcase-status="adopted"` and `data-ty-showcase-authority-digest="<current closure digest>"`.
- For every rendered coverage row, put exactly one matching `id` and `data-ty-showcase-section="<coverage key>"`. Preserve manifest order. Omit a section only for its justified N/A row.
- Mark every indexed Token family with `data-ty-showcase-token-family`, every indexed component with `data-ty-showcase-component`, and every indexed scene with both `data-ty-showcase-target` and `data-ty-showcase-condition`; each marked tag's `id` equals its manifest anchor.
- Token and component definitions stay in the handbook before `supplemental-validation`. Target-condition scenes are descendants of the final supplemental section. A supplemental scene demonstrates composition and never declares a Token family or component.
- Include identity/status/scope/purpose/principles/preferences first; then color, typography, space/layout/density, containment, assets, complete component catalogue and per-component anatomy/variants/states/accessibility/do-don't, relationship contracts, input/focus/accessibility, motion, adaptation, implementation mapping and provenance; put application scenes last.
- Use inline CSS or declared local `.css` assets. Every local reference must resolve below `docs/design-system-showcase/assets/`, be listed with its digest and be reachable from HTML or another reachable CSS asset. Supported assets are CSS, raster images and local font formats; inline static SVG is allowed, but active SVG elements are not.
- Do not use scripts, event handlers, `style` attributes, forms, frames, objects, embeds, meta refresh, active SVG animation, JavaScript/data/network URLs, CSS imports or undeclared/unreachable assets. Encode text containing `<` rather than relying on browser error recovery.

## Construction and verification order

1. Add the exact showcase marker while writing the selected Authority semantics. For bundle format, preserve its independent body-leading bundle marker rule.
2. Finalize and validate the new Authority closure/digest first. The fixed showcase marker has no content digest, so there is no cycle.
3. Generate the handbook from the selected system and the current reasoning brief. Generate only materially required local assets.
4. Hash raw HTML/asset bytes, write the strict sidecar with the exact current Authority identity, then run `ty-context design-authority inspect --require-showcase`.
5. Run the project's existing reproducible browser/E2E route for each selected target's declared viewport, text-scale, long-label, reduced-motion and other material conditions. Test actual target values and behaviours; do not substitute a package-wide viewport list or static HTML presence check.
6. Report structural projection validity, rendered conditions and aesthetic review separately. A valid sidecar proves integrity/category/coverage only; human or validly delegated selection proves suitability.

Normal `design-authority inspect` remains compatible with older projects and reports `not_declared`, `valid` or `invalid` showcase status without changing closure validity. The explicit `--require-showcase` flag makes `valid` mandatory for the DSA adoption artifact-readiness check.
