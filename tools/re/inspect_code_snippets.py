import re

with open('game_bundle.js', 'r', encoding='utf-8') as f:
    text = f.read()

# Strip non-ascii or encode safely
def safe_print(s):
    print(s.encode('ascii', 'backslashreplace').decode('ascii'))

# Find K3a function definition
idx = text.find('function K3a(')
if idx != -1:
    safe_print("=== K3a func ===")
    safe_print(text[idx:idx+1500])

# Find occurrences of "gambit" in code (excluding i18n)
gambit_matches = [m.start() for m in re.finditer(r'gambits?', text)]
print(f"Total gambit occurrences: {len(gambit_matches)}")
for idx in gambit_matches[:10]:
    snippet = text[max(0, idx-50):min(len(text), idx+150)]
    if 'sim.' not in snippet and 'ui.' not in snippet:
        safe_print("--- Code Gambit ---")
        safe_print(snippet)
