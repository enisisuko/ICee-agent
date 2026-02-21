import pino from "pino";

/**
 * ICEE 统一日志实例 (pino)
 * 所有模块的日志都通过此实例输出，保证格式统一
 */
// exactOptionalPropertyTypes: 条件构建 options，避免 transport: undefined
const pinoOptions = process.env["NODE_ENV"] !== "production"
  ? {
      name: "icee-core",
      level: process.env["LOG_LEVEL"] ?? "info",
      transport: { target: "pino-pretty", options: { colorize: true, translateTime: "HH:MM:ss" } },
    }
  : {
      name: "icee-core",
      level: process.env["LOG_LEVEL"] ?? "info",
    };

export const logger = pino(pinoOptions);

/** 为特定模块创建子 logger */
export function createLogger(module: string) {
  return logger.child({ module });
}
