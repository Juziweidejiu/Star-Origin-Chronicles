import json
import re

with open(r"D:\reverseGame\zh_strings.json", "r", encoding="utf-8") as f:
    zh = json.load(f)

# Find all UI screens
screens = set()
for k in zh.keys():
    if k.startswith("ui."):
        screen_name = k.split('.')[1]
        screens.add(screen_name)

print("=== All UI Screens ===")
for s in sorted(screens):
    print(" ", s)

# Find Tactics / Combat related strings
print("\n=== Tactics Editor Sample Strings ===")
tactics_samples = [v for k, v in zh.items() if "Tactics" in k][:15]
for s in tactics_samples:
    print(" ", s)

# Find Founding / Patron samples
print("\n=== Founding / Patron Sample Strings ===")
founding_samples = [v for k, v in zh.items() if "Founding" in k or "patron" in k.lower()][:15]
for s in founding_samples:
    print(" ", s)

# Find Conviction / Vow / Flaw
print("\n=== Conviction / Vow / Flaw Sample Strings ===")
conviction_samples = [v for k, v in zh.items() if "conviction" in k.lower() or "flaw" in k.lower()][:15]
for s in conviction_samples:
    print(" ", s)
