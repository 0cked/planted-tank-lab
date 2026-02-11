import { runCatalogProvenanceAudit } from "@/server/catalog/provenance";

async function main(): Promise<void> {
  const report = await runCatalogProvenanceAudit();

  console.log(JSON.stringify(report, null, 2));

  if (report.hasDisplayedViolations) {
    process.exitCode = 2;
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
