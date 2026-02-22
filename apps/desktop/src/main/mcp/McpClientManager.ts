import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { app } from "electron";
import path from "path";

/**
 * MCP 工具信息（用于 IPC 返回给 renderer）
 */
export interface McpToolInfo {
  name: string;
  description: string;
  /** 工具的 JSON Schema 输入格式 */
  inputSchema: unknown;
}

/**
 * McpClientManager — MCP 客户端管理器
 *
 * 负责：
 *   1. 以子进程方式启动 @modelcontextprotocol/server-filesystem
 *   2. 通过 StdioClientTransport 建立 MCP 协议连接
 *   3. 列出可用工具（listTools）
 *   4. 执行工具调用（callTool）
 *   5. 管理连接生命周期（随 Electron app 关闭而断开）
 *
 * 使用说明：
 *   const mgr = new McpClientManager();
 *   await mgr.connect(["C:\\Users\\MyDir"]);   // 允许访问的目录列表
 *   const tools = await mgr.listTools();
 *   const result = await mgr.callTool("read_file", { path: "C:\\Users\\MyDir\\test.txt" });
 *   await mgr.disconnect();
 */
export class McpClientManager {
  private client: Client | null = null;
  private transport: StdioClientTransport | null = null;
  private _connected = false;
  private _allowedDirs: string[] = [];
  private _tools: McpToolInfo[] = [];

  get connected(): boolean {
    return this._connected;
  }

  get allowedDirs(): string[] {
    return this._allowedDirs;
  }

  get cachedTools(): McpToolInfo[] {
    return this._tools;
  }

  /**
   * 连接到 @modelcontextprotocol/server-filesystem
   * @param allowedDirs 允许读写的目录列表（绝对路径）
   */
  async connect(allowedDirs: string[]): Promise<void> {
    // 断开旧连接
    if (this._connected) {
      await this.disconnect();
    }

    this._allowedDirs = allowedDirs;
    console.log("[McpClientManager] Connecting to filesystem server...", allowedDirs);

    // 找到 server-filesystem 可执行入口
    // 在 Electron 打包后，node_modules 在 resources/app.asar.unpacked 下
    // 开发模式下在 node_modules 下
    const serverPath = this.resolveServerPath();
    console.log("[McpClientManager] Server path:", serverPath);

    // 创建 StdioClientTransport（以子进程方式启动 MCP server）
    this.transport = new StdioClientTransport({
      command: process.execPath, // 使用 Electron 内置的 Node.js 执行器
      args: [serverPath, ...allowedDirs],
      env: {
        ...process.env,
        // 确保 node:sqlite 实验性标志透传（如果需要）
      },
    });

    this.client = new Client(
      {
        name: "Omega-agent",
        version: "0.1.6",
      },
      {
        capabilities: {
          tools: {},   // 声明支持工具能力
          resources: {},
        },
      }
    );

    try {
      await this.client.connect(this.transport);
      this._connected = true;
      console.log("[McpClientManager] ✅ Connected to filesystem MCP server");

      // 连接后立即获取工具列表并缓存
      await this.refreshTools();
    } catch (err) {
      this._connected = false;
      console.error("[McpClientManager] ❌ Connection failed:", err);
      throw err;
    }
  }

  /**
   * 刷新工具列表缓存
   */
  async refreshTools(): Promise<McpToolInfo[]> {
    if (!this.client || !this._connected) {
      console.warn("[McpClientManager] refreshTools: not connected");
      return [];
    }

    try {
      const response = await this.client.listTools();
      this._tools = response.tools.map(t => ({
        name: t.name,
        description: t.description ?? "",
        inputSchema: t.inputSchema,
      }));
      console.log(`[McpClientManager] Tools loaded: ${this._tools.map(t => t.name).join(", ")}`);
      return this._tools;
    } catch (err) {
      console.error("[McpClientManager] refreshTools failed:", err);
      return [];
    }
  }

  /**
   * 调用 MCP 工具
   * @param name 工具名称（如 "read_file"）
   * @param args 工具参数（JSON 对象）
   */
  async callTool(name: string, args: Record<string, unknown>): Promise<unknown> {
    if (!this.client || !this._connected) {
      throw new Error(`[McpClientManager] Cannot call tool "${name}": not connected`);
    }

    console.log(`[McpClientManager] Calling tool: ${name}`, JSON.stringify(args).slice(0, 120));

    const response = await this.client.callTool({
      name,
      arguments: args,
    });

    console.log(`[McpClientManager] Tool "${name}" response:`, JSON.stringify(response).slice(0, 200));
    return response.content;
  }

  /**
   * 断开连接并清理子进程
   */
  async disconnect(): Promise<void> {
    if (this.client) {
      try {
        await this.client.close();
      } catch {
        // 忽略关闭时的错误（子进程可能已经退出）
      }
      this.client = null;
    }
    this.transport = null;
    this._connected = false;
    this._tools = [];
    console.log("[McpClientManager] Disconnected");
  }

  /**
   * 解析 @modelcontextprotocol/server-filesystem 的入口脚本路径
   *
   * 开发模式：在 node_modules 下找 dist/index.js
   * 打包后：在 resources/app.asar.unpacked/node_modules 下
   */
  private resolveServerPath(): string {
    // 尝试多个可能路径（兼容开发模式和打包模式）
    const candidates = [
      // 开发模式（monorepo 根的 node_modules）
      path.join(app.getAppPath(), "..", "..", "node_modules", "@modelcontextprotocol", "server-filesystem", "dist", "index.js"),
      // 开发模式（desktop 的 node_modules）
      path.join(app.getAppPath(), "node_modules", "@modelcontextprotocol", "server-filesystem", "dist", "index.js"),
      // 打包后（unpacked asar）
      path.join(process.resourcesPath ?? "", "app.asar.unpacked", "node_modules", "@modelcontextprotocol", "server-filesystem", "dist", "index.js"),
    ];

    // 返回第一个存在的路径（同步检查）
    for (const p of candidates) {
      try {
        // 使用 fs.existsSync 做简单检查
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const fs = require("fs") as typeof import("fs");
        if (fs.existsSync(p)) {
          return p;
        }
      } catch {
        // 继续尝试
      }
    }

    // 如果都找不到，返回第一个候选（让错误在 connect 时抛出）
    console.warn("[McpClientManager] Could not locate server-filesystem binary, using best guess:", candidates[0]);
    return candidates[0]!;
  }
}
