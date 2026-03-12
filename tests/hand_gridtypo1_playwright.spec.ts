import { inflateSync } from "node:zlib";
import { test, expect } from "@playwright/test";

const parsePng = (buffer) => {
  const signature = "89504e470d0a1a0a";
  if (buffer.subarray(0, 8).toString("hex") !== signature) {
    throw new Error("Unsupported PNG signature");
  }

  let width = 0;
  let height = 0;
  let bytesPerPixel = 0;
  const idatChunks = [];
  let offset = 8;
  while (offset < buffer.length) {
    const length = buffer.readUInt32BE(offset);
    offset += 4;
    const type = buffer.subarray(offset, offset + 4).toString("ascii");
    offset += 4;
    const data = buffer.subarray(offset, offset + length);
    offset += length + 4;

    if (type === "IHDR") {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      const bitDepth = data[8];
      const colorType = data[9];
      const interlace = data[12];
      if (bitDepth !== 8 || interlace !== 0 || ![2, 6].includes(colorType)) {
        throw new Error("Unsupported PNG format");
      }
      bytesPerPixel = colorType === 6 ? 4 : 3;
    } else if (type === "IDAT") {
      idatChunks.push(data);
    } else if (type === "IEND") {
      break;
    }
  }

  const compressed = Buffer.concat(idatChunks);
  const inflated = inflateSync(compressed);
  const stride = width * bytesPerPixel;
  const pixels = Buffer.alloc(width * height * bytesPerPixel);
  let inOffset = 0;
  let outOffset = 0;
  let prevRow = Buffer.alloc(stride);

  const paeth = (a, b, c) => {
    const p = a + b - c;
    const pa = Math.abs(p - a);
    const pb = Math.abs(p - b);
    const pc = Math.abs(p - c);
    if (pa <= pb && pa <= pc) {
      return a;
    }
    if (pb <= pc) {
      return b;
    }
    return c;
  };

  for (let y = 0; y < height; y += 1) {
    const filter = inflated[inOffset];
    inOffset += 1;
    const row = Buffer.from(inflated.subarray(inOffset, inOffset + stride));
    inOffset += stride;

    if (filter === 1) {
      for (let i = bytesPerPixel; i < stride; i += 1) {
        row[i] = (row[i] + row[i - bytesPerPixel]) & 0xff;
      }
    } else if (filter === 2) {
      for (let i = 0; i < stride; i += 1) {
        row[i] = (row[i] + prevRow[i]) & 0xff;
      }
    } else if (filter === 3) {
      for (let i = 0; i < stride; i += 1) {
        const left = i >= bytesPerPixel ? row[i - bytesPerPixel] : 0;
        const up = prevRow[i];
        row[i] = (row[i] + Math.floor((left + up) / 2)) & 0xff;
      }
    } else if (filter === 4) {
      for (let i = 0; i < stride; i += 1) {
        const left = i >= bytesPerPixel ? row[i - bytesPerPixel] : 0;
        const up = prevRow[i];
        const upLeft = i >= bytesPerPixel ? prevRow[i - bytesPerPixel] : 0;
        row[i] = (row[i] + paeth(left, up, upLeft)) & 0xff;
      }
    } else if (filter !== 0) {
      throw new Error(`Unsupported PNG filter: ${filter}`);
    }

    row.copy(pixels, outOffset);
    prevRow = row;
    outOffset += stride;
  }

  return { width, height, bytesPerPixel, pixels };
};

const getPixel = (png, x, y) => {
  const index = (y * png.width + x) * png.bytesPerPixel;
  return {
    r: png.pixels[index],
    g: png.pixels[index + 1],
    b: png.pixels[index + 2],
    a: png.bytesPerPixel === 4 ? png.pixels[index + 3] : 255,
  };
};

const colorDistance = (a, b) =>
  Math.abs(a.r - b.r) + Math.abs(a.g - b.g) + Math.abs(a.b - b.b);

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
  await page.waitForTimeout(500);

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

