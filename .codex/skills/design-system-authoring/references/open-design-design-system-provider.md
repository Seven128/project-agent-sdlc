# Open Design Design-System Provider

Use Open Design's live structured surface. Do not assume the installed version matches this compatibility note; discover first and branch on actual tool/resource schemas.

## Capability order

1. Open Design MCP resources/tools.
2. The same installed Open Design daemon's structured HTTP API when MCP lacks the required design-system lifecycle operation.
3. Open Design UI/CLI only for bootstrap, preview inspection or a capability unavailable through structured paths.

Never call a copied prompt or local imitation a provider result. Persistent MCP registration, plugin/auth changes and new disclosure paths require separate authorization.

The package-local `@google/design.md` adapter performs deterministic lint, parse/validate, export and diff only. It is not Open Design, does not generate candidates and owns no provider authentication, polling, selection or adoption.

## Current verified MCP contract

Open Design 0.15.1 exposed MCP server 0.2.0 using protocol `2025-06-18`. A live read-only smoke observed 152 concrete design-system resources through `resources/list`; `resources/read` returned their Markdown bodies. The URI families are:

- `od://design-systems/<id>/DESIGN.md` for current design-system bodies;
- `od://skills/<id>/SKILL.md` for functional skills;
- `od://focus/active` for current focus.

This version returns `-32601` for `resources/templates/list`. Treat template enumeration as optional protocol capability: use concrete `resources/list` results when present and never reject a readable design-system catalogue merely because the template-list method is absent.

Its 18 observed tools included `list_projects`, `get_project`, `create_project`, `start_run`, `get_run`, file/artifact operations and capability discovery. `create_project` accepts optional `designSystem`; verify the result through `get_project.designSystemId`. This version exposes design systems as resources but no create/update design-system MCP tool.

Feature-detect future structured methods before using the fallback. A tool name alone is insufficient: inspect its input schema and result.

## Generation fallback for Open Design 0.15.1

When MCP cannot create a design system, discover the running daemon and use its official API. Prefer install metadata supplied by Open Design rather than hardcoded paths. Confirm `/api/health` and the version first.

Start generation:

```http
POST /api/design-systems/generation-jobs
Content-Type: application/json
```

The body is the provider's current design-system input. Supported 0.15.1 fields observed in the installed provider include:

```json
{
  "title": "Product design system",
  "category": "Custom",
  "surface": "web",
  "summary": "Product and brand intent",
  "sourceNotes": "Bounded design brief",
  "provenance": {
    "companyBlurb": "Product context",
    "sourceUrls": [],
    "githubUrls": [],
    "localCodeFiles": [],
    "figFiles": [],
    "assetFiles": [],
    "notes": "Selection constraints"
  }
}
```

Send only relevant, user-authorized sources. Do not transmit secrets or unrelated repository content. `surface` is provider-defined; validate the live accepted value. A supplied `body` creates a direct draft and must not be misrepresented as model generation.

Poll `GET /api/design-systems/generation-jobs/<jobId>` at a bounded cadence until a terminal state. Preserve the job ID, step diagnostics and returned `designSystemId`. The observed pipeline explores resources, creates a draft, generates `DESIGN.md`/README/SKILL/tokens/previews/context files, registers files and prepares review.

## Review and revision

Read the system and inspect its assets through:

- `GET /api/design-systems/<id>`;
- `GET /api/design-systems/<id>/files` and `/file?path=<path>`;
- `GET /api/design-systems/<id>/preview` or `/showcase`;
- `POST /api/design-systems/<id>/workspace` when an editable review project is required.

Create scoped feedback with:

```http
POST /api/design-systems/<id>/revision-jobs
Content-Type: application/json

{"feedback":"...","sectionTitle":"optional section"}
```

Poll the returned job through the generation-job endpoint. A succeeded revision job creates a pending revision; it does not alter project authority and must not be called accepted. Inspect revisions with `GET /api/design-systems/<id>/revisions`. After explicit selection, set exactly that revision to accepted:

```http
PATCH /api/design-systems/<id>/revisions/<revisionId>
Content-Type: application/json

{"status":"accepted"}
```

Reject explicitly discarded revisions when useful. Accepting a provider revision updates the provider copy only; the authority-adoption step still owns the project writeback.

The provider also exposes `POST /api/design-systems/<id>/token-contract/rebuild-jobs`. Use it only when the live token-quality decision says a rebuild is available or the user explicitly requests a forced rebuild. A generated token contract still needs selection and project adoption.

## Provider binding for downstream resources

For a new Open Design resource project, call MCP `create_project` with the adopted provider ID in `designSystem`. Immediately call `get_project` and require `designSystemId` to match.

For an existing project, inspect `get_project` first. When it is missing or mismatched, prefer a new bounded project with the correct binding if MCP offers no safe update. Use a live structured provider update only after feature-detecting it and preserving project identity. Never proceed with a style-bearing run while silently bound to another system.

In DSA `reconcile` mode, send only the current Authority material needed for the proposed Token/component/pattern/motion/platform delta, the user-promoted non-authoritative assessment, immutable constraints, affected platforms, supporting resources and representative scenarios. Provider output remains a system candidate. It cannot emit an effective `selected`, `adopted` or `authority_updated` decision.

## Failure semantics

Keep these states separate:

- daemon/MCP execution: queued, running, succeeded, failed, cancelled or unknown;
- candidate artifacts: missing, partial, retrievable, rendered or corrupt;
- selection: unreviewed, selected, rejected or decision-required;
- project adoption: unchanged, partially adopted, adopted or inconsistent;
- provider binding: unverified, matched or mismatched.

Preserve exact errors and stop bounded polling. Do not mark a candidate selected because generation succeeded, and do not mark project authority adopted because a provider revision was accepted.
