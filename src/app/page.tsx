import Link from "next/link";

export default function HomePage() {
  return (
    <main className="mx-auto max-w-5xl px-6 py-16">
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1.2fr_0.8fr] lg:items-start">
        <div>
          <h1 className="text-balance text-4xl font-semibold tracking-tight sm:text-5xl">
            Build a planted tank setup that actually makes sense.
          </h1>
          <p className="mt-4 max-w-2xl text-pretty text-lg text-neutral-600">
            PlantedTankLab is PCPartPicker for planted aquariums: pick your tank,
            light, filter, CO2, substrate, and plants, and get instant compatibility
            checks and best-effort pricing.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              href="/builder"
              className="inline-flex items-center rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
            >
              Start Building -&gt;
            </Link>
            <Link
              href="/products"
              className="inline-flex items-center rounded-md border border-neutral-200 bg-white px-4 py-2 text-sm font-medium text-neutral-900 hover:bg-neutral-50"
            >
              Browse Products
            </Link>
            <Link
              href="/plants"
              className="inline-flex items-center rounded-md border border-neutral-200 bg-white px-4 py-2 text-sm font-medium text-neutral-900 hover:bg-neutral-50"
            >
              Explore Plants
            </Link>
          </div>

          <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-neutral-200 bg-white p-5">
              <div className="text-sm font-semibold">Compatibility</div>
              <div className="mt-2 text-sm text-neutral-600">
                Catch common mistakes: underpowered lights, missing CO2 for carpets,
                heater sizing, and more.
              </div>
            </div>
            <div className="rounded-xl border border-neutral-200 bg-white p-5">
              <div className="text-sm font-semibold">Parametric Specs</div>
              <div className="mt-2 text-sm text-neutral-600">
                Compare equipment by the numbers: PAR, flow, tank length fit, and
                volume.
              </div>
            </div>
            <div className="rounded-xl border border-neutral-200 bg-white p-5">
              <div className="text-sm font-semibold">Best-effort Pricing</div>
              <div className="mt-2 text-sm text-neutral-600">
                See lowest in-stock prices when offers exist. More retailers coming
                soon.
              </div>
            </div>
          </div>
        </div>

        <aside className="rounded-2xl border border-neutral-200 bg-neutral-50 p-6">
          <div className="text-sm font-semibold text-neutral-900">Try the MVP</div>
          <div className="mt-2 text-sm text-neutral-700">
            This is an early dataset. If you do not see your exact product, pick
            the closest match and use the warnings as guidance.
          </div>
          <div className="mt-6 space-y-2 text-sm text-neutral-700">
            <div>
              <span className="font-medium">Seeded:</span> 10 products, 10 plants, 10
              compatibility rules
            </div>
            <div>
              <span className="font-medium">Next:</span> expand offers and dataset
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}
