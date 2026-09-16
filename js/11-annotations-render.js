// ============================================
// SVG ANNOTATIONS
// ============================================
// Arrow geometry is measured from the reference the teacher supplied (a
// 73.25px square): band 16px -> 0.22 sq, head tip sits exactly on the target
// square centre, head 23px long -> 0.31 sq and 34px wide -> 0.47 sq, and the
// fill is #ffaa00 at 0.8 alpha.
// Knight-shaped moves are drawn as an L, long leg first.
const ARROW_STYLE = {
  band: 0.20,        // stroke width, as a fraction of one square
  headLen: 0.38,     // tip -> base (longer head makes it sharp and pointy)
  headWide: 0.44,    // base width
  opacity: 0.85,
  minBand: 5         // never thinner than this, so it is visible on small boards
};

function svgEl(name, attrs) {
  const el = document.createElementNS('http://www.w3.org/2000/svg', name);
  for (const k in attrs) el.setAttribute(k, attrs[k]);
  return el;
}

/** Is this start square holding (or leaving behind) a knight? */
function arrowIsKnightMove(from, dr, dc) {
  if (!((dr === 1 && dc === 2) || (dr === 2 && dc === 1))) return false;
  try {
    const p = state.game.get ? state.game.get(from) : null;
    if (p && p.type) return p.type === 'n';
  } catch (e) {}
  return true;
}

function currentSquareSize() {
  try {
    const el = (typeof els !== 'undefined' && els.board) ||
               (typeof els !== 'undefined' && els.boardContainer) ||
               document.getElementById('board') ||
               document.getElementById('boardContainer');
    if (el) {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0) return rect.width / 8;
    }
  } catch (e) {}
  return 80;
}

function sqPos(name, sqSize) {
  if (typeof sqSize !== 'number' || sqSize <= 0) sqSize = currentSquareSize();
  const { r, c } = squareRC(name);
  return {
    x: (c + 0.5) * sqSize,
    y: (r + 0.5) * sqSize
  };
}

function sqTopLeft(name, sqSize) {
  if (typeof sqSize !== 'number' || sqSize <= 0) sqSize = currentSquareSize();
  const { r, c } = squareRC(name);
  return { x: c * sqSize, y: r * sqSize };
}