test("セル2つの隙間がないか", async ({ page }) => {
  await page.setViewportSize({ width: 979, height: 622 });
  await page.goto("http://172.20.160.1:5500/hand_gridtypo1.html", {
    waitUntil: "domcontentloaded",
  });

  const grid = page.locator("#grid");
  await expect(page.locator('#grid [data-type="grid-point"][data-vertex="0,0"]')).toBeVisible({ timeout: 10000 });

  const centers = await page.evaluate(() => {
    const readVertex = (key) => {
      const point = document.querySelector(`[data-type="grid-point"][data-vertex="${key}"]`);
      if (!(point instanceof SVGCircleElement)) {
        throw new Error(`Grid point not found: ${key}`);
      }
      return {
        x: Number(point.getAttribute("cx")),
        y: Number(point.getAttribute("cy")),
      };
    };
    const centerOf = (a, b, c, d) => ({
      x: (a.x + b.x + c.x + d.x) / 4,
      y: (a.y + b.y + c.y + d.y) / 4,
    });
    const v00 = readVertex("0,0");
    const v10 = readVertex("1,0");
    const v20 = readVertex("2,0");
    const v01 = readVertex("0,1");
    const v11 = readVertex("1,1");
    const v21 = readVertex("2,1");
    return {
      first: centerOf(v00, v10, v01, v11),
      second: centerOf(v10, v20, v11, v21),
    };
  });

  await grid.click({ position: centers.first });
  await grid.click({ position: centers.second });
  await expect(page.locator('#grid [data-type="face"]')).toHaveCount(2, { timeout: 10000 });

  const seam = await page.evaluate(() => {
    const parsePoints = (text) =>
      (text ?? "").split(" ").map((pair) => {
        const [x, y] = pair.split(",").map(Number);
        return { x, y };
      });

    const left = document.querySelector('[data-type="face"][data-cell="0,0"]');
    const right = document.querySelector('[data-type="face"][data-cell="1,0"]');
    if (!(left instanceof SVGPolygonElement) || !(right instanceof SVGPolygonElement)) {
      throw new Error("Expected two face polygons");
    }

    const leftPoints = parsePoints(left.getAttribute("points"));
    const rightPoints = parsePoints(right.getAttribute("points"));
    const leftSharedTop = leftPoints[1];
    const leftSharedBottom = leftPoints[2];
    const rightSharedTop = rightPoints[0];
    const rightSharedBottom = rightPoints[3];

    return {
      seamX: (leftSharedTop.x + rightSharedTop.x + leftSharedBottom.x + rightSharedBottom.x) / 4,
      topY: Math.max(leftSharedTop.y, rightSharedTop.y),
      bottomY: Math.min(leftSharedBottom.y, rightSharedBottom.y),
      leftInnerX: (leftPoints[0].x + leftPoints[1].x) / 2,
      rightInnerX: (rightPoints[0].x + rightPoints[1].x) / 2,
    };
  });

  const dpr = await page.evaluate(() => window.devicePixelRatio);
  const screenshot = await grid.screenshot();
  const png = parsePng(screenshot);
  const seamX = Math.round(seam.seamX * dpr);
  const leftInnerX = Math.round(seam.leftInnerX * dpr);
  const rightInnerX = Math.round(seam.rightInnerX * dpr);
  const step = Math.max(1, Math.round(dpr));
  const topY = Math.round((seam.topY + 4) * dpr);
  const bottomY = Math.round((seam.bottomY - 4) * dpr);

  let worstDistance = 0;
  for (let y = topY; y <= bottomY; y += step) {
    const seamPixel = getPixel(png, seamX, y);
    const leftPixel = getPixel(png, leftInnerX, y);
    const rightPixel = getPixel(png, rightInnerX, y);
    const reference = {
      r: Math.round((leftPixel.r + rightPixel.r) / 2),
      g: Math.round((leftPixel.g + rightPixel.g) / 2),
      b: Math.round((leftPixel.b + rightPixel.b) / 2),
    };
    worstDistance = Math.max(worstDistance, colorDistance(seamPixel, reference));
  }

  expect(worstDistance).toBeLessThanOrEqual(10);
  await page.waitForTimeout(100);
});
