import {
  NODE_TEST_FUNCTION_EXPORTS,
  NODE_TEST_SUITE_EXPORTS,
} from "./test_title_roles.mjs";
import { resolveScopeBinding } from "./test_title_scope_model.mjs";

const TEST_MODIFIERS = new Set(["only", "skip", "todo"]);
const REFLECTABLE_OWNER_TYPES = new Set([
  "global-object",
  "namespace",
  "dynamic-namespace",
  "context",
  "callable",
  "reflect",
  "commonjs-module",
  "module-namespace",
  "constructor-access",
]);

export function resolveNodeTestExpression(node, scope, model) {
  if (!node) return null;
  switch (node.type) {
    case "ChainExpression":
      return resolveNodeTestExpression(node.expression, scope, model);
    case "AwaitExpression":
      return resolveNodeTestExpression(node.argument, scope, model);
    case "ImportExpression":
      return model.staticModuleExpressions.has(node)
        ? null
        : { type: "dynamic-namespace" };
    case "NewExpression":
      return resolveNewExpressionRole(node, scope, model);
    case "Identifier":
      return resolveIdentifierRole(node, scope);
    case "CallExpression":
      return resolveCallExpressionRole(node, scope, model);
    case "MemberExpression":
      return resolveMemberExpressionRole(node, scope, model);
    default:
      return null;
  }
}

function resolveNewExpressionRole(node, scope, model) {
  const callee = resolveNodeTestExpression(node.callee, scope, model);
  if (callee?.type === "constructor-access") return { type: "dynamic-code" };
  if (callee?.type === "module-class" || callee?.type === "module-namespace")
    return { type: "commonjs-module" };
  return callee?.type === "dynamic-code" ? callee : null;
}

function resolveIdentifierRole(node, scope) {
  const binding = resolveScopeBinding(scope, node.name);
  if (binding) return binding.nodeTestRole ?? null;
  if (node.name === "globalThis" || node.name === "global")
    return { type: "global-object" };
  if (node.name === "require") return { type: "require" };
  if (node.name === "module") return { type: "commonjs-module" };
  if (node.name === "process") return { type: "process" };
  if (node.name === "Reflect") return { type: "reflect" };
  if (node.name === "eval" || node.name === "Function")
    return { type: "dynamic-code" };
  return null;
}

function resolveCallExpressionRole(node, scope, model) {
  const callee = resolveNodeTestExpression(node.callee, scope, model);
  if (callee?.type === "constructor-identity-method")
    return { type: "constructor-access" };
  if (callee?.type === "constructor-access") return { type: "dynamic-code" };
  if (callee?.type === "reflect-get")
    return resolveReflectGetCall(node, scope, model);
  if (callee?.type === "create-require") return { type: "require" };
  if (callee?.type !== "require" && callee?.type !== "get-builtin-module")
    return null;
  return resolveLoadedModuleRole(staticStringLiteral(node.arguments[0]));
}

function resolveReflectGetCall(node, scope, model) {
  const owner = resolveNodeTestExpression(node.arguments[0], scope, model);
  const property = staticStringLiteral(node.arguments[1]);
  if (property === "constructor") return { type: "constructor-access" };
  if (owner?.type === "process") return { type: "unsupported-module-loader" };
  if (
    owner?.type === "global-object" &&
    (property === "eval" || property === "Function")
  )
    return { type: "dynamic-code" };
  if (!owner || !REFLECTABLE_OWNER_TYPES.has(owner.type)) return null;
  if (property === null) return { type: "unsupported-reflection" };
  return resolvePropertyRole(owner, property);
}

function resolveLoadedModuleRole(specifier) {
  if (specifier === "node:test") return { type: "namespace" };
  if (specifier === "node:vm" || specifier === "vm")
    return { type: "dynamic-code-namespace" };
  if (specifier === "node:module" || specifier === "module")
    return { type: "module-namespace" };
  return null;
}

function resolveMemberExpressionRole(node, scope, model) {
  const property = memberProperty(node);
  if (property === "constructor") return { type: "constructor-access" };
  const unboundRole = resolveUnboundGlobalMemberRole(node, scope);
  if (unboundRole) return unboundRole;
  const owner = resolveNodeTestExpression(node.object, scope, model);
  if (!owner || property === null) return null;
  return resolvePropertyRole(owner, property);
}

function resolveUnboundGlobalMemberRole(node, scope) {
  if (isUnboundGlobalProcessMember(node, scope)) return { type: "process" };
  if (isUnboundGlobalReflectMember(node, scope)) return { type: "reflect" };
  if (isUnboundGlobalDynamicCodeMember(node, scope))
    return { type: "dynamic-code" };
  if (isUnboundReflectGetMember(node, scope)) return { type: "reflect-get" };
  if (isUnboundProcessGetBuiltinModule(node, scope))
    return { type: "get-builtin-module" };
  return null;
}

