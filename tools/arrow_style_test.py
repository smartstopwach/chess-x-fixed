"""Arrow style test - run it with:  python3 tools/arrow_style_test.py

The reference this app is held against is a teaching-board screenshot with
73.25px squares on the green theme (light rgb(235,236,208) / dark
rgb(115,149,82)). Measured off that image:

  band        16px -> 0.218 sq
  head base   34px -> 0.464 sq
  head length 23px -> 0.314 sq
  tip         exactly on the target square centre
  fill+alpha  band over light = (251,183,42), over dark = (227,166,16)
              -> solves to #ffaa00 at alpha 0.8
  layering    the band disappears behind the piece on its origin square
  knight      L-shaped: long leg first, elbow on the origin's own file/rank

Every check here is a pixel scan of our own render or a DOM read, so "matches
the reference" stays a number instead of an opinion.

Needs: pip install playwright pillow && python3 -m playwright install chromium
"""
import functools, http.server, os, socketserver, sys, tempfile, threading
from playwright.sync_api import sync_playwright
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.environ.get("ARROW_SHOT_DIR") or os.path.join(tempfile.gettempdir(), "chessx-arrows")
os.makedirs(OUT, exist_ok=True)
PORT = int(os.environ.get("ARROW_TEST_PORT", "8402"))
Q = []


class S(socketserver.ThreadingTCPServer):
    allow_reuse_address = True
    daemon_threads = True


