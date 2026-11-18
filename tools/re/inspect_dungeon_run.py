with open('game_bundle.js', 'r', encoding='utf-8') as f:
    text = f.read()

# Inspect around 22959147 (broken, stress>=EQ) and 22966413 (camp?)
print("=== 1. Stress check & broken ===")
idx1 = 22959147
print(text[idx1-200:idx1+400])

print("\n=== 2. Camp activity / Stress delta ===")
idx2 = 22966413
print(text[idx2-300:idx2+500])