function resolvePropertyRole(owner, property) {
  if (owner.type === "dynamic-code-namespace") return { type: "dynamic-code" };
  if (owner.type === "constructor-access" && property === "valueOf")
    return { type: "constructor-identity-method" };
  if (
    owner.type === "constructor-access" &&
    ["apply", "bind", "call"].includes(property)
  )
    return { type: "dynamic-code" };
  const globalRole = resolveGlobalPropertyRole(owner, property);
  if (globalRole) return globalRole;
  const moduleRole = resolveModulePropertyRole(owner, property);
  if (moduleRole) return moduleRole;
  if (owner.type === "reflect" && property === "get")
    return { type: "reflect-get" };
  if (owner.type === "namespace" && NODE_TEST_FUNCTION_EXPORTS.has(property))
    return { type: "callable", registration: "test" };
  if (owner.type === "namespace" && NODE_TEST_SUITE_EXPORTS.has(property))
    return { type: "callable", registration: "suite" };
  if (owner.type === "dynamic-namespace")
    return resolveDynamicNamespacePropertyRole(property);
  if (owner.type === "context" && property === "test")
    return { type: "callable", registration: "test" };
  if (owner.type === "callable" && TEST_MODIFIERS.has(property)) return owner;
  return null;
}

function resolveGlobalPropertyRole(owner, property) {
  if (owner.type !== "global-object") return null;
  if (property === "process") return { type: "process" };
  if (property === "Reflect") return { type: "reflect" };
  if (property === "eval" || property === "Function")
    return { type: "dynamic-code" };
  return property === "globalThis" || property === "global" ? owner : null;
}

function resolveModulePropertyRole(owner, property) {
  if (
    (owner.type === "module-namespace" || owner.type === "module-class") &&
    (property === "register" || property === "registerHooks")
  )
    return { type: "unsupported-module-loader" };
  if (owner.type === "module-namespace" && property === "createRequire")
    return { type: "create-require" };
  if (owner.type === "module-namespace" && property === "Module")
    return { type: "module-class" };
  if (
    (owner.type === "module-namespace" || owner.type === "module-class") &&
    ["_load", "_extensions", "runMain"].includes(property)
  )
    return { type: "unsupported-module-loader" };
  if (owner.type === "commonjs-module" && property === "require")
    return { type: "require" };
  if (owner.type === "process" && property === "getBuiltinModule")
    return { type: "get-builtin-module" };
  if (
    owner.type === "process" &&
    ["binding", "_linkedBinding", "dlopen", "mainModule"].includes(property)
  )
    return { type: "dynamic-code" };
  if (owner.type === "commonjs-module" && property === "_compile")
    return { type: "dynamic-code" };
  return null;
}

function resolveDynamicNamespacePropertyRole(property) {
  return property === "default" ||
    NODE_TEST_FUNCTION_EXPORTS.has(property) ||
    NODE_TEST_SUITE_EXPORTS.has(property)
    ? { type: "dynamic-callable" }
    : null;
}

function isUnboundProcessGetBuiltinModule(node, scope) {
  return (
    isUnboundProcessExpression(node.object, scope) &&
    memberProperty(node) === "getBuiltinModule"
  );
}

function isUnboundReflectGetMember(node, scope) {
  return (
    memberProperty(node) === "get" &&
    isUnboundReflectExpression(node.object, scope)
  );
}

function isUnboundReflectExpression(node, scope) {
  if (node?.type === "Identifier" && node.name === "Reflect")
    return !resolveScopeBinding(scope, "Reflect");
  return isUnboundGlobalNamedMember(node, scope, "Reflect");
}

function isUnboundGlobalDynamicCodeMember(node, scope) {
  const property = memberProperty(node);
  return (
    (property === "eval" || property === "Function") &&
    isUnboundGlobalObject(node.object, scope)
  );
}

function isUnboundProcessExpression(node, scope) {
  if (node?.type === "Identifier" && node.name === "process")
    return !resolveScopeBinding(scope, "process");
  return isUnboundGlobalNamedMember(node, scope, "process");
}

function isUnboundGlobalProcessMember(node, scope) {
  return isUnboundGlobalNamedMember(node, scope, "process");
}

function isUnboundGlobalReflectMember(node, scope) {
  return isUnboundGlobalNamedMember(node, scope, "Reflect");
}

function isUnboundGlobalNamedMember(node, scope, property) {
  return (
    memberProperty(node) === property &&
    isUnboundGlobalObject(node.object, scope)
  );
}

function isUnboundGlobalObject(node, scope) {
  return (
    node?.type === "Identifier" &&
    (node.name === "globalThis" || node.name === "global") &&
    !resolveScopeBinding(scope, node.name)
  );
}

export function memberProperty(node) {
  if (!node.computed)
    return node.property?.type === "Identifier" ? node.property.name : null;
  return node.property?.type === "Literal" &&
    typeof node.property.value === "string"
    ? node.property.value
    : null;
}

function staticStringLiteral(node) {
  if (node?.type === "Literal" && typeof node.value === "string")
    return node.value;
  if (node?.type === "TemplateLiteral" && node.expressions.length === 0)
    return node.quasis[0]?.value.cooked ?? node.quasis[0]?.value.raw ?? "";
  return null;
}
