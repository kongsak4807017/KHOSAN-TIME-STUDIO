"""Stage the exact owner-provided reference; no generation or image processing."""
from pathlib import Path
import base64
import hashlib
import json

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / ".khosan/local3d/transfers/elephant-reference"
TARGET = ROOT / "tools/local_3d_mcp/references/ep02_elephant_ref_r7.png"
EXPECTED = "d71d369974ceb275f3baffad6ca88bd88b1ac10d4c76c1b4db403779897f8bac"
encoded = "".join((SOURCE / f"part-{index:03}.b64").read_text(encoding="ascii") for index in range(13))
data = base64.b64decode(encoded, validate=True)
if hashlib.sha256(data).hexdigest() != EXPECTED:
    raise ValueError("Uploaded reference checksum differs")
TARGET.parent.mkdir(parents=True, exist_ok=True)
if not TARGET.resolve().is_relative_to(ROOT.resolve()):
    raise ValueError("Reference target leaves the Studio root")
if TARGET.exists():
    if hashlib.sha256(TARGET.read_bytes()).hexdigest() != EXPECTED:
        raise FileExistsError("A different reference already occupies the target")
else:
    with TARGET.open("xb") as stream:
        stream.write(data)
print(json.dumps({"path":str(TARGET),"sha256":EXPECTED,"bytes":len(data),"operation":"exact byte copy; no image transformation"}))
