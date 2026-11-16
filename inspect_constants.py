import re

with open('game_bundle.js', 'r', encoding='utf-8') as f:
    text = f.read()

def safe_print(s):
    print(s.encode('ascii', 'backslashreplace').decode('ascii'))

# Find bu constant object!
idx = text.find('const bu={')
if idx == -1:
    idx = text.find('bu={')
if idx != -1:
    safe_print("=== bu constants ===")
    safe_print(text[idx:idx+1500])

# Find za classes definition
idx2 = text.find('const za={')
if idx2 == -1:
    idx2 = text.find('za={')
if idx2 != -1:
    safe_print("=== za classes ===")
    safe_print(text[idx2:idx2+2500])
