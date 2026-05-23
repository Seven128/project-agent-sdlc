export interface HarnessConfig {
  core: {
    package: string;
    version: string;
    schema_version: string;
  };
  managed_files: ManagedFile[];
  local_overrides: string[];
  never_overwrite: string[];
}

export interface ManagedFile {
  path: string;
  strategy:
    | "merge-block"
    | "generated"
    | "managed"
    | "merge-with-local"
    | "create-if-missing";
}

export interface SourceMapping {
  source: string;
  target: string;
  mode:
    | "extract-managed-block"
    | "copy-tree"
    | "copy-file"
    | "extract-harness-targets";
}
