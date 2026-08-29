import path from "node:path";

export function normalizeContextPath(value: string): string {
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
