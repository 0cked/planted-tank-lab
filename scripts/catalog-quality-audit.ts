import { runCatalogQualityAudit } from "@/server/catalog/quality-audit";

async function main(): Promise<void> {
  const report = await runCatalogQualityAudit();

  console.log(JSON.stringify(report, null, 2));

  if (report.hasViolations) {
    process.exitCode = 2;
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
