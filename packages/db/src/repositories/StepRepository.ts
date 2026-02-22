import type { Step } from "@omega/shared";
import { NodeState } from "@omega/shared";

/**
 * Step Repository — 负责 steps 表的 CRUD 操作
 * 使用 Node.js 24 内置 SQLite (node:sqlite)
 */
export class StepRepository {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(private db: any) {}

  /** 创建 Step 记录 */
  create(step: Step): void {
    this.db.prepare(`
      INSERT INTO steps (
        step_id, run_id, node_id, node_type, node_label,
        state, inherited, retry_count,
        started_at, completed_at, duration_ms, sequence
      ) VALUES (
        @stepId, @runId, @nodeId, @nodeType, @nodeLabel,
        @state, @inherited, @retryCount,
        @startedAt, @completedAt, @durationMs, @sequence
      )
    `).run({
      stepId: step.stepId,
      runId: step.runId,
      nodeId: step.nodeId,
      nodeType: step.nodeType,
      nodeLabel: step.nodeLabel,
      state: step.state,
      inherited: step.inherited ? 1 : 0,
      retryCount: step.retryCount,
      startedAt: step.startedAt ?? null,
      completedAt: step.completedAt ?? null,
      durationMs: step.durationMs ?? null,
      sequence: step.sequence,
    });
  }

  /** 批量创建 Steps (在事务中) */
  createMany(steps: Step[]): void {
    this.db.exec("BEGIN");
    try {
      for (const step of steps) {
        this.create(step);
      }
      this.db.exec("COMMIT");
    } catch (err) {
      this.db.exec("ROLLBACK");
      throw err;
    }
  }

  /** 根据 ID 获取 Step */
  findById(stepId: string): Step | null {
    const row = this.db.prepare("SELECT * FROM steps WHERE step_id = ?").get(stepId) as RawStep | undefined;
    return row ? this.deserialize(row) : null;
  }

  /** 获取 Run 下所有 Steps (按执行顺序) */
  findByRunId(runId: string): Step[] {
    const rows = this.db.prepare(
      "SELECT * FROM steps WHERE run_id = ? ORDER BY sequence ASC"
    ).all(runId) as RawStep[];
    return rows.map(this.deserialize.bind(this));
  }

  /** 更新 Step 状态 */
  updateState(stepId: string, state: NodeState, data?: {
    startedAt?: string;
    completedAt?: string;
    durationMs?: number;
    retryCount?: number;
  }): void {
    const fields: string[] = ["state = @state"];
    const params: Record<string, unknown> = { stepId, state };

    if (data?.startedAt !== undefined) {
      fields.push("started_at = @startedAt");
      params["startedAt"] = data.startedAt;
    }
    if (data?.completedAt !== undefined) {
      fields.push("completed_at = @completedAt");
      params["completedAt"] = data.completedAt;
    }
    if (data?.durationMs !== undefined) {
      fields.push("duration_ms = @durationMs");
      params["durationMs"] = data.durationMs;
    }
    if (data?.retryCount !== undefined) {
      fields.push("retry_count = @retryCount");
      params["retryCount"] = data.retryCount;
    }

    this.db.prepare(`UPDATE steps SET ${fields.join(", ")} WHERE step_id = @stepId`).run(params);
  }

  private deserialize(row: RawStep): Step {
    return {
      stepId: row.step_id,
      runId: row.run_id,
      nodeId: row.node_id,
      nodeType: row.node_type,
      nodeLabel: row.node_label,
      state: row.state as NodeState,
      inherited: row.inherited === 1,
      retryCount: row.retry_count,
      startedAt: row.started_at ?? undefined,
      completedAt: row.completed_at ?? undefined,
      durationMs: row.duration_ms ?? undefined,
      sequence: row.sequence,
    };
  }
}

interface RawStep {
  step_id: string;
  run_id: string;
  node_id: string;
  node_type: string;
  node_label: string;
  state: string;
  inherited: number;
  retry_count: number;
  started_at: string | null;
  completed_at: string | null;
  duration_ms: number | null;
  sequence: number;
}
