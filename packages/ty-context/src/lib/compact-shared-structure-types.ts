export interface CompactSharedStructureSlot {
  boundary: string;
  value: unknown;
}

export interface CompactSharedStructureTarget {
  boundary: string;
  read: () => unknown;
  write: (value: unknown) => void;
}

export interface CompactSharedStructureTemplate {
  key: string;
  digest: string;
  boundary: string;
  parameter_count: number;
  template: unknown;
}

export interface CompactSharedStructureFamilyStatistic {
  key: string;
  boundary: string;
  occurrences: number;
  parameter_count: number;
  original_bytes: number;
  encoded_bytes: number;
  saved_bytes: number;
}

export interface CompactSharedStructureStatistics {
  slot_count: number;
  composite_slot_count: number;
  candidate_family_count: number;
  emitted_family_count: number;
  exact_family_count: number;
  parameterized_family_count: number;
  reference_count: number;
  argument_count: number;
  original_payload_bytes: number;
  encoded_payload_bytes: number;
  catalog_bytes: number;
  saved_bytes: number;
  remaining_beneficial_candidates: number;
  families: CompactSharedStructureFamilyStatistic[];
}

export interface CompactSharedStructureEncoding {
  slots: CompactSharedStructureSlot[];
  catalog: CompactSharedStructureTemplate[];
  statistics: CompactSharedStructureStatistics;
}

export interface CompactSharedStructureCandidateOccurrence {
  slot_index: number;
  value: unknown;
  leaves: unknown[];
  original_bytes: number;
}

export interface CompactSharedStructureCandidateFamily {
  boundary: string;
  occurrences: CompactSharedStructureCandidateOccurrence[];
  parameter_positions: number[];
  template: unknown;
  row: CompactSharedStructureTemplate;
  references: unknown[];
  statistic: CompactSharedStructureFamilyStatistic;
}
