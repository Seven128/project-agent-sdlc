export interface ManagedBlockMarkers {
  start: string;
  end: string;
}

export const MANAGED_BLOCK_START = "<!-- pjsdlc:sdlc-harness:begin -->";
export const MANAGED_BLOCK_END = "<!-- pjsdlc:sdlc-harness:end -->";
export const LEGACY_MANAGED_BLOCK_START = "<!-- sdlc-harness:begin -->";
export const LEGACY_MANAGED_BLOCK_END = "<!-- sdlc-harness:end -->";
export const MAKEFILE_BLOCK_START = "# pjsdlc:sdlc-harness:make:begin";
export const MAKEFILE_BLOCK_END = "# pjsdlc:sdlc-harness:make:end";
export const LEGACY_MAKEFILE_BLOCK_START = "# sdlc-harness:make:begin";
export const LEGACY_MAKEFILE_BLOCK_END = "# sdlc-harness:make:end";
export const MANAGED_METADATA_START = "<!-- pjsdlc:sdlc-harness-managed";
export const LEGACY_MANAGED_METADATA_START = "<!-- sdlc-harness-managed";
export const MANAGED_METADATA_END = "-->";

export const AGENTS_BLOCK_MARKERS: ManagedBlockMarkers[] = [
  { start: MANAGED_BLOCK_START, end: MANAGED_BLOCK_END },
  { start: LEGACY_MANAGED_BLOCK_START, end: LEGACY_MANAGED_BLOCK_END }
];

export const MAKEFILE_BLOCK_MARKERS: ManagedBlockMarkers[] = [
  { start: MAKEFILE_BLOCK_START, end: MAKEFILE_BLOCK_END },
  { start: LEGACY_MAKEFILE_BLOCK_START, end: LEGACY_MAKEFILE_BLOCK_END }
];
