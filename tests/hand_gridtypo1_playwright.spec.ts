import { test, expect } from "@playwright/test";

test("hand_gridtypo1 shows grid points", async ({ page }) => {
  await page.goto("http://172.20.160.1:5500/hand_gridtypo1.html", {
    waitUntil: "domcontentloaded",
  });

  const gridPoints = page.locator('#grid [data-type="grid-point"]');
  await expect(gridPoints.first()).toBeVisible({ timeout: 10000 });
});
