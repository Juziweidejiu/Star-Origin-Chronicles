import re

with open('game_bundle.js', 'r', encoding='utf-8') as f:
    text = f.read()

def safe_print(s):
    print(s.encode('ascii', 'backslashreplace').decode('ascii'))

# Inspect around Zl(e) and iv(e.raceId)
idx = text.find('function LW(e){const[a,i]=iv(e.raceId);return e.age>=a+.65*(i-a)}')
if idx != -1:
    safe_print("=== Aging & Race Lifespans ===")
    safe_print(text[max(0, idx-500):min(len(text), idx+1500)])
