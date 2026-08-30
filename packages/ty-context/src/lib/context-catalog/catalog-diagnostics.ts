import type {
  CatalogDiagnostic,
  CatalogDiagnosticSeverity,
} from "./catalog-types.js";
import { compareUtf8Paths, normalizeContextPath } from "./catalog-paths.js";

const DIAGNOSTIC_SEVERITY_ORDER: Record<CatalogDiagnosticSeverity, number> = {
  error: 0,
  warning: 1,
};

export function catalogDiagnostic(
  code: string,
  severity: CatalogDiagnosticSeverity,
  message: string,
  location: { path?: string; line?: number } = {},
): CatalogDiagnostic {
  return { code, severity, message, ...location };
}

export function catalogErrors(diagnostics: CatalogDiagnostic[]): string[] {
  return sortCatalogDiagnostics(diagnostics)
    .filter((entry) => entry.severity === "error")
    .map((entry) => entry.message);
}

export function catalogWarnings(diagnostics: CatalogDiagnostic[]): string[] {
  return sortCatalogDiagnostics(diagnostics)
    .filter((entry) => entry.severity === "warning")
    .map((entry) => entry.message);
}

export function compareCatalogDiagnostics(
  left: CatalogDiagnostic,
  right: CatalogDiagnostic,
): number {
  return (
    DIAGNOSTIC_SEVERITY_ORDER[left.severity] -
      DIAGNOSTIC_SEVERITY_ORDER[right.severity] ||
    compareUtf8Paths(diagnosticPath(left), diagnosticPath(right)) ||
    (left.line ?? 0) - (right.line ?? 0) ||
    compareUtf8Paths(left.code, right.code) ||
    compareUtf8Paths(left.message, right.message)
  );
}

export function sortCatalogDiagnostics(
  diagnostics: readonly CatalogDiagnostic[],
): CatalogDiagnostic[] {
  return [...diagnostics].sort(compareCatalogDiagnostics);
}

function diagnosticPath(diagnostic: CatalogDiagnostic): string {
  // Diagnostics without a path sort first. Path comparison is slash-normalized
  // and byte-defined; it never depends on the process locale or ICU build.
  return diagnostic.path ? normalizeContextPath(diagnostic.path) : "";
}
