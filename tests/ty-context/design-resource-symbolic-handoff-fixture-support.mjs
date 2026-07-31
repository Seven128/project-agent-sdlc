import { createHash } from "node:crypto";

export function fixtureResource(key, role, resourcePath, mediaType, content) {
  return {
    key,
    role,
    path: resourcePath,
    media_type: mediaType,
    sha256: fixtureSha(content),
    editable_upstream: {
      owner: "fixture",
      locator: resourcePath,
      update_route: "regenerate fixture",
    },
  };
}

export function fixtureSha(value) {
  return createHash("sha256").update(value).digest("hex");
}

export function fixtureStableJson(value) {
  if (Array.isArray(value))
    return `[${value.map((entry) => fixtureStableJson(entry)).join(",")}]`;
  if (value && typeof value === "object")
    return `{${Object.entries(value)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(
        ([key, entry]) =>
          `${JSON.stringify(key)}:${fixtureStableJson(entry)}`,
      )
      .join(",")}}`;
  return JSON.stringify(value);
}
