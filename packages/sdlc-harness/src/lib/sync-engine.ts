export interface SyncReport {
  changed: string[];
  skipped: string[];
  blocked: string[];
}

export function emptySyncReport(): SyncReport {
  return {
    changed: [],
    skipped: [],
    blocked: []
  };
}
