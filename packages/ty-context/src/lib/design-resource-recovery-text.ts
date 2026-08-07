import type {
  DesignResourceEolPolicy,
  DesignResourceTextEncoding,
} from "./design-resource-recovery-types.js";
import type { DesignResourceExactPatch } from "./design-resource-recovery-patch-types.js";

export interface DesignResourceDecodedText {
  text: string;
  encoding: DesignResourceTextEncoding;
  eol_policy: DesignResourceEolPolicy;
}

export function decodeDesignResourceText(
  bytes: Uint8Array,
): DesignResourceDecodedText {
  let encoding: DesignResourceTextEncoding;
  let body: Uint8Array;
  if (startsWith(bytes, [0xef, 0xbb, 0xbf])) {
    encoding = "utf8-bom";
    body = bytes.subarray(3);
  } else if (startsWith(bytes, [0xff, 0xfe])) {
    encoding = "utf16le";
    body = bytes.subarray(2);
  } else if (startsWith(bytes, [0xfe, 0xff])) {
    encoding = "utf16be";
    body = swapUtf16(bytes.subarray(2));
  } else {
    encoding = "utf8";
    body = bytes;
  }
  if ((encoding === "utf16le" || encoding === "utf16be") && body.length % 2)
    invalid("odd_utf16_byte_length");
  let text: string;
  try {
    text = new TextDecoder(
      encoding === "utf16le" || encoding === "utf16be" ? "utf-16le" : "utf-8",
      { fatal: true },
    ).decode(body);
  } catch {
    invalid(`invalid_${encoding}`);
  }
  if (text.includes("\0")) invalid("nul_character_not_allowed");
  return { text, encoding, eol_policy: detectEolPolicy(text) };
}

export function encodeDesignResourceText(
  text: string,
  encoding: DesignResourceTextEncoding,
): Buffer {
  if (text.includes("\0")) invalid("nul_character_not_allowed");
  if (encoding === "utf8") return Buffer.from(text, "utf8");
  if (encoding === "utf8-bom")
    return Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), Buffer.from(text)]);
  const littleEndian = Buffer.from(text, "utf16le");
  if (encoding === "utf16le")
    return Buffer.concat([Buffer.from([0xff, 0xfe]), littleEndian]);
  return Buffer.concat([
    Buffer.from([0xfe, 0xff]),
    Buffer.from(swapUtf16(littleEndian)),
  ]);
}

export function applyDesignResourceExactPatch(
  bytes: Uint8Array,
  patch: DesignResourceExactPatch,
  expectedEncoding?: DesignResourceTextEncoding,
  expectedEol?: Exclude<DesignResourceEolPolicy, "mixed">,
): {
  bytes: Buffer;
  encoding: DesignResourceTextEncoding;
  eol_policy: Exclude<DesignResourceEolPolicy, "mixed">;
} {
  const decoded = decodeDesignResourceText(bytes);
  if (decoded.eol_policy === "mixed")
    invalid("mixed_eol_writeback_unsupported");
  if (expectedEncoding && decoded.encoding !== expectedEncoding)
    invalid(`encoding_changed:${expectedEncoding}:${decoded.encoding}`);
  if (expectedEol && decoded.eol_policy !== expectedEol)
    invalid(`eol_changed:${expectedEol}:${decoded.eol_policy}`);
  let text = decoded.text;
  for (const operation of patch.operations) {
    const count = occurrenceCount(text, operation.before_text);
    if (count !== operation.expected_occurrences)
      invalid(
        `patch_occurrence_mismatch:${operation.operation_id}:${operation.expected_occurrences}:${count}`,
      );
    text = text.replace(operation.before_text, operation.after_text);
  }
  assertPatchAfterTextOccurrences(text, patch);
  const postEol = detectEolPolicy(text);
  if (postEol !== decoded.eol_policy)
    invalid(`patch_changes_eol_policy:${decoded.eol_policy}:${postEol}`);
  return {
    bytes: encodeDesignResourceText(text, decoded.encoding),
    encoding: decoded.encoding,
    eol_policy: decoded.eol_policy,
  };
}

export function verifyDesignResourceExactPatchReadback(
  bytes: Uint8Array,
  patch: DesignResourceExactPatch,
): void {
  const decoded = decodeDesignResourceText(bytes);
  assertPatchAfterTextOccurrences(decoded.text, patch);
}

export function verifyDesignResourceSupersededTextReadback(
  bytes: Uint8Array,
  patch: DesignResourceExactPatch,
  supersedingDeltaIds: ReadonlySet<string>,
): void {
  const text = decodeDesignResourceText(bytes).text;
  for (const operation of patch.operations) {
    if (!supersedingDeltaIds.has(operation.delta_id)) continue;
    const count = occurrenceCount(text, operation.before_text);
    if (count !== 0)
      invalid(
        `superseded_before_text_leakage:${operation.operation_id}:${count}`,
      );
  }
}

export function detectEolPolicy(text: string): DesignResourceEolPolicy {
  const withoutCrLf = text.replace(/\r\n/gu, "");
  const kinds = [
    text.includes("\r\n") ? "crlf" : null,
    withoutCrLf.includes("\n") ? "lf" : null,
    withoutCrLf.includes("\r") ? "cr" : null,
  ].filter((value): value is "crlf" | "lf" | "cr" => value !== null);
  if (!kinds.length) return "none";
  return kinds.length === 1 ? kinds[0] : "mixed";
}

function occurrenceCount(value: string, search: string): number {
  if (!search) invalid("patch_before_text_empty");
  let count = 0;
  let offset = 0;
  while (true) {
    const found = value.indexOf(search, offset);
    if (found < 0) return count;
    count += 1;
    offset = found + search.length;
  }
}

function assertPatchAfterTextOccurrences(
  text: string,
  patch: DesignResourceExactPatch,
): void {
  for (const operation of patch.operations) {
    const remove = operation.operation === "remove";
    const count = occurrenceCount(
      text,
      remove ? operation.before_text : operation.after_text,
    );
    const expected = remove ? 0 : operation.expected_occurrences;
    if (count !== expected)
      invalid(
        `${remove ? "patch_remove_before_still_present" : "patch_after_occurrence_mismatch"}:${operation.operation_id}:${expected}:${count}`,
      );
  }
}

function startsWith(bytes: Uint8Array, prefix: number[]): boolean {
  return prefix.every((value, index) => bytes[index] === value);
}

function swapUtf16(bytes: Uint8Array): Uint8Array {
  const result = Uint8Array.from(bytes);
  for (let index = 0; index < result.length; index += 2) {
    const first = result[index];
    result[index] = result[index + 1];
    result[index + 1] = first;
  }
  return result;
}

function invalid(reason: string): never {
  throw new Error(`design_resource_recovery_invalid:text:${reason}`);
}
