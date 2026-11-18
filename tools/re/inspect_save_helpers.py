import re

with open('game_bundle.js', 'r', encoding='utf-8') as f:
    text = f.read()

idx = text.find('function iF(')
print(text[max(0, idx-300):min(len(text), idx+1500)])
