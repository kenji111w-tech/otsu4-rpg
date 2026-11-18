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
export function drawCharacter(ctx, W, H, lookKey, dir = 'down', useAsset = true) {
  const im = useAsset && Assets.chars[lookKey];
  if (im) { const s = Math.min(W / im.width, H / im.height); ctx.drawImage(im, (W - im.width * s) / 2, H - im.height * s, im.width * s, im.height * s); return; }
  const L = LOOKS[lookKey] || LOOKS.villager; const u = W / 100; const big = L.big ? 1.15 : 1, sm = L.small ? .85 : 1;
  ctx.save(); ctx.translate(W / 2, H); ctx.scale(sm, sm);
  const back = dir === 'up';
  // 脚
  [-1, 1].forEach(s => { ctx.fillStyle = lin(ctx, s * 12 * u, 0, s * 12 * u + 10 * u, 0, [shade(L.cloth2, -.2), shade(L.cloth2, -.45)]); rr(ctx, s * 13 * u - 7 * u, -40 * u, 14 * u, 36 * u, 6 * u); ctx.fill();
    ctx.fillStyle = lin(ctx, 0, -8 * u, 0, 0, ['#6a4428', '#3a2414']); rr(ctx, s * 13 * u - 9 * u, -10 * u, 18 * u, 10 * u, 4 * u); ctx.fill(); });
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
export function characterDot(look, dir = 'down', pw = 40, ph = 60) {
  const big = document.createElement('canvas'); big.width = 256; big.height = 384;
  // リアルな頭身の画像はドットにすると潰れるため、ドット絵ではドット用に描いた絵（assets/dots/）がなければ仮の絵を使う
  drawCharacter(big.getContext('2d'), 256, 384, look, dir, false);
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
