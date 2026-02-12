import { applyCatalogActivationPolicy } from "@/server/catalog/activation-policy";

async function main(): Promise<void> {
  const result = await applyCatalogActivationPolicy();
  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
