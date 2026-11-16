with open('game_bundle.js', 'r', encoding='utf-8') as f:
    text = f.read()

# Inspect around 22719000 to 22724000
idx = 22722000
print(text[idx-500:idx+1500])
