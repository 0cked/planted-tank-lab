import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Builder2DPage } from "@/components/builder2d/Builder2DPage";
import type { Builder2DInitialBuild } from "@/components/builder2d/types";
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

function toBuilder2DInitialBuild(data: {
  build: {
    shareSlug: string | null;
    name: string;
    description: string | null;
  };
  initialState: {
    canvasState: {
      widthIn: number;
      depthIn: number;
      heightIn: number;
    };
    lineItems: Array<{
      id: string;
      categorySlug: string;
      quantity: number;
      product: { name: string } | null;
      plant: { commonName: string } | null;
    }>;
  };
}, fallbackShareSlug: string): Builder2DInitialBuild {
  return {
    shareSlug: data.build.shareSlug ?? fallbackShareSlug,
    name: data.build.name,
    description: data.build.description,
    widthIn: data.initialState.canvasState.widthIn,
    depthIn: data.initialState.canvasState.depthIn,
    heightIn: data.initialState.canvasState.heightIn,
    lineItems: data.initialState.lineItems.map((lineItem) => ({
      id: lineItem.id,
      categorySlug: lineItem.categorySlug,
      quantity: lineItem.quantity,
      productName: lineItem.product?.name ?? null,
      plantName: lineItem.plant?.commonName ?? null,
    })),
  };
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

  const thumbnailUrl = versionedThumbnailUrl(data.build.coverImageUrl, data.build.updatedAt);

  return {
    title: `${data.build.name} (2D Builder)`,
    description: data.build.description ?? "Open this planted tank build in the 2D scaper and remix it.",
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
  const caller = appRouter.createCaller(
    await createTRPCContext({ req: new Request("http://localhost") }),
  );

  const data = await caller.visualBuilder.getByShareSlug({ shareSlug: params.shareSlug }).catch(() => null);
  if (!data) {
    notFound();
  }

  return <Builder2DPage initialBuild={toBuilder2DInitialBuild(data, params.shareSlug)} />;
}
