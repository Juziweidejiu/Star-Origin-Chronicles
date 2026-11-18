with open(r"D:\reverseGame\extracted_index.html", "r", encoding="utf-8", errors="ignore") as f:
    content = f.read()

print(f"Total HTML file length: {len(content)} characters")

# Check for libraries and frameworks
libs = [
    "react", "react-dom", "zustand", "redux", "jotai", "mobx", "recoil",
    "tailwind", "lucide", "framer-motion", "radix-ui", "shadcn",
    "pixi", "phaser", "three", "canvas", "howler", "tone", "audiocontext",
    "dexie", "localforage", "indexeddb", "tanstack", "react-router"
]

for lib in libs:
    count = content.lower().count(lib)
    if count > 0:
        print(f"Library '{lib}': mentioned {count} times")

# Let's inspect scripts and styles
import re

scripts = re.findall(r'<script[^>]*>(.*?)</script>', content, re.DOTALL)
print(f"Found {len(scripts)} <script> tags")
for i, s in enumerate(scripts):
    print(f"Script {i}: length {len(s)} characters")

styles = re.findall(r'<style[^>]*>(.*?)</style>', content, re.DOTALL)
print(f"Found {len(styles)} <style> tags")
for i, st in enumerate(styles):
    print(f"Style {i}: length {len(st)} characters")
