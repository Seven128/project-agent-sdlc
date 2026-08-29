import { createHash } from "node:crypto";
import type { AcquiredDesignAuthorityText } from "./design-authority-files.js";
import {
  DESIGN_AUTHORITY_LIMITS,
  type DesignAuthorityClosureMember,
} from "./design-authority-types.js";

export interface DesignAuthorityDigestMember extends AcquiredDesignAuthorityText {
  kind: DesignAuthorityClosureMember["kind"];
}

export function digestDesignAuthorityMembers(
  members: DesignAuthorityDigestMember[],
): string {
  const hash = createHash("sha256");
  for (const member of sortDesignAuthorityMembers(members)) {
    const pathBytes = Buffer.from(member.path, "utf8");
    hash.update(uint64(pathBytes.length));
    hash.update(pathBytes);
    hash.update(uint64(member.normalized.length));
    hash.update(member.normalized);
  }
  return `sha256:${hash.digest("hex")}`;
}

export function projectDesignAuthorityMembers(
  members: DesignAuthorityDigestMember[],
): DesignAuthorityClosureMember[] {
  return sortDesignAuthorityMembers(members).map((member) => ({
    path: member.path,
    kind: member.kind,
    content_sha256: `sha256:${createHash("sha256")
      .update(member.normalized)
      .digest("hex")}`,
    normalized_bytes: member.normalized.length,
  }));
}

export function enforceDesignAuthorityTotalLimit(
  members: DesignAuthorityDigestMember[],
): void {
  const total = members.reduce(
    (sum, member) => sum + member.normalized.length,
    0,
  );
  if (total > DESIGN_AUTHORITY_LIMITS.max_total_bytes)
    throw new Error(`design_authority_invalid:total_limit_exceeded:${total}`);
}

function sortDesignAuthorityMembers<T extends { path: string }>(
  members: T[],
): T[] {
  return [...members].sort((left, right) =>
    Buffer.from(left.path).compare(Buffer.from(right.path)),
  );
}

function uint64(value: number): Buffer {
  const result = Buffer.alloc(8);
  result.writeBigUInt64BE(BigInt(value));
  return result;
}
