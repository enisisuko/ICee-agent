import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { ArtifactItem } from "../../types/ui.js";

interface ArtifactCardProps {
  artifact: ArtifactItem;
}

/** 类型图标 */
const TYPE_ICONS: Record<ArtifactItem["type"], string> = {
  text: "◱",
  json: "{ }",
  file: "◧",
};

/** 类型标签颜色 */
const TYPE_COLORS: Record<ArtifactItem["type"], string> = {
  text: "rgba(96,165,250,0.60)",
  json: "rgba(167,139,250,0.60)",
  file: "rgba(52,211,153,0.60)",
};

/** 格式化时间 */
function formatTime(iso: string): string {
  return new Date(iso).toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * ArtifactCard — 工件展示卡片
 * 支持展开/收起，可复制内容
 * text 类型直接显示，json 类型代码块背景 bg-black/30
 */
export function ArtifactCard({ artifact }: ArtifactCardProps) {
  const [expanded, setExpanded] = useState(true);
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(artifact.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const typeColor = TYPE_COLORS[artifact.type];
  const isCode = artifact.type === "json";

  return (
    <motion.div
      className="rounded overflow-hidden"
      style={{
        background: "rgba(12, 14, 18, 0.80)",
        border: "1px solid rgba(255,255,255,0.07)",
      }}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      {/* 卡片头部 */}
      <div
        className="flex items-center gap-3 px-4 py-2.5 cursor-pointer select-none"
        style={{ borderBottom: expanded ? "1px solid rgba(255,255,255,0.06)" : "none" }}
        onClick={() => setExpanded(v => !v)}
      >
        {/* 类型图标 */}
        <span className="text-xs font-mono flex-shrink-0" style={{ color: typeColor }}>
          {TYPE_ICONS[artifact.type]}
        </span>

        {/* 标签 */}
        <span className="text-xs font-medium flex-1" style={{ color: "rgba(255,255,255,0.70)" }}>
          {artifact.label}
        </span>

        {/* 类型标签 */}
        <span
          className="text-2xs px-1.5 py-0.5 rounded-sm font-mono flex-shrink-0"
          style={{
            background: `${typeColor.replace("0.60", "0.10")}`,
            color: typeColor,
            border: `1px solid ${typeColor.replace("0.60", "0.25")}`,
          }}
        >
          {artifact.type}
        </span>

        {/* 时间 */}
        <span className="text-2xs flex-shrink-0" style={{ color: "rgba(255,255,255,0.20)" }}>
          {formatTime(artifact.createdAt)}
        </span>

        {/* 展开/收起箭头 */}
        <motion.span
          className="text-xs flex-shrink-0"
          style={{ color: "rgba(255,255,255,0.25)" }}
          animate={{ rotate: expanded ? 90 : 0 }}
          transition={{ duration: 0.15 }}
        >
          ▷
        </motion.span>
      </div>

      {/* 内容区 */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            style={{ overflow: "hidden" }}
          >
            <div className="relative">
              {/* 复制按钮 */}
              <button
                onClick={handleCopy}
                className="absolute top-3 right-3 z-10 px-2 py-1 rounded text-2xs transition-all"
                style={{
                  background: copied ? "rgba(52,211,153,0.15)" : "rgba(255,255,255,0.06)",
                  border: `1px solid ${copied ? "rgba(52,211,153,0.30)" : "rgba(255,255,255,0.10)"}`,
                  color: copied ? "#34d399" : "rgba(255,255,255,0.40)",
                }}
              >
                {copied ? "copied" : "copy"}
              </button>

              {/* 内容 */}
              <div
                className="px-4 py-3 overflow-auto max-h-80"
                style={{
                  background: isCode ? "rgba(0,0,0,0.30)" : "transparent",
                }}
              >
                <pre
                  className="text-xs leading-relaxed whitespace-pre-wrap break-words"
                  style={{
                    fontFamily: isCode ? "var(--font-mono, monospace)" : "inherit",
                    color: isCode ? "rgba(167,139,250,0.80)" : "rgba(255,255,255,0.60)",
                  }}
                >
                  {artifact.content}
                </pre>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
