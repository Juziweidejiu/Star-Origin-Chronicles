import re

with open('game_bundle.js', 'r', encoding='utf-8') as f:
    text = f.read()

def safe_print(s):
    print(s.encode('ascii', 'backslashreplace').decode('ascii'))

# Match 3 was: warden:{id:"taunt",...},blademaster:{id:"eviscerate",...}
# Let's inspect around match 3
idx = text.find('blademaster:{id:"eviscerate"')
if idx != -1:
    safe_print("=== Class Abilities Map ===")
    safe_print(text[max(0, idx-300):min(len(text), idx+1500)])

# Let's also look for class definitions with attackType, hpMod, damageMod, resource
idx2 = text.find('damageMod')
while idx2 != -1:
    snippet = text[max(0, idx2-100):min(len(text), idx2+400)]
    if 'attackType' in snippet:
        safe_print("=== Class Base Definition ===")
        safe_print(snippet)
        break
    idx2 = text.find('damageMod', idx2+1)
