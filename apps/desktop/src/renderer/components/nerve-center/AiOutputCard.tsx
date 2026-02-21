import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLanguage } from "../../i18n/LanguageContext.js";

interface AiOutputCardProps {
  /** AI 输出文本；为 undefined 时隐藏 */
  output: string | undefined;
}

/**
 * AiOutputCard — AI 回复展示卡片
 *
 * 视觉规范：
 *   bg-[#0d1117]/80, border-green-500/20
 *   标题：绿色小点 + "AI Response"
 *   内容：font-mono text-sm, text-white/70
 *   右上角：复制按钮
 *   Framer Motion：opacity=0 y=10 → 完成后淡入
 */
export function AiOutputCard({ output }: AiOutputCardProps) {
  const { t } = useLanguage();
  // 复制状态（复制后短暂显示 ✓）
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (!output) return;
    navigator.clipboard.writeText(output).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <AnimatePresence>
      {output && (
        <motion.div
          key="ai-output-card"
          // 从 y=10 淡入
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="w-full max-w-2xl rounded-xl relative overflow-hidden"
          style={{
            background: "rgba(13,17,23,0.80)",
            border: "1px solid rgba(34,197,94,0.18)",
            backdropFilter: "blur(8px)",
          }}
        >
          {/* 顶部微光条（绿色渐变） */}
          <div
            className="absolute top-0 left-0 right-0 h-px"
            style={{
              background: "linear-gradient(90deg, transparent, rgba(34,197,94,0.35), transparent)",
            }}
          />

          {/* 标题栏 */}
          <div
            className="flex items-center justify-between px-4 py-2 border-b"
            style={{ borderColor: "rgba(34,197,94,0.10)" }}
          >
            <div className="flex items-center gap-2">
              {/* 绿色呼吸小点 */}
              <motion.div
                className="w-1.5 h-1.5 rounded-full bg-green-400"
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              />
              <span
                className="text-xs font-medium tracking-wide"
                style={{ color: "rgba(74,222,128,0.85)" }}
              >
                {t.aiOutput.title}
              </span>
            </div>

            {/* 复制按钮 */}
            <motion.button
              onClick={handleCopy}
              className="flex items-center gap-1 text-2xs px-2 py-0.5 rounded"
              style={{
                color: copied ? "rgba(74,222,128,0.90)" : "rgba(255,255,255,0.30)",
                background: copied ? "rgba(34,197,94,0.10)" : "transparent",
                border: "1px solid",
                borderColor: copied ? "rgba(34,197,94,0.25)" : "rgba(255,255,255,0.08)",
                fontSize: "10px",
              }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              transition={{ duration: 0.1 }}
            >
              {copied ? "✓" : "⧉"} {copied ? t.aiOutput.copied : t.aiOutput.copy}
            </motion.button>
          </div>

          {/* 内容区 */}
          <div className="px-4 py-3">
            <pre
              className="font-mono text-sm whitespace-pre-wrap break-words leading-relaxed"
              style={{ color: "rgba(255,255,255,0.72)" }}
            >
              {output}
            </pre>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
