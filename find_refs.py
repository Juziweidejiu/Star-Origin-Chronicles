import struct
import brotli

exe_path = r"D:\Program Files (x86)\Steam\steamapps\common\Dungeons & Dynasties\DungeonsAndDynasties.exe"

with open(exe_path, "rb") as f:
    data = f.read()

# Let's import our va_to_raw logic
from parse_pe import va_to_raw, raw_to_va

target_va = raw_to_va(0x721bc0)
print(f"Target VA for /index.html: {hex(target_va)}")

ptr_bytes = struct.pack("<Q", target_va)
print("Searching for pointer bytes:", ptr_bytes.hex())

idx = 0
found = []
while True:
    idx = data.find(ptr_bytes, idx)
    if idx == -1:
        break
    found.append(idx)
    idx += 1

print(f"Found {len(found)} references to /index.html")
for f_off in found:
    print(f"Ref at raw 0x{f_off:08x}:")
    # inspect surrounding 128 bytes
    around = data[f_off-32:f_off+96]
    print("  Hex:", around.hex())
    # Try to interpret nearby pointers
    # In Rust slice: [ptr (8 bytes), len (8 bytes)]
    for i in range(f_off - 32, f_off + 64, 8):
        val = struct.unpack_from("<Q", data, i)[0]
        val_raw = va_to_raw(val)
        if val_raw is not None and val_raw < len(data):
            print(f"    offset {hex(i)}: VA {hex(val)} -> Raw {hex(val_raw)}")
            # check if it could be brotli data
            # check length next to it
            length = struct.unpack_from("<Q", data, i+8)[0]
            if 10 < length < 20000000:
                print(f"      potential data slice! len={length} (0x{length:x})")
                try:
                    dec = brotli.decompress(data[val_raw:val_raw+length])
                    print(f"      BROTLI DECOMPRESSED SUCCESS! Length: {len(dec)}")
                    print("      Sample:", dec[:150])
                except Exception as e:
                    pass
