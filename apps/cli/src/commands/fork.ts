import { getDatabase, RunRepository } from "@icee/db";

export async function forkCommand(
  runId: string,
  stepId: string,
  opts: { db: string; input?: string }
): Promise<void> {
  console.log(`[ICEE] Forking run ${runId} from step ${stepId}`);

  const iceeDb = getDatabase(opts.db);
  const runRepo = new RunRepository(iceeDb.instance);

  const parentRun = runRepo.findById(runId);
  if (!parentRun) {
    console.error(`[ICEE] Run not found: ${runId}`);
    process.exit(1);
  }

  console.log(`[ICEE] Parent run: ${parentRun.graphId} v${parentRun.graphVersion}`);
  console.log(`[ICEE] Input override: ${opts.input ?? "(none)"}`);
  console.log("\n[ICEE] Fork ready.");
  console.log("[ICEE] To execute, use the GraphRuntime.forkRun() API with a loaded GraphDefinition.");
  console.log(`[ICEE] Example: runtime.forkRun("${runId}", "${stepId}", graph, inputOverride)`);

  iceeDb.close();
}
