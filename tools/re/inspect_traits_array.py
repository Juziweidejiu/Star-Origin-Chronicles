import re

with open('game_bundle.js', 'r', encoding='utf-8') as f:
    text = f.read()

# Let's locate the beginning and end of the trait list
# It seems traits have structure: {id:"...",label:...,tone:"...",category:"...",rarity:"...",affects:[...],rules:...,blurb:...}
idx = text.find('id:"claustrophobic"')
start_arr = text.rfind('[', 0, idx)
# Let's verify where the array starts
print("Array start candidates before claustrophobic:")
curr = idx
for _ in range(5):
    curr = text.rfind('[{id:', 0, curr)
    print(curr)
    if curr != -1:
        print(text[curr:curr+100])
        break
