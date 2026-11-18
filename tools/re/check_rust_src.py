import re

exe_path = r"D:\Program Files (x86)\Steam\steamapps\common\Dungeons & Dynasties\DungeonsAndDynasties.exe"

with open(exe_path, "rb") as f:
    data = f.read()

# Search for source paths under src\
matches = set(re.findall(rb"([a-zA-Z0-9_\-\\]+\\src\\[a-zA-Z0-9_\-\\]+\.rs)", data))
for m in sorted(matches):
    try:
        s = m.decode('ascii')
        if not any(k in s for k in ['registry', '.cargo', 'rustc', 'tauri', 'tokio', 'wry', 'tao', 'brotli', 'serde']):
            print("Custom rust source:", s)
    except:
        pass
