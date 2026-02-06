import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy | PlantedTankLab",
  description: "Privacy policy for PlantedTankLab.",
};

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-6xl px-6 py-14">
      <div className="ptl-surface-strong p-7 sm:p-10">
        <h1
          className="text-3xl font-semibold tracking-tight"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Privacy
        </h1>
        <p className="mt-4 text-sm text-neutral-700">
          PlantedTankLab is an early MVP. Today, we primarily store product, plant, and
          offer data, plus anonymous click tracking for affiliate redirects.
        </p>
        <ul className="mt-6 list-disc space-y-2 pl-5 text-sm text-neutral-700">
          <li>
            Affiliate clicks may be logged (offer, retailer, timestamp, and basic request
            metadata) to help us understand what people use.
          </li>
          <li>
            We do not sell personal data. If/when accounts are enabled, this page will be
            updated with details on account data and retention.
          </li>
          <li>
            Third-party retailers (like Amazon) may set their own cookies or tracking when
            you click through to purchase.
          </li>
        </ul>
        <p className="mt-6 text-xs text-neutral-600">
          This is not legal advice. We will expand and formalize this policy as the product
          matures.
        </p>
      </div>
    </main>
  );
}
