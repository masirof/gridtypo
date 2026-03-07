// src/hand_gridtypo_core.ts
var defaultParams = {
  cols: 5,
  rows: 5,
  dotRadius: 4,
  dotColor: "#ffffff",
  padding: 60,
  fillColor: "#e8481e",
  fillSize: 1,
  edgeColor: "#9f9f9f",
  edgeThickness: 6,
  vertexGrabRadius: 14,
  magnetRadius: 16,
  mergeRadius: 12
};
function createState() {
  return {
    filledSquares: /* @__PURE__ */ new Set(),
    vertexOffsets: /* @__PURE__ */ new Map(),
    mergedTo: /* @__PURE__ */ new Map()
  };
}
function buildLayout(width, height, params) {
  const cols = Math.max(1, Math.floor(params.cols));
  const rows = Math.max(1, Math.floor(params.rows));
  const pad = Math.max(0, params.padding);
  const innerW = Math.max(1, width - pad * 2);
  const innerH = Math.max(1, height - pad * 2);
  const cellW = cols === 1 ? innerW : innerW / (cols - 1);
  const cellH = rows === 1 ? innerH : innerH / (rows - 1);
  return { width, height, cols, rows, pad, innerW, innerH, cellW, cellH };
}
function getBaseAt(ix, iy, layout) {
  const { cols, rows, pad, innerW, innerH } = layout;
  const tx = cols === 1 ? 0.5 : ix / (cols - 1);
  const ty = rows === 1 ? 0.5 : iy / (rows - 1);
  return { x: pad + innerW * tx, y: pad + innerH * ty };
}
function getRootVertex(state, key) {
  let current = key;
  const seen = /* @__PURE__ */ new Set();
  while (state.mergedTo.has(current)) {
    if (seen.has(current)) {
      break;
    }
    seen.add(current);
    current = state.mergedTo.get(current);
  }
  return current;
}
function normalizeVertexKey(state, key) {
  return getRootVertex(state, key);
}
function computeVerts(state, layout) {
  const { rows, cols } = layout;
  const baseVerts = Array.from({ length: rows }, () => Array(cols).fill(null));
  const verts = Array.from({ length: rows }, () => Array(cols).fill(null));
  for (let y = 0; y < rows; y += 1) {
    for (let x = 0; x < cols; x += 1) {
      const key = `${x},${y}`;
      const rootKey = getRootVertex(state, key);
      const offset = state.vertexOffsets.get(rootKey) || { dx: 0, dy: 0 };
      const base = getBaseAt(x, y, layout);
      baseVerts[y][x] = base;
      const [rx, ry] = rootKey.split(",").map((v) => Number(v));
      const rootBase = Number.isNaN(rx) || Number.isNaN(ry) ? base : getBaseAt(rx, ry, layout);
      verts[y][x] = { x: rootBase.x + offset.dx, y: rootBase.y + offset.dy };
    }
  }
  return { baseVerts, verts };
}
function getCellKeysFromPosition(x, y, layout) {
  const { cols, rows, pad, innerW, innerH, cellW, cellH } = layout;
  if (x < pad || y < pad || x > pad + innerW || y > pad + innerH) {
    return [];
  }
  const maxX = Math.max(0, cols - 2);
  const maxY = Math.max(0, rows - 2);
  const gx = (x - pad) / cellW;
  const gy = (y - pad) / cellH;
  const baseX = Math.min(maxX, Math.max(0, Math.floor(gx)));
  const baseY = Math.min(maxY, Math.max(0, Math.floor(gy)));
  const epsPx = 2;
  const xKeys = /* @__PURE__ */ new Set([baseX]);
  const yKeys = /* @__PURE__ */ new Set([baseY]);
  const nearestX = Math.round(gx);
  const nearestY = Math.round(gy);
  if (Math.abs((gx - nearestX) * cellW) <= epsPx) {
    const left = nearestX - 1;
    const right = nearestX;
    if (left >= 0 && left <= maxX) {
      xKeys.add(left);
    }
    if (right >= 0 && right <= maxX) {
      xKeys.add(right);
    }
  }
  if (Math.abs((gy - nearestY) * cellH) <= epsPx) {
    const top = nearestY - 1;
    const bottom = nearestY;
    if (top >= 0 && top <= maxY) {
      yKeys.add(top);
    }
    if (bottom >= 0 && bottom <= maxY) {
      yKeys.add(bottom);
    }
  }
  const keys = [];
  for (const cx of xKeys) {
    for (const cy of yKeys) {
      keys.push(`${cx},${cy}`);
    }
  }
  return keys;
}
function isFaceFilled(state, cellKey) {
  return state.filledSquares.has(cellKey);
}
function isEdgeFilled(state, cellKey, edge, layout) {
  if (!cellKey) {
    return false;
  }
  const [cx, cy] = cellKey.split(",").map((v) => Number(v));
  if (Number.isNaN(cx) || Number.isNaN(cy)) {
    return false;
  }
  const { cols, rows } = layout;
  const leftKey = `${cx - 1},${cy}`;
  const rightKey = `${cx + 1},${cy}`;
  const upKey = `${cx},${cy - 1}`;
  const downKey = `${cx},${cy + 1}`;
  if (edge === "left") {
    return cx === 0 || !state.filledSquares.has(leftKey);
  }
  if (edge === "right") {
    return cx === cols - 2 || !state.filledSquares.has(rightKey);
  }
  if (edge === "top") {
    return cy === 0 || !state.filledSquares.has(upKey);
  }
  if (edge === "bottom") {
    return cy === rows - 2 || !state.filledSquares.has(downKey);
  }
  return false;
}
function getBoundaryVertexKeys(state, layout) {
  const { cols, rows } = layout;
  const boundaryVertexKeys = /* @__PURE__ */ new Set();
  for (const key of state.filledSquares) {
    const [cx, cy] = key.split(",").map((v) => Number(v));
    if (Number.isNaN(cx) || Number.isNaN(cy)) {
      continue;
    }
    const leftKey = `${cx - 1},${cy}`;
    const rightKey = `${cx + 1},${cy}`;
    const upKey = `${cx},${cy - 1}`;
    const downKey = `${cx},${cy + 1}`;
    if (cx === 0 || !state.filledSquares.has(leftKey)) {
      boundaryVertexKeys.add(normalizeVertexKey(state, `${cx},${cy}`));
      boundaryVertexKeys.add(normalizeVertexKey(state, `${cx},${cy + 1}`));
    }
    if (cx === cols - 2 || !state.filledSquares.has(rightKey)) {
      boundaryVertexKeys.add(normalizeVertexKey(state, `${cx + 1},${cy}`));
      boundaryVertexKeys.add(normalizeVertexKey(state, `${cx + 1},${cy + 1}`));
    }
    if (cy === 0 || !state.filledSquares.has(upKey)) {
      boundaryVertexKeys.add(normalizeVertexKey(state, `${cx},${cy}`));
      boundaryVertexKeys.add(normalizeVertexKey(state, `${cx + 1},${cy}`));
    }
    if (cy === rows - 2 || !state.filledSquares.has(downKey)) {
      boundaryVertexKeys.add(normalizeVertexKey(state, `${cx},${cy + 1}`));
      boundaryVertexKeys.add(normalizeVertexKey(state, `${cx + 1},${cy + 1}`));
    }
  }
  return boundaryVertexKeys;
}
function isVertexFilled(state, vertexKey, layout) {
  const boundary = getBoundaryVertexKeys(state, layout);
  return boundary.has(normalizeVertexKey(state, vertexKey));
}
function cellHasVertexData(state, cellKey, layout) {
  if (!cellKey) {
    return false;
  }
  const rootKeys = /* @__PURE__ */ new Set();
  for (const key of state.vertexOffsets.keys()) {
    rootKeys.add(getRootVertex(state, key));
  }
  for (const target of state.mergedTo.values()) {
    rootKeys.add(getRootVertex(state, target));
  }
  for (const rootKey of rootKeys) {
    const [rx, ry] = rootKey.split(",").map((v) => Number(v));
    if (Number.isNaN(rx) || Number.isNaN(ry)) {
      continue;
    }
    const base = getBaseAt(rx, ry, layout);
    const offset = state.vertexOffsets.get(rootKey) || { dx: 0, dy: 0 };
    const px = base.x + offset.dx;
    const py = base.y + offset.dy;
    const atCells = getCellKeysFromPosition(px, py, layout);
    if (atCells.includes(cellKey)) {
      return true;
    }
  }
  return false;
}
function clickCellToFill(state, cellKey, layout) {
  if (!cellKey) {
    return { action: "none" };
  }
  const shouldClear = isFaceFilled(state, cellKey) || cellHasVertexData(state, cellKey, layout);
  if (shouldClear) {
    const { hadCell } = clearCellByKey(state, cellKey);
    return { action: hadCell ? "cleared" : "vertexCleared" };
  }
  state.filledSquares.add(cellKey);
  return { action: "filled" };
}
function clearCellByKey(state, cellKey) {
  if (!cellKey) {
    return { hadCell: false };
  }
  const hadCell = state.filledSquares.delete(cellKey);
  clearCellVertexOffsets(state, cellKey);
  pruneVertexOffsets(state);
  return { hadCell };
}
function clearCellVertexOffsets(state, cellKey) {
  const [cx, cy] = cellKey.split(",").map((v) => Number(v));
  if (Number.isNaN(cx) || Number.isNaN(cy)) {
    return;
  }
  const keys = [
    `${cx},${cy}`,
    `${cx + 1},${cy}`,
    `${cx},${cy + 1}`,
    `${cx + 1},${cy + 1}`
  ];
  for (const key of keys) {
    state.vertexOffsets.delete(key);
    state.mergedTo.delete(key);
  }
}
function pruneVertexOffsets(state) {
  const active = /* @__PURE__ */ new Set();
  for (const key of state.filledSquares) {
    const [cx, cy] = key.split(",").map((v) => Number(v));
    if (Number.isNaN(cx) || Number.isNaN(cy)) {
      continue;
    }
    active.add(`${cx},${cy}`);
    active.add(`${cx + 1},${cy}`);
    active.add(`${cx},${cy + 1}`);
    active.add(`${cx + 1},${cy + 1}`);
  }
  for (const key of state.vertexOffsets.keys()) {
    if (!active.has(key)) {
      state.vertexOffsets.delete(key);
    }
  }
  for (const key of state.mergedTo.keys()) {
    if (!active.has(key)) {
      state.mergedTo.delete(key);
    }
  }
}

