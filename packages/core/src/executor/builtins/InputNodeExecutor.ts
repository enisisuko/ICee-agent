import { NodeType } from "@omega/shared";
import type { NodeDefinition } from "@omega/shared";
import { BaseNodeExecutor } from "../NodeExecutor.js";
import type { NodeContext, NodeResult } from "../NodeExecutor.js";

/** INPUT 节点：将 Run 的全局输入透传给下一个节点 */
export class InputNodeExecutor extends BaseNodeExecutor {
  readonly nodeType = NodeType.INPUT;

  async execute(_node: NodeDefinition, ctx: NodeContext): Promise<NodeResult> {
    return {
      output: ctx.globalInput ?? {},
    };
  }
}
