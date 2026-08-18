import path from "node:path";
import { resolveInsideRepository } from "./long-task-workspace.js";

export type PatternContainment =
  | { status: "proven_subset"; reason: string }
  | { status: "not_subset"; reason: string }
  | { status: "unknown"; reason: string };

export type PatternOverlap =
  | { status: "proven_overlap"; reason: string }
  | { status: "proven_disjoint"; reason: string }
  | { status: "unknown"; reason: string };

export interface RepositoryPatternAst {
  normalized: string;
  segments: RepositoryPatternSegmentAst[];
}

export type RepositoryPatternSegmentAst =
  | { kind: "recursive"; raw: "**" }
  | {
      kind: "segment";
      raw: string;
      tokens: RepositoryPatternTokenAst[];
    };

export type RepositoryPatternTokenAst =
  { kind: "literal"; value: string } | { kind: "star" } | { kind: "question" };

export function parseRepositoryPattern(
  value: string,
  label = "repository_pattern",
): RepositoryPatternAst {
  const normalized = canonicalRepositoryPath(value, label, "pattern");
  if (/[\[\]{}]/u.test(normalized))
    throw new Error(`unsupported_repository_pattern_syntax:${label}:${value}`);
  const segments = normalized.split("/").map((segment) => {
    if (segment === "**") return { kind: "recursive", raw: "**" } as const;
    if (segment.includes("**"))
      throw new Error(
        `unsupported_repository_pattern_syntax:${label}:${value}`,
      );
    const tokens: RepositoryPatternTokenAst[] = [];
    let literal = "";
    const flush = () => {
      if (!literal) return;
      tokens.push({ kind: "literal", value: literal });
      literal = "";
    };
    for (const character of segment) {
      if (character === "*") {
        flush();
        tokens.push({ kind: "star" });
      } else if (character === "?") {
        flush();
        tokens.push({ kind: "question" });
      } else literal += character;
    }
    flush();
    return { kind: "segment", raw: segment, tokens } as const;
  });
  return { normalized, segments };
}

export function normalizeRepositoryFile(
  value: string,
  label = "repository_file",
): string {
  return canonicalRepositoryPath(value, label, "file");
}

export function normalizeRepositoryCwd(
  value: string,
  label = "runner.cwd",
): string {
  return canonicalRepositoryPath(value, label, "cwd");
}

export function assertRepositoryPattern(
  repositoryRoot: string,
  value: string,
  label: string,
): string {
  const pattern = parseRepositoryPattern(value, label);
  const prefix: string[] = [];
  for (const segment of pattern.segments) {
    if (
      segment.kind === "recursive" ||
      segment.tokens.some((token) => token.kind !== "literal")
    )
      break;
    prefix.push(segment.raw);
  }
  if (prefix.length)
    resolveInsideRepository(repositoryRoot, prefix.join("/"), label);
  return pattern.normalized;
}

export function matchesRepoPattern(
  fileInput: string,
  patternInput: string,
): boolean {
  const file = normalizeRepositoryFile(fileInput);
  const pattern = parseRepositoryPattern(patternInput);
  const fileSegments = file.split("/");
  const memo = new Map<string, boolean>();
  const match = (patternIndex: number, fileIndex: number): boolean => {
    const key = `${patternIndex}:${fileIndex}`;
    const cached = memo.get(key);
    if (cached !== undefined) return cached;
    const segment = pattern.segments[patternIndex];
    let result: boolean;
    if (!segment) result = fileIndex === fileSegments.length;
    else if (segment.kind === "recursive")
      result =
        match(patternIndex + 1, fileIndex) ||
        (fileIndex < fileSegments.length && match(patternIndex, fileIndex + 1));
    else
      result =
        fileIndex < fileSegments.length &&
        segmentMatches(fileSegments[fileIndex], segment) &&
        match(patternIndex + 1, fileIndex + 1);
    memo.set(key, result);
    return result;
  };
  return match(0, 0);
}

