import { assertSupportedSchema } from "../schema-guard.js";
import { withMaintenanceLock } from "../maintenance-lock.js";

export async function withContextMutationInterlock<T>(
  repository: string,
  action: () => Promise<T>,
): Promise<T> {
  await assertSupportedSchema(repository, "context mutation/recovery");
  return withMaintenanceLock(repository, "context_mutation", async () => {
    await assertSupportedSchema(repository, "context mutation/recovery");
    return action();
  });
}
