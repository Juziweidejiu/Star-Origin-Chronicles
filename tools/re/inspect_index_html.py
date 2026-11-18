import os
import re

exe_path = r"D:\Program Files (x86)\Steam\steamapps\common\Dungeons & Dynasties\DungeonsAndDynasties.exe"

with open(exe_path, "rb") as f:
    data = f.read()

# Let's search for "index.html" and see surrounding context
idx = 0
while True:
    idx = data.find(b"index.html", idx)
    if idx == -1:
        break
    start = max(0, idx - 100)
    end = min(len(data), idx + 200)
    print(f"--- index.html at {hex(idx)} ---")
    print(data[start:end])
    idx += 10
