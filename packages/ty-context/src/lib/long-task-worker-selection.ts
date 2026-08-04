export const LONG_TASK_IMPLEMENTATION_AGENT = "long_task_implementation";

export function selectedAgentType(toolInput: unknown): string | null {
  if (!toolInput || typeof toolInput !== "object" || Array.isArray(toolInput))
    return null;
  const value = (toolInput as Record<string, unknown>).agent_type;
  return typeof value === "string" && value.length > 0 ? value : null;
}
