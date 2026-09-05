export const CONTEXT_DOCTOR_DEFAULTS = Object.freeze({
  context_file_soft_budget_bytes: 64 * 1024,
});
export interface ContextDoctorOptions {
  context_file_soft_budget_bytes?: number;
}
