export const NODE_TEST_FUNCTION_EXPORTS = new Set(["it", "test"]);
export const NODE_TEST_SUITE_EXPORTS = new Set(["describe", "suite"]);
export const CONSTRUCTOR_INSPECTION_PROPERTIES = new Set(["length", "name"]);

const CONSTRUCTOR_ORIGINS = new Set([
  "commonjs-module",
  "module-class",
  "dynamic-code",
  "function",
  "unknown-role-bearing-value",
]);

export function constructorAccessRole(origin) {
  if (!CONSTRUCTOR_ORIGINS.has(origin))
    throw new Error(`invalid_constructor_access_origin:${origin}`);
  return { type: "constructor-access", origin };
}

export function constructorOriginFromRole(role) {
  if (!role) return null;
  if (role.type === "constructor-access") return "dynamic-code";
  if (role.type === "constructor-identity-method") return role.origin;
  if (role.type === "commonjs-module") return "commonjs-module";
  if (role.type === "module-class" || role.type === "module-namespace")
    return "module-class";
  if (role.type === "dynamic-code") return "dynamic-code";
  if (role.type === "callable") return "function";
  return "unknown-role-bearing-value";
}

export function isConstructorCapabilityRole(role) {
  return (
    role?.type === "constructor-access" ||
    role?.type === "constructor-identity-method" ||
    role?.type === "unsupported-constructor-capability"
  );
}

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
