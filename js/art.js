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
  if (dir === 'left' || dir === 'right') { drawCharacterSide(ctx, u, L, dir === 'left' ? -1 : 1, big, fr); ctx.restore(); return; }
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

// 横向きの人物（右向きに描き、左向きは左右反転）
function drawCharacterSide(ctx, u, L, side, big, fr) {
  ctx.scale(side, 1);
  const sw = fr === 0 ? 0 : (fr === 1 ? 1 : -1); // 歩くときは足と腕を前後に振る
  [[-1, '#3a2414'], [1, '#6a4428']].forEach(([s, shoe]) => { const off = s * sw * 9 * u;
    ctx.fillStyle = lin(ctx, -8 * u, 0, 8 * u, 0, [shade(L.cloth2, s < 0 ? -.45 : -.2), shade(L.cloth2, s < 0 ? -.6 : -.4)]); rr(ctx, off - 7 * u, -40 * u, 14 * u, 36 * u, 6 * u); ctx.fill();
    ctx.fillStyle = shoe; rr(ctx, off - 7 * u, -10 * u, 22 * u, 10 * u, 4 * u); ctx.fill(); });
  if (fr) ctx.translate(0, -2 * u);
  const bw = 32 * u * big;
  if (L.big) { ctx.fillStyle = lin(ctx, 0, -120 * u, 0, -60 * u, ['#b07a40', '#6a4420']); rr(ctx, -bw / 2 - 18 * u, -100 * u, 22 * u, 50 * u, 6 * u); ctx.fill(); }
  // 奥の腕
  ctx.save(); ctx.translate(0, -86 * u); ctx.rotate(-sw * .35); ctx.fillStyle = shade(L.cloth, -.45); rr(ctx, -6 * u, 0, 12 * u, 38 * u, 6 * u); ctx.fill(); ctx.restore();
  ctx.fillStyle = lin(ctx, -bw / 2, 0, bw / 2, 0, [shade(L.cloth, -.3), L.cloth, shade(L.cloth, .12)]); rr(ctx, -bw / 2, -92 * u, bw, 56 * u, 13 * u); ctx.fill();
  ctx.fillStyle = lin(ctx, 0, -50 * u, 0, -42 * u, [L.accent, shade(L.accent, -.3)]); ctx.fillRect(-bw / 2, -50 * u, bw, 7 * u);
  // 手前の腕
  ctx.save(); ctx.translate(0, -86 * u); ctx.rotate(sw * .35); ctx.fillStyle = lin(ctx, -6 * u, 0, 6 * u, 0, [shade(L.cloth, .05), shade(L.cloth, -.25)]); rr(ctx, -6 * u, 0, 12 * u, 38 * u, 6 * u); ctx.fill();
  ctx.fillStyle = L.skin; ctx.beginPath(); ctx.arc(0, 40 * u, 7 * u, 0, 7); ctx.fill(); ctx.restore();
  if (L.scroll) { ctx.fillStyle = lin(ctx, 0, -70 * u, 0, -50 * u, ['#fbf1d0', '#d9c58c']); rr(ctx, 4 * u, -58 * u, 22 * u, 14 * u, 4 * u); ctx.fill(); }
  // 頭
  const hy = -122 * u, hr = 30 * u;
  const sk = ctx.createRadialGradient(8 * u, hy - 8 * u, 4 * u, 0, hy, hr * 1.1); sk.addColorStop(0, shade(L.skin, .25)); sk.addColorStop(1, shade(L.skin, -.18));
  ctx.fillStyle = sk; ctx.beginPath(); ctx.ellipse(0, hy, hr * .92, hr, 0, 0, 7); ctx.fill();
  ctx.beginPath(); ctx.ellipse(hr * .85, hy + 6 * u, 5 * u, 6 * u, 0, 0, 7); ctx.fill(); // 鼻
  const ex = 14 * u, ey = hy + 4 * u;
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse(ex, ey, 5 * u, 7.5 * u, 0, 0, 7); ctx.fill();
  ctx.fillStyle = '#1b1b2a'; ctx.beginPath(); ctx.ellipse(ex + 1.5 * u, ey + 1 * u, 3.6 * u, 6 * u, 0, 0, 7); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(ex, ey - 2.5 * u, 1.5 * u, 0, 7); ctx.fill();
  ctx.fillStyle = 'rgba(255,120,120,.25)'; ctx.beginPath(); ctx.ellipse(10 * u, hy + 14 * u, 5 * u, 3 * u, 0, 0, 7); ctx.fill();
  ctx.strokeStyle = shade(L.skin, -.5); ctx.lineWidth = 1.8 * u; ctx.beginPath(); ctx.moveTo(18 * u, hy + 16 * u); ctx.lineTo(24 * u, hy + 15 * u); ctx.stroke();
  if (L.glasses) { ctx.strokeStyle = '#334'; ctx.lineWidth = 2 * u; rr(ctx, ex - 8 * u, hy - 3 * u, 16 * u, 14 * u, 4 * u); ctx.stroke(); ctx.beginPath(); ctx.moveTo(ex - 8 * u, hy + 2 * u); ctx.lineTo(-10 * u, hy); ctx.stroke(); }
  if (L.beard) { ctx.fillStyle = lin(ctx, 0, hy + 10 * u, 0, hy + 50 * u, ['#ffffff', '#cfcfd6']); ctx.beginPath(); ctx.moveTo(-6 * u, hy + 10 * u); ctx.quadraticCurveTo(0, hy + 50 * u, 16 * u, hy + 52 * u); ctx.quadraticCurveTo(30 * u, hy + 30 * u, 26 * u, hy + 10 * u); ctx.fill(); }
  // 髪（後ろ側を広くおおう）
  const hair = lin(ctx, 0, hy - hr, 0, hy + hr * .3, [shade(L.hair, .25), L.hair, shade(L.hair, -.35)]);
  const st = L.style;
  if (st === 'helmet') { ctx.fillStyle = lin(ctx, 0, hy - 44 * u, 0, hy - 4 * u, [shade(L.cloth, .3), shade(L.cloth, -.3)]); ctx.beginPath(); ctx.ellipse(0, hy - 10 * u, 34 * u, 30 * u, 0, Math.PI, 0); ctx.fill(); ctx.fillRect(-36 * u, hy - 12 * u, 76 * u, 6 * u); ctx.fillStyle = L.accent; ctx.fillRect(-4 * u, hy - 40 * u, 8 * u, 28 * u); return; }
  if (st === 'hood') { ctx.fillStyle = lin(ctx, 0, hy - 40 * u, 0, hy + 30 * u, [shade(L.cloth2, .2), L.cloth2]); ctx.beginPath(); ctx.moveTo(-34 * u, hy + 30 * u); ctx.quadraticCurveTo(-40 * u, hy - 42 * u, 6 * u, hy - 40 * u); ctx.quadraticCurveTo(30 * u, hy - 36 * u, 22 * u, hy - 14 * u); ctx.quadraticCurveTo(0, hy - 20 * u, -4 * u, hy + 30 * u); ctx.fill(); return; }
  ctx.fillStyle = hair;
  if (st === 'bald') { ctx.beginPath(); ctx.ellipse(-20 * u, hy + 4 * u, 8 * u, 12 * u, 0, 0, 7); ctx.fill(); return; }
  ctx.beginPath(); ctx.moveTo(26 * u, hy - 12 * u);
  if (st === 'spiky') { for (let i = 0; i <= 6; i++) { const a = -Math.PI * .15 - i / 6 * Math.PI * .95; ctx.lineTo(Math.cos(a) * hr * 1.25, hy - 6 * u + Math.sin(a) * hr * 1.25); ctx.lineTo(Math.cos(a - .12) * hr * .95, hy - 4 * u + Math.sin(a - .12) * hr * .95); } }
  else ctx.quadraticCurveTo(10 * u, hy - 40 * u, -24 * u, hy - 24 * u);
  ctx.quadraticCurveTo(-36 * u, hy, -26 * u, hy + 20 * u); ctx.quadraticCurveTo(-8 * u, hy + 10 * u, -4 * u, hy - 6 * u); ctx.quadraticCurveTo(10 * u, hy - 14 * u, 26 * u, hy - 12 * u); ctx.fill();
  if (st === 'band') { ctx.fillStyle = lin(ctx, 0, hy - 16 * u, 0, hy - 8 * u, ['#e53935', '#a01818']); ctx.fillRect(-30 * u, hy - 16 * u, 58 * u, 8 * u); ctx.fillRect(-36 * u, hy - 14 * u, 10 * u, 18 * u); }
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
  // ナイショハイシ・ネズミ：閉めた施設の鍵をくわえて逃げ回る
  naishohaishi(ctx, cx, cy, R, t) {
    const run = Math.sin(t / 5) * R * .05;
    ctx.strokeStyle = '#c88a9a'; ctx.lineWidth = R * .06; ctx.beginPath(); ctx.moveTo(cx - R * .55, cy + R * .3); ctx.quadraticCurveTo(cx - R * 1.0, cy + R * .1 + run, cx - R * .9, cy - R * .3); ctx.stroke();
    ctx.fillStyle = lin(ctx, 0, cy - R * .4, 0, cy + R * .6, ['#a8a0b0', '#68607a']); ctx.beginPath(); ctx.ellipse(cx, cy + R * .2, R * .62, R * .45, 0, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.ellipse(cx + R * .5, cy - R * .05, R * .32, R * .28, -.3, 0, 7); ctx.fill();
    ctx.fillStyle = '#e8b0c0'; [[.32, -.32], [.62, -.32]].forEach(([x, y]) => { ctx.beginPath(); ctx.arc(cx + R * x, cy + R * y, R * .14, 0, 7); ctx.fill(); });
    ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(cx + R * .58, cy - R * .08, R * .05, 0, 7); ctx.fill(); ctx.fillStyle = '#e88aa0'; ctx.beginPath(); ctx.arc(cx + R * .82, cy + R * .02, R * .05, 0, 7); ctx.fill();
    // 口にくわえた鍵
    ctx.fillStyle = '#f0c030'; ctx.beginPath(); ctx.arc(cx + R * .9, cy + R * .18, R * .09, 0, 7); ctx.fill(); ctx.fillRect(cx + R * .9, cy + R * .15, R * .3, R * .06); ctx.fillRect(cx + R * 1.1, cy + R * .2, R * .04, R * .08);
    // 背中の「閉鎖」の札
    ctx.fillStyle = '#fffbea'; ctx.fillRect(cx - R * .35, cy - R * .2, R * .5, R * .3); ctx.fillStyle = '#c02020'; ctx.font = `bold ${R * .17}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('閉鎖', cx - R * .1, cy - R * .05);
    ctx.fillStyle = '#5a5070'; [-.35, .25].forEach(x => ctx.fillRect(cx + R * x, cy + R * .55 + (x < 0 ? run : -run), R * .12, R * .2));
  },
  // キテイナシ・ゴースト：白紙の予防規程の巻物を持つ亡霊
  kiteinashi(ctx, cx, cy, R, t) {
    const fl = Math.sin(t / 15) * R * .06;
    ctx.fillStyle = 'rgba(220,230,255,.85)'; ctx.beginPath(); ctx.moveTo(cx - R * .5, cy + R * .6 + fl); ctx.quadraticCurveTo(cx - R * .6, cy - R * .8 + fl, cx, cy - R * .85 + fl); ctx.quadraticCurveTo(cx + R * .6, cy - R * .8 + fl, cx + R * .5, cy + R * .6 + fl);
    for (let i = 0; i < 4; i++) ctx.quadraticCurveTo(cx + R * (.375 - i * .25), cy + R * (.85 + (i % 2) * .1) + fl, cx + R * (.25 - i * .25), cy + R * .6 + fl); ctx.fill();
    ctx.fillStyle = '#2a2a50'; [-1, 1].forEach(k => { ctx.beginPath(); ctx.ellipse(cx + k * R * .17, cy - R * .35 + fl, R * .08, R * .12, 0, 0, 7); ctx.fill(); });
    ctx.beginPath(); ctx.ellipse(cx, cy - R * .08 + fl, R * .08, R * .1, 0, 0, 7); ctx.fill();
    // 白紙の巻物
    ctx.fillStyle = '#c8a060'; ctx.fillRect(cx + R * .35, cy - R * .1 + fl, R * .08, R * .65); ctx.fillRect(cx + R * .87, cy - R * .1 + fl, R * .08, R * .65);
    ctx.fillStyle = '#fffbea'; ctx.fillRect(cx + R * .43, cy - R * .05 + fl, R * .44, R * .55);
    ctx.fillStyle = '#8a7a5a'; ctx.font = `bold ${R * .11}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('予防規程', cx + R * .65, cy + R * .05 + fl); ctx.fillStyle = '#ccc'; ctx.fillText('（白紙）', cx + R * .65, cy + R * .3 + fl);
  },
  // チラカシ・ゴブリン：くずやぼろ布を散らかす小鬼
  chirakashi(ctx, cx, cy, R, t) {
    const hop = Math.abs(Math.sin(t / 8)) * R * .06;
    ctx.fillStyle = '#6a5a3a'; [[-.7, .75], [-.4, .82], [.5, .8], [.78, .72], [0, .9]].forEach(([x, y], i) => { ctx.save(); ctx.translate(cx + R * x, cy + R * y); ctx.rotate(i); ctx.fillRect(-R * .12, -R * .05, R * .24, R * .1); ctx.restore(); });
    ctx.fillStyle = '#8ab04a'; ctx.beginPath(); ctx.ellipse(cx, cy + R * .15 - hop, R * .42, R * .45, 0, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.arc(cx, cy - R * .45 - hop, R * .32, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.moveTo(cx - R * .28, cy - R * .5 - hop); ctx.lineTo(cx - R * .6, cy - R * .7 - hop); ctx.lineTo(cx - R * .25, cy - R * .38 - hop); ctx.fill(); ctx.beginPath(); ctx.moveTo(cx + R * .28, cy - R * .5 - hop); ctx.lineTo(cx + R * .6, cy - R * .7 - hop); ctx.lineTo(cx + R * .25, cy - R * .38 - hop); ctx.fill();
    eyes(ctx, cx, cy - R * .47 - hop, R * .12, R * .07);
    ctx.fillStyle = '#3a2a10'; ctx.beginPath(); ctx.arc(cx, cy - R * .3 - hop, R * .12, 0, 3.1); ctx.fill();
    // 油じみたぼろ布を振り回す
    ctx.save(); ctx.translate(cx + R * .45, cy - hop); ctx.rotate(Math.sin(t / 6) * .6); ctx.fillStyle = '#c8a878'; ctx.fillRect(0, -R * .1, R * .45, R * .25); ctx.fillStyle = '#6a4a20'; ctx.beginPath(); ctx.arc(R * .2, R * .03, R * .07, 0, 7); ctx.fill(); ctx.restore();
    ctx.fillStyle = '#5a7a2a'; [-1, 1].forEach(k => ctx.fillRect(cx + k * R * .18 - R * .07, cy + R * .52 - hop, R * .14, R * .22));
  },
  // ナガレッパナシ・スライム：漏れた油を流しっぱなしにする黒いスライム
  nagareppanashi(ctx, cx, cy, R, t) {
    const sp = (t % 60) / 60;
    ctx.fillStyle = 'rgba(30,25,20,.55)'; ctx.beginPath(); ctx.ellipse(cx, cy + R * .75, R * (.9 + sp * .25), R * (.16 + sp * .05), 0, 0, 7); ctx.fill();
    ctx.strokeStyle = 'rgba(255,0,180,.35)'; ctx.lineWidth = R * .03; ctx.beginPath(); ctx.ellipse(cx, cy + R * .75, R * .7, R * .1, 0, 0, 7); ctx.stroke(); ctx.strokeStyle = 'rgba(0,220,255,.35)'; ctx.beginPath(); ctx.ellipse(cx, cy + R * .75, R * .5, R * .07, 0, 0, 7); ctx.stroke();
    ctx.fillStyle = lin(ctx, 0, cy - R * .6, 0, cy + R * .7, ['#5a5048', '#1a1612']); ctx.beginPath(); ctx.moveTo(cx - R * .65, cy + R * .7); ctx.quadraticCurveTo(cx - R * .7, cy - R * .4, cx, cy - R * .65); ctx.quadraticCurveTo(cx + R * .7, cy - R * .4, cx + R * .65, cy + R * .7); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.beginPath(); ctx.ellipse(cx - R * .3, cy - R * .3, R * .08, R * .16, -.5, 0, 7); ctx.fill();
    ctx.fillStyle = '#fff'; [-1, 1].forEach(k => { ctx.beginPath(); ctx.arc(cx + k * R * .17, cy - R * .15, R * .1, 0, 7); ctx.fill(); }); ctx.fillStyle = '#111'; [-1, 1].forEach(k => { ctx.beginPath(); ctx.arc(cx + k * R * .17, cy - R * .12, R * .05, 0, 7); ctx.fill(); });
    ctx.strokeStyle = '#ddd'; ctx.lineWidth = R * .03; ctx.beginPath(); ctx.arc(cx, cy + R * .08, R * .15, .3, 2.8); ctx.stroke();
    ctx.fillStyle = '#1a1612'; for (let i = 0; i < 3; i++) { const y = ((t / 3 + i * 20) % 60) / 60; ctx.beginPath(); ctx.ellipse(cx + R * (.5 + i * .12), cy + R * (.1 + y * .6), R * .05, R * .08, 0, 0, 7); ctx.fill(); }
  },
  // ムトドケ：届出書をすべて破り捨てる、法令の城の主
  mutodoke(ctx, cx, cy, R, t) {
    const br = Math.sin(t / 20) * R * .02;
    ctx.fillStyle = '#4a1a5a'; ctx.beginPath(); ctx.moveTo(cx - R * .55, cy - R * .45); ctx.lineTo(cx - R * .85, cy + R * .95); ctx.lineTo(cx + R * .85, cy + R * .95); ctx.lineTo(cx + R * .55, cy - R * .45); ctx.fill();
    ctx.fillStyle = lin(ctx, cx - R * .5, 0, cx + R * .5, 0, ['#7a2a8a', '#4a1a5a']); rr(ctx, cx - R * .45, cy - R * .5 + br, R * .9, R * 1.3, R * .15); ctx.fill();
    ctx.fillStyle = '#f0c030'; ctx.fillRect(cx - R * .05, cy - R * .45 + br, R * .1, R * 1.2);
    ctx.fillStyle = '#d8b8a0'; ctx.beginPath(); ctx.arc(cx, cy - R * .72 + br, R * .28, 0, 7); ctx.fill();
    ctx.fillStyle = '#f0c030'; ctx.beginPath(); ctx.moveTo(cx - R * .3, cy - R * .9 + br); for (let i = 0; i < 5; i++) { ctx.lineTo(cx - R * .3 + i * R * .15, cy - R * (1.2 - (i % 2) * .15) + br); } ctx.lineTo(cx + R * .3, cy - R * .9 + br); ctx.fill();
    ctx.fillStyle = '#c02020'; ctx.beginPath(); ctx.arc(cx, cy - R * 1.05 + br, R * .05, 0, 7); ctx.fill();
    ctx.strokeStyle = '#2a1a1a'; ctx.lineWidth = R * .04; [-1, 1].forEach(k => { ctx.beginPath(); ctx.moveTo(cx + k * R * .2, cy - R * .82 + br); ctx.lineTo(cx + k * R * .06, cy - R * .76 + br); ctx.stroke(); });
    ctx.fillStyle = '#2a1a1a'; [-1, 1].forEach(k => { ctx.beginPath(); ctx.arc(cx + k * R * .12, cy - R * .72 + br, R * .035, 0, 7); ctx.fill(); });
    ctx.beginPath(); ctx.arc(cx, cy - R * .56 + br, R * .1, 3.4, 6); ctx.stroke();
    // 破れた届出書が舞う
    for (let i = 0; i < 4; i++) { const a = t / 25 + i * 1.6, x = cx + Math.cos(a) * R * .85, y = cy + Math.sin(a * 1.3) * R * .4; ctx.save(); ctx.translate(x, y); ctx.rotate(a); ctx.fillStyle = '#fffbea'; ctx.fillRect(-R * .12, -R * .08, R * .2, R * .16); ctx.fillStyle = '#c02020'; ctx.fillRect(-R * .1, -R * .02, R * .16, R * .02); ctx.restore(); }
    ctx.save(); ctx.translate(cx - R * .6, cy + R * .1 + br); ctx.rotate(-.2); ctx.fillStyle = '#fffbea'; ctx.fillRect(-R * .2, -R * .25, R * .4, R * .5); ctx.strokeStyle = '#c02020'; ctx.lineWidth = R * .05; ctx.beginPath(); ctx.moveTo(-R * .15, -R * .2); ctx.lineTo(R * .15, R * .2); ctx.moveTo(R * .15, -R * .2); ctx.lineTo(-R * .15, R * .2); ctx.stroke(); ctx.fillStyle = '#333'; ctx.font = `bold ${R * .1}px sans-serif`; ctx.textAlign = 'center'; ctx.fillText('届出', 0, -R * .28); ctx.restore();
  },
  // アサボリ・モグラ：地下タンクを浅く埋めるモグラ
  asabori(ctx, cx, cy, R, t) {
    const dig = Math.sin(t / 6) * .3;
    ctx.fillStyle = '#7a5a3a'; ctx.beginPath(); ctx.ellipse(cx, cy + R * .78, R * .95, R * .16, 0, 0, 7); ctx.fill();
    ctx.fillStyle = lin(ctx, 0, 0, 0, 1, ['#c8c8d0', '#8a8a98']); ctx.fillStyle = '#9aa0ac'; rr(ctx, cx + R * .15, cy + R * .45, R * .75, R * .32, R * .15); ctx.fill(); ctx.fillStyle = '#6a7080'; ctx.fillRect(cx + R * .15, cy + R * .58, R * .75, R * .04);
    ctx.fillStyle = lin(ctx, 0, cy - R * .5, 0, cy + R * .7, ['#6a5a5a', '#3a2e2e']); ctx.beginPath(); ctx.ellipse(cx - R * .2, cy + R * .2, R * .48, R * .55, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#e8a0a0'; ctx.beginPath(); ctx.ellipse(cx - R * .2, cy - R * .02, R * .12, R * .08, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#111'; [-1, 1].forEach(k => { ctx.beginPath(); ctx.arc(cx - R * .2 + k * R * .13, cy - R * .16, R * .035, 0, 7); ctx.fill(); });
    ctx.fillStyle = '#f0c020'; ctx.beginPath(); ctx.ellipse(cx - R * .2, cy - R * .32, R * .36, R * .2, 0, Math.PI, 0); ctx.fill(); ctx.fillRect(cx - R * .6, cy - R * .34, R * .8, R * .05);
    ctx.save(); ctx.translate(cx - R * .6, cy + R * .2); ctx.rotate(-.6 + dig); ctx.fillStyle = '#8a6a3a'; ctx.fillRect(-R * .03, -R * .6, R * .06, R * .6); ctx.fillStyle = '#aaa'; ctx.beginPath(); ctx.moveTo(-R * .12, -R * .6); ctx.lineTo(R * .12, -R * .6); ctx.lineTo(0, -R * .82); ctx.fill(); ctx.restore();
    ctx.fillStyle = '#e8b0b0'; [-1, 1].forEach(k => { ctx.beginPath(); ctx.ellipse(cx - R * .2 + k * R * .35, cy + R * .3, R * .12, R * .08, 0, 0, 7); ctx.fill(); });
  },
  // ツツミヤブリ・ガエル：防油堤をけずるカエル
  tsutsumiyaburi(ctx, cx, cy, R, t) {
    const hop = Math.abs(Math.sin(t / 9)) * R * .08;
    ctx.fillStyle = '#9a9aa8'; ctx.fillRect(cx - R * .95, cy + R * .45, R * .35, R * .35); ctx.fillRect(cx + R * .6, cy + R * .6, R * .35, R * .2);
    ctx.fillStyle = '#6a6a78'; ctx.fillRect(cx + R * .62, cy + R * .45, R * .1, R * .15); ctx.fillRect(cx + R * .78, cy + R * .5, R * .08, R * .1);
    ctx.fillStyle = 'rgba(40,30,20,.6)'; ctx.beginPath(); ctx.ellipse(cx + R * .85, cy + R * .86, R * .25, R * .06, 0, 0, 7); ctx.fill();
    ctx.fillStyle = lin(ctx, 0, cy - R * .4, 0, cy + R * .7, ['#7ac850', '#3a8a2a']); ctx.beginPath(); ctx.ellipse(cx, cy + R * .25 - hop, R * .55, R * .42, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#e8f0b0'; ctx.beginPath(); ctx.ellipse(cx, cy + R * .38 - hop, R * .35, R * .25, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#7ac850'; [-1, 1].forEach(k => { ctx.beginPath(); ctx.arc(cx + k * R * .27, cy - R * .2 - hop, R * .17, 0, 7); ctx.fill(); });
    ctx.fillStyle = '#fff'; [-1, 1].forEach(k => { ctx.beginPath(); ctx.arc(cx + k * R * .27, cy - R * .22 - hop, R * .11, 0, 7); ctx.fill(); }); ctx.fillStyle = '#111'; [-1, 1].forEach(k => { ctx.beginPath(); ctx.arc(cx + k * R * .27, cy - R * .2 - hop, R * .055, 0, 7); ctx.fill(); });
    ctx.strokeStyle = '#2a5a1a'; ctx.lineWidth = R * .04; ctx.beginPath(); ctx.arc(cx, cy + R * .02 - hop, R * .28, .3, 2.8); ctx.stroke();
    ctx.fillStyle = '#5aa83a'; [-1, 1].forEach(k => { ctx.beginPath(); ctx.ellipse(cx + k * R * .55, cy + R * .62, R * .22, R * .1, 0, 0, 7); ctx.fill(); });
  },
  // シキリナシ・タンク：仕切り板を放り出したふくれたタンク
  shikirinashi(ctx, cx, cy, R, t) {
    const pu = Math.sin(t / 10) * R * .04;
    ctx.fillStyle = lin(ctx, 0, cy - R * .5, 0, cy + R * .4, ['#f4f4f8', '#a8acb8']); ctx.beginPath(); ctx.ellipse(cx, cy, R * (.78 + pu / R), R * (.48 + pu / R), 0, 0, 7); ctx.fill();
    ctx.strokeStyle = '#d83a2a'; ctx.lineWidth = R * .06; ctx.beginPath(); ctx.ellipse(cx, cy, R * .7, R * .1, 0, 0, Math.PI); ctx.stroke();
    eyes(ctx, cx, cy - R * .12, R * .25, R * .1);
    ctx.strokeStyle = '#333'; ctx.lineWidth = R * .04; ctx.beginPath(); ctx.arc(cx, cy + R * .12, R * .14, .2, 2.9); ctx.stroke();
    ctx.fillStyle = '#1a1a1a'; [-.5, .45].forEach(x => { ctx.beginPath(); ctx.arc(cx + R * x, cy + R * .55, R * .14, 0, 7); ctx.fill(); });
    for (let i = 0; i < 3; i++) { const a = t / 18 + i * 2.1; ctx.save(); ctx.translate(cx + Math.cos(a) * R * .9, cy - R * .55 + Math.sin(a) * R * .2); ctx.rotate(a); ctx.fillStyle = '#7a8090'; ctx.fillRect(-R * .04, -R * .2, R * .08, R * .4); ctx.restore(); }
    ctx.fillStyle = '#111'; ctx.fillRect(cx + R * .55, cy - R * .4, R * .18, R * .18); ctx.fillStyle = '#f0d020'; ctx.font = `bold ${R * .14}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('危', cx + R * .64, cy - R * .31);
  },
  // セマスギ・スタンド：入口をせまくする給油機
  semasugi(ctx, cx, cy, R, t) {
    const sw = Math.sin(t / 12) * .08;
    ctx.fillStyle = '#d8d8e0'; rr(ctx, cx - R * .35, cy - R * .6, R * .7, R * 1.3, R * .1); ctx.fill();
    ctx.fillStyle = '#d83a2a'; ctx.fillRect(cx - R * .35, cy - R * .6, R * .7, R * .25);
    ctx.fillStyle = '#1a2a3a'; ctx.fillRect(cx - R * .24, cy - R * .25, R * .48, R * .3);
    ctx.fillStyle = '#ff5a3a'; [-1, 1].forEach(k => { ctx.beginPath(); ctx.arc(cx + k * R * .1, cy - R * .1, R * .045, 0, 7); ctx.fill(); });
    ctx.save(); ctx.translate(cx + R * .35, cy - R * .1); ctx.rotate(sw); ctx.strokeStyle = '#222'; ctx.lineWidth = R * .06; ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(R * .4, R * .3, R * .3, R * .6); ctx.stroke(); ctx.fillStyle = '#444'; ctx.fillRect(R * .22, R * .55, R * .16, R * .1); ctx.restore();
    // 入口をふさぐ看板
    [-.8, .8].forEach(x => { ctx.fillStyle = '#e8c030'; ctx.beginPath(); ctx.moveTo(cx + R * x - R * .15, cy + R * .75); ctx.lineTo(cx + R * x, cy + R * .25); ctx.lineTo(cx + R * x + R * .15, cy + R * .75); ctx.fill(); ctx.fillStyle = '#222'; ctx.fillRect(cx + R * x - R * .02, cy + R * .4, R * .04, R * .15); });
    ctx.strokeStyle = '#ff3a2a'; ctx.lineWidth = R * .04; ctx.setLineDash([R * .06, R * .05]); ctx.beginPath(); ctx.moveTo(cx - R * .95, cy + R * .85); ctx.lineTo(cx - R * .6, cy + R * .85); ctx.moveTo(cx + R * .6, cy + R * .85); ctx.lineTo(cx + R * .95, cy + R * .85); ctx.stroke(); ctx.setLineDash([]);
  },
  // ニカイダテ・ゴースト：タンクを2階へ運ぶ亡霊
  nikaidate(ctx, cx, cy, R, t) {
    const fl = Math.sin(t / 14) * R * .05;
    ctx.fillStyle = '#7a6a5a'; for (let i = 0; i < 4; i++) ctx.fillRect(cx - R * .95 + i * R * .2, cy + R * .8 - i * R * .2, R * .22, R * .2 + i * R * .2);
    ctx.fillStyle = 'rgba(200,220,240,.85)'; ctx.beginPath(); ctx.moveTo(cx - R * .4, cy + R * .55 + fl); ctx.quadraticCurveTo(cx - R * .5, cy - R * .6 + fl, cx + R * .05, cy - R * .65 + fl); ctx.quadraticCurveTo(cx + R * .55, cy - R * .6 + fl, cx + R * .45, cy + R * .55 + fl); ctx.quadraticCurveTo(cx + R * .25, cy + R * .35 + fl, cx + R * .05, cy + R * .6 + fl); ctx.quadraticCurveTo(cx - R * .15, cy + R * .35 + fl, cx - R * .4, cy + R * .55 + fl); ctx.fill();
    ctx.fillStyle = '#2a2a50'; [-1, 1].forEach(k => { ctx.beginPath(); ctx.ellipse(cx + R * .05 + k * R * .14, cy - R * .25 + fl, R * .06, R * .1, 0, 0, 7); ctx.fill(); });
    ctx.fillStyle = lin(ctx, 0, cy - R, 0, cy - R * .6, ['#e0e4ec', '#8a90a0']); rr(ctx, cx - R * .25, cy - R * 1.05 + fl, R * .6, R * .38, R * .1); ctx.fill(); ctx.fillStyle = '#d83a2a'; ctx.fillRect(cx - R * .25, cy - R * .9 + fl, R * .6, R * .05);
    ctx.fillStyle = '#fff'; ctx.font = `bold ${R * .18}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('2F', cx + R * .7, cy - R * .7);
  },
  // ヨッツメ・ポット：4つ目の小さなタンクを頭にのせるポット
  yottsume(ctx, cx, cy, R, t) {
    const b = Math.sin(t / 10) * R * .03;
    ctx.fillStyle = lin(ctx, cx - R * .5, 0, cx + R * .5, 0, ['#c8d0e0', '#7a8498']); ctx.beginPath(); ctx.ellipse(cx, cy + R * .35, R * .5, R * .45, 0, 0, 7); ctx.fill();
    eyes(ctx, cx, cy + R * .25, R * .2, R * .09); ctx.strokeStyle = '#333'; ctx.lineWidth = R * .04; ctx.beginPath(); ctx.arc(cx, cy + R * .45, R * .12, .2, 2.9); ctx.stroke();
    const tank = (x, y, c) => { ctx.fillStyle = c; rr(ctx, x - R * .14, y - R * .2, R * .28, R * .32, R * .06); ctx.fill(); ctx.fillStyle = '#333'; ctx.fillRect(x - R * .03, y - R * .26, R * .06, R * .07); };
    tank(cx - R * .42, cy - R * .2 + b, '#e05a3a'); tank(cx - R * .14, cy - R * .25 - b, '#e8c030'); tank(cx + R * .14, cy - R * .25 + b, '#3a8ad8'); tank(cx + R * .42, cy - R * .2 - b, '#e05a3a');
    ctx.fillStyle = '#c02020'; ctx.font = `bold ${R * .16}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('4', cx + R * .42, cy - R * .2 - b);
  },
  // ノザラシ・ドラム：ガソリンを野ざらしにするさびたドラム缶
  nozarashi(ctx, cx, cy, R, t) {
    const sw = Math.sin(t / 15) * .05;
    ctx.save(); ctx.translate(cx, cy + R * .2); ctx.rotate(sw);
    ctx.fillStyle = lin(ctx, -R * .45, 0, R * .45, 0, ['#a85a2a', '#d8803a', '#7a3a1a']); ctx.fillRect(-R * .45, -R * .65, R * .9, R * 1.3);
    ctx.fillStyle = '#5a2a10'; [-.4, 0, .4].forEach(y => ctx.fillRect(-R * .45, R * y - R * .03, R * .9, R * .06));
    ctx.fillStyle = '#4a2a1a'; ctx.beginPath(); ctx.ellipse(0, -R * .65, R * .45, R * .1, 0, 0, 7); ctx.fill();
    ctx.fillStyle = 'rgba(60,40,20,.5)'; [[-.3, .2], [.2, -.3], [.25, .45]].forEach(([x, y]) => { ctx.beginPath(); ctx.arc(R * x, R * y, R * .08, 0, 7); ctx.fill(); });
    ctx.fillStyle = '#ffeb6a'; [-1, 1].forEach(k => { ctx.beginPath(); ctx.arc(k * R * .17, -R * .18, R * .08, 0, 7); ctx.fill(); }); ctx.fillStyle = '#111'; [-1, 1].forEach(k => { ctx.beginPath(); ctx.arc(k * R * .17, -R * .16, R * .04, 0, 7); ctx.fill(); });
    ctx.fillStyle = '#2a1a0a'; ctx.fillRect(-R * .2, R * .05, R * .4, R * .06);
    ctx.restore();
    ctx.strokeStyle = 'rgba(180,200,120,.6)'; ctx.lineWidth = R * .03; for (let i = 0; i < 3; i++) { const y = cy - R * .55 - ((t / 2 + i * 15) % 40) / 40 * R * .5; ctx.beginPath(); ctx.moveTo(cx - R * .1 + i * R * .1, y); ctx.quadraticCurveTo(cx + i * R * .1, y - R * .1, cx - R * .1 + i * R * .1, y - R * .2); ctx.stroke(); }
    ctx.fillStyle = '#5a8a3a'; [-.8, -.6, .65, .85].forEach(x => { ctx.beginPath(); ctx.moveTo(cx + R * x, cy + R * .9); ctx.lineTo(cx + R * x + R * .05, cy + R * .65); ctx.lineTo(cx + R * x + R * .1, cy + R * .9); ctx.fill(); });
  },
  // ツメカエ・ショウニン：店で詰め替えをする商人
  tsumekae(ctx, cx, cy, R, t) {
    const pour = Math.sin(t / 8) * .1;
    ctx.fillStyle = '#7a5a3a'; ctx.fillRect(cx - R * .9, cy + R * .45, R * 1.8, R * .12);
    ctx.fillStyle = '#3a6a8a'; rr(ctx, cx - R * .35, cy - R * .3, R * .7, R * .8, R * .15); ctx.fill();
    ctx.fillStyle = '#f0e0c0'; ctx.fillRect(cx - R * .2, cy - R * .2, R * .4, R * .6);
    ctx.fillStyle = '#e8c098'; ctx.beginPath(); ctx.arc(cx, cy - R * .5, R * .25, 0, 7); ctx.fill();
    ctx.fillStyle = '#3a2a1a'; ctx.beginPath(); ctx.ellipse(cx, cy - R * .68, R * .3, R * .1, 0, 0, 7); ctx.fill(); ctx.fillRect(cx - R * .18, cy - R * .85, R * .36, R * .18);
    eyes(ctx, cx, cy - R * .5, R * .09, R * .05); ctx.strokeStyle = '#3a1a0a'; ctx.lineWidth = R * .03; ctx.beginPath(); ctx.arc(cx, cy - R * .38, R * .08, .2, 2.9); ctx.stroke();
    ctx.save(); ctx.translate(cx - R * .55, cy + R * .05); ctx.rotate(.9 + pour); ctx.fillStyle = '#d83a2a'; ctx.fillRect(-R * .15, -R * .2, R * .3, R * .4); ctx.restore();
    ctx.strokeStyle = '#e8c040'; ctx.lineWidth = R * .04; ctx.beginPath(); ctx.moveTo(cx - R * .45, cy + R * .2); ctx.lineTo(cx - R * .45, cy + R * .3); ctx.stroke();
    ctx.fillStyle = 'rgba(200,230,255,.8)'; [-.45, .55, .75].forEach(x => { rr(ctx, cx + R * x - R * .07, cy + R * .25, R * .14, R * .2, R * .03); ctx.fill(); });
  },
  // サンヨウソ・ドラゴン：3つの首（燃える物・酸素・火のもと）の竜
  sanyouso(ctx, cx, cy, R, t) {
    ctx.fillStyle = lin(ctx, 0, cy - R * .2, 0, cy + R * .8, ['#d8503a', '#8a2a1a']); ctx.beginPath(); ctx.ellipse(cx, cy + R * .4, R * .5, R * .4, 0, 0, 7); ctx.fill();
    const heads = [[-.55, -.35, '#8a5a2a', '木'], [0, -.6, '#4ab8e8', 'O₂'], [.55, -.35, '#ffb020', '火']];
    heads.forEach(([hx, hy, col, lb], i) => { const sw = Math.sin(t / 10 + i * 2) * R * .05;
      ctx.strokeStyle = '#b8402a'; ctx.lineWidth = R * .16; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(cx + hx * R * .4, cy + R * .15); ctx.quadraticCurveTo(cx + hx * R * .8, cy + hy * R * .3, cx + hx * R + sw, cy + hy * R); ctx.stroke(); ctx.lineCap = 'butt';
      ctx.fillStyle = '#c8482e'; ctx.beginPath(); ctx.ellipse(cx + hx * R + sw, cy + hy * R, R * .2, R * .15, 0, 0, 7); ctx.fill();
      ctx.fillStyle = '#ffe04a'; ctx.beginPath(); ctx.arc(cx + hx * R + sw + R * .06, cy + hy * R - R * .04, R * .04, 0, 7); ctx.fill();
      ctx.fillStyle = col; ctx.beginPath(); ctx.arc(cx + hx * R + sw, cy + hy * R - R * .26, R * .11, 0, 7); ctx.fill(); ctx.fillStyle = '#fff'; ctx.font = `bold ${R * .1}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(lb, cx + hx * R + sw, cy + hy * R - R * .26); });
    ctx.fillStyle = '#8a2a1a'; [-1, 1].forEach(k => ctx.fillRect(cx + k * R * .28 - R * .08, cy + R * .7, R * .16, R * .2));
  },
  // ヨツモエ・ランタン：4つの火口で、ちがう燃え方をするランタン
  yotsumoe(ctx, cx, cy, R, t) {
    ctx.fillStyle = '#3a3a44'; ctx.fillRect(cx - R * .05, cy - R * 1.0, R * .1, R * .25); ctx.beginPath(); ctx.arc(cx, cy - R * 1.0, R * .1, 0, 7); ctx.strokeStyle = '#3a3a44'; ctx.lineWidth = R * .04; ctx.stroke();
    ctx.fillStyle = lin(ctx, cx - R * .5, 0, cx + R * .5, 0, ['#c8a050', '#8a6020']); rr(ctx, cx - R * .45, cy - R * .75, R * .9, R * 1.45, R * .1); ctx.fill();
    ctx.fillStyle = 'rgba(255,240,200,.25)'; rr(ctx, cx - R * .36, cy - R * .62, R * .72, R * 1.2, R * .06); ctx.fill();
    const fl = [['#ff6a1a', -.18, -.3], ['#4a9aff', .18, -.3], ['#ffd02a', -.18, .25], ['#ff3a3a', .18, .25]];
    fl.forEach(([c, x, y], i) => { const h = R * (.2 + .05 * Math.sin(t / 5 + i)); ctx.fillStyle = c; ctx.beginPath(); ctx.ellipse(cx + x * R, cy + y * R, R * .1, h, 0, 0, 7); ctx.fill(); ctx.fillStyle = '#fff6c0'; ctx.beginPath(); ctx.ellipse(cx + x * R, cy + y * R + h * .3, R * .04, h * .4, 0, 0, 7); ctx.fill(); });
    ctx.fillStyle = '#5a3a10'; ctx.fillRect(cx - R * .45, cy - R * .05, R * .9, R * .05); ctx.fillRect(cx - R * .025, cy - R * .62, R * .05, R * 1.2);
    eyes(ctx, cx, cy + R * .58, R * .16, R * .06);
  },
  // インカテン・ウィスプ：温度計を引きずる青い火の玉
  inkaten(ctx, cx, cy, R, t) {
    const fl = Math.sin(t / 9) * R * .06;
    ctx.fillStyle = 'rgba(60,140,255,.35)'; ctx.beginPath(); ctx.ellipse(cx, cy + R * .85, R * .7, R * .1, 0, 0, 7); ctx.fill();
    const g = ctx.createRadialGradient(cx, cy - R * .1 + fl, R * .05, cx, cy - R * .1 + fl, R * .6); g.addColorStop(0, '#e8f8ff'); g.addColorStop(.4, '#6ac8ff'); g.addColorStop(1, 'rgba(40,100,255,0)'); ctx.fillStyle = g;
    ctx.beginPath(); ctx.moveTo(cx, cy - R * .9 + fl); ctx.quadraticCurveTo(cx + R * .55, cy - R * .2 + fl, cx + R * .35, cy + R * .3 + fl); ctx.quadraticCurveTo(cx, cy + R * .55 + fl, cx - R * .35, cy + R * .3 + fl); ctx.quadraticCurveTo(cx - R * .55, cy - R * .2 + fl, cx, cy - R * .9 + fl); ctx.fill();
    ctx.fillStyle = '#1a3a6a'; [-1, 1].forEach(k => { ctx.beginPath(); ctx.ellipse(cx + k * R * .13, cy - R * .05 + fl, R * .06, R * .09, 0, 0, 7); ctx.fill(); });
    ctx.save(); ctx.translate(cx + R * .45, cy + R * .3 + fl); ctx.rotate(.5); ctx.fillStyle = '#f0f0f0'; rr(ctx, -R * .05, -R * .45, R * .1, R * .5, R * .05); ctx.fill(); ctx.fillStyle = '#e02020'; ctx.fillRect(-R * .02, -R * .2, R * .04, R * .25); ctx.beginPath(); ctx.arc(0, R * .07, R * .07, 0, 7); ctx.fill(); ctx.restore();
  },
  // ジネンモエ・ボロ：油のしみたぼろ布のかたまり（うっすら煙）
  jinenmoe(ctx, cx, cy, R, t) {
    ctx.fillStyle = '#8a7a5a'; const rag = (x, y, w, h, a, c) => { ctx.save(); ctx.translate(cx + x * R, cy + y * R); ctx.rotate(a); ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(-w * R / 2, -h * R / 2); for (let i = 0; i <= 6; i++) ctx.lineTo(-w * R / 2 + i * w * R / 6, h * R / 2 + (i % 2 ? R * .05 : 0)); ctx.lineTo(w * R / 2, -h * R / 2); ctx.fill(); ctx.restore(); };
    rag(0, .5, 1.3, .4, 0, '#a8946a'); rag(-.1, .2, 1.1, .4, .1, '#c8b080'); rag(.1, -.1, .95, .4, -.15, '#9a845a'); rag(0, -.38, .75, .35, .08, '#b8a070');
    ctx.fillStyle = 'rgba(90,60,20,.45)'; [[-.3, .3], [.25, 0], [-.1, -.35], [.3, .45]].forEach(([x, y]) => { ctx.beginPath(); ctx.ellipse(cx + x * R, cy + y * R, R * .12, R * .07, 0, 0, 7); ctx.fill(); });
    eyes(ctx, cx, cy - R * .1, R * .16, R * .07);
    ctx.fillStyle = 'rgba(200,200,200,.5)'; for (let i = 0; i < 3; i++) { const p = ((t / 3 + i * 20) % 60) / 60; ctx.beginPath(); ctx.arc(cx + (i - 1) * R * .3 + Math.sin(p * 6) * R * .05, cy - R * .6 - p * R * .5, R * (.06 + p * .08), 0, 7); ctx.fill(); }
    if (Math.floor(t / 20) % 3 === 0) { ctx.fillStyle = '#ff8a2a'; ctx.beginPath(); ctx.ellipse(cx + R * .3, cy - R * .5, R * .05, R * .09, 0, 0, 7); ctx.fill(); }
  },
  // モエサカル王：炎のマントの王
  moesakaru(ctx, cx, cy, R, t) {
    const fl = t / 5;
    ctx.fillStyle = '#c8301a'; ctx.beginPath(); ctx.moveTo(cx - R * .5, cy - R * .4); for (let i = 0; i <= 8; i++) ctx.lineTo(cx - R * .9 + i * R * .225, cy + R * (.9 + (i % 2 ? .1 * Math.sin(fl + i) : -.05))); ctx.lineTo(cx + R * .5, cy - R * .4); ctx.fill();
    ctx.fillStyle = '#ff8a1a'; for (let i = 0; i < 6; i++) { const x = cx - R * .8 + i * R * .32, h = R * (.25 + .1 * Math.sin(fl + i * 1.3)); ctx.beginPath(); ctx.moveTo(x - R * .1, cy + R * .9); ctx.quadraticCurveTo(x, cy + R * .9 - h * 2, x + R * .1, cy + R * .9); ctx.fill(); }
    ctx.fillStyle = lin(ctx, cx - R * .4, 0, cx + R * .4, 0, ['#5a1a10', '#8a2a1a']); rr(ctx, cx - R * .38, cy - R * .45, R * .76, R * 1.2, R * .12); ctx.fill();
    ctx.fillStyle = '#f0c030'; ctx.fillRect(cx - R * .38, cy - R * .05, R * .76, R * .07);
    ctx.fillStyle = '#e8a878'; ctx.beginPath(); ctx.arc(cx, cy - R * .68, R * .25, 0, 7); ctx.fill();
    ctx.fillStyle = '#ff5a1a'; ctx.beginPath(); ctx.moveTo(cx - R * .25, cy - R * .78); ctx.quadraticCurveTo(cx - R * .35, cy - R * .4, cx - R * .15, cy - R * .5); ctx.lineTo(cx + R * .15, cy - R * .5); ctx.quadraticCurveTo(cx + R * .35, cy - R * .4, cx + R * .25, cy - R * .78); ctx.fill();
    ctx.fillStyle = '#2a1a1a'; [-1, 1].forEach(k => { ctx.beginPath(); ctx.arc(cx + k * R * .1, cy - R * .72, R * .035, 0, 7); ctx.fill(); });
    ctx.fillStyle = '#f0c030'; ctx.beginPath(); ctx.moveTo(cx - R * .28, cy - R * .88); for (let i = 0; i < 5; i++) ctx.lineTo(cx - R * .28 + i * R * .14, cy - R * (1.18 - (i % 2) * .15)); ctx.lineTo(cx + R * .28, cy - R * .88); ctx.fill();
    ctx.fillStyle = Math.floor(t / 6) % 2 ? '#ff3a1a' : '#ffd02a'; ctx.beginPath(); ctx.arc(cx, cy - R * 1.0, R * .06, 0, 7); ctx.fill();
  },
  // キエヌ・トーチ：消えない松明
  kienu(ctx, cx, cy, R, t) {
    ctx.fillStyle = lin(ctx, cx - R * .1, 0, cx + R * .1, 0, ['#8a5a2a', '#5a3a1a']); ctx.fillRect(cx - R * .1, cy - R * .2, R * .2, R * 1.1);
    ctx.fillStyle = '#3a2a1a'; ctx.fillRect(cx - R * .16, cy - R * .25, R * .32, R * .14);
    for (let i = 0; i < 3; i++) { const h = R * (.6 + .12 * Math.sin(t / 4 + i * 2)); const c = ['#ff4a1a', '#ff9a2a', '#ffe06a'][i]; const w = R * (.38 - i * .1); ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(cx - w, cy - R * .25); ctx.quadraticCurveTo(cx - w * .8, cy - R * .25 - h * .6, cx + Math.sin(t / 6) * R * .06, cy - R * .25 - h); ctx.quadraticCurveTo(cx + w * .8, cy - R * .25 - h * .6, cx + w, cy - R * .25); ctx.fill(); }
    eyes(ctx, cx, cy - R * .5, R * .13, R * .06);
    ctx.strokeStyle = '#5a3a1a'; ctx.lineWidth = R * .07; ctx.lineCap = 'round'; [-1, 1].forEach(k => { ctx.beginPath(); ctx.moveTo(cx, cy + R * .2); ctx.lineTo(cx + k * R * .4, cy + R * .05 + Math.sin(t / 8 + k) * R * .05); ctx.stroke(); }); ctx.lineCap = 'butt';
  },
  // マチガイ・ショウカキ：中身とラベルがちぐはぐな消火器
  machigai(ctx, cx, cy, R, t) {
    ctx.fillStyle = lin(ctx, cx - R * .3, 0, cx + R * .3, 0, ['#f04a3a', '#a02018']); rr(ctx, cx - R * .3, cy - R * .5, R * .6, R * 1.3, R * .18); ctx.fill();
    ctx.fillStyle = '#222'; ctx.fillRect(cx - R * .12, cy - R * .72, R * .24, R * .24); ctx.fillStyle = '#ddd'; ctx.fillRect(cx - R * .25, cy - R * .78, R * .5, R * .07);
    ctx.fillStyle = '#fffbea'; ctx.fillRect(cx - R * .22, cy - R * .1, R * .44, R * .4); ctx.fillStyle = '#c02020'; ctx.font = `bold ${R * .14}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('みず？', cx, cy + R * .1);
    eyes(ctx, cx, cy - R * .3, R * .12, R * .06);
    ctx.strokeStyle = '#222'; ctx.lineWidth = R * .07; ctx.beginPath(); ctx.moveTo(cx + R * .1, cy - R * .6); ctx.quadraticCurveTo(cx + R * .7, cy - R * .6, cx + R * .6, cy + R * .1); ctx.stroke();
    ctx.fillStyle = '#5ac8ff'; for (let i = 0; i < 3; i++) { const p = ((t / 2 + i * 10) % 30) / 30; ctx.beginPath(); ctx.ellipse(cx + R * .6, cy + R * (.15 + p * .6), R * .04, R * .07, 0, 0, 7); ctx.fill(); }
  },
  // エービーシー・スライム：A・B・Cのマークを貼り替えるスライム
  abckonran(ctx, cx, cy, R, t) {
    ctx.fillStyle = lin(ctx, 0, cy - R * .6, 0, cy + R * .7, ['#c8e8ff', '#6aa8e0']); ctx.beginPath(); ctx.moveTo(cx - R * .7, cy + R * .7); ctx.quadraticCurveTo(cx - R * .75, cy - R * .4, cx, cy - R * .65); ctx.quadraticCurveTo(cx + R * .75, cy - R * .4, cx + R * .7, cy + R * .7); ctx.closePath(); ctx.fill();
    eyes(ctx, cx, cy - R * .2, R * .2, R * .09);
    const k = Math.floor(t / 25) % 3, marks = [['#fff', '#222', 'A'], ['#f0d020', '#222', 'B'], ['#3a7ad8', '#fff', 'C']];
    [[-.4, .3], [0, .45], [.4, .3]].forEach(([x, y], i) => { const [bg, fg, l] = marks[(i + k) % 3]; ctx.fillStyle = bg; ctx.beginPath(); ctx.arc(cx + x * R, cy + y * R, R * .15, 0, 7); ctx.fill(); ctx.strokeStyle = '#333'; ctx.lineWidth = R * .02; ctx.stroke(); ctx.fillStyle = fg; ctx.font = `bold ${R * .17}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(l, cx + x * R, cy + y * R); });
  },
  // セイデンキ・ネコ：毛が逆立ち、火花を散らすネコ
  seidenki(ctx, cx, cy, R, t) {
    ctx.fillStyle = '#e8e0d0'; ctx.beginPath(); for (let i = 0; i < 24; i++) { const a = i / 24 * Math.PI * 2, r = R * (i % 2 ? .55 : .7); ctx.lineTo(cx + Math.cos(a) * r, cy + R * .2 + Math.sin(a) * r * .8); } ctx.fill();
    ctx.beginPath(); for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2, r = R * (i % 2 ? .3 : .38); ctx.lineTo(cx + Math.cos(a) * r, cy - R * .4 + Math.sin(a) * r); } ctx.fill();
    ctx.beginPath(); ctx.moveTo(cx - R * .32, cy - R * .5); ctx.lineTo(cx - R * .25, cy - R * .85); ctx.lineTo(cx - R * .1, cy - R * .62); ctx.moveTo(cx + R * .32, cy - R * .5); ctx.lineTo(cx + R * .25, cy - R * .85); ctx.lineTo(cx + R * .1, cy - R * .62); ctx.fill();
    ctx.fillStyle = '#3ac83a'; [-1, 1].forEach(k => { ctx.beginPath(); ctx.ellipse(cx + k * R * .13, cy - R * .42, R * .06, R * .08, 0, 0, 7); ctx.fill(); }); ctx.fillStyle = '#111'; [-1, 1].forEach(k => ctx.fillRect(cx + k * R * .13 - R * .012, cy - R * .48, R * .024, R * .12));
    ctx.fillStyle = '#e88a9a'; ctx.beginPath(); ctx.moveTo(cx - R * .04, cy - R * .32); ctx.lineTo(cx + R * .04, cy - R * .32); ctx.lineTo(cx, cy - R * .27); ctx.fill();
    ctx.strokeStyle = '#7ad8ff'; ctx.lineWidth = R * .035; for (let i = 0; i < 4; i++) { if ((Math.floor(t / 4) + i) % 3) continue; const a = i * 1.6 + t / 20, x = cx + Math.cos(a) * R * .8, y = cy + Math.sin(a) * R * .6; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + R * .08, y + R * .08); ctx.lineTo(x - R * .02, y + R * .12); ctx.lineTo(x + R * .1, y + R * .22); ctx.stroke(); }
  },
  // ミズブッカケ大将：何にでも水をかけるバケツの大将
  mizubukkake(ctx, cx, cy, R, t) {
    const sw = Math.sin(t / 14) * .1;
    ctx.fillStyle = lin(ctx, cx - R * .4, 0, cx + R * .4, 0, ['#3a5a8a', '#1a3a6a']); rr(ctx, cx - R * .4, cy - R * .3, R * .8, R * 1.1, R * .15); ctx.fill();
    ctx.fillStyle = '#f0c030'; ctx.fillRect(cx - R * .4, cy + R * .15, R * .8, R * .07);
    ctx.fillStyle = '#e8b888'; ctx.beginPath(); ctx.arc(cx, cy - R * .5, R * .25, 0, 7); ctx.fill();
    ctx.fillStyle = '#2a2a2a'; ctx.fillRect(cx - R * .3, cy - R * .78, R * .6, R * .1); ctx.fillRect(cx - R * .2, cy - R * .92, R * .4, R * .16);
    eyes(ctx, cx, cy - R * .5, R * .1, R * .05); ctx.strokeStyle = '#3a1a0a'; ctx.lineWidth = R * .04; ctx.beginPath(); ctx.moveTo(cx - R * .12, cy - R * .35); ctx.lineTo(cx + R * .12, cy - R * .35); ctx.stroke();
    ctx.save(); ctx.translate(cx + R * .6, cy - R * .55); ctx.rotate(.6 + sw); ctx.fillStyle = '#8a9aaa'; ctx.beginPath(); ctx.moveTo(-R * .25, -R * .2); ctx.lineTo(R * .25, -R * .2); ctx.lineTo(R * .18, R * .2); ctx.lineTo(-R * .18, R * .2); ctx.fill(); ctx.fillStyle = '#5ac8ff'; ctx.fillRect(-R * .22, -R * .22, R * .44, R * .06); ctx.restore();
    ctx.fillStyle = 'rgba(90,200,255,.8)'; for (let i = 0; i < 5; i++) { const p = ((t / 2 + i * 7) % 35) / 35; ctx.beginPath(); ctx.ellipse(cx + R * (.75 + p * .15), cy - R * .4 + p * R * 1.2, R * .05, R * .08, 0, 0, 7); ctx.fill(); }
    ctx.fillStyle = '#1a2a4a'; [-1, 1].forEach(k => ctx.fillRect(cx + k * R * .2 - R * .1, cy + R * .78, R * .2, R * .15));
  },
  // ミツガワリ・スライム：頭は氷、体は水、背中から湯気
  mitsugawari(ctx, cx, cy, R, t) {
    ctx.fillStyle = lin(ctx, 0, cy - R * .3, 0, cy + R * .8, ['#7ac8f8', '#2a78c8']); ctx.beginPath(); ctx.moveTo(cx - R * .75, cy + R * .8); ctx.quadraticCurveTo(cx - R * .8, cy - R * .15, cx, cy - R * .25); ctx.quadraticCurveTo(cx + R * .8, cy - R * .15, cx + R * .75, cy + R * .8); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.beginPath(); ctx.ellipse(cx - R * .35, cy + R * .1, R * .12, R * .2, -.4, 0, 7); ctx.fill();
    ctx.fillStyle = '#e8f8ff'; ctx.strokeStyle = '#9ad0f0'; ctx.lineWidth = R * .03; [[-.3, -.4, .28], [.05, -.55, .32], [.35, -.38, .26]].forEach(([x, y, w]) => { ctx.beginPath(); ctx.moveTo(cx + x * R - w * R / 2, cy + y * R + w * R / 2); ctx.lineTo(cx + x * R, cy + y * R - w * R / 2); ctx.lineTo(cx + x * R + w * R / 2, cy + y * R + w * R / 2); ctx.closePath(); ctx.fill(); ctx.stroke(); });
    eyes(ctx, cx, cy + R * .25, R * .2, R * .08);
    ctx.fillStyle = 'rgba(230,230,230,.6)'; for (let i = 0; i < 4; i++) { const p = ((t / 2.5 + i * 15) % 60) / 60; ctx.beginPath(); ctx.arc(cx + (i - 1.5) * R * .3 + Math.sin(p * 7 + i) * R * .08, cy - R * .7 - p * R * .5, R * (.07 + p * .1), 0, 7); ctx.fill(); }
  },
  // ウキシズミ・ガメ：甲羅に「1」と書かれた、浮いたり沈んだりするカメ
  ukishizumi(ctx, cx, cy, R, t) {
    const b = Math.sin(t / 15) * R * .18;
    ctx.fillStyle = lin(ctx, 0, cy + R * .1, 0, cy + R * .9, ['#4a9ae0', '#1a4a9a']); ctx.beginPath(); ctx.ellipse(cx, cy + R * .45, R * .95, R * .42, 0, 0, 7); ctx.fill(); ctx.strokeStyle = '#bfe4ff'; ctx.lineWidth = R * .03; ctx.beginPath(); ctx.ellipse(cx, cy + R * .1, R * .75, R * .06, 0, 0, 7); ctx.stroke();
    ctx.fillStyle = '#6a9a4a'; [-1, 1].forEach(k => { ctx.beginPath(); ctx.ellipse(cx + k * R * .5, cy + R * .2 + b, R * .14, R * .08, k * .4, 0, 7); ctx.fill(); });
    ctx.beginPath(); ctx.ellipse(cx + R * .7, cy - R * .05 + b, R * .18, R * .14, 0, 0, 7); ctx.fill(); ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(cx + R * .76, cy - R * .1 + b, R * .03, 0, 7); ctx.fill();
    ctx.fillStyle = lin(ctx, 0, cy - R * .4 + b, 0, cy + R * .2 + b, ['#8ab85a', '#4a7a2a']); ctx.beginPath(); ctx.ellipse(cx, cy + b, R * .55, R * .35, 0, Math.PI, 0); ctx.fill(); ctx.fillRect(cx - R * .55, cy + b - R * .01, R * 1.1, R * .08);
    ctx.fillStyle = '#fffbe0'; ctx.beginPath(); ctx.arc(cx, cy - R * .15 + b, R * .15, 0, 7); ctx.fill(); ctx.fillStyle = '#2a4a1a'; ctx.font = `bold ${R * .2}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('1', cx, cy - R * .14 + b);
    ctx.fillStyle = '#ffb020'; ctx.beginPath(); ctx.arc(cx - R * .55, cy + R * .5, R * .07, 0, 7); ctx.fill(); ctx.fillStyle = '#8a4a2a'; ctx.beginPath(); ctx.arc(cx + R * .45, cy + R * .78, R * .07, 0, 7); ctx.fill();
  },
  // ネツクイ・ナベ：ふたを鳴らし、かまどの熱を食べる大なべ
  netsukui(ctx, cx, cy, R, t) {
    const j = Math.floor(t / 4) % 2 ? R * .04 : 0;
    ctx.fillStyle = '#5a4a3a'; ctx.fillRect(cx - R * .7, cy + R * .6, R * 1.4, R * .3);
    for (let i = 0; i < 4; i++) { const h = R * (.2 + .06 * Math.sin(t / 4 + i)); ctx.fillStyle = i % 2 ? '#ffb030' : '#ff5a1a'; ctx.beginPath(); ctx.moveTo(cx - R * .45 + i * R * .3 - R * .1, cy + R * .62); ctx.quadraticCurveTo(cx - R * .45 + i * R * .3, cy + R * .62 - h * 2, cx - R * .45 + i * R * .3 + R * .1, cy + R * .62); ctx.fill(); }
    ctx.fillStyle = lin(ctx, cx - R * .6, 0, cx + R * .6, 0, ['#5a5a6a', '#2a2a34']); ctx.beginPath(); ctx.moveTo(cx - R * .62, cy - R * .2); ctx.lineTo(cx + R * .62, cy - R * .2); ctx.quadraticCurveTo(cx + R * .6, cy + R * .55, cx, cy + R * .55); ctx.quadraticCurveTo(cx - R * .6, cy + R * .55, cx - R * .62, cy - R * .2); ctx.fill();
    ctx.fillStyle = '#3a3a44'; [-1, 1].forEach(k => ctx.fillRect(cx + k * R * .66 - R * .08, cy - R * .12, R * .16, R * .08));
    ctx.fillStyle = '#6a6a7a'; ctx.beginPath(); ctx.ellipse(cx, cy - R * .25 - j, R * .62, R * .1, 0, 0, 7); ctx.fill(); ctx.fillStyle = '#2a2a34'; ctx.fillRect(cx - R * .08, cy - R * .4 - j, R * .16, R * .12);
    ctx.fillStyle = '#ffe04a'; [-1, 1].forEach(k => { ctx.beginPath(); ctx.arc(cx + k * R * .2, cy + R * .1, R * .07, 0, 7); ctx.fill(); }); ctx.fillStyle = '#c02010'; ctx.beginPath(); ctx.ellipse(cx, cy + R * .32, R * .18, R * .07, 0, 0, Math.PI); ctx.fill();
    ctx.fillStyle = 'rgba(240,240,240,.6)'; for (let i = 0; i < 3; i++) { const p = ((t / 2 + i * 12) % 36) / 36; ctx.beginPath(); ctx.arc(cx + (i - 1) * R * .4, cy - R * .45 - p * R * .5, R * (.06 + p * .09), 0, 7); ctx.fill(); }
  },
  // フクラミ・ドラム：温まってぱんぱんにふくらんだドラム缶
  fukurami(ctx, cx, cy, R, t) {
    const sw = 1 + Math.sin(t / 10) * .06;
    ctx.save(); ctx.translate(cx, cy + R * .1); ctx.scale(sw, 1);
    ctx.fillStyle = lin(ctx, -R * .6, 0, R * .6, 0, ['#e85a3a', '#8a2a1a']); ctx.beginPath(); ctx.moveTo(-R * .45, -R * .75); ctx.quadraticCurveTo(-R * .8, 0, -R * .45, R * .75); ctx.lineTo(R * .45, R * .75); ctx.quadraticCurveTo(R * .8, 0, R * .45, -R * .75); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#5a1a10'; ctx.lineWidth = R * .05; [-.3, .3].forEach(y => { ctx.beginPath(); ctx.moveTo(-R * .62, y * R); ctx.quadraticCurveTo(0, y * R + R * .05, R * .62, y * R); ctx.stroke(); });
    ctx.restore();
    ctx.fillStyle = '#c8c8c8'; ctx.beginPath(); ctx.ellipse(cx, cy - R * .65, R * .45, R * .08, 0, 0, 7); ctx.fill(); ctx.fillStyle = '#333'; ctx.beginPath(); ctx.arc(cx + R * .22, cy - R * .66, R * .06, 0, 7); ctx.fill();
    ctx.fillStyle = '#d8a030'; for (let i = 0; i < 3; i++) { const p = ((t / 2 + i * 9) % 27) / 27; ctx.beginPath(); ctx.ellipse(cx + R * (.25 + p * .2), cy - R * .66 + p * R * .9, R * .04, R * .07, 0, 0, 7); ctx.fill(); }
    eyes(ctx, cx, cy + R * .05, R * .17, R * .08); ctx.strokeStyle = '#3a0a0a'; ctx.lineWidth = R * .04; ctx.beginPath(); ctx.arc(cx, cy + R * .3, R * .12, 3.4, 6); ctx.stroke();
    ctx.strokeStyle = '#ff8a3a'; ctx.lineWidth = R * .03; [-1, 1].forEach(k => { for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(cx + k * R * (.75 + i * .07), cy - R * .2 + i * R * .2); ctx.lineTo(cx + k * R * (.88 + i * .07), cy - R * .2 + i * R * .2); ctx.stroke(); } });
  },
  // フットウ大魔人：体じゅうが煮えたぎる大魔人
  futtou(ctx, cx, cy, R, t) {
    ctx.fillStyle = lin(ctx, 0, cy - R * .6, 0, cy + R * .9, ['#ff7a2a', '#a82a10']); ctx.beginPath(); ctx.moveTo(cx - R * .75, cy + R * .9); ctx.quadraticCurveTo(cx - R * .85, cy - R * .2, cx - R * .45, cy - R * .5); ctx.quadraticCurveTo(cx, cy - R * .8, cx + R * .45, cy - R * .5); ctx.quadraticCurveTo(cx + R * .85, cy - R * .2, cx + R * .75, cy + R * .9); ctx.closePath(); ctx.fill();
    for (let i = 0; i < 9; i++) { const p = ((t / 3 + i * 11) % 40) / 40, x = cx + Math.sin(i * 2.3) * R * .55, y = cy + R * .8 - p * R * 1.2; ctx.fillStyle = `rgba(255,220,140,${.8 - p * .6})`; ctx.beginPath(); ctx.arc(x, y, R * (.04 + .05 * (i % 3) / 2), 0, 7); ctx.fill(); }
    ctx.fillStyle = '#3a0a0a'; [-1, 1].forEach(k => { ctx.beginPath(); ctx.moveTo(cx + k * R * .32, cy - R * .25); ctx.lineTo(cx + k * R * .1, cy - R * .18); ctx.lineTo(cx + k * R * .28, cy - R * .1); ctx.fill(); });
    ctx.fillStyle = '#ffe04a'; [-1, 1].forEach(k => { ctx.beginPath(); ctx.arc(cx + k * R * .22, cy - R * .12, R * .05, 0, 7); ctx.fill(); });
    ctx.fillStyle = '#3a0a0a'; ctx.beginPath(); ctx.ellipse(cx, cy + R * .15, R * .25, R * .12, 0, 0, 7); ctx.fill(); ctx.fillStyle = '#fff'; for (let i = 0; i < 4; i++) ctx.fillRect(cx - R * .18 + i * R * .1, cy + R * .05, R * .06, R * .06);
    ctx.fillStyle = '#c8301a'; [-1, 1].forEach(k => { ctx.beginPath(); ctx.moveTo(cx + k * R * .35, cy - R * .55); ctx.lineTo(cx + k * R * .5, cy - R * .95); ctx.lineTo(cx + k * R * .2, cy - R * .62); ctx.fill(); });
    ctx.fillStyle = 'rgba(235,235,235,.55)'; for (let i = 0; i < 4; i++) { const p = ((t / 2 + i * 10) % 40) / 40; ctx.beginPath(); ctx.arc(cx + (i - 1.5) * R * .25 + Math.sin(p * 5) * R * .1, cy - R * .8 - p * R * .45, R * (.08 + p * .12), 0, 7); ctx.fill(); }
  },
  // ゴチャマゼ・ツボ：いろいろな液や粉がまざったツボ
  gochamaze(ctx, cx, cy, R, t) {
    ctx.fillStyle = lin(ctx, cx - R * .6, 0, cx + R * .6, 0, ['#c88a4a', '#7a4a1a']); ctx.beginPath(); ctx.moveTo(cx - R * .3, cy - R * .55); ctx.quadraticCurveTo(cx - R * .85, cy - R * .1, cx - R * .5, cy + R * .8); ctx.lineTo(cx + R * .5, cy + R * .8); ctx.quadraticCurveTo(cx + R * .85, cy - R * .1, cx + R * .3, cy - R * .55); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#5a3a1a'; ctx.beginPath(); ctx.ellipse(cx, cy - R * .55, R * .34, R * .09, 0, 0, 7); ctx.fill();
    const cols = ['#e84a8a', '#4ac8e8', '#f0d020', '#6ad04a'];
    for (let i = 0; i < 4; i++) { const a = t / 10 + i * 1.57; ctx.fillStyle = cols[i]; ctx.beginPath(); ctx.arc(cx + Math.cos(a) * R * .16, cy - R * .6 + Math.sin(a) * R * .04 - R * .05, R * .09, 0, 7); ctx.fill(); }
    for (let i = 0; i < 5; i++) { const p = ((t / 2 + i * 9) % 45) / 45; ctx.fillStyle = cols[i % 4]; ctx.globalAlpha = 1 - p; ctx.beginPath(); ctx.arc(cx + Math.sin(i * 2.1 + p * 4) * R * .25, cy - R * .7 - p * R * .5, R * .05, 0, 7); ctx.fill(); } ctx.globalAlpha = 1;
    eyes(ctx, cx, cy + R * .05, R * .18, R * .08); ctx.strokeStyle = '#3a1a0a'; ctx.lineWidth = R * .04; ctx.beginPath(); ctx.moveTo(cx - R * .15, cy + R * .35); for (let i = 1; i <= 6; i++) ctx.lineTo(cx - R * .15 + i * R * .05, cy + R * (.35 + (i % 2 ? .04 : 0))); ctx.stroke();
  },
  // カズアワズ・ハカセ：左右の数が合わない式を書く博士
  kazuawazu(ctx, cx, cy, R, t) {
    ctx.fillStyle = '#2a4a3a'; ctx.fillRect(cx - R * .95, cy - R * .95, R * 1.0, R * .6); ctx.strokeStyle = '#8a6a3a'; ctx.lineWidth = R * .04; ctx.strokeRect(cx - R * .95, cy - R * .95, R * 1.0, R * .6);
    ctx.fillStyle = '#f0f0e0'; ctx.font = `bold ${R * .14}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('H₂+O₂', cx - R * .45, cy - R * .78); ctx.fillText('→H₂O ?', cx - R * .45, cy - R * .55);
    ctx.fillStyle = '#f4f4f4'; rr(ctx, cx - R * .1, cy - R * .2, R * .7, R * 1.05, R * .15); ctx.fill(); ctx.strokeStyle = '#bbb'; ctx.lineWidth = R * .02; ctx.stroke();
    ctx.fillStyle = '#e8c098'; ctx.beginPath(); ctx.arc(cx + R * .25, cy - R * .42, R * .24, 0, 7); ctx.fill();
    ctx.fillStyle = '#e8e8e8'; [-1, 1].forEach(k => { ctx.beginPath(); ctx.arc(cx + R * .25 + k * R * .22, cy - R * .5, R * .11, 0, 7); ctx.fill(); });
    ctx.strokeStyle = '#333'; ctx.lineWidth = R * .03; [-1, 1].forEach(k => { ctx.beginPath(); ctx.arc(cx + R * .25 + k * R * .09, cy - R * .45, R * .07, 0, 7); ctx.stroke(); }); ctx.beginPath(); ctx.moveTo(cx + R * .23, cy - R * .45); ctx.lineTo(cx + R * .27, cy - R * .45); ctx.stroke();
    ctx.fillStyle = '#333'; [-1, 1].forEach(k => { ctx.beginPath(); ctx.arc(cx + R * .25 + k * R * .09, cy - R * .45, R * .025, 0, 7); ctx.fill(); });
    ctx.strokeStyle = '#e8c098'; ctx.lineWidth = R * .08; ctx.lineCap = 'round'; const sw = Math.sin(t / 6) * R * .08; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx - R * .35, cy - R * .3 + sw); ctx.stroke(); ctx.lineCap = 'butt';
    ctx.fillStyle = '#fff'; ctx.fillRect(cx - R * .42, cy - R * .36 + sw, R * .06, R * .1);
  },
  // サビツキ・ナイト：全身さびついた騎士
  sabitsuki(ctx, cx, cy, R, t) {
    const rust = (x, y, w, h) => { ctx.fillStyle = 'rgba(160,70,20,.75)'; ctx.beginPath(); ctx.ellipse(cx + x * R, cy + y * R, w * R, h * R, 0, 0, 7); ctx.fill(); };
    ctx.fillStyle = lin(ctx, cx - R * .4, 0, cx + R * .4, 0, ['#9a8a7a', '#5a4a3a']); rr(ctx, cx - R * .38, cy - R * .3, R * .76, R * .8, R * .1); ctx.fill();
    ctx.fillRect(cx - R * .3, cy + R * .5, R * .22, R * .4); ctx.fillRect(cx + R * .08, cy + R * .5, R * .22, R * .4);
    ctx.beginPath(); ctx.arc(cx, cy - R * .5, R * .28, Math.PI, 0); ctx.lineTo(cx + R * .28, cy - R * .3); ctx.lineTo(cx - R * .28, cy - R * .3); ctx.fill();
    ctx.fillStyle = '#1a1a1a'; ctx.fillRect(cx - R * .2, cy - R * .5, R * .4, R * .06); ctx.fillStyle = '#ff6a2a'; [-1, 1].forEach(k => { ctx.beginPath(); ctx.arc(cx + k * R * .09, cy - R * .47, R * .025, 0, 7); ctx.fill(); });
    rust(-.15, -.1, .12, .08); rust(.2, .2, .1, .12); rust(-.2, .65, .07, .1); rust(.15, -.6, .08, .05); rust(.2, .75, .06, .08);
    ctx.save(); ctx.translate(cx + R * .55, cy); ctx.rotate(-.5 + Math.sin(t / 12) * .1); ctx.fillStyle = '#8a5a3a'; ctx.fillRect(-R * .04, -R * .8, R * .08, R * .75); ctx.fillStyle = 'rgba(170,80,20,.8)'; for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.arc((i % 2 ? 1 : -1) * R * .03, -R * (.2 + i * .15), R * .04, 0, 7); ctx.fill(); } ctx.fillStyle = '#4a3a2a'; ctx.fillRect(-R * .12, -R * .07, R * .24, R * .06); ctx.restore();
    ctx.fillStyle = '#a04a1a'; for (let i = 0; i < 3; i++) { const p = ((t / 3 + i * 12) % 36) / 36; ctx.fillRect(cx - R * .2 + i * R * .2, cy + R * .4 + p * R * .5, R * .03, R * .03); }
  },
  // スッパニガ・ゼリー：半分すっぱい（黄）、半分にがい（青）のゼリー
  suppaniga(ctx, cx, cy, R, t) {
    const w = Math.sin(t / 8) * R * .03;
    ctx.save(); ctx.beginPath(); ctx.moveTo(cx - R * .7, cy + R * .75); ctx.quadraticCurveTo(cx - R * .8 - w, cy - R * .3, cx, cy - R * .6); ctx.quadraticCurveTo(cx + R * .8 + w, cy - R * .3, cx + R * .7, cy + R * .75); ctx.closePath(); ctx.clip();
    ctx.fillStyle = '#f0d83a'; ctx.fillRect(cx - R, cy - R, R, R * 2); ctx.fillStyle = '#4a7ad8'; ctx.fillRect(cx, cy - R, R, R * 2);
    ctx.fillStyle = 'rgba(255,255,255,.3)'; ctx.beginPath(); ctx.ellipse(cx - R * .35, cy - R * .2, R * .1, R * .2, -.3, 0, 7); ctx.fill(); ctx.restore();
    ctx.fillStyle = '#fff'; ctx.font = `bold ${R * .13}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('pH3', cx - R * .35, cy + R * .45); ctx.fillText('pH11', cx + R * .35, cy + R * .45);
    ctx.fillStyle = '#222'; ctx.beginPath(); ctx.moveTo(cx - R * .32, cy - R * .12); ctx.lineTo(cx - R * .12, cy - R * .05); ctx.lineTo(cx - R * .32, cy + R * .02); ctx.fill();
    ctx.beginPath(); ctx.ellipse(cx + R * .22, cy - R * .05, R * .07, R * .05, 0, 0, 7); ctx.fill();
    ctx.strokeStyle = '#222'; ctx.lineWidth = R * .04; ctx.beginPath(); ctx.moveTo(cx - R * .15, cy + R * .2); ctx.quadraticCurveTo(cx - R * .05, cy + R * .1, cx, cy + R * .2); ctx.quadraticCurveTo(cx + R * .08, cy + R * .3, cx + R * .15, cy + R * .2); ctx.stroke();
  },
  // タンソクサリ大王：炭素の玉の鎖を巻きつけた大王
  tansokusari(ctx, cx, cy, R, t) {
    ctx.fillStyle = lin(ctx, cx - R * .5, 0, cx + R * .5, 0, ['#4a4a5a', '#1a1a24']); rr(ctx, cx - R * .45, cy - R * .4, R * .9, R * 1.3, R * .15); ctx.fill();
    ctx.fillStyle = '#d8b8a0'; ctx.beginPath(); ctx.arc(cx, cy - R * .6, R * .26, 0, 7); ctx.fill();
    ctx.fillStyle = '#e8c030'; ctx.beginPath(); ctx.moveTo(cx - R * .28, cy - R * .78); for (let i = 0; i < 5; i++) ctx.lineTo(cx - R * .28 + i * R * .14, cy - R * (1.1 - (i % 2) * .15)); ctx.lineTo(cx + R * .28, cy - R * .78); ctx.fill();
    ctx.fillStyle = '#222'; [-1, 1].forEach(k => { ctx.beginPath(); ctx.arc(cx + k * R * .1, cy - R * .62, R * .035, 0, 7); ctx.fill(); }); ctx.fillStyle = '#5a2a1a'; ctx.fillRect(cx - R * .1, cy - R * .48, R * .2, R * .04);
    const sw = t / 15;
    for (let i = 0; i < 9; i++) { const u = i / 8, x = cx - R * .8 + u * R * 1.6, y = cy + R * (.1 + .25 * Math.sin(u * 3.14 + sw)); if (i) { ctx.strokeStyle = '#888'; ctx.lineWidth = R * .03; const pu = (i - 1) / 8; ctx.beginPath(); ctx.moveTo(cx - R * .8 + pu * R * 1.6, cy + R * (.1 + .25 * Math.sin(pu * 3.14 + sw))); ctx.lineTo(x, y); ctx.stroke(); }
      ctx.fillStyle = '#2a2a2a'; ctx.beginPath(); ctx.arc(x, y, R * .09, 0, 7); ctx.fill(); ctx.fillStyle = '#fff'; ctx.font = `bold ${R * .09}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('C', x, y); }
    ctx.fillStyle = '#1a1a24'; [-1, 1].forEach(k => ctx.fillRect(cx + k * R * .22 - R * .1, cy + R * .85, R * .2, R * .12));
  },
  // ルイチガイ・キメラ：6つの類の頭をもつ獣
  ruichigai(ctx, cx, cy, R, t) {
    ctx.fillStyle = lin(ctx, 0, cy, 0, cy + R * .9, ['#8a6a5a', '#4a3a2a']); ctx.beginPath(); ctx.ellipse(cx, cy + R * .45, R * .6, R * .38, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#3a2a1a'; [-.4, -.15, .15, .4].forEach(x => ctx.fillRect(cx + x * R - R * .06, cy + R * .7, R * .12, R * .22));
    const H = [['#f4f4f4', '1'], ['#e8c830', '2'], ['#b8c0c8', '3'], ['#e88a2a', '4'], ['#d83a5a', '5'], ['#8ad8f0', '6']];
    H.forEach(([c, n], i) => { const a = Math.PI * (1.08 + i * .168), sw = Math.sin(t / 9 + i) * R * .04; const hx = cx + Math.cos(a) * R * .72 + sw, hy = cy + R * .2 + Math.sin(a) * R * .8;
      ctx.strokeStyle = '#6a5040'; ctx.lineWidth = R * .09; ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * R * .25, cy + R * .25); ctx.lineTo(hx, hy); ctx.stroke();
      ctx.fillStyle = c; ctx.beginPath(); ctx.arc(hx, hy, R * .15, 0, 7); ctx.fill(); ctx.strokeStyle = '#333'; ctx.lineWidth = R * .02; ctx.stroke();
      ctx.fillStyle = '#222'; ctx.font = `bold ${R * .13}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(n, hx, hy + R * .01);
      ctx.fillStyle = '#c02020'; ctx.beginPath(); ctx.arc(hx - R * .06, hy - R * .08, R * .025, 0, 7); ctx.arc(hx + R * .06, hy - R * .08, R * .025, 0, 7); ctx.fill(); });
  },
  // アブラウキ・スライム：水に浮く虹色の油のスライム
  aburauki(ctx, cx, cy, R, t) {
    ctx.fillStyle = lin(ctx, 0, cy + R * .4, 0, cy + R, ['#3a7ac8', '#1a3a7a']); ctx.beginPath(); ctx.ellipse(cx, cy + R * .7, R * .95, R * .25, 0, 0, 7); ctx.fill();
    ctx.fillStyle = 'rgba(160,140,120,.35)'; for (let i = 0; i < 3; i++) { const p = ((t / 2 + i * 15) % 45) / 45; ctx.beginPath(); ctx.ellipse(cx + R * (.4 + p * .5), cy + R * .82, R * (.15 + p * .2), R * .05, 0, 0, 7); ctx.fill(); }
    const g = ctx.createLinearGradient(cx - R * .6, cy - R * .5, cx + R * .6, cy + R * .5); ['#e8a83a', '#e86a8a', '#8a6ae8', '#4ac8a8', '#e8d83a'].forEach((c, i) => g.addColorStop(i / 4, c)); ctx.fillStyle = g;
    const b = Math.sin(t / 10) * R * .04; ctx.beginPath(); ctx.moveTo(cx - R * .65, cy + R * .6 + b); ctx.quadraticCurveTo(cx - R * .7, cy - R * .4 + b, cx, cy - R * .5 + b); ctx.quadraticCurveTo(cx + R * .7, cy - R * .4 + b, cx + R * .65, cy + R * .6 + b); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.4)'; ctx.beginPath(); ctx.ellipse(cx - R * .3, cy - R * .15 + b, R * .1, R * .18, -.4, 0, 7); ctx.fill();
    eyes(ctx, cx, cy + R * .05 + b, R * .2, R * .08);
  },
  // ヒバナマキ・コゾウ：火花をまくいたずら小僧
  hibanamaki(ctx, cx, cy, R, t) {
    ctx.fillStyle = '#c8c8c8'; ctx.save(); ctx.translate(cx - R * .6, cy + R * .78); ctx.rotate(Math.sin(t / 6) * .3); rr(ctx, -R * .12, -R * .16, R * .24, R * .32, R * .03); ctx.fill(); ctx.fillStyle = '#d83a2a'; ctx.fillRect(-R * .12, -R * .04, R * .24, R * .08); ctx.restore();
    ctx.fillStyle = '#e8702a'; rr(ctx, cx - R * .3, cy - R * .15, R * .6, R * .7, R * .12); ctx.fill(); ctx.fillStyle = '#3a4a8a'; ctx.fillRect(cx - R * .3, cy + R * .4, R * .6, R * .25); ctx.fillStyle = '#2a2a2a'; [-1, 1].forEach(k => ctx.fillRect(cx + k * R * .15 - R * .08, cy + R * .65, R * .16, R * .22));
    ctx.fillStyle = '#f0c49a'; ctx.beginPath(); ctx.arc(cx, cy - R * .4, R * .27, 0, 7); ctx.fill();
    ctx.fillStyle = '#c03a1a'; ctx.beginPath(); for (let i = 0; i < 7; i++) ctx.lineTo(cx - R * .3 + i * R * .1, cy - R * (.6 + (i % 2 ? .18 : 0))); ctx.lineTo(cx + R * .3, cy - R * .5); ctx.lineTo(cx - R * .3, cy - R * .5); ctx.fill();
    ctx.fillStyle = '#222'; [-1, 1].forEach(k => { ctx.beginPath(); ctx.arc(cx + k * R * .1, cy - R * .4, R * .035, 0, 7); ctx.fill(); }); ctx.strokeStyle = '#3a1a0a'; ctx.lineWidth = R * .035; ctx.beginPath(); ctx.arc(cx + R * .03, cy - R * .3, R * .09, .3, 2.6); ctx.stroke();
    for (let i = 0; i < 7; i++) { const a = t / 6 + i * .9, d = R * (.4 + ((t / 2 + i * 7) % 20) / 40); const x = cx + R * .35 + Math.cos(a) * d * .6, y = cy - R * .05 + Math.sin(a) * d * .5; ctx.fillStyle = i % 2 ? '#ffe04a' : '#ff8a2a'; ctx.beginPath(); for (let k = 0; k < 8; k++) { const rr2 = k % 2 ? R * .02 : R * .06; ctx.lineTo(x + Math.cos(k * .785) * rr2, y + Math.sin(k * .785) * rr2); } ctx.fill(); }
  },
  // アワツブシ・ガニ：消火の泡をつぶす大きなカニ
  awatsubushi(ctx, cx, cy, R, t) {
    ctx.fillStyle = 'rgba(255,255,255,.85)'; for (let i = 0; i < 9; i++) { const x = cx + Math.sin(i * 2.7) * R * .8, y = cy - R * .6 + Math.cos(i * 1.9) * R * .25, pop = (Math.floor(t / 10) + i) % 5 === 0; if (pop) continue; ctx.beginPath(); ctx.arc(x, y, R * (.06 + (i % 3) * .03), 0, 7); ctx.fill(); }
    ctx.strokeStyle = '#a82a1a'; ctx.lineWidth = R * .06; for (let k = -1; k <= 1; k += 2) for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(cx + k * R * .35, cy + R * .3 + i * R * .1); ctx.lineTo(cx + k * R * .75, cy + R * .55 + i * R * .12); ctx.lineTo(cx + k * R * .8, cy + R * .8 + i * R * .05); ctx.stroke(); }
    ctx.fillStyle = lin(ctx, 0, cy, 0, cy + R * .6, ['#e84a2a', '#a82a1a']); ctx.beginPath(); ctx.ellipse(cx, cy + R * .3, R * .55, R * .32, 0, 0, 7); ctx.fill();
    const sn = Math.abs(Math.sin(t / 5)) * .4;
    [-1, 1].forEach(k => { ctx.save(); ctx.translate(cx + k * R * .6, cy - R * .2); ctx.fillStyle = '#d83a1a'; ctx.beginPath(); ctx.ellipse(0, 0, R * .2, R * .14, 0, 0, 7); ctx.fill(); ctx.rotate(-k * sn); ctx.beginPath(); ctx.ellipse(k * R * .05, -R * .14, R * .14, R * .07, 0, 0, 7); ctx.fill(); ctx.restore();
      ctx.strokeStyle = '#a82a1a'; ctx.lineWidth = R * .07; ctx.beginPath(); ctx.moveTo(cx + k * R * .35, cy + R * .15); ctx.lineTo(cx + k * R * .55, cy - R * .1); ctx.stroke(); });
    ctx.strokeStyle = '#a82a1a'; ctx.lineWidth = R * .04; [-1, 1].forEach(k => { ctx.beginPath(); ctx.moveTo(cx + k * R * .12, cy + R * .05); ctx.lineTo(cx + k * R * .15, cy - R * .15); ctx.stroke(); ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(cx + k * R * .15, cy - R * .18, R * .05, 0, 7); ctx.fill(); });
  },
  // ダイヨンルイ将軍：「4」の紋章の鎧の将軍
  yonrui(ctx, cx, cy, R, t) {
    ctx.fillStyle = '#5a5a6a'; ctx.beginPath(); ctx.ellipse(cx - R * .55, cy - R * .1, R * .2, R * .45, 0, 0, 7); ctx.fill(); ctx.fillStyle = '#e88a2a'; ctx.fillRect(cx - R * .65, cy - R * .2, R * .2, R * .08);
    ctx.fillStyle = lin(ctx, cx - R * .4, 0, cx + R * .4, 0, ['#c88a2a', '#7a4a10']); rr(ctx, cx - R * .4, cy - R * .35, R * .8, R * .95, R * .12); ctx.fill();
    ctx.fillStyle = '#2a2a2a'; [-1, 1].forEach(k => ctx.fillRect(cx + k * R * .18 - R * .1, cy + R * .6, R * .2, R * .3));
    ctx.fillStyle = '#f0e0a0'; ctx.beginPath(); ctx.arc(cx, cy + R * .1, R * .2, 0, 7); ctx.fill(); ctx.fillStyle = '#8a2a10'; ctx.font = `bold ${R * .3}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('4', cx, cy + R * .12);
    ctx.fillStyle = '#9a6a2a'; ctx.beginPath(); ctx.arc(cx, cy - R * .58, R * .27, Math.PI, 0); ctx.lineTo(cx + R * .27, cy - R * .38); ctx.lineTo(cx - R * .27, cy - R * .38); ctx.fill();
    ctx.fillStyle = '#d83a2a'; ctx.beginPath(); ctx.moveTo(cx, cy - R * .85); ctx.quadraticCurveTo(cx + R * .25 + Math.sin(t / 8) * R * .05, cy - R * 1.1, cx + R * .4, cy - R * .95); ctx.quadraticCurveTo(cx + R * .2, cy - R * .9, cx, cy - R * .8); ctx.fill();
    ctx.fillStyle = '#111'; ctx.fillRect(cx - R * .2, cy - R * .55, R * .4, R * .08); ctx.fillStyle = '#ffd02a'; [-1, 1].forEach(k => { ctx.beginPath(); ctx.arc(cx + k * R * .09, cy - R * .51, R * .025, 0, 7); ctx.fill(); });
    ctx.save(); ctx.translate(cx + R * .55, cy); ctx.rotate(-.3 + Math.sin(t / 12) * .1); ctx.fillStyle = '#c8c8d8'; ctx.fillRect(-R * .03, -R * .8, R * .06, R * .8); ctx.fillStyle = '#7a4a10'; ctx.fillRect(-R * .1, -R * .05, R * .2, R * .06); ctx.restore();
  },
  // ── 特殊引火物（黒紫・毒の短剣・鎧の数字50）──
  tokushu(ctx, cx, cy, R, t) {
    ctx.fillStyle = 'rgba(90,40,120,.35)'; for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.arc(cx + Math.sin(t / 15 + i) * R * .6, cy + R * .7, R * (.2 + i * .03), 0, 7); ctx.fill(); }
    ctx.fillStyle = lin(ctx, 0, cy - R * .5, 0, cy + R * .9, ['#4a2a6a', '#1a0a2a']); ctx.beginPath(); ctx.moveTo(cx, cy - R * .85); ctx.lineTo(cx + R * .45, cy - R * .35); ctx.lineTo(cx + R * .5, cy + R * .85); ctx.lineTo(cx - R * .5, cy + R * .85); ctx.lineTo(cx - R * .45, cy - R * .35); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#0a0410'; ctx.beginPath(); ctx.ellipse(cx, cy - R * .4, R * .22, R * .18, 0, 0, 7); ctx.fill(); ctx.fillStyle = '#c86aff'; [-1, 1].forEach(k => { ctx.beginPath(); ctx.ellipse(cx + k * R * .09, cy - R * .42, R * .05, R * .025, 0, 0, 7); ctx.fill(); });
    ctx.fillStyle = '#6a4a8a'; rr(ctx, cx - R * .2, cy, R * .4, R * .25, R * .05); ctx.fill(); ctx.fillStyle = '#fff'; ctx.font = `bold ${R * .18}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('50', cx, cy + R * .13);
    ctx.save(); ctx.translate(cx + R * .5, cy + R * .1); ctx.rotate(.6 + Math.sin(t / 7) * .2); ctx.fillStyle = '#c8c8d8'; ctx.beginPath(); ctx.moveTo(0, -R * .4); ctx.lineTo(R * .05, -R * .05); ctx.lineTo(-R * .05, -R * .05); ctx.fill(); ctx.fillStyle = '#7ad84a'; ctx.beginPath(); ctx.arc(0, -R * .2, R * .03, 0, 7); ctx.fill(); ctx.fillStyle = '#3a1a4a'; ctx.fillRect(-R * .09, -R * .05, R * .18, R * .04); ctx.fillRect(-R * .025, -R * .01, R * .05, R * .12); ctx.restore();
  },
  ether(ctx, cx, cy, R, t) {
    for (let i = 0; i < 6; i++) { const a = t / 20 + i, d = R * (.55 + .1 * Math.sin(t / 9 + i)); ctx.strokeStyle = `rgba(180,140,220,${.25 + .1 * (i % 2)})`; ctx.lineWidth = R * .03; ctx.beginPath(); ctx.arc(cx, cy, d, a, a + 1.2); ctx.stroke(); }
    ctx.fillStyle = lin(ctx, 0, cy - R * .5, 0, cy + R * .6, ['#7a5aa8', '#3a1a5a']); ctx.beginPath(); for (let i = 0; i < 12; i++) { const a = i / 12 * 6.283, r = R * (.45 + (i % 2) * .08 + Math.sin(t / 8 + i) * .02); ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r * .9); } ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#1a0a2a'; ctx.lineWidth = R * .04; [-1, 1].forEach(k => { ctx.beginPath(); ctx.arc(cx + k * R * .15, cy - R * .05, R * .08, .2, 2.9); ctx.stroke(); });
    ctx.fillStyle = '#1a0a2a'; ctx.beginPath(); ctx.ellipse(cx, cy + R * .2, R * .1, R * (.06 + .04 * Math.abs(Math.sin(t / 15))), 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#e8d8ff'; ctx.font = `bold ${R * .18}px sans-serif`; ctx.textAlign = 'center'; const z = (t / 3) % 30; ctx.globalAlpha = 1 - z / 30; ctx.fillText('Z', cx + R * .45 + z * R * .01, cy - R * .5 - z * R * .015); ctx.fillText('z', cx + R * .3, cy - R * .35 - z * R * .01); ctx.globalAlpha = 1;
    ctx.save(); ctx.translate(cx - R * .5, cy + R * .2); ctx.rotate(-.5); ctx.fillStyle = '#c8c8d8'; ctx.beginPath(); ctx.moveTo(0, -R * .3); ctx.lineTo(R * .04, 0); ctx.lineTo(-R * .04, 0); ctx.fill(); ctx.fillStyle = '#3a1a4a'; ctx.fillRect(-R * .07, 0, R * .14, R * .03); ctx.restore();
  },
  nisuika(ctx, cx, cy, R, t) {
    ctx.fillStyle = lin(ctx, 0, cy + R * .3, 0, cy + R, ['#3a6ab8', '#1a2a5a']); ctx.beginPath(); ctx.ellipse(cx, cy + R * .65, R * .95, R * .32, 0, 0, 7); ctx.fill();
    const b = Math.sin(t / 12) * R * .05;
    ctx.fillStyle = lin(ctx, 0, cy - R * .6, 0, cy + R * .6, ['#5a2a7a', '#2a0a3a']); ctx.beginPath(); ctx.moveTo(cx - R * .45, cy + R * .6); ctx.quadraticCurveTo(cx - R * .55, cy - R * .4 + b, cx, cy - R * .5 + b); ctx.quadraticCurveTo(cx + R * .55, cy - R * .4 + b, cx + R * .45, cy + R * .6); ctx.fill();
    ctx.fillStyle = '#3a1a4a'; [-1, 1].forEach(k => { ctx.beginPath(); ctx.moveTo(cx + k * R * .25, cy - R * .42 + b); ctx.lineTo(cx + k * R * .4, cy - R * .8 + b); ctx.lineTo(cx + k * R * .12, cy - R * .48 + b); ctx.fill(); });
    ctx.fillStyle = '#ffe04a'; [-1, 1].forEach(k => { ctx.beginPath(); ctx.arc(cx + k * R * .15, cy - R * .2 + b, R * .06, 0, 7); ctx.fill(); });
    ctx.fillStyle = '#1a0a1a'; ctx.beginPath(); ctx.ellipse(cx, cy + R * .05 + b, R * .17, R * .07, 0, 0, Math.PI); ctx.fill();
    ctx.strokeStyle = '#a8d8ff'; ctx.lineWidth = R * .03; ctx.beginPath(); ctx.ellipse(cx, cy + R * .45, R * .55, R * .1, 0, 0, 7); ctx.stroke();
    ctx.fillStyle = 'rgba(230,210,60,.5)'; for (let i = 0; i < 4; i++) { const p = ((t / 2 + i * 10) % 40) / 40; ctx.beginPath(); ctx.arc(cx + (i - 1.5) * R * .25, cy - R * .5 - p * R * .4 + b, R * (.05 + p * .08), 0, 7); ctx.fill(); }
    ctx.save(); ctx.translate(cx + R * .55, cy); ctx.rotate(.4); ctx.fillStyle = '#c8c8d8'; ctx.beginPath(); ctx.moveTo(0, -R * .35); ctx.lineTo(R * .04, 0); ctx.lineTo(-R * .04, 0); ctx.fill(); ctx.fillStyle = '#3a1a4a'; ctx.fillRect(-R * .07, 0, R * .14, R * .03); ctx.restore();
  },
  futago(ctx, cx, cy, R, t) {
    const sp = R * (.32 + .06 * Math.sin(t / 8));
    [-1, 1].forEach((k, j) => { const x = cx + k * sp, y = cy + R * .15;
      ctx.fillStyle = j ? '#6a3a9a' : '#4a2a7a'; ctx.beginPath(); ctx.ellipse(x, y + R * .2, R * .22, R * .3, 0, 0, 7); ctx.fill();
      ctx.beginPath(); ctx.arc(x, y - R * .25, R * .2, 0, 7); ctx.fill();
      ctx.fillStyle = '#3a1a5a'; ctx.beginPath(); ctx.moveTo(x - R * .12, y - R * .38); ctx.lineTo(x - R * .18, y - R * .6); ctx.lineTo(x - R * .04, y - R * .42); ctx.fill(); ctx.beginPath(); ctx.moveTo(x + R * .12, y - R * .38); ctx.lineTo(x + R * .18, y - R * .6); ctx.lineTo(x + R * .04, y - R * .42); ctx.fill();
      ctx.fillStyle = '#ffd8ff'; ctx.beginPath(); ctx.arc(x - R * .07, y - R * .27, R * .035, 0, 7); ctx.arc(x + R * .07, y - R * .27, R * .035, 0, 7); ctx.fill();
      ctx.fillStyle = '#8a8aa0'; ctx.beginPath(); ctx.ellipse(x + k * R * .2, y + R * .25, R * .1, R * .14, 0, 0, 7); ctx.fill(); ctx.fillStyle = '#4ab0ff'; ctx.beginPath(); ctx.moveTo(x + k * R * .2, y + R * .15); ctx.quadraticCurveTo(x + k * R * .27, y + R * .28, x + k * R * .2, y + R * .33); ctx.quadraticCurveTo(x + k * R * .13, y + R * .28, x + k * R * .2, y + R * .15); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.font = `bold ${R * .1}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('50', x - k * R * .02, y + R * .1); });
    ctx.strokeStyle = '#4a2a7a'; ctx.lineWidth = R * .07; ctx.beginPath(); ctx.moveTo(cx - sp + R * .15, cy + R * .25); ctx.lineTo(cx + sp - R * .15, cy + R * .25); ctx.stroke();
    ctx.fillStyle = 'rgba(160,220,255,.6)'; for (let i = 0; i < 3; i++) { const p = ((t / 2 + i * 8) % 24) / 24; ctx.beginPath(); ctx.arc(cx + (i - 1) * R * .15, cy - R * .6 - p * R * .3, R * .04, 0, 7); ctx.fill(); }
  },
  mitsuhikui(ctx, cx, cy, R, t) {
    ctx.fillStyle = lin(ctx, 0, cy - R * .1, 0, cy + R * .9, ['#4a2a6a', '#1a0a2a']); ctx.beginPath(); ctx.ellipse(cx, cy + R * .45, R * .55, R * .45, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#6a4a8a'; rr(ctx, cx - R * .2, cy + R * .35, R * .4, R * .22, R * .05); ctx.fill(); ctx.fillStyle = '#fff'; ctx.font = `bold ${R * .16}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('50', cx, cy + R * .46);
    [['引火', -1], ['発火', 0], ['沸', 1]].forEach(([lab, k], i) => { const sw = Math.sin(t / 10 + i * 2) * R * .05, hx = cx + k * R * .5 + sw, hy = cy - R * (.45 + (k === 0 ? .2 : 0));
      ctx.strokeStyle = '#3a1a5a'; ctx.lineWidth = R * .12; ctx.beginPath(); ctx.moveTo(cx + k * R * .2, cy + R * .1); ctx.quadraticCurveTo(cx + k * R * .35, cy - R * .1, hx, hy); ctx.stroke();
      ctx.fillStyle = '#5a3a7a'; ctx.beginPath(); ctx.ellipse(hx, hy, R * .2, R * .16, 0, 0, 7); ctx.fill();
      ctx.fillStyle = '#ff5ad8'; [-1, 1].forEach(e => { ctx.beginPath(); ctx.arc(hx + e * R * .07, hy - R * .03, R * .03, 0, 7); ctx.fill(); });
      ctx.fillStyle = '#f0e0b0'; rr(ctx, hx - R * .14, hy + R * .1, R * .28, R * .12, R * .02); ctx.fill(); ctx.fillStyle = '#3a1a1a'; ctx.font = `bold ${R * .09}px sans-serif`; ctx.fillText(lab, hx, hy + R * .16);
      ctx.fillStyle = '#e8c030'; ctx.beginPath(); ctx.moveTo(hx - R * .12, hy - R * .12); ctx.lineTo(hx - R * .06, hy - R * .25); ctx.lineTo(hx, hy - R * .14); ctx.lineTo(hx + R * .06, hy - R * .25); ctx.lineTo(hx + R * .12, hy - R * .12); ctx.fill(); });
    ctx.save(); ctx.translate(cx + R * .65, cy + R * .4); ctx.rotate(.5); ctx.fillStyle = '#c8c8d8'; ctx.beginPath(); ctx.moveTo(0, -R * .35); ctx.lineTo(R * .045, 0); ctx.lineTo(-R * .045, 0); ctx.fill(); ctx.fillStyle = '#7ad84a'; ctx.beginPath(); ctx.arc(0, -R * .18, R * .03, 0, 7); ctx.fill(); ctx.fillStyle = '#3a1a4a'; ctx.fillRect(-R * .08, 0, R * .16, R * .035); ctx.restore();
  },
  // ── 第1石油類（赤・細い剣・鎧の数字200／水溶性400）──
  fencer21(ctx, cx, cy, R, t) {
    ctx.fillStyle = '#2a2a2a'; [-1, 1].forEach(k => ctx.fillRect(cx + k * R * .14 - R * .07, cy + R * .5, R * .14, R * .4));
    ctx.fillStyle = lin(ctx, cx - R * .3, 0, cx + R * .3, 0, ['#e83a2a', '#8a1a10']); rr(ctx, cx - R * .3, cy - R * .25, R * .6, R * .8, R * .1); ctx.fill();
    ctx.fillStyle = '#ffe0d0'; rr(ctx, cx - R * .16, cy - R * .12, R * .32, R * .2, R * .04); ctx.fill(); ctx.fillStyle = '#8a1a10'; ctx.font = `bold ${R * .15}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('21', cx, cy - R * .02);
    ctx.fillStyle = '#c0c0c0'; rr(ctx, cx - R * .18, cy + R * .18, R * .36, R * .17, R * .03); ctx.fill(); ctx.fillStyle = '#5a0a0a'; ctx.font = `bold ${R * .12}px sans-serif`; ctx.fillText('200', cx, cy + R * .27);
    ctx.fillStyle = '#f0c49a'; ctx.beginPath(); ctx.arc(cx, cy - R * .45, R * .2, 0, 7); ctx.fill(); ctx.fillStyle = '#c0201a'; ctx.beginPath(); ctx.ellipse(cx, cy - R * .6, R * .24, R * .09, 0, 0, 7); ctx.fill(); ctx.fillRect(cx - R * .14, cy - R * .78, R * .28, R * .18);
    ctx.fillStyle = '#222'; [-1, 1].forEach(k => { ctx.beginPath(); ctx.arc(cx + k * R * .07, cy - R * .45, R * .025, 0, 7); ctx.fill(); });
    const a = -.9 + Math.sin(t / 6) * .25; ctx.save(); ctx.translate(cx + R * .35, cy); ctx.rotate(a); ctx.fillStyle = '#e8e8f0'; ctx.fillRect(-R * .015, -R * .85, R * .03, R * .8); ctx.fillStyle = '#d8a020'; ctx.beginPath(); ctx.arc(0, -R * .03, R * .07, Math.PI, 0); ctx.fill(); ctx.fillRect(-R * .02, -R * .03, R * .04, R * .12); ctx.restore();
  },
  gasoline(ctx, cx, cy, R, t) {
    ctx.fillStyle = 'rgba(255,150,40,.45)'; for (let i = 0; i < 5; i++) { const p = ((t / 2 + i * 8) % 40) / 40; ctx.beginPath(); ctx.arc(cx - R * .5 - p * R * .5, cy + R * .3 - p * R * .3, R * (.06 + p * .14), 0, 7); ctx.fill(); }
    const sp = t / 3; [-1, 1].forEach(k => { ctx.save(); ctx.translate(cx + k * R * .38, cy + R * .55); ctx.fillStyle = '#2a2a2a'; ctx.beginPath(); ctx.arc(0, 0, R * .2, 0, 7); ctx.fill(); ctx.strokeStyle = '#e83a2a'; ctx.lineWidth = R * .04; ctx.rotate(sp); for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(R * .15 * Math.cos(i * 2.09), R * .15 * Math.sin(i * 2.09)); ctx.stroke(); } ctx.restore(); });
    ctx.fillStyle = lin(ctx, 0, cy - R * .3, 0, cy + R * .5, ['#ff7a2a', '#c0201a']); rr(ctx, cx - R * .55, cy - R * .1, R * 1.1, R * .55, R * .15); ctx.fill();
    ctx.fillStyle = '#ffcf9a'; rr(ctx, cx - R * .25, cy - R * .35, R * .5, R * .3, R * .1); ctx.fill(); ctx.fillStyle = '#222'; [-1, 1].forEach(k => { ctx.beginPath(); ctx.arc(cx + k * R * .1, cy - R * .2, R * .04, 0, 7); ctx.fill(); }); ctx.strokeStyle = '#222'; ctx.lineWidth = R * .03; ctx.beginPath(); ctx.moveTo(cx - R * .08, cy - R * .1); ctx.lineTo(cx + R * .12, cy - R * .12); ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.font = `bold ${R * .14}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('200', cx, cy + R * .2);
    ctx.save(); ctx.translate(cx + R * .55, cy - R * .05); ctx.rotate(-.4 + Math.sin(t / 5) * .3); ctx.fillStyle = '#e8e8f0'; ctx.fillRect(-R * .015, -R * .7, R * .03, R * .65); ctx.fillStyle = '#d8a020'; ctx.fillRect(-R * .06, -R * .06, R * .12, R * .04); ctx.restore();
  },
  benzen(ctx, cx, cy, R, t) {
    ctx.fillStyle = 'rgba(160,220,120,.3)'; for (let i = 0; i < 5; i++) { const p = ((t / 2 + i * 9) % 45) / 45; ctx.beginPath(); ctx.arc(cx + Math.sin(i * 2 + p * 3) * R * .6, cy - R * .2 - p * R * .7, R * (.06 + p * .12), 0, 7); ctx.fill(); }
    ctx.fillStyle = lin(ctx, 0, cy, 0, cy + R * .9, ['#d83a2a', '#7a1a10']); rr(ctx, cx - R * .3, cy + R * .05, R * .6, R * .75, R * .1); ctx.fill();
    ctx.fillStyle = '#e85a3a'; ctx.strokeStyle = '#5a0a0a'; ctx.lineWidth = R * .04; ctx.beginPath(); for (let i = 0; i < 6; i++) { const a = i / 6 * 6.283 + Math.PI / 6; ctx.lineTo(cx + Math.cos(a) * R * .38, cy - R * .3 + Math.sin(a) * R * .38); } ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.arc(cx, cy - R * .3, R * .2, 0, 7); ctx.stroke();
    ctx.fillStyle = '#ffe04a'; [-1, 1].forEach(k => { ctx.beginPath(); ctx.arc(cx + k * R * .12, cy - R * .35, R * .045, 0, 7); ctx.fill(); }); ctx.fillStyle = '#5a0a0a'; ctx.beginPath(); ctx.arc(cx, cy - R * .2, R * .07, 0, Math.PI); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = `bold ${R * .13}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('200', cx, cy + R * .4);
    ctx.save(); ctx.translate(cx - R * .45, cy + R * .3); ctx.rotate(.5); ctx.fillStyle = '#e8e8f0'; ctx.fillRect(-R * .015, -R * .65, R * .03, R * .6); ctx.fillStyle = '#d8a020'; ctx.fillRect(-R * .06, -R * .06, R * .12, R * .04); ctx.restore();
  },
  aseton(ctx, cx, cy, R, t) {
    ctx.fillStyle = lin(ctx, 0, cy - R * .5, 0, cy + R * .8, ['#f05a4a', '#9a1a10']); ctx.beginPath(); ctx.ellipse(cx, cy + R * .15, R * .5, R * .65, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#7ad0ff'; for (let i = 0; i < 5; i++) { const p = ((t / 2 + i * 7) % 35) / 35, x = cx + (i - 2) * R * .18, y = cy - R * .35 + p * R * .8; ctx.globalAlpha = 1 - p; ctx.beginPath(); ctx.moveTo(x, y - R * .06); ctx.quadraticCurveTo(x + R * .04, y, x, y + R * .03); ctx.quadraticCurveTo(x - R * .04, y, x, y - R * .06); ctx.fill(); } ctx.globalAlpha = 1;
    ctx.fillStyle = '#fff'; [-1, 1].forEach(k => { ctx.beginPath(); ctx.arc(cx + k * R * .15, cy - R * .15, R * .09, 0, 7); ctx.fill(); }); ctx.fillStyle = '#222'; [-1, 1].forEach(k => { ctx.beginPath(); ctx.arc(cx + k * R * .15, cy - R * .12, R * .045, 0, 7); ctx.fill(); });
    ctx.strokeStyle = '#4a0a0a'; ctx.lineWidth = R * .035; ctx.beginPath(); ctx.moveTo(cx - R * .12, cy + R * .12); ctx.quadraticCurveTo(cx, cy + R * .05, cx + R * .12, cy + R * .12); ctx.stroke();
    ctx.fillStyle = '#9a9ab0'; ctx.beginPath(); ctx.ellipse(cx - R * .5, cy + R * .35, R * .18, R * .24, 0, 0, 7); ctx.fill(); ctx.fillStyle = '#3aa8ff'; ctx.beginPath(); ctx.moveTo(cx - R * .5, cy + R * .2); ctx.quadraticCurveTo(cx - R * .38, cy + R * .4, cx - R * .5, cy + R * .48); ctx.quadraticCurveTo(cx - R * .62, cy + R * .4, cx - R * .5, cy + R * .2); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = `bold ${R * .14}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('400', cx + R * .1, cy + R * .45);
    ctx.save(); ctx.translate(cx + R * .5, cy + R * .2); ctx.rotate(.3 + Math.sin(t / 7) * .2); ctx.fillStyle = '#e8e8f0'; ctx.fillRect(-R * .015, -R * .65, R * .03, R * .6); ctx.fillStyle = '#d8a020'; ctx.fillRect(-R * .06, -R * .06, R * .12, R * .04); ctx.restore();
  },
  ichiseki(ctx, cx, cy, R, t) {
    ctx.fillStyle = '#3a1a1a'; [-1, 1].forEach(k => ctx.fillRect(cx + k * R * .2 - R * .1, cy + R * .6, R * .2, R * .32));
    ctx.fillStyle = lin(ctx, cx - R * .45, 0, cx + R * .45, 0, ['#e83a2a', '#7a0a0a']); rr(ctx, cx - R * .45, cy - R * .3, R * .9, R * .95, R * .12); ctx.fill();
    ctx.fillStyle = '#d8a020'; ctx.fillRect(cx - R * .45, cy + R * .1, R * .9, R * .06);
    ctx.fillStyle = '#f0f0f0'; rr(ctx, cx - R * .24, cy - R * .2, R * .48, R * .24, R * .04); ctx.fill(); ctx.fillStyle = '#8a0a0a'; ctx.font = `bold ${R * .2}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('200', cx, cy - R * .08);
    ctx.fillStyle = '#c0201a'; ctx.beginPath(); ctx.arc(cx, cy - R * .55, R * .27, Math.PI, 0); ctx.lineTo(cx + R * .27, cy - R * .35); ctx.lineTo(cx - R * .27, cy - R * .35); ctx.fill();
    ctx.fillStyle = '#d8a020'; ctx.beginPath(); ctx.moveTo(cx - R * .3, cy - R * .6); ctx.lineTo(cx - R * .45, cy - R * .95); ctx.lineTo(cx - R * .15, cy - R * .7); ctx.fill(); ctx.beginPath(); ctx.moveTo(cx + R * .3, cy - R * .6); ctx.lineTo(cx + R * .45, cy - R * .95); ctx.lineTo(cx + R * .15, cy - R * .7); ctx.fill();
    ctx.fillStyle = '#111'; ctx.fillRect(cx - R * .18, cy - R * .52, R * .36, R * .07); ctx.fillStyle = '#ffd02a'; [-1, 1].forEach(k => { ctx.beginPath(); ctx.arc(cx + k * R * .08, cy - R * .49, R * .025, 0, 7); ctx.fill(); });
    [-1, 1].forEach(k => { ctx.save(); ctx.translate(cx + k * R * .55, cy + R * .1); ctx.rotate(k * (-.6 + Math.sin(t / 8 + k) * .2)); ctx.fillStyle = '#e8e8f0'; ctx.fillRect(-R * .02, -R * .9, R * .04, R * .85); ctx.fillStyle = '#d8a020'; ctx.fillRect(-R * .08, -R * .06, R * .16, R * .05); ctx.restore(); });
  },
  // ── アルコール類（青白く透ける・杖・見えにくい炎・鎧の数字400）──
  sukesuke(ctx, cx, cy, R, t) { alcBody(ctx, cx, cy, R, t, 0); alcStaff(ctx, cx + R * .5, cy, R, t, '#8ad8ff'); alcPlate(ctx, cx, cy + R * .25, R, '400');
    ctx.fillStyle = 'rgba(200,235,255,.85)'; ctx.beginPath(); ctx.moveTo(cx - R * .3, cy - R * .55); ctx.lineTo(cx, cy - R * 1.0); ctx.lineTo(cx + R * .3, cy - R * .55); ctx.fill(); },
  metano(ctx, cx, cy, R, t) { alcBody(ctx, cx, cy, R, t, 1); alcStaff(ctx, cx + R * .5, cy, R, t, '#b04ad8');
    ctx.fillStyle = 'rgba(160,60,200,.8)'; for (let i = 0; i < 3; i++) { const p = ((t / 2 + i * 9) % 27) / 27; ctx.beginPath(); ctx.arc(cx + R * .62, cy - R * .5 + p * R * .9, R * .035, 0, 7); ctx.fill(); }
    ctx.strokeStyle = '#5a1a7a'; ctx.lineWidth = R * .04; [-1, 1].forEach(k => { ctx.beginPath(); ctx.moveTo(cx + k * R * .2, cy - R * .22); ctx.lineTo(cx + k * R * .06, cy - R * .16); ctx.stroke(); }); alcPlate(ctx, cx, cy + R * .25, R, '400'); },
  etano(ctx, cx, cy, R, t) { const sw = Math.sin(t / 10) * .12; ctx.save(); ctx.translate(cx, cy + R * .8); ctx.rotate(sw); ctx.translate(-cx, -cy - R * .8); alcBody(ctx, cx, cy, R, t, 2);
    ctx.fillStyle = 'rgba(255,120,140,.6)'; [-1, 1].forEach(k => { ctx.beginPath(); ctx.ellipse(cx + k * R * .22, cy - R * .08, R * .08, R * .05, 0, 0, 7); ctx.fill(); }); alcPlate(ctx, cx, cy + R * .25, R, '400'); ctx.restore();
    ctx.save(); ctx.translate(cx + R * .55, cy + R * .1); ctx.rotate(.2); ctx.fillStyle = '#6a4a2a'; ctx.fillRect(-R * .03, -R * .6, R * .06, R * .8); ctx.fillStyle = 'rgba(120,200,120,.85)'; rr(ctx, -R * .1, -R * .85, R * .2, R * .28, R * .05); ctx.fill(); ctx.fillRect(-R * .04, -R * .95, R * .08, R * .12); ctx.restore(); },
  kagebi(ctx, cx, cy, R, t) {
    for (let i = 0; i < 7; i++) { const a = i / 7 * 6.283 + t / 20, h = R * (.25 + .08 * Math.sin(t / 5 + i)); ctx.fillStyle = 'rgba(140,190,255,.28)'; ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * R * .5 - R * .07, cy + Math.sin(a) * R * .35); ctx.quadraticCurveTo(cx + Math.cos(a) * R * .55, cy + Math.sin(a) * R * .35 - h * 2, cx + Math.cos(a) * R * .5 + R * .07, cy + Math.sin(a) * R * .35); ctx.fill(); }
    ctx.fillStyle = 'rgba(210,235,255,.8)'; ctx.beginPath(); ctx.moveTo(cx - R * .38, cy + R * .7); ctx.quadraticCurveTo(cx - R * .45, cy - R * .5, cx, cy - R * .55); ctx.quadraticCurveTo(cx + R * .45, cy - R * .5, cx + R * .38, cy + R * .7); for (let i = 0; i < 4; i++) ctx.lineTo(cx + R * (.28 - i * .19), cy + R * (i % 2 ? .82 : .65)); ctx.fill();
    ctx.fillStyle = '#2a4a8a'; [-1, 1].forEach(k => { ctx.beginPath(); ctx.ellipse(cx + k * R * .14, cy - R * .15, R * .06, R * .09, 0, 0, 7); ctx.fill(); }); ctx.beginPath(); ctx.ellipse(cx, cy + R * .08, R * .07, R * .1, 0, 0, 7); ctx.fill();
    alcStaff(ctx, cx + R * .5, cy, R, t, '#bfe4ff'); alcPlate(ctx, cx, cy + R * .4, R, '400'); },
  arukoru(ctx, cx, cy, R, t) {
    ctx.fillStyle = 'rgba(200,230,255,.82)'; ctx.beginPath(); ctx.moveTo(cx - R * .5, cy + R * .9); ctx.lineTo(cx - R * .3, cy - R * .3); ctx.lineTo(cx + R * .3, cy - R * .3); ctx.lineTo(cx + R * .5, cy + R * .9); ctx.fill();
    ctx.fillStyle = 'rgba(120,170,230,.8)'; ctx.fillRect(cx - R * .06, cy - R * .3, R * .12, R * 1.2);
    ctx.fillStyle = 'rgba(225,240,255,.9)'; ctx.beginPath(); ctx.arc(cx, cy - R * .48, R * .2, 0, 7); ctx.fill();
    ctx.fillStyle = 'rgba(170,210,255,.95)'; ctx.beginPath(); ctx.moveTo(cx - R * .2, cy - R * .6); ctx.lineTo(cx, cy - R * 1.05); ctx.lineTo(cx + R * .2, cy - R * .6); ctx.fill();
    ctx.fillStyle = '#2a4a8a'; [-1, 1].forEach(k => { ctx.beginPath(); ctx.arc(cx + k * R * .07, cy - R * .48, R * .025, 0, 7); ctx.fill(); });
    alcPlate(ctx, cx, cy + R * .2, R * 1.2, '400');
    ctx.save(); ctx.translate(cx + R * .6, cy + R * .3); ctx.fillStyle = '#c8a050'; ctx.fillRect(-R * .03, -R * 1.1, R * .06, R * 1.4);
    [0, 1, 2].forEach(i => { const a = -1.2 + i * 1.2, x = Math.cos(a - 1.57) * R * .16, y = -R * 1.15 + Math.sin(a - 1.57) * R * .16; ctx.fillStyle = `rgba(150,210,255,${.6 + .3 * Math.sin(t / 6 + i)})`; ctx.beginPath(); ctx.arc(x, y, R * .08, 0, 7); ctx.fill(); ctx.fillStyle = '#fff'; ctx.font = `bold ${R * .08}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('C', x, y); }); ctx.restore(); },
  // ── 第2石油類（黄・槍・霧の炎・鎧の数字1000／水溶性2000）──
  niseki(ctx, cx, cy, R, t) { mist(ctx, cx, cy, R, t);
    ctx.fillStyle = '#3a3a2a'; [-1, 1].forEach(k => ctx.fillRect(cx + k * R * .14 - R * .07, cy + R * .5, R * .14, R * .4));
    ctx.fillStyle = lin(ctx, cx - R * .3, 0, cx + R * .3, 0, ['#f0d030', '#a88a10']); rr(ctx, cx - R * .3, cy - R * .25, R * .6, R * .8, R * .1); ctx.fill();
    ctx.fillStyle = '#f0c49a'; ctx.beginPath(); ctx.arc(cx, cy - R * .45, R * .2, 0, 7); ctx.fill(); ctx.fillStyle = '#d8b020'; ctx.beginPath(); ctx.arc(cx, cy - R * .5, R * .22, Math.PI, 0); ctx.fill();
    ctx.fillStyle = '#222'; [-1, 1].forEach(k => { ctx.beginPath(); ctx.arc(cx + k * R * .07, cy - R * .43, R * .025, 0, 7); ctx.fill(); });
    plate(ctx, cx, cy + R * .15, R, '1000', '#7a6a10'); spear(ctx, cx + R * .45, cy, R, t); },
  touyu(ctx, cx, cy, R, t) { mist(ctx, cx, cy - R * .5, R, t);
    ctx.fillStyle = lin(ctx, 0, cy - R * .5, 0, cy + R * .8, ['#f8e050', '#b89a20']); rr(ctx, cx - R * .42, cy - R * .45, R * .84, R * 1.25, R * .15); ctx.fill();
    ctx.fillStyle = '#3a3a3a'; rr(ctx, cx - R * .3, cy + R * .1, R * .6, R * .35, R * .05); ctx.fill(); ctx.fillStyle = '#ff8a2a'; for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.arc(cx - R * .2 + i * R * .13, cy + R * .3, R * (.04 + .015 * Math.sin(t / 4 + i)), 0, 7); ctx.fill(); }
    ctx.fillStyle = '#222'; [-1, 1].forEach(k => { ctx.beginPath(); ctx.arc(cx + k * R * .14, cy - R * .2, R * .05, 0, 7); ctx.fill(); }); ctx.beginPath(); ctx.ellipse(cx, cy - R * .02, R * .08, R * .05, 0, 0, 7); ctx.fill();
    plate(ctx, cx, cy + R * .62, R, '1000', '#7a6a10'); spear(ctx, cx + R * .55, cy, R, t); },
  keiyu(ctx, cx, cy, R, t) {
    [-1, 1].forEach(k => { ctx.fillStyle = '#2a2a2a'; ctx.beginPath(); ctx.arc(cx + k * R * .45, cy + R * .6, R * .17, 0, 7); ctx.fill(); ctx.fillStyle = '#888'; ctx.beginPath(); ctx.arc(cx + k * R * .45, cy + R * .6, R * .07, 0, 7); ctx.fill(); });
    ctx.fillStyle = '#c8a020'; rr(ctx, cx - R * .7, cy - R * .05, R * .85, R * .55, R * .05); ctx.fill(); ctx.fillStyle = '#8a5a2a'; [0, 1, 2].forEach(i => { rr(ctx, cx - R * .62 + i * R * .26, cy - R * .25, R * .22, R * .25, R * .04); ctx.fill(); });
    ctx.fillStyle = lin(ctx, 0, cy - R * .4, 0, cy + R * .5, ['#f8e050', '#b89a20']); rr(ctx, cx + R * .15, cy - R * .4, R * .55, R * .9, R * .1); ctx.fill();
    ctx.fillStyle = '#bfe4ff'; rr(ctx, cx + R * .25, cy - R * .3, R * .36, R * .25, R * .04); ctx.fill(); ctx.fillStyle = '#222'; [0, 1].forEach(i => { ctx.beginPath(); ctx.arc(cx + R * (.35 + i * .16), cy - R * .18, R * .035, 0, 7); ctx.fill(); });
    plate(ctx, cx + R * .42, cy + R * .2, R, '1000', '#7a6a10'); ctx.save(); ctx.translate(cx + R * .7, cy - R * .2); ctx.rotate(.9); spearShape(ctx, R); ctx.restore(); },
  sakusan(ctx, cx, cy, R, t) {
    ctx.fillStyle = lin(ctx, 0, cy - R * .5, 0, cy + R * .8, ['#f8e050', '#c8a020']); ctx.beginPath(); ctx.ellipse(cx, cy + R * .15, R * .48, R * .62, 0, 0, 7); ctx.fill();
    ctx.fillStyle = 'rgba(220,240,255,.9)'; [[-.15, -.5], [.05, -.55], [.2, -.48]].forEach(([x, y]) => { ctx.beginPath(); ctx.moveTo(cx + x * R - R * .06, cy + y * R + R * .04); ctx.lineTo(cx + x * R, cy + y * R - R * .08); ctx.lineTo(cx + x * R + R * .06, cy + y * R + R * .04); ctx.fill(); });
    ctx.strokeStyle = '#4a3a0a'; ctx.lineWidth = R * .045; [-1, 1].forEach(k => { ctx.beginPath(); ctx.moveTo(cx + k * R * .22, cy - R * .12); ctx.lineTo(cx + k * R * .08, cy - R * .06); ctx.lineTo(cx + k * R * .22, cy); ctx.stroke(); });
    ctx.fillStyle = '#4a3a0a'; ctx.beginPath(); ctx.arc(cx, cy + R * .15, R * .05, 0, 7); ctx.fill();
    ctx.strokeStyle = 'rgba(160,200,80,.6)'; ctx.lineWidth = R * .03; for (let i = 0; i < 3; i++) { const p = ((t / 2 + i * 10) % 30) / 30; ctx.beginPath(); ctx.moveTo(cx - R * .5 - p * R * .3, cy - R * .3 + i * R * .2); ctx.quadraticCurveTo(cx - R * .6 - p * R * .3, cy - R * .35 + i * R * .2, cx - R * .7 - p * R * .3, cy - R * .3 + i * R * .2); ctx.stroke(); }
    ctx.fillStyle = '#9a9ab0'; ctx.beginPath(); ctx.ellipse(cx - R * .5, cy + R * .4, R * .17, R * .23, 0, 0, 7); ctx.fill(); ctx.fillStyle = '#3aa8ff'; ctx.beginPath(); ctx.moveTo(cx - R * .5, cy + R * .26); ctx.quadraticCurveTo(cx - R * .38, cy + R * .45, cx - R * .5, cy + R * .52); ctx.quadraticCurveTo(cx - R * .62, cy + R * .45, cx - R * .5, cy + R * .26); ctx.fill();
    plate(ctx, cx + R * .08, cy + R * .48, R, '2000', '#7a6a10'); spear(ctx, cx + R * .5, cy + R * .1, R, t); },
  nisekio(ctx, cx, cy, R, t) { mist(ctx, cx, cy, R * 1.2, t);
    ctx.fillStyle = '#c89a10'; ctx.beginPath(); ctx.moveTo(cx - R * .55, cy + R * .9); ctx.lineTo(cx - R * .35, cy - R * .3); ctx.lineTo(cx + R * .35, cy - R * .3); ctx.lineTo(cx + R * .55, cy + R * .9); ctx.fill();
    ctx.fillStyle = lin(ctx, cx - R * .35, 0, cx + R * .35, 0, ['#ffe860', '#c8a010']); rr(ctx, cx - R * .35, cy - R * .3, R * .7, R * .85, R * .1); ctx.fill();
    ctx.fillStyle = '#f0c49a'; ctx.beginPath(); ctx.arc(cx, cy - R * .5, R * .22, 0, 7); ctx.fill();
    ctx.fillStyle = '#ffd820'; ctx.beginPath(); ctx.moveTo(cx - R * .24, cy - R * .62); for (let i = 0; i < 5; i++) ctx.lineTo(cx - R * .24 + i * R * .12, cy - R * (.95 - (i % 2) * .18)); ctx.lineTo(cx + R * .24, cy - R * .62); ctx.fill();
    ctx.fillStyle = '#222'; [-1, 1].forEach(k => { ctx.beginPath(); ctx.arc(cx + k * R * .08, cy - R * .5, R * .028, 0, 7); ctx.fill(); }); ctx.fillStyle = '#7a4a2a'; ctx.fillRect(cx - R * .1, cy - R * .38, R * .2, R * .04);
    plate(ctx, cx, cy + R * .1, R * 1.2, '1000', '#7a6a10'); ctx.save(); ctx.translate(cx + R * .6, cy + R * .2); ctx.rotate(-.15 + Math.sin(t / 10) * .08); ctx.scale(1.3, 1.3); spearShape(ctx, R, '#ffd820'); ctx.restore(); },
  // __ENEMY_END__
};
function mist(ctx, cx, cy, R, t) { for (let i = 0; i < 6; i++) { const p = ((t / 3 + i * 8) % 48) / 48; ctx.fillStyle = `rgba(250,230,120,${.35 * (1 - p)})`; ctx.beginPath(); ctx.arc(cx + Math.sin(i * 2.4) * R * .7, cy - R * .2 - p * R * .6, R * (.12 + p * .2), 0, 7); ctx.fill(); } }
function spearShape(ctx, R, head = '#e8e8f0') { ctx.fillStyle = '#8a6a3a'; ctx.fillRect(-R * .025, -R * .9, R * .05, R * 1.3); ctx.fillStyle = head; ctx.beginPath(); ctx.moveTo(0, -R * 1.15); ctx.lineTo(R * .07, -R * .88); ctx.lineTo(-R * .07, -R * .88); ctx.fill(); ctx.fillStyle = 'rgba(250,230,120,.7)'; ctx.beginPath(); ctx.arc(0, -R * 1.18, R * .05, 0, 7); ctx.fill(); }
function spear(ctx, x, y, R, t) { ctx.save(); ctx.translate(x, y + R * .2); ctx.rotate(.15 + Math.sin(t / 8) * .1); spearShape(ctx, R); ctx.restore(); }
function plate(ctx, x, y, R, n, col) { ctx.fillStyle = col; rr(ctx, x - R * .2, y - R * .08, R * .4, R * .16, R * .04); ctx.fill(); ctx.fillStyle = '#fff'; ctx.font = `bold ${R * .12}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(n, x, y + R * .005); }
function alcBody(ctx, cx, cy, R, t, nC) {
  const b = Math.sin(t / 12) * R * .04;
  ctx.fillStyle = 'rgba(205,235,255,.82)'; ctx.beginPath(); ctx.moveTo(cx - R * .4, cy + R * .8); ctx.quadraticCurveTo(cx - R * .5, cy - R * .45 + b, cx, cy - R * .5 + b); ctx.quadraticCurveTo(cx + R * .5, cy - R * .45 + b, cx + R * .4, cy + R * .8); ctx.closePath(); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.beginPath(); ctx.ellipse(cx - R * .2, cy - R * .2 + b, R * .07, R * .16, -.3, 0, 7); ctx.fill();
  ctx.fillStyle = '#2a4a8a'; [-1, 1].forEach(k => { ctx.beginPath(); ctx.arc(cx + k * R * .13, cy - R * .12 + b, R * .045, 0, 7); ctx.fill(); });
  for (let i = 0; i < nC; i++) { const x = cx + (i - (nC - 1) / 2) * R * .22, y = cy - R * .68 + b; ctx.fillStyle = '#333'; ctx.beginPath(); ctx.arc(x, y, R * .08, 0, 7); ctx.fill(); ctx.fillStyle = '#fff'; ctx.font = `bold ${R * .09}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('C', x, y); }
}
function alcStaff(ctx, x, y, R, t, gem) { ctx.save(); ctx.translate(x, y + R * .2); ctx.rotate(.15); ctx.fillStyle = '#8a6a3a'; ctx.fillRect(-R * .025, -R * .9, R * .05, R * 1.2); ctx.fillStyle = gem; ctx.globalAlpha = .7 + .3 * Math.sin(t / 6); ctx.beginPath(); ctx.arc(0, -R * .95, R * .09, 0, 7); ctx.fill(); ctx.restore(); }
function alcPlate(ctx, x, y, R, n) { ctx.fillStyle = 'rgba(90,130,190,.9)'; rr(ctx, x - R * .17, y - R * .08, R * .34, R * .16, R * .04); ctx.fill(); ctx.fillStyle = '#fff'; ctx.font = `bold ${R * .12}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(n, x, y + R * .005); }
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
export const STYLE = { dot: false, soft: true };
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

// ---- なめらか版：点つぶしをせず、こげ茶の縁取りと足もとの影をつける ----
const _sw = document.createElement('canvas'), _sil = document.createElement('canvas');
export function outlined(src, w = 6, color = [90, 58, 42], cut = 150) {
  const W = src.width, H = src.height; _sil.width = W; _sil.height = H;
  const s = _sil.getContext('2d', { willReadFrequently: true }); s.clearRect(0, 0, W, H); s.drawImage(src, 0, 0);
  const img = s.getImageData(0, 0, W, H), d = img.data;
  for (let i = 0; i < d.length; i += 4) { if (d[i + 3] < cut) d[i + 3] = 0; else { d[i] = color[0]; d[i + 1] = color[1]; d[i + 2] = color[2]; d[i + 3] = 255; } }
  s.putImageData(img, 0, 0);
  const out = document.createElement('canvas'); out.width = W; out.height = H; const o = out.getContext('2d');
  for (let a = 0; a < 16; a++) o.drawImage(_sil, Math.cos(a / 16 * 6.283) * w, Math.sin(a / 16 * 6.283) * w);
  o.drawImage(src, 0, 0); return out;
}
const _soft = document.createElement('canvas');
export function drawEnemySoft(ctx, id, cx, cy, R, t, fallback) {
  const S = 360; _soft.width = _soft.height = S; const b = _soft.getContext('2d'); b.clearRect(0, 0, S, S);
  if (!b.__num) { // 鎧の数字（指定数量など）は大きく、縁取りして読みやすく
    const ft = b.fillText.bind(b); b.__num = true;
    b.fillText = function (txt, x, y, mw) {
      if (/^[0-9][0-9,]*$/.test(String(txt))) { const f = this.font, m = f.match(/([0-9.]+)px/); if (m) { this.save(); this.font = f.replace(m[0], (parseFloat(m[0]) * 1.4).toFixed(1) + 'px'); this.lineJoin = 'round'; this.lineWidth = parseFloat(m[1]) * .32; this.strokeStyle = 'rgba(40,20,10,.95)'; this.strokeText(txt, x, y); this.fillStyle = '#fff'; ft(txt, x, y); this.restore(); return; } }
      return ft(txt, x, y, mw);
    };
  }
  drawEnemyHQ(b, id, 180, 190, 125, t, fallback);
  const k = R * 2.6 / S, cut = { hibana: 255, wisp: 255, kemurin: 200, steamdragon: 170 }[id] || 150;
  ctx.save(); ctx.fillStyle = 'rgba(30,40,70,.22)'; ctx.beginPath(); ctx.ellipse(cx, cy + R * 1.08, R * .62, R * .11, 0, 0, 7); ctx.fill(); ctx.restore();
  const img = cut >= 255 ? _soft : outlined(_soft, 8, [70, 44, 30], cut);
  ctx.save(); ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high'; ctx.drawImage(img, cx - S * k / 2, cy - S * k / 2 - R * .05, S * k, S * k); ctx.restore();
}
export function characterSoft(look, dir = 'down', fr = 0) {
  const c = document.createElement('canvas'); c.width = 256; c.height = 384;
  const x = c.getContext('2d'); x.save(); x.translate(128, 384); x.scale(.92, .92); x.translate(-128, -384 + 6); drawCharacter(x, 256, 384, look, dir, false, fr); x.restore();
  return outlined(c, 7, [80, 52, 38], 140);
}
