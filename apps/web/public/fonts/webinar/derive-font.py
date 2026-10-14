"""One-time, offline derivation. Not a runtime dependency or font subset."""
import hashlib
import json
from pathlib import Path

from fontTools.ttLib import TTFont

directory = Path(__file__).resolve().parent
source = directory.parent / "InterVariable.woff2"
assert hashlib.sha256(source.read_bytes()).hexdigest() == "693b77d4f32ee9b8bfc995589b5fad5e99adf2832738661f5402f9978429a8e3"
font = TTFont(source, recalcTimestamp=False)
font.flavor = None
family = "AutomatedLOWebinarInter"
for record in font["name"].names:
    if record.nameID in (1, 3, 4, 6, 16, 21, 25):
        record.string = family.encode(record.getEncoding())
font.save(directory / "AutomatedLOWebinarInter.ttf", reorderTables=True)
points = sorted(font.getBestCmap())
ranges = []
for point in points:
    if ranges and point == ranges[-1][1] + 1:
        ranges[-1][1] = point
    else:
        ranges.append([point, point])
(directory / "glyph-ranges.json").write_text("[\n" + ",\n".join("  " + json.dumps(row) for row in ranges) + "\n]\n", encoding="utf-8", newline="\n")
assert hashlib.sha256((directory.parent / "LICENSE.txt").read_bytes()).hexdigest() == "262481e844521b326f5ecd053e59b98c8b2da78c8ee1bdbb6e8174305e54935a"
for name in ("AutomatedLOWebinarInter.ttf", "glyph-ranges.json"):
    data = (directory / name).read_bytes()
    print(name, len(data), hashlib.sha256(data).hexdigest())
