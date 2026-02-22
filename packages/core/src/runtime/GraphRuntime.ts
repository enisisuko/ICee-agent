import { nanoid } from "nanoid";
import type {
  GraphDefinition, Run, Step, StepEvent, WsEvent
} from "@omega/shared";
import {
  RunState, NodeState, ErrorType
} from "@omega/shared";
import type { RunRepository } from "@omega/db";
import type { StepRepository } from "@omega/db";
import type { EventRepository } from "@omega/db";
import { fromNativeError } from "../errors.js";
import { createLogger } from "../logger.js";
import type { GraphNodeRunner, NodeContext } from "../executor/NodeExecutor.js";

const log = createLogger("GraphRuntime");

/** Runtime 事件回调 (用于 WebSocket 广播) */
export type RuntimeEventCallback = (event: WsEvent) => void;

/** 运行时状态 (内存中，比 DB 更实时) */
interface RuntimeState {
  runId: string;
  state: RunState;
  currentNodeId?: string;
  totalTokens: number;
  totalCostUsd: number;
  startedAt: Date;
  /** 用于 cancel/pause 的中止信号 */
  abortController: AbortController;
}

/**
 * Omega Graph Runtime
 * 负责执行一个完整的 GraphDefinition，管理节点调度、状态持久化、事件广播
 */
export class GraphRuntime {
  /** 当前活跃的 Run 状态表 (runId → state) */
  private activeRuns = new Map<string, RuntimeState>();

  constructor(
    private readonly nodeRunner: GraphNodeRunner,
    private readonly runRepo: RunRepository,
    private readonly stepRepo: StepRepository,
    private readonly eventRepo: EventRepository,
    private readonly onEvent: RuntimeEventCallback
  ) {}

  /**
   * 启动一个新的 Run
   */
  async startRun(
    graph: GraphDefinition,
    input?: Record<string, unknown>
  ): Promise<string> {
    const runId = nanoid();
    const now = new Date().toISOString();

    // 创建 Run 记录
    const run: Run = {
      runId,
      graphId: graph.id,
      graphVersion: graph.version,
      state: RunState.IDLE,
      input,
      totalTokens: 0,
      totalCostUsd: 0,
      startedAt: now,
      createdAt: now,
    };
    this.runRepo.create(run);

    // 初始化运行时状态
    const runtimeState: RuntimeState = {
      runId,
      state: RunState.IDLE,
      totalTokens: 0,
      totalCostUsd: 0,
      startedAt: new Date(),
      abortController: new AbortController(),
    };
    this.activeRuns.set(runId, runtimeState);

    // 广播 run_started 事件
    this.onEvent({
      type: "event:run_started",
      payload: {
        runId,
        graphId: graph.id,
        graphVersion: graph.version,
        startedAt: now,
      },
    });

    log.info({ runId, graphId: graph.id }, "Run started");

    // 异步执行 (不阻塞启动)
    this.executeGraph(graph, runId, input, runtimeState).catch(err => {
      log.error({ runId, err }, "Unhandled error during graph execution");
    });

    return runId;
  }

  /**
   * 暂停正在运行的 Run
   */
  async pauseRun(runId: string): Promise<void> {
    const state = this.activeRuns.get(runId);
    if (!state || state.state !== RunState.RUNNING) {
      throw new Error(`Run ${runId} is not in RUNNING state`);
    }
    state.state = RunState.PAUSED;
    this.runRepo.updateState(runId, RunState.PAUSED);

    this.onEvent({
      type: "event:run_paused",
      payload: { runId, pausedAt: new Date().toISOString() },
    });
    log.info({ runId }, "Run paused");
  }

  /**
   * 取消正在运行的 Run
   */
  async cancelRun(runId: string): Promise<void> {
    const state = this.activeRuns.get(runId);
    if (!state) {
      throw new Error(`Run ${runId} not found in active runs`);
    }
    state.abortController.abort();
    state.state = RunState.CANCELLED;
    this.runRepo.complete(runId, {
      state: RunState.CANCELLED,
      totalTokens: state.totalTokens,
      totalCostUsd: state.totalCostUsd,
      durationMs: Date.now() - state.startedAt.getTime(),
      completedAt: new Date().toISOString(),
    });

    this.onEvent({
      type: "event:run_completed",
      payload: {
        runId,
        state: "CANCELLED",
        totalTokens: state.totalTokens,
        totalCostUsd: state.totalCostUsd,
        durationMs: Date.now() - state.startedAt.getTime(),
        completedAt: new Date().toISOString(),
      },
    });

    this.activeRuns.delete(runId);
    log.info({ runId }, "Run cancelled");
  }

