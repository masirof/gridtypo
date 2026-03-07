// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import {
  defaultParams,
  createState,
  buildLayout,
  clickCellToFill,
} from "../src/hand_gridtypo_core.ts";
import { renderGridSvg } from "../src/hand_gridtypo_view.ts";
import { initHandGridtypo1 } from "../src/hand_gridtypo1.ts";

const createSvgWithSize = (size) => {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("width", String(size));
  svg.setAttribute("height", String(size));
  svg.getBoundingClientRect = () => ({
    width: size,
    height: size,
    top: 0,
    left: 0,
    right: size,
    bottom: size,
    x: 0,
    y: 0,
    toJSON: () => {},
  });
  return svg;
};

describe("grid svg", () => {
  it("セル(1,1)を塗って1面・4辺・4頂点が描画される", () => {
    const svg = createSvgWithSize(500);
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

  it("初期描画でグリッド点が生成される", () => {
    const svg = createSvgWithSize(500);
    const params = { ...defaultParams };
    const layout = buildLayout(500, 500, params);
    const state = createState();

    renderGridSvg(svg, state, params, layout);

    const gridPoints = svg.querySelectorAll('[data-type="grid-point"]');
    expect(gridPoints.length).toBe(params.cols * params.rows);
  });

  it("初期描画でグリッド点が生成される 統合テスト", async () => {
    class FakeController {
      name() {
        return this;
      }
      onChange() {
        return this;
      }
    }
    class FakeGUI {
      constructor() {}
      add() {
        return new FakeController();
      }
      addColor() {
        return new FakeController();
      }
      save() {
        return { controllers: {}, folders: {} };
      }
      load() {}
      reset() {}
    }

    globalThis.__HAND_GRIDTYPO_GUI__ = { default: FakeGUI };

    document.body.innerHTML = `
      <div id="status"></div>
      <svg id="grid"></svg>
      <div id="gui"></div>
      <pre id="debug"></pre>
      <pre id="cell_debug"></pre>
    `;

    const svg = document.getElementById("grid");
    svg.getBoundingClientRect = () => ({
      width: 500,
      height: 500,
      top: 0,
      left: 0,
      right: 500,
      bottom: 500,
      x: 0,
      y: 0,
      toJSON: () => {},
    });

    await initHandGridtypo1();

    const gridPoints = svg.querySelectorAll('[data-type="grid-point"]');
    expect(gridPoints.length).toBe(defaultParams.cols * defaultParams.rows);

    delete globalThis.__HAND_GRIDTYPO_GUI__;
  });
});
