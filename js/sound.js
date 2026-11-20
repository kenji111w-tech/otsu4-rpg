// 音楽と効果音（ファイルを使わず、Web Audioでピコピコ音を鳴らす。曲はすべてオリジナル）
// 楽譜の書き方："音名オクターブ:長さ"（長さは8分音符の数）。r は休み。| は小節の区切り（読みやすさのためだけ）
import { store } from './util.js';

const NOTE = { C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, F: 5, 'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11 };
function parse(s) {
  return s.replace(/\|/g, ' ').trim().split(/\s+/).map(tok => {
    const [n, l] = tok.split(':'); const len = Number(l || 1);
    if (n === 'r') return [null, len];
    const m = n.match(/^([A-G][#b]?)(\d)$/); const midi = 12 * (Number(m[2]) + 1) + NOTE[m[1]];
    return [440 * Math.pow(2, (midi - 69) / 12), len];
  });
}
// ベースを8分音符で上下に刻む： roots は小節ごとの根音
const pump = (roots, pat = 'lhlhlhlh') => roots.split(/\s+/).map(r => { const m = r.match(/^([A-G][#b]?)(\d)$/); const hi = m[1] + (Number(m[2]) + 1); return [...pat].map(c => (c === 'l' ? r : hi) + ':1').join(' '); }).join(' | ');
const drums = (bars, pat) => Array(bars).fill(pat).join('');

const T = {
  title: { tempo: 100, lead: 'G4:2 C5:2 E5:2 G5:2 | F5:3 E5:1 D5:4 | E5:2 F5:2 G5:2 A5:2 | G5:6 r:2 | A5:2 G5:2 F5:2 E5:2 | D5:2 E5:2 F5:4 | E5:2 D5:2 C5:2 B4:2 | C5:6 r:2',
    bass: 'C3:4 G2:4 | F2:4 G2:4 | C3:4 F2:4 | C3:4 G2:4 | F2:4 C3:4 | G2:4 D3:4 | A2:4 G2:4 | C3:4 C2:4' },
  village: { tempo: 84, lead: 'F4:2 A4:2 C5:3 A4:1 | Bb4:2 A4:2 G4:4 | G4:2 Bb4:2 D5:3 C5:1 | A4:6 r:2 | F4:2 A4:2 C5:3 D5:1 | C5:2 Bb4:2 A4:4 | G4:2 A4:2 Bb4:2 G4:2 | F4:6 r:2',
    bass: 'F2:4 C3:4 | Bb2:4 F2:4 | G2:4 D3:4 | F2:4 C3:4 | F2:4 C3:4 | A2:4 F2:4 | C3:4 C2:4 | F2:8' },
  town_law: { tempo: 112, lead: 'C5:1 C5:1 G4:2 C5:2 E5:2 | D5:2 C5:2 B4:2 G4:2 | A4:1 A4:1 F4:2 A4:2 C5:2 | B4:2 A4:2 G4:4 | C5:1 C5:1 G4:2 C5:2 E5:2 | F5:2 E5:2 D5:2 C5:2 | D5:2 G4:2 B4:2 D5:2 | C5:6 r:2',
    bass: 'C3:2 G2:2 C3:2 G2:2 | G2:2 D3:2 G2:2 D3:2 | F2:2 C3:2 F2:2 C3:2 | G2:2 D3:2 G2:4 | C3:2 G2:2 C3:2 G2:2 | F2:2 C3:2 F2:2 C3:2 | G2:2 D3:2 G2:2 B2:2 | C3:4 C2:4' },
  town_chem: { tempo: 104, lead: 'A4:1 C5:1 E5:1 A5:1 G#5:2 E5:2 | F5:2 E5:2 D5:2 C5:2 | B4:1 D5:1 F5:1 B5:1 A5:2 F5:2 | E5:6 r:2 | A4:1 C5:1 E5:1 A5:1 B5:2 G#5:2 | A5:2 E5:2 C5:2 A4:2 | D5:2 F5:2 E5:2 G#4:2 | A4:6 r:2',
    bass: 'A2:4 E2:4 | D2:4 A2:4 | B1:4 E2:4 | E2:8 | A2:4 E2:4 | F2:4 C3:4 | D2:4 E2:4 | A2:8' },
  town_haz: { tempo: 120, lead: 'D5:2 D5:1 F5:1 A5:2 G5:2 | F5:2 E5:2 D5:2 A4:2 | Bb4:2 Bb4:1 D5:1 F5:2 E5:2 | D5:2 C#5:2 A4:4 | D5:2 D5:1 F5:1 A5:2 C6:2 | Bb5:2 A5:2 G5:2 F5:2 | E5:2 G5:2 C#5:2 E5:2 | D5:6 r:2',
    bass: pump('D2 D2 Bb1 A1 D2 G1 A1 D2', 'lhlhlhlh') },
  field: { tempo: 132, lead: 'G4:2 B4:1 D5:1 G5:3 F#5:1 | E5:2 D5:2 B4:2 D5:2 | C5:2 E5:1 G5:1 C6:3 B5:1 | A5:6 r:2 | B5:2 A5:1 G5:1 F#5:2 G5:2 | E5:2 D5:2 C5:2 B4:2 | A4:2 B4:1 C5:1 D5:2 F#4:2 | G4:6 r:2',
    bass: 'G2:2 D3:2 G2:2 D3:2 | E2:2 B2:2 G2:2 B2:2 | C2:2 G2:2 C3:2 G2:2 | D2:2 A2:2 D3:2 A2:2 | G2:2 D3:2 E2:2 B2:2 | C2:2 G2:2 G2:2 D3:2 | D2:2 A2:2 D2:2 F#2:2 | G2:4 G1:4',
    drum: drums(8, 'k.h.s.h.') },
  dungeon: { tempo: 92, lead: 'E4:3 G4:1 F#4:2 r:2 | E4:2 B3:2 C4:4 | D4:3 F#4:1 E4:2 r:2 | D#4:6 r:2 | E4:3 G4:1 A4:2 B4:2 | C5:2 B4:2 A4:4 | G4:2 F#4:2 E4:2 D#4:2 | E4:6 r:2',
    bass: 'E2:8 | A1:8 | B1:8 | B1:8 | E2:8 | A1:8 | B1:8 | E2:8', drum: drums(8, 'k.......') },
  battle: { tempo: 160, lead: 'A4:1 A4:1 C5:1 E5:1 A5:2 G5:1 E5:1 | F5:2 E5:1 D5:1 E5:4 | G4:1 G4:1 B4:1 D5:1 G5:2 F5:1 D5:1 | E5:2 D5:1 C5:1 B4:4 | A4:1 A4:1 C5:1 E5:1 A5:2 B5:1 C6:1 | B5:2 A5:1 G5:1 F5:2 E5:2 | D5:1 E5:1 F5:1 D5:1 E5:2 G#4:2 | A4:4 r:2 E5:2',
    bass: pump('A2 F2 G2 E2 A2 F2 D2 A2'), drum: drums(8, 'k.h.s.hh') },
  boss: { tempo: 150, lead: 'C5:1 C5:1 C5:1 Eb5:1 G5:2 F#5:2 | G5:1 F5:1 Eb5:1 D5:1 C5:4 | Ab4:1 Ab4:1 Ab4:1 C5:1 Eb5:2 D5:2 | B4:2 D5:2 G4:4 | C5:1 C5:1 C5:1 Eb5:1 G5:2 Bb5:2 | Ab5:2 G5:2 F5:2 Eb5:2 | D5:2 F5:2 B4:2 D5:2 | C5:4 G4:2 B4:2',
    bass: pump('C2 C2 Ab1 G1 C2 F1 G1 C2'), drum: drums(8, 'k.hks.hs') },
  final: { tempo: 170, lead: 'D5:1 F5:1 A5:1 D6:1 C#6:2 A5:2 | Bb5:1 A5:1 G5:1 F5:1 E5:2 A4:2 | Bb4:1 D5:1 F5:1 Bb5:1 A5:2 F5:2 | G5:1 F5:1 E5:1 D5:1 C#5:4 | D5:1 F5:1 A5:1 D6:1 E6:2 C#6:2 | D6:2 A5:2 F5:2 D5:2 | G5:2 E5:2 A5:2 C#5:2 | D5:4 A4:2 C#5:2',
    bass: pump('D2 G1 Bb1 A1 D2 Bb1 A1 D2'), drum: drums(8, 'kshskshs') },
  sad: { tempo: 72, lead: 'E5:3 D5:1 C5:2 B4:2 | A4:4 E4:4 | F4:3 G4:1 A4:2 C5:2 | B4:6 r:2 | E5:3 D5:1 C5:2 E5:2 | A5:4 G5:2 F5:2 | E5:2 D5:2 C5:2 B4:2 | A4:6 r:2',
    bass: 'A2:8 | A2:8 | F2:8 | E2:8 | A2:8 | F2:8 | G2:8 | A2:8' },
  ending: { tempo: 96, lead: 'E5:2 G5:2 C6:3 B5:1 | A5:2 G5:2 E5:4 | F5:2 A5:2 G5:3 E5:1 | D5:6 r:2 | E5:2 G5:2 C6:3 D6:1 | E6:2 D6:2 C6:2 A5:2 | G5:2 F5:2 E5:2 D5:2 | C5:6 r:2',
    bass: 'C3:4 G2:4 | F2:4 C3:4 | F2:4 G2:4 | G2:8 | C3:4 E3:4 | A2:4 F2:4 | G2:8 | C3:8' },
  // 短いジングル（くり返さない）
  victory: { tempo: 150, once: true, lead: 'G4:1 C5:1 E5:1 G5:3 E5:1 G5:1 C6:6', bass: 'C3:3 G2:3 C3:8' },
  levelup: { tempo: 160, once: true, lead: 'C5:1 E5:1 G5:1 C6:3', bass: 'C3:6' },
  inn: { tempo: 110, once: true, lead: 'E5:2 D5:2 C5:2 G4:2 A4:2 B4:2 C5:6', bass: 'C3:6 G2:6 C3:6' },
};

export const Sound = {
  ctx: null, cur: null, timer: null, prefs: { bgm: true, se: true },
  init() {
    try { Object.assign(this.prefs, store.get('sound') || {}); } catch (e) {}
    const unlock = () => { this.ensure(); if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume(); };
    addEventListener('pointerdown', unlock, true); addEventListener('touchend', unlock, true);
    document.addEventListener('visibilitychange', () => { if (!this.ctx) return; document.hidden ? this.ctx.suspend() : this.ctx.resume(); });
  },
  ensure() {
    if (this.ctx) return true;
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return false;
    try {
      this.ctx = new AC(); this.master = this.ctx.createGain(); this.master.gain.value = 0.5; this.master.connect(this.ctx.destination);
      this.bgmGain = this.ctx.createGain(); this.bgmGain.gain.value = 0.55; this.bgmGain.connect(this.master);
      this.seGain = this.ctx.createGain(); this.seGain.gain.value = 0.8; this.seGain.connect(this.master);
      const len = this.ctx.sampleRate * 0.3, buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate), d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1; this.noise = buf;
      if (this.want) { const w = this.want; this.want = null; this.bgm(w); }
      return true;
    } catch (e) { this.ctx = null; return false; }
  },
  save() { store.set('sound', this.prefs); },
  setBgm(on) { this.prefs.bgm = on; this.save(); if (!on) this.stop(); else if (this.lastBgm) { const n = this.lastBgm; this.lastBgm = null; this.bgm(n); } },
  setSe(on) { this.prefs.se = on; this.save(); },
  tone(freq, t, dur, type, vol, dest) {
    const o = this.ctx.createOscillator(), g = this.ctx.createGain(); o.type = type; o.frequency.value = freq;
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + 0.008); g.gain.setValueAtTime(vol * 0.8, t + Math.max(0.01, dur * 0.6)); g.gain.linearRampToValueAtTime(0, t + dur);
    o.connect(g); g.connect(dest); o.start(t); o.stop(t + dur + 0.02);
  },
  hit(kind, t, dest) { // 打楽器：k=キック h=ハイハット s=スネア
    if (kind === 'k') { const o = this.ctx.createOscillator(), g = this.ctx.createGain(); o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(40, t + 0.12); g.gain.setValueAtTime(0.5, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.15); o.connect(g); g.connect(dest); o.start(t); o.stop(t + 0.16); return; }
    const s = this.ctx.createBufferSource(), g = this.ctx.createGain(), f = this.ctx.createBiquadFilter(); s.buffer = this.noise;
    f.type = 'highpass'; f.frequency.value = kind === 'h' ? 7000 : 1500; const v = kind === 'h' ? 0.08 : 0.18, d = kind === 'h' ? 0.04 : 0.12;
    g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.001, t + d); s.connect(f); f.connect(g); g.connect(dest); s.start(t); s.stop(t + d + 0.01);
  },
  // 曲を鳴らす（同じ曲なら何もしない）。once の曲は終わったら then を鳴らす
  bgm(name, then) {
    const tr = T[name]; if (!tr) return;
    if (!tr.once) { if (this.cur && this.cur.name === name && !this.cur.once) return; this.lastBgm = name; if (this.cur && this.cur.once) { this.after = name; return; } }
    if (!this.prefs.bgm) return;
    if (!this.ctx) { if (!tr.once) this.want = name; return; }
    this.stop(); if (!tr.once) this.lastBgm = name;
    const eighth = 60 / tr.tempo / 2, t0 = this.ctx.currentTime + 0.06;
    const voices = [{ notes: parse(tr.lead), type: 'square', vol: 0.11, gate: 0.85 }, { notes: parse(tr.bass), type: 'triangle', vol: 0.22, gate: 0.9 }]
      .map(v => ({ ...v, i: 0, t: t0, total: v.notes.reduce((a, n) => a + n[1], 0) }));
    const dr = tr.drum ? { pat: tr.drum, i: 0, t: t0 } : null;
    const cur = this.cur = { name, once: !!tr.once, gain: this.ctx.createGain() }; cur.gain.connect(this.bgmGain);
    const loopLen = voices[0].total * eighth;
    const tick = () => {
      if (this.cur !== cur) return;
      const until = this.ctx.currentTime + 0.25;
      let done = true;
      for (const v of voices) {
        while (v.t < until && (v.i < v.notes.length || !tr.once)) {
          if (v.i >= v.notes.length) { if (tr.once) break; v.i = 0; }
          const [f, len] = v.notes[v.i++]; const d = len * eighth;
          if (f) this.tone(f, v.t, d * v.gate, v.type, v.vol, cur.gain); v.t += d;
        }
        if (v.i < v.notes.length || !tr.once) done = false;
      }
      if (dr) while (dr.t < until) { const c = dr.pat[dr.i % dr.pat.length]; if (c !== '.') this.hit(c, dr.t, cur.gain); dr.i++; dr.t += eighth; }
      if (tr.once && done) { clearInterval(this.timer); this.timer = null; const endAt = Math.max(...voices.map(v => v.t)); setTimeout(() => { if (this.cur === cur) { this.cur = null; const nx = this.after || then; this.after = null; if (nx) this.bgm(nx); } }, Math.max(0, (endAt - this.ctx.currentTime) * 1000)); }
    };
    tick(); this.timer = setInterval(tick, 50);
    return loopLen;
  },
  // ジングルを鳴らしてから、元の曲にもどる
  jingle(name, back) { if (back) this.lastBgm = back; if (!this.prefs.bgm || !this.ctx) return; this.after = null; this.bgm(name, back || this.lastBgm); },
  stop() {
    if (this.timer) { clearInterval(this.timer); this.timer = null; }
    if (this.cur && this.ctx) { const g = this.cur.gain; g.gain.setValueAtTime(g.gain.value, this.ctx.currentTime); g.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.15); setTimeout(() => { try { g.disconnect(); } catch (e) {} }, 400); }
    this.cur = null;
  },
  // 効果音
  se(name) {
    if (!this.prefs.se || !this.ensure() || this.ctx.state !== 'running') return;
    const t = this.ctx.currentTime + 0.01, g = this.seGain;
    const seq = (notes, type = 'square', vol = 0.14, step = 0.07) => notes.forEach((f, i) => this.tone(f, t + i * step, step * 0.95, type, vol, g));
    if (name === 'ok') seq([1046.5, 1568]);                      // 正解：ピコーン
    else if (name === 'ng') seq([196, 165], 'square', 0.12, 0.12); // 不正解：低い音
    else if (name === 'crit') seq([784, 1046.5, 1318.5, 1568], 'square', 0.13, 0.05); // 会心
    else if (name === 'hit') this.hit('s', t, g);
    else if (name === 'heal') seq([523.3, 659.3, 784, 1046.5], 'triangle', 0.2, 0.08);
  },
};
