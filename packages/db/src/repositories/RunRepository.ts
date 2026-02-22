import type { Run } from "@omega/shared";
import { RunState } from "@omega/shared";

/**
 * Run Repository — 负责 runs 表的所有 CRUD 操作
 * 使用 Node.js 24 内置 SQLite (node:sqlite)
 */
export class RunRepository {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(private db: any) {}

  /** 创建新 Run 记录 */
  create(run: Run): void {
    this.db.prepare(`
      INSERT INTO runs (
        run_id, graph_id, graph_version, state,
        parent_run_id, fork_from_step, parent_version,
        input, output, total_tokens, total_cost_usd,
        duration_ms, error, started_at, completed_at, created_at
      ) VALUES (
        @runId, @graphId, @graphVersion, @state,
        @parentRunId, @forkFromStepId, @parentVersion,
        @input, @output, @totalTokens, @totalCostUsd,
        @durationMs, @error, @startedAt, @completedAt, @createdAt
      )
    `).run({
      runId: run.runId,
      graphId: run.graphId,
      graphVersion: run.graphVersion,
      state: run.state,
      parentRunId: run.parentRunId ?? null,
      forkFromStepId: run.forkFromStepId ?? null,
      parentVersion: run.parentVersion ?? null,
      input: run.input ? JSON.stringify(run.input) : null,
      output: run.output ? JSON.stringify(run.output) : null,
      totalTokens: run.totalTokens,
      totalCostUsd: run.totalCostUsd,
      durationMs: run.durationMs ?? null,
      error: run.error ? JSON.stringify(run.error) : null,
      startedAt: run.startedAt,
      completedAt: run.completedAt ?? null,
      createdAt: run.createdAt,
    });
  }

  /** 根据 ID 获取 Run */
  findById(runId: string): Run | null {
    const row = this.db.prepare("SELECT * FROM runs WHERE run_id = ?").get(runId) as RawRun | undefined;
    return row ? this.deserialize(row) : null;
  }

  /** 获取所有 Runs (分页) */
  findAll(limit = 50, offset = 0): Run[] {
    const rows = this.db.prepare(
      "SELECT * FROM runs ORDER BY created_at DESC LIMIT ? OFFSET ?"
    ).all(limit, offset) as RawRun[];
    return rows.map(this.deserialize);
  }

  /** 按状态查询 Runs */
  findByState(state: RunState): Run[] {
    const rows = this.db.prepare("SELECT * FROM runs WHERE state = ? ORDER BY created_at DESC").all(state) as RawRun[];
    return rows.map(this.deserialize);
  }

  /** 更新 Run 状态 */
  updateState(runId: string, state: RunState): void {
    this.db.prepare("UPDATE runs SET state = ? WHERE run_id = ?").run(state, runId);
  }

  /** 更新 Run 完成信息 */
  complete(runId: string, data: {
    state: RunState;
    output?: Record<string, unknown>;
    totalTokens: number;
    totalCostUsd: number;
    durationMs: number;
    error?: unknown;
    completedAt: string;
  }): void {
    this.db.prepare(`
      UPDATE runs SET
        state = @state,
        output = @output,
        total_tokens = @totalTokens,
        total_cost_usd = @totalCostUsd,
        duration_ms = @durationMs,
        error = @error,
        completed_at = @completedAt
      WHERE run_id = @runId
    `).run({
      runId,
      state: data.state,
      output: data.output ? JSON.stringify(data.output) : null,
      totalTokens: data.totalTokens,
      totalCostUsd: data.totalCostUsd,
      durationMs: data.durationMs,
      error: data.error ? JSON.stringify(data.error) : null,
      completedAt: data.completedAt,
    });
  }

  /** 删除 Run 及其所有关联数据 */
  delete(runId: string): void {
    this.db.exec("BEGIN");
    try {
      this.db.prepare("DELETE FROM events WHERE run_id = ?").run(runId);
      this.db.prepare("DELETE FROM steps WHERE run_id = ?").run(runId);
      this.db.prepare("DELETE FROM runs WHERE run_id = ?").run(runId);
      this.db.exec("COMMIT");
    } catch (err) {
      this.db.exec("ROLLBACK");
      throw err;
    }
  }

  /** 将数据库原始行反序列化为 Run 对象 */
  private deserialize(row: RawRun): Run {
    return {
      runId: row.run_id,
      graphId: row.graph_id,
      graphVersion: row.graph_version,
      state: row.state as RunState,
      parentRunId: row.parent_run_id ?? undefined,
      forkFromStepId: row.fork_from_step ?? undefined,
      parentVersion: row.parent_version ?? undefined,
      input: row.input ? JSON.parse(row.input) as Record<string, unknown> : undefined,
      output: row.output ? JSON.parse(row.output) as Record<string, unknown> : undefined,
      totalTokens: row.total_tokens,
      totalCostUsd: row.total_cost_usd,
      durationMs: row.duration_ms ?? undefined,
      error: row.error ? JSON.parse(row.error) as Run["error"] : undefined,
      startedAt: row.started_at,
      completedAt: row.completed_at ?? undefined,
      createdAt: row.created_at,
    };
  }
}

/** 数据库原始行类型 (snake_case) */
interface RawRun {
  run_id: string;
  graph_id: string;
  graph_version: string;
  state: string;
  parent_run_id: string | null;
  fork_from_step: string | null;
  parent_version: string | null;
  input: string | null;
  output: string | null;
  total_tokens: number;
  total_cost_usd: number;
  duration_ms: number | null;
  error: string | null;
  started_at: string;
  completed_at: string | null;
  created_at: string;
}
