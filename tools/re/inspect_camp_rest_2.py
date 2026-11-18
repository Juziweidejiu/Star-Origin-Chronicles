with open('game_bundle.js', 'r', encoding='utf-8') as f:
    text = f.read()

idx = 22970000
print("=== Camp Rest Details (HP, Resource, Stress recovery) ===")
print(text[idx-200:idx+800])
