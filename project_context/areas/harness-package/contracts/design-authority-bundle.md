---
context_role: contract
read_policy: on-demand
---

# Design Authority Bundle Contract

## Purpose And Sole Authority Boundary

Root `DESIGN.md` is the only Design Authority entry, the only human revision owner and, in the first bundle release, the only editable owner of exact design Tokens. Its supported YAML front matter `version` is the human-readable revision and its supported Token sections are the exact Token source. A subordinate bundle only partitions durable reusable rules and binds their complete machine identity; it creates no second Design Authority.

`design_system/authority.manifest.json` owns only closure membership and the claimed closure digest. It must not contain a revision, adopted status, current direction name or Token value. `design_system/tokens.json`, when declared, is a deterministic generated projection of `DESIGN.md` front matter and is never independently edited. Reversing Token ownership requires a separately reviewed future protocol and migration; it is outside this contract.

Projects may remain a legacy single-file authority with only `DESIGN.md`. A bundle is sparse: subordinate files are created only for real reusable foundations, typography, iconography, motion, component, pattern, platform or migration rules. Empty category mirrors and a mandatory complete directory tree are forbidden.

## Manifest V1

The strict JSON shape is:

```json
{
  "schema_version": 1,
  "entry": "DESIGN.md",
  "authority_files": [
    {
      "path": "design_system/components/button.md",
      "kind": "component"
    }
  ],
  "generated_files": [
    {
      "path": "design_system/tokens.json",
      "source": "DESIGN.md#frontmatter.tokens"
    }
  ],
  "closure_digest": "sha256:<64-lowercase-hex>"
}
```

Unknown fields fail closed. `entry` is exactly `DESIGN.md`. The manifest cannot list itself or the entry in either array. Every subordinate path is below `design_system/`, and authority and generated path sets are disjoint. Authority `kind` is one of `foundation`, `typography`, `iconography`, `motion`, `component`, `pattern`, `platform` or `migration`. Generated source V1 supports only `DESIGN.md#frontmatter.tokens`; its output bytes must equal the package's deterministic DTCG export of the current supported front matter plus one final LF.

The implementation bounds one load to at most 4,096 closure members, 8 MiB per file and 64 MiB total normalized member content. Exceeding a bound fails with an incomplete/invalid closure; no file, member or byte is silently omitted.

## Portable Paths And Files

Every path is repository-relative POSIX text, Unicode NFC, non-empty, non-absolute and contains no `.` or `..` segment. Backslashes, drive prefixes, UNC forms and NUL are rejected rather than rewritten. Normalized duplicate paths and case-fold collisions are rejected so one manifest has one portable meaning on case-sensitive and case-insensitive filesystems.

Every closure member is a contained ordinary UTF-8 text file. UTF-8 BOM, invalid UTF-8, symlinks, a symlinked parent, non-regular files and hard-linked files are rejected. Resolved paths must remain inside the repository, and no two members may resolve to the same file identity. These rules apply to `DESIGN.md`, the manifest and every declared file.

## Canonical Projection And Closure Digest

A manifest-backed closure has these members:

- `DESIGN.md` with its current text;
- every declared `authority_files` member;
- every declared `generated_files` member; and
- `design_system/authority.manifest.json` represented by the canonical manifest projection below.

For a legacy project without the manifest, the closure contains only `DESIGN.md` and uses the same framing and text rules.

Each text member is decoded as strict UTF-8, then CRLF and lone CR are converted to LF. No text is trimmed, reordered or Unicode-normalized after decoding. The manifest projection removes `closure_digest`, recursively orders object keys by Unicode code-point order, sorts both file arrays by normalized path UTF-8 byte order, emits compact UTF-8 JSON with no trailing whitespace or environment field, and is used as the manifest member content. The manifest's presentation bytes are therefore not a second semantic input.

Members are sorted by normalized path UTF-8 byte order. SHA-256 receives, for each member in order:

```text
uint64be(path UTF-8 byte length)
path UTF-8 bytes
uint64be(content UTF-8 byte length)
normalized content UTF-8 bytes
```

The result is lowercase `sha256:<64 hex chars>`. There is no timestamp, random identity, platform separator, locale collation or filesystem enumeration order in the digest. The manifest is valid only when its claimed `closure_digest` equals a fresh computation.

## Extra Files And Normative Links

