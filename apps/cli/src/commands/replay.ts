import { getDatabase, RunRepository, StepRepository, EventRepository } from "@omega/db";

export async function replayCommand(
  runId: string,
  opts: { db: string; dryRun?: boolean }
): Promise<void> {
  console.log(`[OMEGA] Replaying run: ${runId}`);

  const omegaDb = getDatabase(opts.db);
  const runRepo = new RunRepository(omegaDb.instance);
  const stepRepo = new StepRepository(omegaDb.instance);
  const eventRepo = new EventRepository(omegaDb.instance);

  // 获取 Run 信息
  const run = runRepo.findById(runId);
  if (!run) {
    console.error(`[OMEGA] Run not found: ${runId}`);
    process.exit(1);
  }

  console.log(`[OMEGA] Graph: ${run.graphId} v${run.graphVersion}`);
  console.log(`[OMEGA] State: ${run.state}`);
  console.log(`[OMEGA] Started: ${run.startedAt}`);
  console.log(`[OMEGA] Tokens: ${run.totalTokens} | Cost: $${run.totalCostUsd.toFixed(6)}`);

  // 获取所有 Steps
  const steps = stepRepo.findByRunId(runId);
  console.log(`\n[OMEGA] Steps (${steps.length} total):`);

  for (const step of steps) {
    const events = eventRepo.findByStepId(step.stepId);
    const lastEvent = events[events.length - 1];

    const inherited = step.inherited ? " [inherited]" : "";
    const duration = step.durationMs ? ` ${step.durationMs}ms` : "";
    const tokens = lastEvent?.tokens ? ` ${lastEvent.tokens}t` : "";

    console.log(
      `  [${step.sequence.toString().padStart(2, "0")}] ${step.nodeLabel}` +
      ` (${step.nodeType})${inherited} → ${step.state}${duration}${tokens}`
    );

    if (opts.dryRun && lastEvent?.renderedPrompt) {
      console.log(`       Prompt: ${lastEvent.renderedPrompt.slice(0, 80)}...`);
    }
  }

  if (opts.dryRun) {
    console.log("\n[OMEGA] Dry-run mode: replay plan printed, no execution.");
  } else {
    console.log("\n[OMEGA] Note: Full replay re-execution is available via the GraphRuntime API.");
    console.log("[OMEGA] Trace events recorded above represent the original execution.");
  }

  omegaDb.close();
}



