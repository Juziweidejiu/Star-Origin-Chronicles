import re

with open('game_bundle.js', 'r', encoding='utf-8') as f:
    text = f.read()

start_pos = 22173827
end_pos = text.find('];', start_pos)
chunk = text[start_pos:end_pos+1]

# Extract all traits: id, label, tone, category, rarity, affects, rules, blurb
pattern = re.compile(r'\{id:"([^"]+)",label:[^,]+,"([^"]+)"\),tone:"([^"]+)",category:"([^"]+)",rarity:"([^"]+)",affects:(\[[^\]]*\]),rules:[^,]+,"([^"]+)"\),blurb:[^,]+,"([^"]+)"\)\}')
matches = pattern.findall(chunk)
print(f"Total traits matched: {len(matches)}")

for m in matches[:10]:
    print(f"ID: {m[0]} | Name: {m[1]} | Tone: {m[2]} | Cat: {m[3]} | Rarity: {m[4]} | Affects: {m[5]}")

print("...")
for m in matches[-5:]:
    print(f"ID: {m[0]} | Name: {m[1]} | Tone: {m[2]} | Cat: {m[3]} | Rarity: {m[4]} | Affects: {m[5]}")
