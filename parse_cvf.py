with open('game_bundle.js', 'r', encoding='utf-8') as f:
    text = f.read()

import re

# 1. Cg: Convictions
chunk1 = text[22421112:22434456]
items1 = re.findall(r'\{id:"([^"]+)",label:[^,]+,"([^"]+)"\)', chunk1)
print(f"1. Convictions (Cg): count={len(items1)}")
for id_, label in items1[:5]:
    print(f"   {id_}: {label}")

# 2. nve: Flaws
chunk2 = text[22434456:22445795]
items2 = re.findall(r'\{id:"([^"]+)",label:[^,]+,"([^"]+)"\)', chunk2)
print(f"\n2. Flaws (nve): count={len(items2)}")
for id_, label in items2[:5]:
    print(f"   {id_}: {label}")

# 3. g9: Vows
chunk3 = text[22445795:22478888]
items3 = re.findall(r'\{id:"([^"]+)",kind:"([^"]+)",name:[^,]+,"([^"]+)"\)', chunk3)
print(f"\n3. Vows (g9): count={len(items3)}")
for id_, kind, name in items3[:5]:
    print(f"   {id_} ({kind}): {name}")
