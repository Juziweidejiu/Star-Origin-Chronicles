with open('game_bundle.js', 'r', encoding='utf-8') as f:
    text = f.read()

# Let's inspect w_e and EQ
idx = 22959147
snip = text[idx-1000:idx+100]
print("Before broken check:")
print(snip)

# Find definition of EQ
# Let's search for "const EQ=" or "EQ=80" or "EQ=100"
import re
print("\nEQ definitions:")
for m in re.finditer(r'\bEQ\s*=\s*([0-9]+)', text):
    print(m.group(0))

# Find definition of w_e
print("\nw_e function:")
for m in re.finditer(r'function\s+w_e\b', text):
    start = m.start()
    print(text[start:start+500])
