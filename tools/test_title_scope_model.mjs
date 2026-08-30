import {
  bindScopePattern,
  visitScopePatternExpressions,
} from "./test_title_pattern_scope.mjs";
import { importedNodeTestRole } from "./test_title_roles.mjs";
import {
  createScope,
  nearestVariableScope,
  resolveScopeBinding,
} from "./test_title_scope_bindings.mjs";

export { resolveScopeBinding };

const patternOperations = { bindIdentifier, markDefinition, visitNode };

export function buildNodeTestScopeModel(program) {
  const rootScope = createScope(null, "module");
  const model = {
    bindings: [],
    bindingPatterns: [],
    nodes: [],
    scopeByNode: new WeakMap(),
    parentByNode: new WeakMap(),
    definitionNodes: new WeakSet(),
    staticModuleExpressions: new WeakSet(),
  };
  visitNode(program, rootScope, null, model);
  return model;
}

function visitNode(node, scope, parent, model) {
  if (!node || typeof node !== "object") return;
  model.nodes.push(node);
  model.scopeByNode.set(node, scope);
  if (parent) model.parentByNode.set(node, parent);

  switch (node.type) {
    case "Program":
      for (const child of node.body) visitNode(child, scope, node, model);
      return;
    case "ImportDeclaration":
      visitImportDeclaration(node, scope, model);
      return;
    case "VariableDeclaration":
      visitVariableDeclaration(node, scope, model);
      return;
    case "FunctionDeclaration":
      if (node.id) bindIdentifier(node.id, scope, "function", null, model);
      visitFunction(node, scope, model);
      return;
    case "FunctionExpression":
    case "ArrowFunctionExpression":
      visitFunction(node, scope, model);
      return;
    case "BlockStatement":
      visitBlock(node, scope, model);
      return;
    case "CatchClause":
      visitCatch(node, scope, model);
      return;
    case "ForStatement":
    case "ForInStatement":
    case "ForOfStatement":
      visitLoop(node, scope, model);
      return;
    case "SwitchStatement":
      visitSwitch(node, scope, model);
      return;
    case "ClassDeclaration":
      if (node.id) bindIdentifier(node.id, scope, "class", null, model);
      visitClass(node, scope, model);
      return;
    case "ClassExpression":
      visitClass(node, scope, model);
      return;
    case "StaticBlock":
      visitStaticBlock(node, scope, model);
      return;
    default:
      visitChildren(node, scope, model);
  }
}

function visitBlock(node, parentScope, model) {
  const scope = createScope(parentScope, "block");
  model.scopeByNode.set(node, scope);
  for (const child of node.body) visitNode(child, scope, node, model);
}

function visitCatch(node, parentScope, model) {
  const scope = createScope(parentScope, "block");
  model.scopeByNode.set(node, scope);
  if (node.param)
    model.bindingPatterns.push({
      pattern: node.param,
      bindingScope: scope,
      evaluationScope: scope,
    });
  if (node.param)
    bindScopePattern(
      node.param,
      scope,
      "catch",
      null,
      model,
      node,
      patternOperations,
    );
  visitScopePatternExpressions(
    node.param,
    scope,
    node,
    model,
    patternOperations,
  );
  visitNode(node.body, scope, node, model);
}

function visitSwitch(node, parentScope, model) {
  const scope = createScope(parentScope, "block");
  model.scopeByNode.set(node, scope);
  visitNode(node.discriminant, scope, node, model);
  for (const child of node.cases) visitNode(child, scope, node, model);
}

function visitStaticBlock(node, parentScope, model) {
  const scope = createScope(parentScope, "static-block");
  model.scopeByNode.set(node, scope);
  for (const child of node.body) visitNode(child, scope, node, model);
}

function visitImportDeclaration(node, scope, model) {
  for (const specifier of node.specifiers) {
    model.scopeByNode.set(specifier, scope);
    model.parentByNode.set(specifier, node);
    const imported =
      specifier.type === "ImportSpecifier"
        ? importedName(specifier.imported)
        : null;
    const nodeTestRole = importedNodeTestRole(
      node.source?.value,
      specifier,
      imported,
    );
    bindIdentifier(specifier.local, scope, "import", nodeTestRole, model);
    if (specifier.imported) {
      model.scopeByNode.set(specifier.imported, scope);
      model.parentByNode.set(specifier.imported, specifier);
      model.definitionNodes.add(specifier.imported);
    }
  }
  visitNode(node.source, scope, node, model);
}

