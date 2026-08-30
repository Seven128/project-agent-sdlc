import { analysisError } from "./test_title_registration_resolution.mjs";
import { resolveScopeBinding } from "./test_title_scope_model.mjs";

export function rejectUnsupportedLocalReexports(model, file) {
  for (const node of model.nodes) {
    if (node.type !== "ExportNamedDeclaration" || node.source) continue;
    for (const specifier of node.specifiers) {
      if (specifier.type !== "ExportSpecifier") continue;
      const local = specifier.local;
      const name =
        local?.type === "Identifier"
          ? local.name
          : local?.type === "Literal" && typeof local.value === "string"
            ? local.value
            : null;
      const binding =
        name === null
          ? null
          : resolveScopeBinding(model.scopeByNode.get(local), name);
      if (binding?.nodeTestRole)
        throw analysisError(
          "critical_test_title_inventory_unsupported_node_test_export",
          file,
          specifier,
        );
    }
  }
}
