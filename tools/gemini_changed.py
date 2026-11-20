# 選択肢を書き直した練習問題を Gemini 確認用の Markdown にする（模試は別ファイル）
import json, sys, glob, os, importlib
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
ids = set()
for p in sorted(glob.glob(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'choice_fix_*.py'))):
    m = importlib.import_module(os.path.basename(p)[:-3])
    for k in ('FIX', 'ANS', 'ONE'): ids |= set(getattr(m, k, {}))
d = json.load(open('data/questions.json'))['questions']
qs = [q for q in d if q['id'] in ids and q['pool'] != 'mock']
out = [f'# Gemini確認依頼：書き直した選択肢（練習問題 {len(qs)}問）', '',
 '乙4の学習ゲームで、「正解だけが長くて、読まずに当てられる」問題が多かったため、まちがいの選択肢を正解と同じくらいの長さに書き直し、長すぎる正解は短く言い切りました。各問について、(1)まちがいの選択肢が本当にまちがいか（書き直しで正しい内容になっていないか）、(2)短くした正解が今も正しいか、(3)正解が1つに決まるか、を確認し、問題IDごとに「OK／要修正（理由と根拠）」で返してください。問題がないものはまとめて「その他OK」で構いません。', '']
town = None
for q in qs:
    if q['town'] != town:
        town = q['town']; out += ['', f'# {town}', '']
    out += [f"## {q['id']}", q['question'].replace('\n', ' ')]
    for i, c in enumerate(q['choices']):
        out.append(f"{i+1}. {c}" + ('  ←正解' if i == q['answer'] else '') + f"　（{q['choice_explanations'][i]}）")
    out.append('')
open(sys.argv[1], 'w').write('\n'.join(out)); print(len(qs))
