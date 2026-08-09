import { expect, test } from "@playwright/test";

test("loads the menu and enters the generated level", async ({ page }) => {
  const runtimeErrors: string[] = [];
  const loadedCharacterAssets = new Set<string>();
  page.on("console", (message) => {
    if (message.type() === "error") runtimeErrors.push(message.text());
  });
  page.on("pageerror", (error) => runtimeErrors.push(error.message));
  page.on("response", (response) => {
    if (response.ok() && response.url().includes("/assets/characters/")) {
      loadedCharacterAssets.add(new URL(response.url()).pathname);
    }
  });

  await page.goto("/");

  const game = page.locator("#game");
  await expect(game.locator("canvas")).toBeVisible();
  await expect(game).toHaveAttribute("data-scene", "menu");

  await page.keyboard.press("Enter");
  await expect(game).toHaveAttribute("data-scene", "game");

  await page.keyboard.down("KeyD");
  await page.waitForTimeout(150);
  await page.keyboard.up("KeyD");
  await page.keyboard.down("KeyJ");
  await page.waitForTimeout(40);
  await page.keyboard.up("KeyJ");
  await page.keyboard.press("Escape");
  await page.keyboard.press("Escape");
  await page.waitForTimeout(150);

  await page.keyboard.down("KeyD");
  await page.waitForTimeout(4_000);
  await page.keyboard.down("Space");
  await page.waitForTimeout(160);
  await page.keyboard.up("Space");
  await page.waitForTimeout(80);
  await page.keyboard.down("Space");
  await page.waitForTimeout(650);
  await page.keyboard.up("Space");
  await page.waitForTimeout(250);
  await page.keyboard.up("KeyD");

  expect(runtimeErrors).toEqual([]);
  await expect(game).toHaveAttribute("data-player-health", "5");
  expect([...loadedCharacterAssets].sort()).toEqual([
    "/assets/characters/crystal-bat.png",
    "/assets/characters/shadow-sprout.png",
    "/assets/characters/thorn-beetle.png",
  ]);
});
