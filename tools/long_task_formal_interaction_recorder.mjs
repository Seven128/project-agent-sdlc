import { createInterface } from "node:readline";
import { REAL_PROCESS_SCHEMAS } from "./long_task_real_process_schema_policy.mjs";

export class RunnerInteractionSession {
  #invocationId;
  #events;
  #closed = false;

  constructor({ invocationId, initialState }) {
    assertInvocationId(invocationId);
    assertState(initialState);
    this.#invocationId = invocationId;
    this.#events = [{ at: process.hrtime.bigint(), state: initialState }];
  }

  mark(state) {
    if (this.#closed) throw new Error("formal_interaction_session_closed");
    assertState(state);
    const previous = this.#events.at(-1);
    if (previous.state === state) return;
    const now = process.hrtime.bigint();
    if (now <= previous.at)
      throw new Error("formal_interaction_clock_not_monotonic");
    this.#events.push({ at: now, state });
  }

  complete({ startedNs, completedNs }) {
    if (this.#closed) throw new Error("formal_interaction_session_closed");
    this.#closed = true;
    const started = decimalBigInt(startedNs, "formal_interaction_started");
    const completed = decimalBigInt(
      completedNs,
      "formal_interaction_completed",
    );
    const sealedAt = process.hrtime.bigint();
    if (
      completed <= started ||
      this.#events[0].at > started ||
      sealedAt < completed
    )
      throw new Error("formal_interaction_execution_window");
    let state = this.#events[0].state;
    for (const event of this.#events) {
      if (event.at > started) break;
      state = event.state;
    }
    const boundaries = this.#events.filter(
      (event) => event.at > started && event.at < completed,
    );
    const records = [];
    let cursor = started;
    for (const boundary of boundaries) {
      records.push({
        state,
        started_ns: cursor.toString(),
        completed_ns: boundary.at.toString(),
      });
      cursor = boundary.at;
      state = boundary.state;
    }
    records.push({
      state,
      started_ns: cursor.toString(),
      completed_ns: completed.toString(),
    });
    return {
      schema_version:
        REAL_PROCESS_SCHEMAS.FORMAL_HUMAN_INTERACTION_TRACE_SCHEMA,
      invocation_id: this.#invocationId,
      source_kind: "runner-interaction-recorder-v1",
      clock_id: "runner-monotonic-hrtime-v1",
      records,
    };
  }
}

export class StdinFormalInteractionRecorder {
  #output;
  #interface;
  #awaiting = null;
  #active = null;
  #failure = null;

  constructor({ input = process.stdin, output = process.stderr } = {}) {
    this.#output = output;
    this.#interface = createInterface({ input, crlfDelay: Infinity });
    this.#interface.on("line", (line) => this.#accept(line));
    this.#interface.on("close", () =>
      this.#fail(new Error("formal_interaction_input_closed")),
    );
  }

  async begin({ invocationId, scenarioId, timeoutMs }) {
    if (this.#failure) throw this.#failure;
    if (this.#awaiting || this.#active)
      throw new Error("formal_interaction_recorder_busy");
    assertInvocationId(invocationId);
    if (!Number.isSafeInteger(timeoutMs) || timeoutMs <= 0)
      throw new Error("formal_interaction_begin_timeout");
    this.#output.write(
      `${JSON.stringify({
        type: "formal-interaction-start",
        invocation_id: invocationId,
        scenario_id: scenarioId,
        accepted_input: {
          invocation_id: invocationId,
          state: "active|wait",
        },
      })}\n`,
    );
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        if (this.#awaiting?.invocationId !== invocationId) return;
        this.#awaiting = null;
        reject(new Error("formal_interaction_initial_state_timeout"));
      }, timeoutMs);
      this.#awaiting = {
        invocationId,
        resolve: (state) => {
          clearTimeout(timer);
          const session = new RunnerInteractionSession({
            invocationId,
            initialState: state,
          });
          this.#active = { invocationId, session };
          resolve(session);
        },
        reject: (error) => {
          clearTimeout(timer);
          reject(error);
        },
      };
    });
  }

  finish(invocationId) {
    if (this.#active?.invocationId !== invocationId)
      throw new Error("formal_interaction_finish_identity");
    this.#active = null;
    this.#output.write(
      `${JSON.stringify({
        type: "formal-interaction-complete",
        invocation_id: invocationId,
      })}\n`,
    );
  }

  close() {
    if (this.#awaiting || this.#active)
      throw new Error("formal_interaction_close_while_active");
    this.#interface.close();
  }

  #accept(line) {
    if (this.#failure) return;
    let value;
    try {
      value = JSON.parse(line);
    } catch {
      this.#fail(new Error("formal_interaction_input_json"));
      return;
    }
    if (
      !value ||
      typeof value !== "object" ||
      Array.isArray(value) ||
      Object.keys(value).sort().join(",") !== "invocation_id,state"
    ) {
      this.#fail(new Error("formal_interaction_input_fields"));
      return;
    }
    try {
      assertInvocationId(value.invocation_id);
      assertState(value.state);
    } catch (error) {
      this.#fail(error);
      return;
    }
    if (this.#awaiting?.invocationId === value.invocation_id) {
      const awaiting = this.#awaiting;
      this.#awaiting = null;
      awaiting.resolve(value.state);
      return;
    }
    if (this.#active?.invocationId === value.invocation_id) {
      this.#active.session.mark(value.state);
      return;
    }
    this.#fail(new Error("formal_interaction_input_invocation"));
  }

  #fail(error) {
    this.#failure = error;
    if (this.#awaiting) {
      const awaiting = this.#awaiting;
      this.#awaiting = null;
      awaiting.reject(error);
    }
  }
}

function assertState(value) {
  if (value !== "active" && value !== "wait")
    throw new Error("formal_interaction_state");
}

function assertInvocationId(value) {
  if (typeof value !== "string" || !/^[a-f0-9]{64}$/u.test(value))
    throw new Error("formal_interaction_invocation_id");
}

function decimalBigInt(value, code) {
  if (typeof value !== "string" || !/^[0-9]+$/u.test(value))
    throw new Error(code);
  return BigInt(value);
}
