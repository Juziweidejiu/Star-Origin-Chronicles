import re
import json
import sys

sys.stdout.reconfigure(encoding='utf-8')

with open(r"D:\reverseGame\game_bundle.js", "r", encoding="utf-8", errors="ignore") as f:
    js = f.read()

matches = [m.start() for m in re.finditer(r'ui\.DungeonScreen', js)]
print(f"Found {len(matches)} occurrences of ui.DungeonScreen")

for idx in matches[:5]:
    start = max(0, idx - 100)
    end = min(len(js), idx + 200)
    print(f"Context at {idx}:", repr(js[start:end]))

