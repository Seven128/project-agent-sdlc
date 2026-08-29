import type {
  CatalogDiagnostic,
  CatalogDiagnosticSeverity,
} from "./catalog-types.js";

export function catalogDiagnostic(
  code: string,
  severity: CatalogDiagnosticSeverity,
  message: string,
  location: { path?: string; line?: number } = {},
): CatalogDiagnostic {
  return { code, severity, message, ...location };
}

export function catalogErrors(diagnostics: CatalogDiagnostic[]): string[] {
  return diagnostics
    .filter((entry) => entry.severity === "error")
    .map((entry) => entry.message);
}

export function catalogWarnings(diagnostics: CatalogDiagnostic[]): string[] {
  return diagnostics
    .filter((entry) => entry.severity === "warning")
    .map((entry) => entry.message);
}
