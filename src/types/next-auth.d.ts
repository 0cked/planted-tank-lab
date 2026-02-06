import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  type SessionUser = DefaultSession["user"] & {
    id?: string;
    role?: string;
  };

  interface Session {
    user?: SessionUser;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: string;
  }
}

