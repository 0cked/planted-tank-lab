import { runIngestionWorker } from "@/server/ingestion/worker";

function usage(): void {
  console.log(`
PlantedTankLab ingestion runner

Usage:
  pnpm ingest run [--max-jobs N] [--dry-run]

Examples:
  pnpm ingest run
  pnpm ingest run --max-jobs 50
  pnpm ingest run --dry-run
`);
}

function getWorkerId(): string {
  const fromEnv = process.env.INGEST_WORKER_ID?.trim();
  if (fromEnv) return fromEnv;
  const host = process.env.HOSTNAME?.trim() || "local";
  return `${host}:${process.pid}`;
}

function parseArgs(argv: string[]): { cmd: string; maxJobs: number; dryRun: boolean } {
  const first = argv[0] ?? "run";
  const cmd = first === "-h" || first === "--help" ? "help" : first;

  let maxJobs = 25;
  let dryRun = false;

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
    if (a === "-h" || a === "--help") {
      return { cmd: "help", maxJobs, dryRun };
    }
  }

  return { cmd, maxJobs, dryRun };
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  if (args.cmd === "help" || args.cmd !== "run") {
    usage();
    if (args.cmd !== "help") process.exitCode = 1;
    return;
  }

  const workerId = getWorkerId();
  const res = await runIngestionWorker({
    workerId,
    maxJobs: args.maxJobs,
    dryRun: args.dryRun,
  });

  console.log(`Ingestion done. processed=${res.processed} ok=${res.succeeded} failed=${res.failed}`);
  if (res.failed > 0) process.exitCode = 2;
}

void main();
