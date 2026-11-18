// 戦闘（仕様書 第4章）：コマンド選択式ターン制。毎回問題は出さない。
// 強い敵は「再生」と「予告→大技」を持ち、知識（たいさく・技）がないと勝てない。
import { el, sleep, rand, pick } from './util.js';
import { say, choose, ask, toast } from './ui.js';
import { drawEnemy } from './sprites.js';
import { drawEnemyHQ, drawBattleBg, STYLE, drawEnemyDot, drawBattleBgDot } from './art.js';
import { Learn } from './learn.js';

export class Battle {
  constructor(game) { this.g = game; }

  async run(enemyId, opt = {}) {
    const g = this.g, E = g.world.enemies[enemyId];
    this.e = { id: enemyId, ...E, mhp: E.hp, hp: E.hp, regen: E.regen,
      teleRate: E.tele, identified: false, broken: 0, tele: null, allies: [], calls: E.calls || [], turn: 0, used: new Set(), askedBoss: false };
    this.opt = opt; this.review = []; this.fled = false;
    this.party = g.state.party.map(id => g.state.members[id]); window.__battle = this; // 開発・テスト用
    this.mount();
    try {
      const prefix = opt.revived ? `倒したはずの${E.name}が復活した！` : `${E.name}があらわれた！`;
      await this.msg(prefix);
      if (opt.revived && opt.reviveQ) await this.revivalTrial(opt.reviveQ);
      if (opt.tutorial) await say([['ショウボウ老師', '「こうげき」で戦うのじゃ。敵が大技の構えを見せたら「たいさく」で知恵を使え！']]);
      const result = await this.loop();
      await this.after(result);
      return result;
    } finally { this.unmount(); }
  }

