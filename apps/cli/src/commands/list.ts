import { getDatabase, RunRepository } from "@icee/db";

export async function listCommand(opts: { db: string; limit: number }): Promise<void> {
  const iceeDb = getDatabase(opts.db);
  const runRepo = new RunRepository(iceeDb.instance);

  const runs = runRepo.findAll(opts.limit, 0);

  if (runs.length === 0) {
    console.log("[ICEE] No runs found.");
    iceeDb.close();
    return;
  }

  console.log(`[ICEE] Recent runs (${runs.length}):\n`);
  console.log("RUN ID".padEnd(22) + "GRAPH".padEnd(20) + "STATE".padEnd(12) + "TOKENS".padEnd(10) + "STARTED");
  console.log("─".repeat(80));

  for (const run of runs) {
    console.log(
      run.runId.padEnd(22) +
      run.graphId.slice(0, 18).padEnd(20) +
      run.state.padEnd(12) +
      String(run.totalTokens).padEnd(10) +
      run.startedAt.slice(0, 19)
    );
  }

  iceeDb.close();
}
