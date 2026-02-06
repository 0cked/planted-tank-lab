import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact | PlantedTankLab",
  description: "Get in touch about PlantedTankLab.",
};

export default function ContactPage() {
  return (
    <main className="mx-auto max-w-6xl px-6 py-14">
      <div className="ptl-surface-strong p-7 sm:p-10">
        <h1
          className="text-3xl font-semibold tracking-tight"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Contact
        </h1>
        <p className="mt-4 text-sm text-neutral-700">
          For feedback, corrections, or partnership inquiries, email:
        </p>
        <div className="mt-4 rounded-xl border bg-white/70 px-4 py-3 text-sm font-semibold" style={{ borderColor: "var(--ptl-border)" }}>
          contact@plantedtanklab.com
        </div>
        <p className="mt-4 text-xs text-neutral-600">
          If you’re reporting data issues, include the product/plant name and a link to a
          source (manufacturer page preferred).
        </p>
      </div>
    </main>
  );
}
