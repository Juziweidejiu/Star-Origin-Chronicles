import json
import zlib
import sys

# Ensure UTF-8 output
sys.stdout.reconfigure(encoding='utf-8')

save_path = r'C:\Users\Xiaojuzi\AppData\Roaming\io.itch.brettlittle.dungeons-and-dynasties\saves\slot1.sav'
with open(save_path, 'r', encoding='utf-8') as f:
    env = json.load(f)

payload = env['data']
print("Payload length:", len(payload))
# Prefix is chr(1) + "DDZ1:"
prefix = chr(1) + "DDZ1:"
C3 = 32

if payload.startswith(prefix):
    s = payload[len(prefix):]
    orig_len = (ord(s[0]) - C3) | ((ord(s[1]) - C3) << 15)
    print(f"Orig compressed buffer len: {orig_len}")
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
    
    decomp = zlib.decompress(bytes(out))
    game_data = json.loads(decomp.decode('utf-8'))
    print("Decompressed successfully!")
    print("Save version:", game_data.get('version'))
    print("Top-level keys:", list(game_data.keys()))
    guild = game_data.get('guild', {})
    print(f"Guild Name: {guild.get('name')}, Day: {guild.get('day')}, Gold: {guild.get('gold')}, Prestige: {guild.get('prestige')}")
    print(f"Guild League: {guild.get('league')}, Division: {guild.get('division')}, Rank: {guild.get('rank')}")
    
    # Save a pretty sample of decompressed save to disk for inspection
    with open('save_decompressed_sample.json', 'w', encoding='utf-8') as f_out:
        json.dump(game_data, f_out, ensure_ascii=False, indent=2)
    print("Exported save_decompressed_sample.json!")
