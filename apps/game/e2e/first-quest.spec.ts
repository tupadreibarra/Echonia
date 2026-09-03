import { test, expect } from "@playwright/test";

// A lasting regression check for the core loop, not a replay of the full
// Phase 10 playthrough (character creation -> village -> all three orbs ->
// combat -> reward -> gate) — that's slow to run on every change. This slice
// (character creation through one challenge resolving correctly) is enough
// to catch a real regression in the game <-> server <-> content pipeline.
test("creates a character, enters the village, and resolves one vocabulary challenge", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByText("Create your hero.")).toBeVisible();
  await page.getByPlaceholder("Hero name").fill("E2E Test Hero");
  await page.getByRole("button", { name: "7-9" }).click();
  await page.getByRole("button", { name: "Start Adventure" }).click();

  // Everything VillageScene draws (props, NPCs, the orb labels) is rendered
  // to a <canvas> by Phaser, not the DOM — Playwright's text locators can't
  // see any of it. The only reliable DOM signal here is that character
  // creation is gone; a short fixed wait covers Phaser's boot + its content
  // fetch (see BootScene). The orb challenge below is real DOM (a React
  // overlay), so it's locatable normally once we walk into range.
  await expect(page.getByText("Create your hero.")).not.toBeVisible({ timeout: 10_000 });
  await page.waitForTimeout(1200);

  // Walk toward the apple orb (up-left of the player's start position — see
  // VillageScene.ts's buildOrb/player-start coordinates for the layout this
  // assumes).
  for (let i = 0; i < 12; i++) {
    await page.keyboard.down("ArrowUp");
    await page.waitForTimeout(100);
    await page.keyboard.up("ArrowUp");
    await page.keyboard.down("ArrowLeft");
    await page.waitForTimeout(80);
    await page.keyboard.up("ArrowLeft");
  }

  await expect(page.getByText("Which one is...")).toBeVisible({ timeout: 10_000 });
  await expect(page.getByText("apple", { exact: true })).toBeVisible();

  await page.getByText("manzana", { exact: true }).click();
  await expect(page.getByText("¡Correcto!")).toBeVisible();

  await page.getByText("Tap to continue").click();
  await expect(page.getByText("Which one is...")).not.toBeVisible();
});
