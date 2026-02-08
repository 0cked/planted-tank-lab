"use client";

import { RouteError } from "@/components/RouteError";

export default function PlantsError(props: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <RouteError
      title="Plants error"
      description="We could not load plant data right now. Try again."
      actions={[
        { href: "/plants", label: "Browse plants", kind: "primary" },
        { href: "/", label: "Go home", kind: "secondary" },
      ]}
      error={props.error}
      reset={props.reset}
    />
  );
}

