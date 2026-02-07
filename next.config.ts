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

const nextConfig: NextConfig = {
  images: {
    remotePatterns,
  },
};

export default nextConfig;
