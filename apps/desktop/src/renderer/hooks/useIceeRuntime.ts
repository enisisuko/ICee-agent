import { useEffect, useRef, useCallback } from "react";
import type { TraceLogEntry } from "../types/ui.js";

/**
 * useIceeRuntime — Electron IPC 运行时桥接 Hook
 *
 * 仅在 Electron 环境下（window.icee 存在）激活。
 * 浏览器开发模式下静默跳过，不影响 mock 模拟流程。
 *
 * 功能：
 *   - 监听 Ollama 状态推送
 *   - 监听 StepEvent（TraceLog 实时追加）
 *   - 监听 Run 完成（更新 orchestrator 状态）
 *   - 监听 Token 用量更新
 *   - 暴露 runGraph / cancelRun 方法
 */
export function useIceeRuntime(callbacks: {
  onStepEvent: (entry: TraceLogEntry) => void;
  onRunCompleted: (payload: {
    state: string;
    totalTokens: number;
    totalCostUsd: number;
    durationMs?: number;
    output?: unknown;
  }) => void;
  onTokenUpdate: (tokens: number, costUsd: number) => void;
  onOllamaStatus?: (healthy: boolean, url: string) => void;
}) {
  const callbacksRef = useRef(callbacks);
  callbacksRef.current = callbacks;

  // 是否处于 Electron 环境
  const isElectron = typeof window !== "undefined" && !!window.icee;

  useEffect(() => {
    if (!isElectron || !window.icee) return;

    const api = window.icee;

    // 监听 Ollama 状态
    const offOllama = api.onOllamaStatus((payload) => {
      callbacksRef.current.onOllamaStatus?.(payload.healthy, payload.url);
    });

    // 监听 StepEvent → 转为 TraceLogEntry 追加
    const offStep = api.onStepEvent((payload) => {
      const entry: TraceLogEntry = {
        id: `ipc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        type: payload.type,
        timestamp: new Date().toLocaleTimeString("en-GB", { hour12: false }),
        message: payload.message,
        ...(payload.nodeId !== undefined && { nodeId: payload.nodeId }),
        ...(payload.details !== undefined && { details: payload.details }),
      };
      callbacksRef.current.onStepEvent(entry);
    });

    // 监听 Run 完成
    const offCompleted = api.onRunCompleted((payload) => {
      callbacksRef.current.onRunCompleted(payload);
    });

    // 监听 Token 用量
    const offToken = api.onTokenUpdate((payload) => {
      callbacksRef.current.onTokenUpdate(payload.tokens, payload.costUsd);
    });

    return () => {
      offOllama();
      offStep();
      offCompleted();
      offToken();
    };
  }, [isElectron]);

  /**
   * 运行 Graph（优先走 Electron IPC；浏览器环境返回 null）
   * @param graphJson      GraphDefinition JSON 字符串
   * @param inputJson      输入数据 JSON 字符串
   * @param attachmentsJson 附件数组 JSON 字符串（可选）
   */
  const runGraph = useCallback(
    async (
      graphJson: string,
      inputJson: string,
      attachmentsJson?: string
    ): Promise<{ runId?: string; error?: string } | null> => {
      if (!window.icee) return null;
      return window.icee.runGraph(graphJson, inputJson, attachmentsJson);
    },
    []
  );

  /**
   * 取消 Run
   */
  const cancelRun = useCallback(async (runId: string): Promise<void> => {
    if (!window.icee) return;
    await window.icee.cancelRun(runId);
  }, []);

  return { isElectron, runGraph, cancelRun };
}
