with open('game_bundle.js', 'r', encoding='utf-8') as f:
    text = f.read()

import re

# Find arrays/objects inside Cg chunk
chunk = text[22421112:22479372]

# Search for patterns like: ],...=[ or ];\s*const
for m in re.finditer(r'\];(?:\s*(?:const|let|var)\s+([A-Za-z0-9_$]+)\s*=\s*(\[|\{))?', chunk):
    idx = 22421112 + m.start()
    print(f"End of array at {idx}, next var: {m.group(1)}")
    print(text[idx:idx+200].replace('\n', ' '))
