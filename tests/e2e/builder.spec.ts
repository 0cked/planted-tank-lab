import { expect, test, type Page } from "@playwright/test";

async function dismissCookies(page: Page) {
  const allow = page.getByRole("button", { name: "Allow" });
  if (await allow.isVisible().catch(() => false)) {
    await allow.click();
  }
}

async function waitBuilderReady(page: Page) {
  await expect(page.getByRole("heading", { name: "Game-like 3D aquascaping planner" })).toBeVisible();
  await page.waitForLoadState("networkidle");
  await expect(page.locator("canvas").first()).toBeVisible();
  await expect(page.getByRole("heading", { name: "Bill of Materials" })).toBeVisible();
}

async function currentSceneObjectCount(page: Page): Promise<number> {
  const text = (await page.getByText(/Objects:\s*\d+/).first().textContent()) ?? "";
  const match = text.match(/Objects:\s*(\d+)/);
  return Number(match?.[1] ?? 0);
}

async function placeAssetInScene(page: Page, minimumIncrement = 1) {
  const canvas = page.locator("canvas").first();
  await expect(canvas).toBeVisible();
  const box = await canvas.boundingBox();
  if (!box) throw new Error("Scene canvas bounding box not available.");
  const startCount = await currentSceneObjectCount(page);
  const targetCount = startCount + Math.max(1, minimumIncrement);

  const probes: ReadonlyArray<[number, number]> = [
    [0.5, 0.62],
    [0.5, 0.56],
    [0.56, 0.6],
    [0.44, 0.6],
    [0.5, 0.68],
  ];

  for (const [xPct, yPct] of probes) {
    await canvas.click({ position: { x: box.width * xPct, y: box.height * yPct } });
    await page.waitForTimeout(240);
    const count = await currentSceneObjectCount(page);
    if (count >= targetCount) return;
  }

  throw new Error(`Could not place asset in scene. Expected object count >= ${targetCount}.`);
}

test("visual builder: place hardscape object and update scene count", async ({ page }) => {
  test.setTimeout(45_000);
  await page.goto("/builder");
  await dismissCookies(page);
  await waitBuilderReady(page);

  await expect(page.getByText(/Objects: .*0/)).toBeVisible();

  await page.getByRole("button", { name: "Continue" }).click();
  await dismissCookies(page);
  await expect(page.getByText("Sculpt substrate").first()).toBeVisible();

  const substratePanel = page.locator("aside").filter({ hasText: "Terrain presets" }).first();
  await substratePanel.getByRole("button", { name: "Select" }).first().click();

  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByText("Place hardscape").first()).toBeVisible();

  const hardscapePanel = page.locator("aside").filter({ hasText: "Place hardscape" }).first();
  await hardscapePanel.getByRole("button", { name: "Place" }).first().click();
  await placeAssetInScene(page);

  await expect(page.getByText(/Objects: .*1/)).toBeVisible();
});

test("visual builder: plant placement and low-tech toggle remain interactive", async ({ page }) => {
  test.setTimeout(45_000);
  await page.goto("/builder");
  await dismissCookies(page);
  await waitBuilderReady(page);

  await page.getByRole("button", { name: "Continue" }).click();
  const substratePanel = page.locator("aside").filter({ hasText: "Terrain presets" }).first();
  await substratePanel.getByRole("button", { name: "Select" }).first().click();

  await page.getByRole("button", { name: "Continue" }).click();
  const hardscapePanel = page.locator("aside").filter({ hasText: "Place hardscape" }).first();
  await hardscapePanel.getByRole("button", { name: "Place" }).first().click();
  await placeAssetInScene(page);

  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByText("Plant zones").first()).toBeVisible();

  const plantsPanel = page.locator("aside").filter({ hasText: "Plant zones" }).first();
  await plantsPanel.getByPlaceholder("Search assets...").fill("Monte Carlo");
  await plantsPanel.getByRole("button", { name: "Place" }).first().click();
  await placeAssetInScene(page);

  await expect(page.getByText(/Objects: .*2/)).toBeVisible();

  const compatibilityPanel = page.locator("aside").filter({ hasText: "Compatibility" }).first();
  const lowTech = compatibilityPanel.getByLabel("Low-tech");
  await lowTech.check();
  await expect(lowTech).toBeChecked();
});

test("visual builder: substrate presets update fill estimate", async ({ page }) => {
  await page.goto("/builder");
  await dismissCookies(page);
  await waitBuilderReady(page);

  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByText("Sculpt substrate").first()).toBeVisible();

  const substratePanel = page.locator("aside").filter({ hasText: "Terrain presets" }).first();
  await substratePanel.getByRole("button", { name: "Select" }).first().click();

  const fillRow = substratePanel.getByText(/Fill target:/).first();
  const before = (await fillRow.textContent()) ?? "";

  await substratePanel.getByRole("button", { name: "Island" }).click();
  const after = (await fillRow.textContent()) ?? "";

  expect(before).not.toBe(after);
  await expect(fillRow).toContainText("bag");
});
