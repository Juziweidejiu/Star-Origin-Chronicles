import json

with open('save_decompressed_sample.json', 'r', encoding='utf-8') as f:
    d = json.load(f)

roster = d.get('roster', []) or d.get('guild', {}).get('roster', [])
print(f"Roster size: {len(roster)}")
if roster:
    h0 = roster[0]
    print("Hero 0 keys:", list(h0.keys()))
    for k in ['id', 'name', 'classId', 'raceId', 'level', 'xp', 'age', 'birthYear', 'attributes', 'gambits', 'traits', 'scars', 'vows', 'equipment', 'stress', 'fatigue', 'morale', 'hp', 'maxHp', 'salary']:
        if k in h0:
            print(f"  {k}: {h0[k]}")
