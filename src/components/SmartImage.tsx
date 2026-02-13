import Image from "next/image";

type SmartImageBaseProps = {
  src: string;
  alt: string;
  className?: string;
  sizes?: string;
  priority?: boolean;
};

type SmartImageProps =
  | (SmartImageBaseProps & {
      fill: true;
      width?: never;
      height?: never;
    })
  | (SmartImageBaseProps & {
      fill?: false;
      width: number;
      height: number;
    });

function isRemoteSrc(src: string): boolean {
  return src.startsWith("http://") || src.startsWith("https://");
}

function isGeneratedTankIllustration(src: string): boolean {
  return src.startsWith("/api/tank-illustration");
}

function safeHostname(src: string): string | null {
  try {
    return new URL(src).hostname;
  } catch {
    return null;
  }
}

function shouldOptimizeRemote(src: string): boolean {
  const host = safeHostname(src);
  if (!host) return false;

  // Known external sources that are allow-listed in next.config.ts.
  if (host === "tropica.com" || host === "www.tropica.com") return true;

  // Our own hosted media (Supabase Storage) should also be optimized.
  const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim();
  if (!supabaseUrl) return false;
  try {
    const supabaseHost = new URL(supabaseUrl).hostname;
    return host === supabaseHost;
  } catch {
    return false;
  }
}

export function SmartImage(props: SmartImageProps) {
  const { src, alt, className, sizes, priority } = props;
  const fill = "fill" in props && props.fill === true;

  // Generated tank art is served from an API route as SVG; bypass next/image
  // optimization so query-stringed local URLs render reliably in production.
  if (isGeneratedTankIllustration(src)) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={alt}
        {...(fill ? {} : { width: props.width, height: props.height })}
        loading={priority ? "eager" : "lazy"}
        className={className}
      />
    );
  }

  if (isRemoteSrc(src)) {
    // Only optimize remote images from known allow-listed hosts; fall back to <img>
    // for everything else while iterating quickly on seed data sources.
    if (shouldOptimizeRemote(src)) {
      return fill ? (
        <Image
          src={src}
          alt={alt}
          fill
          className={className}
          sizes={sizes}
          priority={priority}
        />
      ) : (
        <Image
          src={src}
          alt={alt}
          width={props.width}
          height={props.height}
          className={className}
          sizes={sizes}
          priority={priority}
        />
      );
    }

    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={alt}
        {...(fill ? {} : { width: props.width, height: props.height })}
        loading={priority ? "eager" : "lazy"}
        className={className}
      />
    );
  }

  return fill ? (
    <Image src={src} alt={alt} fill className={className} sizes={sizes} priority={priority} />
  ) : (
    <Image
      src={src}
      alt={alt}
      width={props.width}
      height={props.height}
      className={className}
      sizes={sizes}
      priority={priority}
    />
  );
}