An unlisted ordinary file below `design_system/**` is not automatically authoritative and does not enter the digest. Doctor reports it as an advisory warning. If `DESIGN.md` or a declared Markdown authority file contains an actual local Markdown link to an unlisted `design_system/**` file, the closure is incomplete and invalid. Inline/fenced code, ordinary prose and external URLs do not create a deterministic link. Fragments and URL encoding are resolved while preserving the target file identity.

This rule permits local drafts without silently adopting them while preventing a normative authority member from depending on bytes outside its bound closure.

## Machine Identity And Compatibility

The complete machine identity is:

```json
{
  "format_version": 1,
  "entry_path": "DESIGN.md",
  "manifest_path": "design_system/authority.manifest.json",
  "closure_digest": "sha256:<64-lowercase-hex>",
  "revision": "human-readable-or-null"
}
```

For a legacy single-file closure, `manifest_path` is `null`. `entry_path + closure_digest` is freshness authority; `revision` is diagnostic only. A subordinate/generated member change invalidates an old identity even if `DESIGN.md` and its `version` text are unchanged. The old raw-file identity shape remains readable only for a real legacy single-file project and is rejected as an attempted bundle binding when a manifest exists.

## Consumers And Staleness

DRA current-authority loading, recovery checkpoint creation/resume, selected-resource binding, Authority Delta Assessment, formal handoff/preflight, resource recovery and stale-proposal checks all compare the complete identity. Newly authored style-bearing or mixed handoffs carry it explicitly. A legacy handoff may omit it only for a current single-file authority; preflight derives that one-file identity and reports the compatibility derivation. A manifest-backed authority never receives that omission fallback.

Long-Task activation requires all consumed handoffs to bind one equal current identity. Every closure member path, including the manifest and generated members, enters the existing protected observation/Authority path set. A later child-file or generated-file change therefore revises or invalidates the existing Long-Task Authority through its current mechanism; this contract adds no new Gate or lifecycle.

## Authority Delta Assessment And Adoption

Authority Delta Assessment is a separate strict non-authoritative data shape, not the existing Proposal–Resource reconciliation and not a workflow status. Its only judgments are `consistent_with_current_authority`, `task_local_variance` and `authority_delta_candidate`, each bound to the complete current identity.

Consistency names concrete Token/component/rule evidence and has no observed variance. A task-only variance carries `durability: task_only` and `precedent: forbidden`. A cross-task variance is only a candidate and identifies a required Screen Contract or Design Authority owner; before handoff it must be durably adopted, explicitly abandoned or returned to the user as unresolved. An authority-delta candidate contains only proposed Token/component/pattern/motion/platform changes, supporting selected resources and representative scenarios.

DRA stops after assessment. It cannot set `passed`, `adopted` or `authority_updated`, invoke DSA, modify the bundle or treat task-resource selection as system adoption. A user separately invokes `design-system-authoring`; DSA revalidates the base identity, produces system-level candidates, obtains a separate explicit selection and then a separate explicit adoption decision. Adoption updates the owning files, regenerates deterministic outputs, publishes a valid new digest, rebinds the originating DRA material and reruns every affected check.

## Package And Skill Boundary

Package code owns the strict manifest/identity/assessment codecs, local validation, deterministic digest and Token projection, Doctor diagnostics and read-only CLI inspection. It may not perform remote generation, authentication, network disclosure, polling, retry, cancellation, Provider cleanup, candidate selection or adoption. `@google/design.md` is accessed only through the local `DesignMdToolAdapter` lint/parse/export/diff facade.

Open Design generation remains in explicit Skills. `design-system-authoring` owns bootstrap, revise and reconcile authoring modes plus the user adoption interaction. Package validation after authorized file edits proves only shape, identity and local deterministic invariants; it does not decide aesthetics, brand direction or whether a candidate should be adopted.

## Verification And Evolution

Tests cover legacy and sparse bundles; strict schema/unknown fields; path normalization, ordering, duplicates and case collisions; CRLF/LF digest equality; whitespace and child-byte sensitivity; UTF-8/BOM; symlink, parent-link, hardlink and file-identity rejection; generated Token equality; extra-file warning and linked-extra failure; deterministic JSON and read-only CLI output; recovery/handoff stale binding; Long-Task protected-member binding; all three assessment shapes and forbidden adoption fields; and explicit Skill/adoption wording.

Any new generated source, authority kind, Token ownership direction, workspace-local Design Authority, Provider runtime or digest algorithm requires a separately versioned reviewed change. Existing V1 identities never change meaning in place.
