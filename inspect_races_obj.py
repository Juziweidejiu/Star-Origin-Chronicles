import re

with open('game_bundle.js', 'r', encoding='utf-8') as f:
    text = f.read()

def safe_print(s):
    print(s.encode('ascii', 'backslashreplace').decode('ascii'))

# Find $o definition
idx = text.find('const $o={')
if idx == -1:
    idx = text.find('$o={')
if idx != -1:
    safe_print("=== Races $o Object ===")
    safe_print(text[idx:idx+3500])
