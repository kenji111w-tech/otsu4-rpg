// 絵：なめらかな陰影つきの仮の絵（ドット絵ではない）＋ ChatGPT／Gemini製の画像への差し替え
import { LOOKS } from './sprites.js';

export const Assets = { chars: {}, enemies: {}, bg: {} };
export async function loadAssets(base = '') {
  let list = { chars: [], enemies: [], bg: [] };
  try { list = await fetch(base + 'data/assets.json').then(r => r.json()); } catch (e) {}
  const load = (kind, id) => new Promise(res => { const im = new Image(); im.onload = () => { Assets[kind][id] = im; res(); }; im.onerror = () => res(); im.src = `${base}assets/${kind}/${id}.png`; });
  await Promise.all(['chars', 'enemies', 'bg'].flatMap(k => (list[k] || []).map(id => load(k, id))));
}

const shade = (hex, k) => { // k<0で暗く、k>0で明るく
  const n = parseInt(hex.replace('#', '').padEnd(6, '0').slice(0, 6), 16); let r = n >> 16, g = (n >> 8) & 255, b = n & 255;
  const f = v => Math.max(0, Math.min(255, Math.round(k < 0 ? v * (1 + k) : v + (255 - v) * k)));
  return `rgb(${f(r)},${f(g)},${f(b)})`;
};
function rr(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
function lin(ctx, x0, y0, x1, y1, c) { const g = ctx.createLinearGradient(x0, y0, x1, y1); c.forEach((col, i) => g.addColorStop(i / (c.length - 1), col)); return g; }

// 人物（W×H、足元が下端）。3/4ビュー風のなめらかな絵
export function drawCharacter(ctx, W, H, lookKey, dir = 'down', useAsset = true, fr = 0) {
  const im = useAsset && Assets.chars[lookKey];
  if (im) { const s = Math.min(W / im.width, H / im.height); ctx.drawImage(im, (W - im.width * s) / 2, H - im.height * s, im.width * s, im.height * s); return; }
  const L = LOOKS[lookKey] || LOOKS.villager; const u = W / 100; const big = L.big ? 1.15 : 1, sm = L.small ? .85 : 1;
  ctx.save(); ctx.translate(W / 2, H); ctx.scale(sm, sm);
  const back = dir === 'up';
  // 脚（歩くときは左右の足を交互に上げる）
  [-1, 1].forEach(s => { const lift = fr === 0 ? 0 : ((fr === 1) === (s < 0) ? 7 * u : 0);
    ctx.save(); ctx.translate(0, -lift); ctx.fillStyle = lin(ctx, s * 12 * u, 0, s * 12 * u + 10 * u, 0, [shade(L.cloth2, -.2), shade(L.cloth2, -.45)]); rr(ctx, s * 13 * u - 7 * u, -40 * u, 14 * u, 36 * u, 6 * u); ctx.fill();
    ctx.fillStyle = lin(ctx, 0, -8 * u, 0, 0, ['#6a4428', '#3a2414']); rr(ctx, s * 13 * u - 9 * u, -10 * u, 18 * u, 10 * u, 4 * u); ctx.fill(); ctx.restore(); });
  if (fr) ctx.translate(0, -2 * u); // 歩くときは体が少し上下する
  // 胴
  const bw = 46 * u * big; ctx.fillStyle = lin(ctx, -bw / 2, 0, bw / 2, 0, [shade(L.cloth, .18), L.cloth, shade(L.cloth, -.35)]);
  rr(ctx, -bw / 2, -92 * u, bw, 56 * u, 14 * u); ctx.fill();
  ctx.fillStyle = lin(ctx, 0, -50 * u, 0, -42 * u, [L.accent, shade(L.accent, -.3)]); ctx.fillRect(-bw / 2, -50 * u, bw, 7 * u);
  if (!back) { ctx.fillStyle = shade(L.cloth, -.25); ctx.fillRect(-2 * u, -90 * u, 4 * u, 40 * u); }
  // 腕
  [-1, 1].forEach(s => { ctx.fillStyle = lin(ctx, s * bw / 2, 0, s * (bw / 2 + 12 * u), 0, [shade(L.cloth, .05), shade(L.cloth, -.35)]); rr(ctx, s > 0 ? bw / 2 - 4 * u : -bw / 2 - 10 * u, -88 * u, 14 * u, 40 * u, 7 * u); ctx.fill();
    ctx.fillStyle = lin(ctx, 0, -52 * u, 0, -40 * u, [L.skin, shade(L.skin, -.2)]); ctx.beginPath(); ctx.arc(s * (bw / 2 + 3 * u), -46 * u, 7 * u, 0, 7); ctx.fill(); });
  // 持ち物
  if (L.scroll && !back) { ctx.fillStyle = lin(ctx, 0, -70 * u, 0, -50 * u, ['#fbf1d0', '#d9c58c']); rr(ctx, bw / 2 - 2 * u, -72 * u, 26 * u, 18 * u, 5 * u); ctx.fill(); ctx.fillStyle = '#9a6a2a'; ctx.fillRect(bw / 2 - 2 * u, -72 * u, 26 * u, 3 * u); }
  if (L.flask && !back) { const g = ctx.createRadialGradient(-bw / 2 - 6 * u, -50 * u, 1, -bw / 2 - 6 * u, -50 * u, 12 * u); g.addColorStop(0, '#d8fff8'); g.addColorStop(1, '#3fb8a8'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(-bw / 2 - 6 * u, -48 * u, 10 * u, 0, 7); ctx.fill(); ctx.fillStyle = '#ddd'; ctx.fillRect(-bw / 2 - 9 * u, -64 * u, 6 * u, 8 * u); }
  if (L.big && !back) { ctx.fillStyle = lin(ctx, 0, -120 * u, 0, -90 * u, ['#b07a40', '#6a4420']); rr(ctx, bw / 2 - 18 * u, -124 * u, 30 * u, 34 * u, 6 * u); ctx.fill(); ctx.fillStyle = '#444'; ctx.fillRect(bw / 2 - 18 * u, -114 * u, 30 * u, 3 * u); ctx.fillRect(bw / 2 - 18 * u, -100 * u, 30 * u, 3 * u); }
  // 頭
  const hy = -122 * u, hr = 30 * u;
  const sk = ctx.createRadialGradient(-8 * u, hy - 8 * u, 4 * u, 0, hy, hr * 1.1); sk.addColorStop(0, shade(L.skin, .25)); sk.addColorStop(1, shade(L.skin, -.18));
  ctx.fillStyle = sk; ctx.beginPath(); ctx.ellipse(0, hy, hr * .95, hr, 0, 0, 7); ctx.fill();
  const hair = lin(ctx, 0, hy - hr, 0, hy + hr * .3, [shade(L.hair, .25), L.hair, shade(L.hair, -.35)]);
  if (!back) {
    // 目・口
    [-1, 1].forEach(s => { const ex = s * 11 * u, ey = hy + 4 * u;
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse(ex, ey, 6 * u, 7.5 * u, 0, 0, 7); ctx.fill();
      const ir = ctx.createLinearGradient(0, ey - 7 * u, 0, ey + 7 * u); ir.addColorStop(0, '#1b1b2a'); ir.addColorStop(1, '#4a5a8a'); ctx.fillStyle = ir; ctx.beginPath(); ctx.ellipse(ex + s * .8 * u, ey + 1 * u, 4.2 * u, 6 * u, 0, 0, 7); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(ex - 1.5 * u, ey - 2.5 * u, 1.7 * u, 0, 7); ctx.fill();
      ctx.fillStyle = 'rgba(255,120,120,.25)'; ctx.beginPath(); ctx.ellipse(s * 19 * u, hy + 14 * u, 5 * u, 3 * u, 0, 0, 7); ctx.fill(); });
    ctx.strokeStyle = shade(L.skin, -.5); ctx.lineWidth = 1.8 * u; ctx.beginPath(); ctx.arc(0, hy + 15 * u, 4 * u, .3, 2.8); ctx.stroke();
    if (L.glasses) { ctx.strokeStyle = '#334'; ctx.lineWidth = 2 * u; [-1, 1].forEach(s => { rr(ctx, s * 11 * u - 9 * u, hy - 3 * u, 18 * u, 14 * u, 4 * u); ctx.stroke(); }); ctx.beginPath(); ctx.moveTo(-2 * u, hy + 2 * u); ctx.lineTo(2 * u, hy + 2 * u); ctx.stroke(); }
    if (L.beard) { ctx.fillStyle = lin(ctx, 0, hy + 10 * u, 0, hy + 50 * u, ['#ffffff', '#cfcfd6']); ctx.beginPath(); ctx.moveTo(-22 * u, hy + 8 * u); ctx.quadraticCurveTo(-20 * u, hy + 46 * u, 0, hy + 54 * u); ctx.quadraticCurveTo(20 * u, hy + 46 * u, 22 * u, hy + 8 * u); ctx.quadraticCurveTo(0, hy + 22 * u, -22 * u, hy + 8 * u); ctx.fill(); }
  }
  // 髪
  ctx.fillStyle = hair;
  const st = L.style;
  if (st === 'spiky') { ctx.beginPath(); ctx.moveTo(-32 * u, hy + 4 * u); for (let i = 0; i <= 8; i++) { const a = Math.PI + i / 8 * Math.PI; const r1 = hr * 1.25, r0 = hr * .9; ctx.lineTo(Math.cos(a - .1) * r0, hy - 4 * u + Math.sin(a - .1) * r0); ctx.lineTo(Math.cos(a) * r1, hy - 6 * u + Math.sin(a) * r1); } ctx.lineTo(32 * u, hy + 4 * u); ctx.quadraticCurveTo(0, hy - 18 * u, -32 * u, hy + 4 * u); ctx.fill(); }
  else if (st === 'neat') { ctx.beginPath(); ctx.moveTo(-31 * u, hy + 8 * u); ctx.quadraticCurveTo(-34 * u, hy - 34 * u, 0, hy - 33 * u); ctx.quadraticCurveTo(34 * u, hy - 34 * u, 31 * u, hy + 8 * u); ctx.quadraticCurveTo(18 * u, hy - 16 * u, -6 * u, hy - 14 * u); ctx.quadraticCurveTo(-24 * u, hy - 10 * u, -31 * u, hy + 8 * u); ctx.fill(); }
  else if (st === 'bald') { ctx.beginPath(); ctx.ellipse(-28 * u, hy + 2 * u, 6 * u, 10 * u, 0, 0, 7); ctx.ellipse(28 * u, hy + 2 * u, 6 * u, 10 * u, 0, 0, 7); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.beginPath(); ctx.ellipse(-8 * u, hy - 20 * u, 10 * u, 5 * u, -.3, 0, 7); ctx.fill(); }
  else if (st === 'hood') { ctx.fillStyle = lin(ctx, 0, hy - 40 * u, 0, hy + 30 * u, [shade(L.cloth2, .2), L.cloth2]); ctx.beginPath(); ctx.moveTo(-36 * u, hy + 28 * u); ctx.quadraticCurveTo(-40 * u, hy - 44 * u, 0, hy - 42 * u); ctx.quadraticCurveTo(40 * u, hy - 44 * u, 36 * u, hy + 28 * u); ctx.lineTo(26 * u, hy + 28 * u); ctx.quadraticCurveTo(28 * u, hy - 22 * u, 0, hy - 22 * u); ctx.quadraticCurveTo(-28 * u, hy - 22 * u, -26 * u, hy + 28 * u); ctx.fill(); ctx.fillStyle = hair; ctx.beginPath(); ctx.ellipse(0, hy - 18 * u, 22 * u, 8 * u, 0, 0, 7); ctx.fill(); }
  else if (st === 'band') { ctx.beginPath(); ctx.ellipse(0, hy - 14 * u, 31 * u, 20 * u, 0, Math.PI, 0); ctx.fill(); ctx.fillStyle = lin(ctx, 0, hy - 16 * u, 0, hy - 8 * u, ['#e53935', '#a01818']); ctx.fillRect(-31 * u, hy - 16 * u, 62 * u, 8 * u); }
  else if (st === 'helmet') { ctx.fillStyle = lin(ctx, 0, hy - 44 * u, 0, hy - 4 * u, [shade(L.cloth, .3), shade(L.cloth, -.3)]); ctx.beginPath(); ctx.ellipse(0, hy - 10 * u, 36 * u, 30 * u, 0, Math.PI, 0); ctx.fill(); ctx.fillRect(-40 * u, hy - 12 * u, 80 * u, 6 * u); ctx.fillStyle = L.accent; ctx.fillRect(-4 * u, hy - 40 * u, 8 * u, 28 * u); }
  if (back && st !== 'bald' && st !== 'hood') { ctx.fillStyle = hair; ctx.beginPath(); ctx.ellipse(0, hy, hr * .97, hr, 0, 0, 7); ctx.fill(); }
  ctx.restore();
}

// ---- 魔物（なめらかな描き方）。画像があれば画像を使う ----
const glow = (ctx, x, y, r, c0, c1) => { const g = ctx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, c0); g.addColorStop(1, c1); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill(); };
function eyes(ctx, cx, cy, gap, r, look = 0) {
  [-1, 1].forEach(s => { const x = cx + s * gap; ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse(x, cy, r, r * 1.2, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#16162a'; ctx.beginPath(); ctx.ellipse(x + look * r * .3, cy + r * .2, r * .55, r * .75, 0, 0, 7); ctx.fill(); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x - r * .25, cy - r * .2, r * .22, 0, 7); ctx.fill(); });
}
function goo(ctx, cx, cy, R, base) {
  const g = ctx.createRadialGradient(cx - R * .35, cy - R * .4, R * .1, cx, cy, R * 1.15); g.addColorStop(0, shade(base, .55)); g.addColorStop(.55, base); g.addColorStop(1, shade(base, -.45));
  ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(cx - R, cy + R * .6); ctx.bezierCurveTo(cx - R * 1.15, cy - R * .2, cx - R * .5, cy - R * 1.15, cx, cy - R * 1.05); ctx.bezierCurveTo(cx + R * .5, cy - R * 1.15, cx + R * 1.15, cy - R * .2, cx + R, cy + R * .6); ctx.quadraticCurveTo(cx, cy + R * .85, cx - R, cy + R * .6); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.beginPath(); ctx.ellipse(cx - R * .42, cy - R * .5, R * .14, R * .26, -.5, 0, 7); ctx.fill();
}
export const ENEMY_HQ = {
  kemurin(ctx, cx, cy, R, t) {
    for (let i = 0; i < 9; i++) { const a = i / 9 * 6.28 + t / 30, rr2 = R * (.42 + .06 * Math.sin(t / 9 + i)); glow(ctx, cx + Math.cos(a) * R * .48, cy + Math.sin(a) * R * .32, rr2, 'rgba(210,210,220,.95)', 'rgba(120,120,135,0)'); }
    glow(ctx, cx, cy, R * .62, 'rgba(225,225,232,1)', 'rgba(150,150,165,.2)');
    eyes(ctx, cx, cy - R * .05, R * .2, R * .1); ctx.strokeStyle = '#334'; ctx.lineWidth = R * .04; ctx.beginPath(); ctx.arc(cx, cy + R * .13, R * .1, .3, 2.8); ctx.stroke();
  },
  // ヒバナ：線香花火・グラインダーの火花。丸い顔や放射状の輪は描かない
  hibana(ctx, cx, cy, R, t) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const n = 26;
    for (let i = 0; i < n; i++) {
      const seed = (i * 97.13) % 1, life = ((t * 0.035 + i / n) % 1);
      const ang = -0.35 + (seed - .5) * 1.4 + Math.sin(i * 3.1) * .25; // 右上〜右下へ流れる
      const dist = R * (.25 + life * 1.25), len = R * (.18 + .3 * (1 - life));
      const x1 = cx + Math.cos(ang) * dist, y1 = cy + Math.sin(ang) * dist + life * life * R * .35;
      const x0 = x1 - Math.cos(ang) * len, y0 = y1 - Math.sin(ang) * len;
      const g = ctx.createLinearGradient(x0, y0, x1, y1); g.addColorStop(0, 'rgba(255,140,30,0)'); g.addColorStop(1, `rgba(255,240,180,${1 - life})`);
      ctx.strokeStyle = g; ctx.lineWidth = R * (STYLE.dot ? .07 : .035) * (1 - life * .6); ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
      if (life > .6 && i % 3 === 0) { ctx.strokeStyle = `rgba(255,220,120,${(1 - life) * 1.5})`; ctx.lineWidth = R * .015; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x1 + R * .08, y1 - R * .06); ctx.moveTo(x1, y1); ctx.lineTo(x1 + R * .07, y1 + R * .07); ctx.stroke(); }
    }
    if (!STYLE.dot) glow(ctx, cx, cy, R * .55, 'rgba(255,170,60,.55)', 'rgba(255,90,0,0)');
    glow(ctx, cx, cy, R * (STYLE.dot ? .1 : .2), 'rgba(255,255,240,1)', 'rgba(255,220,120,.2)');
    ctx.restore();
    // 小さな芯にいたずらっぽい目
    ctx.fillStyle = '#3a1500'; [-1, 1].forEach(s => { ctx.beginPath(); ctx.ellipse(cx + s * R * .07, cy - R * .02, R * .025, R * .04, 0, 0, 7); ctx.fill(); });
  },
  nazono(ctx, cx, cy, R, t) {
    const hue = (t * 2) % 360; ctx.save(); ctx.globalAlpha = .9; goo(ctx, cx, cy + R * .1, R, hslToHex(hue, .6, .55)); ctx.restore();
    ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.font = `bold ${R * .6}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('?', cx, cy + R * .2);
    eyes(ctx, cx, cy - R * .25, R * .32, R * .11);
  },
  niselabel(ctx, cx, cy, R, t) {
    goo(ctx, cx, cy + R * .1, R, '#3fb45a');
    ctx.save(); ctx.translate(cx + R * .12, cy + R * .25); ctx.rotate(-.15 + Math.sin(t / 20) * .05);
    ctx.fillStyle = lin(ctx, 0, -R * .2, 0, R * .2, ['#fffbea', '#e8dcb0']); ctx.fillRect(-R * .45, -R * .2, R * .9, R * .4); ctx.strokeStyle = '#a33'; ctx.lineWidth = R * .03; ctx.strokeRect(-R * .42, -R * .17, R * .84, R * .34);
    ctx.fillStyle = '#a33'; ctx.font = `bold ${R * .2}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('灯油?', 0, 0); ctx.restore();
    eyes(ctx, cx, cy - R * .32, R * .3, R * .12, Math.sin(t / 15));
  },
  hakarin(ctx, cx, cy, R, t) {
    const brass = (x0, y0, x1, y1) => lin(ctx, x0, y0, x1, y1, ['#fff0b0', '#d9a83a', '#8a6418']);
    const tilt = Math.sin(t / 18) * .22;
    ctx.fillStyle = brass(cx - R * .1, 0, cx + R * .1, 0); ctx.fillRect(cx - R * .07, cy - R * .6, R * .14, R * 1.3);
    ctx.fillStyle = brass(0, cy + R * .6, 0, cy + R * .85); ctx.beginPath(); ctx.ellipse(cx, cy + R * .75, R * .5, R * .12, 0, 0, 7); ctx.fill();
    ctx.save(); ctx.translate(cx, cy - R * .6); ctx.rotate(tilt); ctx.fillStyle = brass(0, -R * .05, 0, R * .05); ctx.fillRect(-R * .9, -R * .04, R * 1.8, R * .08);
    [-1, 1].forEach(sd => { ctx.strokeStyle = '#8a6418'; ctx.lineWidth = R * .02; ctx.beginPath(); ctx.moveTo(sd * R * .8, 0); ctx.lineTo(sd * R * .8 - R * .2, R * .45); ctx.moveTo(sd * R * .8, 0); ctx.lineTo(sd * R * .8 + R * .2, R * .45); ctx.stroke();
      ctx.fillStyle = brass(0, R * .4, 0, R * .55); ctx.beginPath(); ctx.ellipse(sd * R * .8, R * .48, R * .3, R * .09, 0, 0, 7); ctx.fill(); });
    ctx.restore(); glow(ctx, cx, cy - R * .1, R * .34, '#ffe9a0', '#b8862a'); eyes(ctx, cx, cy - R * .14, R * .13, R * .08);
  },
  mimic(ctx, cx, cy, R, t) {
    const open = (Math.sin(t / 10) + 1) * .1 + .1, wood = (y0, y1) => lin(ctx, 0, y0, 0, y1, ['#b07a40', '#6a4420']);
    ctx.fillStyle = wood(cy - R * .1, cy + R * .8); rr(ctx, cx - R, cy - R * .1, R * 2, R * .9, R * .08); ctx.fill();
    ctx.fillStyle = '#3a0a10'; ctx.fillRect(cx - R * .9, cy - R * .1 - R * open * 2, R * 1.8, R * open * 2);
    ctx.fillStyle = '#f4f0e0'; for (let i = 0; i < 8; i++) { ctx.beginPath(); ctx.moveTo(cx - R * .88 + i * R * .22, cy - R * .1); ctx.lineTo(cx - R * .77 + i * R * .22, cy - R * .26); ctx.lineTo(cx - R * .66 + i * R * .22, cy - R * .1); ctx.fill(); }
    ctx.save(); ctx.translate(cx, cy - R * .1 - R * open * 2); ctx.fillStyle = wood(-R * .5, 0); rr(ctx, -R, -R * .5, R * 2, R * .5, R * .1); ctx.fill(); ctx.fillStyle = '#e8b830'; ctx.fillRect(-R, -R * .3, R * 2, R * .07); ctx.restore();
    ctx.fillStyle = '#e8b830'; ctx.fillRect(cx - R, cy + R * .3, R * 2, R * .07); rr(ctx, cx - R * .1, cy + R * .08, R * .2, R * .28, R * .04); ctx.fill();
    eyes(ctx, cx, cy - R * .1 - R * open * 2 - R * .28, R * .4, R * .1);
  },
  ogre(ctx, cx, cy, R, t) {
    const b = Math.sin(t / 12) * R * .03, skin = (x0, x1) => lin(ctx, x0, 0, x1, 0, ['#9ab05a', '#6b7a3a', '#3e4a1e']);
    ctx.fillStyle = skin(cx - R * .7, cx + R * .7); ctx.beginPath(); ctx.ellipse(cx, cy + R * .25 + b, R * .72, R * .66, 0, 0, 7); ctx.fill();
    ctx.fillStyle = lin(ctx, 0, cy + R * .4, 0, cy + R * .7, ['#7a5530', '#4a3018']); ctx.fillRect(cx - R * .6, cy + R * .45 + b, R * 1.2, R * .2);
    glow(ctx, cx, cy - R * .5 + b, R * .4, '#a8c06a', '#56662a');
    ctx.fillStyle = lin(ctx, 0, cy - R * 1.05, 0, cy - R * .8, ['#fff', '#cfc8b0']); [-1, 1].forEach(s => { ctx.beginPath(); ctx.moveTo(cx + s * R * .25, cy - R * .8 + b); ctx.lineTo(cx + s * R * .18, cy - R * 1.08 + b); ctx.lineTo(cx + s * R * .08, cy - R * .82 + b); ctx.fill(); });
    eyes(ctx, cx, cy - R * .55 + b, R * .14, R * .08); ctx.fillStyle = '#2a1a0a'; rr(ctx, cx - R * .16, cy - R * .36 + b, R * .32, R * .06, R * .03); ctx.fill();
    ctx.fillStyle = lin(ctx, cx + R * .45, 0, cx + R * .95, 0, ['#c08a50', '#7a5028']); rr(ctx, cx + R * .45, cy - R * .2 + b, R * .5, R * .72, R * .08); ctx.fill();
    ctx.fillStyle = '#444'; ctx.fillRect(cx + R * .45, cy - R * .05 + b, R * .5, R * .05); ctx.fillRect(cx + R * .45, cy + R * .32 + b, R * .5, R * .05);
    ctx.fillStyle = '#fffbea'; ctx.fillRect(cx + R * .53, cy + R * .04 + b, R * .34, R * .2); ctx.fillStyle = '#a33'; ctx.font = `bold ${R * .14}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('仮', cx + R * .7, cy + R * .14 + b);
  },
  // カクレタンク：姿を変えるタンク（地下・移動・屋外…）
  kakuretank(ctx, cx, cy, R, t) {
    const ph = Math.floor(t / 90) % 3, steel = (x0, x1) => lin(ctx, x0, 0, x1, 0, ['#d8dde6', '#9aa4b4', '#5a6474']);
    if (ph === 1) { // 移動タンク（車）
      ctx.fillStyle = steel(cx - R, cx + R); ctx.beginPath(); ctx.ellipse(cx + R * .1, cy, R * .75, R * .38, 0, 0, 7); ctx.fill();
      ctx.fillStyle = '#c0392b'; rr(ctx, cx - R * 1.0, cy - R * .25, R * .4, R * .55, R * .06); ctx.fill(); ctx.fillStyle = '#9ad'; ctx.fillRect(cx - R * .95, cy - R * .18, R * .22, R * .18);
      ctx.fillStyle = '#222'; [-.75, -.1, .55].forEach(k => { ctx.beginPath(); ctx.arc(cx + k * R, cy + R * .38, R * .14, 0, 7); ctx.fill(); });
    } else { // 屋外タンク（円筒）
      const h = ph === 2 ? .45 : .8;
      ctx.fillStyle = steel(cx - R * .7, cx + R * .7); ctx.fillRect(cx - R * .7, cy - R * h, R * 1.4, R * (h + .45));
      ctx.fillStyle = '#c8ced8'; ctx.beginPath(); ctx.ellipse(cx, cy - R * h, R * .7, R * .16, 0, 0, 7); ctx.fill();
      ctx.fillStyle = '#8a929e'; ctx.beginPath(); ctx.ellipse(cx, cy + R * .45, R * .7, R * .16, 0, 0, Math.PI); ctx.fill();
      if (ph === 2) { ctx.fillStyle = lin(ctx, 0, cy + R * .3, 0, cy + R * .8, ['#7a5a3a', '#4a3420']); ctx.fillRect(cx - R, cy + R * .35, R * 2, R * .45); }
    }
    eyes(ctx, cx + (ph === 1 ? R * .1 : 0), cy - R * .12, R * .2, R * .1, Math.sin(t / 20));
  },
  // ムキョカ・ゴーレム：許可なく積み上げたれんがの体
  mukyoka(ctx, cx, cy, R, t) {
    const b = Math.sin(t / 14) * R * .03;
    const brick = (x, y, w, h) => { ctx.fillStyle = lin(ctx, x, y, x + w, y + h, ['#c8724a', '#8a4428']); rr(ctx, x, y, w, h, R * .03); ctx.fill(); ctx.strokeStyle = 'rgba(60,30,20,.6)'; ctx.lineWidth = R * .015; ctx.stroke(); };
    brick(cx - R * .55, cy - R * .2 + b, R * 1.1, R * .75); brick(cx - R * .35, cy - R * .78 + b, R * .7, R * .55);
    brick(cx - R * .95, cy - R * .15 + b, R * .35, R * .55); brick(cx + R * .6, cy - R * .15 + b, R * .35, R * .55);
    brick(cx - R * .5, cy + R * .55, R * .35, R * .35); brick(cx + R * .15, cy + R * .55, R * .35, R * .35);
    eyes(ctx, cx, cy - R * .52 + b, R * .15, R * .08);
    ctx.save(); ctx.translate(cx, cy + R * .15 + b); ctx.rotate(-.08); ctx.fillStyle = '#fffbea'; ctx.fillRect(-R * .38, -R * .14, R * .76, R * .28); ctx.strokeStyle = '#c33'; ctx.lineWidth = R * .03; ctx.strokeRect(-R * .36, -R * .12, R * .72, R * .24);
    ctx.fillStyle = '#c33'; ctx.font = `bold ${R * .16}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('無許可', 0, 0); ctx.restore();
  },
  // ミケンサ・ゴースト：検査前のタンクにとりつく幽霊
  mikensa(ctx, cx, cy, R, t) {
    const b = Math.sin(t / 12) * R * .06;
    ctx.fillStyle = lin(ctx, 0, cy - R, 0, cy + R * .7, ['rgba(255,255,255,.95)', 'rgba(200,210,235,.75)']);
    ctx.beginPath(); ctx.moveTo(cx - R * .6, cy + R * .6 + b); ctx.bezierCurveTo(cx - R * .75, cy - R * .4 + b, cx - R * .4, cy - R * .95 + b, cx, cy - R * .95 + b); ctx.bezierCurveTo(cx + R * .4, cy - R * .95 + b, cx + R * .75, cy - R * .4 + b, cx + R * .6, cy + R * .6 + b);
    for (let i = 0; i < 4; i++) ctx.quadraticCurveTo(cx + R * (.45 - i * .3), cy + R * (.85 + (i % 2) * .1) + b, cx + R * (.3 - i * .3), cy + R * .6 + b); ctx.fill();
    ctx.fillStyle = '#223'; [-1, 1].forEach(s2 => { ctx.beginPath(); ctx.ellipse(cx + s2 * R * .2, cy - R * .35 + b, R * .07, R * .12, 0, 0, 7); ctx.fill(); });
    ctx.beginPath(); ctx.ellipse(cx, cy - R * .12 + b, R * .1, R * .07, 0, 0, 7); ctx.fill();
    ctx.save(); ctx.translate(cx + R * .45, cy + R * .1 + b); ctx.rotate(.2); ctx.fillStyle = '#ffe9a0'; ctx.fillRect(-R * .2, -R * .26, R * .4, R * .52); ctx.fillStyle = '#a33'; ctx.font = `bold ${R * .12}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('未検査', 0, 0); ctx.restore();
  },
  // トドケワスレ・バット：届出の封筒を落としていくこうもり
  todokewasure(ctx, cx, cy, R, t) {
    const f = Math.sin(t / 5) * .35;
    [-1, 1].forEach(s2 => { ctx.save(); ctx.translate(cx + s2 * R * .25, cy - R * .1); ctx.rotate(s2 * f); ctx.fillStyle = lin(ctx, 0, -R * .4, 0, R * .3, ['#6a4a8a', '#2a1a40']);
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(s2 * R * .5, -R * .55, s2 * R * .95, -R * .2); ctx.quadraticCurveTo(s2 * R * .75, -R * .05, s2 * R * .8, R * .15); ctx.quadraticCurveTo(s2 * R * .55, R * .02, s2 * R * .5, R * .22); ctx.quadraticCurveTo(s2 * R * .3, R * .05, 0, R * .2); ctx.fill(); ctx.restore(); });
    glow(ctx, cx, cy - R * .05, R * .3, '#8a6aaa', '#3a2a5a'); [-1, 1].forEach(s2 => { ctx.fillStyle = '#4a3a6a'; ctx.beginPath(); ctx.moveTo(cx + s2 * R * .18, cy - R * .25); ctx.lineTo(cx + s2 * R * .28, cy - R * .5); ctx.lineTo(cx + s2 * R * .06, cy - R * .3); ctx.fill(); });
    eyes(ctx, cx, cy - R * .1, R * .1, R * .07);
    const fall = (t * 2) % (R * 1.2); ctx.save(); ctx.translate(cx + R * .1, cy + R * .3 + fall * .5); ctx.rotate(.3); ctx.fillStyle = '#fffbea'; ctx.fillRect(-R * .16, -R * .1, R * .32, R * .2); ctx.strokeStyle = '#a33'; ctx.lineWidth = R * .015; ctx.beginPath(); ctx.moveTo(-R * .16, -R * .1); ctx.lineTo(0, R * .02); ctx.lineTo(R * .16, -R * .1); ctx.stroke(); ctx.restore();
  },
  // カッテカイゾウ・トロール：勝手に改造する大男（スパナと継ぎはぎの配管）
  troll(ctx, cx, cy, R, t) {
    const b = Math.sin(t / 12) * R * .03, skin = lin(ctx, cx - R * .7, 0, cx + R * .7, 0, ['#8aa0b4', '#5a7084', '#34465a']);
    ctx.fillStyle = skin; ctx.beginPath(); ctx.ellipse(cx, cy + R * .2 + b, R * .72, R * .7, 0, 0, 7); ctx.fill();
    ctx.fillStyle = lin(ctx, 0, cy + R * .3, 0, cy + R * .7, ['#a07a40', '#6a4a20']); ctx.fillRect(cx - R * .6, cy + R * .35 + b, R * 1.2, R * .25);
    glow(ctx, cx, cy - R * .55 + b, R * .36, '#9ab0c4', '#4a6074');
    eyes(ctx, cx, cy - R * .58 + b, R * .13, R * .08); ctx.fillStyle = '#eee'; [-1, 1].forEach(s2 => { ctx.beginPath(); ctx.moveTo(cx + s2 * R * .12, cy - R * .38 + b); ctx.lineTo(cx + s2 * R * .08, cy - R * .28 + b); ctx.lineTo(cx + s2 * R * .03, cy - R * .38 + b); ctx.fill(); });
    ctx.save(); ctx.translate(cx + R * .75, cy - R * .1 + b); ctx.rotate(-.6 + Math.sin(t / 10) * .2); ctx.fillStyle = lin(ctx, -R * .05, 0, R * .05, 0, ['#e0e4ea', '#8a929e']); ctx.fillRect(-R * .05, -R * .55, R * .1, R * .6);
    ctx.beginPath(); ctx.arc(0, -R * .6, R * .14, 0, 7); ctx.fill(); ctx.fillStyle = '#34465a'; ctx.fillRect(-R * .05, -R * .78, R * .1, R * .16); ctx.restore();
    ctx.strokeStyle = '#b07a3a'; ctx.lineWidth = R * .07; ctx.beginPath(); ctx.moveTo(cx - R * .6, cy); ctx.lineTo(cx - R * .25, cy); ctx.lineTo(cx - R * .25, cy + R * .3); ctx.stroke();
    ctx.fillStyle = '#c0392b'; ctx.beginPath(); ctx.arc(cx - R * .25, cy, R * .06, 0, 7); ctx.fill();
  },
  // ムシカク・ゴブリン：資格なしで油の樽を運ぶ小鬼
  mushikaku(ctx, cx, cy, R, t) {
    const b = Math.abs(Math.sin(t / 8)) * R * .05;
    ctx.fillStyle = lin(ctx, cx - R * .5, 0, cx + R * .5, 0, ['#b8c86a', '#7a8a3a']); ctx.beginPath(); ctx.ellipse(cx, cy + R * .3 - b, R * .45, R * .5, 0, 0, 7); ctx.fill();
    glow(ctx, cx, cy - R * .35 - b, R * .38, '#c8d87a', '#6a7a2a');
    [-1, 1].forEach(s2 => { ctx.fillStyle = '#9aaa4a'; ctx.beginPath(); ctx.moveTo(cx + s2 * R * .3, cy - R * .45 - b); ctx.lineTo(cx + s2 * R * .75, cy - R * .6 - b); ctx.lineTo(cx + s2 * R * .35, cy - R * .25 - b); ctx.fill(); });
    eyes(ctx, cx, cy - R * .38 - b, R * .14, R * .09, .5); ctx.strokeStyle = '#3a2a10'; ctx.lineWidth = R * .03; ctx.beginPath(); ctx.arc(cx, cy - R * .18 - b, R * .12, .2, 2.9); ctx.stroke();
    ctx.fillStyle = lin(ctx, cx + R * .35, 0, cx + R * .85, 0, ['#c08a50', '#7a5028']); rr(ctx, cx + R * .35, cy - R * .05 - b, R * .48, R * .62, R * .08); ctx.fill(); ctx.fillStyle = '#444'; ctx.fillRect(cx + R * .35, cy + R * .1 - b, R * .48, R * .05);
    ctx.save(); ctx.translate(cx - R * .55, cy + R * .1 - b); ctx.rotate(-.2); ctx.fillStyle = '#fffbea'; ctx.fillRect(-R * .2, -R * .12, R * .4, R * .24); ctx.fillStyle = '#c33'; ctx.font = `bold ${R * .12}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('無資格', 0, 0); ctx.restore();
  },
  // フルメンジョ・ミイラ：色あせた免状を持つミイラ
  furumenjo(ctx, cx, cy, R, t) {
    const sw = Math.sin(t / 15) * R * .04;
    ctx.fillStyle = lin(ctx, cx - R * .45, 0, cx + R * .45, 0, ['#efe6cc', '#c8b890', '#9a8a66']); rr(ctx, cx - R * .42 + sw, cy - R * .85, R * .84, R * 1.7, R * .3); ctx.fill();
    ctx.strokeStyle = 'rgba(120,100,70,.6)'; ctx.lineWidth = R * .03; for (let i = 0; i < 9; i++) { ctx.beginPath(); ctx.moveTo(cx - R * .42 + sw, cy - R * .7 + i * R * .18); ctx.lineTo(cx + R * .42 + sw, cy - R * .62 + i * R * .18); ctx.stroke(); }
    ctx.fillStyle = '#1a1208'; [-1, 1].forEach(s2 => { ctx.beginPath(); ctx.ellipse(cx + s2 * R * .14 + sw, cy - R * .5, R * .07, R * .05, 0, 0, 7); ctx.fill(); }); ctx.fillStyle = '#ffcc33'; [-1, 1].forEach(s2 => { ctx.beginPath(); ctx.arc(cx + s2 * R * .14 + sw, cy - R * .5, R * .025, 0, 7); ctx.fill(); });
    ctx.save(); ctx.translate(cx + R * .5, cy); ctx.rotate(.15); ctx.fillStyle = '#e8dcb8'; ctx.fillRect(-R * .25, -R * .17, R * .5, R * .34); ctx.fillStyle = '#b0a080'; ctx.fillRect(-R * .2, -R * .1, R * .14, R * .18); ctx.fillStyle = '#8a7a5a'; ctx.fillRect(-R * .02, -R * .08, R * .2, R * .03); ctx.fillRect(-R * .02, 0, R * .2, R * .03); ctx.restore();
  },
  // サボリン：講習をさぼって寝てばかりの丸い魔物
  saborin(ctx, cx, cy, R, t) {
    const br = Math.sin(t / 20) * R * .03;
    ctx.fillStyle = lin(ctx, 0, cy - R * .6, 0, cy + R * .6, ['#ffc8a0', '#e08a60']); ctx.beginPath(); ctx.ellipse(cx, cy + R * .1, R * .7 + br, R * .55 + br, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#4a6ad8'; ctx.beginPath(); ctx.moveTo(cx - R * .5, cy - R * .25); ctx.quadraticCurveTo(cx, cy - R * 1.0, cx + R * .45, cy - R * .3); ctx.fill(); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(cx + R * .48, cy - R * .32, R * .08, 0, 7); ctx.fill();
    ctx.strokeStyle = '#3a2010'; ctx.lineWidth = R * .04; [-1, 1].forEach(s2 => { ctx.beginPath(); ctx.arc(cx + s2 * R * .22, cy - R * .02, R * .1, .2, 2.9); ctx.stroke(); });
    ctx.fillStyle = '#3a2010'; ctx.beginPath(); ctx.ellipse(cx, cy + R * .22, R * .1, R * .06, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = `bold ${R * (.18 + .04 * Math.sin(t / 10))}px sans-serif`; ctx.textAlign = 'center'; ctx.fillText('Zzz', cx + R * .65, cy - R * .6);
  },
  // ホッタラカシ・ロボ：点検されずさびついた機械
  hottarakashi(ctx, cx, cy, R, t) {
    const j = (Math.floor(t / 6) % 2) * R * .02;
    const metal = (x0, x1) => lin(ctx, x0, 0, x1, 0, ['#c8b8a0', '#8a7a64', '#5a4a3a']);
    ctx.fillStyle = metal(cx - R * .55, cx + R * .55); rr(ctx, cx - R * .55 + j, cy - R * .25, R * 1.1, R * .8, R * .08); ctx.fill();
    ctx.fillStyle = metal(cx - R * .35, cx + R * .35); rr(ctx, cx - R * .35, cy - R * .8 + j, R * .7, R * .5, R * .08); ctx.fill();
    ctx.fillStyle = 'rgba(160,80,30,.7)'; [[-.3, .1], [.25, .3], [-.1, -.6], [.35, -.05]].forEach(([a, b2]) => { ctx.beginPath(); ctx.arc(cx + a * R, cy + b2 * R, R * .09, 0, 7); ctx.fill(); });
    ctx.fillStyle = '#222'; ctx.fillRect(cx - R * .25, cy - R * .65 + j, R * .5, R * .16); ctx.fillStyle = Math.floor(t / 20) % 2 ? '#f33' : '#600'; [-1, 1].forEach(s2 => { ctx.beginPath(); ctx.arc(cx + s2 * R * .12, cy - R * .57 + j, R * .05, 0, 7); ctx.fill(); });
    ctx.strokeStyle = '#5a4a3a'; ctx.lineWidth = R * .06; ctx.beginPath(); ctx.moveTo(cx, cy - R * .8); ctx.lineTo(cx + R * .1, cy - R * 1.0); ctx.stroke();
    ctx.fillStyle = '#5a4a3a'; [-1, 1].forEach(s2 => { ctx.fillRect(cx + s2 * R * .25 - R * .08, cy + R * .55, R * .16, R * .3); });
    ctx.save(); ctx.translate(cx + R * .05, cy + R * .1); ctx.rotate(-.1); ctx.fillStyle = '#fffbea'; ctx.fillRect(-R * .3, -R * .1, R * .6, R * .2); ctx.fillStyle = '#c33'; ctx.font = `bold ${R * .11}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('点検未実施', 0, 0); ctx.restore();
  },
  // ニセ監督官ハリボテ：板でできた張りぼての監督官
  haribote(ctx, cx, cy, R, t) {
    const sw = Math.sin(t / 18) * .05;
    ctx.save(); ctx.translate(cx, cy + R * .9); ctx.rotate(sw);
    ctx.fillStyle = '#7a5a3a'; ctx.fillRect(-R * .05, -R * .2, R * .1, R * .2);
    ctx.fillStyle = lin(ctx, -R * .6, 0, R * .6, 0, ['#e8d4a8', '#c8a878', '#9a7a4a']); ctx.fillRect(-R * .6, -R * 1.25, R * 1.2, R * 1.05);
    ctx.strokeStyle = '#7a5a3a'; ctx.lineWidth = R * .03; ctx.strokeRect(-R * .6, -R * 1.25, R * 1.2, R * 1.05);
    ctx.fillStyle = '#2a3550'; ctx.fillRect(-R * .45, -R * .95, R * .9, R * .7);
    ctx.fillStyle = '#f3c99f'; ctx.beginPath(); ctx.arc(0, -R * 1.35, R * .32, 0, 7); ctx.fill(); ctx.fillStyle = '#2a3550'; ctx.fillRect(-R * .36, -R * 1.7, R * .72, R * .16); ctx.fillRect(-R * .25, -R * 1.85, R * .5, R * .18);
    ctx.fillStyle = '#e0b030'; ctx.beginPath(); ctx.arc(0, -R * 1.76, R * .06, 0, 7); ctx.fill();
    eyes(ctx, 0, -R * 1.36, R * .11, R * .06);
    ctx.fillStyle = '#e0b030'; ctx.fillRect(-R * .3, -R * .82, R * .6, R * .12); ctx.fillStyle = '#2a1a00'; ctx.font = `bold ${R * .09}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('保安監督者？', 0, -R * .76);
    ctx.restore();
  },
  // キョリナシ・ゾンビ：保安距離を無視して家や学校に近づく
  chikazuki(ctx, cx, cy, R, t) {
    const lean = Math.sin(t / 14) * R * .05;
    ctx.fillStyle = lin(ctx, 0, cy - R, 0, cy + R, ['#9ab88a', '#5a7a4a']);
    ctx.beginPath(); ctx.ellipse(cx + lean, cy + R * .15, R * .42, R * .62, .12, 0, 7); ctx.fill();
    ctx.fillStyle = '#6a5a8a'; ctx.beginPath(); ctx.moveTo(cx - R * .45 + lean, cy + R * .1); ctx.lineTo(cx + R * .5 + lean, cy + R * .05); ctx.lineTo(cx + R * .42, cy + R * .8); ctx.lineTo(cx - R * .38, cy + R * .8); ctx.fill();
    ctx.fillStyle = '#4a3a5a'; [[-.3, .55], [.15, .4], [.3, .7]].forEach(([a, b]) => { ctx.fillRect(cx + a * R, cy + b * R, R * .1, R * .06); });
    ctx.fillStyle = '#a8c898'; ctx.beginPath(); ctx.arc(cx + lean * 1.4, cy - R * .55, R * .33, 0, 7); ctx.fill();
    ctx.fillStyle = '#fff'; [-1, 1].forEach(k => { ctx.beginPath(); ctx.arc(cx + lean * 1.4 + k * R * .12, cy - R * .58, R * .08, 0, 7); ctx.fill(); });
    ctx.fillStyle = '#c03030'; [-1, 1].forEach(k => { ctx.beginPath(); ctx.arc(cx + lean * 1.4 + k * R * .12, cy - R * .57, R * .035, 0, 7); ctx.fill(); });
    ctx.strokeStyle = '#3a4a2a'; ctx.lineWidth = R * .04; ctx.beginPath(); ctx.moveTo(cx - R * .1 + lean, cy - R * .4); ctx.lineTo(cx + R * .12 + lean, cy - R * .42); ctx.stroke();
    ctx.strokeStyle = '#9ab88a'; ctx.lineWidth = R * .13; ctx.lineCap = 'round';
    [-1, 1].forEach(k => { ctx.beginPath(); ctx.moveTo(cx + k * R * .3 + lean, cy - R * .1); ctx.lineTo(cx + k * R * .15 + R * .75 + lean * 2, cy - R * .2 + k * R * .08); ctx.stroke(); });
    ctx.lineCap = 'butt';
    { const hx = cx + R * .95, hy = cy + R * .55; ctx.fillStyle = '#e8d8b0'; ctx.fillRect(hx - R * .2, hy - R * .25, R * .4, R * .3); ctx.fillStyle = '#b5523b'; ctx.beginPath(); ctx.moveTo(hx - R * .27, hy - R * .25); ctx.lineTo(hx, hy - R * .48); ctx.lineTo(hx + R * .27, hy - R * .25); ctx.fill(); ctx.fillStyle = '#6a8ad0'; ctx.fillRect(hx - R * .06, hy - R * .17, R * .12, R * .1);
      ctx.strokeStyle = '#ff4030'; ctx.lineWidth = R * .035; ctx.beginPath(); ctx.moveTo(cx + R * .35, cy + R * .88); ctx.lineTo(hx - R * .2, cy + R * .88); ctx.stroke(); ctx.fillStyle = '#ff4030'; ctx.font = `bold ${R * .14}px sans-serif`; ctx.textAlign = 'center'; ctx.fillText('距離？', (cx + R * .35 + hx - R * .2) / 2, cy + R * .82); }
    ctx.save(); ctx.translate(cx - R * .62, cy + R * .45); ctx.rotate(-.5); ctx.fillStyle = '#f0d020'; ctx.fillRect(0, 0, R * .5, R * .1); ctx.fillStyle = '#222'; for (let i = 0; i < 5; i++) ctx.fillRect(R * (.05 + i * .09), 0, R * .015, R * .05); ctx.restore();
  },
  // アキチツブシ・ゴーレム：保有空地に樽や箱を詰め込んだ塊
  tsumekomi(ctx, cx, cy, R, t) {
    const j = Math.sin(t / 16) * R * .02;
    const box = (x, y, w, h, c) => { ctx.fillStyle = lin(ctx, x, 0, x + w, 0, c); ctx.fillRect(x, y, w, h); ctx.strokeStyle = 'rgba(0,0,0,.35)'; ctx.lineWidth = R * .02; ctx.strokeRect(x, y, w, h); };
    const wood = ['#c89a5a', '#8a6030'], drum = ['#d84a3a', '#8a2a20'];
    ctx.save(); ctx.strokeStyle = '#fff'; ctx.lineWidth = R * .03; ctx.setLineDash([R * .08, R * .06]); ctx.beginPath(); ctx.ellipse(cx, cy + R * .82, R * 1.0, R * .16, 0, 0, 7); ctx.stroke(); ctx.restore();
    box(cx - R * .7, cy + R * .2 + j, R * .5, R * .6, wood); box(cx - R * .2, cy + R * .1 + j, R * .45, R * .7, drum); box(cx + R * .25, cy + R * .25 + j, R * .48, R * .55, wood);
    box(cx - R * .5, cy - R * .4 + j, R * .55, R * .55, drum); box(cx + R * .05, cy - R * .45 + j, R * .5, R * .6, wood);
    box(cx - R * .3, cy - R * .95 + j, R * .6, R * .52, wood);
    ctx.fillStyle = '#ffeb6a'; [-1, 1].forEach(k => { ctx.beginPath(); ctx.arc(cx + k * R * .14, cy - R * .7 + j, R * .07, 0, 7); ctx.fill(); });
    ctx.fillStyle = '#2a1a0a'; ctx.fillRect(cx - R * .15, cy - R * .55 + j, R * .3, R * .05);
    ctx.fillStyle = '#5a4030'; [-1, 1].forEach(k => ctx.fillRect(cx + k * R * .78 - R * .08, cy - R * .2 + j, R * .16, R * .5));
    ctx.fillStyle = '#fff'; ctx.font = `bold ${R * .13}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('空地', cx + R * .02, cy + R * .45 + j); ctx.fillStyle = '#ff4030'; ctx.font = `bold ${R * .2}px sans-serif`; ctx.fillText('×', cx + R * .3, cy + R * .45 + j);
  },
  // ムヒョウジ・プレート：文字も色もでたらめな看板の魔物
  muhyouji(ctx, cx, cy, R, t) {
    const sw = Math.sin(t / 20) * .06;
    ctx.save(); ctx.translate(cx, cy + R * .9); ctx.rotate(sw);
    ctx.fillStyle = '#6a5a4a'; ctx.fillRect(-R * .06, -R * .9, R * .12, R * .9);
    ctx.fillStyle = '#e8e8e0'; rr(ctx, -R * .75, -R * 1.65, R * 1.5, R * .85, R * .06); ctx.fill(); ctx.strokeStyle = '#555'; ctx.lineWidth = R * .04; ctx.stroke();
    const blink = Math.floor(t / 25) % 2;
    ctx.fillStyle = blink ? '#3a6ad8' : '#e0c020'; ctx.fillRect(-R * .62, -R * 1.52, R * 1.24, R * .3);
    ctx.fillStyle = blink ? '#f0e040' : '#3a3a3a'; ctx.font = `bold ${R * .2}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('火気？？', 0, -R * 1.37);
    ctx.fillStyle = '#222'; [-1, 1].forEach(k => { ctx.beginPath(); ctx.ellipse(k * R * .25, -R * 1.05, R * .09, R * .06, 0, 0, 7); ctx.fill(); });
    ctx.strokeStyle = '#222'; ctx.lineWidth = R * .04; ctx.beginPath(); ctx.moveTo(-R * .35, -R * 1.2); ctx.lineTo(-R * .12, -R * 1.12); ctx.moveTo(R * .35, -R * 1.2); ctx.lineTo(R * .12, -R * 1.12); ctx.stroke();
    ctx.beginPath(); ctx.arc(0, -R * .88, R * .12, 3.5, 5.9); ctx.stroke();
    ctx.strokeStyle = '#6a5a4a'; ctx.lineWidth = R * .08; [-1, 1].forEach(k => { ctx.beginPath(); ctx.moveTo(k * R * .7, -R * 1.2); ctx.lineTo(k * R * 1.0, -R * (1.0 + .15 * Math.sin(t / 9 + k))); ctx.stroke(); });
    ctx.restore();
  },
  // ショウカマゼ・ガーゴイル：消火設備の種類をごちゃまぜにする石像
  mazekoze(ctx, cx, cy, R, t) {
    const fl = Math.sin(t / 8) * .25;
    ctx.fillStyle = '#5a5664'; [-1, 1].forEach(k => { ctx.beginPath(); ctx.moveTo(cx + k * R * .2, cy - R * .2); ctx.lineTo(cx + k * R * (1.0 + fl * .1), cy - R * (.75 + fl * .2)); ctx.lineTo(cx + k * R * .85, cy + R * .1); ctx.lineTo(cx + k * R * .6, cy - R * .05); ctx.lineTo(cx + k * R * .45, cy + R * .2); ctx.fill(); });
    ctx.fillStyle = lin(ctx, 0, cy - R * .5, 0, cy + R * .8, ['#a8a4b0', '#68646e']); ctx.beginPath(); ctx.ellipse(cx, cy + R * .2, R * .42, R * .55, 0, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.arc(cx, cy - R * .48, R * .3, 0, 7); ctx.fill();
    ctx.fillStyle = '#8a8694'; [-1, 1].forEach(k => { ctx.beginPath(); ctx.moveTo(cx + k * R * .15, cy - R * .7); ctx.lineTo(cx + k * R * .3, cy - R * 1.0); ctx.lineTo(cx + k * R * .28, cy - R * .62); ctx.fill(); });
    ctx.fillStyle = '#ff6a2a'; [-1, 1].forEach(k => { ctx.beginPath(); ctx.arc(cx + k * R * .11, cy - R * .5, R * .055, 0, 7); ctx.fill(); });
    ctx.fillStyle = '#2a2830'; ctx.fillRect(cx - R * .12, cy - R * .36, R * .24, R * .05);
    // 左手にバケツ、右手に小さな消火器
    ctx.fillStyle = '#3a6ad8'; ctx.beginPath(); ctx.moveTo(cx - R * .78, cy + R * .2); ctx.lineTo(cx - R * .48, cy + R * .2); ctx.lineTo(cx - R * .52, cy + R * .52); ctx.lineTo(cx - R * .74, cy + R * .52); ctx.fill();
    ctx.fillStyle = '#d83030'; rr(ctx, cx + R * .5, cy + R * .05, R * .2, R * .5, R * .06); ctx.fill(); ctx.fillStyle = '#222'; ctx.fillRect(cx + R * .55, cy - R * .02, R * .1, R * .08);
    ctx.fillStyle = '#fff'; ctx.font = `bold ${R * .14}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('第?種', cx, cy + R * .3);
    const tag = (x, y, txt) => { ctx.fillStyle = '#fffbea'; ctx.fillRect(x - R * .17, y - R * .08, R * .34, R * .16); ctx.fillStyle = '#c02020'; ctx.font = `bold ${R * .11}px sans-serif`; ctx.fillText(txt, x, y); };
    const sw2 = Math.floor(t / 30) % 2; tag(cx - R * .63, cy + R * .02, sw2 ? '第1種' : '第3種'); tag(cx + R * .6, cy - R * .2, sw2 ? '第2種' : '第4種');
  },
  // キジュンクズシ将軍：ゆがんだ物差しの剣を持つ砦の主
  kijunkuzushi(ctx, cx, cy, R, t) {
    const br = Math.sin(t / 18) * R * .02;
    ctx.fillStyle = '#8a1a20'; ctx.beginPath(); ctx.moveTo(cx - R * .5, cy - R * .5); ctx.quadraticCurveTo(cx - R * .95, cy + R * .4, cx - R * .7, cy + R * .95); ctx.lineTo(cx + R * .7, cy + R * .95); ctx.quadraticCurveTo(cx + R * .95, cy + R * .4, cx + R * .5, cy - R * .5); ctx.fill();
    const steel = (x0, x1) => lin(ctx, x0, 0, x1, 0, ['#d8dce8', '#8a90a0', '#4a5060']);
    ctx.fillStyle = steel(cx - R * .5, cx + R * .5); rr(ctx, cx - R * .48, cy - R * .5 + br, R * .96, R * 1.0, R * .12); ctx.fill();
    ctx.fillStyle = '#c8a030'; ctx.fillRect(cx - R * .48, cy - R * .05 + br, R * .96, R * .08);
    ctx.fillStyle = steel(cx - R * .6, cx + R * .6); [-1, 1].forEach(k => { ctx.beginPath(); ctx.ellipse(cx + k * R * .52, cy - R * .42 + br, R * .2, R * .14, 0, 0, 7); ctx.fill(); });
    ctx.fillStyle = steel(cx - R * .3, cx + R * .3); ctx.beginPath(); ctx.arc(cx, cy - R * .78 + br, R * .3, Math.PI, 0); ctx.lineTo(cx + R * .3, cy - R * .55 + br); ctx.lineTo(cx - R * .3, cy - R * .55 + br); ctx.fill();
    ctx.fillStyle = '#1a1a22'; ctx.fillRect(cx - R * .2, cy - R * .78 + br, R * .4, R * .07);
    ctx.fillStyle = '#ff3a2a'; [-1, 1].forEach(k => { ctx.beginPath(); ctx.arc(cx + k * R * .09, cy - R * .745 + br, R * .03, 0, 7); ctx.fill(); });
    ctx.fillStyle = '#c8302a'; ctx.beginPath(); ctx.moveTo(cx, cy - R * 1.08 + br); ctx.quadraticCurveTo(cx + R * .35, cy - R * 1.3, cx + R * .25, cy - R * .95); ctx.fill();
    // ゆがんだ物差しの剣
    ctx.save(); ctx.translate(cx + R * .62, cy - R * .1 + br); ctx.rotate(-.5 + Math.sin(t / 22) * .08);
    ctx.fillStyle = '#f0d030'; ctx.beginPath(); ctx.moveTo(-R * .05, 0); ctx.quadraticCurveTo(R * .15, -R * .55, -R * .02, -R * 1.05); ctx.lineTo(R * .1, -R * 1.05); ctx.quadraticCurveTo(R * .27, -R * .55, R * .07, 0); ctx.fill();
    ctx.fillStyle = '#222'; for (let i = 1; i < 9; i++) { const y = -R * .11 * i, x = Math.sin(i / 9 * Math.PI) * R * .1; ctx.fillRect(x - R * .02, y, R * (i % 2 ? .06 : .1), R * .015); }
    ctx.fillStyle = '#6a4a2a'; ctx.fillRect(-R * .03, 0, R * .1, R * .22); ctx.fillStyle = '#c8a030'; ctx.fillRect(-R * .12, -R * .02, R * .28, R * .05);
    ctx.restore();
    ctx.fillStyle = steel(cx - R * .3, cx + R * .3); [-1, 1].forEach(k => ctx.fillRect(cx + k * R * .22 - R * .1, cy + R * .48, R * .2, R * .42));
  },
  // ツメスギ・ボトル：口いっぱいまで詰めてあふれている容器
  tsumesugi(ctx, cx, cy, R, t) {
    const wob = Math.sin(t / 12) * .05;
    ctx.save(); ctx.translate(cx, cy + R * .2); ctx.rotate(wob);
    ctx.fillStyle = lin(ctx, -R * .45, 0, R * .45, 0, ['#d0e8f0', '#90b8c8', '#5a8090']); rr(ctx, -R * .45, -R * .55, R * .9, R * 1.2, R * .15); ctx.fill();
    ctx.fillStyle = '#e8b020'; ctx.fillRect(-R * .45, -R * .55, R * .9, R * 1.2); ctx.globalAlpha = .9; ctx.fillStyle = lin(ctx, 0, -R * .55, 0, R * .6, ['#ffd84a', '#d89a10']); ctx.fillRect(-R * .43, -R * .53, R * .86, R * 1.15); ctx.globalAlpha = 1;
    ctx.fillStyle = '#5a8090'; ctx.fillRect(-R * .2, -R * .8, R * .4, R * .27);
    ctx.fillStyle = '#ffd84a'; for (let i = 0; i < 4; i++) { const ph = (t / 8 + i * 1.6) % 6; ctx.beginPath(); ctx.ellipse((i - 1.5) * R * .2 + Math.sin(ph) * R * .05, -R * .82 + ph * R * .25, R * .07, R * .1, 0, 0, 7); ctx.fill(); }
    ctx.beginPath(); ctx.ellipse(0, -R * .85, R * .25, R * .1, 0, 0, 7); ctx.fill();
    eyes(ctx, 0, -R * .15, R * .18, R * .09);
    ctx.strokeStyle = '#3a2a00'; ctx.lineWidth = R * .04; ctx.beginPath(); ctx.arc(0, R * .1, R * .14, .2, 2.9); ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.font = `bold ${R * .2}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('100%', 0, R * .4);
    ctx.restore();
  },
  // マゼヅミ・スライム：ちがう類のびんや缶を体にまぜて積んだスライム
  mazezumi(ctx, cx, cy, R, t) {
    const sq = Math.sin(t / 10) * R * .04;
    ctx.fillStyle = 'rgba(150,90,200,.85)'; ctx.beginPath(); ctx.moveTo(cx - R * .8, cy + R * .7); ctx.quadraticCurveTo(cx - R * .9 - sq, cy - R * .3, cx, cy - R * .8 + sq); ctx.quadraticCurveTo(cx + R * .9 + sq, cy - R * .3, cx + R * .8, cy + R * .7); ctx.closePath(); ctx.fill();
    const can = (x, y, c, lbl) => { ctx.fillStyle = c; rr(ctx, x - R * .14, y - R * .2, R * .28, R * .4, R * .05); ctx.fill(); ctx.fillStyle = '#fff'; ctx.font = `bold ${R * .16}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(lbl, x, y); };
    can(cx - R * .35, cy + R * .3, '#d83a2a', '4'); can(cx + R * .35, cy + R * .32, '#e8e030', '6'); can(cx, cy + R * .45, '#3a7ad8', '1');
    ctx.strokeStyle = '#fff'; ctx.lineWidth = R * .05; const zz = Math.floor(t / 8) % 2; if (zz) { ctx.beginPath(); ctx.moveTo(cx - R * .1, cy + R * .1); ctx.lineTo(cx, cy + R * .2); ctx.lineTo(cx - R * .05, cy + R * .25); ctx.lineTo(cx + R * .08, cy + R * .35); ctx.stroke(); }
    eyes(ctx, cx, cy - R * .3, R * .2, R * .1);
    ctx.fillStyle = 'rgba(255,255,255,.4)'; ctx.beginPath(); ctx.ellipse(cx - R * .4, cy - R * .35, R * .1, R * .18, -.5, 0, 7); ctx.fill();
  },
  // ヒョウシキナシ・カート：「危」の標識がない、積みすぎの荷車
  hyoshikinashi(ctx, cx, cy, R, t) {
    const b = Math.abs(Math.sin(t / 7)) * R * .04;
    ctx.fillStyle = '#7a5230'; ctx.fillRect(cx - R * .85, cy + R * .2 - b, R * 1.7, R * .2);
    const drum = (x, y) => { ctx.fillStyle = lin(ctx, x - R * .2, 0, x + R * .2, 0, ['#4a8ad0', '#2a5a9a']); ctx.fillRect(x - R * .2, y - R * .45, R * .4, R * .45); ctx.fillStyle = '#1a3a6a'; ctx.fillRect(x - R * .2, y - R * .32, R * .4, R * .04); ctx.fillRect(x - R * .2, y - R * .15, R * .4, R * .04); };
    drum(cx - R * .55, cy + R * .2 - b); drum(cx - R * .1, cy + R * .2 - b); drum(cx + R * .35, cy + R * .2 - b); drum(cx - R * .32, cy - R * .25 - b); drum(cx + R * .13, cy - R * .25 - b);
    ctx.fillStyle = '#2a2a2a'; [-1, 1].forEach(k => { ctx.beginPath(); ctx.arc(cx + k * R * .55, cy + R * .55, R * .2, 0, 7); ctx.fill(); ctx.fillStyle = '#888'; ctx.beginPath(); ctx.arc(cx + k * R * .55, cy + R * .55, R * .08, 0, 7); ctx.fill(); ctx.fillStyle = '#2a2a2a'; });
    // 何も書いていない黒い板（本来は「危」）
    ctx.fillStyle = '#111'; ctx.fillRect(cx + R * .7, cy - R * .2 - b, R * .3, R * .3); ctx.strokeStyle = '#ff4030'; ctx.lineWidth = R * .05; ctx.beginPath(); ctx.moveTo(cx + R * .7, cy - R * .2 - b); ctx.lineTo(cx + R, cy + R * .1 - b); ctx.stroke();
    eyes(ctx, cx - R * .1, cy + R * .3 - b, R * .25, R * .07);
  },
  // ワンマン・ローリー：資格者のいない一人走りのタンクローリー
  wanman(ctx, cx, cy, R, t) {
    const b = Math.sin(t / 6) * R * .02;
    ctx.fillStyle = lin(ctx, 0, cy - R * .5, 0, cy + R * .3, ['#f0f0f0', '#b8b8c0']); ctx.beginPath(); ctx.ellipse(cx - R * .15, cy - R * .05 + b, R * .65, R * .35, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#d83a2a'; ctx.fillRect(cx - R * .8, cy - R * .08 + b, R * 1.3, R * .07);
    ctx.fillStyle = lin(ctx, 0, cy - R * .5, 0, cy + R * .3, ['#e05a2a', '#a03010']); rr(ctx, cx + R * .45, cy - R * .4 + b, R * .45, R * .7, R * .08); ctx.fill();
    ctx.fillStyle = '#a8d8f0'; ctx.fillRect(cx + R * .55, cy - R * .32 + b, R * .28, R * .22);
    ctx.fillStyle = '#ff3a2a'; [.62, .76].forEach(x => { ctx.beginPath(); ctx.arc(cx + R * x, cy - R * .22 + b, R * .035, 0, 7); ctx.fill(); });
    ctx.fillStyle = '#333'; ctx.fillRect(cx - R * .85, cy + R * .3, R * 1.75, R * .08);
    ctx.fillStyle = '#1a1a1a'; [-.55, -.1, .65].forEach(x => { ctx.beginPath(); ctx.arc(cx + R * x, cy + R * .45, R * .16, 0, 7); ctx.fill(); });
    ctx.fillStyle = '#111'; ctx.fillRect(cx + R * .8, cy - R * .6 + b, R * .18, R * .18); ctx.fillStyle = '#f0d020'; ctx.font = `bold ${R * .15}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('危', cx + R * .89, cy - R * .51 + b);
    ctx.fillStyle = '#fff'; ctx.font = `bold ${R * .16}px sans-serif`; ctx.fillText('1人', cx - R * .15, cy - R * .2 + b);
  },
  // ムチャハコビ団長：背中に山ほど荷を積んだ運び屋の大男
  muchahakobi(ctx, cx, cy, R, t) {
    const sw = Math.sin(t / 16) * .06;
    ctx.save(); ctx.translate(cx, cy + R * 1.0); ctx.rotate(sw); ctx.scale(.72, .72);
    const box = (x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); ctx.strokeStyle = 'rgba(0,0,0,.35)'; ctx.lineWidth = R * .02; ctx.strokeRect(x, y, w, h); };
    box(-R * .7, -R * 2.0, R * .5, R * .45, '#4a8ad0'); box(-R * .2, -R * 2.1, R * .45, R * .55, '#d83a2a'); box(R * .25, -R * 1.95, R * .45, R * .4, '#e8e030');
    box(-R * .55, -R * 2.45, R * .5, R * .45, '#9a6a3a'); box(-R * .05, -R * 2.55, R * .45, R * .45, '#3aa860');
    ctx.fillStyle = '#c87a40'; ctx.beginPath(); ctx.ellipse(0, -R * .95, R * .58, R * .65, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#5a3a1e'; ctx.fillRect(-R * .58, -R * .7, R * 1.16, R * .14);
    ctx.fillStyle = '#e8b888'; ctx.beginPath(); ctx.arc(0, -R * 1.62, R * .3, 0, 7); ctx.fill();
    ctx.fillStyle = '#2a2a2a'; ctx.fillRect(-R * .32, -R * 1.9, R * .64, R * .12);
    eyes(ctx, 0, -R * 1.62, R * .1, R * .05); ctx.strokeStyle = '#3a1a0a'; ctx.lineWidth = R * .04; ctx.beginPath(); ctx.arc(0, -R * 1.48, R * .1, .1, 3); ctx.stroke();
    ctx.strokeStyle = '#c87a40'; ctx.lineWidth = R * .16; ctx.lineCap = 'round'; [-1, 1].forEach(k => { ctx.beginPath(); ctx.moveTo(k * R * .5, -R * 1.2); ctx.lineTo(k * R * .65, -R * 1.9); ctx.stroke(); }); ctx.lineCap = 'butt';
    ctx.fillStyle = '#5a3a1e'; [-1, 1].forEach(k => ctx.fillRect(k * R * .25 - R * .12, -R * .4, R * .24, R * .4));
    ctx.restore();
  },
};
function hslToHex(h, s, l) { const a = s * Math.min(l, 1 - l); const f = n => { const k = (n + h / 30) % 12; const c = l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)); return Math.round(255 * c).toString(16).padStart(2, '0'); }; return `#${f(0)}${f(8)}${f(4)}`; }

export function drawEnemyHQ(ctx, id, cx, cy, R, t, fallback) {
  const im = Assets.enemies[id];
  if (im) { const s = (R * 2.2) / Math.max(im.width, im.height); const bob = Math.sin(t / 20) * R * .03; ctx.drawImage(im, cx - im.width * s / 2, cy + R * .95 - im.height * s + bob, im.width * s, im.height * s); return; }
  if (ENEMY_HQ[id]) return ENEMY_HQ[id](ctx, cx, cy, R, t);
  if (fallback) fallback(ctx, id, cx, cy, R, t);
}

// 戦闘背景（画像がなければ奥行きのある絵をコードで描く）
export function drawBattleBg(ctx, W, H, kind = 'grass', t = 0) {
  const im = Assets.bg['bg_battle_' + kind];
  if (im) { const s = Math.max(W / im.width, H / im.height); ctx.drawImage(im, (W - im.width * s) / 2, (H - im.height * s) / 2, im.width * s, im.height * s); return; }
  const sky = lin(ctx, 0, 0, 0, H * .55, kind === 'town' ? ['#6a8fc8', '#c8d8ee'] : ['#4f86d8', '#bfe0ff']); ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = 'rgba(255,255,255,.8)'; [[.2, .15], [.7, .1], [.5, .22]].forEach(([x, y], i) => { const xx = ((x * W + t * .2 * (i + 1)) % (W * 1.3)) - W * .15; ctx.beginPath(); ctx.ellipse(xx, y * H, W * .1, H * .04, 0, 0, 7); ctx.ellipse(xx + W * .06, y * H - H * .02, W * .07, H * .035, 0, 0, 7); ctx.fill(); });
  if (kind === 'pass') { kind = 'grass'; }
  if (kind === 'fort') { // 砦の中：石の壁とたいまつ
    ctx.fillStyle = lin(ctx, 0, 0, 0, H * .6, ['#1a1820', '#3a3640']); ctx.fillRect(0, 0, W, H * .6);
    for (let r = 0; r < 7; r++) for (let k = 0; k < 7; k++) { const bw = W / 6, bh = H * .08, x = k * bw - (r % 2) * bw / 2, y = r * bh; ctx.fillStyle = `hsl(260,6%,${22 + ((r * 3 + k * 5) % 4) * 3}%)`; ctx.fillRect(x + 2, y + 2, bw - 4, bh - 4); }
    [.18, .82].forEach(px => { const fx = W * px, fy = H * .28, fl = Math.sin(t / 5 + px * 9) * H * .006; const gl = ctx.createRadialGradient(fx, fy, 2, fx, fy, W * .2); gl.addColorStop(0, 'rgba(255,170,60,.55)'); gl.addColorStop(1, 'rgba(255,170,60,0)'); ctx.fillStyle = gl; ctx.fillRect(fx - W * .2, fy - W * .2, W * .4, W * .4);
      ctx.fillStyle = '#4a3a2a'; ctx.fillRect(fx - W * .01, fy, W * .02, H * .06); ctx.fillStyle = '#ffb040'; ctx.beginPath(); ctx.ellipse(fx, fy - H * .015 + fl, W * .018, H * .03, 0, 0, 7); ctx.fill(); ctx.fillStyle = '#fff2b0'; ctx.beginPath(); ctx.ellipse(fx, fy - H * .008 + fl, W * .008, H * .015, 0, 0, 7); ctx.fill(); });
    ctx.fillStyle = lin(ctx, 0, H * .55, 0, H, ['#4a4650', '#24222a']); ctx.fillRect(0, H * .55, W, H * .45);
    ctx.strokeStyle = 'rgba(0,0,0,.25)'; for (let i = 0; i < 9; i++) { ctx.beginPath(); ctx.moveTo(W / 2, H * .55); ctx.lineTo(W * (i / 8) * 2 - W * .5, H); ctx.stroke(); }
    const sh2 = ctx.createRadialGradient(W / 2, H * .82, 2, W / 2, H * .82, W * .32); sh2.addColorStop(0, 'rgba(0,0,0,.4)'); sh2.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = sh2; ctx.fillRect(0, H * .6, W, H * .4); return;
  }
  if (kind === 'town') {
    for (let i = 0; i < 5; i++) { const x = i * W * .22 - W * .05, h = H * (.18 + (i % 2) * .06); ctx.fillStyle = lin(ctx, 0, H * .55 - h, 0, H * .55, ['#d8c8a8', '#a89070']); ctx.fillRect(x, H * .55 - h, W * .2, h); ctx.fillStyle = '#a5402a'; ctx.beginPath(); ctx.moveTo(x - W * .01, H * .55 - h); ctx.lineTo(x + W * .1, H * .55 - h - H * .07); ctx.lineTo(x + W * .21, H * .55 - h); ctx.fill(); }
    ctx.fillStyle = lin(ctx, 0, H * .55, 0, H, ['#9a9080', '#5a5248']); ctx.fillRect(0, H * .55, W, H * .45);
    ctx.strokeStyle = 'rgba(0,0,0,.15)'; for (let i = 0; i < 9; i++) { ctx.beginPath(); ctx.moveTo(W / 2, H * .55); ctx.lineTo(W * (i / 8) * 2 - W * .5, H); ctx.stroke(); }
  } else {
    ctx.fillStyle = lin(ctx, 0, H * .38, 0, H * .58, ['#6a9a6a', '#4a7a4a']); ctx.beginPath(); ctx.moveTo(0, H * .52); ctx.quadraticCurveTo(W * .25, H * .36, W * .5, H * .48); ctx.quadraticCurveTo(W * .75, H * .38, W, H * .5); ctx.lineTo(W, H * .6); ctx.lineTo(0, H * .6); ctx.fill();
    ctx.fillStyle = lin(ctx, 0, H * .52, 0, H, ['#6fbf5a', '#2f7a2a']); ctx.fillRect(0, H * .55, W, H * .45);
  }
  const sh = ctx.createRadialGradient(W / 2, H * .82, 2, W / 2, H * .82, W * .32); sh.addColorStop(0, 'rgba(0,0,0,.35)'); sh.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = sh; ctx.fillRect(0, H * .6, W, H * .4);
}

// ---- ドット絵化：描いた絵（画像を含む）を細かい点に置き換え、全員の絵柄をそろえる ----
export const STYLE = { dot: true };
const _work = document.createElement('canvas');
export function pixelate(src, pw, ph, { levels = 10, outline = true, cut = 110 } = {}) {
  _work.width = pw; _work.height = ph; const w = _work.getContext('2d', { willReadFrequently: true });
  w.clearRect(0, 0, pw, ph); w.imageSmoothingEnabled = true; w.imageSmoothingQuality = 'high'; w.drawImage(src, 0, 0, pw, ph);
  const img = w.getImageData(0, 0, pw, ph), d = img.data, step = 255 / (levels - 1);
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] < cut) { d[i + 3] = 0; continue; }
    const a = d[i + 3] / 255; d[i + 3] = 255;
    for (let c = 0; c < 3; c++) d[i + c] = Math.round(Math.round(d[i + c] / a / step) * step);
  }
  if (outline) { // 透明の点のうち、絵に接する点を濃い縁取りにする
    const o = new Uint8ClampedArray(d);
    for (let y = 0; y < ph; y++) for (let x = 0; x < pw; x++) {
      const i = (y * pw + x) * 4; if (d[i + 3]) continue;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= pw || ny >= ph) continue; const j = (ny * pw + nx) * 4;
        if (d[j + 3]) { o[i] = d[j] * .3; o[i + 1] = d[j + 1] * .3; o[i + 2] = d[j + 2] * .35; o[i + 3] = 255; break; }
      }
    }
    img.data.set(o);
  }
  const out = document.createElement('canvas'); out.width = pw; out.height = ph; out.getContext('2d').putImageData(img, 0, 0); return out;
}
// 人物のドット絵（幅40×高さ60点）
export function characterDot(look, dir = 'down', pw = 40, ph = 60, fr = 0) {
  const big = document.createElement('canvas'); big.width = 256; big.height = 384;
  // リアルな頭身の画像はドットにすると潰れるため、ドット絵ではドット用に描いた絵（assets/dots/）がなければ仮の絵を使う
  drawCharacter(big.getContext('2d'), 256, 384, look, dir, false, fr);
  return pixelate(big, pw, ph, { levels: 9 });
}
// 魔物のドット絵（毎フレーム、小さく描いてから拡大）
const _big = document.createElement('canvas');
export function drawEnemyDot(ctx, id, cx, cy, R, t, fallback, res = 110) {
  const S = Math.ceil(R * 2.6); _big.width = _big.height = 360; const b = _big.getContext('2d'); b.clearRect(0, 0, 360, 360);
  drawEnemyHQ(b, id, 180, 190, 125, t, fallback);
  const cut = { hibana: 30, kemurin: 175, wisp: 190, steamdragon: 150 }[id] || 120;
  const px = pixelate(_big, res, res, { levels: 8, cut, outline: id !== 'hibana' && id !== 'wisp' });
  ctx.save(); ctx.imageSmoothingEnabled = false; ctx.drawImage(px, cx - S / 2, cy - S / 2 - R * .05, S, S); ctx.restore();
}
export function drawBattleBgDot(ctx, W, H, kind, t) {
  const pw = 160, ph = Math.round(160 * H / W);
  const bgc = document.createElement('canvas'); bgc.width = pw; bgc.height = ph; drawBattleBg(bgc.getContext('2d'), pw, ph, kind, t);
  const px = pixelate(bgc, pw, ph, { levels: 12, outline: false });
  ctx.save(); ctx.imageSmoothingEnabled = false; ctx.drawImage(px, 0, 0, W, H); ctx.restore();
}
