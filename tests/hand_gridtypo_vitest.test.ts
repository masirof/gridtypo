// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import {
  defaultParams,
  createState,
  buildLayout,
  computeVerts,
  getBaseAt,
  clickCellToFill,
  applyVertexDragRelease,
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
    const layout = buildLayout(556.86, 556.86, params);
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

  it("セル(1,1)を塗り、頂点(1,1)を頂点(2,2)に移動", () => {
    const params = { ...defaultParams };
    const layout = buildLayout(500, 500, params);
    const state = createState();

    state.filledSquares.add("1,1");

    const base11 = getBaseAt(1, 1, layout);
    const base22 = getBaseAt(2, 2, layout);
    state.vertexOffsets.set("1,1", {
      dx: base22.x - base11.x,
      dy: base22.y - base11.y,
    });

    const { verts } = computeVerts(state, layout);
    expect(verts[1][1].x).toBeCloseTo(base22.x, 5);
    expect(verts[1][1].y).toBeCloseTo(base22.y, 5);
    expect(verts[1][1].y).toBeGreaterThan(base11.y);
  });

  it("頂点(1,1)を(295.20,291.77)付近へドラッグするとセルが増える", () => {
    const params = { ...defaultParams };
    const layout = buildLayout(573.26, 573.26, params);
    const state = createState();
    state.filledSquares.add("0,0");

    const targetX = 286.63;
    const targetY = 286.63;

    const result = applyVertexDragRelease(state, layout, "1,1", targetX, targetY, {
      magnetRadius: params.magnetRadius,
      mergeRadius: params.mergeRadius,
    });

    expect(result.merged).toBe(true);
    expect(result.autoAdded.length).toBe(4);
    expect(state.filledSquares.size).toBe(5);
    expect(state.filledSquares.has("0,0")).toBe(true);
    expect(state.filledSquares.has("1,1")).toBe(true);
    expect(state.filledSquares.has("1,2")).toBe(true);
    expect(state.filledSquares.has("2,1")).toBe(true);
    expect(state.filledSquares.has("2,2")).toBe(true);
  });
});
