<div align="center">

<img src="https://raw.githubusercontent.com/enisisuko/ICee-agent/master/screenshots/icee-ui-demo.png" alt="ICee Agent" width="100%">

# ICee Agent

**Run AI agents locally. See every step. Edit anything, anytime.**

A local-first agent desktop app with real-time node visualization — built for people who want full control over how their AI thinks and acts.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node](https://img.shields.io/badge/Node-%3E%3D20-brightgreen)](https://nodejs.org/)
[![Electron](https://img.shields.io/badge/Electron-35-blueviolet)](https://www.electronjs.org/)
[![Ollama](https://img.shields.io/badge/Ollama-ready-black)](https://ollama.com/)
[![MCP](https://img.shields.io/badge/MCP-supported-orange)](https://modelcontextprotocol.io/)

[中文文档](README.zh.md) · [Report Bug](https://github.com/enisisuko/ICee-agent/issues) · [Request Feature](https://github.com/enisisuko/ICee-agent/issues)

</div>

---

## Why ICee?

Most AI agent tools are black boxes. You submit a task, wait, and hope the result is right.

ICee is different. Every step the agent takes is rendered as a live node — you watch it think, act, and complete in real time. And when something goes wrong (or could be better), you don't restart from scratch. You **rewind to that exact step, edit the prompt, and rerun from there**.

---

## ✨ Two things ICee does better than anything else

### 1. Step-level rewind & re-execution

<img src="https://raw.githubusercontent.com/enisisuko/ICee-agent/master/screenshots/icee-step-detail.png" alt="Step detail with revert and rerun controls" width="100%">

Every node shows its full **step history**: what prompt was sent, what the output was, how long it took, whether it succeeded or retried. At any point you can:

- **Revert this step** — roll back to a previous attempt within the same node
- **Rerun from here** — branch the entire workflow from this node forward

<img src="https://raw.githubusercontent.com/enisisuko/ICee-agent/master/screenshots/icee-rerun-modal.png" alt="Rerun modal — edit the prompt before re-executing" width="100%">

The rerun modal lets you **edit the exact prompt** that gets sent — with the previous input and output shown side by side for context. Change one word or rewrite the whole thing. Downstream nodes are cleared and re-executed from the branch point.

<img src="https://raw.githubusercontent.com/enisisuko/ICee-agent/master/screenshots/icee-node-graph.png" alt="Node graph showing step states" width="100%">

Node states update live: `done` (green) → `error` (red) → `Step reverted by user` → rerunning. The graph always reflects exactly where the agent is.

---

### 2. Local-model first — no cloud required

ICee is designed from the ground up to run with **local LLMs via Ollama**. No API key, no data leaving your machine, no per-token billing.

```bash
ollama pull qwen2.5:7b      # recommended for Chinese tasks
ollama pull llama3.2        # fast general-purpose
ollama pull deepseek-r1:8b  # strong reasoning
```

Every feature — streaming output, tool calls, multi-turn memory, context compression — works identically whether you're using Ollama locally or a cloud provider. The provider is a config entry; the rest of the system doesn't care.

Supported providers out of the box:

| Provider | Type | Notes |
|----------|------|-------|
| **Ollama** | Local | Default. No key, no cost, full privacy |
| **LM Studio** | Local | OpenAI-compatible local server |
| **OpenAI** | Cloud | GPT-4o, o1, etc. |
| **Groq** | Cloud | Fast inference, generous free tier |
| **Azure OpenAI** | Cloud | Enterprise deployments |
| Any OpenAI-compatible API | Either | One URL field to configure |

---

## What the agent can do

ICee runs a **ReAct loop** (Reason → Act → Observe, up to 20 iterations). The agent autonomously decides which tools to call and when to stop.

### 8 built-in tools — zero setup

| Tool | What it does |
|------|-------------|
| `web_search` | DuckDuckGo search, no API key |
| `http_fetch` | Fetch any URL, strips HTML |
| `fs_read` | Read files or list directories |
| `fs_write` | Write files (creates dirs as needed) |
| `code_exec` | Run JS / Python / Bash inline |
| `clipboard_read` | Read system clipboard |
| `clipboard_write` | Write to system clipboard |
| `browser_open` | Open URL in default browser |

All tools run directly in the Electron process — no external server needed.

### MCP tool server support

Connect any [Model Context Protocol](https://modelcontextprotocol.io/) server for additional tools. Built-in tools take priority when names conflict.

### Rules system

Shape agent behavior with a two-layer rules system:
- **Global rules** — stored in SQLite, applied to every session
- **Project rules** — place `.icee/rules.md` in any directory; auto-loaded when working there

---

## 🚀 Quick Start

### Requirements

- [Node.js](https://nodejs.org/) ≥ 20
- [pnpm](https://pnpm.io/) ≥ 9
- [Ollama](https://ollama.com/) (recommended) or any OpenAI-compatible API

### Install & run

```bash
git clone https://github.com/enisisuko/ICee-agent.git
cd ICee-agent
pnpm install
pnpm desktop
```

Pull a model and start:

```bash
ollama serve
ollama pull qwen2.5:7b
```

Open the app → Settings → add your provider → type a task → watch it run.

---

## 🗂️ Project Structure

pnpm monorepo, powered by Turborepo:

```
ICee-agent/
├── apps/desktop/          # Electron app
│   └── src/
│       ├── main/          # Main process: IPC, runtime, MCP, tools
│       └── renderer/      # React UI: NerveCenter, Sidebar, Settings
├── packages/
│   ├── core/              # Agent engine: ReAct loop, GraphRuntime, executors
│   ├── shared/            # Zod schemas, shared TypeScript types
│   └── db/                # SQLite layer (8 tables, auto-migration)
└── demo/                  # Minimal examples
    ├── ollama-chat/       # 3-node chat pipeline
    └── search-summarize/  # 4-node search + summarize
```

---

## 🗺️ Roadmap

- [x] ReAct agent loop with token streaming
- [x] Live node visualization (NerveCenter)
- [x] Step-level revert & rerun with prompt editing
- [x] 8 built-in tools (no API key)
- [x] Ollama / local-model first support
- [x] Multi-provider (cloud + local)
- [x] Rules system (global + per-project)
- [x] MCP tool server integration
- [x] Multi-turn conversation
- [ ] Packaged installer (NSIS / DMG)
- [ ] Plugin system (architecture in place)
- [ ] Sub-agent marketplace presets
- [ ] Web version

---

## 🤝 Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for dev setup, how to add a Provider, a node executor, or a built-in tool.

---

## 📄 License

[MIT](LICENSE) © 2026 ICee Agent Contributors
