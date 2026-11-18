# 出題範囲の網羅率：チェックリストの各項目に問題があるか数える
import json, collections
S=json.load(open('data/syllabus.json'))['items']; Q=json.load(open('data/questions.json'))['questions']
kids=collections.Counter(q['knowledge_id'] for q in Q)
by=collections.defaultdict(lambda:[0,0]); miss=[]
for it in S:
    n=sum(c for k,c in kids.items() if any(k.startswith(p) for p in it['kid_prefixes']))
    by[it['subject']][1]+=1
    if n: by[it['subject']][0]+=1
    else: miss.append(it['id']+' '+it['item'])
tot=sum(v[0] for v in by.values()); all_=sum(v[1] for v in by.values())
print(f'網羅率 {tot}/{all_}（{round(tot/all_*100)}%）')
for k,(a,b) in by.items(): print(f'  {k}: {a}/{b}')
print('未網羅：', len(miss))
