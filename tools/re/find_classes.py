import re

with open('game_bundle.js', 'r', encoding='utf-8') as f:
    text = f.read()

def safe_print(s):
    print(s.encode('ascii', 'backslashreplace').decode('ascii'))

# Find the real classes map!
# Let's search for "blademaster:"
idx = text.find('blademaster:')
count = 0
while idx != -1 and count < 5:
    safe_print(f"--- blademaster match {count} ---")
    safe_print(text[max(0, idx-50):min(len(text), idx+200)])
    idx = text.find('blademaster:', idx+1)
    count += 1
