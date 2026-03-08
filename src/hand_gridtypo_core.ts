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
    extraVertices: new Set(),
    explicitVertices: new Set(),
    extraVertexRefs: new Map(),
    extraEdges: new Set(),
    extraFaces: [],
    hiddenVertices: new Set(),
    hiddenEdges: new Set(),
    hiddenFaces: new Set(),
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

export function applyVertexDragRelease(state, layout, draggingKey, targetX, targetY, options) {
  if (!draggingKey || !layout) {
    return { merged: false, autoAdded: [], targetKey: null, snapped: null };
  }
  const { magnetRadius = 16, mergeRadius = 12 } = options || {};
  const { baseVerts, verts } = computeVerts(state, layout);
  const [vx, vy] = draggingKey.split(",").map((v) => Number(v));
  const base = baseVerts[vy]?.[vx];
  if (!base) {
    return { merged: false, autoAdded: [], targetKey: null, snapped: null };
  }

  const snapToMagnet = () => {
    const { cols, rows } = layout;
    let best = null;
    let bestDist = magnetRadius;
    for (let y = 0; y < rows; y += 1) {
      for (let x = 0; x < cols; x += 1) {
        const b = baseVerts[y][x];
        const dx = b.x - targetX;
        const dy = b.y - targetY;
        const dist = Math.hypot(dx, dy);
        if (dist <= bestDist) {
          bestDist = dist;
          best = { x: b.x, y: b.y };
        }
      }
    }
    return best || { x: targetX, y: targetY };
  };

  const snapToMerge = (x, y) => {
    const { cols, rows } = layout;
    let best = null;
    let bestDist = mergeRadius;
    let bestKey = null;
    let bestSource = null;
    for (let yy = 0; yy < rows; yy += 1) {
      for (let xx = 0; xx < cols; xx += 1) {
        const key = `${xx},${yy}`;
        const basePoint = baseVerts[yy][xx];
        const movedPoint = verts[yy][xx];
        const candidates = key === draggingKey ? [basePoint] : [basePoint, movedPoint];
        for (const v of candidates) {
          const dx = v.x - x;
          const dy = v.y - y;
          const dist = Math.hypot(dx, dy);
          if (dist <= bestDist) {
            bestDist = dist;
            best = { x: v.x, y: v.y };
            bestKey = key;
            bestSource = v === movedPoint ? "moved" : "base";
          }
        }
      }
    }
    return best
      ? { ...best, key: bestKey, source: bestSource, dist: bestDist }
      : { x, y, key: null, source: null, dist: Infinity };
  };

  const snapped = snapToMagnet();
  const offset = { dx: snapped.x - base.x, dy: snapped.y - base.y };
  state.vertexOffsets.set(draggingKey, offset);
  state.mergedTo.delete(draggingKey);

  const mergeCandidate = snapToMerge(snapped.x, snapped.y);
  if (mergeCandidate.key && mergeCandidate.key !== draggingKey) {
    const targetRoot = getRootVertex(state, mergeCandidate.key);
    if (targetRoot && targetRoot !== draggingKey) {
      const [rx, ry] = targetRoot.split(",").map((v) => Number(v));
      const targetBase = baseVerts[ry]?.[rx];
      if (targetBase) {
        state.mergedTo.set(draggingKey, targetRoot);
        state.vertexOffsets.set(targetRoot, { dx: mergeCandidate.x - targetBase.x, dy: mergeCandidate.y - targetBase.y });
        state.vertexOffsets.delete(draggingKey);
        const upDist = Math.hypot(targetX - mergeCandidate.x, targetY - mergeCandidate.y);
        const autoAdded = [];
        if (upDist <= mergeRadius) {
          const cellKeys = getCellKeysFromPosition(mergeCandidate.x, mergeCandidate.y, layout);
          for (const cellKey of cellKeys) {
            if (!state.filledSquares.has(cellKey)) {
              state.filledSquares.add(cellKey);
              autoAdded.push(cellKey);
            }
          }
        }
        return { merged: true, autoAdded, targetKey: targetRoot, snapped: mergeCandidate };
      }
    }
  }

  return { merged: false, autoAdded: [], targetKey: null, snapped };
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
