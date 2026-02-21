import { z } from "zod";
import { RunState, NodeState } from "../enums.js";
import { ErrorEnvelopeSchema } from "./error.js";

/**
 * Run 记录 (一次完整的 Graph 执行实例)
 */
export const RunSchema = z.object({
  /** Run 唯一 ID (nanoid) */
  runId: z.string(),
  /** 执行的 Graph ID */
  graphId: z.string(),
  /** Graph 版本快照 (执行时的版本，保证 replay 一致性) */
  graphVersion: z.string(),
  /** 当前状态 */
  state: z.nativeEnum(RunState),
  /** 父 Run ID (fork 时记录) */
  parentRunId: z.string().optional(),
  /** Fork 起始 Step ID (从哪个步骤开始分叉) */
  forkFromStepId: z.string().optional(),
  /** 父 Run 的 Graph 版本 (fork 时记录) */
  parentVersion: z.string().optional(),
  /** 输入数据 */
  input: z.record(z.unknown()).optional(),
  /** 最终输出 */
  output: z.record(z.unknown()).optional(),
  /** 总 Token 消耗 */
  totalTokens: z.number().int().default(0),
  /** 总花费 (USD) */
  totalCostUsd: z.number().default(0),
  /** 总耗时 (ms) */
  durationMs: z.number().int().optional(),
  /** 最终错误 (如果 Failed) */
  error: ErrorEnvelopeSchema.optional(),
  /** 开始时间 */
  startedAt: z.string().datetime(),
  /** 结束时间 */
  completedAt: z.string().datetime().optional(),
  /** 创建时间 */
  createdAt: z.string().datetime(),
});
export type Run = z.infer<typeof RunSchema>;

/**
 * Step 记录 (Run 中单个节点的执行记录)
 */
export const StepSchema = z.object({
  /** Step 唯一 ID */
  stepId: z.string(),
  /** 所属 Run ID */
  runId: z.string(),
  /** 对应的节点 ID (Graph 定义中的 id) */
  nodeId: z.string(),
  /** 节点类型快照 */
  nodeType: z.string(),
  /** 节点标签快照 */
  nodeLabel: z.string(),
  /** 执行状态 */
  state: z.nativeEnum(NodeState),
  /** 此 Step 是否从父 Run 继承 (fork 时标记) */
  inherited: z.boolean().default(false),
  /** 重试次数 */
  retryCount: z.number().int().default(0),
  /** 开始时间 */
  startedAt: z.string().datetime().optional(),
  /** 结束时间 */
  completedAt: z.string().datetime().optional(),
  /** 耗时 (ms) */
  durationMs: z.number().int().optional(),
  /** 顺序号 (在 run 中的执行顺序) */
  sequence: z.number().int(),
});
export type Step = z.infer<typeof StepSchema>;

/**
 * StepEvent — Trace Event Sourcing 的核心单元 (append-only)
 * 每个事件描述节点执行过程中发生的一件事
 */
export const StepEventSchema = z.object({
  /** 事件唯一 ID */
  eventId: z.string(),
  /** 所属 Run ID */
  runId: z.string(),
  /** 所属 Step ID */
  stepId: z.string(),
  /** 对应节点 ID */
  nodeId: z.string(),
  /** 事件发生时间戳 */
  timestamp: z.string().datetime(),
  /** 输入快照 (执行前的输入，JSON 序列化) */
  inputSnapshot: z.string().optional(),
  /** 渲染后的最终 Prompt (LLM 节点专用，保证 replay 一致性) */
  renderedPrompt: z.string().optional(),
  /** 输出数据 (JSON 序列化) */
  output: z.string().optional(),
  /** 错误信息 (如果有) */
  error: ErrorEnvelopeSchema.optional(),
  /** Token 消耗 */
  tokens: z.number().int().optional(),
  /** 本次调用花费 (USD) */
  costUsd: z.number().optional(),
  /** 耗时 (ms) */
  durationMs: z.number().int().optional(),
  /** Provider 元数据 (model, temperature, top_p 等，保证 replay) */
  providerMeta: z.object({
    provider: z.string(),
    model: z.string(),
    temperature: z.number().optional(),
    topP: z.number().optional(),
    modelVersion: z.string().optional(),
  }).optional(),
  /** Cache 命中情况 */
  cacheHit: z.boolean().optional(),
  /** 缓存 Key (如果有) */
  cacheKey: z.string().optional(),
});
export type StepEvent = z.infer<typeof StepEventSchema>;
