import { requireValue } from "./delegation-evidence-validation.mjs";

export function validateWorkerEvents(events, workers, exactAgent, issues) {
  const values = Array.isArray(events) ? events : [];
  requireValue(
    values.every((item, index) => item.seq === index + 1),
    "worker_event_sequence_invalid",
    issues,
  );
  requireValue(
    values.every(
      (item, index) => index === 0 || item.timestamp_ms > values[index - 1].timestamp_ms,
    ),
    "worker_event_time_not_monotonic",
    issues,
  );
  const actors = new Set(workers.map((item) => item.actor_id));
  const intervals = new Map();
  for (const event of values) {
    requireValue(
      actors.has(event.actor_id),
      `worker_event_actor_unknown:${event.actor_id}`,
      issues,
    );
    requireValue(
      ["start", "stop"].includes(event.event),
      `worker_event_kind_invalid:${event.actor_id}`,
      issues,
    );
    requireValue(
      Number.isSafeInteger(event.timestamp_ms) && event.timestamp_ms >= 0,
      `worker_event_time_invalid:${event.actor_id}`,
      issues,
    );
    const interval = intervals.get(event.actor_id) ?? {};
    if (event.event === "start") {
      requireValue(
        !interval.start,
        `worker_start_duplicate:${event.actor_id}`,
        issues,
      );
      requireValue(
        event.actual_agent_type === exactAgent,
        `worker_start_agent_type_mismatch:${event.actor_id}`,
        issues,
      );
      interval.start = event;
    } else {
      requireValue(
        !interval.stop,
        `worker_stop_duplicate:${event.actor_id}`,
        issues,
      );
      requireValue(
        event.status === "completed",
        `worker_stop_not_completed:${event.actor_id}`,
        issues,
      );
      interval.stop = event;
    }
    intervals.set(event.actor_id, interval);
  }
  for (const worker of workers) {
    const interval = intervals.get(worker.actor_id);
    requireValue(
      Boolean(interval?.start),
      `worker_start_missing:${worker.actor_id}`,
      issues,
    );
    requireValue(
      Boolean(interval?.stop),
      `worker_stop_missing:${worker.actor_id}`,
      issues,
    );
    requireValue(
      !interval?.start ||
        !interval?.stop ||
        (interval.start.seq < interval.stop.seq &&
          interval.start.timestamp_ms < interval.stop.timestamp_ms),
      `worker_event_order_invalid:${worker.actor_id}`,
      issues,
    );
  }
  const complete = [...intervals.values()].filter(
    (item) =>
      item.start &&
      item.stop &&
      item.start.timestamp_ms < item.stop.timestamp_ms,
  );
  const startTimes = [...intervals.values()]
    .map((item) => item.start?.timestamp_ms)
    .filter((value) => Number.isSafeInteger(value) && value >= 0);
  const points = complete
    .flatMap((item) => [
      { timestamp_ms: item.start.timestamp_ms, delta: 1 },
      { timestamp_ms: item.stop.timestamp_ms, delta: -1 },
    ])
    .sort(
      (left, right) =>
        left.timestamp_ms - right.timestamp_ms || left.delta - right.delta,
    );
  let current = 0;
  let peak = 0;
  for (const point of points) {
    current += point.delta;
    peak = Math.max(peak, current);
  }
  return {
    event_count: values.length,
    concurrent_worker_peak: peak,
    first_worker_start_ms: startTimes.length ? Math.min(...startTimes) : null,
  };
}
