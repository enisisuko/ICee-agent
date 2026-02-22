# demo/ollama-chat

最简单的 Omega 本地 AI 演示：把用户问题发给本地 Ollama，返回 AI 回答。

```
Input → LLM(ollama/llama3.2) → Output
```

---

## 前置要求

### 1. 安装 Ollama

前往 https://ollama.com 下载并安装 Ollama，然后拉取模型：

```bash
# 推荐入门模型 (约 2GB)
ollama pull llama3.2

# 中文效果更好的替代选项
ollama pull qwen2.5:3b

# 确认 Ollama 服务正在运行
ollama serve
```

### 2. 确认 Node.js 版本 ≥ 24

```bash
node --version   # 必须 v24.x 或更高（node:sqlite 内置模块依赖）
```

---

## 运行

在项目根目录执行：

```bash
# 方式一：tsx 直接运行（开发模式，无需编译）
pnpm --filter @omega/cli run dev -- run demo/ollama-chat/graph.json \
  --input '{"query": "用一句话解释什么是 AI Agent"}'

# 方式二：指定中文问题
pnpm --filter @omega/cli run dev -- run demo/ollama-chat/graph.json \
  --input '{"query": "What is the meaning of life?"}'

# 方式三：自定义 Ollama 地址（如果不在默认端口）
pnpm --filter @omega/cli run dev -- run demo/ollama-chat/graph.json \
  --input '{"query": "你好"}' \
  --ollama-url http://localhost:11434

# 方式四：强制 mock 模式（无需 Ollama，测试用）
pnpm --filter @omega/cli run dev -- run demo/ollama-chat/graph.json \
  --input '{"query": "hello"}' \
  --mock
```

### 使用不同模型

修改 `graph.json` 里 `chat` 节点的 `model` 字段：

```json
"config": {
  "provider": "ollama",
  "model": "qwen2.5:3b",   // 改这里
  ...
}
```

或者复制 `graph.json` 为新文件再修改。

---

## 期望输出示例

```
[OMEGA] ─────────────────────────────────────
[OMEGA] Omega Agent Graph Runtime v0.1
[OMEGA] ─────────────────────────────────────
[OMEGA] Loading graph: demo/ollama-chat/graph.json
[OMEGA] Graph: "Ollama Chat" (3 nodes, 2 edges)
[OMEGA] Checking Ollama at http://localhost:11434...
[OMEGA] ✅ Ollama is available. Models: llama3.2:latest
[OMEGA] Database: /path/to/omega.db
[OMEGA] ▶ Run started: run_abc123
[OMEGA]   → [INPUT] User Query
[OMEGA]   ✓ input completed
[OMEGA]   → [LLM] Ollama LLM
[OMEGA]   🤖 LLM call → ollama/llama3.2
[OMEGA]      Prompt (29 chars)
[OMEGA]      ✓ 84 tokens
[OMEGA]      Output: AI Agent 是一种能够自主感知环境、做出决策并执行行动的人工智能系统…
[OMEGA]   ✓ chat completed
[OMEGA]   → [OUTPUT] Response
[OMEGA]   ✓ output completed
[OMEGA] ─────────────────────────────────────
[OMEGA] ✅ Run COMPLETED
[OMEGA]    Duration: 3421ms
[OMEGA]    Tokens:   84
[OMEGA]    Cost:     $0.000000
[OMEGA] ─────────────────────────────────────
[OMEGA] Total wall time: 3650ms
```

---

## 查看历史 Run

所有 run 都持久化到 SQLite，可以用 list 命令查看：

```bash
pnpm --filter @omega/cli run dev -- list
```

---

## 如果 Ollama 不可达

CLI 会自动降级为 mock 模式并打印警告：

```
[OMEGA] ⚠️  Ollama not reachable at http://localhost:11434
[OMEGA] ⚠️  Falling back to mock mode. Start Ollama and rerun to use real AI.
[OMEGA] ⚠️  Hint: ollama serve  /  ollama pull llama3.2
```


