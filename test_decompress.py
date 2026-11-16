import zlib
import gzip

exe_path = r"D:\Program Files (x86)\Steam\steamapps\common\Dungeons & Dynasties\DungeonsAndDynasties.exe"

with open(exe_path, "rb") as f:
    data = f.read()

# Let's test decompression around 0x721bcd
start = 0x721bc1 + len("/index.html")
print(f"Testing decompression starting at {hex(start)}")

for i in range(start, start + 64):
    for wbits in [-15, 15, 31]: # raw deflate, zlib, gzip
        try:
            decomp = zlib.decompress(data[i:i+50000], wbits)
            print(f"Success at offset {hex(i)} with wbits {wbits}! Length: {len(decomp)}")
            print("Preview:", decomp[:200])
            break
        except Exception:
            pass

# Also let's check zstd
try:
    import zstandard
    print("zstandard available")
except ImportError:
    print("zstandard not installed")
