export function createScope(parent, kind) {
  return { parent, kind, bindings: new Map() };
}

export function resolveScopeBinding(scope, name) {
  for (let current = scope; current; current = current.parent) {
    const binding = current.bindings.get(name);
    if (binding) return binding;
  }
  return null;
}

export function nearestVariableScope(scope) {
  for (let current = scope; current; current = current.parent)
    if (
      current.kind === "function" ||
      current.kind === "static-block" ||
      current.kind === "module"
    )
      return current;
  return scope;
}
