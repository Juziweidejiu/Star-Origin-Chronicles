import re

with open('game_bundle.js', 'r', encoding='utf-8') as f:
    text = f.read()

# Let's search for "dd_save" or "dd_slot" or similar
matches = re.findall(r'["\']dd_[a-zA-Z0-9_]+["\']', text)
print("Unique dd_ keys in JS bundle:")
for k in sorted(set(matches)):
    print(k)
