import { motion } from "framer-motion";

/** 连线执行状态，对应 ExecutionEdge.state */
export type PipeState = "pending" | "active" | "completed" | "failed";

interface DataPipeProps {
  /** SVG 内的起点 (x, y) */
  from: { x: number; y: number };
  /** SVG 内的终点 (x, y) */
  to: { x: number; y: number };
  /**
   * 连线状态：
   * - pending   : 灰暗虚线
   * - active    : 蓝色粒子流动（正在传输数据）
   * - completed : 绿色静止线（执行成功）
   * - failed    : 红色线（执行失败）
   */
  state?: PipeState;
  /** 兼容旧接口：是否激活 (如果同时传入，state 优先) */
  active?: boolean;
  /** 连线颜色主题（state 不为 pending 时自动推导颜色，此参数降级使用） */
  color?: "blue" | "green" | "amber" | "red";
  /** SVG 宽高 */
  width: number;
  height: number;
  /** 出现动画延迟（秒），在节点淡入后稍晚出现 */
  appearDelay?: number;
}

/** 根据 state 派生实际颜色 */
function resolveColors(state: PipeState, colorHint?: "blue" | "green" | "amber" | "red") {
  switch (state) {
    case "active":
      return { stroke: "rgba(96,165,250,0.30)", particle: "rgba(96,165,250,0.85)", glow: "rgba(96,165,250,0.15)" };
    case "completed":
      return { stroke: "rgba(52,211,153,0.35)", particle: "rgba(52,211,153,0.75)", glow: "rgba(52,211,153,0.12)" };
    case "failed":
      return { stroke: "rgba(248,113,113,0.35)", particle: "rgba(248,113,113,0.75)", glow: "rgba(248,113,113,0.12)" };
    case "pending":
    default:
      return { stroke: "rgba(255,255,255,0.08)", particle: "rgba(255,255,255,0.25)", glow: "transparent" };
  }
}

/**
 * DataPipe — 节点间的发光数据管道
 *
 * 使用 SVG cubic bezier 曲线，
 * 根据 state 驱动颜色和粒子动画：
 *   pending   → 灰暗虚线，无粒子
 *   active    → 蓝色渐变，持续粒子流
 *   completed → 绿色静止，pathLength 动画绘制
 *   failed    → 红色闪现，无粒子
 */
export function DataPipe({
  from,
  to,
  state: stateProp,
  active,
  color,
  width,
  height,
  appearDelay = 0,
}: DataPipeProps) {
  // state 优先；如果只传 active，则映射为旧行为
  const state: PipeState = stateProp ?? (active ? "active" : "pending");
  const colors = resolveColors(state, color);

  // 计算贝塞尔控制点 (垂直方向的 S 形曲线)
  const midY = (from.y + to.y) / 2;
  const pathD = `M ${from.x} ${from.y} C ${from.x} ${midY}, ${to.x} ${midY}, ${to.x} ${to.y}`;

  // pending 状态下线条虚化
  const isPending = state === "pending";
  const isActive = state === "active";
  const isCompleted = state === "completed";

  return (
    <motion.svg
      width={width}
      height={height}
      className="absolute inset-0 pointer-events-none"
      style={{ overflow: "visible" }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3, delay: appearDelay }}
    >
      <defs>
        {/* 线条渐变（纵向，从亮到暗） */}
        <linearGradient id={`pipe-grad-${state}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={colors.particle} stopOpacity="0.8" />
          <stop offset="100%" stopColor={colors.particle} stopOpacity="0.2" />
        </linearGradient>
      </defs>

      {/* 底层极淡底线（所有状态都显示，确保连线存在感） */}
      <path
        d={pathD}
        fill="none"
        stroke="rgba(255,255,255,0.04)"
        strokeWidth={1}
        strokeLinecap="round"
      />

      {/* pending 状态: 灰色虚线 */}
      {isPending && (
        <path
          d={pathD}
          fill="none"
          stroke={colors.stroke}
          strokeWidth={1}
          strokeLinecap="round"
          strokeDasharray="4 8"
        />
      )}

      {/* active 状态: 渐变主线 + 持续粒子流 */}
      {isActive && (
        <motion.path
          d={pathD}
          fill="none"
          stroke={`url(#pipe-grad-${state})`}
          strokeWidth={1.5}
          strokeLinecap="round"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 0.6, ease: "easeOut", delay: appearDelay }}
        />
      )}

      {/* completed 状态: 绿色静止线（pathLength 动画绘制一次后静止） */}
      {isCompleted && (
        <motion.path
          d={pathD}
          fill="none"
          stroke={`url(#pipe-grad-${state})`}
          strokeWidth={1.5}
          strokeLinecap="round"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 0.8, ease: "easeOut", delay: appearDelay }}
        />
      )}

      {/* failed 状态: 红色线（快速闪现） */}
      {state === "failed" && (
        <motion.path
          d={pathD}
          fill="none"
          stroke={colors.stroke}
          strokeWidth={1.5}
          strokeLinecap="round"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 1, 0.6] }}
          transition={{ duration: 0.4, ease: "easeOut", delay: appearDelay }}
        />
      )}

      {/* active 状态: 流动粒子（两个小球交错运动） */}
      {isActive && (
        <>
          <motion.circle
            r="2.5"
            fill={colors.particle}
            style={{ filter: `drop-shadow(0 0 4px ${colors.particle})` }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: appearDelay + 0.3 }}
          >
            <animateMotion dur="1.8s" repeatCount="indefinite" path={pathD} />
          </motion.circle>
          <motion.circle
            r="1.5"
            fill={colors.particle}
            opacity="0.55"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.55 }}
            transition={{ delay: appearDelay + 0.3 }}
          >
            <animateMotion dur="1.8s" begin="0.9s" repeatCount="indefinite" path={pathD} />
          </motion.circle>
        </>
      )}

      {/* completed 状态: 一个缓慢收尾小球（表示数据已传达终点，然后消失） */}
      {isCompleted && (
        <motion.circle
          r="2"
          fill={colors.particle}
          style={{ filter: `drop-shadow(0 0 3px ${colors.particle})` }}
          initial={{ opacity: 1 }}
          animate={{ opacity: 0 }}
          transition={{ delay: appearDelay + 1.2, duration: 0.5 }}
        >
          <animateMotion dur="1.2s" repeatCount="1" fill="freeze" path={pathD} />
        </motion.circle>
      )}
    </motion.svg>
  );
}