export function proveRepositoryPatternSubset(
  candidateInput: string,
  ownerInput: string,
): PatternContainment {
  const candidate = parseRepositoryPattern(candidateInput, "candidate");
  const owner = parseRepositoryPattern(ownerInput, "owner");
  if (candidate.normalized === owner.normalized)
    return { status: "proven_subset", reason: "patterns_are_equal" };
  if (isGlobalRecursive(owner))
    return {
      status: "proven_subset",
      reason: "owner_is_global_recursive_pattern",
    };
  if (isExactPattern(candidate))
    return matchesAst(candidate.normalized, owner)
      ? {
          status: "proven_subset",
          reason: "exact_candidate_matches_owner_pattern",
        }
      : {
          status: "not_subset",
          reason: "exact_candidate_does_not_match_owner_pattern",
        };

  const ownerRecursiveTail = recursiveTailPrefix(owner);
  if (ownerRecursiveTail) {
    const candidatePrefix = requiredLeadingSegments(candidate);
    if (candidatePrefix.length < ownerRecursiveTail.length)
      return {
        status: "unknown",
        reason: "candidate_may_match_before_owner_recursive_prefix",
      };
    for (let index = 0; index < ownerRecursiveTail.length; index += 1) {
      const relation = segmentSubset(
        candidatePrefix[index],
        ownerRecursiveTail[index],
      );
      if (relation.status === "not_subset")
        return {
          status: "not_subset",
          reason: "candidate_prefix_is_not_within_owner_recursive_prefix",
        };
      if (relation.status === "unknown")
        return {
          status: "unknown",
          reason: "candidate_prefix_containment_is_unknown",
        };
    }
    return {
      status: "proven_subset",
      reason: "candidate_is_within_owner_recursive_subtree",
    };
  }

  const candidateRecursive = candidate.segments.some(
    (segment) => segment.kind === "recursive",
  );
  const ownerRecursive = owner.segments.some(
    (segment) => segment.kind === "recursive",
  );
  if (candidateRecursive && !ownerRecursive)
    return owner.segments.some(
      (segment) =>
        segment.kind === "segment" &&
        segment.tokens.some((token) => token.kind === "question"),
    )
      ? {
          status: "unknown",
          reason: "recursive_candidate_vs_question_owner_not_proven",
        }
      : {
          status: "not_subset",
          reason: "recursive_candidate_exceeds_non_recursive_owner",
        };
  if (candidateRecursive || ownerRecursive)
    return {
      status: "unknown",
      reason: "recursive_pattern_relation_not_proven",
    };
  if (candidate.segments.length !== owner.segments.length)
    return {
      status: "not_subset",
      reason: "candidate_and_owner_match_different_path_depths",
    };
  let unknown = false;
  for (let index = 0; index < owner.segments.length; index += 1) {
    const relation = segmentSubset(
      candidate.segments[index] as SegmentAst,
      owner.segments[index] as SegmentAst,
    );
    if (relation.status === "not_subset")
      return {
        status: "not_subset",
        reason: "candidate_segment_language_exceeds_owner_segment",
      };
    if (relation.status === "unknown") unknown = true;
  }
  return unknown
    ? {
        status: "unknown",
        reason: "segment_language_containment_not_proven",
      }
    : {
        status: "proven_subset",
        reason: "segment_languages_are_contained",
      };
}

