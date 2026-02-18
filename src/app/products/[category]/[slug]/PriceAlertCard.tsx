"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { useMemo, useState } from "react";

import { trpc } from "@/components/TRPCProvider";

function formatMoneyFromCents(cents: number): string {
  return (cents / 100).toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
  });
}

function initialTargetPriceFromCents(suggestedPriceCents: number | null): string {
  if (suggestedPriceCents == null || suggestedPriceCents <= 0) {
    return "20.00";
  }

  return (suggestedPriceCents / 100).toFixed(2);
}

export function PriceAlertCard(props: {
  productId: string;
  loginHref: string;
  suggestedPriceCents: number | null;
}) {
  const { status } = useSession();
  const isAuthenticated = status === "authenticated";
  const utils = trpc.useUtils();

  const [draftTargetPriceInput, setDraftTargetPriceInput] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const alertsQuery = trpc.priceAlerts.listMine.useQuery(undefined, {
    enabled: isAuthenticated,
    staleTime: 30_000,
  });

  const existingAlert = useMemo(
    () => alertsQuery.data?.find((row) => row.productId === props.productId) ?? null,
    [alertsQuery.data, props.productId],
  );

  const placeholder = initialTargetPriceFromCents(props.suggestedPriceCents);
  const existingTargetInput = existingAlert
    ? (existingAlert.targetPriceCents / 100).toFixed(2)
    : null;
  const targetPriceInput = draftTargetPriceInput ?? existingTargetInput ?? placeholder;

  const upsertMutation = trpc.priceAlerts.upsert.useMutation({
    onSuccess: async (result) => {
      setDraftTargetPriceInput((result.targetPriceCents / 100).toFixed(2));
      setStatusMessage(`Alert active at ${formatMoneyFromCents(result.targetPriceCents)}.`);
      await utils.priceAlerts.listMine.invalidate();
    },
    onError: () => {
      setStatusMessage("Could not save alert right now. Please try again.");
    },
  });

  if (!isAuthenticated) {
    return (
      <div
        className="mt-5 rounded-2xl border bg-white/70 p-4"
        style={{ borderColor: "var(--ptl-border)" }}
      >
        <div className="text-xs font-semibold uppercase tracking-wide text-neutral-600">
          Price alert
        </div>
        <p className="mt-2 text-sm text-neutral-700">
          Sign in to get notified when this product drops below your target price.
        </p>
        <div className="mt-3">
          <Link href={props.loginHref} className="ptl-btn-secondary">
            Sign in to set alert
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div
      className="mt-5 rounded-2xl border bg-white/70 p-4"
      style={{ borderColor: "var(--ptl-border)" }}
    >
      <div className="text-xs font-semibold uppercase tracking-wide text-neutral-600">
        Price alert
      </div>

      <p className="mt-2 text-sm text-neutral-700">
        Set a target and we&apos;ll flag this product in your profile when offers dip below it.
      </p>

      {existingAlert ? (
        <div className="mt-2 text-xs text-emerald-800">
          Active alert at {formatMoneyFromCents(existingAlert.targetPriceCents)}
        </div>
      ) : null}

      <div className="mt-3 flex flex-wrap items-end gap-2">
        <label className="text-sm">
          <div className="text-xs font-semibold uppercase tracking-wide text-neutral-600">
            Target price (USD)
          </div>
          <input
            type="number"
            inputMode="decimal"
            min="0.01"
            step="0.01"
            className="mt-1 w-40 rounded-xl border bg-white px-3 py-2 text-sm"
            style={{ borderColor: "var(--ptl-border)" }}
            placeholder={placeholder}
            value={targetPriceInput}
            onChange={(event) => {
              setDraftTargetPriceInput(event.target.value);
            }}
          />
        </label>

        <button
          type="button"
          className="ptl-btn-secondary disabled:cursor-not-allowed disabled:opacity-60"
          disabled={upsertMutation.isPending || alertsQuery.isLoading}
          onClick={async () => {
            const parsed = Number.parseFloat(targetPriceInput);
            if (!Number.isFinite(parsed) || parsed <= 0) {
              setStatusMessage("Enter a valid target price above $0.00.");
              return;
            }

            setStatusMessage(null);
            await upsertMutation.mutateAsync({
              productId: props.productId,
              targetPrice: parsed,
            });
          }}
        >
          {upsertMutation.isPending ? "Saving…" : "Set alert"}
        </button>
      </div>

      {statusMessage ? <div className="mt-3 text-xs text-neutral-700">{statusMessage}</div> : null}
    </div>
  );
}
