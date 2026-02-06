import type { inferAsyncReturnType } from "@trpc/server";
import { getToken } from "next-auth/jwt";

import { db } from "@/server/db";

export type TRPCContextOptions = {
  req: Request;
};

export const createTRPCContext = async (opts: TRPCContextOptions) => {
  const token = await getToken({
    req: opts.req as unknown as Parameters<typeof getToken>[0]["req"],
    secret: process.env.NEXTAUTH_SECRET,
  }).catch(() => null);

  const userId = token && typeof token.sub === "string" ? token.sub : null;
  const email = token && typeof token.email === "string" ? token.email : null;
  const role = token && typeof (token as { role?: unknown }).role === "string"
    ? String((token as { role?: unknown }).role)
    : null;

  return {
    db,
    session: userId
      ? {
          user: {
            id: userId,
            email,
            role,
          },
        }
      : null,
    req: opts.req,
  };
};

export type TRPCContext = inferAsyncReturnType<typeof createTRPCContext>;
