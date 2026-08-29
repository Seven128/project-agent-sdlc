export const CONTEXT_DOCTOR_DEFAULTS = Object.freeze({
  context_file_soft_budget_bytes: 64 * 1024,
  long_line_code_points: 1_000,
  trigger_fanout_contexts: 4,
});

export interface ContextDoctorOptions {
  context_file_soft_budget_bytes?: number;
  long_line_code_points?: number;
  trigger_fanout_contexts?: number;
}

export interface ContextDoctorAnalysis {
  info: string[];
  warnings: string[];
  errors: string[];
}

export function resolveContextDoctorOptions(
  options: ContextDoctorOptions = {},
): Required<ContextDoctorOptions> {
  return {
    context_file_soft_budget_bytes:
      options.context_file_soft_budget_bytes ??
      CONTEXT_DOCTOR_DEFAULTS.context_file_soft_budget_bytes,
    long_line_code_points:
      options.long_line_code_points ??
      CONTEXT_DOCTOR_DEFAULTS.long_line_code_points,
    trigger_fanout_contexts:
      options.trigger_fanout_contexts ??
      CONTEXT_DOCTOR_DEFAULTS.trigger_fanout_contexts,
  };
}
