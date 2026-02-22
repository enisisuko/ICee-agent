import { nanoid } from "nanoid";
import type { ErrorEnvelope } from "@omega/shared";
import { ErrorType } from "@omega/shared";

/**
 * Omega 错误工厂 — 将任意错误包装成统一的 ErrorEnvelope
 */
export function createErrorEnvelope(
  type: ErrorType,
  message: string,
  options?: {
    stack?: string;
    nodeId?: string;
    runId?: string;
    context?: Record<string, unknown>;
    retryable?: boolean;
  }
): ErrorEnvelope {
  return {
    errorId: nanoid(),
    type,
    message,
    stack: options?.stack,
    nodeId: options?.nodeId,
    runId: options?.runId,
    timestamp: new Date().toISOString(),
    context: options?.context,
    retryable: options?.retryable ?? false,
  };
}

/** 从原生 Error 创建 ErrorEnvelope */
export function fromNativeError(
  err: unknown,
  type: ErrorType = ErrorType.SYSTEM_ERROR,
  options?: { nodeId?: string; runId?: string; retryable?: boolean }
): ErrorEnvelope {
  const message = err instanceof Error ? err.message : String(err);
  const stack = err instanceof Error ? err.stack : undefined;
  // exactOptionalPropertyTypes: 只有有 stack 值时才传入
  return createErrorEnvelope(type, message, stack !== undefined
    ? { ...options, stack }
    : { ...options });
}

/** Omega 内部运行时错误类 */
export class OmegaError extends Error {
  public readonly envelope: ErrorEnvelope;

  constructor(envelope: ErrorEnvelope) {
    super(envelope.message);
    this.name = "OmegaError";
    this.envelope = envelope;
  }
}
