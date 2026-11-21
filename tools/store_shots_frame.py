# 素の画面に見出しを付けて、ストア用の画像にする
# iPhone 6.9インチ：1290x2796 ／ Android：1080x1920 → /tmp/ss/store/
import os
from PIL import Image, ImageDraw, ImageFont, ImageFilter
SRC = '/tmp/ss'; OUT = '/tmp/ss/store'; os.makedirs(OUT, exist_ok=True)
BLACK = '/usr/share/fonts/opentype/noto/NotoSansCJK-Black.ttc'
BOLD = '/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc'
CAP = [
    ('遊びながら乙4に合格', '危険物の世界を冒険するRPG'),
    ('町の人が「合言葉」を伝授', 'ひっかけの見抜き方がわかる'),
    ('戦いはクイズ', '正解で攻撃！ 仲間に相談もできる'),
    ('大事な数字はひと目でわかる', '覚えるところを黄色で強調'),
    ('出題メーターで進み具合が見える', '80%に届いたらボスに挑戦'),
]
def font(path, size):
    return ImageFont.truetype(path, size, index=0)  # JP は ttc の先頭
def jp(path, size):
    # Noto CJK の ttc は JP が index 0 とは限らないので名前で探す
    for i in range(10):
        try:
            f = ImageFont.truetype(path, size, index=i)
            if 'JP' in f.getname()[0]: return f
        except Exception: break
    return ImageFont.truetype(path, size, index=0)
def bg(w, h):
    im = Image.new('RGB', (w, h)); d = ImageDraw.Draw(im)
    top, bot = (24, 20, 52), (110, 28, 24)
    for y in range(h):
        t = y / h; d.line([(0, y), (w, y)], fill=tuple(int(top[k] + (bot[k] - top[k]) * t) for k in range(3)))
    return im
def rounded(im, r):
    m = Image.new('L', im.size, 0); ImageDraw.Draw(m).rounded_rectangle([0, 0, im.size[0], im.size[1]], r, fill=255)
    out = im.convert('RGBA'); out.putalpha(m); return out
def center(d, y, text, f, fill, W):
    w = d.textlength(text, font=f); d.text(((W - w) / 2, y), text, font=f, fill=fill)
def make(i, W, H, tag):
    title, sub = CAP[i]
    im = bg(W, H); d = ImageDraw.Draw(im)
    s = W / 1290
    ft = jp(BLACK, int(96 * s)); fs = jp(BOLD, int(54 * s))
    while d.textlength(title, font=ft) > W * 0.92: ft = jp(BLACK, ft.size - 4)
    y0 = int(120 * s) if H / W > 2 else int(70 * s)
    center(d, y0, title, ft, (255, 214, 92), W)
    center(d, y0 + ft.size + int(28 * s), sub, fs, (240, 240, 250), W)
    shot = Image.open(f'{SRC}/raw_{i+1}.png').convert('RGB')
    top = y0 + ft.size + fs.size + int(90 * s)
    avail_h = H - top - int(60 * s); avail_w = int(W * 0.84)
    sc = min(avail_w / shot.width, avail_h / shot.height)
    shot = shot.resize((int(shot.width * sc), int(shot.height * sc)), Image.LANCZOS)
    x = (W - shot.width) // 2
    sh = Image.new('RGBA', (shot.width + 80, shot.height + 80), (0, 0, 0, 0))
    ImageDraw.Draw(sh).rounded_rectangle([40, 40, 40 + shot.width, 40 + shot.height], int(56 * s), fill=(0, 0, 0, 150))
    sh = sh.filter(ImageFilter.GaussianBlur(24))
    im.paste(sh, (x - 40, top - 28), sh)
    fr = rounded(Image.new('RGB', (shot.width + int(16 * s), shot.height + int(16 * s)), (255, 214, 92)), int(60 * s))
    im.paste(fr, (x - int(8 * s), top - int(8 * s)), fr)
    r = rounded(shot, int(52 * s)); im.paste(r, (x, top), r)
    im.save(f'{OUT}/{tag}_{i+1}.png')
for i in range(len(CAP)):
    make(i, 1290, 2796, 'iphone69')
    make(i, 1080, 1920, 'android')
# Google Play のフィーチャーグラフィック（1024x500）
W, H = 1024, 500
im = bg(W, H); d = ImageDraw.Draw(im)
t = Image.open(f'{SRC}/raw_1.png').convert('RGB'); t = t.crop((0, 0, t.width, int(t.height * 0.42)))
sc = H / t.height; t = t.resize((int(t.width * sc), H), Image.LANCZOS); im.paste(t, (W - t.width, 0))
center_x = (W - t.width) // 2
f1 = jp(BLACK, 64); f2 = jp(BOLD, 34)
def ctext(y, s, f, c):
    w = d.textlength(s, font=f); d.text((center_x - w / 2, y), s, font=f, fill=c)
ctext(150, '遊びながら', f2, (240, 240, 250)); ctext(200, '乙4に合格', f1, (255, 214, 92)); ctext(300, '危険物の世界を冒険するRPG', f2, (240, 240, 250))
im.save(f'{OUT}/feature_graphic_1024x500.png')
print(sorted(os.listdir(OUT)))
