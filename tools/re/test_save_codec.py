import zlib

save_path = r'C:\Users\Xiaojuzi\AppData\Roaming\io.itch.brettlittle.dungeons-and-dynasties\saves\slot1.sav'
with open(save_path, 'r', encoding='utf-8') as f:
    content = f.read()

print("File len:", len(content))
print("Prefix:", repr(content[:30]))

prefix = " DDZ1:"
C3 = 32

def decode_ddz1(data_str):
    if not data_str.startswith(prefix):
        return data_str
    s = data_str[len(prefix):]
    # RSa
    orig_len = (ord(s[0]) - C3) | ((ord(s[1]) - C3) << 15)
    print(f"Compressed buffer length declared: {orig_len}")
    
    out = bytearray(orig_len)
    r = 0
    bits = 0
    t = 0
    for d in range(2, len(s)):
        if t >= orig_len:
            break
        r = (r << 15) | (ord(s[d]) - C3)
        bits += 15
        while bits >= 8 and t < orig_len:
            bits -= 8
            out[t] = (r >> bits) & 255
            t += 1
        r &= (1 << bits) - 1
    
    # Decompress using zlib/raw deflate
    # pako.deflate by default produces zlib format (with header 0x78 0x9c etc.) or raw deflate
    print("Out bytes start:", bytes(out[:10]).hex())
    try:
        decomp = zlib.decompress(bytes(out))
    except Exception as e:
        print("Standard zlib decompress failed:", e)
        try:
            decomp = zlib.decompress(bytes(out), -15) # raw deflate
        except Exception as e2:
            print("Raw deflate failed:", e2)
            decomp = None
    return decomp

decomp = decode_ddz1(content)
if decomp:
    text = decomp.decode('utf-8')
    print("Decompressed size:", len(text))
    print("JSON snippet:", text[:500])
    import json
    save_obj = json.loads(text)
    print("Top-level keys in save:", list(save_obj.keys()))
    if 'guild' in save_obj:
        print("Guild name:", save_obj['guild'].get('name'))
        print("Guild keys:", list(save_obj['guild'].keys()))
