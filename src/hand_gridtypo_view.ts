import { computeVerts, getBoundaryVertexKeys } from "./hand_gridtypo_core.ts";

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

  const buildBoundaryFillPath = (segments) => {
    const keyOf = (point) => `${point.x.toFixed(4)},${point.y.toFixed(4)}`;
    const outgoing = new Map();
    const unused = new Set();

    segments.forEach((segment, index) => {
      unused.add(index);
      const startKey = keyOf(segment.start);
      if (!outgoing.has(startKey)) {
        outgoing.set(startKey, []);
      }
      outgoing.get(startKey).push({ ...segment, index });
    });

    const paths = [];
    while (unused.size > 0) {
      const [firstIndex] = unused;
      const first = segments[firstIndex];
      const startKey = keyOf(first.start);
      let currentKey = keyOf(first.end);
      let currentPoint = first.end;
      const points = [first.start, first.end];
      unused.delete(firstIndex);

      while (currentKey !== startKey) {
        const candidates = outgoing.get(currentKey) || [];
        const next = candidates.find((candidate) => unused.has(candidate.index));
        if (!next) {
          break;
        }
        unused.delete(next.index);
        currentKey = keyOf(next.end);
        currentPoint = next.end;
        points.push(currentPoint);
      }

      if (points.length >= 3 && currentKey === startKey) {
        const d = points
          .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
          .join(" ");
        paths.push(`${d} Z`);
      }
    }

    return paths.join(" ");
  };

  const interpolateQuad = (p00, p10, p11, p01, u, v) => {
    const w00 = (1 - u) * (1 - v);
    const w10 = u * (1 - v);
    const w11 = u * v;
    const w01 = (1 - u) * v;
    return {
      x: p00.x * w00 + p10.x * w10 + p11.x * w11 + p01.x * w01,
      y: p00.y * w00 + p10.y * w10 + p11.y * w11 + p01.y * w01,
    };
  };

  const overlapU = Math.min(0.02, 1 / Math.max(1, layout.cellW));
  const overlapV = Math.min(0.02, 1 / Math.max(1, layout.cellH));

  const facesGroup = svgEl("g", { "data-layer": "faces" });
  const extraFacesGroup = svgEl("g", { "data-layer": "extra-faces" });
  const edgesGroup = svgEl("g", { "data-layer": "edges" });
  const dotsGroup = svgEl("g", { "data-layer": "dots" });
  const verticesGroup = svgEl("g", { "data-layer": "vertices" });
  const extraVerticesGroup = svgEl("g", { "data-layer": "extra-vertices" });
  svg.appendChild(facesGroup);
  svg.appendChild(extraFacesGroup);
  svg.appendChild(edgesGroup);
  svg.appendChild(dotsGroup);
  svg.appendChild(verticesGroup);
  svg.appendChild(extraVerticesGroup);

  const boundaryFillSegments = [];

  for (const key of state.filledSquares) {
    if (state.hiddenFaces && state.hiddenFaces.has(key)) {
      continue;
    }
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
      const leftKey = `${cx - 1},${cy}`;
      const rightKey = `${cx + 1},${cy}`;
      const upKey = `${cx},${cy - 1}`;
      const downKey = `${cx},${cy + 1}`;
      const inset = (1 - params.fillSize) / 2;
      const leftExposed = cx === 0 || !state.filledSquares.has(leftKey);
      const rightExposed = cx === cols - 2 || !state.filledSquares.has(rightKey);
      const topExposed = cy === 0 || !state.filledSquares.has(upKey);
      const bottomExposed = cy === rows - 2 || !state.filledSquares.has(downKey);
      p0 = interpolateQuad(
        v00,
        v10,
        v11,
        v01,
        leftExposed && topExposed ? inset : 0,
        leftExposed && topExposed ? inset : 0,
      );
      p1 = interpolateQuad(
        v00,
        v10,
        v11,
        v01,
        rightExposed && topExposed ? 1 - inset : 1,
        rightExposed && topExposed ? inset : 0,
      );
      p2 = interpolateQuad(
        v00,
        v10,
        v11,
        v01,
        rightExposed && bottomExposed ? 1 - inset : 1,
        rightExposed && bottomExposed ? 1 - inset : 1,
      );
      p3 = interpolateQuad(
        v00,
        v10,
        v11,
        v01,
        leftExposed && bottomExposed ? inset : 0,
        leftExposed && bottomExposed ? 1 - inset : 1,
      );
    } else {
      p0 = { x: Math.round(p0.x), y: Math.round(p0.y) };
      p1 = { x: Math.round(p1.x), y: Math.round(p1.y) };
      p2 = { x: Math.round(p2.x), y: Math.round(p2.y) };
      p3 = { x: Math.round(p3.x), y: Math.round(p3.y) };
    }
    const points = `${p0.x},${p0.y} ${p1.x},${p1.y} ${p2.x},${p2.y} ${p3.x},${p3.y}`;
    const leftKey = `${cx - 1},${cy}`;
    const rightKey = `${cx + 1},${cy}`;
    const upKey = `${cx},${cy - 1}`;
    const downKey = `${cx},${cy + 1}`;
    if (params.fillSize >= 0.999) {
      if (cy === 0 || !state.filledSquares.has(upKey)) {
        boundaryFillSegments.push({ start: p0, end: p1 });
      }
      if (cx === cols - 2 || !state.filledSquares.has(rightKey)) {
        boundaryFillSegments.push({ start: p1, end: p2 });
      }
      if (cy === rows - 2 || !state.filledSquares.has(downKey)) {
        boundaryFillSegments.push({ start: p2, end: p3 });
      }
      if (cx === 0 || !state.filledSquares.has(leftKey)) {
        boundaryFillSegments.push({ start: p3, end: p0 });
      }
    }
    facesGroup.appendChild(
      svgEl("polygon", {
        points,
        fill: params.fillSize >= 0.999 ? "transparent" : params.fillColor,
        "shape-rendering": "crispEdges",
        "data-type": "face",
        "data-cell": key,
      }),
    );
  }

  if (boundaryFillSegments.length > 0) {
    const pathData = buildBoundaryFillPath(boundaryFillSegments);
    facesGroup.insertBefore(
      svgEl("path", {
        d: pathData,
        fill: params.fillColor,
        "shape-rendering": "crispEdges",
        "data-type": "merged-face-fill",
      }),
      facesGroup.firstChild,
    );
  }

  if (state.extraFaces && state.extraFaces.length > 0) {
    for (const face of state.extraFaces) {
      const points = [];
      for (const key of face.vertexKeys || []) {
        const [vx, vy] = key.split(",").map((v) => Number(v));
        const v = baseVerts[vy]?.[vx];
        if (!v) {
          continue;
        }
        points.push(`${v.x},${v.y}`);
      }
      if (points.length < 3) {
        continue;
      }
      extraFacesGroup.appendChild(
        svgEl("polygon", {
          points: points.join(" "),
          fill: params.fillColor,
          "fill-opacity": "0.25",
          stroke: params.edgeColor,
          "stroke-width": Math.max(1, Math.floor(params.edgeThickness / 2)),
          "data-type": "extra-face",
          "data-face": face.id ?? "",
        }),
      );
    }
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
    const leftEdgeKey = `${key}|left`;
    const rightEdgeKey = `${key}|right`;
    const topEdgeKey = `${key}|top`;
    const bottomEdgeKey = `${key}|bottom`;
    if (cx === 0 || !state.filledSquares.has(leftKey)) {
      if (!state.hiddenEdges || !state.hiddenEdges.has(leftEdgeKey)) {
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
    }
    if (cx === cols - 2 || !state.filledSquares.has(rightKey)) {
      if (!state.hiddenEdges || !state.hiddenEdges.has(rightEdgeKey)) {
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
    }
    if (cy === 0 || !state.filledSquares.has(upKey)) {
      if (!state.hiddenEdges || !state.hiddenEdges.has(topEdgeKey)) {
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
    }
    if (cy === rows - 2 || !state.filledSquares.has(downKey)) {
      if (!state.hiddenEdges || !state.hiddenEdges.has(bottomEdgeKey)) {
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
  }

  if (state.extraEdges && state.extraEdges.size > 0) {
    for (const edgeKey of state.extraEdges) {
      const parts = edgeKey.split("|");
      if (parts.length !== 2) {
        continue;
      }
      const [a, b] = parts;
      const [ax, ay] = a.split(",").map((v) => Number(v));
      const [bx, by] = b.split(",").map((v) => Number(v));
      const va = baseVerts[ay]?.[ax];
      const vb = baseVerts[by]?.[bx];
      if (!va || !vb) {
        continue;
      }
      edgesGroup.appendChild(
        svgEl("line", {
          x1: va.x,
          y1: va.y,
          x2: vb.x,
          y2: vb.y,
          stroke: params.edgeColor,
          "stroke-width": params.edgeThickness,
          "data-type": "extra-edge",
          "data-edge": edgeKey,
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
      if (state.hiddenVertices && state.hiddenVertices.has(vKey)) {
        continue;
      }
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

  if (state.extraVertices && state.extraVertices.size > 0) {
    const extraRadius = Math.max(2, Math.floor(params.edgeThickness) + 1);
    for (const key of state.extraVertices) {
      const [vx, vy] = key.split(",").map((v) => Number(v));
      const v = baseVerts[vy]?.[vx];
      if (!v) {
        continue;
      }
      extraVerticesGroup.appendChild(
        svgEl("circle", {
          cx: v.x,
          cy: v.y,
          r: extraRadius,
          fill: params.edgeColor,
          "data-type": "extra-vertex",
          "data-vertex": `${vx},${vy}`,
        }),
      );
    }
  }

  return boundaryVertexKeys;
}
