# 模試専用問題を Gemini 確認用の Markdown にする
import json, sys
d = json.load(open('data/questions.json'))['questions']
out = ['# Gemini確認依頼：模試専用問題（210問・6回分）', '',
 '乙種第4類危険物取扱者試験の学習ゲームの「本番模試」用の問題です。1回35問（法令15・物理化学10・性質消火10）×6回。各問について、(1)正解が事実として正しいか、(2)他の選択肢に正解になりうるものがないか（正解が1つに決まるか）、(3)解説の誤り・数値、(4)本番の試験の出題形式・難易度に近いか、(5)正解の選択肢だけが目立って長い・詳しいなど、中身を読まずに当てられる手がかりがないか、を確認し、問題IDごとに「OK／要修正（理由と根拠）」で返してください。', '']
for s in range(1, 7):
    out += ['', f'# 第{s}回', '']
    for q in [q for q in d if q['pool'] == 'mock' and q['mock_set'] == s]:
        out += [f"## {q['id']}（{q['subject']}）", q['question']]
        for i, c in enumerate(q['choices']):
            out.append(f"{i+1}. {c}" + ('  ←正解' if i == q['answer'] else '') + f"　（{q['choice_explanations'][i]}）")
        out += [f"解説：{q['explanation']}", '']
open(sys.argv[1], 'w').write('\n'.join(out))
