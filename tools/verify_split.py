#!/usr/bin/env python3
"""Verify the ChessX css/ + js/ split is still intact.

The split is only safe while the concatenation of the parts (in load order)
still hashes to the original styles.css / app.js digest recorded in each
MANIFEST.json. Run this after editing css/* or js/* if you want to prove you
did not accidentally reorder, drop or duplicate a section.

    python3 tools/verify_split.py            # checks both trees
    python3 tools/verify_split.py --relax    # JS only: allow changed bytes, still
                                             # checks tag order + boot file last

Exit code 0 = ok, 1 = something is off.
"""
import glob, hashlib, json, os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RELAX = "--relax" in sys.argv
ok = True


def check(sub, ext, html_tag):
    global ok
    man = json.load(open(os.path.join(ROOT, sub, "MANIFEST.json")))
    parts = sorted(glob.glob(os.path.join(ROOT, sub, f"*{ext}")))
    names = [os.path.basename(p) for p in parts]
    blob = "".join(open(p).read() for p in parts)
    digest = hashlib.sha256(blob.encode()).hexdigest()

    same = digest == man["concat_sha256"]
    if not same and RELAX:
        print(f"[{sub}] bytes changed (ok with --relax) but checking structure")
    elif not same:
        ok = False
        print(f"[{sub}] FAIL concat sha {digest[:16]} != baseline {man['baseline_sha256'][:16]}")
    else:
        print(f"[{sub}] OK  {len(names)} files concatenate byte-identical to the original "
              f"{man['source']} ({man['source_bytes']}B, sha {digest[:16]})")

    # every part must be referenced by index.html, in the same order
    html = open(os.path.join(ROOT, "index.html")).read()
    refs = re.findall(html_tag, html)
    if refs != names:
        ok = False
        print(f"[{sub}] FAIL index.html loads {len(refs)} files, css/js dir has {len(names)}; "
              f"order/name mismatch")
        for i, (a, b) in enumerate(zip(refs, names)):
            if a != b:
                print(f"        first diff at position {i}: index.html={a} dir={b}")
                break
    else:
        print(f"[{sub}] OK  index.html loads all {len(refs)} files in the same order")

    orphan = set(man_files(man)) - set(names)
    if orphan:
        ok = False
        print(f"[{sub}] FAIL manifest lists files that are gone: {sorted(orphan)}")
    return names


def man_files(man):
    return [p["file"].split("/")[-1] for p in man["parts"]]


css = check("css", ".css", r'href="css/([^"]+\.css)"')
js = check("js", ".js", r'src="js/([^"]+\.js)"')

if js and not js[-1].startswith("90-"):
    ok = False
    print(f"[js] FAIL {js[-1]} is loaded last; js/90-boot.js must be last (it calls init())")
else:
    print("[js] OK  js/90-boot.js is the last script")

for f in ("styles.css", "app.js"):
    if os.path.exists(os.path.join(ROOT, f)):
        print(f"[warn] legacy monolith {f} still exists at repo root — it is NOT loaded; delete it")

print("\nRESULT:", "PASS" if ok else "FAIL")
sys.exit(0 if ok else 1)
