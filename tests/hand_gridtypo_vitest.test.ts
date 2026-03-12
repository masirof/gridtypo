// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import {
  defaultParams,
  createState,
  buildLayout,
  computeVerts,
  clickCellToFill,
  applyVertexDragRelease,
  isEdgeFilled,
  getBoundaryVertexKeys,
  clearCellByKey,
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

const parsePolygonPoints = (pointsText) =>
  (pointsText ?? "").split(" ").map((pair) => {
    const [x, y] = pair.split(",").map(Number);
    return { x, y };
  });

const createMergedVertexState = () => {
  const params = { ...defaultParams };
  const layout = buildLayout(573.26, 573.26, params);
  const state = createState();
  state.filledSquares.add("0,0");
  const result = applyVertexDragRelease(state, layout, "1,1", 286.63, 286.63, {
    magnetRadius: params.magnetRadius,
    mergeRadius: params.mergeRadius,
  });
  return { params, layout, state, result };
};

describe("hand_gridtypo の不変条件", () => {
  it("1マス塗ると四角形1つ、辺4本、頂点4つが出る", () => {
    const svg = createSvgWithSize(500);
    const params = { ...defaultParams };
    const layout = buildLayout(556.86, 556.86, params);
    const state = createState();

    clickCellToFill(state, "1,1", layout);
    renderGridSvg(svg, state, params, layout);

    expect(svg.querySelector('[data-type="face"][data-cell="1,1"]')).toBeTruthy();
    expect(svg.querySelectorAll('[data-type="edge"][data-cell="1,1"]').length).toBe(4);
    expect(svg.querySelectorAll('[data-type="vertex"]').length).toBe(4);
  });

  it("初期化するとグリッド点が正しく並ぶ", async () => {
    class FakeController {
      name() {
        return this;
      }
      onChange() {
        return this;
      }
    }
    class FakeGUI {
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

    expect(svg.querySelectorAll('[data-type="grid-point"]').length).toBe(defaultParams.cols * defaultParams.rows);

    delete globalThis.__HAND_GRIDTYPO_GUI__;
  });

  it("横に2マス塗ると共有している辺は消えて外周だけ残る", () => {
    const params = { ...defaultParams };
    const layout = buildLayout(500, 500, params);
    const state = createState();

    state.filledSquares.add("1,1");
    state.filledSquares.add("2,1");

    expect(isEdgeFilled(state, "1,1", "right", layout)).toBe(false);
    expect(isEdgeFilled(state, "2,1", "left", layout)).toBe(false);
    expect(isEdgeFilled(state, "1,1", "left", layout)).toBe(true);
    expect(isEdgeFilled(state, "1,1", "top", layout)).toBe(true);
    expect(isEdgeFilled(state, "1,1", "bottom", layout)).toBe(true);
    expect(isEdgeFilled(state, "2,1", "right", layout)).toBe(true);
    expect(isEdgeFilled(state, "2,1", "top", layout)).toBe(true);
    expect(isEdgeFilled(state, "2,1", "bottom", layout)).toBe(true);
    expect(getBoundaryVertexKeys(state, layout).size).toBe(6);
  });

  it("2x2で塗ると外周の辺は8本で頂点は8つになる", () => {
    const svg = createSvgWithSize(500);
    const params = { ...defaultParams };
    const layout = buildLayout(500, 500, params);
    const state = createState();

    state.filledSquares.add("1,1");
    state.filledSquares.add("2,1");
    state.filledSquares.add("1,2");
    state.filledSquares.add("2,2");

    renderGridSvg(svg, state, params, layout);

    expect(svg.querySelectorAll('[data-type="edge"]').length).toBe(8);
    expect(svg.querySelectorAll('[data-type="vertex"]').length).toBe(8);
  });

  it("横に並ぶ2セルは塗りを小さくしても間に隙間ができない", () => {
    const svg = createSvgWithSize(500);
    const params = { ...defaultParams, fillSize: 0.8 };
    const layout = buildLayout(500, 500, params);
    const state = createState();

    state.filledSquares.add("1,0");
    state.filledSquares.add("1,1");
    state.filledSquares.add("2,1");

    renderGridSvg(svg, state, params, layout);

    const leftFace = svg.querySelector('[data-type="face"][data-cell="1,1"]');
    const rightFace = svg.querySelector('[data-type="face"][data-cell="2,1"]');
    const leftPoints = parsePolygonPoints(leftFace?.getAttribute("points"));
    const rightPoints = parsePolygonPoints(rightFace?.getAttribute("points"));

    expect(leftPoints[1].x).toBe(rightPoints[0].x);
    expect(leftPoints[2].x).toBe(rightPoints[3].x);
    expect(leftPoints[1].y).toBe(rightPoints[0].y);
    expect(leftPoints[2].y).toBe(rightPoints[3].y);
  });

  it("頂点を別の交点へ動かすと移動元は移動先に正規化される", () => {
    const { layout, state, result } = createMergedVertexState();
    const { verts } = computeVerts(state, layout);
    const boundaryVertexKeys = getBoundaryVertexKeys(state, layout);

    expect(result.merged).toBe(true);
    expect(result.autoAdded).toEqual([]);
    expect(state.mergedTo.get("1,1")).toBe("2,2");
    expect(verts[1][1].x).toBeCloseTo(verts[2][2].x, 5);
    expect(verts[1][1].y).toBeCloseTo(verts[2][2].y, 5);
    expect(boundaryVertexKeys.has("1,1")).toBe(false);
    expect(boundaryVertexKeys.has("2,2")).toBe(true);
  });

  it("頂点を結合したあとに描画しても同じ場所に頂点が重ならない", () => {
    const svg = createSvgWithSize(500);
    const { params, layout, state, result } = createMergedVertexState();

    expect(result.merged).toBe(true);

    renderGridSvg(svg, state, params, layout);

    const vertices = Array.from(svg.querySelectorAll('[data-type="vertex"]'));
    const positions = vertices.map((vertex) => {
      const cx = Number(vertex.getAttribute("cx"));
      const cy = Number(vertex.getAttribute("cy"));
      return `${Math.round(cx)}|${Math.round(cy)}`;
    });

    expect(new Set(positions).size).toBe(vertices.length);
  });

  it("頂点を結合したあとにマスを消すと不要な移動記録も消える", () => {
    const { layout, state, result } = createMergedVertexState();

    expect(result.merged).toBe(true);
    expect(state.mergedTo.get("1,1")).toBe("2,2");
    expect(state.vertexOffsets.has("2,2")).toBe(true);

    clearCellByKey(state, "0,0");

    expect(state.filledSquares.has("0,0")).toBe(false);
    expect(state.filledSquares.size).toBe(0);
    expect(state.vertexOffsets.has("1,1")).toBe(false);
    expect(state.vertexOffsets.has("2,2")).toBe(false);
    expect(state.mergedTo.has("1,1")).toBe(false);

    const boundaryVertexKeys = getBoundaryVertexKeys(state, layout);
    expect(boundaryVertexKeys.size).toBe(0);
    expect(boundaryVertexKeys.has("2,2")).toBe(false);
  });
});
