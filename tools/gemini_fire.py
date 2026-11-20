# 火の国（第1・2・3・5・6類）の問題を Gemini 確認用の Markdown にする
import json, sys
d = json.load(open('data/questions.json'))['questions']
names = {'R1': '第1類（酸化性固体）', 'R2': '第2類（可燃性固体）', 'R3': '第3類（自然発火性物質及び禁水性物質）', 'R5': '第5類（自己反応性物質）', 'R6': '第6類（酸化性液体）'}
qs = [q for q in d if q['town'] in names]
out = [f'# Gemini確認依頼：火の国（乙種 第1・2・3・5・6類）の問題 {len(qs)}問', '',
 '乙4の学習ゲームの後日談として、ほかの類の乙種（科目免除で「性質・消火」10問）の内容を追加しました。各問について、(1)正解が事実として正しいか、(2)まちがいの選択肢が本当にまちがいか、(3)解説の誤り・数値（指定数量など）、(4)試験の出題範囲・形式に合っているか、を確認し、問題IDごとに「OK／要修正（理由と根拠）」で返してください。問題がないものはまとめて「その他OK」で構いません。', '']
for T, nm in names.items():
    out += ['', f'# {nm}', '']
    for q in [q for q in qs if q['town'] == T]:
        out += [f"## {q['id']}", q['question'].replace('\n', ' ')]
        for i, c in enumerate(q['choices']):
            out.append(f"{i+1}. {c}" + ('  ←正解' if i == q['answer'] else '') + f"　（{q['choice_explanations'][i]}）")
        out += [f"解説：{q['explanation']}", '']
open(sys.argv[1], 'w').write('\n'.join(out)); print(len(qs))
