import type { ContextRole } from "../context-catalog/catalog-portable-contract.js";

export type ContextMutationOperation = "register" | "move";

export type ContextMutationJournalState =
  "planning" | "prepared" | "committing" | "validating";

export interface MutationFileIdentity {
  dev: number;
  ino: number;
  nlink: number;
  size: number;
  mtime_ms: number;
  ctime_ms: number;
}

export interface MutationFileState {
  exists: boolean;
  sha256: string | null;
  bytes_base64: string | null;
  mode: number | null;
  identity: MutationFileIdentity | null;
}

export interface MutationFileChange {
  path: string;
  before: MutationFileState;
  after: MutationFileState;
  commit_order: number;
  temporary_path: string | null;
}

export interface MutationDirectoryChange {
  path: string;
  before_exists: false;
}

export interface RegisterMutationData {
  kind: "register";
  context_path: string;
  role: ContextRole;
  read_policy: string;
  expected_default_paths: string[];
  expected_default_bytes: number;
}

export interface MoveMutationData {
  kind: "move";
  from_path: string;
  to_path: string;
  owner_source: "area" | "context";
  role: ContextRole;
  read_policy: string | null;
  expected_reference_issues: string[];
  expected_default_paths: string[];
  expected_default_bytes: number;
}

export type ContextMutationOperationData =
  RegisterMutationData | MoveMutationData;

export interface ContextMutationPlan {
  transaction_id: string;
  operation: ContextMutationOperation;
  catalog_before_identity: string;
  catalog_after_identity: string;
  directories: MutationDirectoryChange[];
  files: MutationFileChange[];
  operation_data: ContextMutationOperationData;
}

export interface ContextMutationJournal extends ContextMutationPlan {
  schema_version: "context-mutation-journal-v1";
  journal_sequence: number;
  previous_journal_sha256: string | null;
  state: ContextMutationJournalState;
  applied_paths: string[];
}

export interface MutationFileStatus {
  path: string;
  state: "before" | "after" | "conflict";
  current_sha256: string | null;
}

export interface MutationDirectoryStatus {
  path: string;
  state: "absent" | "directory" | "conflict";
}

export interface ContextMutationStatus {
  schema_version: 1;
  journal_present: boolean;
  transaction_id?: string;
  operation?: ContextMutationOperation;
  state?: ContextMutationJournalState;
  directories: MutationDirectoryStatus[];
  files: MutationFileStatus[];
  recovery_commands: string[];
}

export interface ContextFootprintState {
  paths: string[];
  path_count: number;
  bytes: number;
}
