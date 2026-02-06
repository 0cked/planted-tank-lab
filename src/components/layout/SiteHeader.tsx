import Image from "next/image";
import Link from "next/link";

import { UserMenu } from "@/components/layout/UserMenu";

function NavLink(props: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={props.href}
      className="relative px-3 py-1.5 text-sm font-semibold text-neutral-800/80 transition hover:text-neutral-950"
    >
      <span className="relative">
        {props.children}
        <span
          className="absolute -bottom-1 left-0 h-[2px] w-0 rounded-full transition-all group-hover:w-full"
          style={{ background: "var(--ptl-accent)" }}
        />
      </span>
    </Link>
  );
}

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

        <nav className="hidden items-center gap-1 sm:flex">
          <div className="group">
            <NavLink href="/builder">Builder</NavLink>
          </div>
          <div className="group">
            <NavLink href="/products">Products</NavLink>
          </div>
          <div className="group">
            <NavLink href="/plants">Plants</NavLink>
          </div>
          <div className="group">
            <NavLink href="/builds">Builds</NavLink>
          </div>
        </nav>

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
