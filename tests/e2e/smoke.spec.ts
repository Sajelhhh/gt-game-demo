import { expect, test } from "@playwright/test";

test("loads the menu and enters the generated level", async ({ page }) => {
  const runtimeErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") runtimeErrors.push(message.text());
  });
  page.on("pageerror", (error) => runtimeErrors.push(error.message));

  await page.goto("/");

  const game = page.locator("#game");
  await expect(game.locator("canvas")).toBeVisible();
  await expect(game).toHaveAttribute("data-scene", "menu");

  await page.keyboard.press("Enter");
  await expect(game).toHaveAttribute("data-scene", "game");

  await page.keyboard.down("KeyD");
  await page.waitForTimeout(150);
  await page.keyboard.up("KeyD");
  await page.keyboard.press("KeyJ");
  await page.keyboard.press("Escape");
  await page.keyboard.press("Escape");
  await page.waitForTimeout(150);

  expect(runtimeErrors).toEqual([]);
});