function renderAnnotations() {
  const svg = els.boardSvg;
  if (!svg) return;
  svg.innerHTML = '';

  const boardEl = els.board || els.boardContainer;
  if (!boardEl) return;
  const rect = boardEl.getBoundingClientRect();
  if (rect.width === 0) return;
  const sqSize = rect.width / 8;
  svg.setAttribute('viewBox', `0 0 ${rect.width} ${rect.height}`);

  if (state.flipped) {
    svg.style.transform = 'rotate(180deg)';
  } else {
    svg.style.transform = 'none';
  }

  // Highlights
  state.highlights.forEach(h => {
    const p = sqTopLeft(h.square, sqSize);
    const r = svgEl('rect', {
      x: p.x, y: p.y, width: sqSize, height: sqSize,
      fill: h.color, class: 'highlight-sq'
    });
    r.dataset.type = 'highlight';
    r.dataset.square = h.square;
    svg.appendChild(r);
  });

  // Rectangles / Squares - inset stroke so it stays strictly inside the square box
  state.rectangles.forEach(rc => {
    const a = sqTopLeft(rc.from, sqSize);
    const b = sqTopLeft(rc.to, sqSize);
    const x = Math.min(a.x, b.x);
    const y = Math.min(a.y, b.y);
    const w = Math.abs(a.x - b.x) + sqSize;
    const h2 = Math.abs(a.y - b.y) + sqSize;
    const strokeW = Math.max(2, sqSize * 0.05);
    const halfStroke = strokeW / 2;
    const r = svgEl('rect', {
      x: x + halfStroke, y: y + halfStroke,
      width: Math.max(1, w - strokeW), height: Math.max(1, h2 - strokeW),
      fill: rc.color, 'fill-opacity': '0.3', stroke: rc.color,
      'stroke-width': strokeW, rx: Math.max(2, sqSize * 0.06)
    });
    r.dataset.type = 'rectangle';
    r.dataset.square = rc.from;
    svg.appendChild(r);
  });

  // Circles - comfortably inside the box, centered on piece
  state.circles.forEach(c => {
    const p = sqPos(c.square, sqSize);
    const strokeW = Math.max(2.5, sqSize * 0.05);
    const circle = svgEl('circle', {
      cx: p.x, cy: p.y, r: sqSize * 0.38, fill: 'none',
      stroke: c.color, 'stroke-width': strokeW
    });
    circle.dataset.type = 'circle';
    circle.dataset.square = c.square;
    svg.appendChild(circle);
  });

  // Triangles - equilateral, point up, comfortably inside square, centered on piece
  (state.triangles || []).forEach(t => {
    const p = sqPos(t.square, sqSize);
    const r = sqSize * 0.38;
    const pts = [-90, 30, 150].map(deg => {
      const a = deg * Math.PI / 180;
      return (p.x + r * Math.cos(a)).toFixed(2) + ',' + (p.y + r * Math.sin(a)).toFixed(2);
    }).join(' ');
    const el = svgEl('polygon', {
      points: pts, fill: 'none', stroke: t.color,
      'stroke-width': Math.max(2.5, sqSize * 0.05), 'stroke-linejoin': 'round'
    });
    el.dataset.type = 'triangle';
    el.dataset.square = t.square;
    svg.appendChild(el);
  });

  // Hexagons - regular, flat-top, comfortably inside square, centered on piece
  (state.hexagons || []).forEach(h => {
    const p = sqPos(h.square, sqSize);
    const r = sqSize * 0.38;
    const pts = [0, 60, 120, 180, 240, 300].map(deg => {
      const a = deg * Math.PI / 180;
      return (p.x + r * Math.cos(a)).toFixed(2) + ',' + (p.y + r * Math.sin(a)).toFixed(2);
    }).join(' ');
    const el = svgEl('polygon', {
      points: pts, fill: 'none', stroke: h.color,
      'stroke-width': Math.max(2.5, sqSize * 0.05), 'stroke-linejoin': 'round'
    });
    el.dataset.type = 'hexagon';
    el.dataset.square = h.square;
    svg.appendChild(el);
  });

  // Arrows - thick rounded band, triangular head on the target square centre
  const band = Math.max(ARROW_STYLE.minBand, sqSize * ARROW_STYLE.band);
  const headLen = sqSize * ARROW_STYLE.headLen;
  const headHalf = sqSize * ARROW_STYLE.headWide / 2;

  state.arrows.forEach(a => {
    const from = sqPos(a.from, sqSize);
    const to = sqPos(a.to, sqSize);
    const rc1 = squareRC(a.from);
    const rc2 = squareRC(a.to);
    const dr = Math.abs(rc1.r - rc2.r);
    const dc = Math.abs(rc1.c - rc2.c);

    const pts = [from];
    const bend = arrowIsKnightMove(a.from, dr, dc);
    if (bend) {
      // long leg first, so the elbow sits on the origin's file (vertical
      // knight moves) or the origin's rank (horizontal ones)
      pts.push(dr >= dc ? { x: from.x, y: to.y } : { x: to.x, y: from.y });
    }
    pts.push(to);

    const last = pts[pts.length - 1];
    const prev = pts[pts.length - 2];
    let vx = last.x - prev.x;
    let vy = last.y - prev.y;
    const len = Math.sqrt(vx * vx + vy * vy);
    if (len === 0) return;                    // same square: nothing to draw
    vx /= len; vy /= len;

    // the band enters the wide base of the triangle without poking out of the pointy tip
    const endX = last.x - vx * headLen * 0.85;
    const endY = last.y - vy * headLen * 0.85;
    const d = pts.length === 3
      ? `M ${from.x} ${from.y} L ${pts[1].x} ${pts[1].y} L ${endX} ${endY}`
      : `M ${from.x} ${from.y} L ${endX} ${endY}`;

    const g = svgEl('g', { class: 'anno-arrow', opacity: ARROW_STYLE.opacity });
    g.dataset.type = 'arrow';
    g.dataset.square = a.from;

    g.appendChild(svgEl('path', {
      d: d, fill: 'none', stroke: a.color, 'stroke-width': band,
      'stroke-linecap': 'round', 'stroke-linejoin': 'round'
    }));

    // head: tip on the target centre, base square to the last leg
    const bx = last.x - vx * headLen;
    const by = last.y - vy * headLen;
    const px = -vy, py = vx;
    g.appendChild(svgEl('polygon', {
      points: `${last.x},${last.y} ${bx + px * headHalf},${by + py * headHalf} ${bx - px * headHalf},${by - py * headHalf}`,
      fill: a.color, stroke: 'none'
    }));

    svg.appendChild(g);
  });
}
