import fs from "fs";
import path from "path";
import { GraphDefinitionSchema } from "@icee/shared";
import { getDatabase, RunRepository, StepRepository, EventRepository } from "@icee/db";
import {
  GraphRuntime, GraphNodeRunner, NodeExecutorRegistry,
  InputNodeExecutor, OutputNodeExecutor, LLMNodeExecutor,
  ToolNodeExecutor, MemoryNodeExecutor, ReflectionNodeExecutor, PlanningNodeExecutor
} from "@icee/core";
import { OllamaProvider } from "@icee/providers";

/** run 命令选项类型 */
interface RunOptions {
  input?: string;
  db: string;
  maxTokens?: number;
  maxCost?: number;
  /** Ollama 服务地址，默认 http://localhost:11434 */
  ollamaUrl?: string;
  /** 强制使用 mock 模式（不连接真实 Ollama，适合测试） */
  mock?: boolean;
}

/**
 * icee run <graphFile> 命令实现
 *
 * 默认行为：
 *   - 检查 Ollama 是否可用，可用则接入真实 LLM
 *   - Ollama 不可用时打印警告并自动降级为 mock 模式
 *   - 传入 --mock 强制使用 mock，跳过健康检查
 *
 * LLM provider 优先级:
 *   1. --mock flag → mock
 *   2. Ollama 健康检查通过 → 真实 OllamaProvider
 *   3. Ollama 不可达 → 降级 mock（附警告）
 */
