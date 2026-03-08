import { test, expect } from "@playwright/test";

test("hand_gridtypo1 shows grid points", async ({ page }) => {
  await page.goto("http://172.20.160.1:5500/hand_gridtypo1.html", {
    waitUntil: "domcontentloaded",
  });

  const gridPoints = page.locator('#grid [data-type="grid-point"]');
  await expect(gridPoints.first()).toBeVisible({ timeout: 10000 });
});

test("セル(1,1)を塗り、頂点(1,1)を頂点(2,2)に移動", async ({ page }) => {
  await page.setViewportSize({ width: 979, height: 622 });
  await page.goto("http://172.20.160.1:5500/hand_gridtypo1.html", {
    waitUntil: "domcontentloaded",
  });

  const grid = page.locator("#grid");
  const box = await grid.boundingBox();
  if (!box) {
    throw new Error("Grid bounding box not found");
  }

  const click1 = { x: box.x + 105.2615385055542, y: box.y + 107.8038444519043 };
  const click2 = { x: box.x + 171.2615385055542, y: box.y + 168.8038444519043 };
  const click3 = { x: box.x + 280.2615385055542, y: box.y + 280.8038444519043 };

  await page.mouse.click(click1.x, click1.y);
  await page.waitForSelector('#grid [data-type="vertex"]', { timeout: 10000 });
  await page.mouse.move(click2.x, click2.y);
  await page.mouse.down();
  await page.mouse.move(click3.x, click3.y, { steps: 10 });
  await page.waitForTimeout(500)

  await page.mouse.up();
  await page.waitForTimeout(100);
  await page.screenshot({ path: "test-results/hand_gridtypo1-after.png", fullPage: true });

  const debugText = await page.locator("#cell_debug").textContent();
  const summary = (debugText ?? "").split(/\n\n/)[0].trim();
  const expected = [
    "Filled cells (2): 0,0 1,1",
    "Boundary vertices (4): 0,0 0,1 1,0 1,1",
    "Boundary edges (4): (0,0,0,1) (0,0,1,0) (0,1,1,1) (1,0,1,1)",
  ];
  for (const line of expected) {
    expect(summary).toContain(line);
  }
});
