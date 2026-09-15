// ============================================
// SVG ANNOTATIONS
// ============================================
// Arrow geometry is measured from the reference the teacher supplied (a
// 73.25px square): band 16px -> 0.22 sq, head tip sits exactly on the target
// square centre, head 23px long -> 0.31 sq and 34px wide -> 0.47 sq, and the
// fill is #ffaa00 at 0.8 alpha (the same band reads #fbb72a over a light square
// and #e3a610 over a dark one, which solves to exactly that colour/opacity).
// Knight-shaped moves are drawn as an L, long leg first, because that is how
// the piece actually travels - a straight diagonal line over a knight is the
// thing that makes an explanation hard to read.
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
  // the piece is already gone (the move was played, or a setup position the
  // engine does not know about) - the L shape itself is the signal then
  return true;
}

function sqPos(name, sqSize = 80) {
  const { r, c } = squareRC(name);
  return {
    x: (c + 0.5) * sqSize,
    y: (r + 0.5) * sqSize
  };
}

function sqTopLeft(name, sqSize = 80) {
  const { r, c } = squareRC(name);
  return { x: c * sqSize, y: r * sqSize };
}

function renderAnnotations() {
  const svg = els.boardSvg;
  svg.innerHTML = '';

  const rect = els.boardContainer.getBoundingClientRect();
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
    const p = sqTopLeft(h.square);
    const r = svgEl('rect', {
      x: p.x, y: p.y, width: sqSize, height: sqSize,
      fill: h.color, class: 'highlight-sq'
    });
    r.dataset.type = 'highlight';
    r.dataset.square = h.square;
    svg.appendChild(r);
  });

  // Rectangles
  state.rectangles.forEach(rc => {
    const a = sqTopLeft(rc.from);
    const b = sqTopLeft(rc.to);
    const x = Math.min(a.x, b.x);
    const y = Math.min(a.y, b.y);
    const w = Math.abs(a.x - b.x) + sqSize;
    const h2 = Math.abs(a.y - b.y) + sqSize;
    const r = svgEl('rect', {
      x: x, y: y, width: w, height: h2,
      fill: rc.color, 'fill-opacity': '0.3', stroke: rc.color,
      'stroke-width': Math.max(2, sqSize * 0.05), rx: Math.max(2, sqSize * 0.06)
    });
    r.dataset.type = 'rectangle';
    svg.appendChild(r);
  });

  // Circles
  state.circles.forEach(c => {
    const p = sqPos(c.square);
    const circle = svgEl('circle', {
      cx: p.x, cy: p.y, r: sqSize * 0.42, fill: 'none',
      stroke: c.color, 'stroke-width': Math.max(3, sqSize * 0.06)
    });
    circle.dataset.type = 'circle';
    circle.dataset.square = c.square;
    svg.appendChild(circle);
  });

  // Arrows - thick rounded band, triangular head on the target square centre
  const band = Math.max(ARROW_STYLE.minBand, sqSize * ARROW_STYLE.band);
  const headLen = sqSize * ARROW_STYLE.headLen;
  const headHalf = sqSize * ARROW_STYLE.headWide / 2;

  state.arrows.forEach(a => {
    const from = sqPos(a.from);
    const to = sqPos(a.to);
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
