import re

with open('game_bundle.js', 'r', encoding='utf-8') as f:
    text = f.read()

def safe_print(s):
    print(s.encode('ascii', 'backslashreplace').decode('ascii'))

# Find function iv(
idx = text.find('function iv(')
if idx != -1:
    safe_print("=== function iv (race lifespans) ===")
    safe_print(text[idx:idx+800])
