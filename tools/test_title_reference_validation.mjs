import {
  CONSTRUCTOR_INSPECTION_PROPERTIES,
  NODE_TEST_FUNCTION_EXPORTS,
  NODE_TEST_SUITE_EXPORTS,
} from "./test_title_roles.mjs";
import {
  analysisError,
  memberProperty,
  resolveNodeTestExpression,
} from "./test_title_registration_resolution.mjs";
import { rejectUnsupportedLocalReexports } from "./test_title_reference_exports.mjs";

export function rejectUnsupportedNodeTestReferences(model, allowed, file) {
  rejectUnsupportedLocalReexports(model, file);
  for (const binding of model.bindings)
    if (binding.nodeTestRole && bindingIsDirectlyExported(binding, model))
      throw analysisError(
        "critical_test_title_inventory_unsupported_node_test_export",
        file,
        binding.node,
      );
  for (const node of model.nodes) {
    if (allowed.has(node) || model.definitionNodes.has(node)) continue;
    if (
      node.type === "Identifier" &&
      !isReferenceIdentifier(node, model.parentByNode.get(node))
    )
      continue;
    const role = resolveNodeTestExpression(
      node,
      model.scopeByNode.get(node),
      model,
    );
    if (!role) continue;
    if (
      role.type === "context" &&
      isSafeTestContextReference(node, model.parentByNode.get(node))
    )
      continue;
    if (
      role.type === "commonjs-module" &&
      isSafeCommonJsModuleReference(node, model.parentByNode.get(node))
    )
      continue;
    if (isSafeAmbientReference(role, node, model)) continue;
    throw analysisError(
      "critical_test_title_inventory_unsupported_node_test_reference",
      file,
      node,
    );
  }
}

function isSafeAmbientReference(role, node, model) {
  const parent = model.parentByNode.get(node);
  switch (role.type) {
    case "reflect-get":
      return isSafeReflectGetReference(node, parent);
    case "process":
      return isSafeProcessReference(node, parent);
    case "reflect":
      return isSafeReflectReference(node, parent);
    case "global-object":
      return isSafeGlobalObjectReference(node, parent, model);
    case "dynamic-namespace":
      return isSafeDynamicModuleReference(node, parent, model);
    case "constructor-access":
      return isSafeConstructorAccessReference(node, parent);
    case "constructor-identity-method":
      return isSafeConstructorIdentityMethodReference(node, parent, model);
    default:
      return false;
  }
}

function isSafeConstructorIdentityMethodReference(node, parent, model) {
  if (parent?.type === "ChainExpression" && parent.expression === node)
    return isSafeConstructorIdentityMethodReference(
      parent,
      model.parentByNode.get(parent),
      model,
    );
  return parent?.type === "CallExpression" && parent.callee === node;
}

function isSafeConstructorAccessReference(node, parent) {
  if (parent?.type !== "MemberExpression" || parent.object !== node)
    return false;
  const property = memberProperty(parent);
  return (
    property !== null &&
    (CONSTRUCTOR_INSPECTION_PROPERTIES.has(property) || property === "valueOf")
  );
}

function bindingIsDirectlyExported(binding, model) {
  let node = binding.node;
  while (node) {
    const parent = model.parentByNode.get(node);
    if (!parent) return false;
    if (
      parent.type === "ExportNamedDeclaration" ||
      parent.type === "ExportDefaultDeclaration"
    )
      return true;
    if (
      parent.type === "Program" ||
      parent.type === "BlockStatement" ||
      parent.type === "FunctionExpression" ||
      parent.type === "FunctionDeclaration" ||
      parent.type === "ArrowFunctionExpression"
    )
      return false;
    node = parent;
  }
  return false;
}

function isReferenceIdentifier(node, parent) {
  if (!parent) return false;
  if (
    parent.type === "MemberExpression" &&
    parent.property === node &&
    !parent.computed
  )
    return false;
  if (
    (parent.type === "Property" ||
      parent.type === "MethodDefinition" ||
      parent.type === "PropertyDefinition") &&
    parent.key === node &&
    !parent.computed &&
    !(parent.type === "Property" && parent.shorthand)
  )
    return false;
  if (
    (parent.type === "LabeledStatement" ||
      parent.type === "BreakStatement" ||
      parent.type === "ContinueStatement") &&
    parent.label === node
  )
    return false;
  if (parent.type === "MetaProperty") return false;
  if (parent.type === "ExportSpecifier" && parent.exported === node)
    return false;
  return true;
}