// src/hand_gridtypo_view.ts
function renderGridSvg(svg, state, params, layout) {
  while (svg.firstChild) {
    svg.removeChild(svg.firstChild);
  }
  const { baseVerts, verts } = computeVerts(state, layout);
  const { cols, rows } = layout;
  const svgEl = (tag, attrs = {}) => {
    const el = svg.ownerDocument ? svg.ownerDocument.createElementNS("http://www.w3.org/2000/svg", tag) : document.createElementNS("http://www.w3.org/2000/svg", tag);
    for (const [key, value] of Object.entries(attrs)) {
      el.setAttribute(key, String(value));
    }
    return el;
  };
  const facesGroup = svgEl("g", { "data-layer": "faces" });
  const edgesGroup = svgEl("g", { "data-layer": "edges" });
  const dotsGroup = svgEl("g", { "data-layer": "dots" });
  const verticesGroup = svgEl("g", { "data-layer": "vertices" });
  svg.appendChild(facesGroup);
  svg.appendChild(edgesGroup);
  svg.appendChild(dotsGroup);
  svg.appendChild(verticesGroup);
  for (const key of state.filledSquares) {
    const [cx, cy] = key.split(",").map((v) => Number(v));
    if (Number.isNaN(cx) || Number.isNaN(cy)) {
      continue;
    }
    const v00 = verts[cy]?.[cx];
    const v10 = verts[cy]?.[cx + 1];
    const v11 = verts[cy + 1]?.[cx + 1];
    const v01 = verts[cy + 1]?.[cx];
    if (!v00 || !v10 || !v11 || !v01) {
      continue;
    }
    let p0 = { ...v00 };
    let p1 = { ...v10 };
    let p2 = { ...v11 };
    let p3 = { ...v01 };
    if (params.fillSize < 0.999) {
      const cxm = (p0.x + p1.x + p2.x + p3.x) / 4;
      const cym = (p0.y + p1.y + p2.y + p3.y) / 4;
      p0 = { x: cxm + (p0.x - cxm) * params.fillSize, y: cym + (p0.y - cym) * params.fillSize };
      p1 = { x: cxm + (p1.x - cxm) * params.fillSize, y: cym + (p1.y - cym) * params.fillSize };
      p2 = { x: cxm + (p2.x - cxm) * params.fillSize, y: cym + (p2.y - cym) * params.fillSize };
      p3 = { x: cxm + (p3.x - cxm) * params.fillSize, y: cym + (p3.y - cym) * params.fillSize };
    } else {
      p0 = { x: Math.round(p0.x), y: Math.round(p0.y) };
      p1 = { x: Math.round(p1.x), y: Math.round(p1.y) };
      p2 = { x: Math.round(p2.x), y: Math.round(p2.y) };
      p3 = { x: Math.round(p3.x), y: Math.round(p3.y) };
    }
    const points = `${p0.x},${p0.y} ${p1.x},${p1.y} ${p2.x},${p2.y} ${p3.x},${p3.y}`;
    facesGroup.appendChild(
      svgEl("polygon", {
        points,
        fill: params.fillColor,
        "data-type": "face",
        "data-cell": key
      })
    );
  }
  const boundaryVertexKeys = getBoundaryVertexKeys(state, layout);
  for (const key of state.filledSquares) {
    const [cx, cy] = key.split(",").map((v) => Number(v));
    if (Number.isNaN(cx) || Number.isNaN(cy)) {
      continue;
    }
    const v00 = verts[cy]?.[cx];
    const v10 = verts[cy]?.[cx + 1];
    const v11 = verts[cy + 1]?.[cx + 1];
    const v01 = verts[cy + 1]?.[cx];
    if (!v00 || !v10 || !v11 || !v01) {
      continue;
    }
    const leftKey = `${cx - 1},${cy}`;
    const rightKey = `${cx + 1},${cy}`;
    const upKey = `${cx},${cy - 1}`;
    const downKey = `${cx},${cy + 1}`;
    if (cx === 0 || !state.filledSquares.has(leftKey)) {
      edgesGroup.appendChild(
        svgEl("line", {
          x1: v00.x,
          y1: v00.y,
          x2: v01.x,
          y2: v01.y,
          stroke: params.edgeColor,
          "stroke-width": params.edgeThickness,
          "data-type": "edge",
          "data-edge": "left",
          "data-cell": key
        })
      );
    }
    if (cx === cols - 2 || !state.filledSquares.has(rightKey)) {
      edgesGroup.appendChild(
        svgEl("line", {
          x1: v10.x,
          y1: v10.y,
          x2: v11.x,
          y2: v11.y,
          stroke: params.edgeColor,
          "stroke-width": params.edgeThickness,
          "data-type": "edge",
          "data-edge": "right",
          "data-cell": key
        })
      );
    }
    if (cy === 0 || !state.filledSquares.has(upKey)) {
      edgesGroup.appendChild(
        svgEl("line", {
          x1: v00.x,
          y1: v00.y,
          x2: v10.x,
          y2: v10.y,
          stroke: params.edgeColor,
          "stroke-width": params.edgeThickness,
          "data-type": "edge",
          "data-edge": "top",
          "data-cell": key
        })
      );
    }
    if (cy === rows - 2 || !state.filledSquares.has(downKey)) {
      edgesGroup.appendChild(
        svgEl("line", {
          x1: v01.x,
          y1: v01.y,
          x2: v11.x,
          y2: v11.y,
          stroke: params.edgeColor,
          "stroke-width": params.edgeThickness,
          "data-type": "edge",
          "data-edge": "bottom",
          "data-cell": key
        })
      );
    }
  }
  for (let y = 0; y < rows; y += 1) {
    for (let x = 0; x < cols; x += 1) {
      const v = baseVerts[y][x];
      if (!v) {
        continue;
      }
      dotsGroup.appendChild(
        svgEl("circle", {
          cx: v.x,
          cy: v.y,
          r: params.dotRadius,
          fill: params.dotColor,
          "data-type": "grid-point",
          "data-vertex": `${x},${y}`
        })
      );
    }
  }
  if (state.filledSquares.size > 0) {
    const drawnPositions = /* @__PURE__ */ new Set();
    const vertexRadius = Math.max(2, Math.floor(params.edgeThickness));
    for (const vKey of boundaryVertexKeys) {
      const [vx, vy] = vKey.split(",").map((v2) => Number(v2));
      const v = verts[vy]?.[vx];
      if (!v) {
        continue;
      }
      const posKey = `${Math.round(v.x)}|${Math.round(v.y)}`;
      if (drawnPositions.has(posKey)) {
        continue;
      }
      drawnPositions.add(posKey);
      verticesGroup.appendChild(
        svgEl("circle", {
          cx: v.x,
          cy: v.y,
          r: vertexRadius,
          fill: params.edgeColor,
          "data-type": "vertex",
          "data-vertex": `${vx},${vy}`
        })
      );
    }
  }
  return boundaryVertexKeys;
}

