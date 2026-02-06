import Image from "next/image";
import Link from "next/link";

import { UserMenu } from "@/components/layout/UserMenu";

function NavLink(props: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={props.href}
      className="rounded-full px-3 py-1.5 text-sm font-semibold text-neutral-700 transition hover:bg-white/60 hover:text-neutral-900"
    >
      {props.children}
    </Link>
  );
}

export function SiteHeader() {
  return (
    <header
      className="sticky top-0 z-40 border-b bg-white/65 backdrop-blur-md"
      style={{ borderColor: "var(--ptl-border)" }}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-4">
        <Link href="/" className="flex items-center gap-3">
          <Image
            src="/brand/ptl-logo.svg"
            alt=""
            aria-hidden="true"
            width={32}
            height={32}
            priority
          />
          <div className="leading-tight">
            <div
              className="text-base font-semibold tracking-tight"
              style={{ fontFamily: "var(--font-display)" }}
            >
              PlantedTankLab
            </div>
            <div className="text-[11px] font-medium text-neutral-600">
              Build planted tanks with confidence
            </div>
          </div>
        </Link>

        <nav className="flex items-center gap-1">
          <NavLink href="/builder">Builder</NavLink>
          <NavLink href="/products">Products</NavLink>
          <NavLink href="/plants">Plants</NavLink>
        </nav>

        <div className="flex items-center gap-2">
          <Link href="/builder" className="hidden sm:inline-flex ptl-btn-secondary">
            Builder
          </Link>
          <UserMenu />
        </div>
      </div>
    </header>
  );
}
