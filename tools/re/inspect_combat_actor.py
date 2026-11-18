import re

with open('game_bundle.js', 'r', encoding='utf-8') as f:
    text = f.read()

def safe_print(s):
    print(s.encode('ascii', 'backslashreplace').decode('ascii'))

idx = text.find('behavior:OW(e),gambits:T0e(r??Yl(e.role,f.id))')
if idx != -1:
    safe_print(text[max(0, idx-1000):min(len(text), idx+1500)])
