import re

with open('game_bundle.js', 'r', encoding='utf-8') as f:
    text = f.read()

# Look for save / load / export / import / slot / cloud / steam / file
matches = re.findall(r'[a-zA-Z0-9_$]+(?:\.[a-zA-Z0-9_$]+)?\s*=\s*JSON\.(?:stringify|parse)\([^)]+\)', text)
print(f"JSON matches: {len(matches)}")
for m in matches[:10]:
    print(m[:100])

# Look for Tauri fs or dialog or tauri invoke
invokes = re.findall(r'invoke\([\'"][^\'"]+[\'"]', text)
print(f"Invokes: {set(invokes)}")

# Look for rust commands
rust_matches = re.findall(r'["\'](?:plugin:[^"\']+|save[^"\']*|load[^"\']*)["\']', text)
print(f"Plugin/save matches: {set([m for m in rust_matches if len(m) < 40])[:20]}")
