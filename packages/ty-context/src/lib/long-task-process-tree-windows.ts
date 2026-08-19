import {
  indexProcessRows,
  processCreatedWithin,
  processIdentitiesEqual,
  processIdentity,
  processIdentityKey,
  sameProcessSnapshot,
  type ProcessIdentity,
  type ProcessSnapshotRow,
  type ProcessTreeController,
  type ProcessTreeOptions,
  type ProcessTreeRuntime,
  unixMsToWindowsFileTime,
} from "./long-task-process-tree-runtime.js";
interface ObservedProcess {
  identity: ProcessIdentity;
  depth: number;
}

export function windowsProcessTreeController(
  options: ProcessTreeOptions,
  runtime: ProcessTreeRuntime,
  graceMs: number,
): ProcessTreeController {
  return new WindowsProcessTreeController(options, runtime, graceMs);
}

class WindowsProcessTreeController implements ProcessTreeController {
  private readonly windowStart: bigint;
  private readonly observed = new Map<string, ObservedProcess>();
  private rootIdentity: ProcessIdentity | null = null;
  private ambiguity = false;

  constructor(
    private readonly options: ProcessTreeOptions,
    private readonly runtime: ProcessTreeRuntime,
    private readonly graceMs: number,
  ) {
    this.windowStart = unixMsToWindowsFileTime(options.spawnedAtMs);
  }

  observeUntil(stopped: () => boolean): Promise<void> {
    return observeUntil(() => this.observe(), stopped, this.runtime);
  }

  async terminate(force: boolean): Promise<void> {
    let inspectionError: unknown = null;
    try {
      await this.observe(this.runtime.now());
    } catch (error) {
      inspectionError = error;
    } finally {
      this.options.terminateRoot(force);
    }
    if (inspectionError) throw inspectionError;
    this.requireUnambiguous();
    await this.terminateObserved(force);
  }

  async assertQuiescent(completedAtMs: number): Promise<void> {
    await this.observe(completedAtMs);
    this.requireUnambiguous();
    if ((await this.liveObserved()).length === 0) return;
    await this.terminateObserved(true);
    await this.waitForQuiescence();
    throw new Error("process_observer_descendant_process_alive");
  }

  async forceQuiescence(completedAtMs: number): Promise<void> {
    await this.observe(completedAtMs);
    this.requireUnambiguous();
    await this.terminateObserved(true);
    await this.waitForQuiescence();
  }

  private bindRoot(
    row: ProcessSnapshotRow | undefined,
    cutoff: bigint,
  ): ProcessIdentity | null {
    if (!row) return null;
    if (row.creation_filetime_utc === null) {
      this.ambiguity = true;
      return null;
    }
    const candidate = processIdentity(row);
    if (
      this.rootIdentity &&
      processIdentitiesEqual(candidate, this.rootIdentity)
    )
      return this.rootIdentity;
    const created = BigInt(candidate.creation_filetime_utc);
    if (
      !this.options.rootIsOpen() ||
      created < this.windowStart ||
      created > cutoff
    )
      return null;
    if (this.rootIdentity) {
      this.ambiguity = true;
      return null;
    }
    this.rootIdentity = candidate;
    return this.rootIdentity;
  }

  private discoverCurrentChildren(
    rows: readonly ProcessSnapshotRow[],
    seeds: readonly ObservedProcess[],
    cutoff: bigint,
  ): void {
    const pending = [...seeds];
    const visited = new Set(
      seeds.map((item) => processIdentityKey(item.identity)),
    );
    while (pending.length > 0) {
      const parent = pending.shift()!;
      const parentCreated = BigInt(parent.identity.creation_filetime_utc);
      for (const row of rows) {
        if (row.parent_pid !== parent.identity.pid) continue;
        if (row.creation_filetime_utc === null) {
          this.ambiguity = true;
          continue;
        }
        const created = BigInt(row.creation_filetime_utc);
        if (created < parentCreated || created > cutoff) continue;
        const child = processIdentity(row);
        const key = processIdentityKey(child);
        if (
          visited.has(key) ||
          processIdentitiesEqual(child, this.rootIdentity)
        )
          continue;
        visited.add(key);
        const item = { identity: child, depth: parent.depth + 1 };
        this.observed.set(key, item);
        pending.push(item);
      }
    }
  }

