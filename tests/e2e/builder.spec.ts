import { expect, test, type Page } from "@playwright/test";

async function dismissCookies(page: Page) {
  const allow = page.getByRole("button", { name: "Allow" });
  if (await allow.isVisible().catch(() => false)) {
    await allow.click();
  }
}

async function waitBuilderReady(page: Page) {
  await expect(page.getByRole("heading", { name: "Visual Canvas" })).toBeVisible();
  await page.waitForLoadState("networkidle");
  await expect(page.getByRole("heading", { name: "Bill of Materials" })).toBeVisible();
}

test("visual builder: add hardscape object and see live canvas count update", async ({ page }) => {
  await page.goto("/builder");
  await dismissCookies(page);
  await waitBuilderReady(page);

  await expect(page.getByText("1 line item(s), 0 canvas object(s)")).toBeVisible();

  await page
    .locator("aside")
    .filter({ hasText: "Tank" })
    .getByRole("button", { name: "Add to canvas" })
    .first()
    .click();

  await expect(page.getByText(/1 canvas object\(s\)/)).toBeVisible();
});

test("visual builder: plant placement + low-tech toggle stays interactive", async ({ page }) => {
  await page.goto("/builder");
  await dismissCookies(page);
  await waitBuilderReady(page);

  await page.getByRole("button", { name: "Plants" }).click();
  await page.getByPlaceholder("Search assets...").fill("Monte Carlo");
  await page.getByRole("button", { name: "Add to canvas" }).first().click();
  await expect(page.getByText(/1 canvas object\(s\)/)).toBeVisible();

  await page.getByLabel("Low-tech").check();
  await expect(page.getByLabel("Low-tech")).toBeChecked();
});
