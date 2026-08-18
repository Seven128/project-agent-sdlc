import path from "node:path";
import { listFiles, pathExists, readText } from "./fs.js";
import type { SourceMapping } from "./types.js";

export interface PackageSourceFileMeasurement {
  path: string;
  utf8_bytes: number;
}

export type PackageSourceProjectionStatus =
  "current" | "missing" | "changed" | "unexpected";

export interface PackageSourceProjectionMeasurement {
  path: string;
  expected_utf8_bytes: number | null;
  actual_utf8_bytes: number | null;
  status: PackageSourceProjectionStatus;
}

export interface PackageSourceFileTotals {
  file_count: number;
  utf8_bytes: number;
}

export interface PackageSourceMappingInspection {
  source: string;
  target: string;
  mode: SourceMapping["mode"];
  canonical_source_files: PackageSourceFileMeasurement[];
  projected_target_files: PackageSourceProjectionMeasurement[];
  totals: {
    canonical_source: PackageSourceFileTotals;
    projected_expected: PackageSourceFileTotals;
    projected_actual: PackageSourceFileTotals;
  };
  parity: boolean;
  drift: string[];
}

export interface PackageSourceMappingsInspection {
  mappings: PackageSourceMappingInspection[];
  totals: {
    canonical_source: PackageSourceFileTotals;
    projected_expected: PackageSourceFileTotals;
    projected_actual: PackageSourceFileTotals;
  };
  parity: boolean;
  drift: string[];
}

export type RenderedPackageSourceMapping =
  string | Array<{ relative: string; content: string }>;

export interface PackageSourceInspectionInput {
  mapping: SourceMapping;
  rendered: RenderedPackageSourceMapping;
}

export type PackageSourceContentComparator = (
  actual: string,
  expected: string,
) => boolean;

export async function inspectRenderedPackageSourceMappings(
  projectRoot: string,
  inputs: PackageSourceInspectionInput[],
  contentMatches: PackageSourceContentComparator,
): Promise<PackageSourceMappingsInspection> {
  const mappings: PackageSourceMappingInspection[] = [];
  for (const input of inputs) {
    mappings.push(
      await inspectRenderedPackageSourceMapping(
        projectRoot,
        input,
        contentMatches,
      ),
    );
  }
  mappings.sort((left, right) =>
    compareText(
      `${left.target}\0${left.source}\0${left.mode}`,
      `${right.target}\0${right.source}\0${right.mode}`,
    ),
  );
  const drift = mappings.flatMap((mapping) => mapping.drift).sort(compareText);
  return {
    mappings,
    totals: {
      canonical_source: sumTotals(
        mappings.map((mapping) => mapping.totals.canonical_source),
      ),
      projected_expected: sumTotals(
        mappings.map((mapping) => mapping.totals.projected_expected),
      ),
      projected_actual: sumTotals(
        mappings.map((mapping) => mapping.totals.projected_actual),
      ),
    },
    parity: mappings.every((mapping) => mapping.parity),
    drift,
  };
}

