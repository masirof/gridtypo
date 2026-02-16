import { test } from "@playwright/test";

test("gridtypo2 loads without console errors", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (err) => errors.push(`pageerror: ${err.message}`));
  page.on("console", (msg) => {
    if (msg.type() === "error") {
      errors.push(`console: ${msg.text()}`);
    }
  });

  await page.goto("http://172.20.160.1:5500/gridtypo2.html", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(6000);

  if (errors.length) {
    throw new Error(`Errors:\n${errors.join("\n")}`);
  }
});
