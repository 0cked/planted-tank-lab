import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact | PlantedTankLab",
  description: "Get in touch about PlantedTankLab.",
};

export default function ContactPage() {
  return (
    <main className="mx-auto max-w-6xl px-6 py-14">
      <div className="ptl-surface-strong p-7 sm:p-10">
        <h1 className="ptl-page-title">Contact</h1>
        <div className="mt-4 ptl-prose">
          <p>For feedback, corrections, or partnership inquiries, email:</p>
        </div>
        <div className="mt-4 rounded-xl border bg-white/70 px-4 py-3 text-sm font-semibold" style={{ borderColor: "var(--ptl-border)" }}>
          contact@plantedtanklab.com
        </div>
        <div className="mt-4 ptl-prose">
          <p>
            If you are reporting data issues, include the product/plant name and a link to a
            source (manufacturer page preferred).
          </p>
        </div>
      </div>
    </main>
  );
}
