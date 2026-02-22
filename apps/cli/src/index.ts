#!/usr/bin/env node
/**
 * OMEGA CLI — omega run / replay / fork
 * 无 UI 模式运行 Agent Graph
 */
import { Command } from "commander";

const program = new Command();

program
  .name("omega")
  .description("OMEGA Agent Graph Runtime CLI")
  .version("0.1.0");

/** omega run <graph.json> */
program
  .command("run <graphFile>")
  .description("Execute a Graph definition file")
  .option("-i, --input <json>", "Input JSON string for the graph (e.g. '{\"query\":\"hello\"}')")
  .option("-f, --input-file <path>", "Path to a JSON file containing the input (alternative to --input)")
  .option("-d, --db <path>", "SQLite database path", "./omega.db")
  .option("--max-tokens <n>", "Maximum token budget", parseInt)
  .option("--max-cost <usd>", "Maximum cost budget in USD", parseFloat)
  .option("--ollama-url <url>", "Ollama base URL (default: http://localhost:11434)")
  .option("--mock", "Use mock LLM/Tool executors instead of real providers (for testing without Ollama)")
  .action(async (graphFile: string, opts: {
    input?: string;
    inputFile?: string;
    db: string;
    maxTokens?: number;
    maxCost?: number;
    ollamaUrl?: string;
    mock?: boolean;
  }) => {
    // --input-file 优先：读文件内容作为 input JSON
    if (opts.inputFile && !opts.input) {
      const { readFileSync } = await import("fs");
      const { resolve } = await import("path");
      opts.input = readFileSync(resolve(opts.inputFile), "utf-8").trim();
    }
    const { runCommand } = await import("./commands/run.js");
    await runCommand(graphFile, opts);
  });

/** omega replay <runId> */
program
  .command("replay <runId>")
  .description("Replay a completed run from its trace events")
  .option("-d, --db <path>", "SQLite database path", "./omega.db")
  .option("--dry-run", "Print replay plan without executing")
  .action(async (runId: string, opts: { db: string; dryRun?: boolean }) => {
    const { replayCommand } = await import("./commands/replay.js");
    await replayCommand(runId, opts);
  });

/** omega fork <runId> <stepId> */
program
  .command("fork <runId> <stepId>")
  .description("Fork a run from a specific step and re-execute from there")
  .option("-d, --db <path>", "SQLite database path", "./omega.db")
  .option("-i, --input <json>", "Override input JSON for the forked step")
  .action(async (runId: string, stepId: string, opts: { db: string; input?: string }) => {
    const { forkCommand } = await import("./commands/fork.js");
    await forkCommand(runId, stepId, opts);
  });

/** omega list */
program
  .command("list")
  .description("List recent runs")
  .option("-d, --db <path>", "SQLite database path", "./omega.db")
  .option("-n, --limit <n>", "Number of runs to show", parseInt, 20)
  .action(async (opts: { db: string; limit: number }) => {
    const { listCommand } = await import("./commands/list.js");
    await listCommand(opts);
  });

program.parseAsync(process.argv).catch(err => {
  console.error("[OMEGA]", err);
  process.exit(1);
});


