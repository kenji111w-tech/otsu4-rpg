# 正解の選択肢だけが長い「かたより」を測る
import json, sys
from collections import Counter
d = json.load(open(sys.argv[1] if len(sys.argv) > 1 else 'data/questions.json'))['questions']
def L(q):
    a = len(q['choices'][q['answer']]); o = max(len(c) for i, c in enumerate(q['choices']) if i != q['answer']); return a, o
def bad(q): a, o = L(q); return a >= o * 1.3 and a - o >= 5
for pool, kind in [('mock', 'mcq5'), ('practice', 'mcq5'), ('practice', 'situation')]:
    qs = [q for q in d if q['pool'] == pool and q['kind'] == kind]
    lo = sum(1 for q in qs if L(q)[0] > L(q)[1])
    print(f'{pool} {kind}: {len(qs)}問　正解が一番長い {lo}（{lo*100//len(qs)}%）　目立って長い {sum(map(bad, qs))}')
c = Counter(q['town'] for q in d if q['pool'] == 'practice' and bad(q))
print('目立って長い（練習）町別：', sorted(c.items()))
