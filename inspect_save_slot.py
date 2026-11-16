import re

with open('game_bundle.js', 'r', encoding='utf-8') as f:
    text = f.read()

matches = [m.start() for m in re.finditer(r'dd_save_slot', text)]
for idx in matches:
    print("--- DD_SAVE_SLOT SNIPPET ---")
    print(text[max(0, idx-400):min(len(text), idx+600)])
