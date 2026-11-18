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
prefix = " DDZ1:"
C3 = 32

if payload.startswith(prefix):
    s = payload[len(prefix):]
    orig_len = (ord(s[0]) - C3) | ((ord(s[1]) - C3) << 15)
    print(f"Orig len: {orig_len}")
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
    print("Keys in save:", list(game_data.keys()))
    print("Version:", game_data.get('version'))
    guild = game_data.get('guild', {})
    print("Guild name:", guild.get('name'))
    print("Guild day:", guild.get('day'))
    print("Guild gold:", guild.get('gold'))
    print("Guild prestige:", guild.get('prestige'))
    print("Guild keys:", list(guild.keys()))
    print("Roster count:", len(game_data.get('roster', [])))
    if game_data.get('roster'):
        adv0 = game_data['roster'][0]
        print("Hero 0 keys:", list(adv0.keys()))
        print("Hero 0 summary:", {
            'name': adv0.get('name'),
            'classId': adv0.get('classId'),
            'raceId': adv0.get('raceId'),
            'age': adv0.get('age'),
            'level': adv0.get('level'),
            'xp': adv0.get('xp'),
            'attributes': adv0.get('attributes'),
            'gambits': adv0.get('gambits'),
            'traits': adv0.get('traits'),
            'vows': adv0.get('vows'),
            'scars': adv0.get('scars'),
            'equipment': adv0.get('equipment')
        })
