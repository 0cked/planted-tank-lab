"use client";

import Image from "next/image";
import Link from "next/link";

import { SiteNav } from "@/components/layout/SiteNav";
import { UserMenu } from "@/components/layout/UserMenu";

export function SiteHeader() {
  return (
    <header
      className="sticky top-0 z-40 border-b border-white/10 bg-[rgba(13,20,23,0.66)] backdrop-blur-xl"
    >
      <div className="mx-auto max-w-6xl px-4 py-3 sm:px-6">
        <div className="ptl-surface-glass flex items-center justify-between gap-4 rounded-2xl px-4 py-3 sm:px-5">
          <Link href="/" className="flex flex-col gap-1">
            <Image
              src="/brand/ptl-logo.svg"
              alt="PlantedTankLab"
              width={220}
              height={40}
              priority
              className="h-7 w-auto"
            />
            <div className="text-[11px] font-medium text-[color:var(--ptl-ink-muted)]">
              Build planted tanks with confidence
            </div>
          </Link>

          <SiteNav />

          <div className="flex items-center gap-2">
            <Link href="/builder" className="ptl-btn-secondary sm:hidden !px-3 !py-1.5">
              Builder
            </Link>
            <UserMenu />
          </div>
        </div>
      </div>
    </header>
  );
}
