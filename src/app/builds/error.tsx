"use client";

import { RouteError } from "@/components/RouteError";

export default function BuildsError(props: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <RouteError
      title="Builds error"
      description="We could not load builds right now. Try again."
      actions={[
        { href: "/builds", label: "Browse builds", kind: "primary" },
        { href: "/builder", label: "Start a build", kind: "secondary" },
      ]}
      error={props.error}
      reset={props.reset}
    />
  );
}

