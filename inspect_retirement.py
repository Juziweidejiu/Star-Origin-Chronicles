import re

with open('game_bundle.js', 'r', encoding='utf-8') as f:
    text = f.read()

def safe_print(s):
    print(s.encode('ascii', 'backslashreplace').decode('ascii'))

# Search for aging, birthday, retirement, mortality
matches = [m.start() for m in re.finditer(r'retire(?:ment)?|birthYear|aging|pension', text)]
print(f"Total retirement/aging occurrences: {len(matches)}")
for idx in matches[:10]:
    snippet = text[max(0, idx-100):min(len(text), idx+200)]
    if 'ui.' not in snippet and 'sim.chronicle' not in snippet:
        safe_print("--- Code Retirement / Age Snippet ---")
        safe_print(snippet)
