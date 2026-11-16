import re

exe_path = r"D:\Program Files (x86)\Steam\steamapps\common\Dungeons & Dynasties\DungeonsAndDynasties.exe"

with open(exe_path, "rb") as f:
    data = f.read()

# Match cargo registry crates
crates = set()
for m in re.finditer(rb"([a-zA-Z0-9_\-]+-[0-9]+\.[0-9]+\.[0-9]+[a-zA-Z0-9_\-\.]*)[\\/]", data):
    crates.add(m.group(1).decode('ascii', errors='ignore'))

print("Found crates:")
for c in sorted(list(crates)):
    if any(k in c for k in ['tauri', 'steam', 'zip', 'brotli', 'zstd', 'flate', 'serde', 'tokio', 'wry', 'tao']):
        print(" ", c)

print("\nTotal crates matched:", len(crates))
