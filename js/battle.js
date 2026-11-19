// 戦闘（仕様書 第4章・0.8で変更）：クイズ形式のコマンドバトル。
// こちらの行動（たたかう・じゅもん・とくぎ）も、敵の攻撃も、問題に答えて決まる。
// 強い敵の「再生」、ボスの「くずれ」、予告→大技、仲間呼びはそのまま。
import { el, sleep, rand, pick, shuffle } from './util.js';
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
      if (E.look && !opt.revived && !((this.g.state.zukan[this.e.id] || {}).defeated)) await say(E.look);
      if (opt.revived && opt.reviveQ) await this.revivalTrial(opt.reviveQ);
      this.weak = (E.boss || E.midboss) ? this.weakQs() : [];
      if (window.__log && (E.boss || E.midboss)) window.__log.push('weakpool:' + this.weak.length);
      if (this.weak.length) await say([[this.g.guide(), `気をつけて。この章で${this.g.state.name}さんが苦手だった問題も、ぶつけてくるみたい。`]]);
      if (opt.tutorial) await say([['ショウボウ老師', '戦いは「知恵くらべ」じゃ。「たたかう」を選ぶと問題が出る。正しく答えれば攻撃が当たる。'], ['ショウボウ老師', '敵が攻撃してくる時も問題が出る。正しく答えれば受け流せる。すばやく正しく答えれば、かわしてミスにできるぞ。'], ['ショウボウ老師', '敵が「力を溜めている」時は大技の前ぶれじゃ。次の問題に正しく答えれば、大技は不発に終わる！']]);
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
    const bk = this.g.field && this.g.field.map && this.g.field.map.dungeon ? (this.g.field.map.theme === 'pass' ? 'grass' : 'fort') : this.g.field && /^field/.test(this.g.field.mapId) ? 'grass' : 'town';
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
      this.party.forEach(p => { p.guard = false; });
      const leader = this.alive().find(m => m.id === 'hero') || this.alive()[0]; // 問題に答えるのは主人公（倒れたら仲間）
      { const a = await this.command(leader); if (a === 'flee-ok') return 'flee'; if (a) acts.push([leader, a]); }
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
      const items = [{ label: 'たたかう', value: 'atk', note: '3択' }, { label: 'じゅもん', value: 'spell', note: '5択・MP2', disabled: m.mp < 2 }];
      const users = this.alive().map(p => p.id);
      const sk = this.g.state.skills.filter(s => users.includes(this.g.world.skills[s].user));
      if (sk.length) items.push({ label: 'とくぎ', value: 'skill' });
      items.push({ label: 'ぼうぎょ', value: 'def', note: '問題なし' });
      items.push({ label: 'どうぐ', value: 'item' }); items.push({ label: 'にげる', value: 'flee' });
      const v = await choose(`${m.name}のこうどう`, items, { cancel: false, cls: 'cmd' });
      if (v === 'skill') {
        const s = await choose('とくぎ', sk.map(id => { const S = this.g.world.skills[id]; const u = this.g.state.members[S.user]; return { label: S.name + (this.rustyFor(id) ? '（さび）' : ''), note: `${u.name} MP${S.mp}`, value: id, disabled: u.mp < S.mp }; }));
        if (s) return { type: 'skill', id: s }; continue;
      }
      if (v === 'item') {
        const inv = this.g.state.items; const its = Object.keys(inv).filter(k => inv[k] > 0 && k !== 'keshi');
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
    if (a.type === 'atk') return this.quizAttack(m);
    if (a.type === 'spell') return this.spell(m);
    if (a.type === 'def') { this.party.forEach(p => { p.guard = true; }); return this.msg(`${m.name}たちは身を守っている。（次の受け流しは、正解すればかならずミスになる）`, 900); }
    if (a.type === 'item') {
      const t = this.g.state.members[a.tgt]; const I = a.id; this.g.state.items[I]--;
      if (I === 'yakusou') { const h = Math.min(15, t.mhp - t.hp); t.hp += h; return this.msg(`${m.name}はやくそうを使った。${t.name}のHPが${h}回復！`); }
      if (I === 'jouyaku') { const h = Math.min(40, t.mhp - t.hp); t.hp += h; return this.msg(`${m.name}は上やくそうを使った。${t.name}のHPが${h}回復！`); }
      if (I === 'mizu') { const h = Math.min(5, t.mmp - t.mp); t.mp += h; return this.msg(`${m.name}はまほうのみずを使った。${t.name}のMPが${h}回復！`); }
    }
    if (a.type === 'skill') return this.skill(m, a.id);
  }

  // ---------- 出題 ----------
  // 教わったことだけを出す：クリア済みの事件・いま挑んでいる事件・導入の問題（仕様書 4-8）
  taught(q) {
    if (q.pool === 'mock' || q.call || q.topic === 'identify') return false;
    if (q.town === 'V0') return true;
    const cl = this.g.state.cleared, id = `${q.town}-${q.stage}`;
    return !!(cl[id] || this.opt.stageId === id);
  }
  // ボス・中ボス用：この章で「まちがえた・迷った・ヒントを使った・答えるのが遅かった」問題（ユーザー要望 2026-11-19）
  weakQs() {
    const ch = a => /^[LDQ]/.test(a || '') ? 1 : /^P/.test(a || '') ? 2 : /^H/.test(a || '') ? 3 : 0, my = ch(this.e.area), seen = {};
    for (const a of Learn.d.answers) {
      const q = this.g.qById[a.qid]; if (!q || q.call || q.topic === 'identify' || q.pool === 'mock' || ch(q.town) !== my) continue;
      const slow = a.ms > (q.question.length > 60 ? 28000 : 20000);
      const bad = !a.correct || a.unsure || a.hint || slow;
      seen[q.id] = (seen[q.id] || 0) + (bad ? 1 : -.5); // 最近は正解できている問題は下げる
    }
    return Object.entries(seen).filter(([, v]) => v > 0).sort((x, y) => y[1] - x[1]).slice(0, 12).map(([id]) => this.g.qById[id]).filter(q => this.taught(q));
  }
  pickQ(kinds, prefer) {
    if (this.weak && this.weak.length && Math.random() < .5) { // ボスでは、苦手な問題を半分くらい混ぜる
      const w = this.weak.filter(q => kinds.includes(q.kind) && !this.e.used.has(q.id));
      if (w.length) { const q = pick(w); this.e.used.add(q.id); return q; }
    }
    const e = this.e, all = this.g.questions.filter(q => kinds.includes(q.kind) && this.taught(q));
    let cand = all.filter(q => !e.used.has(q.id)); if (!cand.length) cand = all;
    const area = cand.filter(q => q.town === e.area), pref = prefer ? cand.filter(prefer) : [];
    const due = cand.filter(q => Learn.isDue(q.knowledge_id)); // 復習の時期が来た知識を、半分くらいの確率で優先して出す
    const q = pick(pref.length ? pref : due.length && Math.random() < .5 ? due : area.length && Math.random() < .75 ? area : cand) || pick(this.g.questions.filter(x => x.town === 'V0'));
    if (q) e.used.add(q.id); return q;
  }
  three(q) { // 5択を、正解＋まちがい2つの3択にする（たたかう・受け流し用）
    if (q.choices.length <= 3) return q;
    const wrong = shuffle(q.choices.map((c, i) => i).filter(i => i !== q.answer)).slice(0, 2), idx = [q.answer, ...wrong];
    return { ...q, kind: 'mcq3', choices: idx.map(i => q.choices[i]), choice_explanations: idx.map(i => (q.choice_explanations || [])[i] || ''), answer: 0, shuffle: 'all' };
  }
  fast(r, q) { return r.correct && !r.unsure && !r.hint && r.dms < (q.question.length > 60 ? 12000 : 8000); }

  async quizAttack(m) {
    const q = this.three(this.pickQ(['mcq5', 'situation']));
    const r = await this.askQ(q, 'battle', `${m.name}のこうげき：正しいものは？`);
    if (!r.correct) { this.combo = 0; return this.msg(`${m.name}のこうげき！ ……しかし、はずれた！`, 800); }
    this.combo = (this.combo || 0) + 1;
    const crit = this.fast(r, q), mult = (crit ? 1.6 : 1) * (1 + Math.min(3, this.combo - 1) * .15);
    await this.hit(m, mult, crit ? `すばやい正解！ ${m.name}の会心の一撃！` : (this.combo > 1 ? `${this.combo}連続正解！ ${m.name}のこうげき！` : null));
    return this.followUp(m);
  }
  async spell(m) {
    if (m.mp < 2) return this.msg('MPが足りない！', 600);
    m.mp -= 2; this.refresh();
    await this.msg(`${m.name}は知恵の呪文をとなえた！`, 500);
    const q = this.pickQ(['mcq5']) || this.pickQ(['situation']);
    const r = await this.askQ(q, 'battle', '知恵の呪文：本番と同じ5択');
    if (!r.correct) { this.combo = 0; return this.msg('呪文は不発に終わった……。', 800); }
    this.combo = (this.combo || 0) + 1;
    await this.hit(m, 2.2, `呪文が炸裂した！`);
    return this.followUp(m);
  }
  async followUp(m) { // 正解すると、仲間が追い打ち
    for (const p of this.alive()) {
      if (p === m || this.e.hp <= 0) continue;
      const bonus = (p.id === 'hoan' && /^[LDQ]/.test(this.e.area || '')) || (p.id === 'kemi' && /^P/.test(this.e.area || '')) || (p.id === 'sekiyu' && /^H/.test(this.e.area || '')) ? .9 : .6;
      await this.hit(p, bonus, `${p.name}の追い打ち！`);
    }
  }

  rustyFor(skillId) { const S = this.g.world.skills[skillId]; return S.kids.some(k => Learn.isDue(k)); }
  // さびた技：結びつく知識の五肢択一に答えると発動
  async rustCheck(skillId) {
    const S = this.g.world.skills[skillId];
    const due = S.kids.filter(k => Learn.isDue(k));
    if (!due.length && skillId === 'miyaburu') return true; // みやぶるは、このあと正体の問題が出る
    if (!due.length) { // さびていなくても、技は問題に正解して発動する
      const q = this.three(this.pickQ(['mcq5', 'situation'], x => S.kids.includes(x.knowledge_id)));
      const r = await this.askQ(q, 'battle', `${S.name}：正しいものは？`);
      if (r.correct) return true;
      await this.msg(`しかし、${S.name}は不発に終わった……。`, 800); return false;
    }
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
    m = this.g.state.members[S.user] || m; // MPは技の持ち主が使う
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
    if (id === 'unpantenken') return this.hit(m, this.e.area === 'D2' ? 2.5 : 1.5, 'ホアンが運び方の違反を指摘した！');
    if (id === 'joubunkanpa') return this.hit(m, this.e.area === 'D3' ? 2.5 : 1.5, '条文を突きつけた！');
    if (id === 'nenshoubunseki') return this.hit(m, /^P/.test(this.e.area || '') ? 2.5 : 1.5, 'ケミが燃え方を分析して、弱点を突いた！');
    if (id === 'netsukeisan') { const cool = this.e.tele && !this.e.tele.call; if (cool) this.e.tele = null; await this.hit(m, 2, 'ケミが熱を計算して、冷ました！'); if (cool && this.e.hp > 0) await this.msg('大技の溜めが冷めて、止まった！', 800); return; }
    if (id === 'chuuwa') { for (const pid of this.g.state.party) { const pm = this.g.state.members[pid]; if (pm.hp > 0) pm.hp = Math.min(pm.mhp, pm.hp + Math.ceil(pm.mhp * .15)); } this.refresh(); return this.hit(m, 2, '化学の知恵で弱点を突き、仲間の体も落ち着いた！（HP少し回復）'); }
    if (id === 'tankanokaiten') { await this.hit(m, 2, 'セキユが油の知恵で、敵の守りをひっくり返した！'); if (this.e.hp > 0) { this.e.broken = 1; this.e.brokenFresh = true; await this.msg(`${this.e.name}はくずれた！（次の味方の攻撃はダメージ2倍）`, 800); } return; }
    if (id === 'shoukanochie') return this.hit(m, /^P/.test(this.e.area || '') ? 2.5 : 1.5, '火事に合った消し方で、弱点を突いた！');
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
    const inv = this.g.state.items;
    const r = await ask(q, { title, mode, hintText: text, hintLabel: q.kind === 'mcq5' ? 'ヒント' : `${this.g.guide()}に相談`, hint: text ? { cost: 1, use: () => { if (hero.mp < 1) return false; hero.mp -= 1; this.refresh(); return true; } } : null,
      erase: { left: () => inv.keshi || 0, use: () => { if (!(inv.keshi > 0)) return false; inv.keshi--; return true; } } });
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
    const wk = (this.weak || []).filter(q => q.kind === 'mcq5' && !this.e.used.has(q.id));
    const pool = wk.length ? wk : this.g.questions.filter(q => q.kind === 'mcq5' && q.town === town && !this.e.used.has(q.id));
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
      if (!T.answered) { // 予告していた問題に、いま答える
        await this.msg(T.call ? `${e.name}の仲間がやってくる！ 見破れ！` : `${e.name}の大技がくる！ 正しい対策は？`, 700);
        const r = await this.askQ(T.q, 'battle', T.call ? '仲間呼びを見破れ' : '大技を不発にしろ', `この敵の弱点は「${e.weak}」に関わる知識。`);
        T.answered = true; T.ok = r.correct;
      }
      if (T.call) { // 仲間呼びの解決
        if (T.ok) { await this.msg(`呼ばれた仲間は、正体を見破られて帰っていった！`, 1000); return; }
        const A = this.g.world.enemies[T.ally] || { name: '仲間' }; e.allies.push({ id: T.ally, name: A.name }); this.shake = 6;
        await this.msg(`${A.name}が仲間に加わった！ ${e.name}の攻撃が激しくなる……。`, 1000);
        await this.msg(`（正しい判断：${T.q.choices[T.q.answer]}）`, 1400); return;
      }
      if (T.ok) { e.broken = 1; this.shake = 10; await this.msg(`${e.name}の大技は不発に終わった！ ${e.name}はくずれた！（次の味方の攻撃はダメージ2倍）`, 1100); return; }
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
        await say([[e.name + 'の仲間呼び', q.question]]); this.log.textContent = `${e.name}が仲間を呼んでいる！ 次のターン、問題に正しく答えれば仲間は帰る。`; return; }
    }
    // 予告するか
    const willTele = e.pool && e.pool.length && (e.teleRate >= 1 ? e.turn % 3 === 2 : Math.random() < e.teleRate) || (this.opt.tutorial && e.turn === 1);
    if (willTele) {
      const qs = e.pool.map(id => this.g.qById[id]).filter(Boolean);
      let cand = qs.filter(q => !e.used.has(q.id)); if (!cand.length) cand = qs;
      const q = pick(cand); e.used.add(q.id);
      e.tele = { q, answered: false, ok: false, guard: false };
      await say([[e.name + 'の予告', q.question], `${e.name}は力を溜めている！ 次のターンの問題に正しく答えれば、大技は不発になる。`]);
      this.log.textContent = `${e.name}が力を溜めている！`; return;
    }
    const tgt = pick(this.alive());
    let d = Math.max(1, Math.round(e.atk * rand(.85, 1.15) - tgt.def / 2));
    await this.msg(`${e.name}のこうげき！ 正しく答えて受け流せ！`, 500);
    const q = this.three(this.pickQ(['mcq5', 'situation']));
    const r = await this.askQ(q, 'battle', `${e.name}のこうげきを受け流せ`);
    if (r.correct && (this.fast(r, q) || tgt.guard)) { await this.msg(`${tgt.name}はひらりとかわした！ ミス！`, 800); return; }
    if (r.correct) d = Math.max(1, Math.ceil(d / 4));
    tgt.hp -= d; this.shake = r.correct ? 3 : 8;
    await this.msg(r.correct ? `受け流した！ ${tgt.name}は${d}のダメージですんだ。` : `${tgt.name}は${d}のダメージを受けた！`, 800);
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
