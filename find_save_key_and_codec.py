import re

with open('game_bundle.js', 'r', encoding='utf-8') as f:
    text = f.read()

# find Rce and bC
for name in ['Rce', 'bC', 'nF', 'iz']:
    m = re.findall(rf'(?:const|let|var|function)\s+{name}\b[=|(][^;)]+[;)]', text)
    print(f"{name}: {m[:3]}")

# search definition of bC
idx = text.find('function bC(')
if idx != -1:
    print("bC func:", text[idx:idx+300])
else:
    # search bC=
    m2 = [m.start() for m in re.finditer(r'\bbC\s*=', text)]
    for i in m2[:3]:
        print("bC assign:", text[i-50:i+200])

# search Rce
idx2 = text.find('Rce=')
if idx2 != -1:
    print("Rce assign:", text[idx2-50:idx2+100])
m3 = re.findall(r'const Rce\s*=\s*["\']([^"\']+)["\']', text)
print("Rce val:", m3)
