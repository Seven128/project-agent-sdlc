export const NODE_TEST_FUNCTION_EXPORTS = new Set(["it", "test"]);
export const NODE_TEST_SUITE_EXPORTS = new Set(["describe", "suite"]);

export function importedNodeTestRole(source, specifier, imported) {
  if (source === "node:vm" || source === "vm")
    return specifier.type === "ImportNamespaceSpecifier" ||
      specifier.type === "ImportDefaultSpecifier" ||
      imported === "default"
      ? { type: "dynamic-code-namespace" }
      : { type: "dynamic-code" };
  if (source === "node:module" || source === "module") {
    if (
      specifier.type === "ImportSpecifier" &&
      (imported === "register" || imported === "registerHooks")
    )
      return { type: "unsupported-module-loader" };
    if (specifier.type === "ImportSpecifier" && imported === "createRequire")
      return { type: "create-require" };
    if (specifier.type === "ImportSpecifier" && imported === "Module")
      return { type: "module-class" };
    if (
      specifier.type === "ImportNamespaceSpecifier" ||
      specifier.type === "ImportDefaultSpecifier" ||
      imported === "default"
    )
      return { type: "module-namespace" };
    return null;
  }
  if (source !== "node:test") return null;
  if (specifier.type === "ImportNamespaceSpecifier")
    return { type: "namespace" };
  if (specifier.type === "ImportDefaultSpecifier" || imported === "default")
    return { type: "callable", registration: "test" };
  if (specifier.type === "ImportSpecifier") {
    if (NODE_TEST_FUNCTION_EXPORTS.has(imported))
      return { type: "callable", registration: "test" };
    if (NODE_TEST_SUITE_EXPORTS.has(imported))
      return { type: "callable", registration: "suite" };
  }
  return null;
}
