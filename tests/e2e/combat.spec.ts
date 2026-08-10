import { expect, test } from "@playwright/test";

test("player can win a close melee exchange", async ({ page }) => {
  test.setTimeout(60_000);
  const runtimeErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") runtimeErrors.push(message.text());
  });
  page.on("pageerror", (error) => runtimeErrors.push(error.message));

  await page.goto("/");
  const game = page.locator("#game");
  await expect(game).toHaveAttribute("data-scene", "menu");
  await page.keyboard.press("Enter");
  await expect(game).toHaveAttribute("data-scene", "game");

  // Build speed, then clear the shortened teaching pit with the second jump.
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

  // Keep advancing and attack through the first patrol enemy. A single
  // approach hit is acceptable; recurring contact damage while striking is not.
  for (let attack = 0; attack < 10; attack += 1) {
    await page.keyboard.down("KeyJ");
    await page.waitForTimeout(50);
    await page.keyboard.up("KeyJ");
    await page.waitForTimeout(330);
  }
  await page.keyboard.up("KeyD");
  await page.waitForTimeout(250);

  expect(runtimeErrors).toEqual([]);
  await expect(game).toHaveAttribute("data-player-health", "4");
  await expect(game).toHaveAttribute("data-defeated-enemies", "1");
});
