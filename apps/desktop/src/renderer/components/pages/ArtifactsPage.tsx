import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { RunHistoryList } from "../artifacts/RunHistoryList.js";
import { ArtifactCard } from "../artifacts/ArtifactCard.js";
import { mockRunHistory, mockArtifacts } from "../../data/mockData.js";
import type { RunHistoryItem, ArtifactItem } from "../../types/ui.js";
import { useLanguage } from "../../i18n/LanguageContext.js";

interface ArtifactsPageProps {
  /** App.tsx 维护的实时 Run 历史（Electron 下为真实数据，浏览器 dev 下为空数组） */
  runHistory?: RunHistoryItem[];
}

/**
 * ArtifactsPage — 工件库页面
 *
 * 布局：左侧 Run 历史列表（240px）+ 右侧工件详情区（flex-1）
 * 选中某个 Run 后，右侧展示该 Run 产出的所有 Artifact
 *
 * 数据优先级：
 *   1. runHistory prop（来自 App.tsx 实时数据 / IPC 拉取的历史）
 *   2. mockRunHistory（浏览器 dev 演示）
 */
export function ArtifactsPage({ runHistory }: ArtifactsPageProps) {
  const { t } = useLanguage();
  // 合并：真实数据优先，补充 mock 历史（仅 dev 环境下）
  const isElectron = typeof window !== "undefined" && !!window.omega;
  const combinedRuns: RunHistoryItem[] =
    isElectron
      ? (runHistory ?? [])
      : [...(runHistory ?? []), ...mockRunHistory];

  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);

  // 当 runs 列表变化（新 run 完成推入）时，若无选中则自动选第一条
  useEffect(() => {
    if (!selectedRunId && combinedRuns.length > 0) {
      setSelectedRunId(combinedRuns[0]!.runId);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [combinedRuns.length]);

  // 构建工件列表：优先用 aiOutput 作为 artifact，fallback 到 mockArtifacts
  const selectedRun = combinedRuns.find(r => r.runId === selectedRunId);

  const artifacts: ArtifactItem[] = selectedRunId
    ? buildArtifacts(selectedRunId, selectedRun)
    : [];

  return (
    <div className="flex h-full w-full overflow-hidden">
      {/* 左侧 Run 历史列表 */}
      <RunHistoryList
        runs={combinedRuns}
        selectedRunId={selectedRunId}
        onSelect={setSelectedRunId}
      />

      {/* 右侧工件详情区 */}
      <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
        {/* 详情区顶部标题栏 */}
        <div
          className="flex items-center gap-3 px-6 py-3 flex-shrink-0 border-b"
          style={{ borderColor: "rgba(255,255,255,0.06)" }}
        >
          {selectedRun ? (
            <>
              <span className="text-xs font-medium" style={{ color: "rgba(255,255,255,0.60)" }}>
                {selectedRun.graphName}
              </span>
              <span className="text-2xs font-mono" style={{ color: "rgba(255,255,255,0.20)" }}>
                {selectedRun.runId}
              </span>
              <span className="ml-auto text-2xs" style={{ color: "rgba(255,255,255,0.25)" }}>
                {artifacts.length} {t.artifacts.title}
              </span>
            </>
          ) : (
            <span className="text-xs" style={{ color: "rgba(255,255,255,0.25)" }}>
              {t.artifacts.noSelection}
            </span>
          )}
        </div>

        {/* 工件列表 */}
        <div className="flex-1 overflow-y-auto p-6">
          {!selectedRunId && (
            <EmptyState message={t.artifacts.selectRun} />
          )}

          {selectedRunId && artifacts.length === 0 && (
            <EmptyState
              message={
                selectedRun?.state === "RUNNING"
                  ? t.artifacts.inProgress
                  : selectedRun?.state === "FAILED"
                  ? t.artifacts.failed
                  : t.artifacts.noArtifacts
              }
              dim={selectedRun?.state === "FAILED"}
            />
          )}

          {artifacts.length > 0 && (
            <div className="flex flex-col gap-3 max-w-3xl">
              {artifacts.map((artifact, i) => (
                <motion.div
                  key={artifact.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.06, duration: 0.2 }}
                >
                  <ArtifactCard artifact={artifact} />
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * 构建该 Run 的工件列表
 * 优先使用 aiOutput 字段；如果没有则 fallback 到 mockArtifacts
 */
function buildArtifacts(runId: string, run?: RunHistoryItem): ArtifactItem[] {
  const result: ArtifactItem[] = [];

  // AI 输出文本作为 artifact
  if (run?.aiOutput) {
    result.push({
      id: `${runId}-ai-output`,
      runId,
      label: "AI Response", // 固定英文 label，作为工件标识符使用
      type: "text",
      content: run.aiOutput,
      createdAt: run.startedAt,
    });
  }

  // mock 数据补充（dev 演示用）
  const mocked = mockArtifacts[runId] ?? [];
  result.push(...mocked);

  return result;
}

/** 空状态占位 */
function EmptyState({ message, dim = false }: { message: string; dim?: boolean }) {
  return (
    <div className="flex items-center justify-center h-full min-h-48">
      <div className="flex flex-col items-center gap-3">
        <span
          className="text-2xl"
          style={{ opacity: dim ? 0.15 : 0.20 }}
        >
          ◱
        </span>
        <p
          className="text-xs text-center"
          style={{ color: dim ? "rgba(248,113,113,0.40)" : "rgba(255,255,255,0.25)" }}
        >
          {message}
        </p>
      </div>
    </div>
  );
}