  /**
   * Fork 一个 Run：复用父 Run 的历史事件，从指定 Step 开始重新执行
   */
  async forkRun(
    parentRunId: string,
    fromStepId: string,
    graph: GraphDefinition,
    inputOverride?: Record<string, unknown>
  ): Promise<string> {
    const parentRun = this.runRepo.findById(parentRunId);
    if (!parentRun) {
      throw new Error(`Parent run ${parentRunId} not found`);
    }

    const newRunId = nanoid();
    const now = new Date().toISOString();

    // 创建 Fork Run 记录
    const newRun: Run = {
      runId: newRunId,
      graphId: graph.id,
      graphVersion: graph.version,
      state: RunState.IDLE,
      parentRunId,
      forkFromStepId: fromStepId,
      parentVersion: parentRun.graphVersion,
      input: inputOverride ?? parentRun.input,
      totalTokens: 0,
      totalCostUsd: 0,
      startedAt: now,
      createdAt: now,
    };
    this.runRepo.create(newRun);

    // 复制父 Run 中 fromStep 之前的 Steps，标记为 inherited
    const parentSteps = this.stepRepo.findByRunId(parentRunId);
    const forkStepIndex = parentSteps.findIndex(s => s.stepId === fromStepId);
    const inheritedSteps = forkStepIndex > 0 ? parentSteps.slice(0, forkStepIndex) : [];

    const newInheritedSteps: Step[] = inheritedSteps.map(s => ({
      ...s,
      stepId: nanoid(),
      runId: newRunId,
      inherited: true,
    }));
    this.stepRepo.createMany(newInheritedSteps);

    this.onEvent({
      type: "event:run_forked",
      payload: {
        newRunId,
        parentRunId,
        fromStepId,
        forkStartedAt: now,
      },
    });

    log.info({ newRunId, parentRunId, fromStepId }, "Run forked");

    // 从 fromStep 对应的节点开始执行剩余图
    const fromStep = parentSteps.find(s => s.stepId === fromStepId);
    const fromNodeIndex = fromStep
      ? graph.nodes.findIndex(n => n.id === fromStep.nodeId)
      : 0;

    const partialGraph: GraphDefinition = {
      ...graph,
      nodes: graph.nodes.slice(fromNodeIndex),
    };

    const runtimeState: RuntimeState = {
      runId: newRunId,
      state: RunState.IDLE,
      totalTokens: 0,
      totalCostUsd: 0,
      startedAt: new Date(),
      abortController: new AbortController(),
    };
    this.activeRuns.set(newRunId, runtimeState);

    this.executeGraph(partialGraph, newRunId, inputOverride ?? parentRun.input, runtimeState).catch(err => {
      log.error({ newRunId, err }, "Unhandled error during forked graph execution");
    });

    return newRunId;
  }

