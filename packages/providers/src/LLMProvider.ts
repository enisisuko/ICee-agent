import type { LLMRequest, TokenEvent, ProviderInfo } from "@icee/shared";

/**
 * LLM Provider 统一接口
 * 所有 Provider 适配器必须实现此接口
 */
export interface LLMProvider {
  /** Provider 元数据 */
  metadata(): ProviderInfo;

  /**
   * 流式生成接口 (AsyncIterable)
   * 每个 yield 是一个 TokenEvent
   * 最后一个 TokenEvent 的 done=true，包含完整的 usage 信息
   */
  generate(request: LLMRequest): AsyncIterable<TokenEvent>;

  /**
   * 非流式生成 (收集所有 token 后返回完整结果)
   * 内部调用 generate() 实现
   */
  generateComplete(request: LLMRequest): Promise<{
    text: string;
    tokens: number;
    costUsd: number;
    providerMeta: {
      provider: string;
      model: string;
      temperature?: number;
      topP?: number;
    };
  }>;

  /** 获取可用模型列表 */
  listModels(): Promise<string[]>;

  /** 健康检查 */
  healthCheck(): Promise<boolean>;
}

/** Provider 注册表 */
export class ProviderRegistry {
  private providers = new Map<string, LLMProvider>();
  private defaultProviderId?: string;

  register(id: string, provider: LLMProvider, isDefault = false): void {
    this.providers.set(id, provider);
    if (isDefault || !this.defaultProviderId) {
      this.defaultProviderId = id;
    }
  }

  get(id: string): LLMProvider | undefined {
    return this.providers.get(id);
  }

  getDefault(): LLMProvider | undefined {
    return this.defaultProviderId ? this.providers.get(this.defaultProviderId) : undefined;
  }

  list(): string[] {
    return Array.from(this.providers.keys());
  }
}
