import { motion } from "framer-motion";
import type { McpToolData, SkillData } from "../../types/ui.js";

interface ResourceSubstrateProps {
  mcpTools: McpToolData[];
  skills: SkillData[];
}

/**
 * ResourceSubstrate — 底部资源池托盘
 * 陈列当前挂载的 MCP Tools 和已激活的 Skills
 */
export function ResourceSubstrate({ mcpTools, skills }: ResourceSubstrateProps) {
  return (
    <div
      className="w-full rounded-lg overflow-hidden"
      style={{
        background: "rgba(10, 12, 16, 0.70)",
        border: "1px solid rgba(255,255,255,0.06)",
        backdropFilter: "blur(8px)",
      }}
    >
      {/* 标题栏 */}
      <div
        className="flex items-center gap-3 px-4 py-2.5 border-b"
        style={{ borderColor: "rgba(255,255,255,0.06)" }}
      >
        <span className="text-xs tracking-widest uppercase text-white/30">Resources</span>
        <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.04)" }} />
        <span className="text-2xs text-white/20">
          {mcpTools.filter(t => t.active).length} tools · {skills.filter(s => s.active).length} skills active
        </span>
      </div>

      {/* 内容区 */}
      <div className="flex gap-6 px-4 py-3">
        {/* MCP Tools */}
        <div className="flex-1">
          <p className="text-2xs text-white/25 mb-2 uppercase tracking-wider">MCP Tools</p>
          <div className="flex flex-wrap gap-2">
            {mcpTools.map((tool, i) => (
              <motion.div
                key={tool.id}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded"
                style={{
                  background: tool.active ? "rgba(251,113,133,0.08)" : "rgba(255,255,255,0.03)",
                  border: `1px solid ${tool.active ? "rgba(251,113,133,0.25)" : "rgba(255,255,255,0.06)"}`,
                }}
              >
                {/* 激活状态点 */}
                <motion.div
                  className="w-1 h-1 rounded-full flex-shrink-0"
                  style={{ background: tool.active ? "#fb7185" : "#374151" }}
                  animate={tool.active ? { opacity: [0.5, 1, 0.5] } : { opacity: 1 }}
                  transition={{ duration: 2.5, repeat: tool.active ? Infinity : 0 }}
                />
                <span
                  className="text-xs font-mono"
                  style={{ color: tool.active ? "rgba(251,113,133,0.80)" : "rgba(255,255,255,0.25)" }}
                >
                  {tool.name}
                </span>
                {tool.active && tool.callCount > 0 && (
                  <span className="text-2xs" style={{ color: "rgba(251,113,133,0.40)" }}>
                    ×{tool.callCount}
                  </span>
                )}
              </motion.div>
            ))}
          </div>
        </div>

        {/* 分隔线 */}
        <div className="w-px self-stretch" style={{ background: "rgba(255,255,255,0.06)" }} />

        {/* Skills */}
        <div className="flex-1">
          <p className="text-2xs text-white/25 mb-2 uppercase tracking-wider">Skills</p>
          <div className="flex flex-wrap gap-2">
            {skills.map((skill, i) => (
              <motion.div
                key={skill.id}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + i * 0.05 }}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded"
                style={{
                  background: skill.active ? "rgba(167,139,250,0.08)" : "rgba(255,255,255,0.03)",
                  border: `1px solid ${skill.active ? "rgba(167,139,250,0.25)" : "rgba(255,255,255,0.06)"}`,
                }}
              >
                <motion.div
                  className="w-1 h-1 rounded-full flex-shrink-0"
                  style={{ background: skill.active ? "#a78bfa" : "#374151" }}
                  animate={skill.active ? { opacity: [0.5, 1, 0.5] } : { opacity: 1 }}
                  transition={{ duration: 2.5, repeat: skill.active ? Infinity : 0 }}
                />
                <span
                  className="text-xs"
                  style={{ color: skill.active ? "rgba(167,139,250,0.80)" : "rgba(255,255,255,0.25)" }}
                >
                  {skill.name}
                </span>
                {skill.active && skill.triggerCount > 0 && (
                  <span className="text-2xs" style={{ color: "rgba(167,139,250,0.40)" }}>
                    ×{skill.triggerCount}
                  </span>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
