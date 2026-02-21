import { z } from "zod";

/**
 * Provider 信息
 */
export const ProviderInfoSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum(["openai-compatible", "ollama", "lm-studio", "custom"]),
  /** API 基础 URL */
  baseUrl: z.string().url(),
  /** 支持的模型列表 */
  models: z.array(z.string()).optional(),
  /** 是否支持 streaming */
  supportsStreaming: z.boolean().default(true),
  /** 是否支持 cost reporting */
  supportsCostReporting: z.boolean().default(false),
  /** Provider 版本 (用于 replay 一致性校验) */
  version: z.string().optional(),
});
export type ProviderInfo = z.infer<typeof ProviderInfoSchema>;

/**
 * 数据库中存储的 Provider 配置记录
 */
export const ProviderRecordSchema = ProviderInfoSchema.extend({
  /** 数据库主键 */
  id: z.string(),
  /** API Key (加密存储，不直接暴露) */
  apiKeyRef: z.string().optional(),
  /** 是否默认 Provider */
  isDefault: z.boolean().default(false),
  /** 创建时间 */
  createdAt: z.string().datetime(),
  /** 更新时间 */
  updatedAt: z.string().datetime(),
});
export type ProviderRecord = z.infer<typeof ProviderRecordSchema>;

/**
 * LLM 生成请求
 */
export const LLMRequestSchema = z.object({
  model: z.string(),
  messages: z.array(z.object({
    role: z.enum(["system", "user", "assistant"]),
    content: z.string(),
  })),
  temperature: z.number().min(0).max(2).optional(),
  topP: z.number().min(0).max(1).optional(),
  maxTokens: z.number().int().positive().optional(),
  stream: z.boolean().default(true),
});
export type LLMRequest = z.infer<typeof LLMRequestSchema>;

/**
 * Token 流事件 (streaming)
 */
export const TokenEventSchema = z.object({
  token: z.string(),
  done: z.boolean(),
  /** 使用量 (仅在 done=true 时填充) */
  usage: z.object({
    promptTokens: z.number().int(),
    completionTokens: z.number().int(),
    totalTokens: z.number().int(),
  }).optional(),
  /** 花费 (仅在 done=true 且 provider 支持时填充) */
  costUsd: z.number().optional(),
});
export type TokenEvent = z.infer<typeof TokenEventSchema>;

/**
 * 持久记忆记录
 */
export const MemoryRecordSchema = z.object({
  id: z.string(),
  /** 关联的 Run ID (可选) */
  runId: z.string().optional(),
  /** 关联的 Agent / Graph ID */
  agentId: z.string().optional(),
  /** 记忆键 */
  key: z.string(),
  /** 记忆值 (JSON 序列化) */
  value: z.string(),
  /** 记忆类型 */
  type: z.enum(["key-value", "document"]).default("key-value"),
  /** 创建时间 */
  createdAt: z.string().datetime(),
  /** 过期时间 (可选) */
  expiresAt: z.string().datetime().optional(),
});
export type MemoryRecord = z.infer<typeof MemoryRecordSchema>;
