import re

with open('game_bundle.js', 'r', encoding='utf-8') as f:
    text = f.read()

for trait in ['claustrophobic', 'pathfinder', 'glass-jawed', 'death-seeker']:
    print(f'=== Trait: {trait} ===')
    pos = 0
    while True:
        idx1 = text.find(f'"{trait}"', pos)
        idx2 = text.find(f"'{trait}'", pos)
        indices = [i for i in [idx1, idx2] if i != -1]
        if not indices:
            break
        idx = min(indices)
        snippet = text[max(0, idx-50):min(len(text), idx+150)].replace('\n', ' ')
        print(f'Found at {idx}: {snippet}')
        pos = idx + len(trait) + 5
        if pos >= len(text):
            break
