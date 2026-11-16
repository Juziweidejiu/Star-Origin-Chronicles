import brotli

exe_path = r"D:\Program Files (x86)\Steam\steamapps\common\Dungeons & Dynasties\DungeonsAndDynasties.exe"

with open(exe_path, "rb") as f:
    data = f.read()

# Let's inspect bytes near 0x721bc1
target = b"/index.html"
idx = data.find(target)
print("Index:", hex(idx))
print("Bytes after index.html:", data[idx+len(target):idx+len(target)+64])

# Let's try brotli decompress starting from various offsets after /index.html
start = idx + len(target)
for off in range(start, start + 128):
    try:
        dec = brotli.decompress(data[off:off+200000])
        print(f"Brotli success at offset {hex(off)}! Length: {len(dec)}")
        print(dec[:200])
        break
    except Exception as e:
        pass
