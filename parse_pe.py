import struct

exe_path = r"D:\Program Files (x86)\Steam\steamapps\common\Dungeons & Dynasties\DungeonsAndDynasties.exe"

with open(exe_path, "rb") as f:
    data = f.read()

# Parse DOS header
e_lfanew = struct.unpack_from("<I", data, 0x3C)[0]
magic = data[e_lfanew:e_lfanew+4]
print(f"PE signature: {magic}")

# File Header
num_sections = struct.unpack_from("<H", data, e_lfanew + 6)[0]
opt_hdr_size = struct.unpack_from("<H", data, e_lfanew + 20)[0]
opt_hdr_offset = e_lfanew + 24

# Optional Header (PE32+)
image_base = struct.unpack_from("<Q", data, opt_hdr_offset + 24)[0]
print(f"Image base: {hex(image_base)}, num sections: {num_sections}")

section_hdr_offset = opt_hdr_offset + opt_hdr_size

sections = []
for i in range(num_sections):
    sh = section_hdr_offset + i * 40
    name = data[sh:sh+8].rstrip(b"\x00").decode('latin1')
    vsize = struct.unpack_from("<I", data, sh + 8)[0]
    va = struct.unpack_from("<I", data, sh + 12)[0]
    raw_size = struct.unpack_from("<I", data, sh + 16)[0]
    raw_ptr = struct.unpack_from("<I", data, sh + 20)[0]
    sections.append({
        "name": name, "va": va, "vsize": vsize,
        "raw_ptr": raw_ptr, "raw_size": raw_size
    })
    print(f"Section {name:8s}: VA 0x{va:08x} (size 0x{vsize:08x}) -> Raw 0x{raw_ptr:08x} (size 0x{raw_size:08x})")

def va_to_raw(va):
    rva = va - image_base if va >= image_base else va
    for s in sections:
        if s["va"] <= rva < s["va"] + s["vsize"]:
            return s["raw_ptr"] + (rva - s["va"])
    return None

def raw_to_va(raw):
    for s in sections:
        if s["raw_ptr"] <= raw < s["raw_ptr"] + s["raw_size"]:
            return image_base + s["va"] + (raw - s["raw_ptr"])
    return None

print(f"/index.html is at raw 0x721bc0, VA: {hex(raw_to_va(0x721bc0))}")
