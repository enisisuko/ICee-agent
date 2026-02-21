import { NodeType } from "@icee/shared";
import type { NodeDefinition, LLMNodeConfig } from "@icee/shared";
import { BaseNodeExecutor } from "../NodeExecutor.js";
import type { NodeContext, NodeResult } from "../NodeExecutor.js";
import { createLogger } from "../../logger.js";

const log = createLogger("LLMNodeExecutor");

/**
 * LLM 节点执行器
 * 通过注入的 provider 函数执行 LLM 调用
 * provider 函数由 packages/providers 提供，通过依赖注入传入
 */
export class LLMNodeExecutor extends BaseNodeExecutor {
  readonly nodeType = NodeType.LLM;

  constructor(
    private readonly invokeProvider: (
      config: LLMNodeConfig,
      input: unknown
    ) => Promise<{ text: string; tokens: number; costUsd: number; providerMeta: NodeResult["providerMeta"] }>
  ) { super(); }

  async execute(node: NodeDefinition, ctx: NodeContext): Promise<NodeResult> {
    const config = node.config as LLMNodeConfig | undefined;
    if (!config?.provider || !config?.model) {
      throw new Error(`LLM node "${node.id}" missing provider or model config`);
    }

    // 渲染 Prompt 模板 (简单字符串替换)
    const renderedPrompt = this.renderTemplate(
      config.promptTemplate ?? "",
      ctx.previousOutput,
      ctx.globalInput,
      ctx.runMemory
    );

    log.debug({ nodeId: node.id, provider: config.provider, model: config.model }, "LLM node invoking provider");

    const result = await this.invokeProvider(
      { ...config, promptTemplate: renderedPrompt },
      ctx.previousOutput
    );

    return {
      output: result.text,
      renderedPrompt,
      tokens: result.tokens,
      costUsd: result.costUsd,
      providerMeta: result.providerMeta,
    };
  }

  /**
   * 渲染 Prompt 模板
   * 支持 {{input.xxx}}、{{memory.xxx}}、{{config.xxx}} 三种占位符
   */
  private renderTemplate(
    template: string,
    previousOutput: unknown,
    globalInput?: Record<string, unknown>,
    runMemory?: Map<string, unknown>
  ): string {
    return template.replace(/\{\{(\w+)\.(\w+)\}\}/g, (_match, namespace: string, key: string) => {
      if (namespace === "input") {
        const input = (globalInput ?? {}) as Record<string, unknown>;
        return String(input[key] ?? "");
      }
      if (namespace === "memory") {
        return String(runMemory?.get(key) ?? "");
      }
      if (namespace === "output" && typeof previousOutput === "object" && previousOutput !== null) {
        return String((previousOutput as Record<string, unknown>)[key] ?? "");
      }
      return "";
    });
  }
}
