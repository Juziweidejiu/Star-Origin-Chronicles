with open('game_bundle.js', 'r', encoding='utf-8') as f:
    text = f.read()

# Let's inspect the trait array definition around 22200000 - 22227000
idx = text.find('id:"claustrophobic"')
print("Trait definition around claustrophobic:")
start = max(0, idx - 500)
end = min(len(text), idx + 2000)
print(text[start:end])
