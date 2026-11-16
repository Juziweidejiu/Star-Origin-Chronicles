import os
import re

exe_path = r"D:\Program Files (x86)\Steam\steamapps\common\Dungeons & Dynasties\DungeonsAndDynasties.exe"

print(f"File exists: {os.path.exists(exe_path)}")
print(f"File size: {os.path.getsize(exe_path)} bytes")

# Let's inspect PE with basic reading first
with open(exe_path, "rb") as f:
    data = f.read()

keywords = [
    b"tauri", b"wails", b"photino", b"neutralino", b"rust", b"cargo",
    b"electron", b"godot", b"unity", b"unreal", b"flutter",
    b"react", b"vue", b"svelte", b"angular", b"webpack", b"vite",
    b"index.html", b"assets/", b"steamworks", b"steam_api"
]

for kw in keywords:
    pos = 0
    count = 0
    first_offset = -1
    while True:
        pos = data.find(kw, pos)
        if pos == -1:
            break
        if first_offset == -1:
            first_offset = pos
        count += 1
        pos += len(kw)
    if count > 0:
        print(f"Keyword '{kw.decode()}': found {count} times, first at {hex(first_offset)}")

# Search for zip magic PK\x03\x04
zip_offsets = []
pos = 0
while True:
    pos = data.find(b"PK\x03\x04", pos)
    if pos == -1:
        break
    zip_offsets.append(pos)
    pos += 4

print(f"Zip headers (PK\\x03\\x04) found: {len(zip_offsets)}")
if zip_offsets:
    print(f"First zip at {hex(zip_offsets[0])}, last at {hex(zip_offsets[-1])}")

# Let's search for strings resembling URLs, domains, paths, rust crates
rust_crates = re.findall(rb"([a-zA-Z0-9_\-\.]+#[0-9\.]+)", data)
if rust_crates:
    print(f"Found crate-like patterns: {set(rust_crates[:20])}")

# Check for .rs or .go or .cs or .cpp paths
src_paths = re.findall(rb"([a-zA-Z0-9_\-\\/]+\.(?:rs|go|cs|cpp|c|ts|js|jsx|tsx|vue|svelte))", data)
print(f"Source file references found: {len(src_paths)}")
unique_src = set(src_paths[:50])
for s in list(unique_src)[:15]:
    print("  src:", s.decode('ascii', errors='ignore'))