  // ---------- 画面 ----------
  mount() {
    const root = this.root = el('div', 'battle');
    this.cv = el('canvas', 'ecv'); root.appendChild(this.cv);
    this.status = el('div', 'pstat'); root.appendChild(this.status);
    this.log = el('div', 'blog win'); root.appendChild(this.log);
    this.g.ui.appendChild(root);
    const dpr = devicePixelRatio || 1; const w = Math.min(root.clientWidth || 360, 480);
    const hr = Math.min(.8, Math.max(.55, ((innerHeight || 700) - 420) / w)); this.cv.width = w * dpr; this.cv.height = w * hr * dpr; this.cv.style.width = w + 'px'; this.cv.style.height = w * hr + 'px';
    this.t = 0; this.flash = 0; this.shake = 0;
    const loop = () => { if (!this.root) return; this.t++; this.drawScene(); requestAnimationFrame(loop); }; requestAnimationFrame(loop);
    this.refresh();
  }
  unmount() { if (this.root) this.root.remove(); this.root = null; }
  drawScene() {
    const c = this.cv.getContext('2d'), W = this.cv.width, H = this.cv.height, e = this.e;
    const bk = this.g.field && this.g.field.map && this.g.field.map.dungeon ? 'fort' : this.g.field && /^field/.test(this.g.field.mapId) ? 'grass' : 'town';
    if (STYLE.dot) { if (!this._bg || this.t % 30 === 0) { this._bg = document.createElement('canvas'); this._bg.width = W; this._bg.height = H; drawBattleBgDot(this._bg.getContext('2d'), W, H, bk, this.t); } c.drawImage(this._bg, 0, 0); }
    else drawBattleBg(c, W, H, bk, this.t);
    if (e.hp > 0) {
      c.save(); if (this.shake > 0) { c.translate(rand(-6, 6), 0); this.shake--; }
      if (this.flash > 0) { c.globalAlpha = this.flash % 2 ? .3 : 1; this.flash--; }
      if (STYLE.dot) drawEnemyDot(c, e.id, W / 2, H * .52, H * .34, this.t, drawEnemy); else drawEnemyHQ(c, e.id, W / 2, H * .52, H * .34, this.t, drawEnemy); c.restore();
      e.allies.forEach((a, i) => { const x = W * (i % 2 ? .84 : .16), y = H * (.62 + Math.floor(i / 2) * .1); if (STYLE.dot) drawEnemyDot(c, a.id, x, y, H * .15, this.t + i * 7, drawEnemy); else drawEnemyHQ(c, a.id, x, y, H * .15, this.t, drawEnemy); });
    }
    c.fillStyle = 'rgba(0,0,0,.5)'; c.fillRect(W * .1, H * .04, W * .8, H * .12);
    c.fillStyle = '#fff'; c.font = `${Math.round(H * .07)}px sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle';
    const tags = [e.identified ? '見抜いた' : (e.regen ? '再生中' : ''), e.broken ? 'くずれた' : '', e.tele ? (e.tele.call ? '仲間呼び！' : '予告中！') : '', e.allies.length ? `仲間${e.allies.length}` : ''].filter(Boolean).join('・');
    const label = `${e.name}${tags ? '（' + tags + '）' : ''}`; let fs = Math.round(H * .07); c.font = `${fs}px sans-serif`;
    const tw = c.measureText(label).width; if (tw > W * .78) { fs = Math.floor(fs * W * .78 / tw); c.font = `${fs}px sans-serif`; }
    c.fillText(label, W / 2, H * .1);
    c.fillStyle = '#555'; c.fillRect(W * .2, H * .17, W * .6, H * .03); c.fillStyle = '#e64a3a'; c.fillRect(W * .2, H * .17, W * .6 * Math.max(0, e.hp) / e.mhp, H * .03);
  }
  refresh() {
    this.status.innerHTML = '';
    this.party.forEach(m => {
      const b = el('div', 'pm' + (m.hp <= 0 ? ' down' : '') + (m.hp > 0 && m.hp <= m.mhp * .3 ? ' low' : ''));
      b.appendChild(el('div', 'nm', m.name)); b.appendChild(el('div', '', `HP ${Math.max(0, m.hp)}/${m.mhp}`)); b.appendChild(el('div', '', `MP ${m.mp}/${m.mmp}`));
      this.status.appendChild(b);
    });
  }
  async msg(text, wait = 700) { this.log.textContent = text; this.refresh(); await sleep(wait); }

  // ---------- 本体 ----------
  alive() { return this.party.filter(m => m.hp > 0); }
  async loop() {
    while (true) {
      // 味方の行動を選ぶ
      const acts = [];
      for (const m of this.alive()) {
        const a = await this.command(m); if (a === 'flee-ok') return 'flee';
        if (a) acts.push([m, a]);
      }
      // 実行
      for (const [m, a] of acts) {
        if (m.hp <= 0 || this.e.hp <= 0) continue;
        await this.exec(m, a);
        if (this.e.hp <= 0) return 'win';
      }
      if (this.e.hp <= 0) return 'win';
      if (this.e.boss && !this.e.askedBoss && this.e.hp < this.e.mhp / 2) { await this.bossQuestion(); if (this.e.hp <= 0) return 'win'; }
      await this.enemyTurn();
      if (this.e.hp > 0) await this.allyTurn();
      if (!this.alive().length) return 'lose';
      if (this.e.hp <= 0) return 'win';
    }
  }

  async command(m) {
    this.log.textContent = `${m.name}はどうする？`; this.refresh();
    while (true) {
      const items = [{ label: 'こうげき', value: 'atk' }];
      const sk = this.g.state.skills.filter(s => this.g.world.skills[s].user === m.id);
      if (sk.length) items.push({ label: 'とくぎ', value: 'skill' });
      if (this.e.tele && !this.e.tele.answered) items.push({ label: '★たいさく', value: 'taisaku', note: '予告への対策' });
      items.push({ label: 'ぼうぎょ', value: 'def' });
      if (m.id === 'hero') { items.push({ label: 'どうぐ', value: 'item' }); items.push({ label: 'にげる', value: 'flee' }); }
      const v = await choose(`${m.name}のこうどう`, items, { cancel: false, cls: 'cmd' });
      if (v === 'taisaku') { await this.taisaku(m); return null; }
      if (v === 'skill') {
        const s = await choose('とくぎ', sk.map(id => { const S = this.g.world.skills[id]; return { label: S.name + (this.rustyFor(id) ? '（さび）' : ''), note: `MP${S.mp}`, value: id, disabled: m.mp < S.mp }; }));
        if (s) return { type: 'skill', id: s }; continue;
      }
      if (v === 'item') {
        const inv = this.g.state.items; const its = Object.keys(inv).filter(k => inv[k] > 0);
        if (!its.length) { toast('どうぐを持っていない'); continue; }
        const it = await choose('どうぐ', its.map(k => ({ label: this.g.world.items[k].name, note: `×${inv[k]}`, value: k })));
        if (!it) continue;
        const tgt = await choose('だれに？', this.alive().map(p => ({ label: p.name, note: `HP${p.hp}/${p.mhp} MP${p.mp}/${p.mmp}`, value: p.id })));
        if (!tgt) continue; return { type: 'item', id: it, tgt };
      }
      if (v === 'flee') {
        if (this.e.boss || this.opt.noFlee) { await this.msg('にげられない！', 600); continue; }
        if (Math.random() < .85) { await this.msg(`${m.name}たちはにげだした。`, 700); this.fled = true; return 'flee-ok'; }
        await this.msg('しかし、まわりこまれてしまった！', 700); return null;
      }
      return { type: v };
    }
  }

  dmg(m, mult = 1) {
    let d = m.atk * rand(.85, 1.15) - this.e.def / 2;
    if (this.e.identified) d *= 1.5; if (this.e.broken) d *= 2;
    return Math.max(1, Math.round(d * mult));
  }
  async hit(m, mult, label) {
    const e = this.e, d = this.dmg(m, mult); e.hp -= d; this.flash = 8;
    await this.msg(`${label || m.name + 'のこうげき！'} ${e.name}に${d}のダメージ！`, 800);
    // 強い敵は、正体を見抜かないと倒れない。ボスは、くずれた時しかとどめが通らない（第4-4節）
    if (e.hp <= 0 && e.regen > 0 && !e.identified) { e.hp = 1; await this.msg(`${e.name}は倒れない！ 正体を見抜かなければ、とどめはさせない……。`, 1100); }
    else if (e.hp <= 0 && e.boss && !e.broken) { e.hp = 1; await this.msg(`${e.name}はふみとどまった！ とどめは、くずれた時しか通らない……。`, 1100); }
  }
  async exec(m, a) {
    m.guard = false;
    if (a.type === 'atk') return this.hit(m, 1);
    if (a.type === 'def') { m.guard = true; return this.msg(`${m.name}は身を守っている。`, 500); }
    if (a.type === 'item') {
      const t = this.g.state.members[a.tgt]; const I = a.id; this.g.state.items[I]--;
      if (I === 'yakusou') { const h = Math.min(15, t.mhp - t.hp); t.hp += h; return this.msg(`${m.name}はやくそうを使った。${t.name}のHPが${h}回復！`); }
      if (I === 'mizu') { const h = Math.min(5, t.mmp - t.mp); t.mp += h; return this.msg(`${m.name}はまほうのみずを使った。${t.name}のMPが${h}回復！`); }
    }
    if (a.type === 'skill') return this.skill(m, a.id);
  }

  rustyFor(skillId) { const S = this.g.world.skills[skillId]; return S.kids.some(k => Learn.isDue(k)); }
  // さびた技：結びつく知識の五肢択一に答えると発動
  async rustCheck(skillId) {
    const S = this.g.world.skills[skillId];
    const due = S.kids.filter(k => Learn.isDue(k));
    if (!due.length) return true;
    const qs = this.g.questions.filter(q => due.includes(q.knowledge_id) && q.pool !== 'mock');
    const q = pick(qs.filter(x => x.kind === 'mcq5').length ? qs.filter(x => x.kind === 'mcq5') : qs);
    if (!q) return true;
    await this.msg(`「${S.name}」がさびついている……！ 知識を思い出せ！`, 900);
    const r = await this.askQ(q, 'rust', `技のさびを落とす：${S.name}`);
    if (r.correct) { await this.msg('さびが取れた！', 500); return true; }
    await this.msg(`しかし、${S.name}は不発に終わった……。`, 800); return false;
  }
  async skill(m, id) {
    const S = this.g.world.skills[id];
    if (m.mp < S.mp) return this.msg('MPが足りない！', 600);
    if (id === 'kikensatchi' && !this.e.tele) return this.msg('いまは予告が出ていない。（MPは使わなかった）', 800);
    if (id === 'miyaburu' && this.e.identified) return this.msg('もう正体は見抜いている。（MPは使わなかった）', 800);
    m.mp -= S.mp; this.refresh();
    await this.msg(`${m.name}は「${S.name}」を使った！`, 600);
    if (!(await this.rustCheck(id))) return;
    if (id === 'miyaburu') return this.identify();
    if (id === 'kikensatchi') { this.e.tele.guard = true; return this.msg('予告をよく読み取り、身構えた！（大技のダメージが半分になる）', 900); }
    if (id === 'houreichishiki') return this.hit(m, 2.5, 'ホアンが違反を指摘した！');
    if (id === 'suuryoukeisan') return this.hit(m, ['mimic', 'ogre'].includes(this.e.id) ? 3 : 2, '倍数を突いた！');
    if (id === 'kijunsokutei') return this.hit(m, this.e.area === 'D1' ? 2.5 : 1.5, '基準の数字で、守りのすきを突いた！');
    if (id === 'tetsuzuki') return this.hit(m, this.e.area === 'L2' ? 2.5 : 1.5, 'ホアンが手続きの違反を見抜いた！');
  }
  async identify() {
    const z = this.g.state.zukan[this.e.id] || (this.g.state.zukan[this.e.id] = {});
    const q = this.g.questions.find(x => x.id === 'ID-' + this.e.id);
    if (!q || z.identified) { // 正しく見抜いたことがある敵は自動（さびは技のチェックで確認済み）
      this.e.identified = true; await this.msg(`${this.e.name}の正体を見抜いた！ 再生が止まった！`, 900); return;
    }
    await this.msg('正体を見抜け！', 400);
    const r = await this.askQ(q, 'identify', `物質識別：${this.e.name}の正体は？`);
    if (r.correct) { this.e.identified = true; z.identified = true; z.weak = this.e.weak; await this.msg(`見抜いた！ 弱点は「${this.e.weak}」。再生が止まった！`, 1100); }
    else await this.msg('見抜けなかった……。', 700);
  }

  async taisaku(m) {
    const T = this.e.tele; T.answered = true;
    const r = await this.askQ(T.q, 'battle', `${m.name}のたいさく`, `この敵の弱点は「${this.e.weak}」に関わる知識。` + (this.g.state.party.includes('hoan') ? '（ホアンの助言）' : ''));
    T.ok = r.correct;
    this.log.textContent = r.correct ? '正しい対策をとった！' : '対策をまちがえた……！';
  }

  async askQ(q, mode, title, hintText) {
    const hero = this.g.state.members.hero;
    const text = q.hint || hintText;
    const r = await ask(q, { title, mode, hintText: text, hintLabel: q.kind === 'mcq5' ? 'ヒント' : 'ホアンに相談', hint: text ? { cost: 1, use: () => { if (hero.mp < 1) return false; hero.mp -= 1; this.refresh(); return true; } } : null });
    if (!r.correct || r.unsure || r.hint) this.review.push(q);
    this.g.combo(r.correct && !r.hint, q.topic);
    this.refresh(); return r;
  }

  async revivalTrial(q) {
    await this.msg(`${this.e.name}が問いかけてきた！`, 600);
    const r = await this.askQ(q, 'revive', '魔物の問いかけ');
    if (r.correct) { this.e.hp = Math.round(this.e.hp / 2); await this.msg(`見事な答えに、${this.e.name}はひるんだ！（HPが半分に）`, 1000); }
    else await this.msg(`${this.e.name}は力を取り戻した……！`, 800);
  }
  async bossQuestion() {
    this.e.askedBoss = true;
    const town = this.opt.town || 'L1';
    const pool = this.g.questions.filter(q => q.kind === 'mcq5' && q.town === town && !this.e.used.has(q.id));
    const q = pick(pool); if (!q) return;
    await this.msg(`${this.e.name}「この問いに答えられるか！」`, 900);
    const r = await this.askQ(q, 'battle', 'ボスの問いかけ');
    if (r.correct) { this.e.broken = 1; this.e.brokenFresh = true; await this.msg(`${this.e.name}はたじろいだ！ くずれた！（次の味方の攻撃はダメージ2倍）`, 900); }
    else { this.e.hp = Math.min(this.e.mhp, this.e.hp + 20); await this.msg(`${this.e.name}は高笑いし、HPを20回復した！`, 900); }
  }

  async enemyTurn() {
    const e = this.e; e.turn++;
    if (e.brokenFresh) e.brokenFresh = false; // 問いかけ直後：このターンは動き、次のターンに動けない
    else if (e.broken) { // くずれ：大技を防いだ（または問いかけに正解した）次のターンだけ行動できない
      e.broken = 0; await this.msg(`${e.name}はくずれて動けない！ ……体勢を立て直した。`, 900); return;
    }
    if (e.regen && !e.identified && e.hp < e.mhp) { const h = Math.min(e.regen, e.mhp - e.hp); e.hp += h; await this.msg(`${e.name}は再生した！ HPが${h}回復。`, 700); }
    if (e.tele) { // 予告していた大技
      const T = e.tele; e.tele = null;
      if (T.call) { // 仲間呼びの解決
        if (T.answered && T.ok) { await this.msg(`呼ばれた仲間は、正体を見破られて帰っていった！`, 1000); return; }
        if (!T.answered) this.review.push(T.q);
        const A = this.g.world.enemies[T.ally] || { name: '仲間' }; e.allies.push({ id: T.ally, name: A.name }); this.shake = 6;
        await this.msg(`${A.name}が仲間に加わった！ ${e.name}の攻撃が激しくなる……。`, 1000);
        await this.msg(`（正しい判断：${T.q.choices[T.q.answer]}）`, 1400); return;
      }
      if (T.answered && T.ok) { e.broken = 1; this.shake = 10; await this.msg(`${e.name}の大技を防いだ！ ${e.name}はくずれた！（次の味方の攻撃はダメージ2倍）`, 1100); return; }
      if (!T.answered) this.review.push(T.q);
      this.shake = 14;
      for (const m of this.alive()) {
        let d = Math.round(e.big * rand(.9, 1.1) * (T.guard ? .5 : 1) * (m.guard ? .75 : 1)); m.hp -= d;
      }
      await this.msg(`${e.name}の大技！ 味方全員に大ダメージ！`, 1000);
      const right = T.q.choices[T.q.answer];
      await this.msg(`（正しい対策：${right}）`, 1400);
      return;
    }
    // 仲間呼び（通常は4ターン目、ボスは7ターン目にも）
    if (e.calls.length && (e.turn === 4 || (e.boss && e.turn === 7))) {
      const qs = e.calls.map(id => this.g.qById[id]).filter(Boolean); let cand = qs.filter(q => !e.used.has(q.id)); if (!cand.length) cand = qs;
      const q = pick(cand); if (q) { e.used.add(q.id); e.tele = { q, answered: false, ok: false, guard: false, call: true, ally: q.ally };
        await say([[e.name + 'の仲間呼び', q.question]]); this.log.textContent = `${e.name}が仲間を呼んでいる！「★たいさく」で見破れば仲間は帰る。`; return; }
    }
    // 予告するか
    const willTele = e.pool && e.pool.length && (e.teleRate >= 1 ? e.turn % 3 === 2 : Math.random() < e.teleRate) || (this.opt.tutorial && e.turn === 1);
    if (willTele) {
      const qs = e.pool.map(id => this.g.qById[id]).filter(Boolean);
      let cand = qs.filter(q => !e.used.has(q.id)); if (!cand.length) cand = qs;
      const q = pick(cand); e.used.add(q.id);
      e.tele = { q, answered: false, ok: false, guard: false };
      await say([[e.name + 'の予告', q.question]]);
      this.log.textContent = `${e.name}が大技の構えをとっている！「★たいさく」で対策できる。`; return;
    }
    const tgt = pick(this.alive());
    let d = Math.max(1, Math.round(e.atk * rand(.85, 1.15) - tgt.def / 2)); if (tgt.guard) d = Math.ceil(d / 2);
    tgt.hp -= d; this.shake = 6;
    await this.msg(`${e.name}のこうげき！ ${tgt.name}は${d}のダメージを受けた。`, 800);
    if (tgt.hp <= 0) await this.msg(`${tgt.name}はたおれた……。`, 700);
  }

  async allyTurn() { // 加わった仲間の攻撃（主の半分の強さ）
    for (const a of this.e.allies) {
      if (!this.alive().length) return;
      const tgt = pick(this.alive()); let d = Math.max(1, Math.round(this.e.atk * .5 * rand(.85, 1.15) - tgt.def / 3)); if (tgt.guard) d = Math.ceil(d / 2);
      tgt.hp -= d; this.shake = 4; await this.msg(`${a.name}のこうげき！ ${tgt.name}は${d}のダメージを受けた。`, 700);
      if (tgt.hp <= 0) await this.msg(`${tgt.name}はたおれた……。`, 700);
    }
  }

  async after(result) {
    const g = this.g, e = this.e;
    this.party.forEach(m => { m.guard = false; });
    if (result === 'win') {
      await this.msg(`${e.name}をやっつけた！`, 800);
      const z = g.state.zukan[e.id] || (g.state.zukan[e.id] = {}); z.defeated = (z.defeated || 0) + 1; z.weak = z.weak || (e.identified ? e.weak : null);
      g.state.gold += e.gold; const ups = g.gainExp(e.exp);
      await this.msg(`${e.exp}の経験値と${e.gold}ゴールドを手に入れた。`, 1000);
      for (const u of ups) await this.msg(u, 1100);
    }
    this.party.forEach(m => { if (m.hp <= 0) m.hp = result === 'lose' ? 0 : 1; });
    // ふりかえり：誤り・迷い・ヒント・対策しなかった予告を1回やり直す（段階は変えない）
    const seen = new Set(); const list = this.review.filter(q => !seen.has(q.id) && seen.add(q.id));
    if (list.length && result !== 'flee') {
      this.unmount();
      await say([['ふりかえり', `いまの戦いで、まちがえた・迷った・ヒントを使った判断が${list.length}つある。もう一度確かめよう。`]]);
      for (const q of list) await ask(q, { title: 'ふりかえり', mode: 'furikaeri' });
    }
  }
}
