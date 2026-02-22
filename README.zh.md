<div align="center">

<img src="https://raw.githubusercontent.com/enisisuko/ICee-agent/master/screenshots/icee-ui-demo.png" alt="ICee Agent" width="100%">

# ICee Agent

**本地运行 AI 智能体。看见每一步。随时修改任意步骤。**

本地优先的智能体桌面应用，实时节点可视化 — 专为想完全掌控 AI 思考与行动过程的人设计。

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node](https://img.shields.io/badge/Node-%3E%3D20-brightgreen)](https://nodejs.org/)
[![Electron](https://img.shields.io/badge/Electron-35-blueviolet)](https://www.electronjs.org/)
[![Ollama](https://img.shields.io/badge/Ollama-支持-black)](https://ollama.com/)
[![MCP](https://img.shields.io/badge/MCP-支持-orange)](https://modelcontextprotocol.io/)

[English](README.md) · [提交 Bug](https://github.com/enisisuko/ICee-agent/issues) · [功能建议](https://github.com/enisisuko/ICee-agent/issues)

</div>

---

## 为什么选 ICee？

大多数 AI 智能体工具都是黑盒。你提交任务、等待、祈祷结果正确。

ICee 不一样。智能体的每一步都实时渲染为可视节点 —— 你能看到它思考、行动、完成的全过程。当结果不对（或者可以更好）时，你不需要从头重来。**直接回退到那个步骤，编辑提示词，从那里重新执行。**

---

## ✨ ICee 的两个核心优势

### 1. 步骤级回退与重执行

<img src="https://raw.githubusercontent.com/enisisuko/ICee-agent/master/screenshots/icee-step-detail.png" alt="步骤详情：包含回退和重跑控制" width="100%">

每个节点都展示完整的**步骤历史**：发送了什么提示词、输出是什么、耗时多久、是否成功或重试。你随时可以：

- **撤销此步骤（Revert this step）** — 回退到同一节点的上一次尝试
- **从此处重跑（Rerun from here）** — 从这个节点开始分叉整个工作流

<img src="https://raw.githubusercontent.com/enisisuko/ICee-agent/master/screenshots/icee-rerun-modal.png" alt="重跑弹窗：执行前编辑提示词" width="100%">

重跑弹窗让你**直接编辑发送给 AI 的提示词** — 左侧显示上一次的输入，右侧显示上一次的输出，提供完整上下文参考。改一个词或者重写整段都行。下游节点会被清空，从分支点重新执行。

<img src="https://raw.githubusercontent.com/enisisuko/ICee-agent/master/screenshots/icee-node-graph.png" alt="节点图：显示各步骤状态" width="100%">

节点状态实时更新：`done`（绿色）→ `error`（红色）→ `Step reverted by user`（用户已撤销）→ 重新执行中。图表始终精准反映智能体当前所处位置。

---

### 2. 本地模型优先 — 无需云端

ICee 从底层就是为**本地 LLM（通过 Ollama）**设计的。无需 API Key，数据不出本机，没有按 token 计费。

```bash
ollama pull qwen2.5:7b      # 中文任务推荐
ollama pull llama3.2        # 快速通用
ollama pull deepseek-r1:8b  # 推理能力强
```

所有功能 — 流式输出、工具调用、多轮记忆、上下文压缩 — 无论你用本地 Ollama 还是云端 Provider，表现完全一致。Provider 只是一个配置项，系统其余部分不关心它是本地还是云端。

开箱即支持的 Provider：

| Provider | 类型 | 说明 |
|----------|------|------|
| **Ollama** | 本地 | 默认推荐。无需密钥，零费用，完全隐私 |
| **LM Studio** | 本地 | 兼容 OpenAI 协议的本地推理服务器 |
| **OpenAI** | 云端 | GPT-4o、o1 等 |
| **Groq** | 云端 | 极速推理，免费额度慷慨 |
| **Azure OpenAI** | 云端 | 企业级部署 |
| 任意 OpenAI 兼容 API | 均可 | 填一个 Base URL 即可接入 |

---

## 智能体能做什么

ICee 运行 **ReAct 循环**（推理 → 行动 → 观察，最多 20 次迭代）。智能体自主决定调用哪些工具，以及何时停止。

### 8 个内置工具 — 零配置

| 工具 | 功能 |
|------|------|
| `web_search` | DuckDuckGo 搜索，无需 API Key |
| `http_fetch` | 抓取任意 URL，自动去除 HTML |
| `fs_read` | 读取文件或列出目录内容 |
| `fs_write` | 写入文件（自动创建目录） |
| `code_exec` | 内联执行 JS / Python / Bash |
| `clipboard_read` | 读取系统剪贴板 |
| `clipboard_write` | 写入系统剪贴板 |
| `browser_open` | 用默认浏览器打开 URL |

所有工具直接在 Electron 进程中运行，无需外部服务器。

### MCP 工具服务器支持

接入任意 [Model Context Protocol](https://modelcontextprotocol.io/) 服务器以获得更多工具。名称冲突时内置工具优先。

### Rules 规则系统

通过双层规则系统塑造智能体行为：
- **全局规则** — 存储在 SQLite，每个会话都生效
- **项目规则** — 在任意目录放置 `.icee/rules.md`，进入该目录时自动加载

---

## 🚀 快速开始

### 环境要求

- [Node.js](https://nodejs.org/) ≥ 20
- [pnpm](https://pnpm.io/) ≥ 9
- [Ollama](https://ollama.com/)（推荐）或任意兼容 OpenAI 协议的 API

### 安装并运行

```bash
git clone https://github.com/enisisuko/ICee-agent.git
cd ICee-agent
pnpm install
pnpm desktop
```

拉取模型并启动：

```bash
ollama serve
ollama pull qwen2.5:7b
```

打开应用 → 设置 → 添加 Provider → 输入任务 → 看它运行。

---

## 🗂️ 项目结构

pnpm monorepo，基于 Turborepo：

```
ICee-agent/
├── apps/desktop/          # Electron 应用
│   └── src/
│       ├── main/          # 主进程：IPC、运行时、MCP、内置工具
│       └── renderer/      # React UI：NerveCenter、侧边栏、设置
├── packages/
│   ├── core/              # 智能体引擎：ReAct 循环、GraphRuntime、执行器
│   ├── shared/            # Zod Schema、共享 TypeScript 类型
│   └── db/                # SQLite 层（8 张表，自动迁移）
└── demo/                  # 最简示例
    ├── ollama-chat/       # 3 节点对话流水线
    └── search-summarize/  # 4 节点搜索+总结
```

---

## 🗺️ 路线图

- [x] 带 token 流式输出的 ReAct 循环
- [x] 实时节点可视化（NerveCenter）
- [x] 步骤级回退与提示词编辑重跑
- [x] 8 个内置工具（无需 API Key）
- [x] Ollama / 本地模型优先支持
- [x] 多 Provider（云端 + 本地）
- [x] Rules 系统（全局 + 项目级）
- [x] MCP 工具服务器集成
- [x] 多轮对话
- [ ] 打包安装程序（NSIS / DMG）
- [ ] 插件系统（架构已就位）
- [ ] 子智能体市场预设
- [ ] Web 版本

---

## 🤝 贡献

请查看 [CONTRIBUTING.md](CONTRIBUTING.md) 了解开发环境搭建、如何新增 Provider、节点执行器或内置工具。

---

## 📄 许可证

[MIT](LICENSE) © 2026 ICee Agent Contributors
