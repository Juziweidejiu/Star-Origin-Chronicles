import re

with open('game_bundle.js', 'r', encoding='utf-8') as f:
    text = f.read()

def safe_print(s):
    print(s.encode('ascii', 'backslashreplace').decode('ascii'))

idx = text.find('const gre={heal:{target:"lowestAlly"')
if idx != -1:
    safe_print(text[idx-200:idx+2500])
