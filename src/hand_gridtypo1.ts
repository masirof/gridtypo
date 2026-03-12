import {
  defaultParams,
  createState,
  buildLayout as buildLayoutCore,
  getRootVertex,
  normalizeVertexKey,
  computeVerts,
  getCellKeysFromPosition as getCellKeysFromPositionCore,
  cellHasVertexData as cellHasVertexDataCore,
  clearCellByKey as clearCellByKeyCore,
  clickCellToFill,
  isFaceFilled,
  isEdgeFilled,
  getBoundaryVertexKeys,
  isVertexFilled,
  applyVertexDragRelease,
} from "./hand_gridtypo_core.ts";
import { renderGridSvg } from "./hand_gridtypo_view.ts";

export {
  defaultParams,
  createState,
  buildLayoutCore as buildLayout,
  getRootVertex,
  normalizeVertexKey,
  computeVerts,
  getCellKeysFromPositionCore as getCellKeysFromPosition,
  cellHasVertexDataCore as cellHasVertexData,
  clearCellByKeyCore as clearCellByKey,
  clickCellToFill,
  isFaceFilled,
  isEdgeFilled,
  getBoundaryVertexKeys,
  isVertexFilled,
  renderGridSvg,
};

export async function initHandGridtypo1() {
      const guiModule =
        globalThis.__HAND_GRIDTYPO_GUI__ ??
        (await import("https://cdn.jsdelivr.net/npm/lil-gui@0.19/+esm"));
      const { default: GUI } = guiModule;
  
      const svg = document.getElementById("grid");
      const statusEl = document.getElementById("status");
      const debugEl = document.getElementById("debug");
      const cellDebugEl = document.getElementById("cell_debug");
      const guiHost = document.getElementById("gui");
      const toolHost = document.getElementById("tool");
  
      const params = { ...defaultParams, tool: "basic" };
  
      const STORAGE_KEY = "hand-gridtypo1-lilgui";
      const state = createState();
      const cellLogLines = [];
      let lastLayout = null;
      let lastBoundaryVertexKeys = new Set();
  
      function log(message) {
        const time = new Date().toISOString().slice(11, 19);
        debugEl.textContent = `[${time}] ${message}\n` + debugEl.textContent;
      }
  
        function logCell(message) {
          const time = new Date().toISOString().slice(11, 19);
          cellLogLines.unshift(`[${time}] ${message}`);
          renderCellDebug();
        }

        function renderCellDebug(renderedCellsOverride = null) {
        const hiddenFaces = state.hiddenFaces ? state.hiddenFaces : new Set();
        const hiddenVertices = state.hiddenVertices ? state.hiddenVertices : new Set();
        const hiddenEdges = state.hiddenEdges ? state.hiddenEdges : new Set();
        const filledSet = new Set(
          Array.from(state.filledSquares.values()).filter((key) => !hiddenFaces.has(key)),
        );
        if (lastLayout) {
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
            const cellKey = `${rx - 1},${ry - 1}`;
            if (!hiddenFaces.has(cellKey)) {
              filledSet.add(cellKey);
            }
          }
        }
        const filledList = Array.from(filledSet)
          .filter((key) => {
            const [cx, cy] = key.split(",").map((v) => Number(v));
            return !Number.isNaN(cx) && !Number.isNaN(cy) && cx >= 0 && cy >= 0;
          })
          .sort();
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
        const extraList = state.extraVertices ? Array.from(state.extraVertices.values()).sort() : [];
        const extraEdgeList = state.extraEdges ? Array.from(state.extraEdges.values()).sort() : [];
        const faceList = state.extraFaces ? state.extraFaces.map((face) => face.id || "face") : [];
          let boundaryEdgeList = [];
          let vertexList = [];
          if (lastLayout) {
            const boundaryEdgeSet = new Set();
            for (const key of state.filledSquares) {
              if (hiddenFaces.has(key)) {
                continue;
              }
              const [cx, cy] = key.split(",").map((v) => Number(v));
              if (Number.isNaN(cx) || Number.isNaN(cy)) {
                continue;
              }
              const leftCell = `${cx - 1},${cy}`;
              const rightCell = `${cx + 1},${cy}`;
              const upCell = `${cx},${cy - 1}`;
              const downCell = `${cx},${cy + 1}`;
              const leftKey = `${key}|left`;
              const rightKey = `${key}|right`;
              const topKey = `${key}|top`;
              const bottomKey = `${key}|bottom`;
              if ((cx === 0 || !state.filledSquares.has(leftCell)) && !hiddenEdges.has(leftKey)) {
                boundaryEdgeSet.add(`(${cx},${cy},${cx},${cy + 1})`);
              }
              if ((cx === lastLayout.cols - 2 || !state.filledSquares.has(rightCell)) && !hiddenEdges.has(rightKey)) {
                boundaryEdgeSet.add(`(${cx + 1},${cy},${cx + 1},${cy + 1})`);
              }
              if ((cy === 0 || !state.filledSquares.has(upCell)) && !hiddenEdges.has(topKey)) {
                boundaryEdgeSet.add(`(${cx},${cy},${cx + 1},${cy})`);
              }
              if ((cy === lastLayout.rows - 2 || !state.filledSquares.has(downCell)) && !hiddenEdges.has(bottomKey)) {
                boundaryEdgeSet.add(`(${cx},${cy + 1},${cx + 1},${cy + 1})`);
              }
            }
            boundaryEdgeList = Array.from(boundaryEdgeSet).sort();
            const boundaryVertexSet = new Set();
            for (const edge of boundaryEdgeList) {
              const match = edge.match(/^\((\-?\d+),(\-?\d+),(\-?\d+),(\-?\d+)\)$/);
              if (!match) {
                continue;
              }
              const ax = Number(match[1]);
              const ay = Number(match[2]);
              const bx = Number(match[3]);
              const by = Number(match[4]);
              const aKey = `${ax},${ay}`;
              const bKey = `${bx},${by}`;
              if (!hiddenVertices.has(aKey)) {
                boundaryVertexSet.add(aKey);
              }
              if (!hiddenVertices.has(bKey)) {
                boundaryVertexSet.add(bKey);
              }
            }
            vertexList = Array.from(boundaryVertexSet).sort();
          }
          const renderedCells =
            typeof renderedCellsOverride === "number"
              ? renderedCellsOverride
              : svg
                ? svg.querySelectorAll('[data-type="face"]').length
                : 0;
          const summary = [
            `Filled cells (${filledList.length}): ${filledList.join(" ") || "-"}`,
            `Boundary vertices (${vertexList.length}): ${vertexList.join(" ") || "-"}`,
            `Boundary edges (${boundaryEdgeList.length}): ${boundaryEdgeList.join(" ") || "-"}`,
            `Moved vertices (${movedList.length}): ${movedList.join(" | ") || "-"}`,
            `Merged vertices (${mergedList.length}): ${mergedList.join(" | ") || "-"}`,
            `Extra vertices (${extraList.length}): ${extraList.join(" ") || "-"}`,
            `Extra edges (${extraEdgeList.length}): ${extraEdgeList.join(" ") || "-"}`,
            `Extra faces (${faceList.length}): ${faceList.join(" ") || "-"}`,
            `Rendered cells (${renderedCells}): ${renderedCells === 0 ? "-" : renderedCells}`,
          ].join("\n");
          cellDebugEl.textContent = `${summary}\n\n${cellLogLines.join("\n")}`.trim();
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
      function buildLayout() {
        resizeSvg();
        const width = svg.getBoundingClientRect().width;
        const height = svg.getBoundingClientRect().width;
        const layout = buildLayoutCore(width, height, params);
        const { baseVerts, verts } = computeVerts(state, layout);
        lastLayout = { ...layout, baseVerts, verts };
      }
  
        function drawGrid() {
          buildLayout();
          if (!lastLayout) {
            return;
          }
          const boundaryVertexKeys = renderGridSvg(svg, state, params, lastLayout);
          lastBoundaryVertexKeys = new Set(boundaryVertexKeys);
          if (!draggingVertexKey) {
            const renderedCells = svg.querySelectorAll('[data-type="face"]').length;
            renderCellDebug(renderedCells);
          }
        }
  
      const gui = new GUI({ container: guiHost, title: "Grid" });
      const toolOptions = {
        Basic: "basic",
        "Add Vertex": "addVertex",
        "Delete Vertex": "deleteVertex",
        "Add Edge": "addEdge",
        "Delete Edge": "deleteEdge",
        "Add Face": "addFace",
        "Delete Face": "deleteFace",
      };
      const toolController = gui
        .add(params, "tool", toolOptions)
        .name("tool")
        .onChange(() => {
          resetToolState();
          syncToolButtons();
        });
      gui.add(params, "cols", 1, 50, 1).name("n(横)").onChange(drawGrid);
      gui.add(params, "rows", 1, 50, 1).name("n(縦)").onChange(drawGrid);
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
        },
      };
  
      gui.add(io, "save").name("save preset");
      gui.add(io, "load").name("load preset");
      gui.add(io, "reset").name("reset");
      gui.add(io, "copy").name("copy preset");

      function syncToolButtons() {
        if (!toolHost) {
          return;
        }
        const buttons = toolHost.querySelectorAll("[data-tool]");
        buttons.forEach((button) => {
          const tool = button.getAttribute("data-tool");
          if (tool === params.tool) {
            button.classList.add("active");
          } else {
            button.classList.remove("active");
          }
        });
      }

      if (toolHost) {
        toolHost.addEventListener("click", (event) => {
          const target = event.target;
          if (!(target instanceof HTMLElement)) {
            return;
          }
          const tool = target.getAttribute("data-tool");
          if (!tool) {
            return;
          }
          params.tool = tool;
          toolController.setValue(tool);
          syncToolButtons();
        });
      }
  
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
          clearCellByKeyCore(state, key);
          logCell(`Cell cleared: ${key}`);
          return true;
        } else {
          state.filledSquares.add(key);
          logCell(`Cell toggled on: ${key}`);
          return true;
        }
      }
  
      function clearCellByKey(key) {
        if (!key) {
          return false;
        }
        const { hadCell } = clearCellByKeyCore(state, key);
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
  
      function getCellKeysFromPosition(x, y, layout) {
        return getCellKeysFromPositionCore(x, y, layout);
      }
  
      function cellHasVertexData(cellKey) {
        if (!lastLayout) {
          buildLayout();
        }
        if (!lastLayout) {
          return false;
        }
        return cellHasVertexDataCore(state, cellKey, lastLayout);
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
      let pendingEdgeStart = null;
      let faceIdCounter = 1;
      const pendingFaceEdges = new Set();

      function resetToolState() {
        pendingEdgeStart = null;
        pendingFaceEdges.clear();
      }
  
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
        const vertexKeys = new Set();
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
          const [vx, vy] = vKey.split(",").map((v) => Number(v));
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
        return best
          ? { ...best, key: bestKey, source: bestSource, dist: bestDist }
          : { x, y, key: null, source: null, dist: Infinity };
      }
  
      function findNearestGridVertex(x, y) {
        if (!lastLayout) {
          return null;
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
              best = { x: vx, y: vy, dist };
            }
          }
        }
        return best;
      }

      function normalizeEdgeKey(a, b) {
        if (a === b) {
          return null;
        }
        return a < b ? `${a}|${b}` : `${b}|${a}`;
      }

      function getEdgeEndpoints(edgeKey) {
        const parts = edgeKey.split("|");
        if (parts.length !== 2) {
          return null;
        }
        return parts;
      }

      function updateExtraVertexPresence(key) {
        const refs = state.extraVertexRefs.get(key) || 0;
        const explicit = state.explicitVertices.has(key);
        if (refs > 0 || explicit) {
          state.extraVertices.add(key);
        } else {
          state.extraVertices.delete(key);
        }
      }

      function addVertexRef(key, delta) {
        const prev = state.extraVertexRefs.get(key) || 0;
        const next = Math.max(0, prev + delta);
        if (next === 0) {
          state.extraVertexRefs.delete(key);
        } else {
          state.extraVertexRefs.set(key, next);
        }
        updateExtraVertexPresence(key);
      }

      function toggleExplicitVertex(vx, vy) {
        const key = `${vx},${vy}`;
        if (state.explicitVertices.has(key)) {
          state.explicitVertices.delete(key);
          updateExtraVertexPresence(key);
          logCell(`Extra vertex removed: ${key}`);
          return;
        }
        state.explicitVertices.add(key);
        updateExtraVertexPresence(key);
        logCell(`Extra vertex added: ${key}`);
      }

      function addEdge(edgeKey) {
        if (state.extraEdges.has(edgeKey)) {
          return;
        }
        state.extraEdges.add(edgeKey);
        const endpoints = getEdgeEndpoints(edgeKey);
        if (endpoints) {
          endpoints.forEach((key) => addVertexRef(key, 1));
        }
        logCell(`Extra edge added: ${edgeKey}`);
      }

      function removeFace(face) {
        if (!face) {
          return;
        }
        for (const key of face.vertexKeys || []) {
          addVertexRef(key, -1);
        }
        state.extraFaces = state.extraFaces.filter((item) => item !== face);
        logCell(`Extra face removed: ${face.id ?? "face"}`);
      }

      function removeEdge(edgeKey) {
        if (!state.extraEdges.has(edgeKey)) {
          return;
        }
        state.extraEdges.delete(edgeKey);
        const endpoints = getEdgeEndpoints(edgeKey);
        if (endpoints) {
          endpoints.forEach((key) => addVertexRef(key, -1));
        }
        const facesToRemove = state.extraFaces.filter((face) =>
          (face.edgeKeys || []).includes(edgeKey),
        );
        facesToRemove.forEach(removeFace);
        logCell(`Extra edge removed: ${edgeKey}`);
      }

      function removeVertexCompletely(vertexKey) {
        const edgesToRemove = Array.from(state.extraEdges).filter((edgeKey) => {
          const endpoints = getEdgeEndpoints(edgeKey);
          return endpoints ? endpoints.includes(vertexKey) : false;
        });
        edgesToRemove.forEach(removeEdge);

        const facesToRemove = state.extraFaces.filter((face) =>
          (face.vertexKeys || []).includes(vertexKey),
        );
        facesToRemove.forEach(removeFace);

        state.explicitVertices.delete(vertexKey);
        state.extraVertexRefs.delete(vertexKey);
        state.extraVertices.delete(vertexKey);
        logCell(`Extra vertex removed: ${vertexKey}`);
      }

      function distanceToSegment(px, py, x1, y1, x2, y2) {
        const dx = x2 - x1;
        const dy = y2 - y1;
        const len2 = dx * dx + dy * dy;
        if (len2 === 0) {
          return Math.hypot(px - x1, py - y1);
        }
        let t = ((px - x1) * dx + (py - y1) * dy) / len2;
        t = Math.max(0, Math.min(1, t));
        const sx = x1 + t * dx;
        const sy = y1 + t * dy;
        return Math.hypot(px - sx, py - sy);
      }

        function findNearestExtraEdge(x, y, maxDist = params.magnetRadius) {
          if (!lastLayout || !state.extraEdges.size) {
            return null;
          }
          const { baseVerts } = lastLayout;
          let bestKey = null;
          let bestDist = maxDist;
          for (const edgeKey of state.extraEdges) {
            const endpoints = getEdgeEndpoints(edgeKey);
            if (!endpoints) {
              continue;
            }
          const [a, b] = endpoints;
          const [ax, ay] = a.split(",").map((v) => Number(v));
          const [bx, by] = b.split(",").map((v) => Number(v));
          const va = baseVerts[ay]?.[ax];
          const vb = baseVerts[by]?.[bx];
          if (!va || !vb) {
            continue;
          }
            const dist = distanceToSegment(x, y, va.x, va.y, vb.x, vb.y);
            if (dist <= bestDist) {
              bestDist = dist;
              bestKey = edgeKey;
            }
          }
          return bestKey;
        }

        function findNearestBoundaryEdge(x, y, maxDist = params.magnetRadius) {
          if (!lastLayout || state.filledSquares.size === 0) {
            return null;
          }
          const { cols, rows, verts } = lastLayout;
          let best = null;
          let bestDist = maxDist;
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
              const dist = distanceToSegment(x, y, v00.x, v00.y, v01.x, v01.y);
              if (dist <= bestDist) {
                bestDist = dist;
                best = { cellKey: key, edge: "left", edgeKey: `${key}|left` };
            }
          }
            if (cx === cols - 2 || !state.filledSquares.has(rightKey)) {
              const dist = distanceToSegment(x, y, v10.x, v10.y, v11.x, v11.y);
              if (dist <= bestDist) {
                bestDist = dist;
                best = { cellKey: key, edge: "right", edgeKey: `${key}|right` };
            }
          }
            if (cy === 0 || !state.filledSquares.has(upKey)) {
              const dist = distanceToSegment(x, y, v00.x, v00.y, v10.x, v10.y);
              if (dist <= bestDist) {
                bestDist = dist;
                best = { cellKey: key, edge: "top", edgeKey: `${key}|top` };
            }
          }
            if (cy === rows - 2 || !state.filledSquares.has(downKey)) {
              const dist = distanceToSegment(x, y, v01.x, v01.y, v11.x, v11.y);
              if (dist <= bestDist) {
                bestDist = dist;
                best = { cellKey: key, edge: "bottom", edgeKey: `${key}|bottom` };
            }
            }
          }
          return best;
        }

      function buildFaceFromEdges(edgeKeys) {
        if (!lastLayout) {
          return null;
        }
        const vertexMap = new Map();
        for (const edgeKey of edgeKeys) {
          const endpoints = getEdgeEndpoints(edgeKey);
          if (!endpoints) {
            continue;
          }
          endpoints.forEach((key) => {
            if (vertexMap.has(key)) {
              return;
            }
            const [vx, vy] = key.split(",").map((v) => Number(v));
            const v = lastLayout.baseVerts[vy]?.[vx];
            if (v) {
              vertexMap.set(key, v);
            }
          });
        }
        if (vertexMap.size < 3) {
          return null;
        }
        const vertices = Array.from(vertexMap.entries()).map(([key, v]) => ({ key, x: v.x, y: v.y }));
        const cx = vertices.reduce((sum, v) => sum + v.x, 0) / vertices.length;
        const cy = vertices.reduce((sum, v) => sum + v.y, 0) / vertices.length;
        vertices.sort((a, b) => Math.atan2(a.y - cy, a.x - cx) - Math.atan2(b.y - cy, b.x - cx));
        return vertices.map((v) => v.key);
      }

      function pointInPolygon(pointX, pointY, vertices) {
        let inside = false;
        for (let i = 0, j = vertices.length - 1; i < vertices.length; j = i++) {
          const xi = vertices[i].x;
          const yi = vertices[i].y;
          const xj = vertices[j].x;
          const yj = vertices[j].y;
          const intersect = yi > pointY !== yj > pointY && pointX < ((xj - xi) * (pointY - yi)) / (yj - yi) + xi;
          if (intersect) {
            inside = !inside;
          }
        }
        return inside;
      }

      function findFaceAtPoint(x, y) {
        if (!lastLayout || !state.extraFaces.length) {
          return null;
        }
        for (const face of state.extraFaces) {
          const points = [];
          for (const key of face.vertexKeys || []) {
            const [vx, vy] = key.split(",").map((v) => Number(v));
            const v = lastLayout.baseVerts[vy]?.[vx];
            if (v) {
              points.push(v);
            }
          }
          if (points.length >= 3 && pointInPolygon(x, y, points)) {
            return face;
          }
        }
        return null;
      }

      function getAdjacentCellsForVertex(vx, vy) {
        if (!lastLayout) {
          return [];
        }
        const maxX = Math.max(0, lastLayout.cols - 2);
        const maxY = Math.max(0, lastLayout.rows - 2);
        const candidates = [
          { cx: vx - 1, cy: vy - 1 },
          { cx: vx, cy: vy - 1 },
          { cx: vx - 1, cy: vy },
          { cx: vx, cy: vy },
        ];
        const keys = [];
        for (const { cx, cy } of candidates) {
          if (cx < 0 || cy < 0 || cx > maxX || cy > maxY) {
            continue;
          }
          keys.push(`${cx},${cy}`);
        }
        return keys;
      }

      svg.addEventListener("contextmenu", (event) => {
        event.preventDefault();
      });

      svg.addEventListener("pointerdown", (event) => {
        const rect = svg.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        if (event.button === 0) {
          if (params.tool === "addVertex") {
            if (!lastLayout) {
              buildLayout();
            }
            const nearest = findNearestGridVertex(x, y);
            if (nearest) {
              toggleExplicitVertex(nearest.x, nearest.y);
              scheduleDraw();
            }
            return;
          }
          if (params.tool === "deleteVertex") {
            if (!lastLayout) {
              buildLayout();
            }
            const nearest = findNearestGridVertex(x, y);
            if (nearest) {
              const key = `${nearest.x},${nearest.y}`;
              if (state.extraVertices.has(key)) {
                removeVertexCompletely(key);
                scheduleDraw();
                return;
              }
              const boundaryKeys = getBoundaryVertexKeys(state, lastLayout);
              if (boundaryKeys.has(key)) {
                if (state.hiddenVertices.has(key)) {
                  state.hiddenVertices.delete(key);
                  logCell(`Hidden vertex restored: ${key}`);
                } else {
                  state.hiddenVertices.add(key);
                  logCell(`Hidden vertex added: ${key}`);
                }
                scheduleDraw();
              }
            }
            return;
          }
          if (params.tool === "addEdge") {
            if (!lastLayout) {
              buildLayout();
            }
            const nearest = findNearestGridVertex(x, y);
            if (!nearest) {
              return;
            }
            const key = `${nearest.x},${nearest.y}`;
            if (!pendingEdgeStart) {
              pendingEdgeStart = key;
              logCell(`Edge start: ${key}`);
              return;
            }
            const edgeKey = normalizeEdgeKey(pendingEdgeStart, key);
            pendingEdgeStart = null;
            if (!edgeKey) {
              return;
            }
            if (state.extraEdges.has(edgeKey)) {
              removeEdge(edgeKey);
            } else {
              addEdge(edgeKey);
            }
            scheduleDraw();
            return;
          }
            if (params.tool === "deleteEdge") {
              if (!lastLayout) {
                buildLayout();
              }
              const targetEl = event.target instanceof Element ? event.target : null;
              const edgeEl = targetEl
                ? targetEl.closest('[data-type="edge"], [data-type="extra-edge"]')
                : null;
              if (edgeEl) {
                const type = edgeEl.getAttribute("data-type");
                if (type === "extra-edge") {
                  const edgeKey = edgeEl.getAttribute("data-edge");
                  if (edgeKey) {
                    removeEdge(edgeKey);
                    scheduleDraw();
                    return;
                  }
                }
                if (type === "edge") {
                  const cellKey = edgeEl.getAttribute("data-cell");
                  const edgeDir = edgeEl.getAttribute("data-edge");
                  if (cellKey && edgeDir) {
                    const boundaryKey = `${cellKey}|${edgeDir}`;
                    if (!state.hiddenEdges.has(boundaryKey)) {
                      state.hiddenEdges.add(boundaryKey);
                      logCell(`Hidden edge added: ${boundaryKey}`);
                      scheduleDraw();
                      return;
                    }
                  }
                }
              }
              const edgeKey = findNearestExtraEdge(x, y, Number.POSITIVE_INFINITY);
              if (edgeKey) {
                removeEdge(edgeKey);
                scheduleDraw();
                return;
              }
              const boundary = findNearestBoundaryEdge(x, y, Number.POSITIVE_INFINITY);
              if (boundary && boundary.edgeKey) {
                if (!state.hiddenEdges.has(boundary.edgeKey)) {
                  state.hiddenEdges.add(boundary.edgeKey);
                  logCell(`Hidden edge added: ${boundary.edgeKey}`);
                  scheduleDraw();
                }
              }
              return;
            }
          if (params.tool === "addFace") {
            if (!lastLayout) {
              buildLayout();
            }
            const edgeKey = findNearestExtraEdge(x, y);
            if (!edgeKey) {
              return;
            }
            if (pendingFaceEdges.has(edgeKey)) {
              pendingFaceEdges.delete(edgeKey);
              logCell(`Face edge removed: ${edgeKey}`);
              return;
            }
            pendingFaceEdges.add(edgeKey);
            logCell(`Face edge added: ${edgeKey}`);
            if (pendingFaceEdges.size >= 3) {
              const vertexKeys = buildFaceFromEdges(pendingFaceEdges);
              if (vertexKeys) {
                const face = {
                  id: `face-${faceIdCounter++}`,
                  edgeKeys: Array.from(pendingFaceEdges),
                  vertexKeys,
                };
                state.extraFaces.push(face);
                vertexKeys.forEach((key) => addVertexRef(key, 1));
                logCell(`Extra face added: ${face.id}`);
                pendingFaceEdges.clear();
                scheduleDraw();
              }
            }
            return;
          }
          if (params.tool === "deleteFace") {
            if (!lastLayout) {
              buildLayout();
            }
            const face = findFaceAtPoint(x, y);
            if (face) {
              const edgeKeys = Array.from(face.edgeKeys || []);
              removeFace(face);
              edgeKeys.forEach(removeEdge);
              scheduleDraw();
              return;
            }
            const cellKey = keyFromPoint(x, y);
            if (cellKey && state.filledSquares.has(cellKey)) {
              if (state.hiddenFaces.has(cellKey)) {
                state.hiddenFaces.delete(cellKey);
                logCell(`Hidden face restored: ${cellKey}`);
              } else {
                state.hiddenFaces.add(cellKey);
                logCell(`Hidden face added: ${cellKey}`);
              }
              scheduleDraw();
            }
            return;
          }
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
            const shouldClear = state.filledSquares.has(key) || cellHasVertexData(key);
            if (shouldClear) {
              isPainting = true;
              paintValue = false;
              lastPaintKey = key;
              svg.setPointerCapture(event.pointerId);
              clearCellByKey(key);
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
            const dragX = base ? base.x + dragLastOffset.dx : upX;
            const dragY = base ? base.y + dragLastOffset.dy : upY;
            const result = applyVertexDragRelease(
              state,
              lastLayout,
              draggingVertexKey,
              dragX,
              dragY,
              { magnetRadius: params.magnetRadius, mergeRadius: params.mergeRadius },
            );
            logCell(
              `Drag release: ${draggingVertexKey} up=(${upX.toFixed(2)},${upY.toFixed(2)}) ` +
                `drag=(${dragX.toFixed(2)},${dragY.toFixed(2)}) ` +
                `merged=${result.merged} autoAdded=${result.autoAdded.length}`,
            );
            if (result.snapped) {
              logCell(
                `Drag snapped: (${result.snapped.x.toFixed(2)},${result.snapped.y.toFixed(2)}) ` +
                  `key=${result.snapped.key ?? "-"} source=${result.snapped.source ?? "-"} dist=${result.snapped.dist?.toFixed(2) ?? "-"}`,
              );
            }
            if (result.merged && result.targetKey) {
              logCell(`Vertex merged: ${draggingVertexKey} -> ${result.targetKey}`);
            }
            if (result.autoAdded && result.autoAdded.length) {
              result.autoAdded.forEach((cellKey) => {
                logCell(`Cell auto-added: ${cellKey}`);
              });
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

      syncToolButtons();
      setStatus("Ready");
      drawGrid();
}



