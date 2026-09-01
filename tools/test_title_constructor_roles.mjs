import {
  CONSTRUCTOR_INSPECTION_PROPERTIES,
  constructorAccessRole,
  constructorOriginFromRole,
} from "./test_title_roles.mjs";
import { resolveScopeBinding } from "./test_title_scope_model.mjs";

export function resolveConstructorPropertyRole(owner, property) {
  if (CONSTRUCTOR_INSPECTION_PROPERTIES.has(property)) return null;
  if (["apply", "bind", "call", "constructor"].includes(property))
    return { type: "dynamic-code" };
  if (
    (owner.origin === "commonjs-module" || owner.origin === "module-class") &&
    ["_compile", "_extensions", "_load", "runMain"].includes(property)
  )
    return { type: "unsupported-module-loader" };
  return { type: "unsupported-constructor-capability", origin: owner.origin };
}

export function resolveConstructorAccessRole(
  expression,
  ownerRole,
  scope,
  model,
) {
  const expressionOrigin = constructorOriginFromExpression(
    expression,
    scope,
    model,
  );
  if (expressionOrigin === "ordinary-data") return null;
  return constructorAccessRole(
    constructorOriginFromRole(ownerRole) ??
      expressionOrigin ??
      "unknown-role-bearing-value",
  );
}

function constructorOriginFromExpression(node, scope, model, seen = new Set()) {
  if (!node) return null;
  if (node.type === "ChainExpression" || node.type === "AwaitExpression")
    return constructorOriginFromExpression(
      node.expression ?? node.argument,
      scope,
      model,
      seen,
    );
  if (
    node.type === "ArrowFunctionExpression" ||
    node.type === "FunctionExpression" ||
    node.type === "ClassExpression"
  )
    return "function";
  if (node.type === "ObjectExpression" && hasInertOwnConstructor(node))
    return "ordinary-data";
  if (node.type !== "Identifier") return null;
  const binding = resolveScopeBinding(scope, node.name);
  if (!binding?.aliasInitializer || seen.has(binding)) return null;
  return constructorOriginFromExpression(
    binding.aliasInitializer,
    model.scopeByNode.get(binding.aliasInitializer) ?? binding.scope,
    model,
    new Set(seen).add(binding),
  );
}

function hasInertOwnConstructor(node) {
  return node.properties.some((property) => {
    if (
      property.type !== "Property" ||
      property.kind !== "init" ||
      property.method ||
      property.computed
    )
      return false;
    const name =
      property.key?.type === "Identifier"
        ? property.key.name
        : property.key?.type === "Literal"
          ? property.key.value
          : null;
    return name === "constructor" && isInertConstructorValue(property.value);
  });
}

function isInertConstructorValue(node) {
  return (
    node?.type === "ObjectExpression" ||
    node?.type === "ArrayExpression" ||
    node?.type === "Literal"
  );
}
