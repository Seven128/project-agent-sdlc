import { createHash } from "node:crypto";
import { gunzipSync } from "node:zlib";
import { FORMAL_EVIDENCE_CAPACITY } from "./long_task_real_process_schema_policy.mjs";

export function readPackedPackageIdentity(tarballBytes) {
  if (!Buffer.isBuffer(tarballBytes) || tarballBytes.length === 0)
    throw new Error("real_process_roi_package_tarball_bytes");
  let archive;
  try {
    archive = gunzipSync(tarballBytes, {
      maxOutputLength: FORMAL_EVIDENCE_CAPACITY.maximum_lifecycle_file_bytes,
    });
  } catch (error) {
    throw new Error("real_process_roi_package_tarball_gzip", { cause: error });
  }
  let packageJson = null;
  for (let offset = 0; offset + 512 <= archive.length;) {
    const header = archive.subarray(offset, offset + 512);
    if (header.every((value) => value === 0)) break;
    const name = tarText(header.subarray(0, 100));
    const prefix = tarText(header.subarray(345, 500));
    const relative = prefix ? `${prefix}/${name}` : name;
    const size = tarOctal(header.subarray(124, 136));
    const bodyStart = offset + 512;
    const bodyEnd = bodyStart + size;
    if (bodyEnd > archive.length)
      throw new Error("real_process_roi_package_tarball_truncated");
    if (relative === "package/package.json") {
      if (packageJson !== null)
        throw new Error("real_process_roi_package_manifest_duplicate");
      try {
        packageJson = JSON.parse(
          archive.subarray(bodyStart, bodyEnd).toString("utf8"),
        );
      } catch (error) {
        throw new Error("real_process_roi_package_manifest_json", {
          cause: error,
        });
      }
    }
    offset = bodyStart + Math.ceil(size / 512) * 512;
  }
  if (
    !packageJson ||
    typeof packageJson !== "object" ||
    Array.isArray(packageJson) ||
    packageJson.name !== "project-tiny-context-harness" ||
    typeof packageJson.version !== "string" ||
    !/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/u.test(packageJson.version)
  )
    throw new Error("real_process_roi_package_manifest_identity");
  return Object.freeze({
    package_name: packageJson.name,
    package_version: packageJson.version,
    package_sha256: digest(tarballBytes),
  });
}

function digest(value) {
  return createHash("sha256").update(value).digest("hex");
}

function tarText(bytes) {
  const zero = bytes.indexOf(0);
  return bytes.subarray(0, zero === -1 ? bytes.length : zero).toString("utf8");
}

function tarOctal(bytes) {
  const text = tarText(bytes).trim().replace(/^0+/u, "") || "0";
  if (!/^[0-7]+$/u.test(text))
    throw new Error("real_process_roi_package_tarball_size");
  const size = Number.parseInt(text, 8);
  if (!Number.isSafeInteger(size) || size < 0)
    throw new Error("real_process_roi_package_tarball_size");
  return size;
}
