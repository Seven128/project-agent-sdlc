import {
  CssVarsEmitterHandler,
  DtcgEmitterHandler,
  lint as lintWithDesignMd,
  serializeCssVars,
  serializeTailwindV4,
  TailwindEmitterHandler,
  TailwindV4EmitterHandler,
  type LintReport,
} from "@google/design.md/linter";
import { stableJson } from "./stable-json.js";
import {
  componentProperties,
  diffDesignMdRecords,
  loadDesignMdToolIdentity,
  normalizeDesignMdFinding,
  snapshotDesignSystem,
} from "./design-md-tool-normalization.js";
import {
  DESIGN_MD_TOOL_ADAPTER_SCHEMA_VERSION,
  type DesignMdDiffResult,
  type DesignMdExportFormat,
  type DesignMdExportOptions,
  type DesignMdExportResult,
  type DesignMdToolIdentity,
  type DesignMdValidationMode,
  type DesignMdValidationResult,
} from "./design-md-tool-types.js";

const TOOL_IDENTITY = loadDesignMdToolIdentity();

type Evaluation =
  | { report: LintReport; result: DesignMdValidationResult }
  | { report: null; result: DesignMdValidationResult };

export class DesignMdToolAdapter {
  identity(): DesignMdToolIdentity {
    return { ...TOOL_IDENTITY };
  }

  parseValidate(content: string): DesignMdValidationResult {
    return evaluate(content, "parse-validate").result;
  }

  lint(content: string): DesignMdValidationResult {
    return evaluate(content, "lint").result;
  }

  exportTokens(
    content: string,
    format: DesignMdExportFormat,
    options: DesignMdExportOptions = {},
  ): DesignMdExportResult {
    const evaluation = evaluate(content, "lint");
    if (!evaluation.report) {
      return {
        success: false,
        format,
        error:
          evaluation.result.findings[0]?.message ?? "DESIGN.md parse failed",
        options: { ...options },
        validation: evaluation.result,
      };
    }
    if (options.css_variable_prefix !== undefined && format !== "css-vars")
      return exportFailure(
        format,
        "css_variable_prefix is supported only for css-vars export",
        options,
        evaluation.result,
      );

    const state = evaluation.report.designSystem;
    if (format === "css-vars") {
      const emitted = new CssVarsEmitterHandler().execute(state);
      if (!emitted.success)
        return exportFailure(
          format,
          emitted.error.message,
          options,
          evaluation.result,
        );
      return {
        success: true,
        format,
        media_type: "text/css",
        content: withFinalNewline(
          serializeCssVars(emitted.data.declarations, {
            prefix: options.css_variable_prefix,
          }),
        ),
        options: { ...options },
        validation: evaluation.result,
      };
    }
    if (format === "css-tailwind") {
      const emitted = new TailwindV4EmitterHandler().execute(state);
      if (!emitted.success)
        return exportFailure(
          format,
          emitted.error.message,
          options,
          evaluation.result,
        );
      return {
        success: true,
        format,
        media_type: "text/css",
        content: withFinalNewline(serializeTailwindV4(emitted.data.theme)),
        options: { ...options },
        validation: evaluation.result,
      };
    }

    const emitted =
      format === "dtcg"
        ? new DtcgEmitterHandler().execute(state)
        : new TailwindEmitterHandler().execute(state);
    if (!emitted.success)
      return exportFailure(
        format,
        emitted.error.message,
        options,
        evaluation.result,
      );
    return {
      success: true,
      format,
      media_type: "application/json",
      content: `${stableJson(emitted.data)}\n`,
      options: { ...options },
      validation: evaluation.result,
    };
  }

  diff(before: string, after: string): DesignMdDiffResult {
    const beforeEvaluation = evaluate(before, "lint");
    const afterEvaluation = evaluate(after, "lint");
    if (!beforeEvaluation.report || !afterEvaluation.report) {
      return {
        success: false,
        tool: this.identity(),
        error: "both DESIGN.md inputs must parse before they can be diffed",
        before_validation: beforeEvaluation.result,
        after_validation: afterEvaluation.result,
      };
    }

    const beforeSnapshot = snapshotDesignSystem(
      beforeEvaluation.report.designSystem,
    );
    const afterSnapshot = snapshotDesignSystem(
      afterEvaluation.report.designSystem,
    );
    const beforeSummary = beforeEvaluation.result.summary;
    const afterSummary = afterEvaluation.result.summary;
    return {
      success: true,
      tool: this.identity(),
      tokens: {
        colors: diffDesignMdRecords(
          beforeSnapshot.colors,
          afterSnapshot.colors,
        ),
        typography: diffDesignMdRecords(
          beforeSnapshot.typography,
          afterSnapshot.typography,
        ),
        rounded: diffDesignMdRecords(
          beforeSnapshot.rounded,
          afterSnapshot.rounded,
        ),
        spacing: diffDesignMdRecords(
          beforeSnapshot.spacing,
          afterSnapshot.spacing,
        ),
        components: diffDesignMdRecords(
          componentProperties(beforeSnapshot.components),
          componentProperties(afterSnapshot.components),
        ),
      },
      findings: {
        before: beforeSummary,
        after: afterSummary,
        delta: {
          errors: afterSummary.errors - beforeSummary.errors,
          warnings: afterSummary.warnings - beforeSummary.warnings,
        },
      },
      regression:
        afterSummary.errors > beforeSummary.errors ||
        afterSummary.warnings > beforeSummary.warnings,
      before_validation: beforeEvaluation.result,
      after_validation: afterEvaluation.result,
    };
  }
}

export const designMdToolAdapter = new DesignMdToolAdapter();

function evaluate(content: string, mode: DesignMdValidationMode): Evaluation {
  try {
    const report = lintWithDesignMd(
      content,
      mode === "parse-validate" ? { rules: [] } : undefined,
    );
    const findings = report.findings.map(normalizeDesignMdFinding);
    return {
      report,
      result: {
        schema_version: DESIGN_MD_TOOL_ADAPTER_SCHEMA_VERSION,
        mode,
        tool: { ...TOOL_IDENTITY },
        valid: report.summary.errors === 0,
        findings,
        summary: { ...report.summary },
        design_system: snapshotDesignSystem(report.designSystem),
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      report: null,
      result: {
        schema_version: DESIGN_MD_TOOL_ADAPTER_SCHEMA_VERSION,
        mode,
        tool: { ...TOOL_IDENTITY },
        valid: false,
        findings: [{ severity: "error", message }],
        summary: { errors: 1, warnings: 0, infos: 0 },
        design_system: null,
      },
    };
  }
}

function exportFailure(
  format: DesignMdExportFormat,
  error: string,
  options: DesignMdExportOptions,
  validation: DesignMdValidationResult,
): DesignMdExportResult {
  return { success: false, format, error, options: { ...options }, validation };
}

function withFinalNewline(value: string): string {
  return `${value.replace(/(?:\r\n?|\n)+$/u, "")}\n`;
}
