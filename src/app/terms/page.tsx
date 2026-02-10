import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms | PlantedTankLab",
  description: "Terms of service for PlantedTankLab.",
};

export default function TermsPage() {
  return (
    <main className="mx-auto max-w-6xl px-6 py-14">
      <div className="ptl-surface-strong p-7 sm:p-10">
        <h1 className="ptl-page-title">Terms</h1>
        <div className="mt-4 ptl-prose">
          <p>
            By using PlantedTankLab (the “Service”), you agree to these Terms.
            PlantedTankLab is an early product; we’re improving it quickly and may change
            features over time.
          </p>

          <h2>Not advice</h2>
          <p>
            PlantedTankLab provides planning tools and informational content for planted
            aquariums. It is not professional advice (including pet/veterinary, safety,
            electrical, or water-quality advice). You are responsible for your own setup,
            livestock, and decisions.
          </p>

          <h2>Affiliate links</h2>
          <p>
            Some outbound purchase links route through <code>/go</code> and may be affiliate
            links. We may earn from qualifying purchases. Prices, availability, and product
            details can change and are ultimately controlled by third-party retailers.
          </p>

          <h2>Accounts and builds</h2>
          <p>
            If you sign in, you’re responsible for activity on your account. Public/shared
            builds are intended for sharing, and you should not include sensitive personal
            information in build titles/notes.
          </p>

          <h2>Acceptable use</h2>
          <ul>
            <li>Don’t abuse the Service (scraping, denial-of-service, or bypassing limits).</li>
            <li>Don’t attempt to access admin features unless you’re authorized.</li>
            <li>Don’t upload or submit unlawful, infringing, or harmful content.</li>
          </ul>

          <h2>Third-party services</h2>
          <p>
            The Service may link to or integrate with third parties (e.g., retailers,
            authentication providers). Their terms and privacy policies apply to your use of
            those services.
          </p>

          <h2>Disclaimers</h2>
          <p>
            The Service is provided “as is” and “as available” without warranties of any kind.
            We don’t guarantee that data (including compatibility rules, specs, prices, or
            stock status) is complete, accurate, or up to date.
          </p>

          <h2>Limitation of liability</h2>
          <p>
            To the maximum extent permitted by law, PlantedTankLab will not be liable for any
            indirect, incidental, special, consequential, or punitive damages, or for any loss
            of profits, data, or goodwill.
          </p>

          <h2>Changes</h2>
          <p>
            We may update these Terms from time to time. Continued use of the Service means
            you accept the updated Terms.
          </p>

          <h2>Contact</h2>
          <p>
            Questions? Use the <a href="/contact">contact page</a>.
          </p>
        </div>
      </div>
    </main>
  );
}
