import re

with open('game_bundle.js', 'r', encoding='utf-8') as f:
    text = f.read()

def safe_print(s):
    print(s.encode('ascii', 'backslashreplace').decode('ascii'))

idx = text.find('role:"tank",resource:"stamina",attackType:"melee"')
if idx != -1:
    safe_print("=== All Classes Base Stats & Weights ===")
    safe_print(text[max(0, idx-100):min(len(text), idx+5000)])
