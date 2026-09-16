// ============================================
// SVG ANNOTATIONS
// ============================================
// Every annotation is laid out from the board's actual square geometry rather
// than from the outer board-container box. The container has a border, and
// using that outer width made the SVG drift by a few pixels at the edges: a
// circle/triangle/hexagon could look as if it belonged to the next square and
// a rectangle could paint over the grid line. The helpers below use the real
// #board and map its top-left into the SVG's coordinate space, so the centre
// of every mark is the centre of its square at every board size.
//
// Arrows are a thick rounded band with a filled triangular head. Knight moves
// get an L-shaped path so the piece's actual route remains readable.
const ARROW_STYLE = {
  band: 0.20,        // stroke width, as a fraction of one square
  headLen: 0.38,     // tip -> base (longer head makes it sharp and pointy)
  headWide: 0.44,    // base width
  opacity: 0.85,
  minBand: 5         // never thinner than this, so it is visible on small boards
};

// The outline marks deliberately stay inside one square. The radius includes
// the centre of the stroke; its half-width is still comfortably inside the
// square, including on the outermost rank/file.
const SHAPE_RADIUS = 0.38;
const SHAPE_STROKE = 0.055;

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
  // the piece is already gone (the move was played, or a setup position the
  // engine does not know about) - the L shape itself is the signal then
  return true;
}

function sqPos(name, sqSize = 80, offsetX = 0, offsetY = 0) {
  const { r, c } = squareRC(name);
  return {
    x: offsetX + (c + 0.5) * sqSize,
    y: offsetY + (r + 0.5) * sqSize
  };
}

function sqTopLeft(name, sqSize = 80, offsetX = 0, offsetY = 0) {
  const { r, c } = squareRC(name);
  return { x: offsetX + c * sqSize, y: offsetY + r * sqSize };
}

function renderAnnotations() {
  const svg = els.boardSvg;
  const containerRect = els.boardContainer.getBoundingClientRect();
  if (!containerRect.width || !containerRect.height) return;

  if (state.flipped) {
    svg.style.transform = 'rotate(180deg)';
  } else {
    svg.style.transform = 'none';
  }

  // #board is the grid that the user sees. #boardSvg is an overlay inside the
  // bordered container, so its origin can be offset by the frame. Use a
  // pixel-sized viewBox and map the grid into it exactly; this avoids both
  // outer-border drift and fractional rounding on large boards.
  const boardRect = els.board.getBoundingClientRect();
  const svgRect = svg.getBoundingClientRect();
  const viewWidth = Math.max(1, svgRect.width || containerRect.width);
  const viewHeight = Math.max(1, svgRect.height || containerRect.height);
  const boardWidth = Math.max(1, boardRect.width || containerRect.width);
  const boardHeight = Math.max(1, boardRect.height || containerRect.height);
  const sqSize = Math.min(boardWidth, boardHeight) / 8;
  const offsetX = Number.isFinite(boardRect.left - svgRect.left) ? boardRect.left - svgRect.left : 0;
  const offsetY = Number.isFinite(boardRect.top - svgRect.top) ? boardRect.top - svgRect.top : 0;

  svg.setAttribute('viewBox', `0 0 ${viewWidth} ${viewHeight}`);
  svg.setAttribute('preserveAspectRatio', 'none');
  svg.innerHTML = '';

  // Highlights
  state.highlights.forEach(h => {
    const p = sqTopLeft(h.square, sqSize, offsetX, offsetY);
    const r = svgEl('rect', {
      x: p.x, y: p.y, width: sqSize, height: sqSize,
      fill: h.color, class: 'highlight-sq'
    });
    r.dataset.type = 'highlight';
    r.dataset.square = h.square;
    svg.appendChild(r);
  });

  // Rectangles. Their border is inset so it never spills over the selected
  // square(s) or sits on top of the board grid line. The interaction layer uses
  // one-square rectangles for a click, while this renderer also remains safe
  // for saved legacy multi-square rectangles.
  state.rectangles.forEach(rc => {
    const a = sqTopLeft(rc.from, sqSize, offsetX, offsetY);
    const b = sqTopLeft(rc.to, sqSize, offsetX, offsetY);
    const stroke = Math.max(2, sqSize * 0.05);
    const inset = Math.max(stroke / 2 + 1, sqSize * 0.07);
    const x = Math.min(a.x, b.x) + inset;
    const y = Math.min(a.y, b.y) + inset;
    const w = Math.max(1, Math.abs(a.x - b.x) + sqSize - inset * 2);
    const h2 = Math.max(1, Math.abs(a.y - b.y) + sqSize - inset * 2);
    const r = svgEl('rect', {
      x: x, y: y, width: w, height: h2,
      fill: rc.color, 'fill-opacity': '0.3', stroke: rc.color,
      'stroke-width': stroke, rx: Math.max(2, sqSize * 0.06)
    });
    r.dataset.type = 'rectangle';
    r.dataset.square = rc.from;
    svg.appendChild(r);
  });

  // Circles - the radius and stroke are constrained to the square footprint.
  state.circles.forEach(c => {
    const p = sqPos(c.square, sqSize, offsetX, offsetY);
    const circle = svgEl('circle', {
      cx: p.x, cy: p.y, r: sqSize * SHAPE_RADIUS, fill: 'none',
      stroke: c.color, 'stroke-width': Math.max(2.5, sqSize * SHAPE_STROKE)
    });
    circle.dataset.type = 'circle';
    circle.dataset.square = c.square;
    svg.appendChild(circle);
  });

  // Triangles - centred on one square, with all three vertices inside it.
  (state.triangles || []).forEach(t => {
    const p = sqPos(t.square, sqSize, offsetX, offsetY);
    const r = sqSize * SHAPE_RADIUS;
    const pts = [-90, 30, 150].map(deg => {
      const a = deg * Math.PI / 180;
      return (p.x + r * Math.cos(a)).toFixed(2) + ',' + (p.y + r * Math.sin(a)).toFixed(2);
    }).join(' ');
    const el = svgEl('polygon', {
      points: pts, fill: 'none', stroke: t.color,
      'stroke-width': Math.max(2.5, sqSize * SHAPE_STROKE), 'stroke-linejoin': 'round'
    });
    el.dataset.type = 'triangle';
    el.dataset.square = t.square;
    svg.appendChild(el);
  });

  // Hexagons - regular, flat-top, with the same centred footprint.
  (state.hexagons || []).forEach(h => {
    const p = sqPos(h.square, sqSize, offsetX, offsetY);
    const r = sqSize * SHAPE_RADIUS;
    const pts = [0, 60, 120, 180, 240, 300].map(deg => {
      const a = deg * Math.PI / 180;
      return (p.x + r * Math.cos(a)).toFixed(2) + ',' + (p.y + r * Math.sin(a)).toFixed(2);
    }).join(' ');
    const el = svgEl('polygon', {
      points: pts, fill: 'none', stroke: h.color,
      'stroke-width': Math.max(2.5, sqSize * SHAPE_STROKE), 'stroke-linejoin': 'round'
    });
    el.dataset.type = 'hexagon';
    el.dataset.square = h.square;
    svg.appendChild(el);
  });

  // Arrows - thick rounded band, triangular head on the target square centre.
  const band = Math.max(ARROW_STYLE.minBand, sqSize * ARROW_STYLE.band);
  const headLen = sqSize * ARROW_STYLE.headLen;
  const headHalf = sqSize * ARROW_STYLE.headWide / 2;

  state.arrows.forEach(a => {
    const from = sqPos(a.from, sqSize, offsetX, offsetY);
    const to = sqPos(a.to, sqSize, offsetX, offsetY);
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
