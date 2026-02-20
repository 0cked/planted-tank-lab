import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { BuildCommentsSection } from "./BuildCommentsSection";
import { BuildVersionHistoryPanel } from "./BuildVersionHistoryPanel";
import { ReportBuildDialog } from "./ReportBuildDialog";

import {
  BuyAllItemsModal,
  type BuyAllItem,
  type BuyAllItemOption,
} from "@/components/offers/BuyAllItemsModal";
import { createTRPCContext } from "@/server/trpc/context";
import { appRouter } from "@/server/trpc/router";

const BASE_URL = "https://plantedtanklab.com";

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

function compareBuyAllOption(a: BuyAllItemOption, b: BuyAllItemOption): number {
  const aInStock = a.inStock !== false;
  const bInStock = b.inStock !== false;
  if (aInStock !== bInStock) return aInStock ? -1 : 1;

  const aPrice = a.priceCents ?? Number.POSITIVE_INFINITY;
  const bPrice = b.priceCents ?? Number.POSITIVE_INFINITY;
  if (aPrice !== bPrice) return aPrice - bPrice;

  return a.label.localeCompare(b.label);
}

function defaultBuyAllOptionId(options: BuyAllItemOption[]): string | null {
  return (
    options.find((option) => option.inStock !== false && option.priceCents != null)?.id ??
    options.find((option) => option.inStock !== false)?.id ??
    options[0]?.id ??
    null
  );
}

function parseVersionNumber(value: string | string[] | undefined): number | null {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw) return null;

  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed < 1) return null;
  return parsed;
}

