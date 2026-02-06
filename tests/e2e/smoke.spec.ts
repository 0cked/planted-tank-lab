import { expect, test } from "@playwright/test";

test("home renders", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "PlantedTankLab" })).toBeVisible();
  await expect(page.getByText("Build your perfect planted tank")).toBeVisible();
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
  await expect(page.getByText("Specs")).toBeVisible();
});

test("plants browsing and detail render", async ({ page }) => {
  await page.goto("/plants");
  await expect(page.getByRole("heading", { name: "Plants" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Java Fern" })).toBeVisible();

  await page.goto("/plants/java-fern");
  await expect(page.getByRole("heading", { name: "Java Fern" })).toBeVisible();
  await expect(page.getByText("Care Card")).toBeVisible();
});
