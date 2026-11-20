# 物語と短い授業を world.json に書き込む： python3 tools/apply_story.py
import json, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from story_data import MYST, STAGE
p = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'data', 'world.json')
w = json.load(open(p))
w['mysteries'] = MYST
bad = []
for sid, d in STAGE.items():
    S = w['stages'][sid]
    S['core'] = d['core']
    if 'clue' in d: S['clue'] = {'name': d['clue'][0], 'text': d['clue'][1]}
    if len(d['core']) > 3: bad.append((sid, '4行以上'))
    for who, t in d['core']:
        if len(t.replace('《', '').replace('》', '')) > 70: bad.append((sid, len(t), t[:20]))
json.dump(w, open(p, 'w'), ensure_ascii=False, indent=1)
print('stages', len(STAGE), 'towns', len(MYST), 'warn', bad)
