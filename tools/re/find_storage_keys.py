import re

with open('game_bundle.js', 'r', encoding='utf-8') as f:
    text = f.read()

keys = set(re.findall(r'localStorage\.(?:getItem|setItem|removeItem)\(["\']([^"\']+)["\']', text))
print("LocalStorage Keys:")
for k in sorted(keys):
    print(" -", k)