  private detectUnboundChildren(
    rows: readonly ProcessSnapshotRow[],
    byPid: ReadonlyMap<number, ProcessSnapshotRow>,
    cutoff: bigint,
    rootRow: ProcessSnapshotRow | undefined,
  ): void {
    if (!this.rootIdentity) {
      const replacementCreated = rootRow?.creation_filetime_utc
        ? BigInt(rootRow.creation_filetime_utc)
        : null;
      for (const row of rows) {
        if (row.parent_pid !== this.options.rootPid) continue;
        const childCreated = row.creation_filetime_utc
          ? BigInt(row.creation_filetime_utc)
          : null;
        if (
          childCreated !== null &&
          replacementCreated !== null &&
          childCreated >= replacementCreated
        )
          continue;
        if (processCreatedWithin(row, this.windowStart, cutoff))
          this.ambiguity = true;
      }
      return;
    }
    const parents: ObservedProcess[] = [
      ...(this.rootIdentity ? [{ identity: this.rootIdentity, depth: 0 }] : []),
      ...this.observed.values(),
    ];
    for (const parent of parents) {
      const currentParent = byPid.get(parent.identity.pid);
      if (sameProcessSnapshot(currentParent, parent.identity)) continue;
      const replacementCreated = currentParent?.creation_filetime_utc
        ? BigInt(currentParent.creation_filetime_utc)
        : null;
      const parentCreated = BigInt(parent.identity.creation_filetime_utc);
      for (const row of rows) {
        if (row.parent_pid !== parent.identity.pid) continue;
        const child =
          row.creation_filetime_utc === null ? null : processIdentity(row);
        if (
          child &&
          replacementCreated !== null &&
          BigInt(child.creation_filetime_utc) >= replacementCreated
        )
          continue;
        if (
          processCreatedWithin(row, parentCreated, cutoff) &&
          (!child || !this.observed.has(processIdentityKey(child)))
        )
          this.ambiguity = true;
      }
    }
  }

  private async observe(rootCutoffMs = this.runtime.now()): Promise<void> {
    const rows = await this.runtime.snapshot();
    const rootCutoff = unixMsToWindowsFileTime(rootCutoffMs);
    const observationCutoff = unixMsToWindowsFileTime(this.runtime.now());
    const byPid = indexProcessRows(rows);
    const rootRow = byPid.get(this.options.rootPid);
    const rootCurrent = this.bindRoot(rootRow, rootCutoff);
    const liveParents: ObservedProcess[] = [];
    if (rootCurrent) liveParents.push({ identity: rootCurrent, depth: 0 });
    for (const item of this.observed.values())
      if (sameProcessSnapshot(byPid.get(item.identity.pid), item.identity))
        liveParents.push(item);
    this.discoverCurrentChildren(rows, liveParents, observationCutoff);
    this.detectUnboundChildren(rows, byPid, rootCutoff, rootRow);
  }

  private async liveObserved(): Promise<ObservedProcess[]> {
    if (this.observed.size === 0) return [];
    const byPid = indexProcessRows(await this.runtime.snapshot());
    return [...this.observed.values()].filter((item) =>
      sameProcessSnapshot(byPid.get(item.identity.pid), item.identity),
    );
  }

  private async terminateObserved(force: boolean): Promise<void> {
    if (this.observed.size === 0) return;
    const targets = (await this.liveObserved()).sort(
      (left, right) => right.depth - left.depth,
    );
    for (const target of targets) {
      const current = indexProcessRows(await this.runtime.snapshot()).get(
        target.identity.pid,
      );
      if (!sameProcessSnapshot(current, target.identity)) continue;
      try {
        await this.runtime.terminatePid(target.identity.pid, force);
      } catch (error) {
        const after = indexProcessRows(await this.runtime.snapshot()).get(
          target.identity.pid,
        );
        if (sameProcessSnapshot(after, target.identity))
          throw new Error(
            `process_observer_process_tree_termination_failed:${message(error)}`,
          );
      }
    }
  }

  private requireUnambiguous(): void {
    if (this.ambiguity)
      throw new Error("process_observer_process_tree_identity_ambiguous");
  }

  private async waitForQuiescence(): Promise<void> {
    const deadline = this.runtime.now() + this.graceMs;
    while (this.runtime.now() < deadline) {
      if ((await this.liveObserved()).length === 0) return;
      await this.terminateObserved(true);
      await this.runtime.sleep(100);
    }
    throw new Error("process_observer_descendant_process_alive");
  }
}

async function observeUntil(
  observe: () => Promise<void>,
  stopped: () => boolean,
  runtime: ProcessTreeRuntime,
): Promise<void> {
  do {
    await observe();
    if (stopped()) return;
    await runtime.sleep(100);
  } while (!stopped());
}

function message(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
