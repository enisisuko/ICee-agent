import { z } from "zod";
import { NodeDefinitionSchema, EdgeDefinitionSchema, ParallelGroupSchema, BudgetConfigSchema } from "./node.js";

/**
 * Graph 定义 (可序列化、可版本化的完整图描述)
 */
export const GraphDefinitionSchema = z.object({
  /** 图唯一 ID */
  id: z.string(),
  /** 图名称 */
  name: z.string(),
  /** 图版本 (SemVer) */
  version: z.string().default("1.0.0"),
  /** 描述 */
  description: z.string().optional(),
  /** 节点列表 */
  nodes: z.array(NodeDefinitionSchema).min(1),
  /** 边列表 */
  edges: z.array(EdgeDefinitionSchema),
  /** 并行执行组 */
  parallelGroups: z.array(ParallelGroupSchema).optional(),
  /** 全局资源预算 */
  budget: BudgetConfigSchema.optional(),
  /** 创建时间 */
  createdAt: z.string().datetime(),
  /** 修改时间 */
  updatedAt: z.string().datetime(),
  /** 作者 */
  author: z.string().optional(),
  /** 标签 */
  tags: z.array(z.string()).optional(),
});
export type GraphDefinition = z.infer<typeof GraphDefinitionSchema>;
