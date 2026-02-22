import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/renderer/**/*.{ts,tsx,html}", "./index.html"],
  darkMode: "class",
  theme: {
    extend: {
      // Omega 设计系统 Design Tokens
      colors: {
        // 背景层级
        surface: {
          base: "#08090c",     // 最底层背景
          card: "#0f1117",     // 卡片背景
          overlay: "#161b24",  // 浮层背景
          raised: "#1c2333",   // 悬浮层背景
        },
        // 边框
        border: {
          subtle: "rgba(255,255,255,0.06)",
          default: "rgba(255,255,255,0.10)",
          strong: "rgba(255,255,255,0.16)",
        },
        // 状态色 (低饱和度)
        state: {
          thinking: "#60a5fa",   // blue-400 — 思考中
          success:  "#34d399",   // emerald-400 — 成功
          error:    "#f87171",   // red-400 — 错误
          autofix:  "#fbbf24",   // amber-400 — Skill 自动修复
          active:   "#a78bfa",   // violet-400 — 多 Agent 活跃
          mcp:      "#fb7185",   // rose-400 — MCP 工具调用
          idle:     "#4b5563",   // gray-600 — 闲置
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "Fira Code", "monospace"],
      },
      fontSize: {
        // 严格字号层级
        "2xs": ["10px", { lineHeight: "14px" }],
        xs:   ["11px", { lineHeight: "16px" }],
        sm:   ["12px", { lineHeight: "18px" }],
        base: ["13px", { lineHeight: "20px" }],
        md:   ["14px", { lineHeight: "22px" }],
        lg:   ["16px", { lineHeight: "24px" }],
        xl:   ["18px", { lineHeight: "28px" }],
        "2xl":["22px", { lineHeight: "32px" }],
      },
      fontWeight: {
        // 只允许这三个字重
        normal: "400",
        medium: "500",
        semibold: "600",
      },
      borderRadius: {
        sm: "3px",
        DEFAULT: "4px",
        md: "6px",
        lg: "8px",
        xl: "12px",
      },
      // 动画时长统一管理
      transitionDuration: {
        "fast": "150ms",
        "DEFAULT": "200ms",
        "slow": "300ms",
        "breath": "3000ms",
        "pipe": "1500ms",
      },
      // 发光投影 (强度严格控制在 0.20-0.25)
      boxShadow: {
        "glow-blue":   "0 0 12px rgba(96, 165, 250, 0.22)",
        "glow-emerald":"0 0 12px rgba(52, 211, 153, 0.22)",
        "glow-red":    "0 0 12px rgba(248, 113, 113, 0.22)",
        "glow-amber":  "0 0 16px rgba(251, 191, 36, 0.25)",
        "glow-violet": "0 0 12px rgba(167, 139, 250, 0.22)",
        "glow-rose":   "0 0 12px rgba(251, 113, 133, 0.20)",
        "card":        "0 1px 3px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.06)",
      },
      // 关键帧动画
      keyframes: {
        // 呼吸灯: opacity 0.4 → 0.7，克制，不是 0→1
        breathe: {
          "0%, 100%": { opacity: "0.4" },
          "50%": { opacity: "0.7" },
        },
        // 管道流动 (配合 SVG stroke-dashoffset)
        "pipe-flow": {
          "0%": { strokeDashoffset: "100" },
          "100%": { strokeDashoffset: "0" },
        },
        // 错误淡入淡出 (单次，不循环闪烁)
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        // Skill 蒙版退场
        "autofix-exit": {
          "0%": { opacity: "1" },
          "80%": { opacity: "1" },
          "100%": { opacity: "0" },
        },
        // 终端打字
        "type-cursor": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0" },
        },
      },
      animation: {
        "breathe": "breathe 3s ease-in-out infinite",
        "breathe-slow": "breathe 4s ease-in-out infinite",
        "pipe-flow": "pipe-flow 1.5s linear infinite",
        "fade-in": "fade-in 200ms ease-out forwards",
        "autofix-exit": "autofix-exit 2s ease-out forwards",
        "type-cursor": "type-cursor 1s step-end infinite",
      },
    },
  },
  plugins: [],
};

export default config;

