import { useState, useCallback, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Sidebar } from "./components/layout/Sidebar.js";
import { NerveCenter } from "./components/nerve-center/NerveCenter.js";
import { TraceLogDrawer } from "./components/nerve-center/TraceLogDrawer.js";
import { ArtifactsPage } from "./components/pages/ArtifactsPage.js";
import { SettingsPage } from "./components/pages/SettingsPage.js";
import { useIceeRuntime } from "./hooks/useIceeRuntime.js";
import { LanguageProvider } from "./i18n/LanguageContext.js";
import {
  mockSubagents,
  mockMcpTools,
  mockSkills,
  mockSessions,
} from "./data/mockData.js";
import type {
  SidebarRoute,
  OrchestratorData,
  TraceLogEntry,
  ConversationSession,
  AttachmentItem,
  RunHistoryItem,
  SubagentNode,
  ExecutionEdge,
} from "./types/ui.js";

/** 生成唯一 Session / Run ID */
function genId() {
  return `run_${Math.random().toString(36).slice(2, 10)}`;
}

/** 创建空白 idle 会话（New Chat 时使用） */
function createBlankSession(): ConversationSession {
  return {
    id: genId(),
    title: "New conversation",
    state: "idle",
    createdAt: new Date().toISOString(),
    // exactOptionalPropertyTypes: runId 省略而非赋 undefined
    orchestrator: {
      epicTaskName: "Waiting for task...",
      progress: 0,
      totalTokens: 0,
      totalCostUsd: 0,
      activeAgents: 0,
      state: "idle",
    },
    traceLogs: [],
    subagents: [],
    executionEdges: [],
  };
}

/**
 * 从 graphJson 字符串解析出 ExecutionEdge[]
 * 初始全部 state: "pending"
 */
function parseEdgesFromGraph(graphJson: string): ExecutionEdge[] {
  try {
    const graph = JSON.parse(graphJson) as {
      edges?: Array<{ id: string; source: string; target: string }>;
    };
    if (!Array.isArray(graph.edges)) return [];
    return graph.edges.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      state: "pending" as const,
    }));
  } catch {
    return [];
  }
}

/**
 * App — ICEE Desktop 主应用
 *
 * 会话机制：
 *   - 启动时：一个新空白会话 + mock 历史会话
 *   - New Chat：插入新空白会话并激活
 *   - 点击历史会话：切换 activeSessionId，NerveCenter / TraceLog 内容随之切换
 *   - 提交任务：更新当前会话状态（running → completed），不影响其他历史
 *
 * 路由：
 *   dashboard → NerveCenter + TraceLogDrawer
 *   artifacts → ArtifactsPage
 *   settings  → SettingsPage
 */
