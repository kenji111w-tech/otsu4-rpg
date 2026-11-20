# 後日談「火の国」の地図・ステージ・魔物を data/world.json に書きこむ（何度実行しても同じ結果になる）
# 使い方：python3 tools/fire_world.py
import json, copy, sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from fire_spec import TOWNS

P = 'data/world.json'
w = json.load(open(P))
# いったん火の国の分を消してから作り直す
for k in [k for k in w['maps'] if k.startswith('fire')]: del w['maps'][k]
for k in [k for k in w['stages'] if k[:1] == 'R' and k[1:2].isdigit()]: del w['stages'][k]
for k in [k for k, e in w['enemies'].items() if str(e.get('area', '')).startswith('R')]: del w['enemies'][k]

base = w['maps']['town12']
order = [t['code'] for t in TOWNS]
for i, T in enumerate(TOWNS):
    mid = 'fire' + T['code'][1:]
    m = {'name': T['name'], 'encounter': False, 'tiles': list(base['tiles']), 'events': [], 'npcs': []}
    ev = m['events']
    ev += [{'x': 3, 'y': 3, 'type': 'building', 'id': 'inn', 'label': '宿屋', 'price': 0},
           {'x': 8, 'y': 3, 'type': 'building', 'id': 'office', 'label': '役場'},
           {'x': 14, 'y': 3, 'type': 'building', 'id': 'shop', 'label': '道具屋'}]
    pos = [(3, 9), (13, 9), (5, 12), (12, 12), (14, 13)]
    for (x, y), sid in zip(pos, [f"{T['code']}-{n}" for n in (1, 2, 3, 4)] + [f"{T['code']}-boss"]):
        ev.append({'x': x, 'y': y, 'type': 'stage', 'id': sid})
    if i == 0:
        back, bx, by, blabel = 'village', 7, 11, '↓南 港（始まりの村へ帰る船）'
    else:
        back, bx, by, blabel = 'fire' + order[i - 1][1:], 16, 7, '↓南 ' + TOWNS[i - 1]['name']
    ev += [{'x': 8, 'y': 15, 'type': 'exit', 'to': back, 'tx': bx, 'ty': by},
           {'x': 9, 'y': 15, 'type': 'exit', 'to': back, 'tx': bx, 'ty': by},
           {'x': 10, 'y': 14, 'type': 'sign', 'label': blabel, 'text': f'看板：「{blabel}」'}]
    if i + 1 < len(TOWNS):
        N = TOWNS[i + 1]
        ev += [{'x': 17, 'y': 8, 'type': 'exit', 'to': 'fire' + N['code'][1:], 'tx': 9, 'ty': 13, 'need': f"{T['code']}-boss", 'needmsg': f"（{T['boss_name']}を倒すと、{N['name']}への道が開く）"},
               {'x': 16, 'y': 7, 'type': 'sign', 'label': '→東 ' + N['name'], 'text': f"看板：「→ 東の出口　{N['name']}へ（{T['boss_name']}を倒すと通れる）」"}]
    m['npcs'] = [{'x': 6, 'y': 6, 'look': 'villager', 'talk': T['talk'][0]}, {'x': 11, 'y': 6, 'look': 'villager2', 'talk': T['talk'][1]}]
    w['maps'][mid] = m
    for n, S in enumerate(T['stages'], 1):
        sid = f"{T['code']}-{n}"
        w['stages'][sid] = {'name': S['name'], 'need': None if n == 1 else f"{T['code']}-{n-1}", 'enemy': S['enemy'], 'lesson': S['lesson']}
    w['stages'][f"{T['code']}-boss"] = {'name': T['boss_stage'], 'need': f"{T['code']}-4", 'enemy': T['boss'], 'boss': True, 'lesson': T['boss_lesson'], 'clear': T['clear'], 'last': i + 1 == len(TOWNS)}
    # 魔物（強さは第3章の終わりより少し上から、町ごとに上げる）
    for n, S in enumerate(T['stages'], 1):
        k = S['enemy']; lv = i * 4 + n
        w['enemies'][k] = {'name': S['enemy_name'], 'hp': 430 + lv * 12, 'atk': 50 + lv // 2, 'def': 26 + lv // 3, 'exp': 400 + lv * 20, 'gold': 290 + lv * 12,
                           'regen': 42 + lv // 3, 'tele': 2, 'big': 70, 'pool': [f"{T['code']}-S{(n-1)*4+j:02d}" for j in range(1, 5)],
                           'weak': S['weak'], 'area': T['code'], 'calls': [f"C{T['cnum']}-{k}"], 'look': S['look']}
    k = T['boss']
    w['enemies'][k] = {'name': T['boss_name'], 'hp': 680 + i * 40, 'atk': 54 + i * 2, 'def': 28 + i, 'exp': 900 + i * 100, 'gold': 700 + i * 60, 'regen': 44 + i, 'tele': 2, 'big': 74,
                       'pool': [f"{T['code']}-S{j:02d}" for j in range(17, 22)] + [f"{T['code']}-S{j:02d}" for j in (1, 5, 9, 13)],
                       'weak': T['boss_weak'], 'area': T['code'], 'calls': [f"C{T['cnum']}-{S['enemy']}" for S in T['stages']], 'look': T['boss_look'], 'boss': True}
w['start_fire'] = {'map': 'fire' + order[0][1:], 'x': 9, 'y': 13}
json.dump(w, open(P, 'w'), ensure_ascii=False, indent=1)
print('火の国：', [T['name'] for T in TOWNS])
