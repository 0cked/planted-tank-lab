"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type Item = {
  href: string;
  label: string;
  isActive: (pathname: string) => boolean;
};

const items: Item[] = [
  { href: "/builder", label: "Builder", isActive: (p) => p === "/builder" || p.startsWith("/builder/") },
  { href: "/products", label: "Products", isActive: (p) => p === "/products" || p.startsWith("/products/") },
  { href: "/plants", label: "Plants", isActive: (p) => p === "/plants" || p.startsWith("/plants/") },
  {
    href: "/guides/beginners-guide",
    label: "Guides",
    isActive: (p) => p === "/guides" || p.startsWith("/guides/"),
  },
  { href: "/tools", label: "Tools", isActive: (p) => p === "/tools" || p.startsWith("/tools/") },
  { href: "/builds", label: "Builds", isActive: (p) => p === "/builds" || p.startsWith("/builds/") },
];

export function SiteNav() {
  const pathname = usePathname() ?? "/";

  return (
    <nav className="hidden items-center gap-1 rounded-full border border-[color:var(--ptl-border)] bg-[rgba(226,235,231,0.55)] p-1 shadow-sm sm:flex">
      {items.map((item) => {
        const active = item.isActive(pathname);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={
              "group relative rounded-full px-3 py-1.5 text-sm font-semibold transition " +
              (active
                ? "bg-[rgba(230,239,234,0.9)] text-[color:var(--ptl-ink-strong)] shadow-sm"
                : "text-[color:var(--ptl-ink-muted)] hover:bg-[rgba(231,239,235,0.68)] hover:text-[color:var(--ptl-ink-strong)]")
            }
          >
            <span className="relative">
              {item.label}
              <span
                className={
                  "absolute -bottom-1 left-0 h-[2px] rounded-full transition-all " +
                  (active ? "w-full" : "w-0 group-hover:w-full")
                }
                style={{ background: "var(--ptl-accent)" }}
              />
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
