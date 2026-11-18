import re

with open(r"D:\reverseGame\game_bundle.js", "r", encoding="utf-8", errors="ignore") as f:
    js = f.read()

# Let's search for Zustand stores
zustand_stores = re.findall(r'(\w+)\s*=\s*(?:create|createStore)\s*\(\s*(?:\([^)]*\)|function|\(e|\(set)', js)
print("Potential zustand store definitions count:", len(zustand_stores))

# Search for key domain terms
terms = [
    "dynasty", "dungeon", "hero", "character", "adventurer", "party",
    "combat", "battle", "inventory", "item", "equipment", "trait",
    "marriage", "child", "heir", "family", "lineage", "generation",
    "perk", "skill", "quest", "gold", "reputation", "prestige",
    "retirement", "death", "cemetery", "grave", "guild", "town",
    "building", "upgrade", "crafting", "relic", "artifact"
]

print("\n--- Domain term occurrences ---")
for t in terms:
    cnt = len(re.findall(r'\b' + t + r'\b', js, re.IGNORECASE))
    print(f"{t:15s}: {cnt}")

# Search for string literals that describe game rules, tutorial, or story
strings = re.findall(r'["\']([^"\']{20,100})["\']', js)
print(f"\nExtracted {len(strings)} descriptive string candidates")

# Filter interesting strings
gameplay_strings = [s for s in strings if any(w in s.lower() for w in ["dynasty", "dungeon", "heir", "generation", "lineage", "adventurer", "ancestor", "descendant", "family", "perk", "legacy"])]
print(f"Gameplay-related strings: {len(gameplay_strings)}")
for s in gameplay_strings[:30]:
    print("  *", s)