function visitVariableDeclaration(node, scope, model) {
  for (const declaration of node.declarations) {
    model.scopeByNode.set(declaration, scope);
    model.parentByNode.set(declaration, node);
    const targetScope =
      node.kind === "var" ? nearestVariableScope(scope) : scope;
    model.bindingPatterns.push({
      pattern: declaration.id,
      bindingScope: targetScope,
      evaluationScope: scope,
    });
    bindScopePattern(
      declaration.id,
      targetScope,
      node.kind,
      node.kind === "const" ? declaration.init : null,
      model,
      declaration,
      patternOperations,
    );
  }
  for (const declaration of node.declarations) {
    visitScopePatternExpressions(
      declaration.id,
      scope,
      declaration,
      model,
      patternOperations,
    );
    visitNode(declaration.init, scope, declaration, model);
  }
}

function visitFunction(node, parentScope, model) {
  const simpleParameters = node.params.every(
    (parameter) => parameter.type === "Identifier",
  );
  const parameterScope = createScope(
    parentScope,
    simpleParameters ? "function" : "function-parameters",
  );
  if (node.type === "FunctionExpression" && node.id)
    bindIdentifier(node.id, parameterScope, "function", null, model);
  for (const parameter of node.params) {
    model.bindingPatterns.push({
      pattern: parameter,
      bindingScope: parameterScope,
      evaluationScope: parameterScope,
    });
    bindScopePattern(
      parameter,
      parameterScope,
      "parameter",
      null,
      model,
      node,
      patternOperations,
    );
  }
  for (const parameter of node.params)
    visitScopePatternExpressions(
      parameter,
      parameterScope,
      node,
      model,
      patternOperations,
    );
  const bodyScope = simpleParameters
    ? parameterScope
    : createScope(parameterScope, "function");
  visitNode(node.body, bodyScope, node, model);
}

function visitLoop(node, parentScope, model) {
  const scope = createScope(parentScope, "block");
  model.scopeByNode.set(node, scope);
  if (node.type === "ForStatement") {
    visitNode(node.init, scope, node, model);
    visitNode(node.test, scope, node, model);
    visitNode(node.update, scope, node, model);
  } else {
    visitNode(node.left, scope, node, model);
    visitNode(node.right, scope, node, model);
  }
  visitNode(node.body, scope, node, model);
}

function visitClass(node, parentScope, model) {
  visitNode(node.superClass, parentScope, node, model);
  const scope = createScope(parentScope, "class");
  if (node.type === "ClassExpression" && node.id)
    bindIdentifier(node.id, scope, "class", null, model);
  visitNode(node.body, scope, node, model);
}

function visitChildren(node, scope, model) {
  for (const [key, value] of Object.entries(node)) {
    if (ignoredAstKey(key)) continue;
    if (Array.isArray(value))
      for (const child of value) visitNode(child, scope, node, model);
    else if (value && typeof value === "object")
      visitNode(value, scope, node, model);
  }
}

function bindIdentifier(
  identifier,
  scope,
  kind,
  nodeTestRole,
  model,
  aliasInitializer = null,
) {
  markDefinition(identifier, scope, null, model);
  const existing = scope.bindings.get(identifier.name);
  if (
    kind === "var" &&
    existing &&
    (existing.kind === "parameter" || existing.kind === "var")
  )
    return existing;
  const binding = {
    name: identifier.name,
    kind,
    scope,
    node: identifier,
    aliasInitializer,
    nodeTestRole,
  };
  scope.bindings.set(identifier.name, binding);
  model.bindings.push(binding);
}

function markDefinition(node, scope, parent, model) {
  model.scopeByNode.set(node, scope);
  if (parent) model.parentByNode.set(node, parent);
  model.definitionNodes.add(node);
}

function importedName(imported) {
  return imported?.type === "Identifier" ? imported.name : imported?.value;
}

function ignoredAstKey(key) {
  return key === "end" || key === "loc" || key === "range" || key === "start";
}
