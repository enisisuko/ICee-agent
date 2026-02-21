import { NodeType } from "@icee/shared";
import type { NodeDefinition } from "@icee/shared";
import { BaseNodeExecutor } from "../NodeExecutor.js";
import type { NodeContext, NodeResult } from "../NodeExecutor.js";
import { createLogger } from "../../logger.js";

const log = createLogger("PlanningNodeExecutor");

/** 规划节点输出 */
interface PlanOutput {
  tasks: Array<{ id: string; description: string; priority: number }>;
  totalSteps: number;
  strategy: "sequential" | "parallel";
}

/**
 * PLANNING 节点执行�?
 * 将目标分解成结构化子步骤
 */
export class PlanningNodeExecutor extends BaseNodeExecutor {
  readonly nodeType = NodeType.PLANNING;

  constructor(
    private readonly plan: (
      goal: unknown,
      mode: "static" | "progressive"
    ) => Promise<PlanOutput>
  ) { super(); }

  async execute(node: NodeDefinition, ctx: NodeContext): Promise<NodeResult> {
    const config = node.config as { mode?: "static" | "progressive" } | undefined;
    const mode = config?.mode ?? "static";

    log.debug({ nodeId: node.id, mode }, "Planning node generating plan");

    const plan = await this.plan(ctx.previousOutput ?? ctx.globalInput, mode);

    log.info({ nodeId: node.id, totalSteps: plan.totalSteps }, "Planning completed");

    return { output: plan };
  }
}
