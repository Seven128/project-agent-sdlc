# Tiny Context

Tiny Context preserves durable project facts and installs a short development contract in `AGENTS.md`. It helps a coding agent find project-specific requirements and maintain them without prescribing an engineering workflow.

This source version is **0.12.0**, configuration schema **5**, update mode **upgrade-required** for schema-4 installations. See the [migration notes](https://github.com/Seven128/project-tiny-context-harness/blob/main/packages/ty-context/migrations/README.md).

## Start with little

Requires Node.js 24 or newer. Install the package version you intend to use, then run its local CLI:

```sh
npm install --save-dev project-tiny-context-harness
npx --no-install ty-context init
```

For an unreleased source checkout, build and install its actual tarball instead of assuming the published package contains these changes.

Plain `init` creates only `AGENTS.md`, `.agent/config.yaml`, `project_context/global.md` and `project_context/context.toml`. It preserves existing files and leaves project facts as TODO until known. Transient file-maintenance locks may create `tmp/ty-context`; they are not task state. Use `--adopt` for an existing project. An explicit `--harness-folder .codex` stores that optional location in `package.json`; changing an existing installation's root requires separate migration.

No architecture, Area, design system, role Skill, Hook, Makefile, tools directory or CI workflow is installed by default. Existing design documents and confirmed decisions remain useful inputs.

`AGENTS.md` is the managed startup entry. A root `AGENTS.override.md` can shadow it; `doctor` reports that observable condition. Hosts and nested instruction scopes can differ: file installation does not prove that the current model loaded or followed the contract. No global host settings are modified.

## Keep facts that outlive a task

Save goals and non-goals, ownership and dependency boundaries, confirmed decisions with reasons, project constraints and repeatable operation/source entrypoints. Reference precise values in their real source rather than copying code. Context describes intended meaning; implementation may disagree and need repair.

There are no mandatory headings, task-progress fields, stable Fact IDs or source-line limits. TODOs and historical test records are allowed. Update Context when durable facts change. Temporary exports and optional handoff notes are not another long-term source of truth.

## Read defaults, then related owners

New defaults contain `project_context/global.md` plus explicit project selections. `architecture.md` has no special default status in schema 5. `context.toml` is routing metadata, not default body text.

```sh
npx --no-install ty-context context list --default
npx --no-install ty-context context list --default --json
npx --no-install ty-context context inspect project_context/global.md
```

The query shows paths, reasons, diagnostics and whether the set is complete. Invalid manifests return a non-success status; partial results are never a complete empty set.

The CLI is optional for reading. Offline, read `global.md` and use the manifest's direct `default_files`, default Area, `read_policy = "default"` nodes and their transitive `default_children`. Direct files and default Areas do not themselves seed child traversal. Child edges preserve existing semantics, including a referenced `never-default` node. Legacy `always`, `optional` and `never-default` names do not imply new selection behavior; diagnostics explain legacy metadata. Do not reinstall the CLI or repeat a query when the set is already known and unchanged. Resolve uncertainty affecting the task; unrelated uncertainty need not freeze all work.

Example optional routing:

```toml
default_files = ["project_context/architecture.md"]

[[areas]]
id = "payments"
root = "src/payments"
context = "project_context/areas/payments.md"
kind = "service"

[[context]]
path = "project_context/areas/payments/recovery.md"
role = "domain"
read_policy = "on-demand"
triggers = ["payment recovery"]
```

`default_files` selects literal body files without activating their children. Areas and workspace folders can be sparse. Ordinary search and inspection discover additional owners; reading them does not authorize changing unrelated projects.

## Maintain files safely

```sh
npx --no-install ty-context context create --path project_context/payments.md --role domain
npx --no-install ty-context context register --path project_context/payments.md --role domain
npx --no-install ty-context context register --path project_context/payments.md --role domain --apply
npx --no-install ty-context context move --from project_context/payments.md --to project_context/billing.md
npx --no-install ty-context context transaction status
npx --no-install ty-context context transaction complete
npx --no-install ty-context context transaction rollback
npx --no-install ty-context sync
```

Create publishes an unregistered scaffold. Register and move preview first; `--apply` uses the existing path checks, byte/identity comparisons and recoverable file journal. No force bypass is provided. Context mutations use `context-mutation-journal-v3`; the compatible current recovery parser can read `context-mutation-journal-v2`. Unrecognized pre-v2 journals require manual recovery with a matching old version. An old schema-4 transaction must be settled by its compatible old CLI before schema migration, even if its journal format is otherwise familiar.

Sync replaces only the managed startup block and preserves surrounding user prose. Schema mismatches, unfinished upgrades/Context transactions and conflicting writes stop relevant maintenance. Several filesystem replacements are not one atomic transaction; do not overwrite a conflicting file to make recovery pass.

## Check structure, verify products separately

```sh
npx --no-install ty-context validate-context
npx --no-install ty-context doctor
```

Checks cover manifest parsing, registered and direct-default paths, duplicate identities, portability/path safety and explicitly declared local dependencies using this existing syntax:

```html
<!-- ty-context-controlling-source domain="technical" path="docs/api.md" -->
```

Allowed domains are product, technical, design, acceptance and external. This declaration requests local UTF-8 file validation. Arbitrary prose paths, ordinary Markdown links, examples, remote links and future generated outputs are not mandatory existence checks. Validation does not run generators, access the network, establish factual truth or certify product quality.

Use project tests and actual observations appropriate to the change. The short contract asks agents to preserve user requirements, work within authorization, implement and verify, repair failures, maintain changed facts and report material uncertainty. It requires no separate Skill, fixed report or completion Gate.

For CI, add `ty-context validate-context` to your own workflow. Tiny Context does not remove independent project lint, tests or security requirements.

## Upgrade explicitly

```sh
npx --no-install ty-context upgrade --check
# Stop relevant old host sessions before acknowledging this precondition:
npx --no-install ty-context upgrade --sessions-stopped
```

Automatic retirement supports the pinned schema-4/package-0.11.0 baseline. It preserves the exact normalized default body path set, backs up planned changes, removes exact owned old assets, preserves mixed user content and only retires the current worktree's binding. Backups and pending recovery live under `tmp/ty-context`, outside host-discovered Skills and default Context. Interrupted upgrades resume through the same explicit command; ordinary sync refuses unfinished publication.

A pending old Context transaction blocks retirement before schema or manifest changes. Use the installed compatible **0.11.0** recovery tool; never substitute `@latest`. If its old binding conflicts, use its legitimate abandon/end path first, without requiring Final Gate or deleting locks. Unreadable journals are errors, not absence.

Software migration and project-information review are reported separately. Modified executable guidance blocks replacement. Historical records remain untouched. Current declared symbolic/compiler-dependent resources and recognized retired build commands need extraction or replacement with provenance before switching. Ordinary Markdown and direct JSON/YAML values remain readable; there is no general legacy compiler or structured-ID adapter. Review current task inputs, selected resources and other build entrypoints that the bounded inspection does not interpret. Do not regenerate a design to replace a lost adopted decision.

Long-Task, DSA/DRA, role workflows, design preflight/acceptance, observer proofs, routing rankings and modularity gates are retired. Old command names fail with a retirement diagnostic; they do not return a weaker success. New schema guards cannot repair old binaries retroactively: some old commands may change profile configuration before rejecting schema 5. Baseline old bare init can also select a different root before checking schema and reinstall old startup assets. Fixed-root old sync/init reject schema 5; this does not protect against root reselection. Such mixed installations/configuration are unsupported and rejected by new writes. Start a fresh host session after migration so previously loaded instructions do not continue to apply.

## Export and maintain the package

`ty-context export-context --help` lists temporary full/code/source-pack exports and their scope. Export output is not Context or product evidence; review redaction warnings before sharing.

Source-pack updates only its recorded, unchanged generated files. It preserves unlisted user files and unowned historical directories, and refuses to overwrite edited generated output. Export sets are not atomic multi-file transactions.

In this source repository:

```sh
npm ci
npm run build --workspace project-tiny-context-harness
npm test
node packages/ty-context/dist/cli.js package sync-source
node packages/ty-context/dist/cli.js package check-source
```

Canonical guidance and Context rules live in `.codex/ty-context-managed`; source mappings derive package assets and README. Regression includes Context/file safety, actual pinned old-version recovery and tarball consumers. Tests prove those behaviors and distributed text, not model compliance or an unmeasured efficiency gain.
