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

export function isLikelyBotUserAgent(userAgent: string | null | undefined): boolean {
  const ua = (userAgent ?? "").trim().toLowerCase();
  if (!ua) return true;
  return /(bot|crawler|spider|headless|lighthouse|slurp|bingpreview|facebookexternalhit)/i.test(
    ua,
  );
}

export function isHostAllowed(params: {
  hostname: string;
  allowedHosts: unknown;
}): boolean {
  const hostname = params.hostname.trim().toLowerCase();
  if (!hostname) return false;

  const list = Array.isArray(params.allowedHosts)
    ? params.allowedHosts.filter((x): x is string => typeof x === "string")
    : [];

  // If no allow-list is present, do not allow.
  if (list.length === 0) return false;

  for (const raw of list) {
    const allowed = raw.trim().toLowerCase();
    if (!allowed) continue;
    if (hostname === allowed) return true;
    // Allow subdomains of an allowed host, but not lookalikes (require dot boundary).
    if (hostname.endsWith(`.${allowed}`)) return true;
  }

  return false;
}

export function buildAffiliateUrl(params: {
  retailerSlug: string;
  retailerAffiliateTag: string | null;
  retailerAffiliateTagParam: string | null;
  retailerAffiliateDeeplinkTemplate: string | null;
  rawUrl: string;
  affiliateUrl: string | null;
}): string {
  // If the offer already has an explicit affiliate_url, use it.
  if (params.affiliateUrl) return params.affiliateUrl;

  try {
    const u = new URL(params.rawUrl);
    if (u.protocol !== "http:" && u.protocol !== "https:") return params.rawUrl;

    const template = params.retailerAffiliateDeeplinkTemplate?.trim() ?? null;
    if (template) {
      // Replace `{url}` with a URL-encoded raw destination.
      // If the template doesn't contain `{url}`, we fall back to the raw URL.
      if (!template.includes("{url}")) return params.rawUrl;
      return template.replaceAll("{url}", encodeURIComponent(params.rawUrl));
    }

    const tag = params.retailerAffiliateTag?.trim() ?? null;
    if (!tag) return params.rawUrl;

    const tagParam = (params.retailerAffiliateTagParam?.trim() || "tag").toLowerCase();
    // Avoid overwriting an existing tag (in case URL is already tagged).
    if (!u.searchParams.get(tagParam)) u.searchParams.set(tagParam, tag);

    return u.toString();
  } catch {
    return params.rawUrl;
  }
}
