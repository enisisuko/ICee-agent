import { NodeType } from "@icee/shared";
import type { NodeDefinition } from "@icee/shared";
import { BaseNodeExecutor } from "../NodeExecutor.js";
import type { NodeContext, NodeResult } from "../NodeExecutor.js";

/** MEMORY ???? */
interface MemoryNodeConfig {
  operation: "read" | "write";
  key: string;
  /** write ??: ??previousOutput ????????*/
  valueField?: string;
}

/**
 * MEMORY ??????
 * ?? Run ???? (runMemory)
 * ???????? EventRepository + ?? API ??
 */
export class MemoryNodeExecutor extends BaseNodeExecutor {
  readonly nodeType = NodeType.MEMORY;

  async execute(node: NodeDefinition, ctx: NodeContext): Promise<NodeResult> {
    const config = node.config as MemoryNodeConfig | undefined;
    if (!config?.key) {
      throw new Error(`Memory node "${node.id}" missing key config`);
    }

    if (config.operation === "write") {
      const value = config.valueField
        ? (ctx.previousOutput as Record<string, unknown>)?.[config.valueField]
        : ctx.previousOutput;
      ctx.runMemory.set(config.key, value);
      return { output: { written: true, key: config.key } };
    }

    // read ??
    const value = ctx.runMemory.get(config.key);
    return { output: { key: config.key, value } };
  }
}
