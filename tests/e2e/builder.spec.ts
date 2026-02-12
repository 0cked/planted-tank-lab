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
  await page.getByRole("button", { name: "Continue" }).click();
  await dismissCookies(page);
  await expect(page.getByRole("heading", { name: "Select substrate" })).toBeVisible();
  await page
    .locator("aside")
    .filter({ hasText: "Select substrate" })
    .getByRole("button", { name: "Select" })
    .first()
    .click();
  await dismissCookies(page);
  await expect(page.getByRole("heading", { name: "Place hardscape" })).toBeVisible();
  await page
    .locator("aside")
    .filter({ hasText: "Place hardscape" })
    .getByRole("button", { name: "Add to canvas" })
    .first()
    .click();

  await expect(page.getByText(/canvas object\(s\)/)).toBeVisible();
});

test("visual builder: plant placement + low-tech toggle stays interactive", async ({ page }) => {
  await page.goto("/builder");
  await dismissCookies(page);
  await waitBuilderReady(page);

  await page.getByRole("button", { name: "Continue" }).click();
  await dismissCookies(page);
  await page
    .locator("aside")
    .filter({ hasText: "Select substrate" })
    .getByRole("button", { name: "Select" })
    .first()
    .click();
  await dismissCookies(page);
  await page
    .locator("aside")
    .filter({ hasText: "Place hardscape" })
    .getByRole("button", { name: "Add to canvas" })
    .first()
    .click();
  await dismissCookies(page);
  await expect(page.getByRole("heading", { name: "Add plants" })).toBeVisible();
  await page.getByPlaceholder("Search assets...").fill("Monte Carlo");
  await page
    .locator("aside")
    .filter({ hasText: "Add plants" })
    .getByRole("button", { name: "Add to canvas" })
    .first()
    .click();
  await expect(page.getByText(/canvas object\(s\)/)).toBeVisible();

  await page.getByLabel("Low-tech").check();
  await expect(page.getByLabel("Low-tech")).toBeChecked();
});

test("visual builder: substrate sculpt updates bag estimate", async ({ page }) => {
  await page.goto("/builder");
  await dismissCookies(page);
  await waitBuilderReady(page);

  await page.getByRole("button", { name: "Continue" }).click();
  await dismissCookies(page);
  await expect(page.getByRole("heading", { name: "Select substrate" })).toBeVisible();

  const substratePanel = page.locator("aside").filter({ hasText: "Substrate profile" });
  const chooseButtons = substratePanel.getByRole("button", { name: /Select|Selected/ });
  await chooseButtons.first().click();
  await expect(page.getByRole("heading", { name: "Place hardscape" })).toBeVisible();
  await expect(page.getByText(/target fill/gi).first()).toBeVisible();
  await expect(page.getByText(/bag/gi).first()).toBeVisible();
});
