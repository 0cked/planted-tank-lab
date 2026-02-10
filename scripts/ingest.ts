import { runIngestionWorker } from "@/server/ingestion/worker";
import { enqueueScheduledIngestionJobs } from "@/server/ingestion/scheduler";
import { db } from "@/server/db";

function usage(): void {
  console.log(`
PlantedTankLab ingestion runner

Usage:
  pnpm ingest run [--max-jobs N] [--dry-run]
  pnpm ingest daemon [--max-jobs N] [--poll-ms MS]
  pnpm ingest schedule [--loop] [--interval-ms MS]

Examples:
  pnpm ingest run
  pnpm ingest run --max-jobs 50
  pnpm ingest run --dry-run
  pnpm ingest daemon --poll-ms 5000
  pnpm ingest schedule --loop --interval-ms 60000
`);
}

function getWorkerId(): string {
  const fromEnv = process.env.INGEST_WORKER_ID?.trim();
  if (fromEnv) return fromEnv;
  const host = process.env.HOSTNAME?.trim() || "local";
  return `${host}:${process.pid}`;
}

function parseArgs(argv: string[]): {
  cmd: string;
  maxJobs: number;
  dryRun: boolean;
  pollMs: number;
  loop: boolean;
  intervalMs: number;
} {
  const first = argv[0] ?? "run";
  const cmd = first === "-h" || first === "--help" ? "help" : first;

  let maxJobs = 25;
  let dryRun = false;
  let pollMs = 5000;
  let loop = false;
  let intervalMs = 60_000;

  for (let i = 1; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === "--dry-run") {
      dryRun = true;
      continue;
    }
    if (a === "--max-jobs") {
      const n = Number(argv[i + 1] ?? "");
      if (Number.isFinite(n) && n > 0) maxJobs = Math.floor(n);
      i += 1;
      continue;
    }
    if (a === "--poll-ms") {
      const n = Number(argv[i + 1] ?? "");
      if (Number.isFinite(n) && n > 250) pollMs = Math.floor(n);
      i += 1;
      continue;
    }
    if (a === "--loop") {
      loop = true;
      continue;
    }
    if (a === "--interval-ms") {
      const n = Number(argv[i + 1] ?? "");
      if (Number.isFinite(n) && n > 1000) intervalMs = Math.floor(n);
      i += 1;
      continue;
    }
    if (a === "-h" || a === "--help") {
      return { cmd: "help", maxJobs, dryRun, pollMs, loop, intervalMs };
    }
  }

  return { cmd, maxJobs, dryRun, pollMs, loop, intervalMs };
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  if (
    args.cmd === "help" ||
    (args.cmd !== "run" && args.cmd !== "daemon" && args.cmd !== "schedule")
  ) {
    usage();
    if (args.cmd !== "help") process.exitCode = 1;
    return;
  }

  const workerId = getWorkerId();
  const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

  let stop = false;
  process.on("SIGTERM", () => {
    stop = true;
  });
  process.on("SIGINT", () => {
    stop = true;
  });

  if (args.cmd === "schedule") {
    do {
      const res = await enqueueScheduledIngestionJobs({ db });
      console.log(
        `Scheduled ingestion: scanned=${res.scanned} enqueued=${res.enqueued} deduped=${res.deduped} skipped=${res.skipped} errors=${res.errors}`,
      );
      if (!args.loop) break;
      await sleep(args.intervalMs);
    } while (!stop);
    return;
  }

  const runOnce = async (): Promise<{
    processed: number;
    succeeded: number;
    failed: number;
  }> => {
    const res = await runIngestionWorker({
      workerId,
      maxJobs: args.maxJobs,
      dryRun: args.dryRun,
    });
    console.log(
      `Ingestion run: processed=${res.processed} ok=${res.succeeded} failed=${res.failed}`,
    );
    return res;
  };

  if (args.cmd === "run") {
    const res = await runOnce();
    if (res.failed > 0) process.exitCode = 2;
    return;
  }

  // daemon
  while (!stop) {
    const res = await runOnce();
    if (res.failed > 0) process.exitCode = 2;
    if (res.processed === 0) {
      await sleep(args.pollMs);
    }
  }
}

void main();
