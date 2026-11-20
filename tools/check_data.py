# データの整合性チェック：魔物の絵・正体の問題、ステージの置き場所、道具、予告の問題、仲間呼び
import json, re, sys
w = json.load(open('data/world.json')); d = json.load(open('data/questions.json'))['questions']
qid = {q['id']: q for q in d}
art = open('js/art.js').read() + open('js/sprites.js').read()
bad = []
for k, e in w['enemies'].items():
    if e.get('area') in ('tutorial',): continue
    if not re.search(r'\n\s+' + re.escape(k) + r'\(ctx', art): bad.append(f'絵がない魔物：{k}')
    if 'ID-' + k not in qid: bad.append(f'正体を見抜く問題がない：{k}')
    for p in e.get('pool', []):
        if p not in qid: bad.append(f'予告の問題がない：{k} {p}')
    for c in e.get('calls', []):
        if c not in qid: bad.append(f'仲間呼びの問題がない：{k} {c}')
placed = {ev['id'] for m in w['maps'].values() for ev in m.get('events', []) if ev['type'] == 'stage'}
for s, S in w['stages'].items():
    if s not in placed: bad.append(f'地図に置かれていないステージ：{s}')
    if S['enemy'] not in w['enemies']: bad.append(f'ステージの敵がいない：{s} {S["enemy"]}')
    if S.get('need') and S['need'] not in w['stages']: bad.append(f'前提ステージがない：{s}')
    if S.get('skill') and S['skill'] not in w['skills']: bad.append(f'技がない：{s} {S["skill"]}')
for m, M in w['maps'].items():
    for ev in M.get('events', []):
        if ev['type'] == 'exit' and ev['to'] not in w['maps']: bad.append(f'行き先の地図がない：{m}→{ev["to"]}')
        if ev['type'] == 'chest' and ev['item'] not in w['items']: bad.append(f'宝箱の道具がない：{m} {ev["item"]}')
        if ev['type'] == 'exit' and ev.get('need') and ev['need'] not in w['stages']: bad.append(f'出口の条件のステージがない：{m} {ev["need"]}')
    for k in M.get('wild', []) + M.get('wildPre', []):
        if k not in w['enemies']: bad.append(f'出現する魔物がいない：{m} {k}')
for b in bad: print(b)
print('データの不整合：', len(bad)); sys.exit(1 if bad else 0)
