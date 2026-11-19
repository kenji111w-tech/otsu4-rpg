# 用語チェック：会話（授業）の中で、用語が説明される前に使われていないかを調べる
import json, sys
w = json.load(open('data/world.json'))
keys = list(w['stages'].keys())
# 用語 → その意味を説明するステージ（そこより前に出てきたら警告）
DEF = {
 '引火点': 'L1-2', '発火点': 'L1-2', '沸点': 'L1-2', '燃焼範囲': 'P1-3', 'vol%': 'P1-3', '比重': 'P3-2', '蒸気比重': 'P3-2',
 '窒息': 'P2-1', '冷却消火': 'P2-1', '強化液': 'P2-2', '接地': 'P2-4', '潮解': 'P3-1', '融点': 'P3-1', '還元': 'P4-3',
 '不導体': 'H1-2', '防爆': 'H1-3', '過酸化物': 'H2-2', '重合': 'H2-4', '不活性ガス': 'D1-4', 'ハロゲン化物': 'D1-4',
 '酸化性': 'L1-1', '禁水性': 'L1-1', '自己反応性': 'L1-1', '水溶性': 'L1-3', '指定数量': 'L1-3',
}
bad = 0
for term, dk in DEF.items():
    di = keys.index(dk)
    for k in keys[:di]:
        for who, t in (w['stages'][k].get('lesson') or []):
            if term in t:
                print(f'説明前に使用：「{term}」 {k}（説明は{dk}）: {t[:60]}'); bad += 1
    # 説明するステージに用語が本当に出てくるか
    if not any(term in t for _, t in (w['stages'][dk].get('lesson') or [])):
        print(f'説明ステージに用語がない：「{term}」 {dk}'); bad += 1
print('用語の先出し：', bad)
sys.exit(1 if bad else 0)
