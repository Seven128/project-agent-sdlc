import type {
  DesignResourceEolPolicy,
  DesignResourceTextEncoding,
} from "./design-resource-recovery-types.js";
import type { DesignResourceExactPatch } from "./design-resource-recovery-patch-types.js";
import { sha256Hex } from "./strict-codec.js";

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
  const operations = resolveOriginalSourceSpans(decoded.text, patch);
  let text = decoded.text;
  for (const operation of [...operations].reverse()) {
    const { start_offset: start, end_offset: end } = operation.source_span;
    text = `${text.slice(0, start)}${operation.after_text}${text.slice(end)}`;
  }
  assertPatchFinalIntervals(text, patch);
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
  assertPatchFinalIntervals(decoded.text, patch);
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

function resolveOriginalSourceSpans(
  text: string,
  patch: DesignResourceExactPatch,
): DesignResourceExactPatch["operations"] {
  const operations = [...patch.operations].sort(
    (left, right) =>
      left.source_span.start_offset - right.source_span.start_offset ||
      left.source_span.end_offset - right.source_span.end_offset ||
      left.operation_id.localeCompare(right.operation_id),
  );
  let previous: (typeof operations)[number] | undefined;
  for (const operation of operations) {
    const span = operation.source_span;
    if (
      span.coordinate_system !== "utf16-code-unit-v1" ||
      span.start_offset < 0 ||
      span.end_offset <= span.start_offset ||
      span.end_offset > text.length ||
      span.end_offset - span.start_offset !== operation.before_text.length
    )
      invalid(`patch_source_span_range:${operation.operation_id}`);
    const actual = text.slice(span.start_offset, span.end_offset);
    if (
      actual !== operation.before_text ||
      sha256Hex(actual) !== span.before_text_sha256 ||
      span.before_text_sha256 !== operation.before_text_sha256
    )
      invalid(`patch_source_span_preimage:${operation.operation_id}`);
    if (
      (operation.operation === "remove" ||
        (operation.operation === "add" &&
          operation.after_text.startsWith(
            "<!-- ty-dra-proposal-scalar-v1 ",
          ))) &&
      span.start_offset > 0 &&
      !["\n", "\r"].includes(text[span.start_offset - 1])
    )
      invalid(`patch_carrier_line_boundary:${operation.operation_id}`);
    const count = occurrenceCount(text, operation.before_text);
    if (count !== operation.expected_occurrences)
      invalid(
        `patch_occurrence_mismatch:${operation.operation_id}:${operation.expected_occurrences}:${count}`,
      );
    if (previous && span.start_offset < previous.source_span.end_offset)
      invalid(
        `patch_source_span_overlap:${previous.operation_id}:${operation.operation_id}`,
      );
    previous = operation;
  }
  return operations;
}

function assertPatchFinalIntervals(
  text: string,
  patch: DesignResourceExactPatch,
): void {
  const operations = [...patch.operations].sort(
    (left, right) =>
      left.source_span.start_offset - right.source_span.start_offset ||
      left.source_span.end_offset - right.source_span.end_offset ||
      left.operation_id.localeCompare(right.operation_id),
  );
  let offsetDelta = 0;
  for (const operation of operations) {
    const start = operation.source_span.start_offset + offsetDelta;
    const end = start + operation.after_text.length;
    if (
      start < 0 ||
      end > text.length ||
      text.slice(start, end) !== operation.after_text
    )
      invalid(`patch_readback_output_span:${operation.operation_id}`);
    offsetDelta +=
      operation.after_text.length -
      (operation.source_span.end_offset - operation.source_span.start_offset);
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
