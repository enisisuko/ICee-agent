import { z } from "zod";
import { StepEventSchema } from "./run.js";
import { ErrorEnvelopeSchema } from "./error.js";

/**
 * WebSocket 协议冻结
 * 所有 Command (客户端 → 服务端) 和 Event (服务端 → 客户端) 消息定义
 */

// ─────────────────────────────────────────────
// Commands (客户端发送给 Runtime)
// ─────────────────────────────────────────────

export const RunCommandSchema = z.object({
  type: z.literal("command:run"),
  payload: z.object({
    graphId: z.string(),
    input: z.record(z.unknown()).optional(),
    /** 可选：覆盖 Graph 的预算设置 */
    budgetOverride: z.object({
      maxTokens: z.number().optional(),
      maxCostUsd: z.number().optional(),
      maxTimeMs: z.number().optional(),
    }).optional(),
  }),
});

export const PauseCommandSchema = z.object({
  type: z.literal("command:pause"),
  payload: z.object({ runId: z.string() }),
});

export const ResumeCommandSchema = z.object({
  type: z.literal("command:resume"),
  payload: z.object({ runId: z.string() }),
});

export const ForkCommandSchema = z.object({
  type: z.literal("command:fork"),
  payload: z.object({
    /** 要分叉的父 Run ID */
    runId: z.string(),
    /** 从哪个 Step 开始重新执行 */
    fromStepId: z.string(),
    /** 可选：覆盖该 Step 的输入 */
    inputOverride: z.record(z.unknown()).optional(),
  }),
});

export const ReplayCommandSchema = z.object({
  type: z.literal("command:replay"),
  payload: z.object({
    /** 要回放的 Run ID */
    runId: z.string(),
  }),
});

export const CancelCommandSchema = z.object({
  type: z.literal("command:cancel"),
  payload: z.object({ runId: z.string() }),
});

/** 所有 Command 的联合类型 */
export const WsCommandSchema = z.discriminatedUnion("type", [
  RunCommandSchema,
  PauseCommandSchema,
  ResumeCommandSchema,
  ForkCommandSchema,
  ReplayCommandSchema,
  CancelCommandSchema,
]);
export type WsCommand = z.infer<typeof WsCommandSchema>;

// ─────────────────────────────────────────────
// Events (Runtime 发送给客户端)
// ─────────────────────────────────────────────

export const RunStartedEventSchema = z.object({
  type: z.literal("event:run_started"),
  payload: z.object({
    runId: z.string(),
    graphId: z.string(),
    graphVersion: z.string(),
    startedAt: z.string().datetime(),
  }),
});

export const StepStartedEventSchema = z.object({
  type: z.literal("event:step_started"),
  payload: z.object({
    runId: z.string(),
    stepId: z.string(),
    nodeId: z.string(),
    nodeType: z.string(),
    nodeLabel: z.string(),
    sequence: z.number().int(),
    startedAt: z.string().datetime(),
  }),
});

export const TokenStreamEventSchema = z.object({
  type: z.literal("event:token_stream"),
  payload: z.object({
    runId: z.string(),
    stepId: z.string(),
    /** 当前 token 片段 */
    token: z.string(),
    /** 是否是最后一个 token */
    done: z.boolean().default(false),
  }),
});

export const StepCompletedEventSchema = z.object({
  type: z.literal("event:step_completed"),
  payload: z.object({
    runId: z.string(),
    stepId: z.string(),
    nodeId: z.string(),
    /** 完整的 StepEvent 记录 */
    event: StepEventSchema,
  }),
});

export const RunPausedEventSchema = z.object({
  type: z.literal("event:run_paused"),
  payload: z.object({
    runId: z.string(),
    pausedAt: z.string().datetime(),
  }),
});

export const RunErrorEventSchema = z.object({
  type: z.literal("event:error"),
  payload: z.object({
    runId: z.string(),
    stepId: z.string().optional(),
    error: ErrorEnvelopeSchema,
  }),
});

export const RunCompletedEventSchema = z.object({
  type: z.literal("event:run_completed"),
  payload: z.object({
    runId: z.string(),
    state: z.enum(["COMPLETED", "FAILED", "CANCELLED"]),
    output: z.record(z.unknown()).optional(),
    totalTokens: z.number().int(),
    totalCostUsd: z.number(),
    durationMs: z.number().int(),
    completedAt: z.string().datetime(),
  }),
});

export const RunForkedEventSchema = z.object({
  type: z.literal("event:run_forked"),
  payload: z.object({
    /** 新 Run 的 ID */
    newRunId: z.string(),
    /** 父 Run ID */
    parentRunId: z.string(),
    /** 分叉起始 Step ID */
    fromStepId: z.string(),
    forkStartedAt: z.string().datetime(),
  }),
});

/** 所有 Event 的联合类型 */
export const WsEventSchema = z.discriminatedUnion("type", [
  RunStartedEventSchema,
  StepStartedEventSchema,
  TokenStreamEventSchema,
  StepCompletedEventSchema,
  RunPausedEventSchema,
  RunErrorEventSchema,
  RunCompletedEventSchema,
  RunForkedEventSchema,
]);
export type WsEvent = z.infer<typeof WsEventSchema>;

/** WS 消息通用包装 (携带 requestId 方便客户端关联) */
export const WsMessageSchema = z.object({
  /** 消息唯一 ID */
  id: z.string(),
  /** 消息内容 */
  data: z.union([WsCommandSchema, WsEventSchema]),
  /** 时间戳 */
  timestamp: z.string().datetime(),
});
export type WsMessage = z.infer<typeof WsMessageSchema>;
