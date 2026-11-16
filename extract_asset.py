import brotli
import os

exe_path = r"D:\Program Files (x86)\Steam\steamapps\common\Dungeons & Dynasties\DungeonsAndDynasties.exe"

with open(exe_path, "rb") as f:
    data = f.read()

# 0x721bcb, length 9138598
compressed_data = data[0x721bcb : 0x721bcb + 9138598]
decompressed = brotli.decompress(compressed_data)

out_path = r"D:\reverseGame\extracted_index.html"
with open(out_path, "wb") as f:
    f.write(decompressed)

print(f"Saved extracted_index.html, size: {len(decompressed)} bytes")

# Let's inspect the first 2000 chars of extracted_index.html
text = decompressed[:5000].decode('utf-8', errors='ignore')
print("--- Header Preview ---")
print(text[:2000])

# Check what other assets might be in the binary
# Let's look around 0xfd8d78 for a list or table of assets
table_start = 0xfd8d00
table_end = 0xfd9000
chunk = data[table_start:table_end]
print(f"\nAsset table area inspection ({hex(table_start)} - {hex(table_end)}):")
