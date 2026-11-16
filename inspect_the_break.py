with open('game_bundle.js', 'r', encoding='utf-8') as f:
    text = f.read()

import re

m = list(re.finditer(r'function\s+w_e\b', text))[0]
start = m.start()
print(text[start:start+1200])
