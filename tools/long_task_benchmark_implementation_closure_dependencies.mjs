import path from "node:path";
import {
  findIdentifierBeforeBoundary,
  findPunctuatorBeforeBoundary,
  firstStringBeforeBoundary,
  isIdentifier,
  isImportMetaUrl,
  isPunctuator,
  relativeSpecifier,
  tokenSignature,
  tokenizeImplementationSource,
} from "./long_task_benchmark_implementation_closure_lexer.mjs";

export const BENCHMARK_IMPLEMENTATION_EXTENSIONS = Object.freeze([
  ".cjs",
  ".cs",
  ".js",
  ".json",
  ".mjs",
  ".ps1",
]);

// These expressions load the separately frozen variant commit/package runtime.
// Any other nonliteral loader, or any expression drift here, fails closed.
const admittedBoundRuntimeImports = new Map([
  [
    "examples/delivery-benchmark/real-process-workload/runner/fixture-adapter.mjs",
    new Set(["i:url|p:.|i:href"]),
  ],
  [
    "examples/delivery-benchmark/real-process-workload/runner/workload-executor.mjs",
    new Set([
      "i:pathToFileURL|p:(|i:path|p:.|i:join|p:(|i:harnessRoot|p:,|s:packages|p:,|s:ty-context|p:,|s:dist|p:,|s:lib|p:,|s:long-task-workspace.js|p:,|p:)|p:,|p:)|p:.|i:href",
    ]),
  ],
]);
const admittedDirectoryLocators = new Map([
  ["tools/formal_process_supervisor.mjs", new Set(["../"])],
  ["tools/long_task_formal_provider_worker_host.mjs", new Set(["../"])],
  [
    "examples/delivery-benchmark/real-process-workload/runner/fixture-adapter.mjs",
    new Set([".."]),
  ],
  [
    "examples/delivery-benchmark/real-process-workload/runner/workload-executor.mjs",
    new Set(["../../../.."]),
  ],
]);
const admittedExtensions = new Set(BENCHMARK_IMPLEMENTATION_EXTENSIONS);

export function localImplementationDependencies(source, repositoryPath) {
  const tokens = tokenizeImplementationSource(source, repositoryPath);
  const dependencies = new Set();
  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    if (token.type === "identifier" && token.value === "createRequire")
      throw new Error(
        `benchmark_implementation_closure_create_require:${repositoryPath}`,
      );
    if (isIdentifier(token, "import")) {
      inspectImport(tokens, index, dependencies, repositoryPath);
      continue;
    }
    if (isIdentifier(token, "export")) {
      inspectExport(tokens, index, dependencies, repositoryPath);
      continue;
    }
    if (
      isIdentifier(token, "require") &&
      isPunctuator(tokens[index + 1], "(")
    ) {
      addRequiredDependency(
        dependencies,
        tokens[index + 2],
        repositoryPath,
      );
      continue;
    }
    if (
      isIdentifier(token, "require") &&
      isPunctuator(tokens[index + 1], ".") &&
      isIdentifier(tokens[index + 2], "resolve") &&
      isPunctuator(tokens[index + 3], "(")
    ) {
      addRequiredDependency(
        dependencies,
        tokens[index + 4],
        repositoryPath,
      );
      continue;
    }
    if (
      isIdentifier(token, "module") &&
      isPunctuator(tokens[index + 1], ".") &&
      isIdentifier(tokens[index + 2], "require") &&
      isPunctuator(tokens[index + 3], "(")
    ) {
      addRequiredDependency(
        dependencies,
        tokens[index + 4],
        repositoryPath,
      );
      continue;
    }
    if (
      isIdentifier(token, "new") &&
      isIdentifier(tokens[index + 1], "URL") &&
      isPunctuator(tokens[index + 2], "(")
    )
      inspectNewUrl(tokens, index + 3, dependencies, repositoryPath);
  }
  return dependencies;
}

