with open('game_bundle.js', 'r', encoding='utf-8') as f:
    text = f.read()

import re

start = 22421112
end = 22480000
chunk = text[start:end]

# Let's find all array declarations: const X=[ or let X=[
for m in re.finditer(r'(?:const|let|var)\s+([A-Za-z0-9_$]+)\s*=\s*(\[|\{)', chunk):
    pos = start + m.start()
    print(f"Var: {m.group(1)} at {pos}: {text[pos:pos+120].replace('\n', ' ')}")
