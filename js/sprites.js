// キャラクター・敵・地形をコードで描く（画像ファイルは使わない。すべてオリジナル）
const OUT = '#1b1b24';

// ---- 人物（16×16の格子に描く） ----
export const LOOKS = {
  hero:     { hair: '#7a4a24', skin: '#f3c99f', cloth: '#2f6fd6', cloth2: '#1d3f8a', accent: '#f0c419', style: 'spiky' },
  roshi:    { hair: '#eeeeee', skin: '#e8b98f', cloth: '#b8322a', cloth2: '#7a1d18', accent: '#f0c419', style: 'bald', beard: '#f4f4f4' },
  hoan:     { hair: '#22252e', skin: '#f3c99f', cloth: '#2b3550', cloth2: '#1a2033', accent: '#ffffff', style: 'neat', glasses: true, scroll: true },
  kemi:     { hair: '#d86f2a', skin: '#f6d2b0', cloth: '#7b48b8', cloth2: '#4b2a78', accent: '#7fe0d0', style: 'hood', flask: true },
  sekiyu:   { hair: '#2b1b10', skin: '#d99a6c', cloth: '#e07a1f', cloth2: '#8a4a12', accent: '#3a3a3a', style: 'band', big: true },
  villager: { hair: '#5a3a20', skin: '#f0c49a', cloth: '#4a9a4a', cloth2: '#2e6a2e', accent: '#d8c8a0', style: 'neat' },
  villager2:{ hair: '#3a2a20', skin: '#e3b088', cloth: '#a0704a', cloth2: '#6a4a2e', accent: '#d8c8a0', style: 'band' },
  child:    { hair: '#c08030', skin: '#f6d2b0', cloth: '#e05a7a', cloth2: '#a03a55', accent: '#fff', style: 'spiky', small: true },
  captain:  { hair: '#222', skin: '#e3b088', cloth: '#c0392b', cloth2: '#333', accent: '#f0c419', style: 'helmet' },
};

export function drawPerson(ctx, x, y, size, lookKey, dir = 'down', step = 0) {
  const L = typeof lookKey === 'string' ? LOOKS[lookKey] : lookKey;
  const u = size / 16;
  const r = (cx, cy, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(Math.round(x + cx * u), Math.round(y + cy * u), Math.ceil(w * u), Math.ceil(h * u)); };
  const sm = L.small ? 1 : 0, bg = L.big ? 1 : 0;
  // 影
  ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.beginPath(); ctx.ellipse(x + 8 * u, y + 15.3 * u, 5 * u, 1.2 * u, 0, 0, 7); ctx.fill();
  // 足
  const lg = step ? 1 : 0;
  r(5 - bg, 13 - lg, 2 + bg, 2 + lg, OUT); r(9, 13 - (1 - lg), 2 + bg, 2 + (1 - lg), OUT);
  // 体
  r(3 - bg, 8 + sm, 10 + bg * 2, 6 - sm, OUT); r(4 - bg, 8 + sm, 8 + bg * 2, 5 - sm, L.cloth);
  r(4 - bg, 11, 8 + bg * 2, 2, L.cloth2); r(7, 8 + sm, 2, 5 - sm, L.accent === '#fff' || L.accent === '#ffffff' ? L.accent : L.cloth2);
  r(4 - bg, 11, 8 + bg * 2, 1, L.accent);
  // 腕
  r(2 - bg, 9 + sm, 2, 3, L.cloth); r(12 + bg, 9 + sm, 2, 3, L.cloth); r(2 - bg, 12, 2, 1, L.skin); r(12 + bg, 12, 2, 1, L.skin);
  // 頭
  const hy = sm ? 2 : 1;
  r(4, hy + 1, 8, 7, OUT); r(5, hy + 2, 6, 5, L.skin);
  if (dir !== 'up') {
    const ex = dir === 'left' ? -1 : dir === 'right' ? 1 : 0;
    r(6 + ex, hy + 4, 1, 1, OUT); r(9 + ex, hy + 4, 1, 1, OUT);
    if (L.glasses) { r(5 + ex, hy + 4, 3, 1, '#9ad'); r(8 + ex, hy + 4, 3, 1, '#9ad'); r(6 + ex, hy + 4, 1, 1, OUT); r(9 + ex, hy + 4, 1, 1, OUT); }
    if (L.beard) { r(5, hy + 6, 6, 3, L.beard); r(6, hy + 9, 4, 1, L.beard); }
  } else r(5, hy + 2, 6, 5, L.hair);
  // 髪
  const h = L.hair;
  if (L.style === 'spiky') { r(4, hy, 8, 3, h); r(3, hy + 1, 2, 2, h); r(11, hy + 1, 2, 2, h); r(5, hy - 1, 2, 1, h); r(9, hy - 1, 2, 1, h); }
  else if (L.style === 'neat') { r(4, hy, 8, 3, h); r(4, hy + 2, 1, 3, h); r(11, hy + 2, 1, 3, h); }
  else if (L.style === 'bald') { r(4, hy + 2, 1, 3, h); r(11, hy + 2, 1, 3, h); r(5, hy + 1, 6, 1, '#d9a87e'); }
  else if (L.style === 'hood') { r(3, hy, 10, 3, L.cloth2); r(3, hy + 2, 2, 6, L.cloth2); r(11, hy + 2, 2, 6, L.cloth2); r(5, hy + 2, 6, 1, h); }
  else if (L.style === 'band') { r(4, hy, 8, 3, h); r(4, hy + 2, 8, 1, '#d33'); }
  else if (L.style === 'helmet') { r(3, hy - 1, 10, 4, L.cloth); r(3, hy + 2, 10, 1, L.accent); r(7, hy - 1, 2, 2, L.accent); }
  // 持ち物
  if (L.scroll) { r(12, 10, 3, 3, '#f5e6b8'); r(12, 10, 3, 1, '#b08040'); }
  if (L.flask) { r(1, 9, 2, 3, '#7fe0d0'); r(1, 8, 2, 1, '#ddd'); }
  if (L.big) { r(0, 10, 2, 4, '#555'); }
}

