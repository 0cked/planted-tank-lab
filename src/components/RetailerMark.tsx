import { SmartImage } from "@/components/SmartImage";

type RetailerMarkProps = {
  name: string;
  logoAssetPath?: string | null;
  logoUrl?: string | null;
  className?: string;
};

export function RetailerMark(props: RetailerMarkProps) {
  const src = props.logoAssetPath ?? props.logoUrl ?? null;

  return (
    <div className={"flex min-w-0 items-center gap-2 " + (props.className ?? "")}>
      <span
        className="grid h-7 w-7 shrink-0 place-items-center overflow-hidden rounded-lg border bg-white/70"
        style={{ borderColor: "var(--ptl-border)" }}
        aria-hidden="true"
      >
        {src ? (
          <SmartImage
            src={src}
            alt=""
            width={56}
            height={56}
            className="h-full w-full object-contain"
          />
        ) : (
          <span className="text-xs font-semibold text-neutral-700">
            {props.name.slice(0, 1).toUpperCase()}
          </span>
        )}
      </span>
      <span className="truncate text-sm font-semibold text-neutral-900">{props.name}</span>
    </div>
  );
}

