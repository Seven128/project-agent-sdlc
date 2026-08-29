import path from "node:path";
import { CLI_EXIT_CODES, CliCommandError } from "../cli-exit.js";

const PORTABLE_SEGMENT_FORBIDDEN = /[<>:"|?*\u0000-\u001f]/u;
const WINDOWS_RESERVED = /^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\..*)?$/iu;

export function normalizeContextCreatePath(value: string): string {
  return normalizeContextFilePath(value, "context create");
}

export function normalizeContextFilePath(
  value: string,
  command: string,
): string {
  if (!value || path.isAbsolute(value) || /^[A-Za-z]:/u.test(value))
    invalid(value, command);
  const normalized = value.replace(/\\/gu, "/").replace(/^\.\//u, "");
  const segments = normalized.split("/");
  if (
    segments.length < 2 ||
    segments[0] !== "project_context" ||
    segments.some(invalidSegment) ||
    !segments.at(-1)?.toLowerCase().endsWith(".md")
  )
    invalid(value, command);
  return normalized;
}

function invalidSegment(segment: string): boolean {
  return (
    !segment ||
    segment === "." ||
    segment === ".." ||
    PORTABLE_SEGMENT_FORBIDDEN.test(segment) ||
    /[. ]$/u.test(segment) ||
    WINDOWS_RESERVED.test(segment)
  );
}

function invalid(value: string, command: string): never {
  throw new CliCommandError(
    CLI_EXIT_CODES.arguments,
    `${command} path must be a portable Markdown path below project_context/: ${value}`,
  );
}