// src/hand_gridtypo1.ts
async function initHandGridtypo1() {
  const guiModule = globalThis.__HAND_GRIDTYPO_GUI__ ?? await import("https://cdn.jsdelivr.net/npm/lil-gui@0.19/+esm");
  const { default: GUI } = guiModule;
  const svg = document.getElementById("grid");
  const statusEl = document.getElementById("status");
  const debugEl = document.getElementById("debug");
  const cellDebugEl = document.getElementById("cell_debug");
  const guiHost = document.getElementById("gui");
  const params = { ...defaultParams };
  const STORAGE_KEY = "hand-gridtypo1-lilgui";
  const state = createState();
  const cellLogLines = [];
  let lastLayout = null;
  let lastBoundaryVertexKeys = /* @__PURE__ */ new Set();
  function log(message) {
    const time = (/* @__PURE__ */ new Date()).toISOString().slice(11, 19);
    debugEl.textContent = `[${time}] ${message}
` + debugEl.textContent;
  }
  function logCell(message) {
    const time = (/* @__PURE__ */ new Date()).toISOString().slice(11, 19);
    cellLogLines.unshift(`[${time}] ${message}`);
    renderCellDebug();
  }
  function renderCellDebug() {
    const filledList = Array.from(state.filledSquares.values()).sort();
    const vertexList = Array.from(lastBoundaryVertexKeys.values()).sort();
    const movedList = [];
    for (const [key, offset] of state.vertexOffsets.entries()) {
      movedList.push(`${key} dx=${offset.dx.toFixed(2)} dy=${offset.dy.toFixed(2)}`);
    }
    movedList.sort();
    const mergedList = [];
    for (const [key, target] of state.mergedTo.entries()) {
      mergedList.push(`${key} -> ${target}`);
    }
    mergedList.sort();
    const summary = [
      `Filled cells (${filledList.length}): ${filledList.join(" ") || "-"}`,
      `Boundary vertices (${vertexList.length}): ${vertexList.join(" ") || "-"}`,
      `Moved vertices (${movedList.length}): ${movedList.join(" | ") || "-"}`,
      `Merged vertices (${mergedList.length}): ${mergedList.join(" | ") || "-"}`
    ].join("\n");
    cellDebugEl.textContent = `${summary}

${cellLogLines.join("\n")}`.trim();
  }
  function setStatus(text) {
    statusEl.textContent = text;
    log(text);
  }
  function resizeSvg() {
    const rect = svg.getBoundingClientRect();
    const size = Math.max(1, Math.floor(rect.width));
    svg.setAttribute("width", size);
    svg.setAttribute("height", size);
    svg.setAttribute("viewBox", `0 0 ${size} ${size}`);
  }
  function buildLayout2() {
    resizeSvg();
    const width = svg.getBoundingClientRect().width;
    const height = svg.getBoundingClientRect().width;
    const layout = buildLayout(width, height, params);
    const { baseVerts, verts } = computeVerts(state, layout);
    lastLayout = { ...layout, baseVerts, verts };
  }
  function drawGrid() {
    buildLayout2();
    if (!lastLayout) {
      return;
    }
    const boundaryVertexKeys = renderGridSvg(svg, state, params, lastLayout);
    lastBoundaryVertexKeys = new Set(boundaryVertexKeys);
    if (!draggingVertexKey) {
      renderCellDebug();
    }
  }
  const gui = new GUI({ container: guiHost, title: "Grid" });
  gui.add(params, "cols", 1, 50, 1).name("n(\u6A2A)").onChange(drawGrid);
  gui.add(params, "rows", 1, 50, 1).name("n(\u7E26)").onChange(drawGrid);
  gui.add(params, "dotRadius", 1, 10, 1).name("dotRadius").onChange(drawGrid);
  gui.addColor(params, "dotColor").name("dotColor").onChange(drawGrid);
  gui.add(params, "padding", 0, 80, 1).name("padding").onChange(drawGrid);
  gui.addColor(params, "fillColor").name("fillColor").onChange(drawGrid);
  gui.add(params, "fillSize", 0.2, 1, 0.05).name("fillSize").onChange(drawGrid);
  gui.addColor(params, "edgeColor").name("edgeColor").onChange(drawGrid);
  gui.add(params, "edgeThickness", 1, 10, 1).name("edgeThickness").onChange(drawGrid);
  gui.add(params, "vertexGrabRadius", 6, 30, 1).name("vertexGrabRadius").onChange(drawGrid);
  gui.add(params, "magnetRadius", 4, 40, 1).name("magnetRadius").onChange(drawGrid);
  gui.add(params, "mergeRadius", 2, 40, 1).name("mergeRadius").onChange(drawGrid);
  const copyText = async (text) => {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return;
    }
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    document.execCommand("copy");
    document.body.removeChild(textarea);
  };
  const io = {
    save: () => {
      const data = gui.save();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      setStatus("Preset saved");
    },
    load: () => {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) {
        setStatus("No preset saved");
        return;
      }
      gui.load(JSON.parse(saved));
      drawGrid();
      setStatus("Preset loaded");
    },
    reset: () => {
      gui.reset();
      drawGrid();
      setStatus("Preset reset");
    },
    copy: async () => {
      const data = gui.save();
      await copyText(JSON.stringify(data, null, 2));
      setStatus("Preset copied");
    }
  };
  gui.add(io, "save").name("save preset");
  gui.add(io, "load").name("load preset");
  gui.add(io, "reset").name("reset");
  gui.add(io, "copy").name("copy preset");
  function cellFromPoint(x, y) {
    const width = svg.getBoundingClientRect().width;
    const height = svg.getBoundingClientRect().width;
    const cols = Math.max(1, Math.floor(params.cols));
    const rows = Math.max(1, Math.floor(params.rows));
    const pad = Math.max(0, params.padding);
    const innerW = Math.max(1, width - pad * 2);
    const innerH = Math.max(1, height - pad * 2);
    if (x < pad || y < pad || x > pad + innerW || y > pad + innerH) {
      return null;
    }
    const cellW = cols === 1 ? innerW : innerW / (cols - 1);
    const cellH = rows === 1 ? innerH : innerH / (rows - 1);
    const maxX = Math.max(0, cols - 2);
    const maxY = Math.max(0, rows - 2);
    const cx = Math.min(maxX, Math.max(0, Math.floor((x - pad) / cellW)));
    const cy = Math.min(maxY, Math.max(0, Math.floor((y - pad) / cellH)));
    return { cx, cy };
  }
  function keyFromPoint(x, y) {
    const cell = cellFromPoint(x, y);
    if (!cell) {
      return null;
    }
    return `${cell.cx},${cell.cy}`;
  }
  function setSquareByKey(key, filled) {
    if (!key) {
      return false;
    }
    const has = state.filledSquares.has(key);
    if (filled) {
      if (!has) {
        state.filledSquares.add(key);
        logCell(`Cell filled: ${key}`);
        return true;
      }
      return false;
    }
    if (state.filledSquares.has(key)) {
      clearCellByKey(state, key);
      logCell(`Cell cleared: ${key}`);
      return true;
    } else {
      state.filledSquares.add(key);
      logCell(`Cell toggled on: ${key}`);
      return true;
    }
  }
  function clearCellByKey2(key) {
    if (!key) {
      return false;
    }
    const { hadCell } = clearCellByKey(state, key);
    if (hadCell) {
      logCell(`Cell cleared: ${key}`);
    } else {
      logCell(`Cell vertex cleared: ${key}`);
    }
    return true;
  }
  function setSquareAt(x, y, filled) {
    const key = keyFromPoint(x, y);
    return setSquareByKey(key, filled);
  }
  function getCellKeysFromPosition2(x, y, layout) {
    return getCellKeysFromPosition(x, y, layout);
  }
  function cellHasVertexData2(cellKey) {
    if (!lastLayout) {
      buildLayout2();
    }
    if (!lastLayout) {
      return false;
    }
    return cellHasVertexData(state, cellKey, lastLayout);
  }
  function toggleSquareAt(x, y) {
    if (setSquareAt(x, y, null)) {
      drawGrid();
    }
  }
  let isPainting = false;
  let paintValue = true;
  let lastPaintKey = null;
  let draggingVertexKey = null;
  let dragStartOffset = null;
  let dragLastOffset = null;
  let pendingDraw = false;
  function scheduleDraw() {
    if (pendingDraw) {
      return;
    }
    pendingDraw = true;
    requestAnimationFrame(() => {
      pendingDraw = false;
      drawGrid();
    });
  }
  function findNearestVertex(x, y) {
    if (state.filledSquares.size === 0) {
      return null;
    }
    if (!lastLayout) {
      return null;
    }
    const { cols, rows, verts } = lastLayout;
    const vertexKeys = /* @__PURE__ */ new Set();
    for (const key of state.filledSquares) {
      const [cx, cy] = key.split(",").map((v) => Number(v));
      if (Number.isNaN(cx) || Number.isNaN(cy)) {
        continue;
      }
      const leftKey = `${cx - 1},${cy}`;
      const rightKey = `${cx + 1},${cy}`;
      const upKey = `${cx},${cy - 1}`;
      const downKey = `${cx},${cy + 1}`;
      if (cx === 0 || !state.filledSquares.has(leftKey)) {
        vertexKeys.add(normalizeVertexKey(state, `${cx},${cy}`));
        vertexKeys.add(normalizeVertexKey(state, `${cx},${cy + 1}`));
      }
      if (cx === cols - 2 || !state.filledSquares.has(rightKey)) {
        vertexKeys.add(normalizeVertexKey(state, `${cx + 1},${cy}`));
        vertexKeys.add(normalizeVertexKey(state, `${cx + 1},${cy + 1}`));
      }
      if (cy === 0 || !state.filledSquares.has(upKey)) {
        vertexKeys.add(normalizeVertexKey(state, `${cx},${cy}`));
        vertexKeys.add(normalizeVertexKey(state, `${cx + 1},${cy}`));
      }
      if (cy === rows - 2 || !state.filledSquares.has(downKey)) {
        vertexKeys.add(normalizeVertexKey(state, `${cx},${cy + 1}`));
        vertexKeys.add(normalizeVertexKey(state, `${cx + 1},${cy + 1}`));
      }
    }
    let best = null;
    let bestDist = Infinity;
    for (const vKey of vertexKeys) {
      const [vx, vy] = vKey.split(",").map((v2) => Number(v2));
      const v = verts[vy]?.[vx];
      if (!v) {
        continue;
      }
      const dx = v.x - x;
      const dy = v.y - y;
      const d2 = dx * dx + dy * dy;
      if (d2 < bestDist) {
        bestDist = d2;
        best = { x: vx, y: vy, pos: v, dist: Math.sqrt(d2) };
      }
    }
    if (!best || best.dist > params.vertexGrabRadius) {
      return null;
    }
    const rootKey = getRootVertex(state, `${best.x},${best.y}`);
    const [rx, ry] = rootKey.split(",").map((v) => Number(v));
    return { x: rx, y: ry, pos: best.pos, dist: best.dist };
  }
  function snapToMagnet(x, y, excludeKey) {
    if (!lastLayout) {
      return { x, y };
    }
    const { cols, rows, baseVerts } = lastLayout;
    let best = null;
    let bestDist = params.magnetRadius;
    for (let vy = 0; vy < rows; vy += 1) {
      for (let vx = 0; vx < cols; vx += 1) {
        const base = baseVerts[vy][vx];
        const dx = base.x - x;
        const dy = base.y - y;
        const dist = Math.hypot(dx, dy);
        if (dist <= bestDist) {
          bestDist = dist;
          best = { x: base.x, y: base.y };
        }
      }
    }
    return best ? best : { x, y };
  }
  function snapToMerge(x, y, excludeKey) {
    if (!lastLayout) {
      return { x, y, key: null, source: null, dist: Infinity };
    }
    const { cols, rows, baseVerts, verts } = lastLayout;
    let best = null;
    let bestDist = params.mergeRadius;
    let bestKey = null;
    let bestSource = null;
    for (let vy = 0; vy < rows; vy += 1) {
      for (let vx = 0; vx < cols; vx += 1) {
        const key = `${vx},${vy}`;
        const base = baseVerts[vy][vx];
        const moved = verts[vy][vx];
        const candidates = key === excludeKey ? [base] : [base, moved];
        for (const v of candidates) {
          const dx = v.x - x;
          const dy = v.y - y;
          const dist = Math.hypot(dx, dy);
          if (dist <= bestDist) {
            bestDist = dist;
            best = { x: v.x, y: v.y };
            bestKey = key;
            bestSource = v === moved ? "moved" : "base";
          }
        }
      }
    }
    return best ? { ...best, key: bestKey, source: bestSource, dist: bestDist } : { x, y, key: null, source: null, dist: Infinity };
  }
  svg.addEventListener("contextmenu", (event) => {
    event.preventDefault();
  });
  svg.addEventListener("pointerdown", (event) => {
    const rect = svg.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    if (event.button === 0) {
      const key = keyFromPoint(x, y);
      const nearest = findNearestVertex(x, y);
      if (nearest) {
        draggingVertexKey = `${nearest.x},${nearest.y}`;
        isPainting = false;
        lastPaintKey = null;
        state.mergedTo.delete(draggingVertexKey);
        dragStartOffset = state.vertexOffsets.get(draggingVertexKey) || { dx: 0, dy: 0 };
        dragLastOffset = dragStartOffset;
        svg.setPointerCapture(event.pointerId);
      } else {
        if (!key) {
          return;
        }
        const shouldClear = state.filledSquares.has(key) || cellHasVertexData2(key);
        if (shouldClear) {
          isPainting = true;
          paintValue = false;
          lastPaintKey = key;
          svg.setPointerCapture(event.pointerId);
          clearCellByKey2(key);
          scheduleDraw();
          return;
        }
        isPainting = false;
        paintValue = false;
        lastPaintKey = null;
        draggingVertexKey = null;
        isPainting = true;
        paintValue = true;
        lastPaintKey = key;
        svg.setPointerCapture(event.pointerId);
        if (setSquareByKey(key, true)) {
          scheduleDraw();
        }
      }
    } else if (event.button === 2) {
      isPainting = true;
      paintValue = true;
      lastPaintKey = null;
      draggingVertexKey = null;
      svg.setPointerCapture(event.pointerId);
      if (setSquareAt(x, y, paintValue)) {
        scheduleDraw();
      }
    }
  });
  svg.addEventListener("pointermove", (event) => {
    const rect = svg.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    if (draggingVertexKey) {
      if (!lastLayout) {
        return;
      }
      const [vx, vy] = draggingVertexKey.split(",").map((v) => Number(v));
      const base = lastLayout.baseVerts[vy]?.[vx];
      if (!base) {
        return;
      }
      const snapped = snapToMagnet(x, y, draggingVertexKey);
      const offset = { dx: snapped.x - base.x, dy: snapped.y - base.y };
      state.vertexOffsets.set(draggingVertexKey, offset);
      dragLastOffset = offset;
      scheduleDraw();
      return;
    }
    if (!isPainting) {
      return;
    }
    const key = keyFromPoint(x, y);
    if (!key || key === lastPaintKey) {
      return;
    }
    lastPaintKey = key;
    if (setSquareByKey(key, paintValue)) {
      scheduleDraw();
    }
  });
  svg.addEventListener("pointerup", (event) => {
    const rect = svg.getBoundingClientRect();
    const upX = event.clientX - rect.left;
    const upY = event.clientY - rect.top;
    if (isPainting) {
      isPainting = false;
      lastPaintKey = null;
      svg.releasePointerCapture(event.pointerId);
    }
    if (draggingVertexKey) {
      if (dragStartOffset && dragLastOffset) {
        const dx = dragLastOffset.dx - dragStartOffset.dx;
        const dy = dragLastOffset.dy - dragStartOffset.dy;
        if (Math.abs(dx) > 0.01 || Math.abs(dy) > 0.01) {
          logCell(`Vertex moved: ${draggingVertexKey} dx=${dragLastOffset.dx.toFixed(2)} dy=${dragLastOffset.dy.toFixed(2)}`);
        }
      }
      if (lastLayout && dragLastOffset) {
        const [vx, vy] = draggingVertexKey.split(",").map((v) => Number(v));
        const base = lastLayout.baseVerts[vy]?.[vx];
        if (base) {
          const current = { x: base.x + dragLastOffset.dx, y: base.y + dragLastOffset.dy };
          const snapped = snapToMerge(current.x, current.y, draggingVertexKey);
          if (snapped.key && snapped.key !== draggingVertexKey && snapped.source === "moved") {
            const targetRoot = getRootVertex(state, snapped.key);
            if (targetRoot && targetRoot !== draggingVertexKey) {
              const targetBase = lastLayout.baseVerts[Number(targetRoot.split(",")[1])]?.[Number(targetRoot.split(",")[0])];
              if (targetBase) {
                state.mergedTo.set(draggingVertexKey, targetRoot);
                state.vertexOffsets.set(targetRoot, { dx: snapped.x - targetBase.x, dy: snapped.y - targetBase.y });
                state.vertexOffsets.delete(draggingVertexKey);
                logCell(`Vertex merged: ${draggingVertexKey} -> ${targetRoot} source=${snapped.source} dist=${snapped.dist.toFixed(2)}`);
                const upDist = Math.hypot(upX - snapped.x, upY - snapped.y);
                if (upDist <= params.mergeRadius) {
                  const cellKeys = getCellKeysFromPosition2(snapped.x, snapped.y, lastLayout);
                  for (const cellKey of cellKeys) {
                    if (!state.filledSquares.has(cellKey)) {
                      state.filledSquares.add(cellKey);
                      logCell(`Cell auto-added: ${cellKey}`);
                    }
                  }
                }
              }
            } else {
              state.mergedTo.delete(draggingVertexKey);
              state.vertexOffsets.set(draggingVertexKey, { dx: snapped.x - base.x, dy: snapped.y - base.y });
            }
          } else {
            state.mergedTo.delete(draggingVertexKey);
            state.vertexOffsets.set(draggingVertexKey, { dx: snapped.x - base.x, dy: snapped.y - base.y });
          }
        }
      }
      draggingVertexKey = null;
      dragStartOffset = null;
      dragLastOffset = null;
      svg.releasePointerCapture(event.pointerId);
      scheduleDraw();
    }
  });
  svg.addEventListener("pointercancel", () => {
    isPainting = false;
    lastPaintKey = null;
    draggingVertexKey = null;
    dragStartOffset = null;
    dragLastOffset = null;
  });
  window.addEventListener("resize", drawGrid);
  setStatus("Ready");
  drawGrid();
}
export {
  buildLayout,
  cellHasVertexData,
  clearCellByKey,
  clickCellToFill,
  computeVerts,
  createState,
  defaultParams,
  getBoundaryVertexKeys,
  getCellKeysFromPosition,
  getRootVertex,
  initHandGridtypo1,
  isEdgeFilled,
  isFaceFilled,
  isVertexFilled,
  normalizeVertexKey,
  renderGridSvg
};
