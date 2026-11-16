import re

with open('game_bundle.js', 'r', encoding='utf-8') as f:
    text = f.read()

# Let's see what MN, _ie, NN, DCe are!
for var_name in ['MN', '_ie', 'NN', 'DCe']:
    pattern = rf'const {var_name}\s*=\s*["\']([^"\']+)["\']|let {var_name}\s*=\s*["\']([^"\']+)["\']|var {var_name}\s*=\s*["\']([^"\']+)["\']|{var_name}\s*=\s*["\']([^"\']+)["\']'
    m = re.search(pattern, text)
    if m:
        val = [g for g in m.groups() if g is not None][0]
        print(f"{var_name} = '{val}'")
    else:
        # search anywhere var_name = "..."
        m2 = re.findall(rf'{var_name}=["\']([^"\']+)["\']', text)
        print(f"{var_name} (direct) = {m2}")
