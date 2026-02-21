import { z } from "zod";
import { PluginType } from "../enums.js";

/**
 * 插件权限声明
 * 安装时必须由用户在 UI 中确认
 */
export const PluginPermissionSchema = z.enum([
  "fs.read",       // 读取文件系统
  "fs.write",      // 写入文件系统
  "net.access",    // 网络访问
  "process.spawn", // 启动子进程
  "memory.access", // 访问持久记忆
]);
export type PluginPermission = z.infer<typeof PluginPermissionSchema>;

/**
 * 插件 Manifest (Plugin.json 规范)
 * 每个插件必须提供此文件
 */
export const PluginManifestSchema = z.object({
  /** 插件唯一名称 (npm-package 命名规范) */
  name: z.string().regex(/^[a-z0-9-]+$/),
  /** 插件版本 (SemVer) */
  version: z.string(),
  /** 插件类型 */
  type: z.nativeEnum(PluginType),
  /** 人类可读的显示名称 */
  displayName: z.string(),
  /** 插件描述 */
  description: z.string(),
  /** 插件作者 */
  author: z.string().optional(),
  /** 入口文件路径 (相对于插件根目录) */
  entry: z.string(),
  /** Manifest Schema 版本 (用于兼容性检查) */
  schemaVersion: z.string().default("1.0"),
  /** 所需权限列表 (用户首次安装时确认) */
  permissions: z.array(PluginPermissionSchema).default([]),
  /** 依赖的其他插件 */
  dependencies: z.record(z.string()).optional(),
  /** 插件主页 URL */
  homepage: z.string().url().optional(),
  /** 插件仓库 URL */
  repository: z.string().url().optional(),
  /** 关键词 */
  keywords: z.array(z.string()).optional(),
  /** 最低兼容的 ICEE 版本 */
  minIceeVersion: z.string().optional(),
});
export type PluginManifest = z.infer<typeof PluginManifestSchema>;

/**
 * 数据库中存储的插件记录
 */
export const PluginRecordSchema = PluginManifestSchema.extend({
  /** 数据库主键 */
  id: z.string(),
  /** 安装时间 */
  installedAt: z.string().datetime(),
  /** 是否已激活 */
  enabled: z.boolean().default(true),
  /** 插件本地路径 */
  localPath: z.string(),
  /** 用户已确认的权限 (安装时记录) */
  grantedPermissions: z.array(PluginPermissionSchema).default([]),
});
export type PluginRecord = z.infer<typeof PluginRecordSchema>;
