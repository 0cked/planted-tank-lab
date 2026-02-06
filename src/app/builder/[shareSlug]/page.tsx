import { notFound } from "next/navigation";

import { BuilderPage } from "@/components/builder/BuilderPage";
import { createTRPCContext } from "@/server/trpc/context";
import { appRouter } from "@/server/trpc/router";

export default async function Page(props: { params: Promise<{ shareSlug: string }> }) {
  const params = await props.params;
  const shareSlug = params.shareSlug;

  const caller = appRouter.createCaller(
    await createTRPCContext({ req: new Request("http://localhost") }),
  );

  let data: Awaited<ReturnType<typeof caller.builds.getByShareSlug>>;
  try {
    data = await caller.builds.getByShareSlug({ shareSlug });
  } catch {
    notFound();
  }

  return <BuilderPage initialState={data.snapshot} />;
}
