import Image from "next/image";

type SmartImageProps = {
  src: string;
  alt: string;
  width: number;
  height: number;
  className?: string;
  sizes?: string;
  priority?: boolean;
};

function isRemoteSrc(src: string): boolean {
  return src.startsWith("http://") || src.startsWith("https://");
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
  const { src, alt, width, height, className, sizes, priority } = props;

  if (isRemoteSrc(src)) {
    // Only optimize remote images from known allow-listed hosts; fall back to <img>
    // for everything else while iterating quickly on seed data sources.
    if (shouldOptimizeRemote(src)) {
      return (
        <Image
          src={src}
          alt={alt}
          width={width}
          height={height}
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
        width={width}
        height={height}
        loading={priority ? "eager" : "lazy"}
        className={className}
      />
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      width={width}
      height={height}
      className={className}
      sizes={sizes}
      priority={priority}
    />
  );
}
