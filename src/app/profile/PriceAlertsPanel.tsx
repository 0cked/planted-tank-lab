"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { useEffect, useRef } from "react";

import { trpc } from "@/components/TRPCProvider";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";

function formatMoney(cents: number): string {
  return (cents / 100).toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
  });
}

function formatTimestamp(value: Date | string | null): string {
  if (!value) {
    return "just now";
  }

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "recently";
  }

  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

const TRIGGERED_FILTER = { onlyTriggered: true } as const;

function PriceAlertsPanelContent() {
  const hasCheckedRef = useRef(false);

  const utils = trpc.useUtils();
  const checkMutation = trpc.priceAlerts.checkAndTrigger.useMutation({
    onSuccess: async () => {
      await utils.priceAlerts.listMine.invalidate(TRIGGERED_FILTER);
    },
  });

  const alertsQuery = trpc.priceAlerts.listMine.useQuery(TRIGGERED_FILTER, {
    staleTime: 30_000,
  });

  useEffect(() => {
    if (hasCheckedRef.current) {
      return;
    }

    hasCheckedRef.current = true;
    void checkMutation.mutateAsync().catch(() => undefined);
  }, [checkMutation]);

  if (alertsQuery.error && !alertsQuery.isFetching) {
    throw alertsQuery.error;
  }

  const alerts = alertsQuery.data ?? [];

  return (
    <section className="mt-10 ptl-surface p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-neutral-900">Triggered price alerts</h2>
          <p className="mt-1 text-sm text-neutral-700">
            Alerts appear here when current offers drop below your target price.
          </p>
        </div>
      </div>

      {checkMutation.data && checkMutation.data.triggeredCount > 0 ? (
        <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50/70 px-3 py-2 text-sm text-emerald-900">
          {checkMutation.data.triggeredCount} new alert
          {checkMutation.data.triggeredCount === 1 ? "" : "s"} triggered.
        </div>
      ) : null}

      {alertsQuery.isLoading ? (
        <div className="mt-4 text-sm text-neutral-600">Checking your active alerts…</div>
      ) : alerts.length === 0 ? (
        <div
          className="mt-4 rounded-2xl border bg-white/70 px-4 py-3 text-sm text-neutral-700"
          style={{ borderColor: "var(--ptl-border)" }}
        >
          No triggered alerts yet.
        </div>
      ) : (
        <div className="mt-4 overflow-hidden rounded-2xl border bg-white/70" style={{ borderColor: "var(--ptl-border)" }}>
          <ul className="divide-y divide-neutral-200">
            {alerts.map((alert) => (
              <li key={alert.id} className="px-4 py-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <Link
                      href={`/products/${alert.category.slug}/${alert.product.slug}`}
                      className="text-sm font-semibold text-neutral-900 hover:text-emerald-800 hover:underline"
                    >
                      {alert.product.name}
                    </Link>
                    <div className="mt-1 text-xs text-neutral-600">
                      Target: {formatMoney(alert.targetPriceCents)}
                      {alert.bestPriceCents != null
                        ? ` · Best offer: ${formatMoney(alert.bestPriceCents)}`
                        : " · Best offer unavailable"}
                    </div>
                  </div>
                  <div className="text-xs text-neutral-500">Triggered {formatTimestamp(alert.lastNotifiedAt)}</div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

export function PriceAlertsPanel() {
  const { status } = useSession();
  const isAuthenticated = status === "authenticated";
  const utils = trpc.useUtils();

  if (!isAuthenticated) {
    return null;
  }

  return (
    <ErrorBoundary
      onRetry={() => {
        void utils.priceAlerts.listMine.invalidate(TRIGGERED_FILTER);
      }}
      fallback={({ retry }) => (
        <section className="mt-10 ptl-surface p-6">
          <h2 className="text-xl font-semibold text-neutral-900">Triggered price alerts</h2>
          <div className="mt-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900">
            Failed to load alerts.
          </div>
          <button type="button" onClick={retry} className="mt-3 ptl-btn-secondary">
            Retry
          </button>
        </section>
      )}
    >
      <PriceAlertsPanelContent />
    </ErrorBoundary>
  );
}