function inspectImport(tokens, index, dependencies, repositoryPath) {
  if (isPunctuator(tokens[index + 1], ".")) return;
  if (isPunctuator(tokens[index + 1], "(")) {
    const argument = tokens[index + 2];
    if (argument?.type === "string")
      addDependency(
        dependencies,
        literalSpecifier(argument, repositoryPath),
        repositoryPath,
        false,
      );
    else if (argument?.type === "template" && relativeSpecifier(argument.value))
      throw new Error(
        `benchmark_implementation_closure_nonliteral_local_loader:${repositoryPath}`,
      );
    else assertBoundRuntimeImport(tokens, index + 2, repositoryPath);
    return;
  }
  const specifier = firstStringBeforeBoundary(tokens, index + 1);
  if (specifier)
    addDependency(
      dependencies,
      literalSpecifier(specifier, repositoryPath),
      repositoryPath,
      false,
    );
}

function inspectExport(tokens, index, dependencies, repositoryPath) {
  if (
    !isPunctuator(tokens[index + 1], "{") &&
    !isPunctuator(tokens[index + 1], "*")
  )
    return;
  const from = findIdentifierBeforeBoundary(tokens, index + 1, "from");
  if (from !== -1 && tokens[from + 1]?.type === "string")
    addDependency(
      dependencies,
      literalSpecifier(tokens[from + 1], repositoryPath),
      repositoryPath,
      false,
    );
}

function inspectNewUrl(tokens, argumentIndex, dependencies, repositoryPath) {
  const comma = findPunctuatorBeforeBoundary(tokens, argumentIndex, ",");
  if (comma === -1 || !isImportMetaUrl(tokens, comma + 1)) return;
  const argument = tokens[argumentIndex];
  if (argument?.type !== "string")
    throw new Error(
      `benchmark_implementation_closure_nonliteral_local_loader:${repositoryPath}`,
    );
  addDependency(
    dependencies,
    literalSpecifier(argument, repositoryPath),
    repositoryPath,
    true,
  );
}

function addRequiredDependency(dependencies, token, repositoryPath) {
  if (token?.type !== "string")
    throw new Error(
      `benchmark_implementation_closure_nonliteral_local_loader:${repositoryPath}`,
    );
  addDependency(
    dependencies,
    literalSpecifier(token, repositoryPath),
    repositoryPath,
    false,
  );
}

function literalSpecifier(token, repositoryPath) {
  if (token.escaped)
    throw new Error(
      `benchmark_implementation_closure_escaped_specifier:${repositoryPath}`,
    );
  return token.value;
}

function assertBoundRuntimeImport(tokens, start, repositoryPath) {
  const expression = [];
  let depth = 0;
  for (let index = start; index < tokens.length; index += 1) {
    const token = tokens[index];
    if (
      isPunctuator(token, "(") ||
      isPunctuator(token, "[") ||
      isPunctuator(token, "{")
    )
      depth += 1;
    else if (
      isPunctuator(token, ")") ||
      isPunctuator(token, "]") ||
      isPunctuator(token, "}")
    ) {
      if (depth === 0) break;
      depth -= 1;
    } else if (isPunctuator(token, ",") && depth === 0) break;
    expression.push(token);
  }
  const signature = expression.map(tokenSignature).join("|");
  if (!admittedBoundRuntimeImports.get(repositoryPath)?.has(signature))
    throw new Error(
      `benchmark_implementation_closure_nonliteral_loader:${repositoryPath}`,
    );
}

function addDependency(
  dependencies,
  specifier,
  repositoryPath,
  allowDirectoryLocator,
) {
  if (!relativeSpecifier(specifier)) return;
  if (
    specifier.includes("\\") ||
    specifier.includes("?") ||
    specifier.includes("#")
  )
    throw new Error(
      `benchmark_implementation_closure_specifier:${repositoryPath}`,
    );
  const extension = path.posix.extname(specifier);
  if (!extension && allowDirectoryLocator) {
    if (admittedDirectoryLocators.get(repositoryPath)?.has(specifier)) return;
    throw new Error(
      `benchmark_implementation_closure_directory_locator:${repositoryPath}:${specifier}`,
    );
  }
  if (!admittedExtensions.has(extension))
    throw new Error(
      `benchmark_implementation_closure_extension:${repositoryPath}:${specifier}`,
    );
  const resolved = path.posix.normalize(
    path.posix.join(path.posix.dirname(repositoryPath), specifier),
  );
  if (
    resolved === ".." ||
    resolved.startsWith("../") ||
    path.posix.isAbsolute(resolved)
  )
    throw new Error(
      `benchmark_implementation_closure_escape:${repositoryPath}:${specifier}`,
    );
  dependencies.add(resolved);
}
