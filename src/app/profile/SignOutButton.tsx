"use client";

import { signOut } from "next-auth/react";

export function SignOutButton(props: { className?: string }) {
  return (
    <button
      type="button"
      className={props.className ?? "ptl-btn-primary"}
      onClick={() => void signOut({ callbackUrl: "/" })}
    >
      Sign out
    </button>
  );
}

