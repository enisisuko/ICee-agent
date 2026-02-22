import type { LLMRequest, TokenEvent, ProviderInfo } from "@omega/shared";
import type { LLMProvider } from "../LLMProvider.js";
import { createLogger } from "@omega/core";

// 使用 @omega/core 的零依赖自定义 logger，避免 pino-pretty 在打包环境崩溃
const log = createLogger("OllamaProvider");

interface OllamaConfig {
  baseUrl: string;  // 默认 http://localhost:11434
}

/**
 * Ollama Provider 适配器
 * 支持本地运行的 Ollama 实例（llama3, mistral, qwen 等）
 */
export class OllamaProvider implements LLMProvider {
  constructor(private readonly config: OllamaConfig = { baseUrl: "http://localhost:11434" }) {}

  metadata(): ProviderInfo {
    return {
      id: "ollama",
      name: "Ollama (Local)",
      type: "ollama",
      baseUrl: this.config.baseUrl,
      supportsStreaming: true,
      supportsCostReporting: false,  // 本地运行无成本
    };
  }

  async *generate(request: LLMRequest): AsyncIterable<TokenEvent> {
    // Ollama 使用 /api/chat 端点，格式略不同于 OpenAI
    const body = JSON.stringify({
      model: request.model,
      messages: request.messages,
      options: {
        temperature: request.temperature,
        top_p: request.topP,
        num_predict: request.maxTokens,
      },
      stream: true,
    });

    log.debug({ model: request.model, baseUrl: this.config.baseUrl }, "Sending request to Ollama");

    const response = await fetch(`${this.config.baseUrl}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Ollama API error ${response.status}: ${errorText}`);
    }

    if (!response.body) {
      throw new Error("Response body is null");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let promptTokens = 0;
    let completionTokens = 0;

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;

          try {
            const json = JSON.parse(trimmed) as {
              message?: { content?: string };
              done?: boolean;
              prompt_eval_count?: number;
              eval_count?: number;
            };

            const content = json.message?.content ?? "";
            if (content) {
              completionTokens++;
              yield { token: content, done: false };
            }

            // Ollama 的 done=true 时包含统计信息
            if (json.done) {
              promptTokens = json.prompt_eval_count ?? 0;
              completionTokens = json.eval_count ?? completionTokens;

              yield {
                token: "",
                done: true,
                usage: {
                  promptTokens,
                  completionTokens,
                  totalTokens: promptTokens + completionTokens,
                },
                costUsd: 0,  // 本地运行无成本
              };
            }

          } catch {
            // 忽略解析失败的行
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  async generateComplete(request: LLMRequest): Promise<{
    text: string;
    tokens: number;
    costUsd: number;
    providerMeta: { provider: string; model: string; temperature?: number; topP?: number };
  }> {
    let fullText = "";
    let totalTokens = 0;

    for await (const event of this.generate(request)) {
      if (!event.done) {
        fullText += event.token;
      } else {
        totalTokens = event.usage?.totalTokens ?? 0;
      }
    }

    return {
      text: fullText,
      tokens: totalTokens,
      costUsd: 0,
      providerMeta: {
        provider: "ollama",
        model: request.model,
        // exactOptionalPropertyTypes: 只有有值时才包含字段
        ...(request.temperature !== undefined && { temperature: request.temperature }),
        ...(request.topP !== undefined && { topP: request.topP }),
      },
    };
  }

  async listModels(): Promise<string[]> {
    try {
      const response = await fetch(`${this.config.baseUrl}/api/tags`);
      if (!response.ok) return [];
      const json = await response.json() as { models?: Array<{ name: string }> };
      return json.models?.map(m => m.name) ?? [];
    } catch {
      return [];
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.config.baseUrl}/api/tags`, { method: "HEAD" });
      return response.ok;
    } catch {
      return false;
    }
  }
}
