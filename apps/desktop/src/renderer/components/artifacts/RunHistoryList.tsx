import { motion } from "framer-motion";
import type { RunHistoryItem } from "../../types/ui.js";

interface RunHistoryListProps {
  runs: RunHistoryItem[];
  selectedRunId: string | null;
  onSelect: (runId: string) => void;
}

/** 状态点颜色映射 */
const STATE_COLOR: Record<RunHistoryItem["state"], string> = {
  RUNNING:   "#60a5fa",
  COMPLETED: "#34d399",
  FAILED:    "#f87171",
  CANCELLED: "#4b5563",
};

/** 状态文字 */
const STATE_LABEL: Record<RunHistoryItem["state"], string> = {
  RUNNING:   "running",
  COMPLETED: "done",
  FAILED:    "failed",
  CANCELLED: "cancelled",
};

/** 格式化时间 (相对时间) */
function formatTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  const hrs = Math.floor(diff / 3600000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  if (hrs < 24) return `${hrs}h ago`;
  return new Date(iso).toLocaleDateString("zh-CN", { month: "short", day: "numeric" });
}

/** 格式化 token 数 */
function formatTokens(n: number): string {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);
}

/** 格式化耗时 */
function formatDuration(ms?: number): string {
  if (!ms) return "—";
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
}

/**
 * RunHistoryList — 左侧 Run 历史竖向列表
 * 每条显示 Run 状态色点、Graph 名称、Token 数、相对时间
 * 选中行带左侧蓝色指示线
 */
export function RunHistoryList({ runs, selectedRunId, onSelect }: RunHistoryListProps) {
  return (
    <div
      className="flex flex-col h-full flex-shrink-0 overflow-hidden"
      style={{
        width: "240px",
        borderRight: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      {/* 标题栏 */}
      <div
        className="flex items-center gap-2 px-4 py-3 flex-shrink-0 border-b"
        style={{ borderColor: "rgba(255,255,255,0.06)" }}
      >
        <span className="text-xs tracking-widest uppercase text-white/30">Runs</span>
        <span className="ml-auto text-2xs font-mono text-white/20">{runs.length}</span>
      </div>

      {/* 列表滚动区 */}
      <div className="flex-1 overflow-y-auto">
        {runs.map((run, i) => {
          const isSelected = run.runId === selectedRunId;
          const stateColor = STATE_COLOR[run.state];

          return (
            <motion.button
              key={run.runId}
              onClick={() => onSelect(run.runId)}
              initial={{ opacity: 0, x: -4 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.04, duration: 0.15 }}
              className="w-full text-left px-4 py-3 relative transition-colors"
              style={{
                background: isSelected ? "rgba(255,255,255,0.05)" : "transparent",
                borderLeft: isSelected
                  ? "2px solid rgba(96,165,250,0.50)"
                  : "2px solid transparent",
              }}
            >
              {/* 顶行: Graph 名称 + 状态色点 */}
              <div className="flex items-center gap-2 mb-1.5">
                <motion.div
                  className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                  style={{ background: stateColor }}
                  animate={run.state === "RUNNING" ? { opacity: [0.5, 1, 0.5] } : { opacity: 1 }}
                  transition={{ duration: 2, repeat: run.state === "RUNNING" ? Infinity : 0 }}
                />
                <span
                  className="text-xs font-medium truncate flex-1"
                  style={{ color: isSelected ? "rgba(255,255,255,0.80)" : "rgba(255,255,255,0.55)" }}
                >
                  {run.graphName}
                </span>
              </div>

              {/* 中行: Run ID */}
              <p className="text-2xs font-mono mb-1.5" style={{ color: "rgba(255,255,255,0.22)" }}>
                {run.runId}
              </p>

              {/* 底行: 统计信息 */}
              <div className="flex items-center gap-3">
                <span className="text-2xs" style={{ color: "rgba(255,255,255,0.28)" }}>
                  {formatTokens(run.totalTokens)}t
                </span>
                <span className="text-2xs" style={{ color: "rgba(255,255,255,0.20)" }}>
                  {formatDuration(run.durationMs)}
                </span>
                <span className="ml-auto text-2xs" style={{ color: stateColor, opacity: 0.70 }}>
                  {STATE_LABEL[run.state]}
                </span>
              </div>

              {/* 底部时间戳 */}
              <p className="text-2xs mt-1" style={{ color: "rgba(255,255,255,0.18)" }}>
                {formatTime(run.startedAt)}
              </p>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