export function classifyRepositoryPatternOverlap(
  leftInput: string,
  rightInput: string,
): PatternOverlap {
  const left = parseRepositoryPattern(leftInput, "left");
  const right = parseRepositoryPattern(rightInput, "right");
  const queue: Array<{ left: number; right: number; unknown: boolean }> = [
    { left: 0, right: 0, unknown: false },
  ];
  const visited = new Set<string>();
  let unknownAcceptance = false;
  while (queue.length) {
    const state = queue.shift()!;
    const key = `${state.left}:${state.right}:${state.unknown ? 1 : 0}`;
    if (visited.has(key)) continue;
    visited.add(key);
    if (
      state.left === left.segments.length &&
      state.right === right.segments.length
    ) {
      if (!state.unknown)
        return {
          status: "proven_overlap",
          reason: "pattern_languages_have_a_proven_common_path",
        };
      unknownAcceptance = true;
      continue;
    }
    const leftSegment = left.segments[state.left];
    const rightSegment = right.segments[state.right];
    if (leftSegment?.kind === "recursive")
      queue.push({
        left: state.left + 1,
        right: state.right,
        unknown: state.unknown,
      });
    if (rightSegment?.kind === "recursive")
      queue.push({
        left: state.left,
        right: state.right + 1,
        unknown: state.unknown,
      });
    if (!leftSegment || !rightSegment) continue;
    if (leftSegment.kind === "recursive" && rightSegment.kind === "recursive")
      continue;
    if (leftSegment.kind === "recursive") {
      queue.push({
        left: state.left,
        right: state.right + 1,
        unknown: state.unknown,
      });
      continue;
    }
    if (rightSegment.kind === "recursive") {
      queue.push({
        left: state.left + 1,
        right: state.right,
        unknown: state.unknown,
      });
      continue;
    }
    const overlap = segmentOverlap(leftSegment, rightSegment);
    if (overlap.status !== "proven_disjoint")
      queue.push({
        left: state.left + 1,
        right: state.right + 1,
        unknown: state.unknown || overlap.status === "unknown",
      });
  }
  return unknownAcceptance
    ? {
        status: "unknown",
        reason: "pattern_overlap_depends_on_unproven_segment_relation",
      }
    : {
        status: "proven_disjoint",
        reason: "pattern_languages_have_no_common_path",
      };
}

export function repositoryPatternsMayOverlap(
  left: string,
  right: string,
): boolean {
  return (
    classifyRepositoryPatternOverlap(left, right).status !== "proven_disjoint"
  );
}

type SegmentAst = Extract<RepositoryPatternSegmentAst, { kind: "segment" }>;

type SegmentRelation =
  | { status: "proven_subset" }
  | { status: "not_subset" }
  | { status: "unknown" };

function segmentSubset(
  candidate: SegmentAst,
  owner: SegmentAst,
): SegmentRelation {
  if (candidate.raw === owner.raw) return { status: "proven_subset" };
  if (isUniversalSegment(owner)) return { status: "proven_subset" };
  if (isLiteralSegment(candidate))
    return segmentMatches(candidate.raw, owner)
      ? { status: "proven_subset" }
      : { status: "not_subset" };
  if (isLiteralSegment(owner) || isUniversalSegment(candidate))
    return { status: "not_subset" };
  const candidateSuffix = simpleSuffix(candidate);
  const ownerSuffix = simpleSuffix(owner);
  if (candidateSuffix !== null && ownerSuffix !== null)
    return candidateSuffix.endsWith(ownerSuffix)
      ? { status: "proven_subset" }
      : { status: "not_subset" };
  return { status: "unknown" };
}

function segmentOverlap(left: SegmentAst, right: SegmentAst): PatternOverlap {
  if (left.raw === right.raw)
    return { status: "proven_overlap", reason: "segments_are_equal" };
  if (isLiteralSegment(left))
    return segmentMatches(left.raw, right)
      ? { status: "proven_overlap", reason: "left_literal_matches_right" }
      : { status: "proven_disjoint", reason: "left_literal_rejected" };
  if (isLiteralSegment(right))
    return segmentMatches(right.raw, left)
      ? { status: "proven_overlap", reason: "right_literal_matches_left" }
      : { status: "proven_disjoint", reason: "right_literal_rejected" };
  if (isUniversalSegment(left) || isUniversalSegment(right))
    return {
      status: "proven_overlap",
      reason: "universal_segment_has_nonempty_intersection",
    };
  const leftSuffix = simpleSuffix(left);
  const rightSuffix = simpleSuffix(right);
  if (leftSuffix !== null && rightSuffix !== null)
    return leftSuffix.endsWith(rightSuffix) || rightSuffix.endsWith(leftSuffix)
      ? {
          status: "proven_overlap",
          reason: "suffix_languages_have_a_common_value",
        }
      : {
          status: "proven_disjoint",
          reason: "suffix_languages_are_disjoint",
        };
  const leftFixed = fixedWidthTokens(left);
  const rightFixed = fixedWidthTokens(right);
  if (leftFixed && rightFixed) {
    if (leftFixed.length !== rightFixed.length)
      return {
        status: "proven_disjoint",
        reason: "fixed_width_segments_have_different_lengths",
      };
    for (let index = 0; index < leftFixed.length; index += 1)
      if (
        leftFixed[index] !== null &&
        rightFixed[index] !== null &&
        leftFixed[index] !== rightFixed[index]
      )
        return {
          status: "proven_disjoint",
          reason: "fixed_width_literal_positions_conflict",
        };
    return {
      status: "proven_overlap",
      reason: "fixed_width_segments_have_a_common_value",
    };
  }
  return {
    status: "unknown",
    reason: "segment_overlap_not_proven",
  };
}

