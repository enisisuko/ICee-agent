import { nanoid } from "nanoid";
import type {
  NodeDefinition, StepEvent, Step, ErrorEnvelope
} from "@icee/shared";
import {
  NodeState, NodeType, ErrorType, BackoffStrategy
} from "@icee/shared";
import { createErrorEnvelope, fromNativeError } from "../errors.js";
import { createLogger } from "../logger.js";

const log = createLogger("NodeExecutor");

/** 节点执行上下文 (每个节点执行时都能读取) */
export interface NodeContext {
  runId: string;
  stepId: string;
  /** Run 级别的短期记忆 (Key-Value) */
  runMemory: Map<string, unknown>;
  /** 上一个节点的输出 */
  previousOutput?: unknown;
  /** Run 的全局输入 */
  globalInput?: Record<string, unknown>;
}

/** 节点执行结果 */
export interface NodeResult {
  output: unknown;
  tokens?: number;
  costUsd?: number;
  renderedPrompt?: string;
  providerMeta?: StepEvent["providerMeta"];
}

/** 节点执行器抽象基类 */
export abstract class BaseNodeExecutor {
  abstract readonly nodeType: NodeType;

  /** 执行节点，返回结果 */
  abstract execute(node: NodeDefinition, ctx: NodeContext): Promise<NodeResult>;

  /** 验证节点配置 (子类可覆写) */
  validate(_node: NodeDefinition): void {
    // 默认不做额外校验
  }
}

/**
 * NodeExecutorRegistry — 所有节点执行器的注册表
 * 通过 nodeType 查找对应执行器
 */
export class NodeExecutorRegistry {
  private executors = new Map<NodeType, BaseNodeExecutor>();

  register(executor: BaseNodeExecutor): void {
    this.executors.set(executor.nodeType, executor);
    log.debug({ nodeType: executor.nodeType }, "Node executor registered");
  }

  get(nodeType: NodeType): BaseNodeExecutor | undefined {
    return this.executors.get(nodeType);
  }

  has(nodeType: NodeType): boolean {
    return this.executors.has(nodeType);
  }
}

/**
 * Retry 工具函数
 */
async function withRetry<T>(
  fn: () => Promise<T>,
  config: {
    maxRetries: number;
    backoffStrategy: BackoffStrategy;
    backoffBaseMs: number;
    retryOnErrorTypes: string[];
  },
  onRetry?: (attempt: number, error: ErrorEnvelope) => void
): Promise<T> {
  let attempt = 0;

  while (true) {
    try {
      return await fn();
    } catch (err) {
      attempt++;
      const envelope = err instanceof Error
        ? fromNativeError(err)
        : fromNativeError(new Error(String(err)));

      // 检查是否应该重试
      const shouldRetry = attempt <= config.maxRetries && (
        config.retryOnErrorTypes.length === 0 ||
        config.retryOnErrorTypes.includes(envelope.type)
      );

      if (!shouldRetry) {
        throw err;
      }

      onRetry?.(attempt, envelope);

      // 计算等待时间
      const waitMs = config.backoffStrategy === BackoffStrategy.EXPONENTIAL
        ? config.backoffBaseMs * Math.pow(2, attempt - 1)
        : config.backoffBaseMs;

      log.warn({ attempt, waitMs, error: envelope.message }, "Node execution failed, retrying...");
      await new Promise(r => setTimeout(r, waitMs));
    }
  }
}

/**
 * GraphNodeRunner — 负责运行单个节点（含 retry + guardrails）
 */
export class GraphNodeRunner {
  constructor(private registry: NodeExecutorRegistry) {}

  async run(
    node: NodeDefinition,
    ctx: NodeContext,
    onEvent: (event: Partial<StepEvent>) => void,
    onStateChange: (state: NodeState, data?: Partial<Step>) => void
  ): Promise<NodeResult> {
    const executor = this.registry.get(node.type);
    if (!executor) {
      throw new Error(`No executor registered for node type: ${node.type}`);
    }

    // 通知状态: 开始运行
    const startedAt = new Date().toISOString();
    onStateChange(NodeState.RUNNING, { startedAt });

    log.info({ nodeId: node.id, nodeType: node.type, runId: ctx.runId }, "Node started");

    const retryConfig = {
      maxRetries: node.retry?.maxRetries ?? 0,
      backoffStrategy: node.retry?.backoffStrategy ?? BackoffStrategy.FIXED,
      backoffBaseMs: node.retry?.backoffBaseMs ?? 1000,
      retryOnErrorTypes: node.retry?.retryOnErrorTypes ?? [],
    };

    let retryCount = 0;

    try {
      const result = await withRetry(
        () => executor.execute(node, ctx),
        retryConfig,
        (attempt, _error) => {
          retryCount = attempt;
          onStateChange(NodeState.RUNNING, { retryCount });
          log.warn({ nodeId: node.id, attempt }, "Retrying node execution");
        }
      );

      // 通知状态: 成功
      const completedAt = new Date().toISOString();
      const durationMs = new Date(completedAt).getTime() - new Date(startedAt).getTime();

      onStateChange(NodeState.SUCCESS, { completedAt, durationMs, retryCount });

      // 发出 StepEvent
      onEvent({
        eventId: nanoid(),
        runId: ctx.runId,
        stepId: ctx.stepId,
        nodeId: node.id,
        timestamp: completedAt,
        output: JSON.stringify(result.output),
        renderedPrompt: result.renderedPrompt,
        tokens: result.tokens,
        costUsd: result.costUsd,
        durationMs,
        providerMeta: result.providerMeta,
      });

      log.info({ nodeId: node.id, durationMs }, "Node completed successfully");
      return result;

    } catch (err) {
      const completedAt = new Date().toISOString();
      const durationMs = new Date(completedAt).getTime() - new Date(startedAt).getTime();
      const errorEnvelope = fromNativeError(err, ErrorType.SYSTEM_ERROR, {
        nodeId: node.id,
        runId: ctx.runId,
      });

      onStateChange(NodeState.ERROR, { completedAt, durationMs, retryCount });

      // 发出错误 StepEvent
      onEvent({
        eventId: nanoid(),
        runId: ctx.runId,
        stepId: ctx.stepId,
        nodeId: node.id,
        timestamp: completedAt,
        error: errorEnvelope,
        durationMs,
      });

      log.error({ nodeId: node.id, error: errorEnvelope }, "Node execution failed");
      throw err;
    }
  }
}
