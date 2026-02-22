import { getDatabase, RunRepository } from "@omega/db";

export async function forkCommand(
  runId: string,
  stepId: string,
  opts: { db: string; input?: string }
): Promise<void> {
  console.log(`[OMEGA] Forking run ${runId} from step ${stepId}`);

  const omegaDb = getDatabase(opts.db);
  const runRepo = new RunRepository(omegaDb.instance);

  const parentRun = runRepo.findById(runId);
  if (!parentRun) {
    console.error(`[OMEGA] Run not found: ${runId}`);
    process.exit(1);
  }

  console.log(`[OMEGA] Parent run: ${parentRun.graphId} v${parentRun.graphVersion}`);
  console.log(`[OMEGA] Input override: ${opts.input ?? "(none)"}`);
  console.log("\n[OMEGA] Fork ready.");
  console.log("[OMEGA] To execute, use the GraphRuntime.forkRun() API with a loaded GraphDefinition.");
  console.log(`[OMEGA] Example: runtime.forkRun("${runId}", "${stepId}", graph, inputOverride)`);

  omegaDb.close();
}



