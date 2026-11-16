with open('game_bundle.js', 'r', encoding='utf-8') as f:
    text = f.read()

# Let's inspect the camp rest handling around 22968000 - 22972000
idx = 22968550
print("=== Camp Rest Handling ===")
print(text[idx-400:idx+1500])
