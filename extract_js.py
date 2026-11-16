import re

with open(r"D:\reverseGame\extracted_index.html", "r", encoding="utf-8", errors="ignore") as f:
    content = f.read()

scripts = re.findall(r'<script[^>]*>(.*?)</script>', content, re.DOTALL)

with open(r"D:\reverseGame\game_bundle.js", "w", encoding="utf-8") as f:
    f.write(scripts[0])

print(f"Saved game_bundle.js, size: {len(scripts[0])} chars")
