with open('game_bundle.js', 'r', encoding='utf-8') as f:
    text = f.read()

import re

# Look for stress formulas: stress +=, stress -=, gainStress, loseStress, max 100
matches = [m.start() for m in re.finditer(r'\.stress\s*=', text)]
print(f"Total .stress = occurrences: {len(matches)}")

for idx in matches[:15]:
    snippet = text[max(0, idx-60):min(len(text), idx+100)].replace('\n', ' ')
    print(f"[{idx}] {snippet}")
