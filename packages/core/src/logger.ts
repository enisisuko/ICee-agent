/**
 * Omega 统一日志实例
 *
 * 零外部依赖实现，彻底避免 pino-pretty 在打包后动态 import 失败的崩溃问题。
 * 生产环境（Electron 打包后）完全静默；开发环境输出到 console。
 */

// 日志级别定义
type Level = "trace" | "debug" | "info" | "warn" | "error" | "silent";

// 级别排序（数值越大越严重）
const LEVEL_ORDER: Level[] = ["trace", "debug", "info", "warn", "error", "silent"];

// 检测是否在 Electron 打包环境下运行
// 打包后 process.resourcesPath 为实际路径字符串，开发环境下为 undefined
const isElectronPackaged =
  typeof process !== "undefined" &&
  typeof (process as NodeJS.Process & { resourcesPath?: string }).resourcesPath === "string";

// 当前有效日志级别
const currentLevel: Level = isElectronPackaged
  ? "silent"
  : ((process.env["LOG_LEVEL"] as Level | undefined) ?? "info");

/** 判断给定级别是否应该输出 */
function shouldLog(level: Level): boolean {
  return LEVEL_ORDER.indexOf(level) >= LEVEL_ORDER.indexOf(currentLevel);
}

/** Logger 接口，兼容原有 pino 调用方式（支持对象或字符串作为第一个参数） */
export interface ILogger {
  trace(msgOrObj: unknown, ...args: unknown[]): void;
  debug(msgOrObj: unknown, ...args: unknown[]): void;
  info(msgOrObj: unknown, ...args: unknown[]): void;
  warn(msgOrObj: unknown, ...args: unknown[]): void;
  error(msgOrObj: unknown, ...args: unknown[]): void;
  child(bindings: Record<string, unknown>): ILogger;
}

/** 创建带绑定上下文的 logger 实例 */
function makeLogger(bindings: Record<string, unknown>): ILogger {
  // 将绑定字段格式化为前缀字符串，便于 console 输出识别
  const prefix = Object.entries(bindings)
    .map(([k, v]) => `[${k}=${v}]`)
    .join(" ");

  return {
    trace(msgOrObj: unknown, ...args: unknown[]) {
      if (shouldLog("trace")) console.debug(`[TRACE] ${prefix}`, msgOrObj, ...args);
    },
    debug(msgOrObj: unknown, ...args: unknown[]) {
      if (shouldLog("debug")) console.debug(`[DEBUG] ${prefix}`, msgOrObj, ...args);
    },
    info(msgOrObj: unknown, ...args: unknown[]) {
      if (shouldLog("info")) console.info(`[INFO] ${prefix}`, msgOrObj, ...args);
    },
    warn(msgOrObj: unknown, ...args: unknown[]) {
      if (shouldLog("warn")) console.warn(`[WARN] ${prefix}`, msgOrObj, ...args);
    },
    error(msgOrObj: unknown, ...args: unknown[]) {
      if (shouldLog("error")) console.error(`[ERROR] ${prefix}`, msgOrObj, ...args);
    },
    child(childBindings: Record<string, unknown>): ILogger {
      // 合并父级绑定与子级绑定
      return makeLogger({ ...bindings, ...childBindings });
    },
  };
}

/** 全局根 logger */
export const logger: ILogger = makeLogger({ name: "Omega-core" });

/** 为特定模块创建子 logger */
export function createLogger(module: string): ILogger {
  return logger.child({ module });
}
