import type { NextConfig } from "next";

function safeHostname(url: string | undefined): string | null {
  const raw = (url ?? "").trim();
  if (!raw) return null;
  try {
    return new URL(raw).hostname;
  } catch {
    return null;
  }
}

const supabaseHost = safeHostname(process.env.NEXT_PUBLIC_SUPABASE_URL);

const remotePatterns: NonNullable<NextConfig["images"]>["remotePatterns"] = [
  {
    protocol: "https",
    hostname: "tropica.com",
  },
  {
    protocol: "https",
    hostname: "www.tropica.com",
  },
];

if (supabaseHost) {
  remotePatterns.push({
    protocol: "https",
    hostname: supabaseHost,
  });
}

const securityHeaders: { key: string; value: string }[] = [
  // Prevent MIME sniffing.
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Limit cross-site referrer leakage while keeping same-site analytics useful.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Disable powerful features we do not use.
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  // Clickjacking protection. If we later need embeds, replace with CSP frame-ancestors.
  { key: "X-Frame-Options", value: "DENY" },
];

if (process.env.NODE_ENV === "production") {
  // HSTS only makes sense on HTTPS (production). Avoid setting for local dev.
  securityHeaders.unshift({
    key: "Strict-Transport-Security",
    value: "max-age=31536000; includeSubDomains",
  });
}

const nextConfig: NextConfig = {
  images: {
    remotePatterns,
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
