import json

save_path = r'C:\Users\Xiaojuzi\AppData\Roaming\io.itch.brettlittle.dungeons-and-dynasties\saves\slot1.sav'
with open(save_path, 'r', encoding='utf-8') as f:
    data = json.load(f)

print("Envelope keys:", list(data.keys()))
for k, v in data.items():
    if isinstance(v, str):
        print(f"Key {k}: string len {len(v)}, prefix: {repr(v[:50])}")
    else:
        print(f"Key {k}: {type(v)} = {v}")