function isSafeTestContextReference(node, parent) {
  if (parent?.type !== "MemberExpression" || parent.object !== node)
    return false;
  const property = memberProperty(parent);
  return property !== null && property !== "test";
}

function isSafeDynamicModuleReference(node, parent, model) {
  if (
    (parent?.type === "AwaitExpression" ||
      parent?.type === "ChainExpression") &&
    (parent.argument === node || parent.expression === node)
  )
    return isSafeDynamicModuleReference(
      parent,
      model.parentByNode.get(parent),
      model,
    );
  if (
    parent?.type === "VariableDeclarator" &&
    parent.init === node &&
    parent.id?.type === "ObjectPattern"
  )
    return isSafeDynamicModuleObjectPattern(parent.id);
  if (parent?.type !== "MemberExpression" || parent.object !== node)
    return false;
  const property = memberProperty(parent);
  return (
    property !== null &&
    property !== "default" &&
    property !== "then" &&
    !NODE_TEST_FUNCTION_EXPORTS.has(property) &&
    !NODE_TEST_SUITE_EXPORTS.has(property)
  );
}

function isSafeDynamicModuleObjectPattern(pattern) {
  return pattern.properties.every((property) => {
    if (
      property.type !== "Property" ||
      (property.computed && property.key?.type !== "Literal") ||
      property.kind !== "init" ||
      property.method
    )
      return false;
    const name =
      property.key?.type === "Identifier"
        ? property.key.name
        : property.key?.type === "Literal" &&
            typeof property.key.value === "string"
          ? property.key.value
          : null;
    return (
      name !== null &&
      name !== "default" &&
      name !== "then" &&
      !NODE_TEST_FUNCTION_EXPORTS.has(name) &&
      !NODE_TEST_SUITE_EXPORTS.has(name)
    );
  });
}

function isSafeCommonJsModuleReference(node, parent) {
  return (
    parent?.type === "MemberExpression" &&
    parent.object === node &&
    memberProperty(parent) !== null &&
    memberProperty(parent) !== "require"
  );
}

function isSafeReflectGetReference(node, parent) {
  return parent?.type === "CallExpression" && parent.callee === node;
}

function isSafeReflectReference(node, parent) {
  return (
    parent?.type === "MemberExpression" &&
    parent.object === node &&
    memberProperty(parent) !== null
  );
}

function isSafeGlobalObjectReference(node, parent, model) {
  if (
    parent?.type === "MemberExpression" &&
    parent.object === node &&
    memberProperty(parent) !== null
  )
    return true;
  if (
    parent?.type === "CallExpression" &&
    parent.arguments[0] === node &&
    resolveNodeTestExpression(
      parent.callee,
      model.scopeByNode.get(parent),
      model,
    )?.type === "reflect-get"
  )
    return true;
  return parent?.type === "UnaryExpression" && parent.operator === "typeof";
}

function isSafeProcessReference(node, parent) {
  if (
    parent?.type === "MemberExpression" &&
    parent.object === node &&
    memberProperty(parent) !== null &&
    memberProperty(parent) !== "getBuiltinModule"
  )
    return true;
  if (
    parent?.type === "CallExpression" &&
    parent.arguments[0] === node &&
    isSafeProcessReflection(parent)
  )
    return true;
  return parent?.type === "UnaryExpression" && parent.operator === "typeof";
}

function isSafeProcessReflection(call) {
  const callee = call.callee;
  if (
    callee?.type !== "MemberExpression" ||
    callee.object?.type !== "Identifier" ||
    callee.object.name !== "Object" ||
    !["defineProperty", "getOwnPropertyDescriptor"].includes(
      memberProperty(callee),
    )
  )
    return false;
  const property = call.arguments[1];
  return (
    property?.type === "Literal" &&
    typeof property.value === "string" &&
    property.value !== "getBuiltinModule"
  );
}
