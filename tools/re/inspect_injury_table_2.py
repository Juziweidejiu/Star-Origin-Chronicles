with open('game_bundle.js', 'r', encoding='utf-8') as f:
    text = f.read()

idx = 22651664
s = text[idx-600:idx+200]
print(s.encode('ascii', 'backslashreplace').decode('ascii'))
