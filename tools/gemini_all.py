# Gemini確認用：全部の問題と、授業・合言葉・キャラクターのセリフをまとめる → build/gemini_all/
import json, os, sys
out_dir = sys.argv[1]
Q = json.load(open('data/questions.json'))['questions']; W = json.load(open('data/world.json'))
AK = json.load(open('data/aikotoba.json')); CH = json.load(open('data/characters.json'))
def qblock(q):
    L = [f"## {q['id']}（{q.get('topic','')}）", q['question'].replace('\n', ' ')]
    for i, c in enumerate(q['choices']):
        L.append(f"{i+1}. {c}" + ('　←正解' if i == q['answer'] else '') + (f"　（{q['choice_explanations'][i]}）" if q.get('choice_explanations') else ''))
    L += [f"解説：{q['explanation']}", '']
    return L
def write(name, title, intro, qs, group):
    L = [f'# {title}（{len(qs)}問）', '', intro, '']
    cur = None
    for q in qs:
        g = group(q)
        if g != cur: cur = g; L += ['', f'# {g}', '']
        L += qblock(q)
    open(os.path.join(out_dir, name), 'w').write('\n'.join(L)); return len(qs)
TOWN = {k: m['name'] for m in W['maps'].values() for e in m.get('events', []) if e.get('type') == 'stage' for k in [e['id'].split('-')[0]]}
TOWN['V0'] = '始まりの村'
grp = lambda q: f"{TOWN.get(q['town'], q['town'])}（{q['town']}）"
INTRO = '各問について、(1)正解が今の法令・事実として正しいか、(2)まちがいの選択肢が本当にまちがいか（正しいものが混ざっていないか）、(3)解説の誤り・数値、(4)試験の出題範囲・形式に合っているか、を確認してください。'
practice = [q for q in Q if q['pool'] in ('practice', 'tutorial') and q['town'][0] != 'R']
n = {}
for sub, fn in [('法令', '01_法令.md'), ('物理・化学', '02_物理化学.md'), ('性質・消火', '03_性質消火.md')]:
    n[fn] = write(fn, f'乙4 RPG　{sub}の問題', INTRO, [q for q in practice if q['subject'] == sub], grp)
n['00b'] = write('07_試験制度_総合.md', '乙4 RPG　試験制度・総合の問題', INTRO, [q for q in Q if q['subject'] in ('試験制度', '総合')], grp)
n['04'] = write('04_模試専用問題.md', '乙4 RPG　本番模試の問題（6回分）', INTRO, [q for q in Q if q['pool'] == 'mock'], lambda q: f"本番模試 第{q.get('mock_set','?')}回")
n['05'] = write('05_火の国_他類.md', '乙4 RPG　火の国（乙種 第1・2・3・5・6類）の問題', INTRO + '（後日談。ほかの類の乙種で科目免除の人が受ける「性質・消火」の範囲です）', [q for q in Q if q['town'][0] == 'R'], grp)
# 授業・合言葉・キャラクター
L = ['# 乙4 RPG　授業（短い説明）・合言葉・キャラクターのセリフ', '', '問題以外で、ゲームが「正しいこと」として教えている文です。法令・数値・性質の誤りと、例外があるのに言い切っている所を探してください。', '']
L += ['', '# A. 短い授業（各ステージで最初に出る3行）', '']
for sid, S in W['stages'].items():
    if S.get('core'): L += [f"## {sid} {S['name']}"] + [f"- {c[1].replace('《','').replace('》','')}" for c in S['core']] + ['']
L += ['', '# B. 合言葉（町の人が教える「この言葉が出たら、この答え」）', '']
L += [f"- {t['id']}【{t['word']}】→ {t['ans']}" for t in AK['tips']]
L += ['', '# C. 仲間の覚え方', '']
for k, M in CH['members'].items(): L += [f"## {M['name']}（{M['role']}）", f"口ぐせ：{M['kuchiguse']}"] + [f"- {t}" for t in M['tips']] + ['']
L += ['', '# D. ボスのうその決めゼリフ（まちがいとして言わせている）と、仲間の言い直し（正しいこととして教えている）', '']
for sid, B in CH['boss'].items(): L += [f"- {sid}　うそ：{B['lie']}　→ 言い直し（{B['who']}）：{B['fix']}"]
open(os.path.join(out_dir, '06_授業_合言葉_キャラクター.md'), 'w').write('\n'.join(L))
print(n)
