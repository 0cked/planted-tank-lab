import { readFileSync } from "node:fs";
import { z } from "zod";

const GateStatusSchema = z.enum(["pass", "fail", "unknown"]);

const GatesFileSchema = z.object({
  version: z.number().int().positive(),
  lastUpdatedAt: z.string().min(1),
  gates: z.array(
    z.object({
      id: z.string().min(2),
      name: z.string().min(1),
      status: GateStatusSchema,
      lastVerifiedAt: z.string().nullable(),
      notes: z.string().optional().default(""),
      verification: z
        .object({
          commands: z.array(z.string()).default([]),
          manualChecklist: z.array(z.string()).default([]),
        })
        .default({ commands: [], manualChecklist: [] }),
    }),
  ),
});

type GateStatus = z.infer<typeof GateStatusSchema>;
type GatesFile = z.infer<typeof GatesFileSchema>;

function label(status: GateStatus): string {
  switch (status) {
    case "pass":
      return "PASS";
    case "fail":
      return "FAIL";
    case "unknown":
      return "UNKNOWN";
  }
}

function readGates(path: string): GatesFile {
  const raw = readFileSync(path, "utf8");
  const parsed = JSON.parse(raw) as unknown;
  return GatesFileSchema.parse(parsed);
}

function formatWhen(value: string | null): string {
  if (!value) return "-";
  return value;
}

function main(): void {
  const path = "config/gates.json";
  let gatesFile: GatesFile;
  try {
    gatesFile = readGates(path);
  } catch (err) {
    console.error(`Failed to read/parse ${path}.`);
    console.error(err);
    process.exit(2);
  }

  console.log(`Launch Gates (G0-G11) - ${path}`);
  console.log(`Last updated: ${gatesFile.lastUpdatedAt}`);
  console.log("");

  let hasFail = false;
  for (const g of gatesFile.gates) {
    const s = g.status;
    if (s === "fail") hasFail = true;
    console.log(`${g.id} [${label(s)}] ${g.name}`);
    console.log(`  Last verified: ${formatWhen(g.lastVerifiedAt)}`);
    if (g.notes && g.notes.trim()) {
      console.log(`  Notes: ${g.notes.trim()}`);
    }

    if (g.verification.commands.length > 0) {
      console.log("  Suggested commands:");
      for (const c of g.verification.commands) {
        console.log(`  - ${c}`);
      }
    }

    if (g.verification.manualChecklist.length > 0) {
      console.log("  Manual checklist:");
      for (const item of g.verification.manualChecklist) {
        console.log(`  - ${item}`);
      }
    }

    console.log("");
  }

  if (hasFail) process.exit(1);
}

main();
