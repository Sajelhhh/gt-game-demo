import { expect, test } from "@playwright/test";

test("loads the menu and enters the generated level", async ({ page }) => {
  await page.goto("/");

  const game = page.locator("#game");
  await expect(game.locator("canvas")).toBeVisible();
  await expect(game).toHaveAttribute("data-scene", "menu");

  await page.keyboard.press("Enter");
  await expect(game).toHaveAttribute("data-scene", "game");
});
