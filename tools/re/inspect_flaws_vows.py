with open('game_bundle.js', 'r', encoding='utf-8') as f:
    text = f.read()

import re
print("G4 value:")
for m in re.finditer(r'\bG4\s*=\s*([0-9.]+)', text):
    print(m.group(0))

idx = text.find('id:"sentimental",label:n("data.convictionVowFlaw')
print("Conviction/Vow/Flaw around:", idx)
start = max(0, idx - 1000)
end = min(len(text), idx + 2000)
print(text[start:end])
