# Context model

Catalog owns manifest parsing, physical file discovery, optional Areas and explicit default selection. New schema 5 implicitly selects only global.md. Nonrecursive default_files preserves direct selections; only explicit default nodes seed default_children traversal. Do not reinterpret legacy policy names.

Context contains project-specific facts and decisions difficult to recover from code, with source locations. Architecture and specialized files are optional. Keep workspace organization sparse and reading separate from editing authority. CLI list/inspect help discover files; ordinary offline file reading remains sufficient.

Structural validation checks supported manifest fields, registered/default paths, canonical identities, path safety and explicitly declared ty-context-controlling-source local dependencies. It does not judge prose truth, require headings or validate ordinary historical links. Front-matter metadata, when explicitly present, must agree with registered role/read policy.

Adopted design resources use existing owners and controlling-source declarations. Context keeps the current entry, scope, decisions and authority boundaries; resource entities and generation history stay outside Context. Shared resources have one declaring owner, linked from consumers. An entry may map different nonconflicting scopes to resources; newer candidates do not acquire authority by recency. The contract requires following relevant current inputs without making the resource directory default Context. Declaration checks are local, text-only and nonrecursive; semantic scope overlap, linked media, remote usability and actual implementation need separate observation.

Project design extensions keep confirmed style, principles and business/interaction rules in Context, while tool operations and design methods live in project Skills that may compose the generic resource capability. Exact tokens and component/resource definitions stay in their actual code or design sources, referenced by Context. Extending or updating the resource method does not itself change adopted design authority or require reorganizing project Context.

Create publishes an unregistered scaffold. Register/move use existing CAS and recoverable journals, preserving exact bytes outside intended patches, physical spelling and concurrent-change checks. Moving a direct default updates its manifest locator without changing traversal semantics.
