with open('game_bundle.js', 'r', encoding='utf-8') as f:
    text = f.read()

import re

chunk = text[22421112:22478888]
# Let's find all `,` between top-level arrays or let's search for labels like F1, Q6, Cg
print("Let's look for `,` followed by identifier and `=[`:")
for m in re.finditer(r',([A-Za-z0-9_$]+)=\[', chunk):
    idx = 22421112 + m.start()
    print(f"Sub-array {m.group(1)} at {idx}: {text[idx:idx+150].replace('\n', ' ')}")
