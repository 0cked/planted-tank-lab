import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";

function hasGoogle(): boolean {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

function allowDevLogin(): boolean {
  if (process.env.NODE_ENV === "production") return false;
  return process.env.AUTH_DEV_LOGIN === "true";
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

    // Always register a provider so the auth route doesn't crash in environments
    // where OAuth/email credentials haven't been configured yet.
    CredentialsProvider({
      name: "Dev Login",
      credentials: {
        email: { label: "Email", type: "email", placeholder: "you@example.com" },
      },
      async authorize(credentials) {
        if (!allowDevLogin()) return null;
        const email = String(credentials?.email ?? "").trim().toLowerCase();
        if (!email) return null;
        return { id: email, email };
      },
    }),
  ],

  pages: {
    signIn: "/login",
  },

  session: {
    strategy: "jwt",
  },

  callbacks: {
    async session({ session, token }) {
      if (session.user) {
        // Keep a stable identifier on the client.
        (session.user as { id?: string }).id =
          typeof token.sub === "string" ? token.sub : undefined;
      }
      return session;
    },
  },
};

