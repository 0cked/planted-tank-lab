import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import EmailProvider from "next-auth/providers/email";
import GoogleProvider from "next-auth/providers/google";
import { eq } from "drizzle-orm";

import { db } from "@/server/db";
import { drizzleAuthAdapter } from "@/server/auth-adapter";
import { users } from "@/server/db/schema";

function hasGoogle(): boolean {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

function hasEmailMagicLinks(): boolean {
  return Boolean(process.env.EMAIL_SERVER && process.env.EMAIL_FROM);
}

function allowDevLogin(): boolean {
  if (process.env.NODE_ENV === "production") return false;
  return process.env.AUTH_DEV_LOGIN === "true";
}

function isAdminEmail(email: string | null | undefined): boolean {
  const e = (email ?? "").trim().toLowerCase();
  if (!e) return false;
  const raw = (process.env.ADMIN_EMAILS ?? "").trim();
  if (!raw) return false;
  const list = raw
    .split(",")
    .map((x) => x.trim().toLowerCase())
    .filter(Boolean);
  return list.includes(e);
}

export const authOptions: NextAuthOptions = {
  providers: [
    ...(hasGoogle()
      ? [
          GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID as string,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
          }),
        ]
      : []),

    ...(hasEmailMagicLinks()
      ? [
          EmailProvider({
            server: process.env.EMAIL_SERVER as string,
            from: process.env.EMAIL_FROM as string,
          }),
        ]
      : []),

    ...(allowDevLogin()
      ? [
          CredentialsProvider({
            name: "Dev Login",
            credentials: {
              email: { label: "Email", type: "email", placeholder: "you@example.com" },
            },
            async authorize(credentials) {
              const email = String(credentials?.email ?? "").trim().toLowerCase();
              if (!email) return null;
              return { id: email, email };
            },
          }),
        ]
      : []),

    // Keep NextAuth stable even if no real providers are configured yet (especially in production).
    // We hide this from the UI by using a custom `/login` page and never calling `signIn("unavailable")`.
    ...(!hasGoogle() && !hasEmailMagicLinks() && !allowDevLogin()
      ? [
          CredentialsProvider({
            id: "unavailable",
            name: "Unavailable",
            credentials: {},
            async authorize() {
              return null;
            },
          }),
        ]
      : []),
  ],

  adapter: drizzleAuthAdapter(db),

  pages: {
    signIn: "/login",
  },

  session: {
    strategy: "jwt",
  },

  secret: process.env.NEXTAUTH_SECRET,

  callbacks: {
    async jwt({ token }) {
      // Persist the user's role in the JWT so we don't need DB lookups on every request.
      if (typeof token.sub === "string" && typeof token.role !== "string") {
        const rows = await db
          .select({ role: users.role })
          .from(users)
          .where(eq(users.id, token.sub))
          .limit(1);
        token.role = rows[0]?.role ?? "user";
      }

      // Bootstrap admins via env without needing a separate admin panel.
      if (typeof token.sub === "string" && isAdminEmail(typeof token.email === "string" ? token.email : null)) {
        if (token.role !== "admin") {
          token.role = "admin";
          try {
            await db.update(users).set({ role: "admin", updatedAt: new Date() }).where(eq(users.id, token.sub));
          } catch {
            // ignore; token role will still grant access for this session.
          }
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        // Keep a stable identifier on the client.
        session.user.id = typeof token.sub === "string" ? token.sub : undefined;
        session.user.role = typeof token.role === "string" ? token.role : undefined;
      }
      return session;
    },
  },
};
