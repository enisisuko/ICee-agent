import { NodeType } from "@omega/shared";
import type { NodeDefinition } from "@omega/shared";
import { BaseNodeExecutor } from "../NodeExecutor.js";
import type { NodeContext, NodeResult } from "../NodeExecutor.js";

/** OUTPUT 节点：将前一节点输出作为 Run 最终结果 */
export class OutputNodeExecutor extends BaseNodeExecutor {
  readonly nodeType = NodeType.OUTPUT;

  async execute(_node: NodeDefinition, ctx: NodeContext): Promise<NodeResult> {
    return {
      output: ctx.previousOutput ?? {},
    };
  }
}
