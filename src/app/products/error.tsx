"use client";

import { RouteError } from "@/components/RouteError";

export default function ProductsError(props: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <RouteError
      title="Products error"
      description="We could not load product data right now. Try again."
      actions={[
        { href: "/products", label: "Browse products", kind: "primary" },
        { href: "/", label: "Go home", kind: "secondary" },
      ]}
      error={props.error}
      reset={props.reset}
    />
  );
}

