import Link from "next/link";
import { notFound } from "next/navigation";

import { db } from "@/server/db";
import { retailers } from "@/server/db/schema";
import { eq } from "drizzle-orm";

export const metadata = {
  title: "Admin Retailer | PlantedTankLab",
  robots: { index: false, follow: false },
};

function isUuid(v: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    v,
  );
}

function safeJson(value: unknown, fallback: unknown): string {
  try {
    return JSON.stringify(value ?? fallback, null, 2);
  } catch {
    return JSON.stringify(fallback, null, 2);
  }
}

export default async function AdminRetailerEditPage(props: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const { id } = await props.params;
  const sp = await props.searchParams;
  if (!isUuid(id)) notFound();

  const rows = await db
    .select({
      id: retailers.id,
      name: retailers.name,
      slug: retailers.slug,
      websiteUrl: retailers.websiteUrl,
      logoUrl: retailers.logoUrl,
      logoAssetPath: retailers.logoAssetPath,
      priority: retailers.priority,
      affiliateNetwork: retailers.affiliateNetwork,
      affiliateTag: retailers.affiliateTag,
      affiliateTagParam: retailers.affiliateTagParam,
      affiliateDeeplinkTemplate: retailers.affiliateDeeplinkTemplate,
      allowedHosts: retailers.allowedHosts,
      meta: retailers.meta,
      active: retailers.active,
      updatedAt: retailers.updatedAt,
    })
    .from(retailers)
    .where(eq(retailers.id, id))
    .limit(1);

  const r = rows[0];
  if (!r) notFound();

  const error = (sp.error ?? "").trim();
  const saved = sp.saved === "1";

  return (
    <main className="mx-auto max-w-6xl px-6 py-14">
      <div className="ptl-surface-strong p-7 sm:p-10">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-neutral-600">
              Admin · Retailer
            </div>
            <h1
              className="mt-2 text-3xl font-semibold tracking-tight"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {r.name}
            </h1>
            <div className="mt-2 text-sm text-neutral-700">{r.slug}</div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link href="/admin/offers/retailers" className="ptl-btn-secondary">
              Back to retailers
            </Link>
            <Link href="/admin/offers" className="ptl-btn-secondary">
              Back to offers
            </Link>
          </div>
        </div>

        {saved ? (
          <div
            className="mt-6 rounded-xl border bg-emerald-50 px-4 py-3 text-sm text-emerald-900"
            style={{ borderColor: "rgba(16,185,129,.25)" }}
          >
            Saved.
          </div>
        ) : null}
        {error ? (
          <div className="mt-6 rounded-xl border bg-red-50 px-4 py-3 text-sm text-red-900">
            {error}
          </div>
        ) : null}

        <form className="mt-8 grid grid-cols-1 gap-5" method="post" action={`/admin/offers/retailers/${r.id}/save`}>
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <label className="block">
              <div className="text-sm font-semibold text-neutral-900">Name</div>
              <input
                name="name"
                defaultValue={r.name}
                className="mt-2 w-full rounded-xl border bg-white/70 px-3 py-2 text-sm outline-none focus:border-[color:var(--ptl-accent)]"
                style={{ borderColor: "var(--ptl-border)" }}
              />
            </label>
            <label className="block">
              <div className="text-sm font-semibold text-neutral-900">Slug</div>
              <input
                name="slug"
                defaultValue={r.slug}
                className="mt-2 w-full rounded-xl border bg-white/70 px-3 py-2 text-sm outline-none focus:border-[color:var(--ptl-accent)]"
                style={{ borderColor: "var(--ptl-border)" }}
              />
            </label>
          </div>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <label className="block">
              <div className="text-sm font-semibold text-neutral-900">Website URL</div>
              <input
                name="websiteUrl"
                defaultValue={r.websiteUrl ?? ""}
                className="mt-2 w-full rounded-xl border bg-white/70 px-3 py-2 text-sm outline-none focus:border-[color:var(--ptl-accent)]"
                style={{ borderColor: "var(--ptl-border)" }}
              />
            </label>
            <label className="block">
              <div className="text-sm font-semibold text-neutral-900">Priority</div>
              <input
                name="priority"
                defaultValue={r.priority}
                type="number"
                step="1"
                className="mt-2 w-full rounded-xl border bg-white/70 px-3 py-2 text-sm outline-none focus:border-[color:var(--ptl-accent)]"
                style={{ borderColor: "var(--ptl-border)" }}
              />
            </label>
          </div>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <label className="block">
              <div className="text-sm font-semibold text-neutral-900">Logo asset path</div>
              <input
                name="logoAssetPath"
                defaultValue={r.logoAssetPath ?? ""}
                className="mt-2 w-full rounded-xl border bg-white/70 px-3 py-2 text-sm outline-none focus:border-[color:var(--ptl-accent)]"
                style={{ borderColor: "var(--ptl-border)" }}
              />
              <div className="mt-1 text-xs text-neutral-600">Prefer local path under public/.</div>
            </label>
            <label className="block">
              <div className="text-sm font-semibold text-neutral-900">Logo URL (fallback)</div>
              <input
                name="logoUrl"
                defaultValue={r.logoUrl ?? ""}
                className="mt-2 w-full rounded-xl border bg-white/70 px-3 py-2 text-sm outline-none focus:border-[color:var(--ptl-accent)]"
                style={{ borderColor: "var(--ptl-border)" }}
              />
            </label>
          </div>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
            <label className="block">
              <div className="text-sm font-semibold text-neutral-900">Affiliate network</div>
              <input
                name="affiliateNetwork"
                defaultValue={r.affiliateNetwork ?? ""}
                className="mt-2 w-full rounded-xl border bg-white/70 px-3 py-2 text-sm outline-none focus:border-[color:var(--ptl-accent)]"
                style={{ borderColor: "var(--ptl-border)" }}
              />
            </label>
            <label className="block">
              <div className="text-sm font-semibold text-neutral-900">Affiliate tag</div>
              <input
                name="affiliateTag"
                defaultValue={r.affiliateTag ?? ""}
                className="mt-2 w-full rounded-xl border bg-white/70 px-3 py-2 text-sm outline-none focus:border-[color:var(--ptl-accent)]"
                style={{ borderColor: "var(--ptl-border)" }}
              />
            </label>
            <label className="block">
              <div className="text-sm font-semibold text-neutral-900">Tag param</div>
              <input
                name="affiliateTagParam"
                defaultValue={r.affiliateTagParam ?? "tag"}
                className="mt-2 w-full rounded-xl border bg-white/70 px-3 py-2 text-sm outline-none focus:border-[color:var(--ptl-accent)]"
                style={{ borderColor: "var(--ptl-border)" }}
              />
            </label>
          </div>

          <label className="block">
            <div className="text-sm font-semibold text-neutral-900">Affiliate deeplink template</div>
            <input
              name="affiliateDeeplinkTemplate"
              defaultValue={r.affiliateDeeplinkTemplate ?? ""}
              placeholder="e.g. https://example.com/deeplink?url={url}"
              className="mt-2 w-full rounded-xl border bg-white/70 px-3 py-2 text-sm outline-none focus:border-[color:var(--ptl-accent)]"
              style={{ borderColor: "var(--ptl-border)" }}
            />
          </label>

          <label className="block">
            <div className="text-sm font-semibold text-neutral-900">Allowed hosts (JSON array)</div>
            <textarea
              name="allowedHostsJson"
              defaultValue={safeJson(r.allowedHosts, [])}
              rows={4}
              className="mt-2 w-full rounded-xl border bg-white/70 px-3 py-2 font-mono text-xs outline-none focus:border-[color:var(--ptl-accent)]"
              style={{ borderColor: "var(--ptl-border)" }}
            />
          </label>

          <label className="block">
            <div className="text-sm font-semibold text-neutral-900">Meta (JSON)</div>
            <textarea
              name="metaJson"
              defaultValue={safeJson(r.meta, {})}
              rows={5}
              className="mt-2 w-full rounded-xl border bg-white/70 px-3 py-2 font-mono text-xs outline-none focus:border-[color:var(--ptl-accent)]"
              style={{ borderColor: "var(--ptl-border)" }}
            />
          </label>

          <label className="flex items-center gap-3 text-sm font-semibold text-neutral-900">
            <input type="checkbox" name="active" defaultChecked={r.active} />
            Active
          </label>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-xs text-neutral-600">
              Updated{" "}
              {new Date(r.updatedAt).toLocaleString(undefined, {
                year: "numeric",
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </div>
            <button type="submit" className="ptl-btn-primary">
              Save
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}

