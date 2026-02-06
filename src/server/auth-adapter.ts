import type {
  Adapter,
  AdapterAccount,
  AdapterSession,
  AdapterUser,
  VerificationToken,
} from "next-auth/adapters";
import { and, eq } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import * as schema from "@/server/db/schema";

type DbUser = typeof schema.users.$inferSelect;

function toAdapterUser(u: DbUser): AdapterUser {
  return {
    id: u.id,
    email: u.email,
    emailVerified: null,
    name: u.displayName ?? null,
    image: u.avatarUrl ?? null,
  };
}

export function drizzleAuthAdapter(
  db: PostgresJsDatabase<typeof schema>,
): Adapter {
  return {
    async createUser(user: Omit<AdapterUser, "id">): Promise<AdapterUser> {
      const email = String(user.email ?? "").trim().toLowerCase();
      const displayName = user.name ? String(user.name).slice(0, 100) : null;
      const avatarUrl = user.image ? String(user.image).slice(0, 500) : null;

      const rows = await db
        .insert(schema.users)
        .values({
          email,
          displayName,
          avatarUrl,
          authProvider: "email",
          lastLoginAt: new Date(),
        })
        .onConflictDoUpdate({
          target: schema.users.email,
          set: {
            displayName,
            avatarUrl,
            updatedAt: new Date(),
            lastLoginAt: new Date(),
          },
        })
        .returning();

      const row = rows[0];
      if (!row) throw new Error("Failed to create user.");
      return toAdapterUser(row);
    },

    async getUser(id): Promise<AdapterUser | null> {
      const rows = await db.select().from(schema.users).where(eq(schema.users.id, id)).limit(1);
      const row = rows[0];
      return row ? toAdapterUser(row) : null;
    },

    async getUserByEmail(email): Promise<AdapterUser | null> {
      const normalized = String(email ?? "").trim().toLowerCase();
      const rows = await db
        .select()
        .from(schema.users)
        .where(eq(schema.users.email, normalized))
        .limit(1);
      const row = rows[0];
      return row ? toAdapterUser(row) : null;
    },

    async getUserByAccount({
      provider,
      providerAccountId,
    }): Promise<AdapterUser | null> {
      const rows = await db
        .select({ user: schema.users })
        .from(schema.authAccounts)
        .innerJoin(schema.users, eq(schema.users.id, schema.authAccounts.userId))
        .where(
          and(
            eq(schema.authAccounts.provider, provider),
            eq(schema.authAccounts.providerAccountId, providerAccountId),
          ),
        )
        .limit(1);

      const row = rows[0]?.user;
      return row ? toAdapterUser(row) : null;
    },

    async updateUser(user): Promise<AdapterUser> {
      const id = user.id;
      if (!id) throw new Error("updateUser requires user.id");

      const email = user.email ? String(user.email).trim().toLowerCase() : undefined;
      const displayName = user.name ? String(user.name).slice(0, 100) : undefined;
      const avatarUrl = user.image ? String(user.image).slice(0, 500) : undefined;

      const rows = await db
        .update(schema.users)
        .set({
          ...(email ? { email } : {}),
          ...(displayName !== undefined ? { displayName } : {}),
          ...(avatarUrl !== undefined ? { avatarUrl } : {}),
          updatedAt: new Date(),
        })
        .where(eq(schema.users.id, id))
        .returning();

      const row = rows[0];
      if (!row) throw new Error("User not found.");
      return toAdapterUser(row);
    },

    async deleteUser(id): Promise<void> {
      await db.delete(schema.users).where(eq(schema.users.id, id));
    },

    async linkAccount(account: AdapterAccount): Promise<AdapterAccount> {
      const rows = await db
        .insert(schema.authAccounts)
        .values({
          userId: account.userId,
          type: account.type,
          provider: account.provider,
          providerAccountId: account.providerAccountId,
          refreshToken: account.refresh_token ?? null,
          accessToken: account.access_token ?? null,
          expiresAt: account.expires_at ?? null,
          tokenType: account.token_type ?? null,
          scope: account.scope ?? null,
          idToken: account.id_token ?? null,
          sessionState: account.session_state ?? null,
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: [schema.authAccounts.provider, schema.authAccounts.providerAccountId],
          set: {
            userId: account.userId,
            type: account.type,
            refreshToken: account.refresh_token ?? null,
            accessToken: account.access_token ?? null,
            expiresAt: account.expires_at ?? null,
            tokenType: account.token_type ?? null,
            scope: account.scope ?? null,
            idToken: account.id_token ?? null,
            sessionState: account.session_state ?? null,
            updatedAt: new Date(),
          },
        })
        .returning();

      const linked = rows[0];
      if (!linked) throw new Error("Failed to link account.");

      await db
        .update(schema.users)
        .set({
          authProvider: account.provider,
          authProviderId: account.providerAccountId,
          updatedAt: new Date(),
          lastLoginAt: new Date(),
        })
        .where(eq(schema.users.id, account.userId));

      return account;
    },

    async unlinkAccount(
      params: Pick<AdapterAccount, "provider" | "providerAccountId">,
    ): Promise<void> {
      await db
        .delete(schema.authAccounts)
        .where(
          and(
            eq(schema.authAccounts.provider, params.provider),
            eq(schema.authAccounts.providerAccountId, params.providerAccountId),
          ),
        );
    },

    async createSession(session): Promise<AdapterSession> {
      const rows = await db
        .insert(schema.authSessions)
        .values({
          sessionToken: session.sessionToken,
          userId: session.userId,
          expires: session.expires,
          updatedAt: new Date(),
        })
        .returning();
      const row = rows[0];
      if (!row) throw new Error("Failed to create session.");
      return {
        sessionToken: row.sessionToken,
        userId: row.userId,
        expires: row.expires,
      };
    },

    async getSessionAndUser(
      sessionToken: string,
    ): Promise<{ session: AdapterSession; user: AdapterUser } | null> {
      const rows = await db
        .select({ session: schema.authSessions, user: schema.users })
        .from(schema.authSessions)
        .innerJoin(schema.users, eq(schema.users.id, schema.authSessions.userId))
        .where(eq(schema.authSessions.sessionToken, sessionToken))
        .limit(1);
      const row = rows[0];
      if (!row) return null;
      return {
        session: {
          sessionToken: row.session.sessionToken,
          userId: row.session.userId,
          expires: row.session.expires,
        },
        user: toAdapterUser(row.user),
      };
    },

    async updateSession(
      session: Partial<AdapterSession> & Pick<AdapterSession, "sessionToken">,
    ): Promise<AdapterSession | null> {
      const rows = await db
        .update(schema.authSessions)
        .set({
          ...(session.expires ? { expires: session.expires } : {}),
          ...(session.userId ? { userId: session.userId } : {}),
          updatedAt: new Date(),
        })
        .where(eq(schema.authSessions.sessionToken, session.sessionToken))
        .returning();
      const row = rows[0];
      return row
        ? { sessionToken: row.sessionToken, userId: row.userId, expires: row.expires }
        : null;
    },

    async deleteSession(sessionToken): Promise<void> {
      await db
        .delete(schema.authSessions)
        .where(eq(schema.authSessions.sessionToken, sessionToken));
    },

    async createVerificationToken(
      token: VerificationToken,
    ): Promise<VerificationToken> {
      const rows = await db
        .insert(schema.authVerificationTokens)
        .values({
          identifier: token.identifier,
          token: token.token,
          expires: token.expires,
        })
        .returning();
      const row = rows[0];
      if (!row) throw new Error("Failed to create verification token.");
      return { identifier: row.identifier, token: row.token, expires: row.expires };
    },

    async useVerificationToken(params: {
      identifier: string;
      token: string;
    }): Promise<VerificationToken | null> {
      const rows = await db
        .select()
        .from(schema.authVerificationTokens)
        .where(
          and(
            eq(schema.authVerificationTokens.identifier, params.identifier),
            eq(schema.authVerificationTokens.token, params.token),
          ),
        )
        .limit(1);
      const row = rows[0];
      if (!row) return null;
      await db
        .delete(schema.authVerificationTokens)
        .where(
          and(
            eq(schema.authVerificationTokens.identifier, params.identifier),
            eq(schema.authVerificationTokens.token, params.token),
          ),
        );
      return { identifier: row.identifier, token: row.token, expires: row.expires };
    },
  };
}
