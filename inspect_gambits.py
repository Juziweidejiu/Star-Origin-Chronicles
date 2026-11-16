import re

with open('game_bundle.js', 'r', encoding='utf-8') as f:
    text = f.read()

def safe_print(s):
    print(s.encode('ascii', 'backslashreplace').decode('ascii'))

# Search for condition, target, action in gambits / combat rules
# In tactical RPGs, gambits have target condition + action
patterns = [
    r'target:\s*["\']',
    r'condition:\s*["\']',
    r'action:\s*["\']',
    r'gambits\s*:\s*\[',
    r'defaultGambits',
    r'classOrders'
]

for p in patterns:
    matches = list(re.finditer(p, text))
    print(f"Pattern {p} count: {len(matches)}")
    for m in matches[:3]:
        idx = m.start()
        safe_print(text[max(0, idx-50):min(len(text), idx+200)])
