import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import electron from "vite-plugin-electron";
import path from "path";

/**
 * Vite 配置 — ICEE Desktop
 *
 * 在开发模式下：
 *   - vite-plugin-electron 会同时编译 renderer（React）和 main/preload（Electron）
 *   - main process 和 preload 输出到 dist-electron/ 目录，使用 CJS
 *   - renderer 通过 Vite dev server (localhost:5173) 提供
 *
 * 生产模式：
 *   - vite build 会分别打包 renderer 和 Electron 进程
 */
export default defineConfig(({ command }) => {
  const isDev = command === "serve";

  return {
    plugins: [
      react(),
      // vite-plugin-electron: 同时处理 main + preload 的编译
      electron([
        {
          // Main process
          entry: "src/main/index.ts",
          vite: {
            build: {
              outDir: "dist/main",
              rollupOptions: {
                external: [
                  "electron",
                  // 本地 workspace packages 作为外部依赖（CommonJS 运行时加载）
                  "@icee/core",
                  "@icee/db",
                  "@icee/providers",
                  "@icee/shared",
                ],
              },
            },
          },
        },
        {
          // Preload script
          entry: "src/preload/index.ts",
          vite: {
            build: {
              outDir: "dist/preload",
              rollupOptions: {
                external: ["electron"],
              },
            },
          },
        },
      ]),
    ],
    base: "./",
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src/renderer"),
      },
    },
    build: {
      outDir: "dist/renderer",
      emptyOutDir: true,
    },
    server: {
      port: 5173,
      // 开发模式下不强制独占端口，允许已有 Vite 进程运行
      strictPort: isDev ? false : true,
    },
  };
});
