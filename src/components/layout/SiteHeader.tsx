import Image from "next/image";
import Link from "next/link";

import { SiteNav } from "@/components/layout/SiteNav";
import { UserMenu } from "@/components/layout/UserMenu";

export function SiteHeader() {
  return (
    <header
      className="sticky top-0 z-40 border-b bg-white/55 backdrop-blur-md"
      style={{ borderColor: "var(--ptl-border)" }}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-4">
        <Link href="/" className="flex flex-col gap-1">
          <Image
            src="/brand/ptl-logo.svg"
            alt="PlantedTankLab"
            width={220}
            height={40}
            priority
            className="h-7 w-auto"
          />
          <div className="text-[11px] font-medium text-neutral-700">
            Build planted tanks with confidence
          </div>
        </Link>

        <SiteNav />

        <div className="flex items-center gap-2">
          <Link
            href="/builder"
            className="sm:hidden rounded-full border bg-white/70 px-3 py-1.5 text-sm font-semibold text-neutral-800/80"
            style={{ borderColor: "var(--ptl-border)" }}
          >
            Builder
          </Link>
          <UserMenu />
        </div>
      </div>
    </header>
  );
}
