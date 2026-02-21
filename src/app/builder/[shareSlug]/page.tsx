import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { VisualBuilderPage } from "@/components/builder/VisualBuilderPage";
import { createTRPCContext } from "@/server/trpc/context";
import { appRouter } from "@/server/trpc/router";

function versionedThumbnailUrl(
  coverImageUrl: string | null | undefined,
  updatedAt: Date | string | null | undefined,
): string | undefined {
  if (!coverImageUrl) return undefined;

  const timestamp =
    updatedAt instanceof Date
      ? updatedAt.getTime()
      : typeof updatedAt === "string"
        ? Date.parse(updatedAt)
        : Number.NaN;

  if (!Number.isFinite(timestamp)) return coverImageUrl;

  const separator = coverImageUrl.includes("?") ? "&" : "?";
  return `${coverImageUrl}${separator}v=${timestamp}`;
}

export async function generateMetadata(props: {
  params: Promise<{ shareSlug: string }>;
}): Promise<Metadata> {
  const { shareSlug } = await props.params;
  const caller = appRouter.createCaller(
    await createTRPCContext({ req: new Request("http://localhost") }),
  );

  const data = await caller.visualBuilder.getByShareSlug({ shareSlug }).catch(() => null);
  if (!data) return { title: "Builder" };

  const thumbnailUrl = versionedThumbnailUrl(
    data.build.coverImageUrl,
    data.build.updatedAt,
  );

  return {
    title: `${data.build.name} (Builder)`,
    description:
      data.build.description ??
      `Open this planted tank build in the 3D builder and remix it.`,
    openGraph: {
      url: `/builder/${shareSlug}`,
      images: thumbnailUrl ? [{ url: thumbnailUrl, alt: `${data.build.name} thumbnail` }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      images: thumbnailUrl ? [thumbnailUrl] : undefined,
    },
  };
}

export default async function Page(props: { params: Promise<{ shareSlug: string }> }) {
  const params = await props.params;
  const shareSlug = params.shareSlug;

  const caller = appRouter.createCaller(
    await createTRPCContext({ req: new Request("http://localhost") }),
  );

  let data: Awaited<ReturnType<typeof caller.visualBuilder.getByShareSlug>>;
  try {
    data = await caller.visualBuilder.getByShareSlug({ shareSlug });
  } catch {
    notFound();
  }

  return (
    <VisualBuilderPage
      initialBuild={{
        ...data,
        build: {
          ...data.build,
          updatedAt: data.build.updatedAt.toISOString(),
        },
      }}
    />
  );
}
