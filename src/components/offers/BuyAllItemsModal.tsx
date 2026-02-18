"use client";

import { useEffect, useMemo, useState } from "react";

export type BuyAllItemOption = {
  id: string;
  label: string;
  url: string;
  priceCents: number | null;
  inStock?: boolean;
};

export type BuyAllItem = {
  id: string;
  title: string;
  subtitle?: string;
  quantity: number;
  options: BuyAllItemOption[];
  defaultOptionId?: string | null;
};

type BuyAllItemsModalProps = {
  triggerLabel: string;
  title: string;
  description?: string;
  items: BuyAllItem[];
  theme?: "light" | "dark";
  triggerClassName?: string;
};

type OpenStatus = {
  type: "ok" | "error";
  message: string;
} | null;

function formatMoney(cents: number | null | undefined): string {
  if (cents == null || !Number.isFinite(cents)) return "—";
  return (cents / 100).toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
  });
}

function defaultOptionId(item: BuyAllItem): string | null {
  if (item.defaultOptionId && item.options.some((option) => option.id === item.defaultOptionId)) {
    return item.defaultOptionId;
  }

  const firstInStock = item.options.find((option) => option.inStock !== false);
  return firstInStock?.id ?? item.options[0]?.id ?? null;
}

export function BuyAllItemsModal(props: BuyAllItemsModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectionByItemId, setSelectionByItemId] = useState<Record<string, string>>({});
  const [openStatus, setOpenStatus] = useState<OpenStatus>(null);

  const dark = props.theme === "dark";

  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    window.addEventListener("keydown", handleEscape);
    return () => {
      window.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen]);

  const selectedRows = useMemo(() => {
    return props.items
      .map((item) => {
        const selectedId = selectionByItemId[item.id] ?? defaultOptionId(item);
        const selected = item.options.find((option) => option.id === selectedId) ?? item.options[0] ?? null;
        return {
          item,
          selected,
        };
      })
      .filter(
        (row): row is { item: BuyAllItem; selected: BuyAllItemOption } =>
          row.selected != null,
      );
  }, [props.items, selectionByItemId]);

  const estimatedTotalCents = useMemo(() => {
    return selectedRows.reduce((sum, row) => {
      return sum + (row.selected.priceCents ?? 0) * row.item.quantity;
    }, 0);
  }, [selectedRows]);

  const handleOpenAllLinks = () => {
    if (selectedRows.length === 0) {
      setOpenStatus({
        type: "error",
        message: "No purchasable links are available yet for this build.",
      });
      return;
    }

    let openedCount = 0;
    for (const row of selectedRows) {
      const nextWindow = window.open(row.selected.url, "_blank", "noopener,noreferrer");
      if (nextWindow) openedCount += 1;
    }

    if (openedCount === 0) {
      setOpenStatus({
        type: "error",
        message: "Popup blocking prevented opening tabs. Allow popups and try again.",
      });
      return;
    }

    setOpenStatus({
      type: "ok",
      message: `Opened ${openedCount} retailer tab${openedCount === 1 ? "" : "s"}.`,
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setSelectionByItemId({});
          setOpenStatus(null);
          setIsOpen(true);
        }}
        disabled={props.items.length === 0}
        className={
          props.triggerClassName ??
          (dark
            ? "inline-flex min-h-9 items-center justify-center rounded-md border border-emerald-300/70 bg-emerald-400/20 px-2 py-1 text-[10px] font-semibold text-emerald-100 disabled:cursor-not-allowed disabled:opacity-45"
            : "ptl-btn-secondary disabled:cursor-not-allowed disabled:opacity-60")
        }
      >
        {props.triggerLabel}
      </button>

      {isOpen ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/55 p-4">
          <div
            className={
              dark
                ? "max-h-[88vh] w-full max-w-3xl overflow-hidden rounded-2xl border border-white/20 bg-slate-950 text-slate-100"
                : "max-h-[88vh] w-full max-w-3xl overflow-hidden rounded-2xl border border-neutral-200 bg-white text-neutral-900"
            }
          >
            <div className={dark ? "border-b border-white/15 p-5" : "border-b border-neutral-200 p-5"}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-lg font-semibold">{props.title}</h3>
                  <p className={dark ? "mt-1 text-sm text-slate-300" : "mt-1 text-sm text-neutral-600"}>
                    {props.description ??
                      "Pick a retailer for each line item and open all purchase links in one action."}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className={
                    dark
                      ? "rounded-md border border-white/20 px-2 py-1 text-xs font-semibold text-slate-200"
                      : "rounded-md border border-neutral-300 px-2 py-1 text-xs font-semibold text-neutral-700"
                  }
                >
                  Close
                </button>
              </div>
            </div>

            <div className="max-h-[58vh] overflow-auto p-5">
              <div className="space-y-3">
                {props.items.map((item) => {
                  const selectedId = selectionByItemId[item.id] ?? defaultOptionId(item) ?? "";
                  const selected = item.options.find((option) => option.id === selectedId) ?? null;

                  return (
                    <div
                      key={item.id}
                      className={
                        dark
                          ? "rounded-xl border border-white/15 bg-slate-900/60 p-3"
                          : "rounded-xl border border-neutral-200 bg-neutral-50/80 p-3"
                      }
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          {item.subtitle ? (
                            <div className={dark ? "text-[10px] uppercase tracking-[0.12em] text-slate-400" : "text-[10px] uppercase tracking-[0.12em] text-neutral-500"}>
                              {item.subtitle}
                            </div>
                          ) : null}
                          <div className="text-sm font-semibold">{item.title}</div>
                          <div className={dark ? "text-xs text-slate-300" : "text-xs text-neutral-600"}>
                            Qty {item.quantity}
                          </div>
                        </div>
                        <div className="text-sm font-semibold">
                          {selected ? formatMoney((selected.priceCents ?? 0) * item.quantity) : "—"}
                        </div>
                      </div>

                      {item.options.length > 0 ? (
                        <div className="mt-2">
                          <label className={dark ? "mb-1 block text-[11px] text-slate-300" : "mb-1 block text-[11px] text-neutral-600"}>
                            Retailer
                          </label>
                          <select
                            value={selectedId}
                            onChange={(event) => {
                              const value = event.target.value;
                              setSelectionByItemId((current) => ({
                                ...current,
                                [item.id]: value,
                              }));
                            }}
                            className={
                              dark
                                ? "w-full rounded-md border border-white/20 bg-slate-950 px-2 py-1.5 text-sm text-slate-100 outline-none focus:border-emerald-300"
                                : "w-full rounded-md border border-neutral-300 bg-white px-2 py-1.5 text-sm text-neutral-900 outline-none focus:border-emerald-500"
                            }
                          >
                            {item.options.map((option) => (
                              <option key={option.id} value={option.id}>
                                {option.label}
                                {option.inStock === false ? " · Out of stock" : ""}
                                {option.priceCents != null ? ` · ${formatMoney(option.priceCents)}` : ""}
                              </option>
                            ))}
                          </select>
                        </div>
                      ) : (
                        <div className={dark ? "mt-2 text-xs text-rose-200" : "mt-2 text-xs text-rose-700"}>
                          No offers available for this line item.
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className={dark ? "border-t border-white/15 p-5" : "border-t border-neutral-200 p-5"}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className={dark ? "text-xs text-slate-300" : "text-xs text-neutral-600"}>Estimated total</div>
                  <div className="text-lg font-semibold">{formatMoney(estimatedTotalCents)}</div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className={
                      dark
                        ? "rounded-md border border-white/20 px-3 py-1.5 text-xs font-semibold text-slate-200"
                        : "rounded-md border border-neutral-300 px-3 py-1.5 text-xs font-semibold text-neutral-700"
                    }
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleOpenAllLinks}
                    className={
                      dark
                        ? "rounded-md border border-emerald-300/70 bg-emerald-400/20 px-3 py-1.5 text-xs font-semibold text-emerald-100"
                        : "rounded-md border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-800"
                    }
                  >
                    Open all links
                  </button>
                </div>
              </div>

              {openStatus ? (
                <div className={openStatus.type === "ok" ? "mt-2 text-xs text-emerald-500" : "mt-2 text-xs text-rose-500"}>
                  {openStatus.message}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
