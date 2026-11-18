with open('game_bundle.js', 'r', encoding='utf-8') as f:
    text = f.read()

import re

# Find arrays or objects defined around 22420000 - 22470000
idx = text.find('id:"sentimental"')
# Search backwards for variable declaration
var_decl = text.rfind('const ', 0, idx)
print("Declarations around flaws/vows:")
print(text[var_decl:var_decl+300])

# Let's search for "convictionVowFlaw"
matches = list(re.finditer(r'data\.convictionVowFlaw', text))
print(f"Total convictionVowFlaw matches: {len(matches)}")
first_m = matches[0].start()
last_m = matches[-1].start()
print("Range:", first_m, "to", last_m)
print("Snippet from start:")
print(text[first_m-100:first_m+400])
