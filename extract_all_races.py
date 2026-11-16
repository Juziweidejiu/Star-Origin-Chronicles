import re

with open('game_bundle.js', 'r', encoding='utf-8') as f:
    text = f.read()

def safe_print(s):
    print(s.encode('ascii', 'backslashreplace').decode('ascii'))

# Print the complete list of races around the first match
idx = text.find('leadership:1,decisions:1,teamwork:1},growthMod:1.08,careerWindowNew:[16,40]')
if idx != -1:
    safe_print("=== All Race Definitions ===")
    safe_print(text[max(0, idx-200):min(len(text), idx+3000)])
