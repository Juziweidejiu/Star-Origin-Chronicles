import re
import json
import sys

sys.stdout.reconfigure(encoding='utf-8')

with open(r"D:\reverseGame\game_bundle.js", "r", encoding="utf-8", errors="ignore") as f:
    js = f.read()

# Let's find where the Chinese dictionary begins and ends
start_marker = '"ui.DungeonScreen.d9e314f8":"激励他们"'
pos = js.find(start_marker)
print("Found marker at:", pos)

# Find the surrounding object {...}
# Let's search backward for the opening brace
brace_count = 0
start_idx = -1
for i in range(pos, max(0, pos - 100000), -1):
    if js[i] == '{' and (i == 0 or js[i-1] in [':', '=', '(', ',']):
        # test if this could be the start of dict
        try:
            # Let's check if there are many keys
            snippet = js[i:i+50]
            if '"' in snippet:
                start_idx = i
                break
        except:
            pass

print("Dict start candidate:", start_idx)

# Let's extract key-value pairs matching "([^"]+)":"([^"]+)"
pairs = re.findall(r'"([a-zA-Z0-9_\.]+)"\s*:\s*"([^"]+)"', js[start_idx:start_idx+1500000])
print(f"Extracted {len(pairs)} localized pairs")

categories = {}
for k, v in pairs:
    prefix = k.split('.')[0]
    if len(k.split('.')) > 1:
        sub = k.split('.')[1]
    else:
        sub = ""
    full_cat = f"{prefix}.{sub}" if sub else prefix
    categories.setdefault(full_cat, []).append((k, v))

print("\nCategories found:")
for cat, items in sorted(categories.items(), key=lambda x: len(x[1]), reverse=True)[:30]:
    print(f"  {cat:35s}: {len(items)} strings (e.g. {items[0][1]})")

# Save all zh strings to a json for reference
zh_dict = dict(pairs)
with open(r"D:\reverseGame\zh_strings.json", "w", encoding="utf-8") as f:
    json.dump(zh_dict, f, ensure_ascii=False, indent=2)
print("Saved zh_strings.json")
