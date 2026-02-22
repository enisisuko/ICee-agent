import { useMemo } from "react";
import type { ExecutionEdge } from "../types/ui.js";

/** 单个节点的屏幕坐标（以画布容器为原点） */
export interface NodePosition {
  /** 节点 ID */
  id: string;
  /** 节点中心 X（像素，相对容器左上角） */
  x: number;
  /** 节点中心 Y（像素，相对容器左上角） */
  y: number;
  /** 节点所在层级（0 = Orchestrator，1 = 第一执行层，以此类推） */
  level: number;
  /** 同层中的排列序号（0-based，用于横向居中计算） */
  indexInLevel: number;
  /** 同层总节点数（用于居中计算） */
  totalInLevel: number;
}

/**
 * 布局常量（可按实际画布调整）
 *
 * NODE_W  : 每个节点卡片宽度（px）
 * NODE_H  : 每个节点卡片高度（px）
 * LEVEL_H : 相邻层级之间的垂直间距（px）
 * GAP_X   : 同层节点的水平间距（px）
 */
const NODE_W = 192;
const NODE_H = 100;
const LEVEL_H = 150;  // 稍微紧凑，整体布局更美观
const GAP_X = 24;

/**
 * 节点横向偏移表（钻石形布局）
 * 相对于 BFS 层级居中位置的额外像素偏移
 * 正值 = 向右，负值 = 向左
 * 使 decompose(Context) 和 execute(Executor) 左右扩散，形成钻石形态
 */
const X_BIAS: Record<string, number> = {
  decompose: -150,  // Context 节点向左扩散
  execute:    150,  // Executor 节点向右扩散
};

export interface LayoutEngineResult {
  /** 节点 ID → 坐标映射（含 Orchestrator） */
  positions: Map<string, NodePosition>;
  /** 画布所需最小宽度（px） */
  canvasWidth: number;
  /** 画布所需最小高度（px） */
  canvasHeight: number;
}

/**
 * useLayoutEngine — BFS 拓扑排序布局引擎
 *
 * 输入：ExecutionEdge[] + 容器宽度 + 可选 Y 轴起始偏移
 * 输出：每个节点的屏幕坐标
 *
 * 算法：
 * 1. 从 edges 中收集所有节点 ID
 * 2. 以 "orchestrator" 为根，BFS 遍历得到层级（level）
 *    - 若无 orchestrator 节点，则取所有入度为 0 的节点作为第 1 层
 * 3. 同层节点横向居中排列，间距为 NODE_W + GAP_X
 * 4. orchestrator 固定在第 0 层顶部中心
 *
 * @param yOffset 整体 Y 轴偏移（像素），用于多轮对话时将每轮图垂直续接在上一轮下方
 */
export function useLayoutEngine(
  edges: ExecutionEdge[],
  containerWidth: number,
  orchestratorId = "orchestrator",
  yOffset = 0,
): LayoutEngineResult {
  return useMemo(() => {
    const positions = new Map<string, NodePosition>();

    if (edges.length === 0) {
      return { positions, canvasWidth: containerWidth, canvasHeight: 200 };
    }

    // ── 收集所有节点 ID（来自 edges source + target）──────────
    const allNodeIds = new Set<string>();
    for (const e of edges) {
      allNodeIds.add(e.source);
      allNodeIds.add(e.target);
    }

    // ── 构建邻接表（source → targets[]） ─────────────────────
    const adj = new Map<string, string[]>();
    const inDegree = new Map<string, number>();

    for (const id of allNodeIds) {
      adj.set(id, []);
      inDegree.set(id, 0);
    }
    for (const e of edges) {
      adj.get(e.source)!.push(e.target);
      inDegree.set(e.target, (inDegree.get(e.target) ?? 0) + 1);
    }

    // ── BFS 层级计算 ─────────────────────────────────────────
    // 层级 Map: nodeId → level
    const levelMap = new Map<string, number>();

    // 根节点：优先使用 orchestratorId；否则取所有入度为 0 的节点
    const roots: string[] = [];
    if (allNodeIds.has(orchestratorId)) {
      roots.push(orchestratorId);
      levelMap.set(orchestratorId, 0);
    } else {
      for (const [id, deg] of inDegree) {
        if (deg === 0) {
          roots.push(id);
          levelMap.set(id, 0);
        }
      }
    }

    // BFS
    const queue = [...roots];
    while (queue.length > 0) {
      const cur = queue.shift()!;
      const curLevel = levelMap.get(cur) ?? 0;
      for (const child of (adj.get(cur) ?? [])) {
        // 取最大层级（防止 DAG 中节点被上游多个父节点赋予不同层级时取错）
        const existing = levelMap.get(child);
        if (existing === undefined || existing < curLevel + 1) {
          levelMap.set(child, curLevel + 1);
          queue.push(child);
        }
      }
    }

    // 处理环或孤立节点（未被 BFS 覆盖）
    for (const id of allNodeIds) {
      if (!levelMap.has(id)) {
        levelMap.set(id, 1); // 统一归为第 1 层
      }
    }

    // ── 按层级分组 ────────────────────────────────────────────
    const levelGroups = new Map<number, string[]>();
    for (const [id, level] of levelMap) {
      const group = levelGroups.get(level) ?? [];
      group.push(id);
      levelGroups.set(level, group);
    }

    // ── 计算坐标 ─────────────────────────────────────────────
    const maxLevel = Math.max(...levelMap.values());
    const canvasHeight = yOffset + (maxLevel + 1) * LEVEL_H + NODE_H + 40; // 额外下边距

    for (const [level, ids] of levelGroups) {
      const count = ids.length;
      // 层级起始 Y（从顶部往下，留 20px 顶边距，加上 yOffset 实现多轮垂直续接）
      const y = yOffset + 20 + level * LEVEL_H + NODE_H / 2;

      ids.forEach((id, i) => {
        // 居中：x 相对容器中心偏移
        const offsetX = (i - (count - 1) / 2) * (NODE_W + GAP_X);
        // 叠加钻石形偏移（X_BIAS 中定义的节点横向错开）
        const bias = X_BIAS[id] ?? 0;
        const x = containerWidth / 2 + offsetX + bias;

        positions.set(id, {
          id,
          x,
          y,
          level,
          indexInLevel: i,
          totalInLevel: count,
        });
      });
    }

    const canvasWidth = Math.max(
      containerWidth,
      // 确保宽度能容纳最宽那层
      Math.max(...[...levelGroups.values()].map(
        (ids) => ids.length * NODE_W + (ids.length - 1) * GAP_X
      )) + 64
    );

    return { positions, canvasWidth, canvasHeight };
  }, [edges, containerWidth, orchestratorId, yOffset]);
}

/** 获取节点卡片左上角坐标（中心坐标转左上角，用于 absolute 定位） */
export function toTopLeft(pos: NodePosition): { left: number; top: number } {
  return {
    left: pos.x - NODE_W / 2,
    top: pos.y - NODE_H / 2,
  };
}

/** 两个节点坐标之间的 SVG 连线端点（从底部中心到顶部中心） */
export function getPipeEndpoints(
  from: NodePosition,
  to: NodePosition,
): { fromPt: { x: number; y: number }; toPt: { x: number; y: number } } {
  return {
    fromPt: { x: from.x, y: from.y + NODE_H / 2 }, // 源节点底部中心
    toPt:   { x: to.x,   y: to.y   - NODE_H / 2 }, // 目标节点顶部中心
  };
}