// ---- 地形タイル ----
export function drawTile(ctx, ch, x, y, s, t = 0, extra = {}) {
  const f = (c, a = 0, b = 0, w = s, h = s) => { ctx.fillStyle = c; ctx.fillRect(x + a, y + b, w, h); };
  const night = extra.night;
  switch (ch) {
    case '.': f('#6bbf59'); f('#5aa94a', s * .2, s * .3, s * .12, s * .12); f('#5aa94a', s * .65, s * .7, s * .12, s * .12); break;
    case 'F': f('#6bbf59'); ['#f6d', '#ff5', '#f66'].forEach((c, i) => f(c, s * (.2 + i * .25), s * (.3 + (i % 2) * .3), s * .14, s * .14)); break;
    case '=': f('#d8c08a'); f('#c9ae74', s * .1, s * .5, s * .2, s * .1); f('#c9ae74', s * .6, s * .2, s * .2, s * .1); break;
    case 'T': f('#6bbf59'); ctx.fillStyle = '#7a5230'; ctx.fillRect(x + s * .42, y + s * .6, s * .16, s * .35);
      ctx.fillStyle = '#2f7d32'; ctx.beginPath(); ctx.arc(x + s / 2, y + s * .42, s * .38, 0, 7); ctx.fill();
      ctx.fillStyle = '#3f9a42'; ctx.beginPath(); ctx.arc(x + s * .42, y + s * .34, s * .18, 0, 7); ctx.fill(); break;
    case '~': f('#3b7dd8'); f('#6aa5ee', s * ((t % 4) * .2), s * .3, s * .3, s * .08); f('#6aa5ee', s * (((t + 2) % 4) * .2), s * .7, s * .3, s * .08); break;
    case 'B': f('#3b7dd8'); f('#a0703a', 0, s * .1, s, s * .8); for (let i = 0; i < 4; i++) f('#7a5228', 0, s * (.1 + i * .2), s, s * .03); break;
    case '#': f('#8d8d99'); f('#a7a7b2', 1, 1, s / 2 - 2, s / 2 - 2); f('#a7a7b2', s / 2 + 1, s / 2 + 1, s / 2 - 2, s / 2 - 2); break;
    case 'R': f('#b5523b'); for (let i = 0; i < 3; i++) f('#9a3f2c', 0, s * (i * .33 + .28), s, s * .06); break;
    case 'W': f('#8a6a44'); f('#6a4e30', 0, 0, s, s * .2); f('#a8865a', s * .15, s * .35, s * .3, s * .5); f('#a8865a', s * .55, s * .35, s * .3, s * .5); break;
    case 'D': f('#d8c08a'); f('#5a3a1e', s * .2, s * .05, s * .6, s * .9); f('#f0c419', s * .65, s * .5, s * .08, s * .08); break;
    case 'X': f('#3a3530'); f('#20201c', s * .1, s * .2, s * .5, s * .2); f('#5a4a3a', s * .5, s * .6, s * .4, s * .15); f('#e06a2a', s * .3, s * .7, s * .06, s * .06); break;
    case 'S': f('#d8c08a'); break;
    default: f('#000');
  }
  if (night) { ctx.fillStyle = 'rgba(10,20,60,.45)'; ctx.fillRect(x, y, s, s); }
}
export function drawStageMark(ctx, x, y, s, t, cleared) {
  const bob = Math.sin(t / 4) * s * .06;
  ctx.fillStyle = cleared ? '#9a9a9a' : '#e53935';
  ctx.beginPath(); ctx.arc(x + s / 2, y + s * .42 + bob, s * .3, 0, 7); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.font = `bold ${Math.round(s * .45)}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(cleared ? '✓' : '!', x + s / 2, y + s * .44 + bob);
}

// ---- 敵（中心 cx,cy、大きさ R） ----
function eye(ctx, x, y, r, look = 0) { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill(); ctx.fillStyle = OUT; ctx.beginPath(); ctx.arc(x + look * r * .3, y + r * .15, r * .5, 0, 7); ctx.fill(); }
function blob(ctx, cx, cy, R, color, light) {
  ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(cx - R, cy + R * .6);
  ctx.quadraticCurveTo(cx - R * 1.05, cy - R * .5, cx, cy - R); ctx.quadraticCurveTo(cx + R * 1.05, cy - R * .5, cx + R, cy + R * .6);
  ctx.quadraticCurveTo(cx, cy + R * .85, cx - R, cy + R * .6); ctx.fill();
  if (light) { ctx.fillStyle = light; ctx.beginPath(); ctx.ellipse(cx - R * .4, cy - R * .45, R * .18, R * .28, -.5, 0, 7); ctx.fill(); }
}
export const ENEMY_DRAW = {
  kemurin(ctx, cx, cy, R, t) {
    for (let i = 0; i < 6; i++) { const a = i / 6 * 6.28 + t / 20; ctx.fillStyle = i % 2 ? '#8e8e98' : '#a9a9b3'; ctx.beginPath(); ctx.arc(cx + Math.cos(a) * R * .45, cy + Math.sin(a) * R * .3, R * .45, 0, 7); ctx.fill(); }
    ctx.fillStyle = '#b8b8c2'; ctx.beginPath(); ctx.arc(cx, cy, R * .5, 0, 7); ctx.fill();
    eye(ctx, cx - R * .2, cy - R * .05, R * .12); eye(ctx, cx + R * .2, cy - R * .05, R * .12);
    ctx.strokeStyle = OUT; ctx.lineWidth = R * .05; ctx.beginPath(); ctx.arc(cx, cy + R * .15, R * .12, .2, 2.9); ctx.stroke();
  },
  hibana(ctx, cx, cy, R, t) {
    ctx.fillStyle = '#ffd23a'; ctx.beginPath();
    for (let i = 0; i < 16; i++) { const a = i / 16 * 6.28 + t / 15, rr = i % 2 ? R * .45 : R * (.9 + .1 * Math.sin(t / 3 + i)); ctx.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); }
    ctx.fill(); ctx.fillStyle = '#ff8a1e'; ctx.beginPath(); ctx.arc(cx, cy, R * .42, 0, 7); ctx.fill();
    eye(ctx, cx - R * .15, cy - R * .05, R * .1); eye(ctx, cx + R * .15, cy - R * .05, R * .1);
  },
  nazono(ctx, cx, cy, R, t) {
    const hue = (t * 3) % 360;
    blob(ctx, cx, cy + R * .1, R, `hsl(${hue},55%,55%)`, 'rgba(255,255,255,.5)');
    ctx.fillStyle = 'rgba(255,255,255,.9)'; ctx.font = `bold ${R * .7}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('?', cx, cy + R * .15);
    eye(ctx, cx - R * .35, cy - R * .2, R * .12); eye(ctx, cx + R * .35, cy - R * .2, R * .12);
  },
  niselabel(ctx, cx, cy, R, t) {
    blob(ctx, cx, cy + R * .1, R, '#58c06a', 'rgba(255,255,255,.45)');
    ctx.save(); ctx.translate(cx + R * .1, cy + R * .25); ctx.rotate(-.15);
    ctx.fillStyle = '#f7f1dc'; ctx.fillRect(-R * .45, -R * .2, R * .9, R * .4); ctx.strokeStyle = '#a33'; ctx.lineWidth = R * .04; ctx.strokeRect(-R * .45, -R * .2, R * .9, R * .4);
    ctx.fillStyle = '#a33'; ctx.font = `bold ${R * .22}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('灯油?', 0, 0); ctx.restore();
    eye(ctx, cx - R * .3, cy - R * .3, R * .13, Math.sin(t / 10)); eye(ctx, cx + R * .3, cy - R * .3, R * .13, Math.sin(t / 10));
  },
  hakarin(ctx, cx, cy, R, t) {
    const tilt = Math.sin(t / 12) * .25;
    ctx.fillStyle = '#b48a3a'; ctx.fillRect(cx - R * .08, cy - R * .6, R * .16, R * 1.3); ctx.fillRect(cx - R * .5, cy + R * .65, R, R * .15);
    ctx.save(); ctx.translate(cx, cy - R * .6); ctx.rotate(tilt);
    ctx.fillStyle = '#d4a840'; ctx.fillRect(-R * .9, -R * .05, R * 1.8, R * .1);
    [-1, 1].forEach(sd => { ctx.strokeStyle = '#8a6a2a'; ctx.lineWidth = R * .03; ctx.beginPath(); ctx.moveTo(sd * R * .8, 0); ctx.lineTo(sd * R * .8 - R * .2, R * .45); ctx.moveTo(sd * R * .8, 0); ctx.lineTo(sd * R * .8 + R * .2, R * .45); ctx.stroke();
      ctx.fillStyle = '#e6c25a'; ctx.beginPath(); ctx.ellipse(sd * R * .8, R * .47, R * .28, R * .08, 0, 0, 7); ctx.fill(); });
    ctx.restore();
    ctx.fillStyle = '#d4a840'; ctx.beginPath(); ctx.arc(cx, cy - R * .1, R * .32, 0, 7); ctx.fill();
    eye(ctx, cx - R * .12, cy - R * .14, R * .09); eye(ctx, cx + R * .12, cy - R * .14, R * .09);
  },
  mimic(ctx, cx, cy, R, t) {
    const open = (Math.sin(t / 6) + 1) * .12 + .08;
    ctx.fillStyle = '#8a5a2b'; ctx.fillRect(cx - R, cy - R * .1, R * 2, R * .9);
    ctx.fillStyle = '#5a1e1e'; ctx.fillRect(cx - R * .9, cy - R * .1 - R * open * 2, R * 1.8, R * open * 2);
    ctx.fillStyle = '#fff'; for (let i = 0; i < 7; i++) { ctx.beginPath(); ctx.moveTo(cx - R * .85 + i * R * .26, cy - R * .1); ctx.lineTo(cx - R * .72 + i * R * .26, cy - R * .1 - R * .15); ctx.lineTo(cx - R * .6 + i * R * .26, cy - R * .1); ctx.fill(); }
    ctx.save(); ctx.translate(cx, cy - R * .1 - R * open * 2); ctx.fillStyle = '#9a6a35'; ctx.fillRect(-R, -R * .5, R * 2, R * .5); ctx.fillStyle = '#e0b030'; ctx.fillRect(-R, -R * .3, R * 2, R * .08); ctx.restore();
    ctx.fillStyle = '#e0b030'; ctx.fillRect(cx - R, cy + R * .3, R * 2, R * .08); ctx.fillRect(cx - R * .1, cy + R * .1, R * .2, R * .3);
    eye(ctx, cx - R * .4, cy - R * .05 - R * open * 2 - R * .25, R * .1); eye(ctx, cx + R * .4, cy - R * .05 - R * open * 2 - R * .25, R * .1);
  },
  ogre(ctx, cx, cy, R, t) {
    const b = Math.sin(t / 8) * R * .03;
    ctx.fillStyle = '#6b7a3a'; ctx.beginPath(); ctx.ellipse(cx, cy + R * .25 + b, R * .7, R * .65, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#7d8c45'; ctx.beginPath(); ctx.arc(cx, cy - R * .5 + b, R * .38, 0, 7); ctx.fill();
    ctx.fillStyle = '#eee'; ctx.beginPath(); ctx.moveTo(cx - R * .25, cy - R * .8 + b); ctx.lineTo(cx - R * .18, cy - R * 1.05 + b); ctx.lineTo(cx - R * .1, cy - R * .8 + b); ctx.fill();
    ctx.beginPath(); ctx.moveTo(cx + R * .25, cy - R * .8 + b); ctx.lineTo(cx + R * .18, cy - R * 1.05 + b); ctx.lineTo(cx + R * .1, cy - R * .8 + b); ctx.fill();
    eye(ctx, cx - R * .14, cy - R * .55 + b, R * .08); eye(ctx, cx + R * .14, cy - R * .55 + b, R * .08);
    ctx.fillStyle = '#3a2a1a'; ctx.fillRect(cx - R * .15, cy - R * .35 + b, R * .3, R * .05);
    // 樽
    ctx.fillStyle = '#9a6a35'; ctx.fillRect(cx + R * .45, cy - R * .2 + b, R * .5, R * .7); ctx.fillStyle = '#555'; ctx.fillRect(cx + R * .45, cy - R * .05 + b, R * .5, R * .06); ctx.fillRect(cx + R * .45, cy + R * .3 + b, R * .5, R * .06);
    ctx.fillStyle = '#f7f1dc'; ctx.fillRect(cx + R * .52, cy + R * .05 + b, R * .36, R * .2); ctx.fillStyle = '#a33'; ctx.font = `bold ${R * .12}px sans-serif`; ctx.textAlign = 'center'; ctx.fillText('仮', cx + R * .7, cy + R * .2 + b);
    ctx.fillStyle = '#5a3a20'; ctx.fillRect(cx - R * .55, cy + R * .45 + b, R * 1.1, R * .12);
  },
  // ---- 以降は設定画（今後の章） ----
  salamander(ctx, cx, cy, R, t) {
    ctx.fillStyle = '#d2452a'; ctx.beginPath(); ctx.ellipse(cx, cy + R * .2, R * .8, R * .35, 0, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.ellipse(cx - R * .75, cy, R * .3, R * .22, -.3, 0, 7); ctx.fill();
    ctx.strokeStyle = '#d2452a'; ctx.lineWidth = R * .14; ctx.beginPath(); ctx.moveTo(cx + R * .7, cy + R * .2); ctx.quadraticCurveTo(cx + R * 1.1, cy - R * .2, cx + R * .9, cy - R * .5); ctx.stroke();
    for (let i = 0; i < 5; i++) { ctx.fillStyle = i % 2 ? '#ffb02e' : '#ff6a1e'; ctx.beginPath(); ctx.arc(cx - R * .4 + i * R * .2, cy - R * .2 - Math.abs(Math.sin(t / 5 + i)) * R * .2, R * .12, 0, 7); ctx.fill(); }
    eye(ctx, cx - R * .85, cy - R * .05, R * .08);
  },
  wisp(ctx, cx, cy, R, t) {
    const g = ctx.createRadialGradient(cx, cy, 2, cx, cy, R); g.addColorStop(0, 'rgba(190,220,255,.9)'); g.addColorStop(1, 'rgba(120,160,255,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, R, 0, 7); ctx.fill();
    ctx.fillStyle = 'rgba(150,190,255,.6)'; ctx.beginPath(); ctx.moveTo(cx - R * .4, cy + R * .3); ctx.quadraticCurveTo(cx, cy - R * 1.2, cx + R * .4, cy + R * .3); ctx.fill();
    eye(ctx, cx - R * .15, cy, R * .07); eye(ctx, cx + R * .15, cy, R * .07);
  },
  steamdragon(ctx, cx, cy, R, t) {
    ctx.fillStyle = 'rgba(200,200,210,.85)';
    for (let i = 0; i < 8; i++) { ctx.beginPath(); ctx.ellipse(cx - R + i * R * .28, cy + R * .4 + Math.sin(t / 6 + i) * R * .05, R * .3, R * .18, 0, 0, 7); ctx.fill(); }
    ctx.fillStyle = '#7d8aa0'; ctx.beginPath(); ctx.moveTo(cx - R * .9, cy + R * .3); ctx.quadraticCurveTo(cx - R * .2, cy - R * .2, cx + R * .5, cy - R * .1); ctx.lineTo(cx + R * .95, cy - R * .25); ctx.lineTo(cx + R * .6, cy + R * .1); ctx.quadraticCurveTo(cx, cy + R * .2, cx - R * .9, cy + R * .45); ctx.fill();
    eye(ctx, cx + R * .65, cy - R * .18, R * .07);
  },
  trialde(ctx, cx, cy, R, t) {
    ['#d33', '#ec8', '#fa3'].forEach((c, i) => { const a = -1.9 + i * .6; ctx.strokeStyle = '#702'; ctx.lineWidth = R * .16; ctx.beginPath(); ctx.moveTo(cx, cy + R * .4); ctx.lineTo(cx + Math.cos(a) * R * .8, cy + Math.sin(a) * R * .8); ctx.stroke();
      ctx.fillStyle = c; ctx.beginPath(); ctx.arc(cx + Math.cos(a) * R * .85, cy + Math.sin(a) * R * .85, R * .22, 0, 7); ctx.fill(); eye(ctx, cx + Math.cos(a) * R * .85, cy + Math.sin(a) * R * .85, R * .06); });
    ctx.fillStyle = '#902'; ctx.beginPath(); ctx.ellipse(cx, cy + R * .5, R * .5, R * .35, 0, 0, 7); ctx.fill();
  },
  mutodoke(ctx, cx, cy, R, t) {
    ctx.fillStyle = '#3a2a5a'; ctx.beginPath(); ctx.moveTo(cx - R * .6, cy + R * .9); ctx.lineTo(cx - R * .4, cy - R * .2); ctx.lineTo(cx + R * .4, cy - R * .2); ctx.lineTo(cx + R * .6, cy + R * .9); ctx.fill();
    ctx.fillStyle = '#c9a0dc'; ctx.beginPath(); ctx.arc(cx, cy - R * .45, R * .3, 0, 7); ctx.fill();
    ctx.fillStyle = '#e0b030'; ctx.fillRect(cx - R * .32, cy - R * .85, R * .64, R * .18);
    eye(ctx, cx - R * .1, cy - R * .48, R * .06); eye(ctx, cx + R * .1, cy - R * .48, R * .06);
    ctx.fillStyle = '#f7f1dc'; ctx.save(); ctx.translate(cx + R * .6, cy + R * .1); ctx.rotate(.3); ctx.fillRect(-R * .2, -R * .25, R * .4, R * .5); ctx.fillStyle = '#a33'; ctx.font = `${R * .14}px sans-serif`; ctx.textAlign = 'center'; ctx.fillText('無届', 0, 0); ctx.restore();
  },
  enjou(ctx, cx, cy, R, t) {
    for (let i = 0; i < 9; i++) { const a = -3.14 + i / 8 * 3.14; ctx.fillStyle = i % 2 ? '#ff6a1e' : '#ffb02e'; ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * R * .3, cy + Math.sin(a) * R * .3); ctx.lineTo(cx + Math.cos(a) * R * (1 + .1 * Math.sin(t / 4 + i)), cy + Math.sin(a) * R); ctx.lineTo(cx + Math.cos(a + .2) * R * .3, cy + Math.sin(a + .2) * R * .3); ctx.fill(); }
    ctx.fillStyle = '#3a0a0a'; ctx.beginPath(); ctx.arc(cx, cy, R * .45, 0, 7); ctx.fill();
    ctx.fillStyle = '#e0b030'; ctx.beginPath(); ctx.moveTo(cx - R * .35, cy - R * .4); for (let i = 0; i < 5; i++) ctx.lineTo(cx - R * .35 + i * R * .175, cy - R * (i % 2 ? .55 : .75)); ctx.lineTo(cx + R * .35, cy - R * .4); ctx.fill();
    ctx.fillStyle = '#ff3'; ctx.beginPath(); ctx.arc(cx - R * .15, cy - R * .05, R * .07, 0, 7); ctx.arc(cx + R * .15, cy - R * .05, R * .07, 0, 7); ctx.fill();
  },
};
export function drawEnemy(ctx, id, cx, cy, R, t = 0) { (ENEMY_DRAW[id] || ENEMY_DRAW.kemurin)(ctx, cx, cy, R, t); }
