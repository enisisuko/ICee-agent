import { NodeType } from "@icee/shared";
import type { NodeDefinition, ToolNodeConfig } from "@icee/shared";
import { BaseNodeExecutor } from "../NodeExecutor.js";
import type { NodeContext, NodeResult } from "../NodeExecutor.js";
import { createLogger } from "../../logger.js";

const log = createLogger("ToolNodeExecutor");

/** Tool ?????? */
export type ToolInvoker = (
  toolName: string,
  toolVersion: string,
  input: unknown,
  timeoutMs: number
) => Promise<unknown>;

/** TOOL ??????*/
export class ToolNodeExecutor extends BaseNodeExecutor {
  readonly nodeType = NodeType.TOOL;

  constructor(private readonly invokeTool: ToolInvoker) { super(); }

  async execute(node: NodeDefinition, ctx: NodeContext): Promise<NodeResult> {
    const config = node.config as ToolNodeConfig | undefined;
    if (!config?.toolName) {
      throw new Error(`Tool node "${node.id}" missing toolName config`);
    }

    // ?? tool ?? (????previousOutput ????)
    const toolInput = this.buildInput(ctx.previousOutput, config.inputMapping);

    log.debug({ nodeId: node.id, toolName: config.toolName }, "Tool node invoking tool");

    const result = await this.invokeTool(
      config.toolName,
      config.toolVersion ?? "latest",
      toolInput,
      config.timeoutMs ?? 30000
    );

    return { output: result };
  }

  /** ?? inputMapping ??previousOutput ???? */
  private buildInput(
    previousOutput: unknown,
    inputMapping?: Record<string, string>
  ): unknown {
    if (!inputMapping || typeof previousOutput !== "object" || previousOutput === null) {
      return previousOutput;
    }
    const mapped: Record<string, unknown> = {};
    const prev = previousOutput as Record<string, unknown>;
    for (const [targetKey, sourceKey] of Object.entries(inputMapping)) {
      mapped[targetKey] = prev[sourceKey];
    }
    return mapped;
  }
}