function matchesAst(file: string, pattern: RepositoryPatternAst): boolean {
  return matchesRepoPattern(file, pattern.normalized);
}

function segmentMatches(fileSegment: string, pattern: SegmentAst): boolean {
  return segmentExpression(pattern).test(fileSegment);
}

function segmentExpression(pattern: SegmentAst): RegExp {
  const expression = pattern.tokens
    .map((token) => {
      if (token.kind === "star") return ".*";
      if (token.kind === "question") return ".";
      return escapeRegex(token.value);
    })
    .join("");
  return new RegExp(`^${expression}$`, "u");
}

function isExactPattern(pattern: RepositoryPatternAst): boolean {
  return pattern.segments.every(
    (segment) => segment.kind === "segment" && isLiteralSegment(segment),
  );
}

function isGlobalRecursive(pattern: RepositoryPatternAst): boolean {
  return (
    pattern.segments.length === 1 && pattern.segments[0].kind === "recursive"
  );
}

function recursiveTailPrefix(
  pattern: RepositoryPatternAst,
): SegmentAst[] | null {
  if (
    pattern.segments.at(-1)?.kind !== "recursive" ||
    pattern.segments
      .slice(0, -1)
      .some((segment) => segment.kind === "recursive")
  )
    return null;
  return pattern.segments.slice(0, -1) as SegmentAst[];
}

function requiredLeadingSegments(pattern: RepositoryPatternAst): SegmentAst[] {
  const result: SegmentAst[] = [];
  for (const segment of pattern.segments) {
    if (segment.kind === "recursive") break;
    result.push(segment);
  }
  return result;
}

function isLiteralSegment(segment: SegmentAst): boolean {
  return segment.tokens.every((token) => token.kind === "literal");
}

function isUniversalSegment(segment: SegmentAst): boolean {
  return segment.tokens.length === 1 && segment.tokens[0].kind === "star";
}

function simpleSuffix(segment: SegmentAst): string | null {
  if (
    segment.tokens.length !== 2 ||
    segment.tokens[0].kind !== "star" ||
    segment.tokens[1].kind !== "literal"
  )
    return null;
  return segment.tokens[1].value;
}

function fixedWidthTokens(segment: SegmentAst): Array<string | null> | null {
  if (segment.tokens.some((token) => token.kind === "star")) return null;
  return segment.tokens.flatMap((token) =>
    token.kind === "question"
      ? [null]
      : token.kind === "literal"
        ? [...token.value].map((character) => character)
        : [],
  );
}

function canonicalRepositoryPath(
  value: string,
  label: string,
  kind: "pattern" | "file" | "cwd",
): string {
  if (/[\0\r\n\t]/u.test(value))
    throw new Error(`unsafe_path:${label}:control_character`);
  const slashed = value.replace(/\\/gu, "/");
  if (kind === "cwd" && slashed === ".") return ".";
  const normalized = slashed.startsWith("./") ? slashed.slice(2) : slashed;
  if (
    !normalized ||
    path.posix.isAbsolute(normalized) ||
    normalized.startsWith("//") ||
    /^[A-Za-z]:/u.test(normalized)
  )
    throw new Error(`unsafe_path:${label}:${value}`);
  const segments = normalized.split("/");
  if (segments.some((segment) => !segment))
    throw new Error(`unsafe_path:${label}:${value}`);
  if (segments.includes("."))
    throw new Error(
      `non_canonical_repository_path_dot_segment:${label}:${value}`,
    );
  if (segments.includes("..")) throw new Error(`unsafe_path:${label}:${value}`);
  if (kind !== "pattern" && /[*?\[\]{}]/u.test(normalized))
    throw new Error(`unsupported_repository_path_syntax:${label}:${value}`);
  return normalized;
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}
