with open('game_bundle.js', 'r', encoding='utf-8') as f:
    text = f.read()

import re

# Find start of lf array
idx = 22651664
arr_start = text.rfind('=[{id:', 0, idx)
chunk = text[arr_start+1:idx+100]

items = re.findall(r'\{id:"([^"]+)",type:[^,]+,"([^"]+)"\),icon:"([^"]+)",min:([0-9]+),max:([0-9]+),weight:([0-9]+),attrs:(\[[^\]]*\])(?:,grave:(!0|!1))?', chunk)
print(f"Total injuries found: {len(items)}")
for item in items:
    print(f"ID: {item[0]} | Type: {item[1]} | Min: {item[3]} | Max: {item[4]} | W: {item[5]} | Grave: {item[7]} | Attrs: {item[6]}")
