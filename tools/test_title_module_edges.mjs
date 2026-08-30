import { resolveScopeBinding } from "./test_title_scope_model.mjs";
import { analysisError } from "./test_title_registration_resolution.mjs";

const NODE_MODULE_ROLE_EXPORTS = new Set([
  "Module",
  "createRequire",
  "default",
  "register",
  "registerHooks",
]);

export function collectNodeTestModuleSpecifier({
  node,
  file,
  localModuleEdges,
  model,
  prepass = false,
  resolveNodeTestExpression,
}) {
  if (
    (node.type === "ImportDeclaration" ||
      node.type === "ExportAllDeclaration" ||
      node.type === "ExportNamedDeclaration") &&
    typeof node.source?.value === "string"
  ) {
    if (isUnsupportedNodeModuleReexport(node))
      throw analysisError(
        "critical_test_title_inventory_unsupported_module_loader_reexport",
        file,
        node,
      );
    if (node.source.value === "node:test" && node.type !== "ImportDeclaration")
      throw analysisError(
        "critical_test_title_inventory_unsupported_node_test_reexport",
        file,
        node,
      );
    if (isLocalModuleSpecifier(node.source.value))
      localModuleEdges.push({
        dynamic: false,
        specifier: node.source.value,
        resolution: "esm",
      });
    return;
  }

  if (node.type === "ImportExpression") {
    const specifier = resolveStaticString(
      node.source,
      model.scopeByNode.get(node),
      model,
    );
    if (specifier === "node:test")
      throw analysisError(
        "critical_test_title_inventory_unsupported_node_test_import",
        file,
        node,
      );
    if (specifier === null || !isLocalModuleSpecifier(specifier))
      throw analysisError(
        "critical_test_title_inventory_unsupported_dynamic_import",
        file,
        node,
      );
    model.staticModuleExpressions.add(node);
    localModuleEdges.push({
      dynamic: true,
      specifier,
      resolution: "esm",
      line: node.loc?.start.line ?? 0,
      column: (node.loc?.start.column ?? -1) + 1,
    });
    return;
  }

  if (node.type !== "CallExpression") return;
  const scope = model.scopeByNode.get(node);
  const loader = resolveNodeTestExpression(node.callee, scope, model);
  if (loader?.type !== "require" && loader?.type !== "get-builtin-module")
    return;
  const specifier = resolveStaticString(node.arguments[0], scope, model);
  if (specifier === null)
    throw analysisError(
      "critical_test_title_inventory_dynamic_module_specifier",
      file,
      node,
    );
  if (specifier === "node:test")
    throw analysisError(
      "critical_test_title_inventory_unsupported_node_test_import",
      file,
      node,
    );
  if (loader.type === "require" && isLocalModuleSpecifier(specifier))
    localModuleEdges.push({
      dynamic: false,
      specifier,
      resolution: "commonjs",
    });
}

function isUnsupportedNodeModuleReexport(node) {
  if (
    node.type === "ImportDeclaration" ||
    (node.source?.value !== "node:module" && node.source?.value !== "module")
  )
    return false;
  if (node.type === "ExportAllDeclaration") return true;
  return node.specifiers.some((specifier) => {
    if (specifier.type === "ExportNamespaceSpecifier") return true;
    const local = specifier.local;
    const name =
      local?.type === "Identifier"
        ? local.name
        : local?.type === "Literal" && typeof local.value === "string"
          ? local.value
          : null;
    return name !== null && NODE_MODULE_ROLE_EXPORTS.has(name);
  });
}

export function resolveStaticString(node, scope, model, seen = new Set()) {
  if (node?.type === "Literal" && typeof node.value === "string")
    return node.value;
  if (node?.type === "TemplateLiteral")
    return resolveStaticTemplate(node, scope, model, seen);
  if (node?.type === "BinaryExpression" && node.operator === "+")
    return resolveStaticConcatenation(node, scope, model, seen);
  if (node?.type === "Identifier")
    return resolveStaticIdentifier(node, scope, model, seen);
  return resolveStaticJoin(node, scope, model, seen);
}

function resolveStaticTemplate(node, scope, model, seen) {
  let result = "";
  for (let index = 0; index < node.quasis.length; index += 1) {
    result +=
      node.quasis[index]?.value.cooked ?? node.quasis[index]?.value.raw ?? "";
    if (index >= node.expressions.length) continue;
    const value = resolveStaticString(
      node.expressions[index],
      scope,
      model,
      seen,
    );
    if (value === null) return null;
    result += value;
  }
  return result;
}

function resolveStaticConcatenation(node, scope, model, seen) {
  const left = resolveStaticString(node.left, scope, model, seen);
  const right = resolveStaticString(node.right, scope, model, seen);
  return left === null || right === null ? null : `${left}${right}`;
}

function resolveStaticIdentifier(node, scope, model, seen) {
  const binding = resolveScopeBinding(scope, node.name);
  if (
    !binding?.aliasInitializer ||
    binding.kind !== "const" ||
    seen.has(binding)
  )
    return null;
  const nextSeen = new Set(seen).add(binding);
  return resolveStaticString(
    binding.aliasInitializer,
    model.scopeByNode.get(binding.aliasInitializer) ?? binding.scope,
    model,
    nextSeen,
  );
}

function resolveStaticJoin(node, scope, model, seen) {
  if (
    node?.type !== "CallExpression" ||
    node.callee?.type !== "MemberExpression" ||
    memberProperty(node.callee) !== "join" ||
    node.callee.object?.type !== "ArrayExpression" ||
    node.arguments.length > 1
  )
    return null;
  const separator =
    node.arguments.length === 0
      ? ","
      : resolveStaticString(node.arguments[0], scope, model, seen);
  if (separator === null) return null;
  const values = [];
  for (const element of node.callee.object.elements) {
    if (!element || element.type === "SpreadElement") return null;
    const value = resolveStaticString(element, scope, model, seen);
    if (value === null) return null;
    values.push(value);
  }
  return values.join(separator);
}

function memberProperty(node) {
  if (!node.computed)
    return node.property?.type === "Identifier" ? node.property.name : null;
  return node.property?.type === "Literal" &&
    typeof node.property.value === "string"
    ? node.property.value
    : null;
}

function isLocalModuleSpecifier(specifier) {
  return (
    specifier.startsWith("./") ||
    specifier.startsWith("../") ||
    specifier.startsWith("file:")
  );
}
