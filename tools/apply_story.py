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
# 最後の塔：集めた灰色の羽根の持ち主がわかる
w = json.load(open(p))
L = w['stages']['F-boss']['lesson']
if not any('羽根' in (l[1] if isinstance(l, list) else l) for l in L):
    L[1:1] = ['エンジョウの大きな翼は、灰色の羽根があちこち抜け落ちていた。根もとが炎のように赤い。',
              ['ホアン', '各地の町で拾った灰色の羽根……。魔物たちをそそのかしていたのは、やはりエンジョウだったんですね。']]
    json.dump(w, open(p, 'w'), ensure_ascii=False, indent=1)
    print('F-boss: 羽根の場面を追加')
