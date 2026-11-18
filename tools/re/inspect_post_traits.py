with open('game_bundle.js', 'r', encoding='utf-8') as f:
    text = f.read()

end_pos = text.find('];', 22173827)
print(text[end_pos:end_pos+1500])
