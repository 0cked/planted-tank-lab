import { expect, test, type Page } from "@playwright/test";

async function dismissCookies(page: Page) {
  const allow = page.getByRole("button", { name: "Allow" });
  if (await allow.isVisible().catch(() => false)) {
    await allow.click();
  }
}

async function waitBuilderReady(page: Page) {
  await expect(page.getByTestId("category-row-tank")).toBeVisible();
  // Give tRPC queries time to resolve; gating depends on them.
  await page.waitForLoadState("networkidle");
}

test("builder compatibility: tank length filters lights; show incompatible reveals hidden", async ({ page }) => {
  await page.goto("/builder");
  await dismissCookies(page);
  await waitBuilderReady(page);

  await page
    .getByTestId("category-row-tank")
    .getByRole("button", { name: /Choose|Swap/i })
    .click();

  await page.getByPlaceholder("Search...").fill("UNS 90U");
  await page.getByRole("button", { name: "Add" }).first().click();

  await page
    .getByTestId("category-row-light")
    .getByRole("button", { name: /Choose|Swap/i })
    .click();

  await page.getByPlaceholder("Search...").fill("Chihiros WRGB II 60");

  // Hidden by compatibility by default.
  await expect(page.getByText("No compatible results. Turn off Compatibility to see all options.")).toBeVisible();
  await expect(page.getByText("Chihiros WRGB II 60")).toHaveCount(0);

  await page.getByLabel("Show incompatible").check();
  await expect(page.getByText("Chihiros WRGB II 60")).toBeVisible();
  await expect(page.getByText(/Incompatible:/)).toBeVisible();
  await expect(
    page
      .locator("li", { hasText: "Chihiros WRGB II 60" })
      .getByRole("button", { name: "Incompatible" }),
  ).toBeDisabled();
});

test("builder compatibility: low-tech hides CO2-required plants; show incompatible reveals hidden", async ({ page }) => {
  await page.goto("/builder");
  await dismissCookies(page);
  await waitBuilderReady(page);

  await page.getByLabel("Compatibility").check();
  // This test is about compatibility gating, not the curated view filter.
  // Ensure the queried plant exists in the picker list.
  await page.getByLabel("Curated picks").uncheck();
  await page.getByLabel("Low-tech (no CO2)").check();
  await expect(page.getByTestId("category-row-co2")).toContainText("No CO2 (low-tech)");

  await page
    .getByTestId("category-row-plants")
    .getByRole("button", { name: /Add|Manage/i })
    .click();

  const plantsDialog = page.getByRole("dialog", { name: "Add Plants" });
  await expect(plantsDialog).toBeVisible();
  await expect(plantsDialog.getByText("Loading...")).toHaveCount(0, { timeout: 15_000 });

  await page.getByPlaceholder("Search plants...").fill("Monte Carlo");

  await expect(plantsDialog.getByText("Loading...")).toHaveCount(0);
  await expect(
    plantsDialog.getByText("No compatible results. Turn off Compatibility to see all plants."),
  ).toBeVisible();
  await expect(page.getByLabel("Show incompatible")).toBeVisible({ timeout: 15_000 });
  const monte = plantsDialog.getByText("Monte Carlo (Micranthemum tweediei)");
  await expect(monte).toHaveCount(0);

  await page.getByLabel("Show incompatible").check();
  await expect(monte).toBeVisible();
  await expect(page.getByText(/Incompatible:/)).toBeVisible();
  await expect(
    plantsDialog
      .locator("li", { hasText: "Monte Carlo (Micranthemum tweediei)" })
      .getByRole("button", { name: "Incompatible" }),
  ).toBeDisabled();
});
