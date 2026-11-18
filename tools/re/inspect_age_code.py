import re

with open('game_bundle.js', 'r', encoding='utf-8') as f:
    text = f.read()

# Split out the i18n section if possible, or look for code variable e.age
matches = [m.start() for m in re.finditer(r'\.age\s*[\+\=\>\<\!]|\.age\+\+', text)]
print(f"Age variable matches: {len(matches)}")
for idx in matches[:10]:
    print("--- Age Code Snippet ---")
    print(text[max(0, idx-100):min(len(text), idx+200)].encode('ascii', 'backslashreplace').decode('ascii'))
