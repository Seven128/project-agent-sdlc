# Context model

Catalog owns manifest parsing, physical file discovery, optional Areas and explicit default selection. New schema 5 implicitly selects only global.md. Nonrecursive default_files preserves direct selections; only explicit default nodes seed default_children traversal. Do not reinterpret legacy policy names.

Context contains project-specific facts and decisions difficult to recover from code, with source locations. Architecture and specialized files are optional. Keep workspace organization sparse and reading separate from editing authority. CLI list/inspect help discover files; ordinary offline file reading remains sufficient.

Structural validation checks supported manifest fields, registered/default paths, canonical identities, path safety and explicitly declared ty-context-controlling-source local dependencies. It does not judge prose truth, require headings or validate ordinary historical links. Front-matter metadata, when explicitly present, must agree with registered role/read policy.

Create publishes an unregistered scaffold. Register/move use existing CAS and recoverable journals, preserving exact bytes outside intended patches, physical spelling and concurrent-change checks. Moving a direct default updates its manifest locator without changing traversal semantics.
