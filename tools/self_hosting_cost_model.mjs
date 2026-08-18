import { createHash } from "node:crypto";

const OMIT = Symbol("omit-from-stable-measurement");
const ABSOLUTE_PATH_SENTINEL = "<absolute-path-excluded>";

/**
 * Return the common explicit representation for a measurement that was not
 * observed. A reason is mandatory so callers cannot silently turn missing
 * provenance into a zero.
 */
export function unavailableMeasurement(reason, details) {
  if (typeof reason !== "string" || reason.length === 0) {
    throw new TypeError("unavailable_measurement_reason_required");
  }
  const result = { availability: "unavailable", reason };
  if (details !== undefined) result.details = stableJsonClone(details);
  return result;
}

/** Return the matching explicit representation for an observed measurement. */
export function availableMeasurement(value, source = "measured") {
  if (typeof source !== "string" || source.length === 0) {
    throw new TypeError("available_measurement_source_required");
  }
  return {
    availability: "available",
    source,
    value: stableJsonClone(value),
  };
}

/**
 * Sort one comparable unit of hotspots. Mixing units is rejected instead of
 * manufacturing a dimensionless score. Ties use normalized POSIX key/path
 * identity, then the canonical entry bytes.
 */
export function sortHotspots(entries) {
  if (!Array.isArray(entries)) throw new TypeError("hotspots_must_be_an_array");
  const normalized = entries.map(normalizeHotspot);
  const units = new Set(normalized.map((entry) => entry.unit));
  if (units.size > 1) throw new TypeError("cross_unit_hotspot_sort_forbidden");
  return normalized.sort(compareHotspots);
}

/**
 * Group a heterogeneous measurement collection into independently ranked
 * units. The outer list is a deterministic unit index, not a global ranking.
 */
export function buildUnitHotspots(entries) {
  if (!Array.isArray(entries)) throw new TypeError("hotspots_must_be_an_array");
  const grouped = new Map();
  for (const entry of entries.map(normalizeHotspot)) {
    const group = grouped.get(entry.unit) ?? [];
    group.push(entry);
    grouped.set(entry.unit, group);
  }
  return [...grouped]
    .sort(([left], [right]) => compareText(left, right))
    .map(([unit, hotspots]) => ({ unit, hotspots: hotspots.sort(compareHotspots) }));
}

/**
 * Project a report into a stable, JSON-safe measurement identity. This removes
 * run-location/timestamp/wall-clock noise and compression/toolchain-bound
 * tarball metadata while retaining measured semantic values and unpacked file
 * identities.
 */
export function stableMeasurementProjection(value) {
  const projected = projectStableMeasurement(value, []);
  return projected === OMIT ? null : projected;
}

/** Return a deterministic SHA-256 over stableMeasurementProjection(value). */
export function stableMeasurementDigest(value) {
  const projected = stableMeasurementProjection(value);
  return createHash("sha256")
    .update(canonicalJson(projected), "utf8")
    .digest("hex");
}

function normalizeHotspot(entry) {
  if (!isPlainObject(entry)) throw new TypeError("hotspot_must_be_an_object");
  if (typeof entry.unit !== "string" || entry.unit.length === 0) {
    throw new TypeError("hotspot_unit_required");
  }
  if (!Number.isFinite(entry.value) || entry.value < 0) {
    throw new TypeError("hotspot_value_must_be_nonnegative_finite");
  }
  if (
    (typeof entry.key !== "string" || entry.key.length === 0) &&
    (typeof entry.path !== "string" || entry.path.length === 0)
  ) {
    throw new TypeError("hotspot_key_or_path_required");
  }
  const normalized = { ...entry, value: Object.is(entry.value, -0) ? 0 : entry.value };
  if (typeof normalized.key === "string") normalized.key = posixIdentity(normalized.key);
  if (typeof normalized.path === "string") normalized.path = posixIdentity(normalized.path);
  return stableJsonClone(normalized);
}

function compareHotspots(left, right) {
  if (left.value !== right.value) return right.value - left.value;
  const leftKey = left.key ?? left.path;
  const rightKey = right.key ?? right.path;
  const keyOrder = compareText(leftKey, rightKey);
  if (keyOrder !== 0) return keyOrder;
  const pathOrder = compareText(left.path ?? leftKey, right.path ?? rightKey);
  if (pathOrder !== 0) return pathOrder;
  return compareText(canonicalJson(left), canonicalJson(right));
}

