export const defaultParams = {
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
  mergeRadius: 12,
};

export function createState() {
  return {
    filledSquares: new Set(),
    vertexOffsets: new Map(),
    mergedTo: new Map(),
  };
}

export function buildLayout(width, height, params) {
  const cols = Math.max(1, Math.floor(params.cols));
  const rows = Math.max(1, Math.floor(params.rows));
  const pad = Math.max(0, params.padding);
  const innerW = Math.max(1, width - pad * 2);
  const innerH = Math.max(1, height - pad * 2);
  const cellW = cols === 1 ? innerW : innerW / (cols - 1);
  const cellH = rows === 1 ? innerH : innerH / (rows - 1);
  return { width, height, cols, rows, pad, innerW, innerH, cellW, cellH };
}

export function getBaseAt(ix, iy, layout) {
  const { cols, rows, pad, innerW, innerH } = layout;
  const tx = cols === 1 ? 0.5 : ix / (cols - 1);
  const ty = rows === 1 ? 0.5 : iy / (rows - 1);
  return { x: pad + innerW * tx, y: pad + innerH * ty };
}

export function getRootVertex(state, key) {
  let current = key;
  const seen = new Set();
  while (state.mergedTo.has(current)) {
    if (seen.has(current)) {
      break;
    }
    seen.add(current);
    current = state.mergedTo.get(current);
  }
  return current;
}

export function normalizeVertexKey(state, key) {
  return getRootVertex(state, key);
}

export function computeVerts(state, layout) {
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

export function getCellKeysFromPosition(x, y, layout) {
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
  const xKeys = new Set([baseX]);
  const yKeys = new Set([baseY]);
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

export function isFaceFilled(state, cellKey) {
  return state.filledSquares.has(cellKey);
}

export function isEdgeFilled(state, cellKey, edge, layout) {
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

export function getBoundaryVertexKeys(state, layout) {
  const { cols, rows } = layout;
  const boundaryVertexKeys = new Set();
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

export function isVertexFilled(state, vertexKey, layout) {
  const boundary = getBoundaryVertexKeys(state, layout);
  return boundary.has(normalizeVertexKey(state, vertexKey));
}

export function cellHasVertexData(state, cellKey, layout) {
  if (!cellKey) {
    return false;
  }
  const rootKeys = new Set();
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

export function clickCellToFill(state, cellKey, layout) {
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

export function clearCellByKey(state, cellKey) {
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
    `${cx + 1},${cy + 1}`,
  ];
  for (const key of keys) {
    state.vertexOffsets.delete(key);
    state.mergedTo.delete(key);
  }
}

function pruneVertexOffsets(state) {
  const active = new Set();
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

export function renderGridSvg(svg, state, params, layout) {
  while (svg.firstChild) {
    svg.removeChild(svg.firstChild);
  }

  const { baseVerts, verts } = computeVerts(state, layout);
  const { cols, rows } = layout;

  const svgEl = (tag, attrs = {}) => {
    const el = svg.ownerDocument
      ? svg.ownerDocument.createElementNS("http://www.w3.org/2000/svg", tag)
      : document.createElementNS("http://www.w3.org/2000/svg", tag);
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
        "data-cell": key,
      }),
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
          "data-cell": key,
        }),
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
          "data-cell": key,
        }),
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
          "data-cell": key,
        }),
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
          "data-cell": key,
        }),
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
          "data-vertex": `${x},${y}`,
        }),
      );
    }
  }

  if (state.filledSquares.size > 0) {
    const drawnPositions = new Set();
    const vertexRadius = Math.max(2, Math.floor(params.edgeThickness));
    for (const vKey of boundaryVertexKeys) {
      const [vx, vy] = vKey.split(",").map((v) => Number(v));
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
          "data-vertex": `${vx},${vy}`,
        }),
      );
    }
  }
}
