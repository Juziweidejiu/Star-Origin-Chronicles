import re

with open('game_bundle.js', 'r', encoding='utf-8') as f:
    text = f.read()

def safe_print(s):
    print(s.encode('ascii', 'backslashreplace').decode('ascii'))

# Find combat resolution / turn loop / tick loop
# Look for simulateCombat, runCombat, resolveCombat, battle, or similar
matches = re.findall(r'function\s+([a-zA-Z0-9_$]+)\s*\([^)]*\)\s*\{[^}]*(?:initiative|takeDamage|combatLog|threatTable)[^}]*\}', text)
print("Combat functions:", matches[:10])

# Search for threatTable logic
idx = text.find('threatTable')
while idx != -1:
    snippet = text[max(0, idx-100):min(len(text), idx+300)]
    if 'sim.' not in snippet:
        safe_print("--- Threat Table Match ---")
        safe_print(snippet)
        break
    idx = text.find('threatTable', idx+1)
