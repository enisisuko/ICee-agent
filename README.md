# 🧊 ICee Agent

> **Trace-First Agent Graph Runtime** — 可视化 AI 多智能体协作平台

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Node](https://img.shields.io/badge/Node-%3E%3D20.0.0-brightgreen)](https://nodejs.org/)
[![pnpm](https://img.shields.io/badge/pnpm-%3E%3D9.0.0-orange)](https://pnpm.io/)
[![Electron](https://img.shields.io/badge/Electron-Desktop-blueviolet)](https://www.electronjs.org/)

---

## ✨ 项目简介

ICee Agent 是一个**图形化 AI 智能体协作运行时**，支持多智能体节点的可视化编排、实时 Trace 日志监控和链式思考执行流。

基于 **Electron + React** 构建桌面应用，内核采用 **Graph Runtime** 驱动多节点 LLM 协作，让你能直观地看到每一步 AI 的思考过程。

---

## 🌟 核心特性

### 🧠 智能体图执行
- **链式思考图**：Input → Planner → Context → Executor → Reflector → Output 六节点协作
- **实时流式输出**：支持 Token 级别的流式响应
- **多轮对话**：每轮独立执行图，历史轮半透明展示

### 🎨 可视化界面
- **Nerve Center 画布**：垂直滚动列表，节点按拓扑顺序排列
- **NodeConnector 连线**：动态流动效果，实时反映执行状态（pending/running/done/failed）
- **Trace Log 抽屉**：右侧详细日志面板，记录每步 LLM 调用

### 🔌 Provider 管理
- **多 Provider 支持**：Ollama、OpenAI Compatible（LM Studio、Groq 等）
- **热重载配置**：运行中切换模型无需重启
- **SQLite 持久化**：Provider 配置本地安全存储

### 🛠️ 内置工具集
- **web_search**：DuckDuckGo 搜索（无需 API Key）
- **http_fetch**：抓取任意 URL 内容
- **clipboard_read/write**：剪贴板读写
- **MCP 协议支持**：Model Context Protocol 工具接入

### 🤖 内置 Agent Skills
- **ContextCompressor**：上下文超限自动压缩
- **RetryWithBackoff**：指数退避自动重试
- **OutputFormatter**：结构化输出格式化
- **WebSearchSkill**：快速网络搜索

---

## 🚀 快速开始

### 环境要求
- **Node.js** >= 20.0.0
- **pnpm** >= 9.0.0
- **Ollama**（本地 LLM）或任意 OpenAI Compatible 服务

### 安装依赖
```bash
pnpm install
```

### 启动桌面应用
```bash
pnpm desktop
```

### 完整构建
```bash
pnpm build
```

---

## 📦 项目结构

```
ICeeAgent/
├── apps/
│   └── desktop/              # Electron 桌面应用
│       ├── src/
│       │   ├── main/         # 主进程（IPC、MCP、DB）
│       │   ├── preload/      # 预加载脚本
│       │   └── renderer/     # React 渲染进程
│       │       ├── components/  # UI 组件
│       │       ├── hooks/       # 自定义 Hooks
│       │       └── i18n/        # 国际化（中/英）
├── packages/
│   ├── core/                 # 运行时核心（Graph Runtime）
│   ├── shared/               # 共享 Schema（Zod）
│   └── db/                   # SQLite 数据库层
└── demo/                     # 示例项目
```

---

## ⚙️ Provider 配置

在应用的 **Settings** 页面添加 LLM Provider：

| 类型 | 示例 |
|------|------|
| Ollama | `http://localhost:11434` |
| LM Studio | `http://localhost:1234/v1` |
| OpenAI | `https://api.openai.com/v1` |
| Groq | `https://api.groq.com/openai/v1` |

---

## 🔧 技术栈

| 层 | 技术 |
|----|------|
| 桌面壳 | Electron |
| UI | React + TypeScript |
| 动画 | Framer Motion |
| 样式 | Tailwind CSS |
| 数据库 | SQLite (better-sqlite3) |
| 运行时 | 自研 Graph Runtime |
| 包管理 | pnpm Workspaces + Turborepo |
| Schema | Zod |

---

## 📝 License

MIT © 2026 ICee Agent Team

---

<div align="center">
  <sub>Made with ❄️ by the ICee Agent Team</sub>
</div>
