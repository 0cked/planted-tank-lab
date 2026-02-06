import { createHash } from "node:crypto";

export function hashIp(ip: string | null | undefined): string | null {
  if (!ip) return null;
  const trimmed = ip.trim();
  if (!trimmed) return null;

  const salt = process.env.NEXTAUTH_SECRET ?? "";
  return createHash("sha256").update(`${salt}:${trimmed}`).digest("hex");
}

export function extractIpFromHeaders(xForwardedFor: string | null): string | null {
  if (!xForwardedFor) return null;
  // XFF can be "client, proxy1, proxy2"
  const first = xForwardedFor.split(",")[0]?.trim();
  return first ? first : null;
}

export function buildAffiliateUrl(params: {
  retailerSlug: string;
  retailerAffiliateTag: string | null;
  rawUrl: string;
  affiliateUrl: string | null;
}): string {
  // If the offer already has an explicit affiliate_url, use it.
  if (params.affiliateUrl) return params.affiliateUrl;

  // Otherwise, tag based on retailer.
  // MVP: only Amazon tagging is implemented.
  if (params.retailerSlug !== "amazon") return params.rawUrl;

  const tag = params.retailerAffiliateTag;
  if (!tag) return params.rawUrl;

  try {
    const u = new URL(params.rawUrl);
    if (u.protocol !== "http:" && u.protocol !== "https:") return params.rawUrl;
    // Avoid overwriting an existing tag (in case URL is already tagged).
    if (!u.searchParams.get("tag")) u.searchParams.set("tag", tag);
    return u.toString();
  } catch {
    return params.rawUrl;
  }
}

