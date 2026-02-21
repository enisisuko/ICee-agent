import { z } from "zod";
import { ErrorType } from "../enums.js";

/**
 * 统一错误信封 (Error Envelope)
 * 所有模块抛出的错误必须包装成此结构
 */
export const ErrorEnvelopeSchema = z.object({
  /** 错误唯一 ID */
  errorId: z.string(),
  /** 错误类型分类 */
  type: z.nativeEnum(ErrorType),
  /** 人类可读的错误消息 */
  message: z.string(),
  /** 原始错误堆栈 (可选，生产环境可脱敏) */
  stack: z.string().optional(),
  /** 发生错误的节点 ID (如果有) */
  nodeId: z.string().optional(),
  /** 发生错误的 Run ID (如果有) */
  runId: z.string().optional(),
  /** 错误时间戳 */
  timestamp: z.string().datetime(),
  /** 附加的上下文数据 */
  context: z.record(z.unknown()).optional(),
  /** 是否可重试 */
  retryable: z.boolean().default(false),
});

export type ErrorEnvelope = z.infer<typeof ErrorEnvelopeSchema>;
