import { motion } from "framer-motion";
import type { OrchestratorData } from "../../types/ui.js";

interface OrchestratorNodeProps {
  data: OrchestratorData;
}

/** 格式化 token 数 */
function formatTokens(n: number): string {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);
}

/** 格式化 USD 成本 */
function formatCost(n: number): string {
  return `$${n.toFixed(4)}`;
}

/**
 * OrchestratorNode — 大脑层节点
 * 展示当前 Epic Task 的整体进度、Token 消耗和总线状态
 * 使用蓝色极淡呼吸光效 (opacity 0.4→0.7，3s 周期)
 */
export function OrchestratorNode({ data }: OrchestratorNodeProps) {
  const isActive = data.state === "running" || data.state === "paused";

  return (
    <div className="relative flex flex-col items-center">
      {/* 背景光晕 (仅 running 时出现) */}
      {isActive && (
        <motion.div
          className="absolute inset-0 rounded-xl"
          style={{
            background: "radial-gradient(ellipse at center, rgba(96, 165, 250, 0.08) 0%, transparent 70%)",
            filter: "blur(20px)",
          }}
          animate={{ opacity: [0.4, 0.7, 0.4] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        />
      )}

      {/* 主卡片 */}
      <motion.div
        className="relative w-80 rounded-lg overflow-hidden"
        style={{
          background: "rgba(15, 17, 23, 0.90)",
          border: "1px solid rgba(255, 255, 255, 0.08)",
          backdropFilter: "blur(12px)",
        }}
        animate={isActive ? {
          boxShadow: [
            "0 0 0px rgba(96, 165, 250, 0)",
            "0 0 16px rgba(96, 165, 250, 0.18)",
            "0 0 0px rgba(96, 165, 250, 0)",
          ],
        } : {
          boxShadow: "0 0 0px rgba(96, 165, 250, 0)",
        }}
        transition={{ duration: 3, repeat: isActive ? Infinity : 0, ease: "easeInOut" }}
      >
        {/* 顶部标题栏 */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-white/[0.06]">
          {/* 状态指示点 */}
          <motion.div
            className="w-1.5 h-1.5 rounded-full flex-shrink-0"
            style={{
              background: isActive ? "#60a5fa" : data.state === "completed" ? "#34d399" : "#4b5563",
            }}
            animate={isActive ? { opacity: [0.5, 1, 0.5] } : { opacity: 1 }}
            transition={{ duration: 2, repeat: isActive ? Infinity : 0 }}
          />
          <span className="text-xs font-medium text-white/50 tracking-widest uppercase">
            Orchestrator
          </span>
          {/* Run ID */}
          {data.runId && (
            <span className="ml-auto text-2xs font-mono text-white/20">
              {data.runId}
            </span>
          )}
        </div>

        {/* 任务名称 */}
        <div className="px-4 pt-4 pb-2">
          <h2 className="text-base font-medium text-white/88 leading-snug">
            {data.epicTaskName}
          </h2>
        </div>

        {/* 进度条 */}
        <div className="px-4 pb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-white/40">Progress</span>
            <span className="text-xs font-medium text-white/60">{data.progress}%</span>
          </div>
          <div
            className="h-px w-full rounded-full overflow-hidden"
            style={{ background: "rgba(255,255,255,0.06)" }}
          >
            <motion.div
              className="h-full rounded-full"
              style={{ background: "rgba(96, 165, 250, 0.70)" }}
              initial={{ width: 0 }}
              animate={{ width: `${data.progress}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            />
          </div>
        </div>

        {/* 底部统计 */}
        <div
          className="flex items-center gap-0 border-t"
          style={{ borderColor: "rgba(255,255,255,0.06)" }}
        >
          <StatCell label="Agents" value={String(data.activeAgents)} />
          <div className="w-px h-8 bg-white/[0.06]" />
          <StatCell label="Tokens" value={formatTokens(data.totalTokens)} />
          <div className="w-px h-8 bg-white/[0.06]" />
          <StatCell label="Cost" value={formatCost(data.totalCostUsd)} />
        </div>
      </motion.div>

      {/* 向下的连接点 (供 DataPipe 使用) */}
      <div
        id="orchestrator-outlet"
        className="w-px h-4 mt-0"
        style={{ background: "rgba(255,255,255,0.10)" }}
      />
    </div>
  );
}

function StatCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex-1 flex flex-col items-center py-3 gap-1">
      <span className="text-2xs text-white/30 tracking-wider uppercase">{label}</span>
      <span className="text-sm font-medium text-white/70">{value}</span>
    </div>
  );
}
