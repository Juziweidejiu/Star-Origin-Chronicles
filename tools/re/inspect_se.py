with open('game_bundle.js', 'r', encoding='utf-8') as f:
    text = f.read()

idx = 22800635
print("=== S_e function and broken stat modification ===")
print(text[idx-200:idx+600])

import re
m = list(re.finditer(r'function\s+S_e\b', text))
if m:
    s_idx = m[0].start()
    print("\n=== S_e definition ===")
    print(text[s_idx:s_idx+500])
