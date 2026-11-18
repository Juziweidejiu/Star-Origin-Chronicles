import re

with open('game_bundle.js', 'r', encoding='utf-8') as f:
    text = f.read()

# Let's search for "careerWindowLegacy" or "careerWindowNew"
m = re.findall(r'[a-zA-Z0-9_$]+:\s*\{[^}]*careerWindowNew[^}]*\}', text)
print(f"Races with careerWindowNew: {len(m)}")
for r in m:
    print(r[:200])
