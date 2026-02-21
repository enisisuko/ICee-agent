import { NodeType } from "@icee/shared";
import type { NodeDefinition } from "@icee/shared";
import { BaseNodeExecutor } from "../NodeExecutor.js";
import type { NodeContext, NodeResult } from "../NodeExecutor.js";
import { createLogger } from "../../logger.js";

const log = createLogger("ReflectionNodeExecutor");

/** 反思结�?*/
interface ReflectionResult {
  shouldRetry: boolean;
  confidence: number;
  reasoning: string;
  modifiedOutput?: unknown;
}

/**
 * REFLECTION 节点执行�?
 * 评估上一步输出质量，决定是否需要重试或修改参数
 */
export class ReflectionNodeExecutor extends BaseNodeExecutor {
  readonly nodeType = NodeType.REFLECTION;

  constructor(
    private readonly reflect: (
      input: unknown,
      confidenceThreshold: number
    ) => Promise<ReflectionResult>
  ) { super(); }

  async execute(node: NodeDefinition, ctx: NodeContext): Promise<NodeResult> {
    const config = node.config as { confidenceThreshold?: number } | undefined;
    const threshold = node.guardrails?.confidenceThreshold ?? config?.confidenceThreshold ?? 0.7;

    log.debug({ nodeId: node.id, threshold }, "Reflection node evaluating output");

    const result = await this.reflect(ctx.previousOutput, threshold);

    log.info({
      nodeId: node.id,
      confidence: result.confidence,
      shouldRetry: result.shouldRetry,
    }, "Reflection completed");

    return {
      output: {
        ...result,
        original: ctx.previousOutput,
      },
    };
  }
}
