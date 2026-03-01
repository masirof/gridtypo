// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import {
  defaultParams,
  createState,
  buildLayout,
  clickCellToFill,
  renderGridSvg,
} from "../src/hand_gridtypo_test_utils.ts";

describe("grid svg", () => {
it("セル(1,1)を塗って1面と4辺と4頂点が描画されるか", () => {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    const params = { ...defaultParams };
    const layout = buildLayout(500, 500, params);
    const state = createState();

    clickCellToFill(state, "1,1", layout);
    renderGridSvg(svg, state, params, layout);

    const face = svg.querySelector('[data-type="face"][data-cell="1,1"]');
    expect(face).toBeTruthy();

    const edges = svg.querySelectorAll('[data-type="edge"][data-cell="1,1"]');
    expect(edges.length).toBe(4);

    const vertices = svg.querySelectorAll('[data-type="vertex"]');
    expect(vertices.length).toBe(4);
  });
});
