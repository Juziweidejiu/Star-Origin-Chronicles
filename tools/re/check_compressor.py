exe_path = r"D:\Program Files (x86)\Steam\steamapps\common\Dungeons & Dynasties\DungeonsAndDynasties.exe"

with open(exe_path, "rb") as f:
    data = f.read()

keywords = [
    b"brotli", b"flate2", b"miniz", b"zstd", b"bzip2", b"lz4", b"deflate", b"gzip",
    b"EmbeddedAssets", b"embedded_assets", b"tauri_utils::assets", b"tauri::assets"
]

for kw in keywords:
    pos = data.find(kw)
    if pos != -1:
        print(f"Found {kw.decode()} at {hex(pos)}")
