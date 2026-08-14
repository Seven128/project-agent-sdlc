import { assert } from "./long_task_real_process_roi_scoring.mjs";

export function parseStrictJson(bytes, code) {
  try {
    assert(
      !(bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf),
      `${code}:utf8`,
    );
    let content;
    try {
      content = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    } catch {
      assert(false, `${code}:utf8`);
    }
    const parsed = JSON.parse(content);
    assertUniqueJsonKeys(content, code);
    return parsed;
  } catch (error) {
    if (String(error?.message).startsWith("real_process_roi_invalid:"))
      throw error;
    assert(false, code);
  }
}

function assertUniqueJsonKeys(content, code) {
  let index = 0;
  const skipWhitespace = () => {
    while (/\s/u.test(content[index] ?? "")) index += 1;
  };
  const readString = () => {
    const start = index;
    index += 1;
    while (index < content.length) {
      if (content[index] === "\\") {
        index += 2;
        continue;
      }
      if (content[index] === '"') {
        index += 1;
        return JSON.parse(content.slice(start, index));
      }
      index += 1;
    }
    assert(false, `${code}:string`);
  };
  const readValue = (depth) => {
    assert(depth <= 64, `${code}:depth`);
    skipWhitespace();
    if (content[index] === '"') {
      readString();
      return;
    }
    if (content[index] === "{") {
      index += 1;
      skipWhitespace();
      const keys = new Set();
      if (content[index] === "}") {
        index += 1;
        return;
      }
      while (index < content.length) {
        assert(content[index] === '"', `${code}:object_key`);
        const key = readString();
        assert(!keys.has(key), `${code}:duplicate_key:${key}`);
        keys.add(key);
        skipWhitespace();
        assert(content[index] === ":", `${code}:object_colon`);
        index += 1;
        readValue(depth + 1);
        skipWhitespace();
        if (content[index] === "}") {
          index += 1;
          return;
        }
        assert(content[index] === ",", `${code}:object_separator`);
        index += 1;
        skipWhitespace();
      }
    }
    if (content[index] === "[") {
      index += 1;
      skipWhitespace();
      if (content[index] === "]") {
        index += 1;
        return;
      }
      while (index < content.length) {
        readValue(depth + 1);
        skipWhitespace();
        if (content[index] === "]") {
          index += 1;
          return;
        }
        assert(content[index] === ",", `${code}:array_separator`);
        index += 1;
      }
    }
    const start = index;
    while (index < content.length && !/[\s,}\]]/u.test(content[index]))
      index += 1;
    assert(index > start, `${code}:value`);
  };
  readValue(0);
  skipWhitespace();
  assert(index === content.length, `${code}:trailing`);
}
