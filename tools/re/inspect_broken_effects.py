with open('game_bundle.js', 'r', encoding='utf-8') as f:
    text = f.read()

import re

# Search for where F.broken is used, or where "broken" state affects combat
matches = [m.start() for m in re.finditer(r'\bbroken\b', text)]
print(f"Total 'broken' occurrences: {len(matches)}")

for idx in matches[:10]:
    snippet = text[max(0, idx-50):min(len(text), idx+100)].replace('\n', ' ')
    print(f"[{idx}] {snippet}")
