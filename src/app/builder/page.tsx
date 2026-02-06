import { appRouter } from "@/server/trpc/router";
import { createTRPCContext } from "@/server/trpc/context";

function chooseLabel(categoryName: string): string {
  // Cheap grammar: avoid "a" for plurals like "Plants".
  if (categoryName.toLowerCase().endsWith("s")) return `Choose ${categoryName}`;
  return `Choose a ${categoryName}`;
}

export default async function BuilderPage() {
  const caller = appRouter.createCaller(
    await createTRPCContext({ req: new Request("http://localhost") }),
  );

  const categories = await caller.products.categoriesList();

  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      <h1 className="text-3xl font-semibold tracking-tight">Builder</h1>
      <p className="mt-2 text-sm text-neutral-600">
        Pick parts category-by-category. Compatibility checks and pricing come next.
      </p>

      <div className="mt-8 overflow-hidden rounded-lg border border-neutral-200">
        <ul className="divide-y divide-neutral-200">
          {categories.map((c) => (
            <li key={c.id} className="flex items-center justify-between px-4 py-3">
              <div className="font-medium">{c.name}</div>
              <div className="text-sm text-neutral-600">{chooseLabel(c.name)}</div>
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
