with open('game_bundle.js', 'r', encoding='utf-8') as f:
    text = f.read()

import re

# Look for room kinds: kind:"combat", kind:"camp", etc.
matches = list(re.finditer(r'kind:\s*"(camp|rest|combat|trap|puzzle|shrine|treasure|boss|rival)"', text))
print(f"Room kinds matches: {len(matches)}")

for m in matches[:10]:
    idx = m.start()
    print(f"[{m.group(1)}] at {idx}: {text[max(0, idx-40):min(len(text), idx+100)].replace('\n', ' ')}")

# Search for Dungeon generation: dungeon room types
print("\nDungeon room generation snippets:")
for m in re.finditer(r'rooms\.push\(\{', text):
    idx = m.start()
    print(f"rooms.push at {idx}: {text[idx:idx+150].replace('\n', ' ')}")
