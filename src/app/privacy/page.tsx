import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy | PlantedTankLab",
  description: "Privacy policy for PlantedTankLab.",
};

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-6xl px-6 py-14">
      <div className="ptl-surface-strong p-7 sm:p-10">
        <h1 className="ptl-page-title">Privacy</h1>
        <div className="mt-4 ptl-prose">
          <p>
            PlantedTankLab is early and evolving. We store product, plant, and offer data,
            plus account and build data if you choose to sign in.
          </p>
          <ul>
            <li>
              Affiliate clicks may be logged (offer, retailer, timestamp, and basic request
              metadata like a hashed IP and user-agent) to help us understand what people use
              and to protect the redirect system from abuse.
            </li>
            <li>
              If you create an account, we store your email address and authentication/session
              tokens needed to keep you signed in. You can also save builds and favorites.
            </li>
            <li>
              Third-party retailers (like Amazon) may set their own cookies or tracking when
              you click through to purchase.
            </li>
            <li>
              We set essential cookies for sign-in. We also store a cookie-consent choice for
              optional analytics (off by default).
            </li>
          </ul>
          <p>
            This is not legal advice. We will expand and formalize this policy as the product
            matures.
          </p>
        </div>
      </div>
    </main>
  );
}
