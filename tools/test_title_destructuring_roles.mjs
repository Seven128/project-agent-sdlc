import { resolveStaticString } from "./test_title_module_edges.mjs";
import { resolveConstructorAccessRole } from "./test_title_constructor_roles.mjs";
import {
  resolveNodeTestExpression,
  resolvePropertyRole,
} from "./test_title_expression_roles.mjs";
import { analysisError } from "./test_title_registration_resolution.mjs";
import { resolveScopeBinding } from "./test_title_scope_model.mjs";

export function resolveDestructuringRoles(model, file) {
  for (const {
    pattern,
    bindingScope,
    evaluationScope,
    sourceExpression,
  } of model.bindingPatterns)
    inspectPattern(
      pattern,
      bindingScope,
      evaluationScope,
      model,
      file,
      sourceExpression,
      sourceExpression
        ? resolveNodeTestExpression(sourceExpression, evaluationScope, model)
        : null,
    );
  for (const node of model.nodes) {
    if (node.type === "AssignmentExpression") {
      const scope = model.scopeByNode.get(node.left);
      inspectPattern(
        node.left,
        scope,
        scope,
        model,
        file,
        node.right,
        resolveNodeTestExpression(node.right, scope, model),
      );
      continue;
    }
    if (
      (node.type === "ForInStatement" || node.type === "ForOfStatement") &&
      node.left?.type !== "VariableDeclaration"
    )
      inspectPattern(
        node.left,
        model.scopeByNode.get(node.left),
        model.scopeByNode.get(node.left),
        model,
        file,
        null,
        null,
      );
  }
}

function inspectPattern(
  pattern,
  bindingScope,
  evaluationScope,
  model,
  file,
  sourceExpression = null,
  sourceRole = null,
) {
  if (!pattern) return;
  switch (pattern.type) {
    case "AssignmentPattern":
      inspectPattern(
        pattern.left,
        bindingScope,
        evaluationScope,
        model,
        file,
        sourceExpression,
        sourceRole,
      );
      return;
    case "RestElement":
      inspectPattern(
        pattern.argument,
        bindingScope,
        evaluationScope,
        model,
        file,
        sourceExpression,
        sourceRole,
      );
      return;
    case "ArrayPattern":
      for (const element of pattern.elements)
        inspectPattern(
          element,
          bindingScope,
          evaluationScope,
          model,
          file,
          sourceExpression,
          sourceRole,
        );
      return;
    case "ObjectPattern":
      inspectObjectPattern(
        pattern,
        bindingScope,
        evaluationScope,
        model,
        file,
        sourceExpression,
        sourceRole,
      );
  }
}

function inspectObjectPattern(
  pattern,
  bindingScope,
  evaluationScope,
  model,
  file,
  sourceExpression,
  sourceRole,
) {
  for (const property of pattern.properties) {
    if (property.type !== "Property") {
      inspectPattern(
        property.argument,
        bindingScope,
        evaluationScope,
        model,
        file,
        sourceExpression,
        sourceRole,
      );
      continue;
    }
    const role = destructuredPropertyRole(
      property,
      evaluationScope,
      model,
      sourceExpression,
      sourceRole,
    );
    if (role)
      assignDirectRole(
        property.value,
        role,
        bindingScope,
        evaluationScope,
        model,
        file,
        null,
        role,
      );
    else
      inspectPattern(
        property.value,
        bindingScope,
        evaluationScope,
        model,
        file,
        null,
        null,
      );
  }
}

function destructuredPropertyRole(
  property,
  scope,
  model,
  sourceExpression,
  sourceRole,
) {
  const name = property.computed
    ? resolveStaticPropertyName(property.key, scope, model)
    : property.key?.type === "Identifier"
      ? property.key.name
      : property.key?.type === "Literal" &&
          typeof property.key.value === "string"
        ? property.key.value
        : null;
  if (name === "constructor")
    return resolveConstructorAccessRole(
      sourceExpression,
      sourceRole,
      scope,
      model,
    );
  if (sourceRole && name !== null) return resolvePropertyRole(sourceRole, name);
  if (sourceRole || (property.computed && name === null))
    return { type: "unsupported-reflection" };
  return null;
}

function resolveStaticPropertyName(node, scope, model, seen = new Set()) {
  const stringValue = resolveStaticString(node, scope, model);
  if (stringValue !== null) return stringValue;
  if (
    node?.type === "Literal" &&
    (node.value === null ||
      typeof node.value === "number" ||
      typeof node.value === "boolean" ||
      typeof node.value === "bigint")
  )
    return String(node.value);
  if (node?.type !== "Identifier") return null;
  const binding = resolveScopeBinding(scope, node.name);
  if (
    !binding?.aliasInitializer ||
    binding.kind !== "const" ||
    seen.has(binding)
  )
    return null;
  return resolveStaticPropertyName(
    binding.aliasInitializer,
    model.scopeByNode.get(binding.aliasInitializer) ?? binding.scope,
    model,
    new Set(seen).add(binding),
  );
}

function assignDirectRole(
  target,
  role,
  bindingScope,
  evaluationScope,
  model,
  file,
  sourceExpression,
  sourceRole,
) {
  if (!target) return;
  if (target.type === "Identifier") {
    model.definitionNodes.add(target);
    const binding = resolveScopeBinding(bindingScope, target.name);
    if (!binding)
      throw analysisError(
        "critical_test_title_inventory_unsupported_node_test_reference",
        file,
        target,
      );
    binding.nodeTestRole = role;
    return;
  }
  if (target.type === "AssignmentPattern") {
    assignDirectRole(
      target.left,
      role,
      bindingScope,
      evaluationScope,
      model,
      file,
      sourceExpression,
      sourceRole,
    );
    return;
  }
  if (
    target.type === "ObjectPattern" ||
    target.type === "ArrayPattern" ||
    target.type === "RestElement"
  ) {
    inspectPattern(
      target,
      bindingScope,
      evaluationScope,
      model,
      file,
      sourceExpression,
      sourceRole,
    );
    return;
  }
  throw analysisError(
    "critical_test_title_inventory_unsupported_node_test_reference",
    file,
    target,
  );
}
