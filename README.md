<div align="center">

<img src="https://raw.githubusercontent.com/enisisuko/ICee-agent/main/screenshots/icee-ui-demo.png" alt="ICee Agent" width="100%">

# ICee Agent · v1.0.3

**Local-first AI agent desktop. See every step. Own every step.**

A desktop app that makes AI agents transparent and controllable — watch every decision live, rewind to any step, edit the prompt, and branch from there.

[![CI](https://github.com/enisisuko/ICee-agent/actions/workflows/ci.yml/badge.svg)](https://github.com/enisisuko/ICee-agent/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node](https://img.shields.io/badge/Node-%3E%3D20-brightgreen)](https://nodejs.org/)
[![Electron](https://img.shields.io/badge/Electron-35-blueviolet)](https://www.electronjs.org/)
[![Ollama](https://img.shields.io/badge/Ollama-ready-black)](https://ollama.com/)
[![MCP](https://img.shields.io/badge/MCP-supported-orange)](https://modelcontextprotocol.io/)

[中文文档](README.zh.md) · [Report Bug](https://github.com/enisisuko/ICee-agent/issues) · [Request Feature](https://github.com/enisisuko/ICee-agent/issues)

</div>

---

## Why ICee?

Most AI agent tools are black boxes. You submit a task, wait, hope the result is right — and when it isn't, you start over from scratch.

ICee is built differently:

| | Other agents | ICee Agent |
|---|:---:|:---:|
| See every step live | ✗ | ✓ |
| Edit a prompt mid-run | ✗ | ✓ |
| Fork the workflow from any step | ✗ | ✓ |
| Works completely offline | Maybe | **Always** |
| Requires an API key | Required | **Optional** |

---

## ✨ What makes ICee different

### 1. Step-level rewind & re-execution

<img src="https://raw.githubusercontent.com/enisisuko/ICee-agent/main/screenshots/icee-step-detail.png" alt="Step detail with revert and rerun controls" width="100%">

Every node records its full execution history: the exact prompt sent, the output received, token count, duration, and whether it succeeded or retried. At any point you can:

- **Revert this step** — roll back to a previous attempt within the same node
- **Rerun from here** — branch the entire workflow forward from this node

<img src="https://raw.githubusercontent.com/enisisuko/ICee-agent/main/screenshots/icee-rerun-modal.png" alt="Rerun modal — edit the prompt before re-executing" width="100%">

The rerun modal shows the previous input and output side by side for context — then lets you edit the exact prompt before re-executing. Change one word or rewrite the whole thing. Downstream nodes are cleared and re-run from the branch point.

> **Under the hood**: each fork generates a new `runId` in SQLite with `parent_run_id` and `fork_from_step_id` fields. The complete execution lineage is preserved — you can always trace how you got to any result.

<img src="https://raw.githubusercontent.com/enisisuko/ICee-agent/main/screenshots/icee-node-graph.png" alt="Node graph showing step states" width="100%">

Node states update live: `running` → `done` (green) / `error` (red) → `Step reverted by user` → rerunning. The graph always reflects exactly where the agent is.

---

### 2. Local-model first — no cloud required

ICee is built from the ground up to run with **local LLMs via Ollama**. No API key, no data leaving your machine, no per-token billing.

> **Completely offline**: Ollama handles the LLM, DuckDuckGo powers web search (no key), and 8 built-in tools cover filesystem, clipboard, and code execution. Every feature works with zero external accounts.

```bash
ollama pull qwen2.5:7b      # recommended for Chinese tasks
ollama pull llama3.2        # fast general-purpose
ollama pull deepseek-r1:8b  # strong reasoning
```

Every feature — streaming output, tool calls, multi-turn memory, context compression — works identically whether you're using a local model or a cloud provider. The provider is a single config entry; the rest of the system doesn't change.

| Provider | Type | Notes |
|----------|------|-------|
| **Ollama** | Local | Default — no key, no cost, full privacy |
| **LM Studio** | Local | OpenAI-compatible local server |
| **OpenAI** | Cloud | GPT-4o, o1, etc. |
| **Groq** | Cloud | Fast inference, generous free tier |
| **Azure OpenAI** | Cloud | Enterprise deployments |
| Any OpenAI-compatible API | Either | One URL field to configure |

---

## What the agent can do

ICee runs a **ReAct loop** (Reason → Act → Observe, up to 20 iterations). The agent autonomously decides which tools to call and when to stop. If it's not making progress, a nudge prompts it to reformat; at the iteration limit, it writes a forced summary at lower temperature.

### 8 built-in tools — zero setup

All tools run directly in the Electron process. No external server, no configuration.

| Tool | What it does |
|------|-------------|
| `web_search` | DuckDuckGo search — no API key |
| `http_fetch` | Fetch any URL, strips scripts and HTML tags |
| `fs_read` | Read files or list directory contents |
| `fs_write` | Write files, creates directories as needed |
| `code_exec` | Run JS / Python / Bash (PowerShell on Windows) inline |
| `clipboard_read` | Read system clipboard |
| `clipboard_write` | Write to system clipboard |
| `browser_open` | Open any URL in the default browser |

### MCP tool server support

Connect any [Model Context Protocol](https://modelcontextprotocol.io/) server for additional tools. Built-in tools take priority when names conflict.

### Rules system

Shape agent behavior with a two-layer rules system:
- **Global rules** — stored in SQLite, injected into every session's system prompt
- **Project rules** — place `.icee/rules.md` in any directory; auto-loaded when working there

### Agent skills

| Skill | What it does |
|-------|-------------|
| `ContextCompressor` | Auto-compresses history at 80% token budget — preserves task definition and recent context |
| `RetryWithBackoff` | Exponential backoff retry on LLM failure (2 attempts, up to 10s delay) |
| `OutputFormatter` | Normalizes code blocks, fixes spacing in the final output |

---

## 🚀 Quick Start

### Option A — Download the installer

Download the latest release for your platform from [Releases](https://github.com/enisisuko/ICee-agent/releases):
- **Windows**: `ICEE Agent Setup 1.0.3.exe` (NSIS installer)
- **macOS**: `ICee-Agent-1.0.3.dmg`

Then install [Ollama](https://ollama.com/), pull a model, and launch ICee.

### Option B — Run from source

**Requirements**: [Node.js](https://nodejs.org/) ≥ 20, [pnpm](https://pnpm.io/) ≥ 9, [Ollama](https://ollama.com/)

```bash
git clone https://github.com/enisisuko/ICee-agent.git
cd ICee-agent
pnpm install
pnpm desktop
```

```bash
# In a separate terminal, start Ollama and pull a model
ollama serve
ollama pull qwen2.5:7b
```

Open the app → Settings → add your provider → type a task → watch it run.

---

## 🗂️ Project Structure

pnpm monorepo, powered by Turborepo:

```
ICee-agent/
├── apps/
│   └── desktop/           # Electron app (main + renderer)
│       └── src/
│           ├── main/      # IPC handlers, MCP client, built-in tools, SQLite
│           └── renderer/  # React UI — NerveCenter, Sidebar, Settings
├── packages/
│   ├── core/              # Agent engine: ReAct loop, GraphRuntime, executors, skills
│   ├── providers/         # LLM adapters: Ollama, OpenAI-compatible
│   ├── shared/            # Zod schemas, shared TypeScript types
│   └── db/                # SQLite layer (8 tables, auto-migration)
└── demo/
    ├── ollama-chat/       # Minimal 3-node chat pipeline
    └── search-summarize/  # 4-node search + summarize example
```

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| Desktop shell | Electron 35 |
| UI framework | React 18 + Framer Motion 11 + Tailwind CSS 3 |
| Agent engine | Custom ReAct loop · GraphRuntime (run / forkRun / cancelRun) |
| Persistence | SQLite via better-sqlite3 · 8 tables · auto-migration |
| Build tooling | Vite 5 · pnpm workspaces · Turborepo |
| Packaging | electron-builder · NSIS (Windows) · DMG (macOS) |

---

## 🗺️ Roadmap

- [x] ReAct agent loop with token streaming
- [x] Live node visualization (NerveCenter)
- [x] Step-level revert & rerun with prompt editing
- [x] Fork-based execution with DB-level lineage tracking
- [x] 8 built-in tools — no API key required
- [x] Ollama / local-model first
- [x] Multi-provider support (cloud + local)
- [x] Rules system (global + per-project)
- [x] MCP tool server integration
- [x] Multi-turn conversation
- [x] Packaged installer — v1.0.3 (Windows NSIS + macOS DMG)
- [x] Plugin system (architecture in place)
- [ ] Sub-agent marketplace presets
- [ ] Web version (browser-based)
- [ ] Visual graph editor for workflow design

---

## 🤝 Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for dev setup, how to add a Provider, a node executor, or a built-in tool.

---

## 📄 License

[MIT](LICENSE) © 2026 ICee Agent Contributors