export function App() {
  const [activeRoute, setActiveRoute] = useState<SidebarRoute>("dashboard");

  // 所有会话列表：头部是新空白会话，其余是历史
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const [sessions, setSessions] = useState<ConversationSession[]>(() => {
    const blank = createBlankSession();
    return [blank, ...mockSessions];
  });

  // 当前激活会话 ID（初始指向第一个空白会话）
  const [activeSessionId, setActiveSessionId] = useState<string>(
    () => sessions[0]!.id
  );

  // 从 sessions 数组派生当前会话数据，避免 state 冗余
  const currentSession =
    sessions.find((s) => s.id === activeSessionId) ?? sessions[0]!;
  const orchestrator: OrchestratorData = currentSession.orchestrator;
  const traceLogs: TraceLogEntry[] = currentSession.traceLogs;

  const isDashboard = activeRoute === "dashboard";

  // ── Run 历史列表（Artifacts 页面数据源）────────────────────────
  const [runHistory, setRunHistory] = useState<RunHistoryItem[]>([]);

  // ── Ollama 连接状态（Sidebar 呼吸灯数据源）─────────────────────
  const [ollamaConnected, setOllamaConnected] = useState(false);

  // ── IPC 桥接（Electron 环境下激活，浏览器 dev 静默跳过）────────
  const { isElectron, runGraph, cancelRun } = useIceeRuntime({
    // 实时追加 TraceLog + 更新 subagents 状态 + 更新 executionEdges 到当前会话
    onStepEvent: useCallback((entry: TraceLogEntry) => {
      setSessions((prev) =>
        prev.map((s) => {
          if (s.id !== activeSessionId) return s;

          // ── 更新 subagents 节点状态 ──────────────────────────
          let updatedSubagents = s.subagents;
          if (entry.nodeId) {
            const nodeId = entry.nodeId;
            const existingIdx = updatedSubagents.findIndex((n) => n.id === nodeId);

            // 判断步骤启停
            const isStart = entry.message.includes("start") || entry.type === "AGENT_ACT";
            const isError = entry.message.toLowerCase().includes("error") || entry.message.toLowerCase().includes("failed");

            const newNode: SubagentNode = {
              id: nodeId,
              label: nodeId.charAt(0).toUpperCase() + nodeId.slice(1),
              type: "LLM",
              pipeConnected: true,
              state: isError
                ? { status: "error", errorMsg: entry.message }
                : isStart
                ? { status: "running", currentTask: entry.message }
                : { status: "success", output: entry.message },
            };

            if (existingIdx >= 0) {
              updatedSubagents = updatedSubagents.map((n) => n.id === nodeId ? newNode : n);
            } else {
              updatedSubagents = [...updatedSubagents, newNode];
            }
          }

          // ── 更新 executionEdges 状态 ──────────────────────────
          // 当 nodeId 对应的节点开始执行时，将以该节点为 target 的边激活 (active)
          // 当该节点执行完成时（非 AGENT_ACT start），将以该节点为 source 的边也激活
          let updatedEdges = s.executionEdges;
          if (entry.nodeId && updatedEdges.length > 0) {
            const nodeId = entry.nodeId;
            const isError = entry.message.toLowerCase().includes("error") || entry.message.toLowerCase().includes("failed");
            const isCompletion = !entry.message.includes("start") && entry.type !== "AGENT_ACT";

            updatedEdges = updatedEdges.map((edge) => {
              // 入边：该节点开始运行 → 入边变为 active
              if (edge.target === nodeId && edge.state === "pending") {
                return { ...edge, state: isError ? "failed" as const : "active" as const };
              }
              // 出边：该节点完成 → 出边准备激活（下一个节点还未运行时先置 pending 保持，
              //        等下一个节点的 stepEvent 到来后再激活）
              // 注意：此处不提前修改出边，让 target 节点的 stepEvent 来驱动
              return edge;
            });

            // 若该节点的事件是完成类型，将其入边置为 completed
            if (isCompletion) {
              updatedEdges = updatedEdges.map((edge) => {
                if (edge.target === nodeId && (edge.state === "active" || edge.state === "pending")) {
                  return { ...edge, state: isError ? "failed" as const : "completed" as const };
                }
                return edge;
              });
            }
          }

          return {
            ...s,
            traceLogs: [...s.traceLogs, entry],
            subagents: updatedSubagents,
            executionEdges: updatedEdges,
          };
        })
      );
    }, [activeSessionId]),

    // Run 完成时更新 orchestrator 状态 + 写入 aiOutput + 推入 runHistory + 最终化 executionEdges
    onRunCompleted: useCallback((payload) => {
      const aiText = typeof payload.output === "string"
        ? payload.output
        : payload.output != null
          ? JSON.stringify(payload.output, null, 2)
          : undefined;

      const isFailed = payload.state !== "COMPLETED";

      setSessions((prev) =>
        prev.map((s) => {
          if (s.id !== activeSessionId) return s;

          // 将完成的 run 推入历史列表（使用条件展开处理可选字段）
          const historyItem: RunHistoryItem = {
            runId: s.orchestrator.runId ?? s.id,
            graphName: s.orchestrator.epicTaskName,
            state: payload.state === "COMPLETED" ? "COMPLETED" : "FAILED",
            totalTokens: payload.totalTokens,
            totalCostUsd: payload.totalCostUsd,
            ...((payload as { durationMs?: number }).durationMs !== undefined && {
              durationMs: (payload as { durationMs?: number }).durationMs!,
            }),
            startedAt: s.createdAt,
            ...(aiText !== undefined && { aiOutput: aiText }),
          };
          setRunHistory((h) => [historyItem, ...h]);

          // 最终化 executionEdges：active 边变为 completed 或 failed
          const finalEdges: ExecutionEdge[] = s.executionEdges.map((edge) => {
            if (edge.state === "active") {
              return { ...edge, state: isFailed ? "failed" as const : "completed" as const };
            }
            return edge;
          });

          return {
            ...s,
            state: (payload.state.toLowerCase() as ConversationSession["state"]),
            orchestrator: {
              ...s.orchestrator,
              state: payload.state === "COMPLETED" ? "completed" : "failed",
              progress: 100,
              totalTokens: payload.totalTokens,
              totalCostUsd: payload.totalCostUsd,
              activeAgents: 0,
            },
            // 写入 AI 回复
            ...(aiText !== undefined && { aiOutput: aiText }),
            // 更新最终边状态
            executionEdges: finalEdges,
          };
        })
      );
    }, [activeSessionId]),

    // Token 实时更新（进度条用）
    onTokenUpdate: useCallback((tokens: number, costUsd: number) => {
      setSessions((prev) =>
        prev.map((s) =>
          s.id === activeSessionId
            ? {
                ...s,
                orchestrator: {
                  ...s.orchestrator,
                  totalTokens: tokens,
                  totalCostUsd: costUsd,
                },
              }
            : s
        )
      );
    }, [activeSessionId]),

    // Ollama 状态 → 存入 state，Sidebar 读取显示呼吸灯
    onOllamaStatus: useCallback((healthy: boolean, url: string) => {
      console.log(`[ICEE] Ollama ${healthy ? "✅" : "❌"} @ ${url}`);
      setOllamaConnected(healthy);
    }, []),
  });

  // 启动时通过 IPC 拉取历史 Run 记录
  useEffect(() => {
    if (!isElectron || !window.icee) return;
    window.icee.listRuns().then((rows) => {
      if (!Array.isArray(rows)) return;
      const mapped: RunHistoryItem[] = rows.map((r: unknown) => {
        const row = r as Record<string, unknown>;
        const durationMsRaw = row["duration_ms"] ?? row["durationMs"];
        return {
          runId: String(row["id"] ?? row["runId"] ?? ""),
          graphName: String(row["graph_name"] ?? row["graphName"] ?? ""),
          state: (row["state"] as RunHistoryItem["state"]) ?? "COMPLETED",
          totalTokens: Number(row["total_tokens"] ?? row["totalTokens"] ?? 0),
          totalCostUsd: Number(row["total_cost_usd"] ?? row["totalCostUsd"] ?? 0),
          ...(durationMsRaw != null && { durationMs: Number(durationMsRaw) }),
          startedAt: String(row["started_at"] ?? row["startedAt"] ?? new Date().toISOString()),
        };
      });
      setRunHistory(mapped);
    }).catch((e) => {
      console.warn("[ICEE] listRuns failed:", e);
    });
  }, [isElectron]);

  /** 新建空白会话，插到列表头部并激活 */
  const handleNewChat = useCallback(() => {
    const blank = createBlankSession();
    setSessions((prev) => [blank, ...prev]);
    setActiveSessionId(blank.id);
  }, []);

  /** 点击历史会话切换 */
  const handleSelectSession = useCallback((sessionId: string) => {
    setActiveSessionId(sessionId);
  }, []);

  /** 用户提交新任务（含附件列表） */
  const handleTaskSubmit = useCallback(
    async (task: string, attachments: AttachmentItem[] = []) => {
      const sid = activeSessionId; // 闭包捕获，防止切换会话后污染
      const timestamp = new Date().toLocaleTimeString("en-GB", { hour12: false });
      // 任务标题：优先用文字，若纯图片则提示
      const titleBase = task.trim() || (attachments.length > 0 ? `[${attachments.length} attachment(s)]` : "New task");
      const shortTitle = titleBase.length > 40 ? titleBase.slice(0, 40) + "…" : titleBase;

      // 先更新 UI 为 running 状态
      const tempRunId = genId();

      // 预先构造 graphJson（用于解析 edges），Electron 和 mock 共用此结构
      const graphJson = JSON.stringify({
        id: `session-${sid}`,
        name: shortTitle,
        version: "1.0.0",
        description: task,
        nodes: [
          { id: "input", type: "INPUT", label: "User Input", version: "1.0.0", cache: "no-cache" },
          {
            id: "chat",
            type: "LLM",
            label: "AI Response",
            version: "1.0.0",
            cache: "no-cache",
            config: {
              provider: "ollama",
              model: "llama3.2",
              temperature: 0.7,
              maxTokens: 512,
              systemPrompt: "You are a helpful, concise assistant. Answer in the same language as the user.",
              promptTemplate: "{{input.query}}",
            },
          },
          { id: "output", type: "OUTPUT", label: "Response", version: "1.0.0", cache: "no-cache" },
        ],
        edges: [
          { id: "e1", source: "input", target: "chat" },
          { id: "e2", source: "chat", target: "output" },
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        author: "ICEE UI",
        tags: ["ui", "chat"],
      });

      // 从 graphJson 解析出初始边（全部 pending）
      const initialEdges = parseEdgesFromGraph(graphJson);

      setSessions((prev) =>
        prev.map((s) => {
          if (s.id !== sid) return s;
          return {
            ...s,
            title: shortTitle,
            state: "running" as const,
            orchestrator: {
              epicTaskName: task,
              progress: 2,
              totalTokens: 0,
              totalCostUsd: 0,
              activeAgents: mockSubagents.length,
              runId: tempRunId,
              state: "running" as const,
            },
            traceLogs: [
              {
                id: `sys-${Date.now()}`,
                type: "SYSTEM" as const,
                timestamp,
                message: `Task submitted: "${shortTitle}"`,
              },
            ],
            // 初始化执行边（全部 pending，等待 StepEvent 激活）
            executionEdges: initialEdges,
            // 清空旧的 subagents，让动态图从零开始生长
            subagents: [],
          };
        })
      );

      // ── Electron 环境：走真实 IPC ──────────────
      if (isElectron) {
        // graphJson 已在上方构造（与 initialEdges 共用）
        const inputJson = JSON.stringify({ query: task });
        // 将附件序列化后传给主进程处理
        const attachmentsJson = attachments.length > 0 ? JSON.stringify(attachments) : undefined;
        const result = await runGraph(graphJson, inputJson, attachmentsJson);

        if (result?.error) {
          // 运行失败，切换为 failed 状态
          setSessions((prev) =>
            prev.map((s) => {
              if (s.id !== sid) return s;
              return {
                ...s,
                state: "failed" as const,
                orchestrator: { ...s.orchestrator, state: "failed" as const, activeAgents: 0 },
                traceLogs: [
                  ...s.traceLogs,
                  {
                    id: `err-${Date.now()}`,
                    type: "SYSTEM" as const,
                    timestamp: new Date().toLocaleTimeString("en-GB", { hour12: false }),
                    message: `❌ Run failed: ${result.error}`,
                  },
                ],
              };
            })
          );
        }
        // 成功时 progress 由 IPC 事件驱动，不在这里更新
        return;
      }

      // ── 浏览器 dev 环境：走 mock 模拟（含逐步节点生长）─────────
      const runId = tempRunId;

      // Mock 执行步骤序列：模拟 input → chat → output 的逐步激活
      // 每个步骤间隔 1.2s，让可视化动态生长清晰可见
      const mockSteps: Array<{
        delay: number;
        nodeId: string;
        edgeIds: string[];       // 此步骤激活的边
        completeEdgeIds?: string[]; // 此步骤完成的边
        message: string;
        type: TraceLogEntry["type"];
      }> = [
        {
          delay: 800,
          nodeId: "input",
          edgeIds: [],            // input 是起点，无入边
          message: "Input node: processing user query",
          type: "AGENT_ACT",
        },
        {
          delay: 1800,
          nodeId: "chat",
          edgeIds: ["e1"],        // e1: input → chat 激活
          completeEdgeIds: [],
          message: "LLM node: generating response...",
          type: "AGENT_ACT",
        },
        {
          delay: 3200,
          nodeId: "output",
          edgeIds: ["e2"],        // e2: chat → output 激活
          completeEdgeIds: ["e1"], // e1 完成
          message: "Output node: response ready",
          type: "AGENT_ACT",
        },
      ];

      // 逐步模拟步骤事件（更新 edges + subagents + traceLogs）
      mockSteps.forEach(({ delay, nodeId, edgeIds, completeEdgeIds, message, type }) => {
        setTimeout(() => {
          const stepTime = new Date().toLocaleTimeString("en-GB", { hour12: false });
          setSessions((prev) =>
            prev.map((s) => {
              if (s.id !== sid) return s;

              // 更新边状态
              const updatedEdges = s.executionEdges.map((edge) => {
                if (edgeIds.includes(edge.id)) return { ...edge, state: "active" as const };
                if (completeEdgeIds?.includes(edge.id)) return { ...edge, state: "completed" as const };
                return edge;
              });

              // 更新或添加 subagent 节点
              const existingIdx = s.subagents.findIndex((n) => n.id === nodeId);
              const newNode: SubagentNode = {
                id: nodeId,
                label: nodeId.charAt(0).toUpperCase() + nodeId.slice(1),
                type: nodeId === "chat" ? "LLM" : nodeId === "input" ? "PLANNING" : "TOOL",
                pipeConnected: true,
                state: { status: "running", currentTask: message },
              };
              const updatedSubagents = existingIdx >= 0
                ? s.subagents.map((n) => n.id === nodeId ? newNode : n)
                : [...s.subagents, newNode];

              return {
                ...s,
                executionEdges: updatedEdges,
                subagents: updatedSubagents,
                traceLogs: [
                  ...s.traceLogs,
                  { id: `step-${nodeId}-${Date.now()}`, type, timestamp: stepTime, message, nodeId },
                ],
                orchestrator: {
                  ...s.orchestrator,
                  progress: nodeId === "input" ? 20 : nodeId === "chat" ? 55 : 85,
                },
              };
            })
          );
        }, delay);
      });

      // 模拟 Run 完成（最后一步 + 1s 后）
      const totalDelay = mockSteps[mockSteps.length - 1]!.delay + 1000;
      setTimeout(() => {
        const doneTime = new Date().toLocaleTimeString("en-GB", { hour12: false });
        const finalTokens = Math.floor(Math.random() * 20000) + 5000;
        const finalCost = parseFloat((Math.random() * 0.08 + 0.01).toFixed(4));
        const mockOutput = `[Mock] 任务"${shortTitle}"已完成。这是一条模拟 AI 回复，展示执行图从空白到动态生长的过程。`;

        setSessions((prev) =>
          prev.map((s) => {
            if (s.id !== sid) return s;

            // 将所有 active 边变为 completed
            const finalEdges = s.executionEdges.map((edge) =>
              edge.state === "active" ? { ...edge, state: "completed" as const } : edge
            );
            // 将所有 subagents 变为 success
            const finalSubagents = s.subagents.map((n) => ({
              ...n,
              state: { status: "success" as const, output: `${n.label} completed` },
            }));

            return {
              ...s,
              state: "completed" as const,
              orchestrator: {
                ...s.orchestrator,
                state: "completed" as const,
                progress: 100,
                totalTokens: finalTokens,
                totalCostUsd: finalCost,
                activeAgents: 0,
              },
              traceLogs: [
                ...s.traceLogs,
                {
                  id: `sys-done-${Date.now()}`,
                  type: "SYSTEM" as const,
                  timestamp: doneTime,
                  message: `Run completed: ${runId}`,
                },
              ],
              executionEdges: finalEdges,
              subagents: finalSubagents,
              aiOutput: mockOutput,
            };
          })
        );
      }, totalDelay);
    },
    [activeSessionId, isElectron, runGraph]
  ); // handleTaskSubmit

  /** 停止当前 Run */
  const handleStop = useCallback(async () => {
    const timestamp = new Date().toLocaleTimeString("en-GB", { hour12: false });

    // Electron 环境：通知 main process 取消 run
    if (isElectron) {
      const runId = currentSession.orchestrator.runId;
      if (runId) await cancelRun(runId);
    }

    setSessions((prev) =>
      prev.map((s) => {
        if (s.id !== activeSessionId) return s;
        return {
          ...s,
          state: "cancelled" as const,
          orchestrator: {
            // exactOptionalPropertyTypes: 省略 runId（不能赋 undefined）
            epicTaskName: "Waiting for task...",
            progress: 0,
            totalTokens: s.orchestrator.totalTokens,
            totalCostUsd: s.orchestrator.totalCostUsd,
            state: "idle" as const,
            activeAgents: 0,
          },
          traceLogs: [
            ...s.traceLogs,
            {
              id: `sys-stop-${Date.now()}`,
              type: "SYSTEM" as const,
              timestamp,
              message: "Run cancelled by user",
            },
          ],
        };
      })
    );
  }, [activeSessionId, isElectron, cancelRun, currentSession.orchestrator.runId]);

  return (
    <LanguageProvider>
    <div
      className="flex h-screen w-screen overflow-hidden"
      style={{ background: "#08090c" }}
    >
      {/* 左侧侧边栏（含会话历史 + Ollama 状态） */}
      <Sidebar
        activeRoute={activeRoute}
        onNavigate={setActiveRoute}
        activeSessionId={activeSessionId}
        sessions={sessions}
        onSelectSession={handleSelectSession}
        onNewChat={handleNewChat}
        ollamaConnected={ollamaConnected}
      />

      {/* 主内容区（路由切换） */}
      <div className="flex-1 min-w-0 overflow-hidden relative">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeRoute}
            className="absolute inset-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
          >
            {activeRoute === "dashboard" && (
              <AnimatePresence mode="wait">
                {/* key 绑定 sessionId，切换 session 时触发淡入淡出 */}
                <motion.div
                  key={activeSessionId}
                  className="absolute inset-0"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.12 }}
                >
                  <NerveCenter
                    orchestrator={orchestrator}
                    subagents={
                      currentSession.subagents.length > 0
                        ? currentSession.subagents
                        : mockSubagents
                    }
                    mcpTools={mockMcpTools}
                    skills={mockSkills}
                    {...(currentSession.aiOutput !== undefined && { aiOutput: currentSession.aiOutput })}
                    executionEdges={currentSession.executionEdges}
                    onTaskSubmit={handleTaskSubmit}
                    onStop={handleStop}
                  />
                </motion.div>
              </AnimatePresence>
            )}
            {activeRoute === "artifacts" && (
              <ArtifactsPage runHistory={runHistory} />
            )}
            {activeRoute === "settings" && <SettingsPage />}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* 右侧 Trace Log 抽屉 — 仅 Dashboard，内容跟随当前会话 */}
      <AnimatePresence>
        {isDashboard && (
          <motion.div
            key="trace-drawer"
            className="flex-shrink-0 p-3"
            style={{
              width: "280px",
              borderLeft: "1px solid rgba(255,255,255,0.06)",
            }}
            initial={{ opacity: 0, width: 0, paddingLeft: 0, paddingRight: 0 }}
            animate={{
              opacity: 1,
              width: 280,
              paddingLeft: 12,
              paddingRight: 12,
            }}
            exit={{ opacity: 0, width: 0, paddingLeft: 0, paddingRight: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
          >
            <TraceLogDrawer entries={traceLogs} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
    </LanguageProvider>
  );
}