class H(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass


srv = S(("0.0.0.0", PORT), functools.partial(H, directory=ROOT))
threading.Thread(target=srv.serve_forever, daemon=True).start()
BASE = f"http://127.0.0.1:{PORT}/index.html"


def ck(name, cond, info=""):
    Q.append((name, bool(cond), info))
    print(("PASS " if cond else "FAIL ") + name + (f"  [{info}]" if info else ""))


def is_amber(rgb):
    r, g, b = rgb[:3]
    return r > 190 and 100 < g < 220 and b < 150 and (r - b) > 60


def near(a, b, t, n=3):
    return all(abs(a[i] - b[i]) <= t for i in range(min(n, len(a), len(b))))


with sync_playwright() as p:
    b = p.chromium.launch()
    pg = b.new_page(viewport={"width": 1600, "height": 1000})
    errs = []
    pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.on("console", lambda m: errs.append(m.text) if m.type == "error" else None)
    pg.goto(BASE, wait_until="load")
    pg.wait_for_timeout(2200)
    pg.evaluate("() => document.getElementById('modeCardNormal').click()")
    pg.wait_for_timeout(700)
    # pin the board to 640 and stop the fitter, so px math is exact
    pg.evaluate("""() => { const s = 640, bc = document.getElementById('boardContainer');
      bc.style.setProperty('--board-size', s + 'px'); bc.style.width = s + 'px'; bc.style.height = s + 'px';
      window.autoFitBoard = () => {}; }""")
    # a pawn on e2 keeps the position from being a drawn one (the draw fx veil
    # would otherwise tint the pixels we are about to sample)
    pg.evaluate('() => { state.game.load("4k3/8/8/8/8/8/4P3/4K3 w - - 0 1"); renderAll(); }')
    pg.wait_for_timeout(1700)

    def geo():
        return pg.evaluate("""() => { const bc = document.getElementById('boardContainer'); const cs = getComputedStyle(bc);
          const bl = parseFloat(cs.borderLeftWidth) || 0, bt = parseFloat(cs.borderTopWidth) || 0;
          const r = bc.getBoundingClientRect();
          return { x: r.x + bl, y: r.y + bt, box: r.width - bl - (parseFloat(cs.borderRightWidth) || 0),
                   vb: r.width, flip: !!state.flipped }; }""")

    G = [geo()]

    def sq_rect(name):
        return pg.evaluate("""(n) => { const el = [...document.querySelectorAll('.square')].find(s =>
            (s.dataset.square || s.getAttribute('data-square') || s.id.replace('sq-','')) === n);
          if (!el) return null; const r = el.getBoundingClientRect(); const cs = getComputedStyle(el);
          return { x: r.x, y: r.y, w: r.width, h: r.height, tone: el.classList.contains('light') ? 'light' : (el.classList.contains('dark') ? 'dark' : cs.backgroundColor) }; }""", name)

    def to_screen(sx, sy):
        g = G[0]; k = g["box"] / g["vb"]
        x, y = sx * k, sy * k
        if g["flip"]:
            x, y = g["box"] - x, g["box"] - y
        return g["x"] + x, g["y"] + y

    def svg_sq():
        return G[0]["vb"] / 8.0

    def svg_centre(name):
        c = "abcdefgh".index(name[0]); r = 8 - int(name[1]); q = svg_sq()
        return (c + 0.5) * q, (r + 0.5) * q

    def band_width(px, y, x, half):
        row = [xx for xx in range(int(x - half), int(x + half)) if is_amber(px[xx, y])]
        return (max(row) - min(row) + 1) if row else 0

    # ---------------------------------------------------------------- structure
    pg.evaluate("""() => { clearAllAnnotations();
      addArrow('b1','c3'); addArrow('d2','d4'); addArrow('e2','e3'); addArrow('g1','f3'); }""")
    pg.wait_for_timeout(350)
    st = pg.evaluate("""() => ({
      color: state.currentColor,
      arrows: state.arrows.map(a => a.from + a.to + a.color),
      paths: [...document.querySelectorAll('#boardSvg g.anno-arrow path')].map(p => p.getAttribute('d')),
      polys: [...document.querySelectorAll('#boardSvg g.anno-arrow polygon')].map(p => p.getAttribute('points')),
      groups: [...document.querySelectorAll('#boardSvg g.anno-arrow')].map(g => ({
        op: g.getAttribute('opacity'), type: g.dataset.type, sq: g.dataset.square,
        sw: parseFloat(g.querySelector('path').getAttribute('stroke-width')),
        cap: g.querySelector('path').getAttribute('stroke-linecap'),
        join: g.querySelector('path').getAttribute('stroke-linejoin'),
        stroke: g.querySelector('path').getAttribute('stroke'),
        fill: g.querySelector('polygon').getAttribute('fill'),
        markers: g.querySelector('marker') ? 1 : 0 })),
      svgZ: parseInt(getComputedStyle(document.getElementById('boardSvg')).zIndex),
      pieceZ: parseInt(getComputedStyle(document.querySelector('.piece')).zIndex),
      defs: document.querySelectorAll('#boardSvg defs').length })""")
    sq = svg_sq()

    ck("drawing colour defaults to the reference amber", st["color"] == "#ffaa00", st["color"])
    ck("4 arrows kept their colour", len(st["arrows"]) == 4 and all(a.endswith("#ffaa00") for a in st["arrows"]), str(st["arrows"]))
    ck("band width = 0.22 sq", all(abs(g["sw"] - 0.22 * sq) < 0.6 for g in st["groups"]), f"{st['groups'][0]['sw']} vs {0.22*sq:.2f}")
    ck("opacity 0.8 on the whole arrow", all(g["op"] == "0.8" for g in st["groups"]), "")
    ck("round caps, round joins (soft elbow)", all(g["cap"] == "round" and g["join"] == "round" for g in st["groups"]), "")
    ck("head is a filled triangle, no markers/defs left", all(g["fill"] == "#ffaa00" and not g["markers"] for g in st["groups"]) and st["defs"] == 0, f"defs={st['defs']}")
    ck("eraser metadata kept", all(g["type"] == "arrow" and g["sq"] for g in st["groups"]), "")

    def pts(d):
        n = [float(x) for x in d.replace("M", " ").replace("L", " ").replace(",", " ").split()]
        return list(zip(n[0::2], n[1::2]))

    p0 = pts(st["paths"][0])
    bx, by = svg_centre("b1"); cx, cy = svg_centre("c3")
    ck("knight arrow bends: 3 points", len(p0) == 3, str(p0))
    ck("elbow = origin file x, target rank y", abs(p0[1][0] - bx) < 1 and abs(p0[1][1] - cy) < 1,
       f"({p0[1][0]:.1f},{p0[1][1]:.1f}) want ({bx:.1f},{cy:.1f})")
    ck("tail exactly on origin centre", abs(p0[0][0] - bx) < 0.5 and abs(p0[0][1] - by) < 0.5, str(p0[0]))
    tip = [tuple(float(v) for v in s.split(",")) for s in st["polys"][0].split()]
    ck("head tip exactly on target centre", near(tip[0], (cx, cy), 0.5, 2), str(tip[0]))
    ck("pawn arrows stay straight", len(pts(st["paths"][1])) == 2 and len(pts(st["paths"][2])) == 2, "")
    p3 = pts(st["paths"][3])
    ck("both knight arrows bend the same way", len(p3) == 3, str(p3))

    # bend is knight-specific: a rook doing an L-shaped drag stays a straight line
    pg.evaluate('() => { state.game.load("4k3/8/8/8/8/4N3/4P3/R3K3 w - - 0 1"); renderAll(); }')
    pg.wait_for_timeout(1700)
    pg.evaluate("() => { clearAllAnnotations(); addArrow('a1','b3'); addArrow('e3','g4'); addArrow('h5','g7'); }")
    pg.wait_for_timeout(250)
    dd = pg.evaluate("() => [...document.querySelectorAll('#boardSvg path')].map(p => p.getAttribute('d'))")
    ck("L-shape by a rook stays straight", len(pts(dd[0])) == 2, dd[0])
    ck("L-shape by a knight bends", len(pts(dd[1])) == 3, dd[1])
    ck("knight-shaped arrow from an empty square bends", len(pts(dd[2])) == 3, dd[2])
    el = pts(dd[1])[1]; e3 = svg_centre("e3"); g4 = svg_centre("g4")
    ck("knight elbow takes the long leg first (along rank 3, then up)",
       abs(el[0] - g4[0]) < 1 and abs(el[1] - e3[1]) < 1, f"elbow ({el[0]:.0f},{el[1]:.0f})")

    # ------------------------------------------------------------------ pixels
    pg.evaluate("() => { clearAllAnnotations(); addArrow('b1','c3'); }")
    pg.wait_for_timeout(250)
    pg.screenshot(path=os.path.join(OUT, "arrow-mine.png"))
    im = Image.open(os.path.join(OUT, "arrow-mine.png")).convert("RGB"); px = im.load()

    # the vertical leg crosses b1, b2, b3: one of them is light, one dark
    tones = {}
    widths = []
    for name in ("b1", "b2", "b3"):
        r = sq_rect(name)
        if not r:
            ck("square lookup works", False, name)
            break
        cxp, cyp = r["x"] + r["w"] / 2, r["y"] + r["h"] / 2
        w = band_width(px, cyp, cxp, r["w"])
        tones.setdefault(r["tone"], (px[int(cxp), int(cyp)],
                                     px[int(cxp + r["w"] * 0.42), int(cyp)]))
        if w > 3:
            widths.append(w)
    real_sq = sq_rect("b2")["w"]
    med = sorted(widths)[len(widths) // 2] if widths else 0
    ck("painted band width matches the reference ratio", abs(med - 0.218 * real_sq) <= max(2.0, 0.04 * real_sq),
       f"{med}px on a {real_sq:.1f}px square (ref 16px on 73.25px)")
    print("    tones:", {k: v for k, v in tones.items()})
    if "light" in tones and "dark" in tones:
        for tone, want in (("light", (251, 183, 42)), ("dark", (227, 166, 16))):
            got = tones[tone][0]
            ck(f"band over {tone} square = reference pixels", near(got, want, 7), f"{got} want {want}")
        # solve the pure colour through the alpha, both backgrounds must agree
        def solve(o, bg):
            return tuple(round((o[i] - 0.2 * bg[i]) / 0.8) for i in range(3))
        c1 = solve(tones["light"][0], tones["light"][1])
        c2 = solve(tones["dark"][0], tones["dark"][1])
        ck("fill solves to #ffaa00", near(c1, (255, 170, 0), 9) and near(c2, (255, 170, 0), 9), f"{c1} {c2}")
    else:
        ck("square tones readable", False, str(list(tones)))

    # head base + length, measured on a straight up-arrow (a2 -> a4 head at a4)
    pg.evaluate("() => { clearAllAnnotations(); addArrow('a2','a4'); }")
    pg.wait_for_timeout(250)
    pg.screenshot(path=os.path.join(OUT, "arrow-head.png"))
    im2 = Image.open(os.path.join(OUT, "arrow-head.png")).convert("RGB"); px2 = im2.load()
    r4 = sq_rect("a4")
    hx, hy = r4["x"] + r4["w"] / 2, r4["y"] + r4["h"] / 2
    ystart = int(hy - r4["h"] * 0.6)
    prof = [(y, band_width(px2, y, hx, r4["w"] * 0.9)) for y in range(ystart, int(hy + r4["h"] * 0.9))]
    base = max(w for _, w in prof)
    band_only = sorted(w for _, w in prof if w > 3)[len([1 for _, w in prof if w > 3]) // 2] if any(w > 3 for _, w in prof) else 0
    seen = [y for y, w in prof if w > 1]
    wide = [y for y, w in prof if w > band_only + 3]
    length = (max(wide) - min(seen) + 1) if wide and seen else 0
    ck("head tip is on the target-square centre", abs((min(seen) - ystart) - 0.6 * r4["h"]) <= 3,
       f"tip {min(seen) - ystart}px from window start, centre is {0.6*r4['h']:.0f}px")
    ck("head base ~0.46 sq", abs(base - 0.464 * real_sq) <= max(3, 0.08 * real_sq), f"{base}px vs {0.464*real_sq:.1f}")
    ck("head length ~0.31 sq", abs(length - 0.314 * real_sq) <= max(3, 0.10 * real_sq), f"{length}px vs {0.314*real_sq:.1f}")

    # layering: the band hides behind the piece standing on its origin square
    ck("annotation layer paints under the pieces", st["svgZ"] < st["pieceZ"], f"{st['svgZ']} vs {st['pieceZ']}")
    pg.evaluate("() => { clearAllAnnotations(); addArrow('e2','e4'); }")  # e2 holds a white pawn
    pg.wait_for_timeout(250)
    pg.screenshot(path=os.path.join(OUT, "arrow-under-piece.png"))
    im3 = Image.open(os.path.join(OUT, "arrow-under-piece.png")).convert("RGB"); px3 = im3.load()
    r2 = sq_rect("e2")
    oc, oe = r2["x"] + r2["w"] / 2, r2["y"] + r2["h"] / 2
    over_piece = [px3[int(oc + dx), int(oe + dy)] for dx, dy in ((0, 0), (0, -6), (5, 4), (-5, 4))]
    ck("piece on the origin square covers the tail", not any(is_amber(c) for c in over_piece), str(over_piece[:2]))
    clear_rows = [y for y in range(int(oe - r2["h"] * 1.6), int(oe - r2["h"] * 0.62)) if band_width(px3, y, oc, r2["w"]) > 4]
    ck("band shows again on the empty squares above", len(clear_rows) > 10, f"{len(clear_rows)} rows")

    # -------------------------------------------------------------------- flip
    pg.evaluate("() => { clearAllAnnotations(); addArrow('b1','c3'); flipBoard(); }")
    pg.wait_for_timeout(350)
    G[0] = geo()
    up_d = pg.evaluate("() => document.querySelector('#boardSvg path').getAttribute('d')")
    pg.screenshot(path=os.path.join(OUT, "arrow-flipped.png"))
    imf = Image.open(os.path.join(OUT, "arrow-flipped.png")).convert("RGB"); pxf = imf.load()
    half = svg_sq() * 0.30
    def amber_box(name, size=0.30):
        r = sq_rect(name)
        cx0, cy0 = r["x"] + r["w"] / 2, r["y"] + r["h"] / 2
        return sum(1 for yy in range(int(cy0 - r["h"] * size), int(cy0 + r["h"] * size))
                   for xx in range(int(cx0 - r["w"] * size), int(cx0 + r["w"] * size)) if is_amber(pxf[xx, yy]))
    ck("flip: svg rotates, geometry untouched", "rotate" in pg.evaluate("() => document.getElementById('boardSvg').style.transform"), up_d)
    # on a flipped board the tail belongs at bottom-right-ish, head at top-left-ish
    # the physical cell that held b1 before the flip: mirror the file/rank ourselves
    g0 = G[0]
    ox = g0["x"] + (1 + 0.5) * (g0["box"] / 8.0)
    oy = g0["y"] + (7 + 0.5) * (g0["box"] / 8.0)
    tail_here = sum(1 for yy in range(int(oy - half), int(oy + half))
                    for xx in range(int(ox - half), int(ox + half)) if is_amber(pxf[xx, yy]))
    # screen position of c3 when flipped = mirror of the board box
    g = G[0]
    sx, sy = to_screen(*svg_centre("c3"))
    n_head = sum(1 for yy in range(int(sy - half), int(sy + half)) for xx in range(int(sx - half), int(sx + half)) if is_amber(pxf[xx, yy]))
    sx2, sy2 = to_screen(*svg_centre("b1"))
    n_tail = sum(1 for yy in range(int(sy2 - half), int(sy2 + half)) for xx in range(int(sx2 - half), int(sx2 + half)) if is_amber(pxf[xx, yy]))
    ck("flip: head sits on the flipped target square", n_head > 40, f"{n_head} px at ({sx:.0f},{sy:.0f})")
    ck("flip: tail follows to the flipped origin", n_tail > 20, f"{n_tail} px at ({sx2:.0f},{sy2:.0f})")
    ck("flip: nothing left at the old unflipped spot", tail_here == 0, f"{tail_here} px at the vacated cell")
    pg.evaluate("() => { flipBoard(); }")
    pg.wait_for_timeout(250)

    # ------------------------------------------------------- tools + reload mix
    pg.evaluate("() => { clearAllAnnotations(); addArrow('b1','c3'); addArrow('d2','d4'); }")
    pg.wait_for_timeout(200)
    pg.evaluate("() => { eraseAnnotationAt('c3'); renderAnnotations(); }")
    ck("eraser by target square", pg.evaluate("() => state.arrows.length") == 1, "")
    pg.evaluate("() => { eraseAnnotationAt('d2'); renderAnnotations(); }")
    ck("eraser by origin square", pg.evaluate("() => state.arrows.length") == 0, "")
    pg.evaluate("() => { setTool('arrow'); }")
    pg.wait_for_timeout(200)
    r1 = sq_rect("g1"); r2 = sq_rect("f3")
    pg.mouse.move(r1["x"] + r1["w"] / 2, r1["y"] + r1["h"] / 2)
    pg.mouse.down()
    pg.mouse.move(r2["x"] + r2["w"] / 2, r2["y"] + r2["h"] / 2, steps=8)
    pg.mouse.up()
    pg.wait_for_timeout(300)
    drag = pg.evaluate("() => state.arrows.slice()")
    ck("mouse drag with the arrow tool draws a knight arrow",
       len(drag) == 1 and drag[0]["from"] == "g1" and drag[0]["to"] == "f3", str(drag))
    pg.wait_for_timeout(1400)
    pg.reload(wait_until="load")
    pg.wait_for_timeout(2000)
    back = pg.evaluate("""() => ({ n: state.arrows.length, color: state.arrows[0] && state.arrows[0].color,
      groups: document.querySelectorAll('#boardSvg g.anno-arrow').length,
      bend: (document.querySelector('#boardSvg path')||{}).getAttribute ? document.querySelector('#boardSvg path').getAttribute('d').split('L').length : 0 })""")
    ck("arrow survives a reload", back["n"] == 1 and back["groups"] == 1, str(back))
    ck("reloaded arrow keeps the amber and the bend", back["color"] == "#ffaa00" and back["bend"] == 3, str(back))

    ck("no js/console errors", not errs, "; ".join(errs[:3]))
    b.close()

srv.shutdown()
fails = [n for n, ok, _ in Q if not ok]
print(f"\n{len(Q) - len(fails)}/{len(Q)} passed" + (f"\nFAILED: {fails}" if fails else "  ALL PASS"))
sys.exit(1 if fails else 0)
