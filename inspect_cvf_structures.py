with open('game_bundle.js', 'r', encoding='utf-8') as f:
    text = f.read()

import re

# Look for Cg definition and surrounding lists (Convictions, Vows, Flaws)
start = 22420000
end = 22480000
chunk = text[start:end]

# Find all const X=[{id:
for m in re.finditer(r'const\s+([A-Za-z0-9_$]+)\s*=\s*\[\{id:"([^"]+)"', chunk):
    pos = start + m.start()
    name = m.group(1)
    first_id = m.group(2)
    print(f"List {name} starting with {first_id} at {pos}")
    # print first 200 chars
    print("  Snippet:", text[pos:pos+300].replace('\n', ' '))
