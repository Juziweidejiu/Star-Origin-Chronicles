import json
import re

with open(r"D:\reverseGame\zh_strings.json", "r", encoding="utf-8") as f:
    zh = json.load(f)

# Let's find tutorial, how to play, description
how_to_play = {k: v for k, v in zh.items() if "HowToPlay" in k or "Tutorial" in k or "Intro" in k}
print(f"Tutorial/Intro strings: {len(how_to_play)}")

with open(r"D:\reverseGame\tutorial_strings.txt", "w", encoding="utf-8") as f:
    for k, v in how_to_play.items():
        f.write(f"{k}: {v}\n")

# Let's search for "Dungeons & Dynasties" description in the code
with open(r"D:\reverseGame\game_bundle.js", "r", encoding="utf-8", errors="ignore") as f:
    js = f.read()

# Let's look for game rules, classes, races
classes = re.findall(r'"([A-Za-z]+)":\{"name":"([^"]+)","role":"([^"]+)"', js)
print("Classes sample:", classes[:10])

# Search for combat rules or loop
print("Saved tutorial strings to tutorial_strings.txt")
