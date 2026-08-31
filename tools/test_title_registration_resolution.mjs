import {
  memberProperty,
  resolveNodeTestExpression,
} from "./test_title_expression_roles.mjs";
import { resolveScopeBinding } from "./test_title_scope_model.mjs";
import { isConstructorCapabilityRole } from "./test_title_roles.mjs";

export { memberProperty, resolveNodeTestExpression };

export function resolveRegistrationRoles(model, file) {
  let changed = true;
  while (changed) {
    changed = resolveImmutableAliases(model);
    for (const node of model.nodes) {
      if (node.type !== "CallExpression") continue;
      const callable = resolveNodeTestExpression(
        node.callee,
        model.scopeByNode.get(node),
        model,
      );
      if (callable?.registration !== "test") continue;
      const callback = inlineRegistrationCallback(node);
      if (!callback || callback.params.length === 0) continue;
      const parameter = singleIdentifierPattern(callback.params[0]);
      if (!parameter)
        throw analysisError(
          "critical_test_title_inventory_unsupported_test_context_binding",
          file,
          callback.params[0],
        );
      const binding = resolveScopeBinding(
        model.scopeByNode.get(parameter),
        parameter.name,
      );
      if (!binding || binding.nodeTestRole?.type === "context") continue;
      if (binding.nodeTestRole)
        throw analysisError(
          "critical_test_title_inventory_unsupported_test_context_binding",
          file,
          parameter,
        );
      binding.nodeTestRole = { type: "context" };
      changed = true;
    }
  }
}

export function assertClosedRegistrationCallback(node, file) {
  const callback = inlineRegistrationCallback(node);
  const validShape =
    (node.arguments.length === 2 && callback === node.arguments[1]) ||
    (node.arguments.length === 3 &&
      node.arguments[1]?.type === "ObjectExpression" &&
      callback === node.arguments[2]);
  if (validShape && callback?.type === "ArrowFunctionExpression") return;
  throw analysisError(
    "critical_test_title_inventory_unsupported_registration_callback",
    file,
    node.arguments.at(-1) ?? node,
  );
}

export function markResolvedReferences(node, model, allowed) {
  markRoleExpression(node, model, allowed, new WeakSet());
}

export function isNodeTestModuleLoaderRole(role) {
  return (
    role?.type === "create-require" ||
    role?.type === "require" ||
    role?.type === "get-builtin-module"
  );
}

export function isUnsupportedNodeTestRole(role) {
  return (
    role?.type === "unsupported-module-loader" ||
    role?.type === "unsupported-reflection" ||
    role?.type === "unsupported-constructor-capability"
  );
}

export function isNonTransferableNodeTestRole(role) {
  return isConstructorCapabilityRole(role);
}

export function analysisError(code, file, node) {
  const line = node.loc?.start.line ?? 0;
  const column = (node.loc?.start.column ?? -1) + 1;
  return new Error(`${code}:${file}:${line}:${column}`);
}

function resolveImmutableAliases(model) {
  let changedAny = false;
  let changed = true;
  while (changed) {
    changed = false;
    for (const binding of model.bindings) {
      if (binding.nodeTestRole || !binding.aliasInitializer) continue;
      const role = resolveNodeTestExpression(
        binding.aliasInitializer,
        model.scopeByNode.get(binding.aliasInitializer) ?? binding.scope,
        model,
      );
      if (!role) continue;
      binding.nodeTestRole = role;
      changed = true;
      changedAny = true;
    }
  }
  return changedAny;
}

function markRoleExpression(node, model, allowed, visited) {
  if (!node || typeof node !== "object" || visited.has(node)) return;
  visited.add(node);
  const scope = model.scopeByNode.get(node);
  const role = resolveNodeTestExpression(node, scope, model);
  if (role) allowed.add(node);
  if (node.type === "Identifier") {
    const binding = resolveScopeBinding(scope, node.name);
    if (binding?.nodeTestRole) allowed.add(node);
    return;
  }
  if (node.type === "ChainExpression" || node.type === "AwaitExpression") {
    markRoleExpression(
      node.expression ?? node.argument,
      model,
      allowed,
      visited,
    );
    return;
  }
  if (node.type === "MemberExpression") {
    markRoleExpression(node.object, model, allowed, visited);
    return;
  }
  if (node.type !== "CallExpression" && node.type !== "NewExpression") return;
  const calleeRole = resolveNodeTestExpression(node.callee, scope, model);
  markRoleExpression(node.callee, model, allowed, visited);
  if (calleeRole?.type === "reflect-get")
    markRoleExpression(node.arguments[0], model, allowed, visited);
}

function inlineRegistrationCallback(node) {
  const callback =
    node.arguments.length === 2
      ? node.arguments[1]
      : node.arguments.length === 3 &&
          node.arguments[1]?.type === "ObjectExpression"
        ? node.arguments[2]
        : null;
  return callback?.type === "FunctionExpression" ||
    callback?.type === "ArrowFunctionExpression"
    ? callback
    : null;
}

function singleIdentifierPattern(pattern) {
  if (pattern?.type === "Identifier") return pattern;
  return pattern?.type === "AssignmentPattern" &&
    pattern.left?.type === "Identifier"
    ? pattern.left
    : null;
}
