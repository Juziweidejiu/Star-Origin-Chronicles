with open('game_bundle.js', 'r', encoding='utf-8') as f:
    text = f.read()

# Inspect around 22651664 (injury types list lf)
idx = 22651664
print("=== Injuries Table lf ===")
start = text.rfind('const lf=', idx)
if start == -1:
    start = text.rfind('lf=[', idx)
print(text[start-200:start+1200])