export async function inspectRenderedPackageSourceMapping(
  projectRoot: string,
  input: PackageSourceInspectionInput,
  contentMatches: PackageSourceContentComparator,
  options: { sortPaths?: boolean } = {},
): Promise<PackageSourceMappingInspection> {
  const { mapping, rendered } = input;
  const canonicalSourceFiles: PackageSourceFileMeasurement[] = [];
  const expectedTargets = new Map<string, string>();
  const actualTargets = new Map<string, string>();

  if (typeof rendered === "string") {
    canonicalSourceFiles.push({
      path: normalizeRepositoryPath(mapping.source),
      utf8_bytes: utf8Bytes(
        await readText(path.join(projectRoot, mapping.source)),
      ),
    });
    expectedTargets.set(normalizeRepositoryPath(mapping.target), rendered);
    const target = path.join(projectRoot, mapping.target);
    if (await pathExists(target)) {
      actualTargets.set(
        normalizeRepositoryPath(mapping.target),
        await readText(target),
      );
    }
  } else {
    for (const item of rendered) {
      const relative = normalizeRepositoryPath(item.relative);
      canonicalSourceFiles.push({
        path: joinRepositoryPath(mapping.source, relative),
        utf8_bytes: utf8Bytes(item.content),
      });
      expectedTargets.set(
        joinRepositoryPath(mapping.target, relative),
        item.content,
      );
    }
    const target = path.join(projectRoot, mapping.target);
    for (const targetFile of await listFiles(target)) {
      if (path.basename(targetFile) === ".gitkeep") {
        continue;
      }
      const relative = normalizeRepositoryPath(
        path.relative(target, targetFile),
      );
      actualTargets.set(
        joinRepositoryPath(mapping.target, relative),
        await readText(targetFile),
      );
    }
  }

  canonicalSourceFiles.sort((left, right) =>
    compareText(left.path, right.path),
  );
  const targetPaths = [
    ...new Set([...expectedTargets.keys(), ...actualTargets.keys()]),
  ];
  if (options.sortPaths !== false) targetPaths.sort(compareText);
  const projectedTargetFiles = targetPaths.map(
    (targetPath): PackageSourceProjectionMeasurement => {
      const expected = expectedTargets.get(targetPath);
      const actual = actualTargets.get(targetPath);
      let status: PackageSourceProjectionStatus;
      if (expected === undefined) {
        status = "unexpected";
      } else if (contentMatches(actual ?? "", expected)) {
        // This intentionally matches checkSource's existing treatment of a
        // missing target as empty content, including for an empty projection.
        status = "current";
      } else if (actual === undefined) {
        status = "missing";
      } else {
        status = "changed";
      }
      return {
        path: targetPath,
        expected_utf8_bytes:
          expected === undefined ? null : utf8Bytes(expected),
        actual_utf8_bytes: actual === undefined ? null : utf8Bytes(actual),
        status,
      };
    },
  );
  const drift = projectedTargetFiles
    .filter((file) => file.status !== "current")
    .map((file) => file.path);

  return {
    source: normalizeRepositoryPath(mapping.source),
    target: normalizeRepositoryPath(mapping.target),
    mode: mapping.mode,
    canonical_source_files: canonicalSourceFiles,
    projected_target_files: projectedTargetFiles,
    totals: {
      canonical_source: totalsForFiles(canonicalSourceFiles),
      projected_expected: {
        file_count: expectedTargets.size,
        utf8_bytes: [...expectedTargets.values()].reduce(
          (total, content) => total + utf8Bytes(content),
          0,
        ),
      },
      projected_actual: {
        file_count: actualTargets.size,
        utf8_bytes: [...actualTargets.values()].reduce(
          (total, content) => total + utf8Bytes(content),
          0,
        ),
      },
    },
    parity: drift.length === 0,
    drift,
  };
}

function normalizeRepositoryPath(value: string): string {
  return value.replace(/\\/gu, "/").replace(/^\.\//u, "");
}

function joinRepositoryPath(base: string, relative: string): string {
  return path.posix.join(
    normalizeRepositoryPath(base),
    normalizeRepositoryPath(relative),
  );
}

function utf8Bytes(content: string): number {
  return Buffer.byteLength(content, "utf8");
}

function totalsForFiles(
  files: PackageSourceFileMeasurement[],
): PackageSourceFileTotals {
  return {
    file_count: files.length,
    utf8_bytes: files.reduce((total, file) => total + file.utf8_bytes, 0),
  };
}

function sumTotals(totals: PackageSourceFileTotals[]): PackageSourceFileTotals {
  return totals.reduce(
    (sum, current) => ({
      file_count: sum.file_count + current.file_count,
      utf8_bytes: sum.utf8_bytes + current.utf8_bytes,
    }),
    { file_count: 0, utf8_bytes: 0 },
  );
}

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}
