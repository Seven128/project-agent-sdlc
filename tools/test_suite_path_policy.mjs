import path from "node:path";

export const TEST_ROOT = "tests/ty-context";

export function normalizeRepositoryPath(value) {
  return value
    .split(path.sep)
    .join("/")
    .replace(/\\/gu, "/")
    .replace(/^\.\//u, "")
    .trim();
}

export function testPath(name) {
  return `${TEST_ROOT}/${name}`;
}
