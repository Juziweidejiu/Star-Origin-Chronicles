import re

with open('game_bundle.js', 'r', encoding='utf-8') as f:
    text = f.read()

idx = text.find('function bC(e)')
print(text[idx-1000:idx])
