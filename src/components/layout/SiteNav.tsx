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
    <nav className="hidden items-center gap-1 sm:flex">
      {items.map((item) => {
        const active = item.isActive(pathname);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={
              "group relative px-3 py-1.5 text-sm font-semibold transition " +
              (active ? "text-neutral-950" : "text-neutral-800/80 hover:text-neutral-950")
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

