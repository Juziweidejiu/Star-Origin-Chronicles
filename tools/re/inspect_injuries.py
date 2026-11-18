with open('game_bundle.js', 'r', encoding='utf-8') as f:
    text = f.read()

import re

# Find injury list or injury generation logic
matches = list(re.finditer(r'daysLeft\s*:', text))
print("daysLeft matches:", len(matches))
for m in matches:
    idx = m.start()
    print(f"[{idx}] {text[max(0, idx-100):min(len(text), idx+200)].replace('\n', ' ')}")

# Look for wipeScarred
print("\nwipeScarred matches:")
for m in re.finditer(r'wipeScarred', text):
    idx = m.start()
    print(f"[{idx}] {text[max(0, idx-50):min(len(text), idx+150)].replace('\n', ' ')}")
