"""Regression test: verify_split must reject a manifest that omits a split file."""
import json
import os
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

with tempfile.TemporaryDirectory(prefix="chessx-split-qa-") as tmp_name:
    tmp = Path(tmp_name)
    shutil.copy2(ROOT / "index.html", tmp / "index.html")
    shutil.copytree(ROOT / "css", tmp / "css")
    shutil.copytree(ROOT / "js", tmp / "js")
    (tmp / "tools").mkdir()
    shutil.copy2(ROOT / "tools" / "verify_split.py", tmp / "tools" / "verify_split.py")

    manifest_path = tmp / "js" / "MANIFEST.json"
    manifest = json.loads(manifest_path.read_text())
    manifest["parts"] = manifest["parts"][:-1]
    manifest_path.write_text(json.dumps(manifest, indent=2) + "\n")

    result = subprocess.run(
        [sys.executable, str(tmp / "tools" / "verify_split.py")],
        cwd=tmp,
        text=True,
        capture_output=True,
        check=False,
    )
    output = result.stdout + result.stderr
    if result.returncode == 0 or "manifest omits files that are present" not in output:
        print(output)
        raise SystemExit("verify_split failed to detect the omitted manifest file")

print("VERIFY-SPLIT REGRESSION: PASS")
