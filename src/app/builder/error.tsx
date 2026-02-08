"use client";

import { RouteError } from "@/components/RouteError";

export default function BuilderError(props: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <RouteError
      title="Builder error"
      description="The builder hit an unexpected error. Try again."
      actions={[
        { href: "/builder", label: "Reload builder", kind: "primary" },
        { href: "/", label: "Go home", kind: "secondary" },
      ]}
      error={props.error}
      reset={props.reset}
    />
  );
}

