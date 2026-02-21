import { motion, AnimatePresence } from "framer-motion";
import type { SubagentNode, SubagentCardState } from "../../types/ui.js";

interface SubagentCardProps {
  node: SubagentNode;
}

/** 节点类型图标 */
const NODE_TYPE_ICONS: Record<SubagentNode["type"], string> = {
  LLM: "◈",
  TOOL: "⚙",
  PLANNING: "◎",
  REFLECTION: "◇",
  MEMORY: "▣",
};

/** 根据状态返回边框颜色 */
function getBorderColor(state: SubagentCardState): string {
  switch (state.status) {
    case "running": return "rgba(96, 165, 250, 0.40)";
    case "success": return "rgba(52, 211, 153, 0.30)";
    case "error": return "rgba(248, 113, 113, 0.40)";
    case "autofix": return "rgba(251, 191, 36, 0.50)";
    default: return "rgba(255, 255, 255, 0.06)";
  }
}

/** 根据状态返回发光投影 */
function getBoxShadow(state: SubagentCardState): string {
  switch (state.status) {
    case "running": return "0 0 12px rgba(96, 165, 250, 0.15)";
    case "success": return "0 0 12px rgba(52, 211, 153, 0.12)";
    case "error": return "0 0 12px rgba(248, 113, 113, 0.15)";
    case "autofix": return "0 0 18px rgba(251, 191, 36, 0.22)";
    default: return "none";
  }
}

/** 状态标签文字 */
function getStatusLabel(state: SubagentCardState): { text: string; color: string } {
  switch (state.status) {
    case "idle": return { text: "idle", color: "rgba(255,255,255,0.25)" };
    case "running": return { text: "running", color: "#60a5fa" };
    case "success": return { text: "done", color: "#34d399" };
    case "error": return { text: "error", color: "#f87171" };
    case "autofix": return { text: "autofix", color: "#fbbf24" };
  }
}

/**
 * SubagentCard — 状态机驱动的执行节点卡片
 *
 * 状态转换:
 * idle (灰暗) → running (蓝色流光) → error (红色淡入) → autofix (金色蒙版) → success (绿色)
 */
export function SubagentCard({ node }: SubagentCardProps) {
  const { state } = node;
  const statusLabel = getStatusLabel(state);
  const isActive = state.status === "running" || state.status === "autofix";

  return (
    <motion.div
      className="relative w-48 rounded overflow-hidden select-none"
      style={{
        background: state.status === "idle"
          ? "rgba(12, 14, 18, 0.80)"
          : "rgba(15, 17, 23, 0.92)",
        border: `1px solid ${getBorderColor(state)}`,
        boxShadow: getBoxShadow(state),
        opacity: state.status === "idle" ? 0.55 : 1,
      }}
      animate={{
        border: `1px solid ${getBorderColor(state)}`,
        boxShadow: getBoxShadow(state),
        opacity: state.status === "idle" ? 0.55 : 1,
      }}
      transition={{ duration: 0.3, ease: "easeOut" }}
    >
      {/* Running 状态: 顶部流光条 */}
      {state.status === "running" && (
        <motion.div
          className="absolute top-0 left-0 h-px"
          style={{ background: "rgba(96, 165, 250, 0.80)" }}
          animate={{ width: [`${(state.progress ?? 0)}%`, `${Math.min((state.progress ?? 0) + 15, 100)}%`] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
        />
      )}

      {/* AutoFix 状态: 金色半透明蒙版 */}
      <AnimatePresence>
        {state.status === "autofix" && (
          <motion.div
            key="autofix-overlay"
            className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-1 rounded"
            style={{ background: "rgba(251, 191, 36, 0.08)" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <span className="text-xs font-medium" style={{ color: "#fbbf24" }}>
              ✦ Skill Applied
            </span>
            <span className="text-2xs text-center px-3" style={{ color: "rgba(251,191,36,0.60)" }}>
              {state.skillName}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 卡片头部 */}
      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-white/[0.06]">
        <span className="text-sm" style={{ color: "rgba(255,255,255,0.35)", fontFamily: "monospace" }}>
          {NODE_TYPE_ICONS[node.type]}
        </span>
        <span className="text-xs font-medium flex-1 truncate" style={{ color: "rgba(255,255,255,0.70)" }}>
          {node.label}
        </span>
        {/* 状态点 */}
        <motion.div
          className="w-1.5 h-1.5 rounded-full flex-shrink-0"
          style={{ background: statusLabel.color }}
          animate={isActive ? { opacity: [0.5, 1, 0.5] } : { opacity: 1 }}
          transition={{ duration: 2, repeat: isActive ? Infinity : 0 }}
        />
      </div>

      {/* 卡片内容区 */}
      <div className="px-3 py-2.5 min-h-[48px]">
        {state.status === "idle" && (
          <span className="text-xs" style={{ color: "rgba(255,255,255,0.20)" }}>
            waiting...
          </span>
        )}

        {state.status === "running" && (
          <div className="space-y-1.5">
            <p className="text-xs leading-relaxed" style={{ color: "rgba(255,255,255,0.55)" }}>
              {/* 截断过长文字 */}
              {state.currentTask.length > 60
                ? state.currentTask.slice(0, 60) + "..."
                : state.currentTask}
            </p>
            {/* 打字光标动画 */}
            <motion.span
              className="inline-block w-1 h-2.5 rounded-sm"
              style={{ background: "rgba(96,165,250,0.70)", verticalAlign: "middle" }}
              animate={{ opacity: [1, 1, 0, 0] }}
              transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
            />
          </div>
        )}

        {state.status === "error" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2 }}
          >
            <p className="text-xs" style={{ color: "#f87171" }}>
              {state.errorMsg.length > 55 ? state.errorMsg.slice(0, 55) + "..." : state.errorMsg}
            </p>
          </motion.div>
        )}

        {state.status === "autofix" && (
          <div className="space-y-1">
            <p className="text-xs" style={{ color: "rgba(248,113,113,0.70)" }}>
              {state.originalError.length > 40 ? state.originalError.slice(0, 40) + "..." : state.originalError}
            </p>
          </div>
        )}

        {state.status === "success" && (
          <p className="text-xs" style={{ color: "rgba(52,211,153,0.70)" }}>
            {state.output.length > 55 ? state.output.slice(0, 55) + "..." : state.output}
            {state.tokens !== undefined && (
              <span className="ml-1 text-2xs" style={{ color: "rgba(255,255,255,0.20)" }}>
                ({state.tokens}t)
              </span>
            )}
          </p>
        )}
      </div>

      {/* 底部状态标签 */}
      <div
        className="px-3 py-1.5 border-t flex items-center justify-between"
        style={{ borderColor: "rgba(255,255,255,0.04)" }}
      >
        <span className="text-2xs font-mono uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.20)" }}>
          {node.type}
        </span>
        <span className="text-2xs font-medium" style={{ color: statusLabel.color }}>
          {statusLabel.text}
        </span>
      </div>
    </motion.div>
  );
}