function projectStableMeasurement(value, ancestors) {
  if (value === null || typeof value === "boolean" || typeof value === "string") {
    if (typeof value === "string" && isAbsolutePathLike(value)) {
      return ABSOLUTE_PATH_SENTINEL;
    }
    const ownerKey = ancestors.at(-1);
    return typeof value === "string" && isPathOrKeyField(ownerKey)
      ? posixIdentity(value)
      : value;
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new TypeError("measurement_numbers_must_be_finite");
    return Object.is(value, -0) ? 0 : value;
  }
  if (typeof value === "undefined") return OMIT;
  if (typeof value !== "object" || ArrayBuffer.isView(value) || value instanceof Date) {
    throw new TypeError("measurement_must_be_plain_json");
  }
  if (Array.isArray(value)) {
    return value.map((item) => {
      const projected = projectStableMeasurement(item, ancestors);
      return projected === OMIT ? null : projected;
    });
  }
  if (!isPlainObject(value)) throw new TypeError("measurement_must_be_plain_json");
  const result = {};
  for (const key of Object.keys(value).sort(compareText)) {
    if (
      isVolatileMeasurementKey(key) ||
      isTarballToolchainField(key, ancestors) ||
      isUnboundDiagnosticDetails(key, ancestors)
    )
      continue;
    const projected = projectStableMeasurement(value[key], [...ancestors, key]);
    if (projected !== OMIT) result[key] = projected;
  }
  return result;
}

function isUnboundDiagnosticDetails(key, ancestors) {
  if (key !== "details") return false;
  const normalized = ancestors.map(snakeCaseKey);
  return (
    (normalized.at(-1) === "timing" &&
      normalized.includes("test_suites")) ||
    (normalized.at(-1) === "current_report" &&
      normalized.includes("structural_cost_owner"))
  );
}

function isVolatileMeasurementKey(key) {
  const normalized = snakeCaseKey(key);
  return /^(?:absolute_path|absolute_root|workspace_root|repository_root|cwd)$/u.test(normalized)
    || /(?:^|_)(?:timestamp|generated_at|created_at|collected_at|started_at|finished_at|observed_at|mtime)$/u.test(normalized)
    || /(?:^|_)(?:wall_time|wall_clock|elapsed|duration|timing|timings)(?:_|$)/u.test(normalized)
    || /(?:^|_)time_(?:ns|us|ms|s|seconds)$/u.test(normalized)
    || /^(?:phase|phases|test|tests)_ms$/u.test(normalized);
}

function isTarballToolchainField(key, ancestors) {
  if (!ancestors.some((item) => /(?:^|_)(?:tarball|npm_pack|package_archive)(?:_|$)/u.test(snakeCaseKey(item)))) {
    return false;
  }
  const normalizedAncestors = ancestors.map(snakeCaseKey);
  const unpackedFileEntry = normalizedAncestors.at(-1) === "files"
    || normalizedAncestors.includes("unpacked_files");
  const normalizedKey = snakeCaseKey(key);
  if (unpackedFileEntry && /^(?:size|bytes)$/u.test(normalizedKey)) return false;
  return /^(?:filename|archive_filename|tarball_path|tarball_bytes|archive_bytes|packed_size|unpacked_size|size|bytes|shasum|integrity|mode|mtime|uid|gid|npm_version|node_version|toolchain)$/u.test(
    normalizedKey,
  );
}

function isPathOrKeyField(key) {
  if (typeof key !== "string") return false;
  return /(?:^|_)(?:path|file|key)$/u.test(snakeCaseKey(key));
}

function isAbsolutePathLike(value) {
  return value.startsWith("/")
    || value.startsWith("\\\\")
    || /^[A-Za-z]:[\\/]/u.test(value)
    || /^file:\/\//iu.test(value);
}

function posixIdentity(value) {
  return value.replace(/\\/gu, "/").replace(/\/{2,}/gu, "/");
}

function stableJsonClone(value) {
  const projected = cloneJson(value);
  if (projected === OMIT) return null;
  return projected;
}

function cloneJson(value) {
  if (value === null || typeof value === "string" || typeof value === "boolean") return value;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new TypeError("measurement_numbers_must_be_finite");
    return Object.is(value, -0) ? 0 : value;
  }
  if (typeof value === "undefined") return OMIT;
  if (Array.isArray(value)) {
    return value.map((item) => {
      const clone = cloneJson(item);
      return clone === OMIT ? null : clone;
    });
  }
  if (!isPlainObject(value)) throw new TypeError("measurement_must_be_plain_json");
  const result = {};
  for (const key of Object.keys(value).sort(compareText)) {
    const clone = cloneJson(value[key]);
    if (clone !== OMIT) result[key] = clone;
  }
  return result;
}

function canonicalJson(value) {
  return JSON.stringify(value);
}

function snakeCaseKey(key) {
  return key
    .replace(/([a-z0-9])([A-Z])/gu, "$1_$2")
    .replace(/[-.\s]+/gu, "_")
    .toLowerCase();
}

function compareText(left, right) {
  if (left === right) return 0;
  return left < right ? -1 : 1;
}

function isPlainObject(value) {
  if (value === null || typeof value !== "object") return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}
