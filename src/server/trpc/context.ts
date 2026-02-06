import type { inferAsyncReturnType } from "@trpc/server";

import { db } from "@/server/db";

export type TRPCContextOptions = {
  req: Request;
};

export const createTRPCContext = async (opts: TRPCContextOptions) => {
  return {
    db,
    // Auth is introduced in a later milestone. Keep session nullable for now.
    session: null as null,
    req: opts.req,
  };
};

export type TRPCContext = inferAsyncReturnType<typeof createTRPCContext>;
