import re

with open('game_bundle.js', 'r', encoding='utf-8') as f:
    text = f.read()

def safe_print(s):
    print(s.encode('ascii', 'backslashreplace').decode('ascii'))

# dp(e) computes derived stats!
# Let's find function dp(
idx = text.find('function dp(')
if idx != -1:
    safe_print("=== function dp ===")
    safe_print(text[idx:idx+2000])

# Let's find e2e
idx2 = text.find('function e2e(')
if idx2 != -1:
    safe_print("=== function e2e ===")
    safe_print(text[idx2:idx2+1000])
