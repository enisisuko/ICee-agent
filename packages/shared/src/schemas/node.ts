import { z } from "zod";
import { NodeType, BackoffStrategy, CacheStrategy } from "../enums.js";

/**
 * 重试策略配置
 */
export const RetryConfigSchema = z.object({
  maxRetries: z.number().int().min(0).max(10).default(3),
  backoffStrategy: z.nativeEnum(BackoffStrategy).default(BackoffStrategy.EXPONENTIAL),
  backoffBaseMs: z.number().int().min(100).default(1000),
  /** 只对这些错误类型重试 (空数组 = 对所有错误重试) */
  retryOnErrorTypes: z.array(z.string()).default([]),
});
export type RetryConfig = z.infer<typeof RetryConfigSchema>;

/**
 * Guardrail (输出验证) 配置
 */
export const GuardrailConfigSchema = z.object({
  /** 是否启用 Zod schema 校验 */
  schemaValidation: z.boolean().default(true),
  /** 是否启用 LLM 结构化输出校验 */
  llmOutputValidation: z.boolean().default(false),
  /** 置信度阈值 (0-1, 仅对 Reflection Node 有效) */
  confidenceThreshold: z.number().min(0).max(1).default(0.7),
});
export type GuardrailConfig = z.infer<typeof GuardrailConfigSchema>;

/**
 * 资源预算限制
 */
export const BudgetConfigSchema = z.object({
  maxTokens: z.number().int().positive().optional(),
  maxCostUsd: z.number().positive().optional(),
  maxTimeMs: z.number().int().positive().optional(),
});
export type BudgetConfig = z.infer<typeof BudgetConfigSchema>;

/**
 * LLM 节点配置 (用于记录以支持 replay)
 */
export const LLMNodeConfigSchema = z.object({
  provider: z.string(),
  model: z.string(),
  temperature: z.number().min(0).max(2).default(0.7),
  topP: z.number().min(0).max(1).default(1),
  maxTokens: z.number().int().positive().optional(),
  systemPrompt: z.string().optional(),
  promptTemplate: z.string().optional(),
});
export type LLMNodeConfig = z.infer<typeof LLMNodeConfigSchema>;

/**
 * Tool 节点配置
 */
export const ToolNodeConfigSchema = z.object({
  toolName: z.string(),
  toolVersion: z.string().default("latest"),
  timeoutMs: z.number().int().positive().default(30000),
  inputMapping: z.record(z.string()).optional(),
});
export type ToolNodeConfig = z.infer<typeof ToolNodeConfigSchema>;

/**
 * 单个节点的定义 (Graph 中的节点)
 */
export const NodeDefinitionSchema = z.object({
  /** 节点唯一 ID (图内唯一) */
  id: z.string(),
  /** 节点类型 */
  type: z.nativeEnum(NodeType),
  /** 人类可读的节点名称 */
  label: z.string(),
  /** 节点版本 */
  version: z.string().default("1.0.0"),
  /** 重试配置 */
  retry: RetryConfigSchema.optional(),
  /** Guardrail 配置 */
  guardrails: GuardrailConfigSchema.optional(),
  /** 缓存策略 */
  cache: z.nativeEnum(CacheStrategy).default(CacheStrategy.NO_CACHE),
  /** 节点专属配置 (根据 type 不同内容不同) */
  config: z.record(z.unknown()).optional(),
  /** 节点元数据 */
  metadata: z.record(z.string()).optional(),
});
export type NodeDefinition = z.infer<typeof NodeDefinitionSchema>;

/**
 * 图中的边 (Edge)
 */
export const EdgeDefinitionSchema = z.object({
  id: z.string(),
  /** 源节点 ID */
  source: z.string(),
  /** 目标节点 ID */
  target: z.string(),
  /** 条件表达式 (可选，用于条件路由) */
  condition: z.string().optional(),
  /** 边的标签 */
  label: z.string().optional(),
});
export type EdgeDefinition = z.infer<typeof EdgeDefinitionSchema>;

/**
 * 并行执行组配置
 */
export const ParallelGroupSchema = z.object({
  id: z.string(),
  nodeIds: z.array(z.string()).min(2),
});
export type ParallelGroup = z.infer<typeof ParallelGroupSchema>;
