import type { StepEvent } from "@omega/shared";

/**
 * Event Repository — 负责 events 表的操作
 * events 表是 append-only 的，不允许修改历史事件
 * 使用 Node.js 24 内置 SQLite (node:sqlite)
 */
export class EventRepository {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(private db: any) {}

  /** 追加一条 StepEvent (append-only) */
  append(event: StepEvent): void {
    this.db.prepare(`
      INSERT INTO events (
        event_id, run_id, step_id, node_id, timestamp,
        input_snapshot, rendered_prompt, output, error,
        tokens, cost_usd, duration_ms,
        provider_meta, cache_hit, cache_key
      ) VALUES (
        @eventId, @runId, @stepId, @nodeId, @timestamp,
        @inputSnapshot, @renderedPrompt, @output, @error,
        @tokens, @costUsd, @durationMs,
        @providerMeta, @cacheHit, @cacheKey
      )
    `).run({
      eventId: event.eventId,
      runId: event.runId,
      stepId: event.stepId,
      nodeId: event.nodeId,
      timestamp: event.timestamp,
      inputSnapshot: event.inputSnapshot ?? null,
      renderedPrompt: event.renderedPrompt ?? null,
      output: event.output ?? null,
      error: event.error ? JSON.stringify(event.error) : null,
      tokens: event.tokens ?? null,
      costUsd: event.costUsd ?? null,
      durationMs: event.durationMs ?? null,
      providerMeta: event.providerMeta ? JSON.stringify(event.providerMeta) : null,
      cacheHit: event.cacheHit !== undefined ? (event.cacheHit ? 1 : 0) : null,
      cacheKey: event.cacheKey ?? null,
    });
  }

  /** 批量追加 StepEvents (在事务中，性能更好) */
  appendMany(events: StepEvent[]): void {
    this.db.exec("BEGIN");
    try {
      for (const event of events) {
        this.append(event);
      }
      this.db.exec("COMMIT");
    } catch (err) {
      this.db.exec("ROLLBACK");
      throw err;
    }
  }

  /** 获取 Run 下所有 Events (按时间顺序，用于 replay) */
  findByRunId(runId: string): StepEvent[] {
    const rows = this.db.prepare(
      "SELECT * FROM events WHERE run_id = ? ORDER BY timestamp ASC"
    ).all(runId) as RawEvent[];
    return rows.map(this.deserialize.bind(this));
  }

  /** 获取某个 Step 下的所有 Events */
  findByStepId(stepId: string): StepEvent[] {
    const rows = this.db.prepare(
      "SELECT * FROM events WHERE step_id = ? ORDER BY timestamp ASC"
    ).all(stepId) as RawEvent[];
    return rows.map(this.deserialize.bind(this));
  }

  /** 从指定 Step 开始获取 Events (用于 fork replay) */
  findFromStep(runId: string, fromStepId: string): StepEvent[] {
    // 先找到该 step 的 timestamp
    const pivot = this.db.prepare(
      "SELECT timestamp FROM events WHERE run_id = ? AND step_id = ? ORDER BY timestamp ASC LIMIT 1"
    ).get(runId, fromStepId) as { timestamp: string } | undefined;

    if (!pivot) return [];

    const rows = this.db.prepare(
      "SELECT * FROM events WHERE run_id = ? AND timestamp >= ? ORDER BY timestamp ASC"
    ).all(runId, pivot.timestamp) as RawEvent[];
    return rows.map(this.deserialize.bind(this));
  }

  /** 获取 Run 的统计信息 */
  getRunStats(runId: string): { totalTokens: number; totalCostUsd: number; eventCount: number } {
    const stats = this.db.prepare(`
      SELECT
        COALESCE(SUM(tokens), 0) as total_tokens,
        COALESCE(SUM(cost_usd), 0.0) as total_cost_usd,
        COUNT(*) as event_count
      FROM events WHERE run_id = ?
    `).get(runId) as { total_tokens: number; total_cost_usd: number; event_count: number };

    return {
      totalTokens: stats.total_tokens,
      totalCostUsd: stats.total_cost_usd,
      eventCount: stats.event_count,
    };
  }

  private deserialize(row: RawEvent): StepEvent {
    return {
      eventId: row.event_id,
      runId: row.run_id,
      stepId: row.step_id,
      nodeId: row.node_id,
      timestamp: row.timestamp,
      inputSnapshot: row.input_snapshot ?? undefined,
      renderedPrompt: row.rendered_prompt ?? undefined,
      output: row.output ?? undefined,
      error: row.error ? JSON.parse(row.error) as StepEvent["error"] : undefined,
      tokens: row.tokens ?? undefined,
      costUsd: row.cost_usd ?? undefined,
      durationMs: row.duration_ms ?? undefined,
      providerMeta: row.provider_meta ? JSON.parse(row.provider_meta) as StepEvent["providerMeta"] : undefined,
      cacheHit: row.cache_hit !== null ? row.cache_hit === 1 : undefined,
      cacheKey: row.cache_key ?? undefined,
    };
  }
}

interface RawEvent {
  event_id: string;
  run_id: string;
  step_id: string;
  node_id: string;
  timestamp: string;
  input_snapshot: string | null;
  rendered_prompt: string | null;
  output: string | null;
  error: string | null;
  tokens: number | null;
  cost_usd: number | null;
  duration_ms: number | null;
  provider_meta: string | null;
  cache_hit: number | null;
  cache_key: string | null;
}
