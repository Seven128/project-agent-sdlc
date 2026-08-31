import { buildNodeTestScopeModel } from "./test_title_scope_model.mjs";
import { resolveDestructuringRoles } from "./test_title_destructuring_roles.mjs";
import { collectNodeTestModuleSpecifier } from "./test_title_module_edges.mjs";
import {
  analysisError,
  assertClosedRegistrationCallback,
  isNonTransferableNodeTestRole,
  isNodeTestModuleLoaderRole,
  isUnsupportedNodeTestRole,
  markResolvedReferences,
  resolveNodeTestExpression,
  resolveRegistrationRoles,
} from "./test_title_registration_resolution.mjs";
import { rejectUnsupportedNodeTestReferences } from "./test_title_reference_validation.mjs";

export function analyzeNodeTestProgram({ program, file }) {
  const model = buildNodeTestScopeModel(program);
  const titles = [];
  const localModuleEdges = [];
  const allowedNodeTestReferences = new WeakSet();

  for (const node of model.nodes)
    if (node.type === "ImportExpression")
      collectNodeTestModuleSpecifier({
        node,
        file,
        localModuleEdges,
        model,
        prepass: true,
        resolveNodeTestExpression,
      });
  resolveRegistrationRoles(model, file);
  resolveDestructuringRoles(model, file);
  resolveRegistrationRoles(model, file);

  for (const node of model.nodes) {
    collectNodeTestModuleSpecifier({
      node,
      file,
      localModuleEdges,
      model,
      resolveNodeTestExpression,
    });
    if (node.type !== "CallExpression") continue;
    const callable = resolveNodeTestExpression(
      node.callee,
      model.scopeByNode.get(node),
      model,
    );
    if (isNodeTestModuleLoaderRole(callable)) {
      markResolvedReferences(node.callee, model, allowedNodeTestReferences);
      continue;
    }
    if (callable?.type !== "callable") continue;
    markResolvedReferences(node.callee, model, allowedNodeTestReferences);
    assertClosedRegistrationCallback(node, file);
    const title = staticTestTitle(node.arguments[0]);
    if (title === null)
      throw analysisError(
        "critical_test_title_inventory_dynamic_title",
        file,
        node,
      );
    titles.push({
      title,
      line: node.loc?.start.line ?? 0,
      column: (node.loc?.start.column ?? -1) + 1,
    });
  }

  for (const binding of model.bindings)
    if (
      binding.aliasInitializer &&
      binding.nodeTestRole &&
      !isUnsupportedNodeTestRole(binding.nodeTestRole) &&
      !isNonTransferableNodeTestRole(binding.nodeTestRole)
    )
      markResolvedReferences(
        binding.aliasInitializer,
        model,
        allowedNodeTestReferences,
      );

  rejectUnsupportedNodeTestReferences(model, allowedNodeTestReferences, file);
  return {
    titles,
    local_module_edges: uniqueModuleEdges(localModuleEdges),
  };
}

function uniqueModuleEdges(edges) {
  const unique = new Map();
  for (const edge of edges)
    unique.set(
      `${edge.resolution}\u0000${edge.specifier}\u0000${edge.dynamic === true}`,
      edge,
    );
  return [...unique.values()].sort(
    (left, right) =>
      compareUtf8(left.resolution, right.resolution) ||
      compareUtf8(left.specifier, right.specifier) ||
      Number(left.dynamic === true) - Number(right.dynamic === true),
  );
}

function staticTestTitle(node) {
  if (node?.type === "Literal" && typeof node.value === "string")
    return node.value;
  if (node?.type === "TemplateLiteral" && node.expressions.length === 0)
    return node.quasis[0]?.value.cooked ?? node.quasis[0]?.value.raw ?? "";
  return null;
}

function compareUtf8(left, right) {
  return Buffer.compare(Buffer.from(left, "utf8"), Buffer.from(right, "utf8"));
}
