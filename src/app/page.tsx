import Link from "next/link";

export default function HomePage() {
  return (
    <main className="mx-auto max-w-4xl px-6 py-16">
      <h1 className="text-balance text-4xl font-semibold tracking-tight sm:text-5xl">
        PlantedTankLab
      </h1>
      <p className="mt-4 text-pretty text-lg text-neutral-600">
        Build your perfect planted tank.
      </p>

      <div className="mt-10">
        <Link
          href="/builder"
          className="inline-flex items-center rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
        >
          Start Building -&gt;
        </Link>
      </div>
    </main>
  );
}
