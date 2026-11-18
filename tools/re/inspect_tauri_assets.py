import os
import zlib
import re

exe_path = r"D:\Program Files (x86)\Steam\steamapps\common\Dungeons & Dynasties\DungeonsAndDynasties.exe"

with open(exe_path, "rb") as f:
    data = f.read()

# Let's inspect the region around 0x721bc1
offset = 0x721bc1
print("Context around 0x721bc1:")
print(data[offset-50:offset+300])

# Let's see what strings are near here
chunk = data[offset:offset+50000]

# Tauri 2 embedded assets often have paths like /index.html, /assets/..., etc.
# Let's find all path-like strings in the binary that look like web assets
asset_paths = re.findall(rb"(/[a-zA-Z0-9_\-\.\/]+?\.(?:html|js|css|json|png|svg|ico|wasm|webm|mp3|ogg|wav|jpg|jpeg))", data)
print(f"Total web asset path matches: {len(asset_paths)}")
print("Unique asset paths:")
for p in sorted(list(set(asset_paths)))[:50]:
    print(" ", p.decode('ascii', errors='ignore'))