  /**
   * 核心图执行逻辑 (串行节点调度)
   */
  private async executeGraph(
    graph: GraphDefinition,
    runId: string,
    input: Record<string, unknown> | undefined,
    runtimeState: RuntimeState
  ): Promise<void> {
    runtimeState.state = RunState.RUNNING;
    this.runRepo.updateState(runId, RunState.RUNNING);

    const runMemory = new Map<string, unknown>();
    let previousOutput: unknown = undefined;
    let sequence = 0;

    try {
      for (const node of graph.nodes) {
        // 检查是否被取消/暂停
        if (runtimeState.abortController.signal.aborted) {
          break;
        }

        // 等待恢复 (PAUSED 状态下轮询)
        // 使用 as 绕过 TS 类型收窄（runtimeState 是可变对象，pauseRun 可在任意时刻改变其 state）
        while ((runtimeState.state as RunState) === RunState.PAUSED) {
          await new Promise(r => setTimeout(r, 500));
          if (runtimeState.abortController.signal.aborted) break;
        }

        if (runtimeState.abortController.signal.aborted) break;

        // 创建 Step 记录
        const stepId = nanoid();
        const step: Step = {
          stepId,
          runId,
          nodeId: node.id,
          nodeType: node.type,
          nodeLabel: node.label,
          state: NodeState.PENDING,
          inherited: false,
          retryCount: 0,
          sequence: sequence++,
        };
        this.stepRepo.create(step);

        // 广播 step_started
        const stepStartedAt = new Date().toISOString();
        this.onEvent({
          type: "event:step_started",
          payload: {
            runId,
            stepId,
            nodeId: node.id,
            nodeType: node.type,
            nodeLabel: node.label,
            sequence: step.sequence,
            startedAt: stepStartedAt,
          },
        });

        runtimeState.currentNodeId = node.id;

        // 构建执行上下文
        // exactOptionalPropertyTypes: 只有有值时才设置可选字段
        const ctx: NodeContext = {
          runId,
          stepId,
          runMemory,
          ...(previousOutput !== undefined && { previousOutput }),
          ...(input !== undefined && { globalInput: input }),
        };

        // 执行节点
        let nodeResult: { output: unknown; tokens?: number; costUsd?: number } | undefined;

        await this.nodeRunner.run(
          node,
          ctx,
          // onEvent 回调: 追加事件到 DB
          (eventPartial) => {
            const fullEvent: StepEvent = {
              eventId: eventPartial.eventId ?? nanoid(),
              runId,
              stepId,
              nodeId: node.id,
              timestamp: eventPartial.timestamp ?? new Date().toISOString(),
              ...eventPartial,
            };
            this.eventRepo.append(fullEvent);

            // 广播 step_completed
            this.onEvent({
              type: "event:step_completed",
              payload: { runId, stepId, nodeId: node.id, event: fullEvent },
            });

            // 累计 token 和 cost
            if (fullEvent.tokens) runtimeState.totalTokens += fullEvent.tokens;
            if (fullEvent.costUsd) runtimeState.totalCostUsd += fullEvent.costUsd;
          },
          // onStateChange 回调: 更新 Step 状态
          // 只传 updateState 期望的字段，避免 Partial<Step> 与窄类型不兼容
          (state, data) => {
            this.stepRepo.updateState(stepId, state, data ? {
              ...(data.startedAt !== undefined && { startedAt: data.startedAt }),
              ...(data.completedAt !== undefined && { completedAt: data.completedAt }),
              ...(data.durationMs !== undefined && { durationMs: data.durationMs }),
              ...(data.retryCount !== undefined && { retryCount: data.retryCount }),
            } : undefined);
          }
        ).then(result => {
          nodeResult = result;
        });

        // 将此节点输出作为下一个节点的输入
        if (nodeResult) {
          previousOutput = nodeResult.output;
        }
      }

      // Run 成功完成
      const completedAt = new Date().toISOString();
      const durationMs = Date.now() - runtimeState.startedAt.getTime();

      runtimeState.state = RunState.COMPLETED;
      this.runRepo.complete(runId, {
        state: RunState.COMPLETED,
        output: typeof previousOutput === "object" && previousOutput !== null
          ? previousOutput as Record<string, unknown>
          : { result: previousOutput },
        totalTokens: runtimeState.totalTokens,
        totalCostUsd: runtimeState.totalCostUsd,
        durationMs,
        completedAt,
      });

      this.onEvent({
        type: "event:run_completed",
        payload: {
          runId,
          state: "COMPLETED",
          output: typeof previousOutput === "object" ? previousOutput as Record<string, unknown> : undefined,
          totalTokens: runtimeState.totalTokens,
          totalCostUsd: runtimeState.totalCostUsd,
          durationMs,
          completedAt,
        },
      });

      log.info({ runId, durationMs, totalTokens: runtimeState.totalTokens }, "Run completed successfully");

    } catch (err) {
      const completedAt = new Date().toISOString();
      const durationMs = Date.now() - runtimeState.startedAt.getTime();
      const errorEnvelope = fromNativeError(err, ErrorType.SYSTEM_ERROR, { runId });

      runtimeState.state = RunState.FAILED;
      this.runRepo.complete(runId, {
        state: RunState.FAILED,
        totalTokens: runtimeState.totalTokens,
        totalCostUsd: runtimeState.totalCostUsd,
        durationMs,
        error: errorEnvelope,
        completedAt,
      });

      this.onEvent({
        type: "event:error",
        payload: { runId, error: errorEnvelope },
      });

      this.onEvent({
        type: "event:run_completed",
        payload: {
          runId,
          state: "FAILED",
          totalTokens: runtimeState.totalTokens,
          totalCostUsd: runtimeState.totalCostUsd,
          durationMs,
          completedAt,
        },
      });

      log.error({ runId, error: errorEnvelope }, "Run failed");

    } finally {
      this.activeRuns.delete(runId);
    }
  }

  /** 获取活跃 Run 的实时状态 */
  getActiveRunState(runId: string): RuntimeState | undefined {
    return this.activeRuns.get(runId);
  }

  /** 获取所有活跃 Run ID */
  getActiveRunIds(): string[] {
    return Array.from(this.activeRuns.keys());
  }
}
