// タイトル画面（3つの案）。A：炎の紋章　B：三つの国　C：勇者たち
import { el } from './util.js';
import { drawPerson } from './sprites.js';

export const TITLE_STYLES = { A: '炎の紋章', B: '三つの国', C: '勇者たち' };

const FLAME = `<svg viewBox="0 0 120 150" class="emblem"><defs>
  <radialGradient id="fg1" cx="50%" cy="70%" r="60%"><stop offset="0" stop-color="#fff6c0"/><stop offset=".45" stop-color="#ffb43a"/><stop offset="1" stop-color="#e2401c"/></radialGradient>
  <linearGradient id="sh" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffe9a0"/><stop offset="1" stop-color="#b8862a"/></linearGradient></defs>
  <path d="M60 4 L112 26 L104 96 Q96 128 60 146 Q24 128 16 96 L8 26 Z" fill="#2a1830" stroke="url(#sh)" stroke-width="5"/>
  <path class="fl" d="M60 30 C72 52 88 62 84 92 C82 112 70 122 60 122 C48 122 36 112 36 94 C36 78 46 72 48 58 C54 66 56 74 58 80 C62 64 58 46 60 30 Z" fill="url(#fg1)"/>
  <path class="fl2" d="M60 74 C66 86 72 92 70 104 C68 114 64 118 60 118 C55 118 50 113 50 105 C50 96 56 92 60 74 Z" fill="#fff6c0" opacity=".85"/>
  <text x="60" y="140" text-anchor="middle" font-size="13" font-weight="800" fill="#ffe9a0">乙 4</text></svg>`;

const LAND = `<svg viewBox="0 0 390 260" preserveAspectRatio="xMidYMax slice" class="land">
  <path d="M0 170 Q60 130 120 160 T250 150 T390 140 V260 H0 Z" fill="#3b2f5c"/>
  <rect x="290" y="40" width="26" height="120" fill="#2a2046"/><path d="M286 44 L303 14 L320 44 Z" fill="#2a2046"/>
  <rect x="298" y="70" width="10" height="12" fill="#ffcf6a" class="win"/><rect x="298" y="100" width="10" height="12" fill="#ffcf6a" class="win"/>
  <path d="M0 200 Q80 170 170 195 T390 185 V260 H0 Z" fill="#241d3d"/>
  <g fill="#1a1530"><rect x="40" y="180" width="34" height="26"/><path d="M36 182 L57 164 L78 182 Z"/><rect x="90" y="186" width="28" height="22"/><path d="M86 188 L104 172 L122 188 Z"/></g>
  <rect x="50" y="190" width="8" height="8" fill="#ffcf6a" class="win"/><rect x="100" y="194" width="7" height="7" fill="#ffcf6a" class="win"/></svg>`;

function crests() {
  return `<div class="crests">${[['法', '法令の国', '#4a7bd6'], ['化', '物理・化学の国', '#3aa874'], ['危', '危険物の国', '#d6503a']]
    .map(([c, n, col]) => `<div class="crest"><div class="cc" style="background:${col}">${c}</div><div class="cn">${n}</div></div>`).join('')}</div>`;
}

// 火の粉が舞う・星がまたたく背景（canvas）
function particles(cv, kind) {
  const ctx = cv.getContext('2d'); let W = 0, H = 0, raf = 0; const P = [];
  const fit = () => { const r = cv.getBoundingClientRect(); W = cv.width = r.width * devicePixelRatio; H = cv.height = r.height * devicePixelRatio; };
  fit(); const n = kind === 'star' ? 60 : 45;
  for (let i = 0; i < n; i++) P.push({ x: Math.random(), y: Math.random(), v: .0006 + Math.random() * .0016, s: 1 + Math.random() * 2.2, p: Math.random() * 6.28 });
  const step = t => {
    if (!cv.isConnected) return cancelAnimationFrame(raf);
    ctx.clearRect(0, 0, W, H);
    for (const q of P) {
      if (kind === 'star') { const a = .4 + .6 * Math.abs(Math.sin(t / 900 + q.p)); ctx.fillStyle = `rgba(255,250,220,${a})`; ctx.fillRect(q.x * W, q.y * H * .6, q.s * devicePixelRatio * .8, q.s * devicePixelRatio * .8); continue; }
      q.y -= q.v; q.x += Math.sin(t / 700 + q.p) * .0005; if (q.y < -.02) { q.y = 1.02; q.x = Math.random(); }
      const a = Math.min(1, q.y * 1.4); ctx.fillStyle = `rgba(255,${150 + Math.floor(q.p * 15)},60,${a})`;
      ctx.beginPath(); ctx.arc(q.x * W, q.y * H, q.s * devicePixelRatio, 0, 6.28); ctx.fill();
    }
    raf = requestAnimationFrame(step);
  };
  raf = requestAnimationFrame(step);
}

function party(cv) {
  const ctx = cv.getContext('2d'); const r = cv.getBoundingClientRect(); cv.width = r.width * devicePixelRatio; cv.height = r.height * devicePixelRatio;
  ctx.imageSmoothingEnabled = false; const size = Math.floor(cv.height * .9), gap = size * 1.05, x0 = (cv.width - gap * 3 - size) / 2;
  ['hoan', 'hero', 'kemi', 'sekiyu'].forEach((k, i) => drawPerson(ctx, x0 + i * gap, (i === 1 ? 0 : size * .08), size, k, 'down', 0));
}

export function makeTitle(style, verText) {
  const t = el('div', 'titlescr t' + style);
  if (style === 'A') {
    t.innerHTML = `<canvas class="fx"></canvas><div class="glow"></div>${FLAME}<div class="logo">乙4 RPG</div><div class="ribbon">～危険物の世界～</div><div class="ver">${verText}</div>`;
    requestAnimationFrame(() => particles(t.querySelector('.fx'), 'ember'));
  } else if (style === 'B') {
    t.innerHTML = `<canvas class="fx"></canvas>${LAND}<div class="logo">乙4 RPG</div><div class="sub">～危険物の世界～</div>${crests()}<div class="ver">${verText}</div>`;
    requestAnimationFrame(() => particles(t.querySelector('.fx'), 'star'));
  } else {
    t.innerHTML = `<canvas class="fx"></canvas><div class="banner"><div class="logo">乙4 RPG</div><div class="sub">～危険物の世界～</div></div><canvas class="party"></canvas><div class="ground"></div><div class="ver">${verText}</div>`;
    requestAnimationFrame(() => { particles(t.querySelector('.fx'), 'ember'); party(t.querySelector('.party')); });
  }
  return t;
}
