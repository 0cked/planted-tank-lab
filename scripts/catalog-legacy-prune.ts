import { pruneLegacyCatalogRows } from "@/server/catalog/legacy-prune";
import { runCatalogProvenanceAudit } from "@/server/catalog/provenance";

async function main(): Promise<void> {
  const before = await runCatalogProvenanceAudit();
  const cleanup = await pruneLegacyCatalogRows();
  const after = await runCatalogProvenanceAudit();

  console.log(
    JSON.stringify(
      {
        before,
        cleanup,
        after,
      },
      null,
      2,
    ),
  );

  if (after.hasDisplayedViolations) {
    process.exitCode = 2;
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