export default async function BuildSharePage(props: {
  params: Promise<{ shareSlug: string }>;
  searchParams: Promise<{ version?: string | string[] }>;
}) {
  const { shareSlug } = await props.params;
  const searchParams = await props.searchParams;
  const selectedVersionNumber = parseVersionNumber(searchParams.version);

  const caller = appRouter.createCaller(
    await createTRPCContext({ req: new Request("http://localhost") }),
  );

  const data = await caller.builds.getByShareSlug({ shareSlug }).catch(() => null);
  if (!data) notFound();

  const initialComments = await caller.builds
    .listComments({ shareSlug })
    .then((result) => result.comments)
    .catch(() => []);

  const serializedInitialComments = initialComments.map((comment) => ({
    ...comment,
    createdAt:
      comment.createdAt instanceof Date
        ? comment.createdAt.toISOString()
        : comment.createdAt,
    replies: comment.replies.map((reply) => ({
      ...reply,
      createdAt:
        reply.createdAt instanceof Date
          ? reply.createdAt.toISOString()
          : reply.createdAt,
    })),
  }));

  const versionHistory = await caller.visualBuilder
    .listVersions({ shareSlug })
    .catch(() => ({ versions: [], buildUpdatedAt: null }));

  const selectedVersionPreview =
    selectedVersionNumber != null
      ? await caller.visualBuilder
          .getByShareSlug({ shareSlug, versionNumber: selectedVersionNumber })
          .catch(() => null)
      : null;

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

  const uniqueGearProductIds = Array.from(new Set(gear.map((item) => item.product.id)));
  const groupedOffers = uniqueGearProductIds.length
    ? await caller.offers
        .listByProductIds({
          productIds: uniqueGearProductIds,
          perProductLimit: 12,
        })
        .catch(() => [])
    : [];

  const offersByProductId = new Map(
    groupedOffers.map((group) => [group.productId, group.offers] as const),
  );

  const buyAllItems: BuyAllItem[] = gear
    .map((item) => {
      const product = item.product;
      const options = (offersByProductId.get(product.id) ?? [])
        .map((offer) => ({
          id: offer.id,
          label: offer.retailer.name,
          url: offer.goUrl,
          priceCents: offer.priceCents,
          inStock: offer.inStock,
        }))
        .sort(compareBuyAllOption);

      return {
        id: item.id,
        title: product.name,
        subtitle: labelForCategory({
          slug: item.categorySlug,
          name: item.categoryName,
        }),
        quantity: item.quantity,
        options,
        defaultOptionId: defaultBuyAllOptionId(options),
      } satisfies BuyAllItem;
    })
    .filter((item) => item.options.length > 0);

  const buildUrl = `${BASE_URL}/builds/${shareSlug}`;
  const buildThumbnailUrl = versionedThumbnailUrl(
    data.build.coverImageUrl,
    data.build.updatedAt,
  );
  const updatedAt =
    data.build.updatedAt instanceof Date
      ? data.build.updatedAt
      : typeof data.build.updatedAt === "string"
        ? new Date(data.build.updatedAt)
        : null;
  const updatedAtIso = updatedAt && !Number.isNaN(updatedAt.getTime()) ? updatedAt.toISOString() : null;
  const buildStructuredData = {
    "@context": "https://schema.org",
    "@type": "CreativeWork",
    name: data.build.name,
    description:
      data.build.description ?? `A planted tank build snapshot with ${data.build.itemCount} items.`,
    url: buildUrl,
    ...(buildThumbnailUrl ? { image: [buildThumbnailUrl] } : {}),
    author: {
      "@type": "Organization",
      name: "PlantedTankLab Community",
      url: BASE_URL,
    },
    ...(updatedAtIso ? { dateModified: updatedAtIso } : {}),
  };

  return (
    <main className="mx-auto max-w-6xl px-6 py-14">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(buildStructuredData),
        }}
      />

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
          <div className="flex flex-wrap gap-2">
            <Link href={`/builder/${shareSlug}`} className="ptl-btn-primary">
              Open in builder
            </Link>
            <BuyAllItemsModal
              triggerLabel="Buy all items"
              title="Buy this build"
              description="Choose a retailer per item (defaulted to the lowest in-stock offer), then open all links at once."
              items={buyAllItems}
              triggerClassName="ptl-btn-secondary"
            />
            <ReportBuildDialog shareSlug={shareSlug} />
          </div>
          <div className="text-xs text-neutral-700">
            Open in builder to remix this layout, or use Buy all items to launch each affiliate
            link in one click.
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
                      g.product?.name ?? "—"
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
                <li
                  key={p.id}
                  className="rounded-2xl border bg-white/55 p-4"
                  style={{ borderColor: "var(--ptl-border)" }}
                >
                  <Link
                    href={`/plants/${p.plant.slug}`}
                    className="text-sm font-semibold text-neutral-900 hover:underline"
                  >
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

      <div className="mt-10">
        <BuildVersionHistoryPanel
          shareSlug={shareSlug}
          initialVersions={versionHistory.versions.map((version) => ({
            versionNumber: version.versionNumber,
            createdAt: version.createdAt.toISOString(),
          }))}
        />
      </div>

      {selectedVersionPreview ? (
        <section className="mt-6 ptl-surface p-7 sm:p-10">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">
              Read-only preview: version {selectedVersionPreview.version?.versionNumber}
            </h2>
            <div className="text-xs text-neutral-600">
              {selectedVersionPreview.version?.createdAt
                ? new Intl.DateTimeFormat(undefined, {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  }).format(new Date(selectedVersionPreview.version.createdAt))
                : "Saved snapshot"}
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border bg-white/60 p-3" style={{ borderColor: "var(--ptl-border)" }}>
              <div className="text-xs uppercase tracking-wide text-neutral-600">Width</div>
              <div className="mt-1 text-sm font-semibold text-neutral-900">
                {selectedVersionPreview.initialState.canvasState.widthIn.toFixed(1)} in
              </div>
            </div>
            <div className="rounded-xl border bg-white/60 p-3" style={{ borderColor: "var(--ptl-border)" }}>
              <div className="text-xs uppercase tracking-wide text-neutral-600">Depth</div>
              <div className="mt-1 text-sm font-semibold text-neutral-900">
                {selectedVersionPreview.initialState.canvasState.depthIn.toFixed(1)} in
              </div>
            </div>
            <div className="rounded-xl border bg-white/60 p-3" style={{ borderColor: "var(--ptl-border)" }}>
              <div className="text-xs uppercase tracking-wide text-neutral-600">Height</div>
              <div className="mt-1 text-sm font-semibold text-neutral-900">
                {selectedVersionPreview.initialState.canvasState.heightIn.toFixed(1)} in
              </div>
            </div>
            <div className="rounded-xl border bg-white/60 p-3" style={{ borderColor: "var(--ptl-border)" }}>
              <div className="text-xs uppercase tracking-wide text-neutral-600">Placed items</div>
              <div className="mt-1 text-sm font-semibold text-neutral-900">
                {selectedVersionPreview.initialState.canvasState.items.length}
              </div>
            </div>
          </div>
        </section>
      ) : null}

      <div className="mt-10">
        <BuildCommentsSection
          shareSlug={shareSlug}
          initialComments={serializedInitialComments}
        />
      </div>
    </main>
  );
}
