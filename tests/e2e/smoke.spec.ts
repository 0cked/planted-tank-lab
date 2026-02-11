import { expect, test, type Page } from "@playwright/test";

async function dismissCookies(page: Page) {
  const allow = page.getByRole("button", { name: "Allow" });
  if (await allow.isVisible().catch(() => false)) {
    await allow.click();
  }
}

test("home renders", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", {
      name: "Build a planted tank setup that actually makes sense.",
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("main").getByRole("link", { name: /Start building/i }),
  ).toBeVisible();
});

test("products browsing renders", async ({ page }) => {
  await page.goto("/products");
  await expect(page.getByRole("heading", { name: "Products" })).toBeVisible();
  await expect(page.locator('a[href="/products/tank"]').first()).toBeVisible();

  await page.goto("/products/tank");
  await expect(page.getByRole("heading", { name: "Tank" })).toBeVisible();
});

test("product detail renders", async ({ page }) => {
  await page.goto("/products/tank/uns-60u");
  await expect(page.getByRole("heading")).toContainText("60U");
  await expect(page.getByText("Specs", { exact: true })).toBeVisible();
});

test("plants browsing and detail render", async ({ page }) => {
  await page.goto("/plants", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Plants" })).toBeVisible();
  await expect(
    page.locator('a[href="/plants/java-fern"]').first(),
  ).toBeVisible();

  await page.goto("/plants/java-fern", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Java Fern" })).toBeVisible();
  await expect(page.getByText("Care Card")).toBeVisible();
});

test("profile renders (signed out)", async ({ page }) => {
  await page.goto("/profile");
  await expect(page.getByRole("heading", { name: "Your profile" })).toBeVisible();
  await expect(page.getByRole("main").getByRole("link", { name: "Sign in" })).toBeVisible();
});

test("builds index renders", async ({ page }) => {
  await page.goto("/builds");
  await expect(page.getByRole("heading", { name: "Builds" })).toBeVisible();
});

test("builder share creates a snapshot; nav highlights Builds; open-in-builder returns to Builder", async ({
  page,
}) => {
  await page.goto("/builder");
  await dismissCookies(page);
  await expect(page.getByRole("heading", { name: "Builder" })).toBeVisible();
  await expect(page.getByTestId("category-row-tank")).toBeVisible();
  await page.waitForLoadState("networkidle");

  await page.getByRole("button", { name: "Share" }).click();

  await expect(page.getByText("Build snapshot")).toBeVisible({ timeout: 15_000 });
  await expect(page.getByRole("heading", { name: "Untitled Build" })).toBeVisible();
  await expect(
    page.getByRole("navigation").getByRole("link", { name: "Builds" }),
  ).toHaveAttribute(
    "aria-current",
    "page",
  );

  await page.getByRole("link", { name: "Open in builder" }).click();
  await expect(page).toHaveURL(/\/builder\//, { timeout: 15_000 });
  await expect(
    page.getByRole("navigation").getByRole("link", { name: "Builder" }),
  ).toHaveAttribute(
    "aria-current",
    "page",
  );
});

test("not found renders a friendly page", async ({ page }) => {
  await page.goto("/plants/this-plant-does-not-exist");
  await expect(page.getByRole("heading", { name: "Plant not found" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Browse plants" })).toBeVisible();
});

test("admin ingestion route is protected (signed out)", async ({ page }) => {
  await page.goto("/admin/ingestion");
  await expect(page.getByRole("heading", { name: "That page does not exist" })).toBeVisible();
});
