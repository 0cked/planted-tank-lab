"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { CookieBanner } from "@/components/CookieBanner";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { OfflineStatusBanner } from "@/components/pwa/OfflineStatusBanner";

type AppChromeProps = {
  children: ReactNode;
};

function isBuilderPath(pathname: string | null): boolean {
  if (!pathname) return false;
  return pathname === "/builder" || pathname.startsWith("/builder/");
}

export function AppChrome(props: AppChromeProps) {
  const pathname = usePathname();
  const hideSiteChrome = isBuilderPath(pathname);

  return (
    <div className="ptl-app text-[color:var(--ptl-ink-strong)]">
      {hideSiteChrome ? null : <SiteHeader />}
      {hideSiteChrome ? null : <OfflineStatusBanner />}
      {props.children}
      {hideSiteChrome ? null : <SiteFooter />}
      {hideSiteChrome ? null : <CookieBanner />}
    </div>
  );
}
