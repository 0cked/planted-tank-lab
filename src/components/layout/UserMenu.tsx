"use client";

import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { signOut, useSession } from "next-auth/react";
import Link from "next/link";

export function UserMenu() {
  const { data } = useSession();

  if (!data?.user) {
    // Keep the top-nav CTA stable while session state resolves.
    return (
      <div className="flex items-center gap-2">
        <Link href="/sign-up" className="ptl-btn-primary !px-3 !py-1.5">
          Sign up
        </Link>
        <Link href="/login" className="ptl-btn-secondary !px-3 !py-1.5">
          Sign in
        </Link>
      </div>
    );
  }

  const email = data.user.email ?? "Account";
  const isAdmin = data.user.role === "admin";

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          className="rounded-full border bg-white/60 px-3 py-1.5 text-sm font-semibold text-neutral-800 transition hover:bg-white/80"
          style={{ borderColor: "var(--ptl-border)" }}
        >
          {email}
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          className="z-50 min-w-[220px] rounded-2xl border bg-white/90 p-1 shadow-lg backdrop-blur-md"
          style={{ borderColor: "var(--ptl-border)" }}
        >
          <DropdownMenu.Item asChild>
            <Link
              href="/profile"
              className="block cursor-pointer rounded-xl px-3 py-2 text-sm font-semibold text-neutral-800 outline-none hover:bg-neutral-100/70"
            >
              Profile
            </Link>
          </DropdownMenu.Item>
          {isAdmin ? (
            <DropdownMenu.Item asChild>
              <Link
                href="/admin"
                className="block cursor-pointer rounded-xl px-3 py-2 text-sm font-semibold text-neutral-800 outline-none hover:bg-neutral-100/70"
              >
                Admin
              </Link>
            </DropdownMenu.Item>
          ) : null}
          <DropdownMenu.Separator className="my-1 h-px bg-neutral-200/70" />
          <DropdownMenu.Item
            onSelect={() => void signOut({ callbackUrl: "/" })}
            className="cursor-pointer rounded-xl px-3 py-2 text-sm font-semibold text-neutral-800 outline-none hover:bg-neutral-100/70"
          >
            Sign out
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
