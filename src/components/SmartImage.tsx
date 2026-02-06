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

export function SmartImage(props: SmartImageProps) {
  const { src, alt, width, height, className, sizes, priority } = props;

  if (isRemoteSrc(src)) {
    // We intentionally use <img> for remote URLs to avoid constantly growing a
    // Next Image allow-list during MVP data seeding. When we host images
    // ourselves (Supabase Storage or local), we can remove this branch.
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
