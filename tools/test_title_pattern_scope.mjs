export function bindScopePattern(
  pattern,
  scope,
  kind,
  aliasInitializer,
  model,
  parent,
  operations,
) {
  if (!pattern) return;
  model.scopeByNode.set(pattern, scope);
  if (parent) model.parentByNode.set(pattern, parent);
  switch (pattern.type) {
    case "Identifier":
      operations.bindIdentifier(
        pattern,
        scope,
        kind,
        null,
        model,
        aliasInitializer,
      );
      return;
    case "RestElement":
      bindScopePattern(
        pattern.argument,
        scope,
        kind,
        null,
        model,
        pattern,
        operations,
      );
      return;
    case "AssignmentPattern":
      bindScopePattern(
        pattern.left,
        scope,
        kind,
        null,
        model,
        pattern,
        operations,
      );
      return;
    case "ArrayPattern":
      for (const element of pattern.elements)
        bindScopePattern(
          element,
          scope,
          kind,
          null,
          model,
          pattern,
          operations,
        );
      return;
    case "ObjectPattern":
      bindObjectPattern(pattern, scope, kind, model, operations);
  }
}

export function visitScopePatternExpressions(
  pattern,
  scope,
  parent,
  model,
  operations,
) {
  if (!pattern) return;
  if (pattern.type === "AssignmentPattern") {
    visitScopePatternExpressions(
      pattern.left,
      scope,
      pattern,
      model,
      operations,
    );
    operations.visitNode(pattern.right, scope, pattern, model);
    return;
  }
  if (pattern.type === "RestElement") {
    visitScopePatternExpressions(
      pattern.argument,
      scope,
      pattern,
      model,
      operations,
    );
    return;
  }
  if (pattern.type === "ArrayPattern") {
    for (const element of pattern.elements)
      visitScopePatternExpressions(element, scope, pattern, model, operations);
    return;
  }
  if (pattern.type === "ObjectPattern") {
    for (const property of pattern.properties) {
      if (property.type === "Property") {
        if (property.computed)
          operations.visitNode(property.key, scope, property, model);
        visitScopePatternExpressions(
          property.value,
          scope,
          property,
          model,
          operations,
        );
      } else
        visitScopePatternExpressions(
          property.argument,
          scope,
          property,
          model,
          operations,
        );
    }
    return;
  }
  model.scopeByNode.set(pattern, scope);
  if (parent) model.parentByNode.set(pattern, parent);
}

function bindObjectPattern(pattern, scope, kind, model, operations) {
  for (const property of pattern.properties) {
    model.scopeByNode.set(property, scope);
    model.parentByNode.set(property, pattern);
    if (property.type === "Property") {
      if (property.computed)
        operations.visitNode(property.key, scope, property, model);
      else operations.markDefinition(property.key, scope, property, model);
      bindScopePattern(
        property.value,
        scope,
        kind,
        null,
        model,
        property,
        operations,
      );
    } else
      bindScopePattern(
        property.argument,
        scope,
        kind,
        null,
        model,
        property,
        operations,
      );
  }
}
