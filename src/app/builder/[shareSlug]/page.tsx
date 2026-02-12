import { notFound } from "next/navigation";

import { VisualBuilderPage } from "@/components/builder/VisualBuilderPage";
import { createTRPCContext } from "@/server/trpc/context";
import { appRouter } from "@/server/trpc/router";

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
