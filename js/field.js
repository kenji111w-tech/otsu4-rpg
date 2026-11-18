// フィールド・町の表示と移動（Canvas）
import { drawTile, drawPerson, drawStageMark } from './sprites.js';

const VIEW = 13; // 表示するマス数（縦横）
const BLOCK = new Set(['T', '~', '#', 'R', 'W', 'X']);
const DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0], ul: [-1, -1], ur: [1, -1], dl: [-1, 1], dr: [1, 1] };
const FACE = { ul: 'left', dl: 'left', ur: 'right', dr: 'right' };

export class Field {
  constructor(canvas, world, hooks) {
    this.cv = canvas; this.ctx = canvas.getContext('2d'); this.world = world; this.hooks = hooks;
    this.t = 0; this.busy = false; this.dir = 'down'; this.held = null; this.anim = null; this.party = ['hero'];
    this.resize(); addEventListener('resize', () => this.resize());
    const loop = () => { this.t++; this.draw(); requestAnimationFrame(loop); }; requestAnimationFrame(loop);
    setInterval(() => { if (this.held && !this.anim && !this.busy) this.step(this.held); }, 60);
  }
  resize() {
    const w = Math.min(this.cv.parentElement.clientWidth, 480);
    const ts = Math.floor(w / VIEW); const dpr = devicePixelRatio || 1;
    this.ts = ts * dpr; this.cv.width = this.cv.height = ts * VIEW * dpr; this.cv.style.width = this.cv.style.height = ts * VIEW + 'px';
  }
  load(mapId, x, y) { this.mapId = mapId; this.map = this.world.maps[mapId]; this.x = x; this.y = y; this.anim = null; }
  tile(x, y) { const r = this.map.tiles[y]; return r ? (r[x] || '#') : '#'; }
  npcAt(x, y) { return (this.map.npcs || []).find(n => n.x === x && n.y === y); }
  eventAt(x, y) { return (this.map.events || []).find(e => e.x === x && e.y === y); }
  canWalk(x, y) {
    const c = this.tile(x, y); if (BLOCK.has(c)) return false; if (this.npcAt(x, y)) return false;
    const ev = this.eventAt(x, y);
    if (ev && ev.type === 'stage' && !this.hooks.stageVisible(ev.id)) return true;
    return true;
  }
  step(d) {
    if (this.busy || this.anim) return;
    this.dir = FACE[d] || d; const [dx, dy] = DIRS[d]; const nx = this.x + dx, ny = this.y + dy;
    if (!this.canWalk(nx, ny)) return; if (dx && dy && (!this.canWalk(this.x + dx, this.y) || !this.canWalk(this.x, this.y + dy))) return;
    this.anim = { fx: this.x, fy: this.y, t0: performance.now(), dur: 150 };
    this.x = nx; this.y = ny;
    setTimeout(() => { this.anim = null; this.arrive(); }, 150);
  }
  async arrive() {
    const ev = this.eventAt(this.x, this.y);
    if (ev && (ev.type !== 'stage' || this.hooks.stageVisible(ev.id))) { this.held = null; this.busy = true; await this.hooks.onEvent(ev); this.busy = false; return; }
    if (this.map.encounter) {
      const c = this.tile(this.x, this.y); const rate = c === '.' ? 1 / 12 : c === ',' ? 1 / 10 : c === '=' ? 1 / 40 : 0;
      if (Math.random() < rate) { this.held = null; this.busy = true; await this.hooks.onEncounter(); this.busy = false; }
    }
  }
  async action() {
    if (this.busy || this.anim) return;
    const [dx, dy] = DIRS[this.dir]; const n = this.npcAt(this.x + dx, this.y + dy);
    if (n) { this.busy = true; await this.hooks.onTalk(n); this.busy = false; return; }
    const ev = this.eventAt(this.x + dx, this.y + dy);
    if (ev && ev.type === 'building') { this.busy = true; await this.hooks.onEvent(ev); this.busy = false; }
  }
  draw() {
    if (!this.map) return;
    const ctx = this.ctx, ts = this.ts;
    let px = this.x, py = this.y;
    if (this.anim) { const k = Math.min(1, (performance.now() - this.anim.t0) / this.anim.dur); px = this.anim.fx + (this.x - this.anim.fx) * k; py = this.anim.fy + (this.y - this.anim.fy) * k; }
    const ox = px - (VIEW - 1) / 2, oy = py - (VIEW - 1) / 2;
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, this.cv.width, this.cv.height);
    const night = this.hooks.isNight && this.hooks.isNight();
    for (let j = -1; j <= VIEW; j++) for (let i = -1; i <= VIEW; i++) {
      const mx = Math.floor(ox) + i, my = Math.floor(oy) + j; const c = this.tile(mx, my);
      const sx = Math.round((mx - ox) * ts), sy = Math.round((my - oy) * ts);
      const fill = (c === '#' && (mx < 0 || my < 0 || my >= this.map.tiles.length || mx >= this.map.tiles[0].length)) ? (this.map.encounter || this.mapId === 'village' ? 'T' : '#') : c;
      drawTile(ctx, fill, sx, sy, ts + 1, Math.floor(this.t / 20), { night });
      const ev = this.eventAt(mx, my);
      if (ev && ev.type === 'stage' && this.hooks.stageVisible(ev.id)) drawStageMark(ctx, sx, sy, ts, this.t, this.hooks.stageCleared(ev.id));
      if (ev && ev.type === 'building') { ctx.fillStyle = 'rgba(0,0,0,.65)'; const lw = ts * 1.6; ctx.fillRect(sx + ts / 2 - lw / 2, sy - ts * .45, lw, ts * .38); ctx.fillStyle = '#fff'; ctx.font = `${Math.round(ts * .28)}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(ev.label, sx + ts / 2, sy - ts * .26); }
    }
    (this.map.npcs || []).forEach(n => drawPerson(ctx, Math.round((n.x - ox) * ts), Math.round((n.y - oy) * ts), ts, n.look, 'down', Math.floor(this.t / 40) % 2));
    // パーティーは1列で表示（主人公＋仲間1人まで）
    const walking = this.anim ? Math.floor(this.t / 6) % 2 : 0;
    if (this.party[1]) {
      const [dx, dy] = DIRS[this.dir]; drawPerson(ctx, Math.round((px - dx * .9 - ox) * ts), Math.round((py - dy * .9 - oy) * ts), ts, this.party[1], this.dir, walking);
    }
    drawPerson(ctx, Math.round((px - ox) * ts), Math.round((py - oy) * ts), ts, 'hero', this.dir, walking);
    // 地名
    ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.fillRect(0, 0, this.cv.width, ts * .55); ctx.fillStyle = '#fff'; ctx.font = `${Math.round(ts * .32)}px sans-serif`; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillText(this.map.name, ts * .2, ts * .28);
  }
}
