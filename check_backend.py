import re

exe_path = r"D:\Program Files (x86)\Steam\steamapps\common\Dungeons & Dynasties\DungeonsAndDynasties.exe"

with open(exe_path, "rb") as f:
    data = f.read()

# Tauri invoke commands usually match "plugin:..." or custom command names
# Let's search for invoke handlers in rust
# In Tauri 2, command handlers are registered with __cmd__<name> or generate_handler!
cmd_patterns = re.findall(rb"__cmd__([a-zA-Z0-9_]+)", data)
print(f"__cmd__ patterns found: {set(cmd_patterns)}")

# Also search for tauri commands in extracted_index.html
with open(r"D:\reverseGame\extracted_index.html", "r", encoding="utf-8", errors="ignore") as f:
    html_text = f.read()

invoke_calls = set(re.findall(r'invoke\(["\']([^"\']+)["\']', html_text))
print("invoke calls in frontend:", invoke_calls)

# Search for tauri plugins
plugins = set(re.findall(rb"(tauri-plugin-[a-zA-Z0-9_\-]+)", data))
print("Tauri plugins found in exe:", {p.decode() for p in plugins})

# Search for steam functions or steamworks
steam_calls = set(re.findall(rb"(SteamAPI_[a-zA-Z0-9_]+)", data))
print("SteamAPI calls found:", len(steam_calls), {s.decode() for s in list(steam_calls)[:10]})
