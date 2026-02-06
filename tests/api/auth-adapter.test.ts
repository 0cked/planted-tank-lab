import { describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";

import { drizzleAuthAdapter } from "@/server/auth-adapter";
import { db } from "@/server/db";
import { users } from "@/server/db/schema";

describe("NextAuth Drizzle adapter", () => {
  it("creates and consumes verification tokens", async () => {
    const adapter = drizzleAuthAdapter(db);
    const identifier = `test-${crypto.randomUUID()}@example.com`;
    const token = crypto.randomUUID();
    const expires = new Date(Date.now() + 10 * 60 * 1000);

    if (!adapter.createVerificationToken || !adapter.useVerificationToken) {
      throw new Error("Adapter is missing verification token methods.");
    }

    await adapter.createVerificationToken({ identifier, token, expires });

    const used = await adapter.useVerificationToken({ identifier, token });
    expect(used).toEqual({ identifier, token, expires });

    const usedAgain = await adapter.useVerificationToken({ identifier, token });
    expect(usedAgain).toBeNull();
  });

  it("creates users in the app users table", async () => {
    const adapter = drizzleAuthAdapter(db);
    const email = `test-${crypto.randomUUID()}@example.com`;

    const created = await adapter.createUser({
      email,
      emailVerified: null,
      name: "Test User",
      image: null,
    });

    expect(created.id).toBeTruthy();
    expect(created.email).toBe(email);
    expect(created.name).toBe("Test User");

    await db.delete(users).where(eq(users.id, created.id));
  });
});