export async function runCommand(
  graphFile: string,
  opts: RunOptions
): Promise<void> {
  const ollamaBaseUrl = opts.ollamaUrl ?? "http://localhost:11434";

  console.log(`[ICEE] ─────────────────────────────────────`);
  console.log(`[ICEE] ICEE Agent Graph Runtime v0.1`);
  console.log(`[ICEE] ─────────────────────────────────────`);
  console.log(`[ICEE] Loading graph: ${graphFile}`);

  // ── 解析 graph 文件 ──────────────────────────────
  const absolutePath = path.resolve(graphFile);
  if (!fs.existsSync(absolutePath)) {
    console.error(`[ICEE] ❌ Graph file not found: ${absolutePath}`);
    process.exit(1);
  }

  let graphRaw: unknown;
  try {
    graphRaw = JSON.parse(fs.readFileSync(absolutePath, "utf-8"));
  } catch (e) {
    console.error(`[ICEE] ❌ Failed to parse graph JSON: ${(e as Error).message}`);
    process.exit(1);
  }

  const graphResult = GraphDefinitionSchema.safeParse(graphRaw);
  if (!graphResult.success) {
    console.error("[ICEE] ❌ Invalid graph definition:");
    console.error(JSON.stringify(graphResult.error.format(), null, 2));
    process.exit(1);
  }
  const graph = graphResult.data;
  console.log(`[ICEE] Graph: "${graph.name}" (${graph.nodes.length} nodes, ${graph.edges.length} edges)`);

  // ── 解析输入 ─────────────────────────────────────
  let input: Record<string, unknown> | undefined;
  if (opts.input) {
    try {
      input = JSON.parse(opts.input) as Record<string, unknown>;
    } catch {
      console.error(`[ICEE] ❌ --input must be valid JSON. Got: ${opts.input}`);
      process.exit(1);
    }
  }

  // ── 确定 LLM Provider 模式 ────────────────────────
  let useMock = opts.mock === true;
  let ollamaProvider: OllamaProvider | null = null;

  if (!useMock) {
    // 尝试 Ollama 健康检查
    console.log(`[ICEE] Checking Ollama at ${ollamaBaseUrl}...`);
    const tempProvider = new OllamaProvider({ baseUrl: ollamaBaseUrl });
    const isHealthy = await tempProvider.healthCheck();

    if (isHealthy) {
      ollamaProvider = tempProvider;
      const models = await tempProvider.listModels();
      console.log(`[ICEE] ✅ Ollama is available. Models: ${models.slice(0, 5).join(", ") || "(none pulled)"}`);
    } else {
      useMock = true;
      console.warn(`[ICEE] ⚠️  Ollama not reachable at ${ollamaBaseUrl}`);
      console.warn(`[ICEE] ⚠️  Falling back to mock mode. Start Ollama and rerun to use real AI.`);
      console.warn(`[ICEE] ⚠️  Hint: ollama serve  /  ollama pull llama3.2`);
    }
  } else {
    console.log(`[ICEE] Mock mode enabled (--mock flag)`);
  }

  // ── 初始化数据库 ──────────────────────────────────
  const iceeDb = getDatabase(opts.db);
  const runRepo = new RunRepository(iceeDb.instance);
  const stepRepo = new StepRepository(iceeDb.instance);
  const eventRepo = new EventRepository(iceeDb.instance);
  console.log(`[ICEE] Database: ${path.resolve(opts.db)}`);

  // ── 注册节点执行器 ────────────────────────────────
  const registry = new NodeExecutorRegistry();
  registry.register(new InputNodeExecutor());
  registry.register(new OutputNodeExecutor());
  registry.register(new MemoryNodeExecutor());

  // LLM 执行器 — 真实 Ollama 或 mock
  if (ollamaProvider) {
    const provider = ollamaProvider;
    registry.register(new LLMNodeExecutor(async (config, _input) => {
      const modelLabel = `${config.provider ?? "ollama"}/${config.model}`;
      console.log(`[ICEE]   🤖 LLM call → ${modelLabel}`);
      console.log(`[ICEE]      Prompt (${(config.promptTemplate ?? "").length} chars)`);

      try {
        const requestPayload: import("@icee/shared").LLMRequest = {
          model: config.model,
          messages: [
            {
              role: "system",
              content: config.systemPrompt ?? "You are a helpful assistant.",
            },
            {
              role: "user",
              // promptTemplate 已经由 LLMNodeExecutor 渲染好了占位符
              content: config.promptTemplate ?? "",
            },
          ],
          stream: true,
          // exactOptionalPropertyTypes: 只有有值时才设置
          ...(config.temperature !== undefined && { temperature: config.temperature }),
          ...(config.topP !== undefined && { topP: config.topP }),
          ...(config.maxTokens !== undefined && { maxTokens: config.maxTokens }),
        };
        const result = await provider.generateComplete(requestPayload);

        console.log(`[ICEE]      ✓ ${result.tokens} tokens`);
        // 截断显示前 200 字符
        const preview = result.text.slice(0, 200).replace(/\n/g, " ");
        console.log(`[ICEE]      Output: ${preview}${result.text.length > 200 ? "…" : ""}`);
        return result;
      } catch (e) {
        const msg = (e as Error).message;
        console.error(`[ICEE]   ❌ Ollama error: ${msg}`);
        // 如果是模型未找到，给出友好提示
        if (msg.includes("model") || msg.includes("404")) {
          console.error(`[ICEE]   💡 Hint: run  ollama pull ${config.model}  to download the model`);
        }
        throw e;
      }
    }));
  } else {
    // Mock LLM 执行器
    registry.register(new LLMNodeExecutor(async (config, _input) => {
      const modelLabel = `${config.provider ?? "mock"}/${config.model}`;
      console.log(`[ICEE]   🔲 LLM mock → ${modelLabel}`);
      return {
        text: `[Mock LLM output for model ${config.model}] — Start Ollama to get real AI responses.`,
        tokens: 100,
        costUsd: 0,
        providerMeta: { provider: "mock", model: config.model },
      };
    }));
  }

  // Tool 执行器 (mock — 工具系统将在后续版本接入)
  registry.register(new ToolNodeExecutor(async (toolName, _version, toolInput, _timeout) => {
    console.log(`[ICEE]   🔧 Tool: ${toolName}`, JSON.stringify(toolInput).slice(0, 100));
    return { result: `[Mock tool output from ${toolName}]` };
  }));

  // Planning 执行器 (mock)
  registry.register(new PlanningNodeExecutor(async (goal, _mode) => {
    return {
      tasks: [{ id: "task-1", description: String(goal), priority: 1 }],
      totalSteps: 1,
      strategy: "sequential" as const,
    };
  }));

  // Reflection 执行器 (mock)
  registry.register(new ReflectionNodeExecutor(async (reflInput, threshold) => ({
    shouldRetry: false,
    confidence: (threshold ?? 0.6) + 0.1,
    reasoning: "Output quality is acceptable",
    modifiedOutput: reflInput,
  })));

  const nodeRunner = new GraphNodeRunner(registry);

  // ── 启动 Runtime ──────────────────────────────────
  const startTime = Date.now();

  const runtime = new GraphRuntime(
    nodeRunner,
    runRepo,
    stepRepo,
    eventRepo,
    (event) => {
      switch (event.type) {
        case "event:run_started":
          console.log(`[ICEE] ▶ Run started: ${event.payload.runId}`);
          break;
        case "event:step_started":
          console.log(`[ICEE]   → [${event.payload.nodeType}] ${event.payload.nodeLabel}`);
          break;
        case "event:step_completed":
          console.log(`[ICEE]   ✓ ${event.payload.nodeId} completed`);
          break;
        case "event:run_completed":
          console.log(`[ICEE] ─────────────────────────────────────`);
          console.log(`[ICEE] ✅ Run ${event.payload.state}`);
          console.log(`[ICEE]    Duration: ${event.payload.durationMs}ms`);
          console.log(`[ICEE]    Tokens:   ${event.payload.totalTokens}`);
          console.log(`[ICEE]    Cost:     $${event.payload.totalCostUsd.toFixed(6)}`);
          if (event.payload.output) {
            console.log(`[ICEE]    Output:`);
            console.log(JSON.stringify(event.payload.output, null, 2));
          }
          console.log(`[ICEE] ─────────────────────────────────────`);
          break;
        case "event:error":
          console.error(`[ICEE] ❌ Error: ${event.payload.error.message}`);
          break;
      }
    }
  );

  let runId: string;
  try {
    runId = await runtime.startRun(graph, input);
  } catch (e) {
    console.error(`[ICEE] ❌ Failed to start run: ${(e as Error).message}`);
    iceeDb.close();
    process.exit(1);
  }

  console.log(`[ICEE] Run ID: ${runId}`);

  // 等待 Run 完成 (轮询活跃状态)
  while (runtime.getActiveRunIds().includes(runId)) {
    await new Promise(r => setTimeout(r, 200));
  }

  const elapsed = Date.now() - startTime;
  console.log(`[ICEE] Total wall time: ${elapsed}ms`);

  iceeDb.close();
}
