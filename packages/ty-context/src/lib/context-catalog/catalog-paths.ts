import path from "node:path";

export function normalizeContextPath(value: string): string {
  return normalizeContextPathSpelling(value).normalize("NFC");
}

// Preserve the physical spelling when discovery needs to diagnose two paths
// that collapse to the same public NFC key. Catalog consumers should otherwise
// use normalizeContextPath().
export function normalizeContextPathSpelling(value: string): string {
  return value.replace(/\\/gu, "/").replace(/^\.\//u, "");
}

export function resolveProjectPath(
  projectRoot: string,
  repositoryRelativePath: string,
): string {
  return path.resolve(
    projectRoot,
    ...normalizeContextPath(repositoryRelativePath).split("/"),
  );
}

export function repositoryRelativePath(
  projectRoot: string,
  absolutePath: string,
): string {
  return normalizeContextPath(path.relative(projectRoot, absolutePath));
}

export function isPathWithin(root: string, target: string): boolean {
  const relative = path.relative(root, target);
  return (
    relative === "" ||
    (!relative.startsWith(`..${path.sep}`) &&
      relative !== ".." &&
      !path.isAbsolute(relative))
  );
}

export function compareUtf8Paths(left: string, right: string): number {
  return Buffer.compare(Buffer.from(left, "utf8"), Buffer.from(right, "utf8"));
}

export function portableContextPathCaseKey(value: string): string {
  // ECMAScript default case conversion is locale-independent. This key is a
  // portability collision detector, not a filesystem lookup or ontology.
  return normalizeContextPath(value).toLowerCase();
}

export function sortedContextMap<T>(
  values: Iterable<readonly [string, T]>,
): Map<string, T> {
  return new Map(
    [...values].sort(([left], [right]) => compareUtf8Paths(left, right)),
  );
}
