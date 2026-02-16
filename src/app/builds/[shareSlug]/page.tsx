import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ReportBuildDialog } from "./ReportBuildDialog";

import { createTRPCContext } from "@/server/trpc/context";
import { appRouter } from "@/server/trpc/router";

function versionedThumbnailUrl(
  coverImageUrl: string | null | undefined,
  updatedAt: Date | string | null | undefined,
): string | undefined {
  if (!coverImageUrl) return undefined;

  const timestamp =
    updatedAt instanceof Date
      ? updatedAt.getTime()
      : typeof updatedAt === "string"
        ? Date.parse(updatedAt)
        : Number.NaN;

  if (!Number.isFinite(timestamp)) return coverImageUrl;

  const separator = coverImageUrl.includes("?") ? "&" : "?";
  return `${coverImageUrl}${separator}v=${timestamp}`;
}

export async function generateMetadata(props: {
  params: Promise<{ shareSlug: string }>;
}): Promise<Metadata> {
  const { shareSlug } = await props.params;
  const caller = appRouter.createCaller(
    await createTRPCContext({ req: new Request("http://localhost") }),
  );
  const data = await caller.builds.getByShareSlug({ shareSlug }).catch(() => null);
  if (!data) return { title: "Build" };

  const thumbnailUrl = versionedThumbnailUrl(
    data.build.coverImageUrl,
    data.build.updatedAt,
  );

  return {
    title: data.build.name,
    description:
      data.build.description ??
      `A planted tank build snapshot with ${data.build.itemCount} items.`,
    openGraph: {
      url: `/builds/${shareSlug}`,
      images: thumbnailUrl ? [{ url: thumbnailUrl, alt: `${data.build.name} thumbnail` }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      images: thumbnailUrl ? [thumbnailUrl] : undefined,
    },
  };
}

function formatMoney(cents: number | null | undefined): string {
  if (cents == null || cents <= 0) return "—";
  return (cents / 100).toLocaleString(undefined, { style: "currency", currency: "USD" });
}

function titleCaseSlug(slug: string): string {
  return slug
    .split(/[-_]/g)
    .filter(Boolean)
    .map((part) => part.slice(0, 1).toUpperCase() + part.slice(1))
    .join(" ");
}

function labelForCategory(params: { slug: string; name?: string | null }): string {
  if (params.slug === "co2") return "CO2";
  const name = params.name?.trim();
  if (name) return name;
  return titleCaseSlug(params.slug);
}

function tierMeta(style: string | null | undefined): {
  label: string;
  className: string;
} | null {
  if (!style) return null;
  const normalized = style.trim().toLowerCase();
  if (normalized === "budget") {
    return {
      label: "Budget",
      className: "border-emerald-200 bg-emerald-50 text-emerald-900",
    };
  }
  if (normalized === "mid") {
    return {
      label: "Mid",
      className: "border-blue-200 bg-blue-50 text-blue-900",
    };
  }
  if (normalized === "premium") {
    return {
      label: "Premium",
      className: "border-amber-200 bg-amber-50 text-amber-900",
    };
  }
  return null;
}

export default async function BuildSharePage(props: {
  params: Promise<{ shareSlug: string }>;
}) {
  const { shareSlug } = await props.params;

  const caller = appRouter.createCaller(
    await createTRPCContext({ req: new Request("http://localhost") }),
  );

  const data = await caller.builds.getByShareSlug({ shareSlug }).catch(() => null);
  if (!data) notFound();

  const gear = data.items.filter(
    (
      item,
    ): item is (typeof data.items)[number] & {
      type: "product";
      product: { id: string; name: string; slug: string };
    } => item.type === "product" && item.product != null,
  );
  const plantItems = data.items.filter(
    (
      item,
    ): item is (typeof data.items)[number] & {
      type: "plant";
      plant: { id: string; commonName: string; slug: string };
    } => item.type === "plant" && item.plant != null,
  );
  const tier = tierMeta(data.build.style);

  return (
    <main className="mx-auto max-w-6xl px-6 py-14">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="ptl-kicker">Build snapshot</div>
          <h1
            className="mt-2 ptl-page-title"
          >
            {data.build.name}
          </h1>
          {data.build.description ? (
            <p className="mt-3 max-w-[70ch] ptl-lede text-neutral-700">
              {data.build.description}
            </p>
          ) : null}
          <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-neutral-700">
            {tier ? (
              <div className={`rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-wide ${tier.className}`}>
                {tier.label}
              </div>
            ) : null}
            <div className="rounded-full border bg-white/60 px-3 py-1.5" style={{ borderColor: "var(--ptl-border)" }}>
              {data.build.itemCount} item(s)
            </div>
            <div className="rounded-full border bg-white/60 px-3 py-1.5" style={{ borderColor: "var(--ptl-border)" }}>
              {formatMoney(data.build.totalPriceCents)}
            </div>
            {data.build.isPublic ? (
              <div className="rounded-full border bg-emerald-50 px-3 py-1.5 text-emerald-900" style={{ borderColor: "rgba(16,185,129,.25)" }}>
                Public
              </div>
            ) : (
              <div className="rounded-full border bg-white/60 px-3 py-1.5" style={{ borderColor: "var(--ptl-border)" }}>
                Unlisted
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col items-start gap-2 sm:items-end">
          <div className="flex gap-2">
            <Link href={`/builder/${shareSlug}`} className="ptl-btn-primary">
              Open in builder
            </Link>
            <ReportBuildDialog shareSlug={shareSlug} />
          </div>
          <div className="text-xs text-neutral-700">
            This opens the snapshot in the builder. Click Remix there to start an independent
            draft.
          </div>
        </div>
      </div>

      <div className="mt-10 grid grid-cols-1 gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="ptl-surface p-7 sm:p-10">
          <h2 className="text-lg font-semibold">Gear</h2>
          {gear.length === 0 ? (
            <div className="mt-4 text-sm text-neutral-700">
              No gear selected yet. Open this build in the builder to start picking gear.
            </div>
          ) : (
            <ul className="mt-4 space-y-3">
              {gear.map((g) => (
                <li
                  key={g.id}
                  className="rounded-2xl border bg-white/55 p-4"
                  style={{ borderColor: "var(--ptl-border)" }}
                >
                  <div className="text-xs font-semibold uppercase tracking-wide text-neutral-600">
                    {labelForCategory({
                      slug: g.categorySlug,
                      name: g.categoryName,
                    })}
                  </div>
                  <div className="mt-1 text-sm font-semibold text-neutral-900">
                    {g.product?.slug ? (
                      <Link
                        href={`/products/${g.categorySlug}/${g.product.slug}`}
                        className="hover:underline"
                      >
                        {g.product.name}
                      </Link>
                    ) : (
                      (g.product?.name ?? "—")
                    )}
                  </div>
                  <div className="mt-1 text-xs text-neutral-700">
                    Qty: {g.quantity}
                    {g.notes ? ` · ${g.notes}` : ""}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="ptl-surface p-7 sm:p-10">
          <h2 className="text-lg font-semibold">Plants</h2>
          {plantItems.length === 0 ? (
            <div className="mt-4 text-sm text-neutral-700">No plants selected.</div>
          ) : (
            <ul className="mt-4 space-y-3">
              {plantItems.map((p) => (
                <li key={p.id} className="rounded-2xl border bg-white/55 p-4" style={{ borderColor: "var(--ptl-border)" }}>
                  <Link href={`/plants/${p.plant.slug}`} className="text-sm font-semibold text-neutral-900 hover:underline">
                    {p.plant.commonName}
                  </Link>
                  <div className="mt-1 text-xs text-neutral-700">
                    Qty: {p.quantity}
                    {p.notes ? ` · ${p.notes}` : ""}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
