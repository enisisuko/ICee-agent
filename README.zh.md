<div align="center">

<img src="https://raw.githubusercontent.com/enisisuko/ICee-agent/main/screenshots/icee-ui-demo.png" alt="ICee Agent" width="100%">

# ICee Agent · v1.0.3

**本地优先的 AI 智能体桌面应用。每一步可见，每一步可控。**

一款让 AI 智能体变得透明、可控的桌面应用 — 实时观察每次决策，回退到任意步骤，编辑提示词，从那里继续分支执行。

[![CI](https://github.com/enisisuko/ICee-agent/actions/workflows/ci.yml/badge.svg)](https://github.com/enisisuko/ICee-agent/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node](https://img.shields.io/badge/Node-%3E%3D20-brightgreen)](https://nodejs.org/)
[![Electron](https://img.shields.io/badge/Electron-35-blueviolet)](https://www.electronjs.org/)
[![Ollama](https://img.shields.io/badge/Ollama-ready-black)](https://ollama.com/)
[![MCP](https://img.shields.io/badge/MCP-supported-orange)](https://modelcontextprotocol.io/)

[English](README.md) · [提交 Bug](https://github.com/enisisuko/ICee-agent/issues) · [功能请求](https://github.com/enisisuko/ICee-agent/issues)

</div>

---

## 为什么选择 ICee？

大多数 AI 智能体工具都是黑盒。你提交任务，等待，然后祈祷结果正确 — 出错了就只能重头再来。

ICee 的设计理念完全不同：

| | 其他智能体工具 | ICee Agent |
|---|:---:|:---:|
| 实时查看每一步 | ✗ | ✓ |
| 运行中编辑提示词 | ✗ | ✓ |
| 从任意步骤分支执行 | ✗ | ✓ |
| 完全离线运行 | 部分 | **始终可以** |
| 需要 API Key | 必须 | **可选** |

---

## ✨ ICee 的独特之处

### 1. 步骤级回退与重新执行

<img src="https://raw.githubusercontent.com/enisisuko/ICee-agent/main/screenshots/icee-step-detail.png" alt="步骤详情 — 回退与重跑控件" width="100%">

每个节点都完整记录其执行历史：发送的精确提示词、接收到的输出、Token 数量、耗时，以及是否成功或重试。任意时刻你都可以：

- **回退此步骤** — 回滚到该节点的上一次尝试
- **从此处重跑** — 从该节点向前分支整个工作流

<img src="https://raw.githubusercontent.com/enisisuko/ICee-agent/main/screenshots/icee-rerun-modal.png" alt="重跑弹窗 — 执行前编辑提示词" width="100%">

重跑弹窗并排显示上次的输入和输出以供参考 — 然后允许你在重新执行前编辑精确的提示词。改一个词或整段重写都行。下游节点会被清空，并从分支点重新执行。

> **底层机制**：每次 Fork 在 SQLite 中生成新的 `runId`，保留 `parent_run_id` 和 `fork_from_step_id` 字段。完整的执行血统链被永久保存 — 你始终可以追溯到任何结果是如何产生的。

<img src="https://raw.githubusercontent.com/enisisuko/ICee-agent/main/screenshots/icee-node-graph.png" alt="节点图 — 显示各步骤状态" width="100%">

节点状态实时更新：`运行中` → `完成`（绿色）/ `错误`（红色）→ `用户已回退步骤` → 重新运行。图形始终精确反映智能体当前所在位置。

---

### 2. 本地模型优先 — 无需云端

ICee 从底层开始就为**通过 Ollama 运行本地大模型**而构建。无需 API Key，数据不离本机，没有按 Token 计费。

> **完全离线**：Ollama 负责大模型，DuckDuckGo 提供网页搜索（无需 Key），8 个内置工具覆盖文件系统、剪贴板和代码执行。所有功能均可在零外部账户的情况下运行。

```bash
ollama pull qwen2.5:7b      # 中文任务推荐
ollama pull llama3.2        # 快速通用
ollama pull deepseek-r1:8b  # 强推理能力
```

无论使用本地模型还是云端服务，所有功能 — 流式输出、工具调用、多轮记忆、上下文压缩 — 的表现完全一致。切换服务商只需修改一个配置项，其余系统不变。

| 服务商 | 类型 | 备注 |
|--------|------|------|
| **Ollama** | 本地 | 默认 — 无需 Key，零费用，完全私密 |
| **LM Studio** | 本地 | OpenAI 兼容本地服务器 |
| **OpenAI** | 云端 | GPT-4o、o1 等 |
| **Groq** | 云端 | 快速推理，免费额度慷慨 |
| **Azure OpenAI** | 云端 | 企业级部署 |
| 任意 OpenAI 兼容 API | 均可 | 填写一个 URL 即可配置 |

---

## 智能体能做什么

ICee 运行 **ReAct 循环**（推理 → 行动 → 观察，最多 20 次迭代）。智能体自主决定何时调用哪些工具以及何时停止。如果没有进展，Nudge 机制会提示其重新组织；达到迭代上限时，它会以较低温度写出强制总结。

### 8 个内置工具 — 零配置

所有工具直接在 Electron 进程中运行。无需外部服务器，无需任何配置。

| 工具 | 功能 |
|------|------|
| `web_search` | DuckDuckGo 搜索 — 无需 API Key |
| `http_fetch` | 抓取任意 URL，自动过滤脚本和 HTML 标签 |
| `fs_read` | 读取文件或列出目录内容 |
| `fs_write` | 写入文件，自动创建所需目录 |
| `code_exec` | 内联运行 JS / Python / Bash（Windows 上为 PowerShell） |
| `clipboard_read` | 读取系统剪贴板 |
| `clipboard_write` | 写入系统剪贴板 |
| `browser_open` | 在默认浏览器中打开任意 URL |

### MCP 工具服务器支持

连接任意 [Model Context Protocol](https://modelcontextprotocol.io/) 服务器以获得额外工具。名称冲突时内置工具优先。

### 规则系统

通过双层规则系统塑造智能体行为：
- **全局规则** — 存储于 SQLite，注入到每次会话的系统提示词中
- **项目规则** — 在任意目录放置 `.icee/rules.md`，工作于该目录时自动加载

### 智能体技能

| 技能 | 功能 |
|------|------|
| `ContextCompressor` | Token 预算达到 80% 时自动压缩历史，保留任务定义和近期上下文 |
| `RetryWithBackoff` | LLM 失败时指数退避重试（最多 2 次，延迟最长 10 秒） |
| `OutputFormatter` | 规范化代码块，修正最终输出的格式和空白 |

---

## 🚀 快速开始

### 方式一 — 下载安装包

从 [Releases](https://github.com/enisisuko/ICee-agent/releases) 下载适合你平台的最新版本：
- **Windows**: `ICEE Agent Setup 1.0.3.exe`（NSIS 安装程序）
- **macOS**: `ICee-Agent-1.0.3.dmg`

然后安装 [Ollama](https://ollama.com/)，拉取模型，启动 ICee 即可。

### 方式二 — 源码运行

**环境要求**：[Node.js](https://nodejs.org/) ≥ 20、[pnpm](https://pnpm.io/) ≥ 9、[Ollama](https://ollama.com/)

```bash
git clone https://github.com/enisisuko/ICee-agent.git
cd ICee-agent
pnpm install
pnpm desktop
```

```bash
# 在另一个终端，启动 Ollama 并拉取模型
ollama serve
ollama pull qwen2.5:7b
```

打开应用 → 设置 → 添加服务商 → 输入任务 → 观察执行过程。

---

## 🗂️ 项目结构

pnpm Monorepo，由 Turborepo 驱动：

```
ICee-agent/
├── apps/
│   └── desktop/           # Electron 应用（主进程 + 渲染进程）
│       └── src/
│           ├── main/      # IPC 处理器、MCP 客户端、内置工具、SQLite
│           └── renderer/  # React UI — NerveCenter、侧边栏、设置
├── packages/
│   ├── core/              # 智能体引擎：ReAct 循环、GraphRuntime、执行器、技能
│   ├── providers/         # LLM 适配器：Ollama、OpenAI 兼容
│   ├── shared/            # Zod Schema、共享 TypeScript 类型
│   └── db/                # SQLite 层（8 张表，自动迁移）
└── demo/
    ├── ollama-chat/       # 最简 3 节点对话流水线
    └── search-summarize/  # 4 节点搜索 + 总结示例
```

---

## 🛠️ 技术栈

| 层级 | 技术 |
|------|------|
| 桌面外壳 | Electron 35 |
| UI 框架 | React 18 + Framer Motion 11 + Tailwind CSS 3 |
| 智能体引擎 | 自研 ReAct 循环 · GraphRuntime（run / forkRun / cancelRun） |
| 持久化 | SQLite（better-sqlite3）· 8 张表 · 自动迁移 |
| 构建工具 | Vite 5 · pnpm workspaces · Turborepo |
| 打包分发 | electron-builder · NSIS（Windows）· DMG（macOS） |

---

## 🗺️ 路线图

- [x] 带 Token 流式输出的 ReAct 智能体循环
- [x] 实时节点可视化（NerveCenter）
- [x] 步骤级回退与重跑（含提示词编辑）
- [x] 基于 Fork 的执行，DB 级血统追踪
- [x] 8 个内置工具 — 无需 API Key
- [x] Ollama / 本地模型优先
- [x] 多服务商支持（云端 + 本地）
- [x] 规则系统（全局 + 项目级）
- [x] MCP 工具服务器集成
- [x] 多轮对话
- [x] 打包安装程序 — v1.0.3（Windows NSIS + macOS DMG）
- [x] 插件系统（架构已就位）
- [ ] 子智能体市场预设
- [ ] Web 版本（基于浏览器）
- [ ] 可视化工作流图形编辑器

---

## 🤝 参与贡献

查看 [CONTRIBUTING.md](CONTRIBUTING.md) 了解开发环境配置，以及如何添加服务商、节点执行器或内置工具。

---

## 📄 许可证

[MIT](LICENSE) © 2026 ICee Agent Contributors
