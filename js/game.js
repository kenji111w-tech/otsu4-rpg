// 本体：データ読込、タイトル、物語、施設、メニュー、セーブ（届出）
import { $, el, store, studyDay, isStandalone, fmtMin, pick, APP_VERSION } from './util.js';
import { initUI, say, choose, prompt, toast, ask } from './ui.js';
import { Learn } from './learn.js';
import { Field } from './field.js';
import { Field3D } from './field3d.js';
import { loadAssets } from './art.js';
import { Battle } from './battle.js';

const BASE = {
  hero: { id: 'hero', name: 'ユウ', lv: 1, hp: 30, mhp: 30, mp: 8, mmp: 8, atk: 9, def: 4 },
  hoan: { id: 'hoan', name: 'ホアン', lv: 1, hp: 26, mhp: 26, mp: 10, mmp: 10, atk: 7, def: 5 },
};
const EXP_NEXT = lv => 20 + lv * 25;

class Game {
  async start() {
    const [w, qd] = await Promise.all([fetch('data/world.json').then(r => r.json()), fetch('data/questions.json').then(r => r.json())]);
    this.world = w; this.questions = qd.questions; this.dataVersion = qd.data_version;
    this.qById = {}; this.questions.forEach(q => this.qById[q.id] = q);
    this.ui = $('#ui'); initUI(this.ui);
    Learn.init(this.questions, this.dataVersion); Learn.startClock();
    this.buildKidEnemy();
    await loadAssets();
    let use3d = true; try { const c = document.createElement('canvas'); use3d = !!(c.getContext('webgl2') || c.getContext('webgl')); } catch (e) { use3d = false; }
    const FieldClass = use3d ? Field3D : Field;
    this.field = new FieldClass($('#field'), w, {
      onEvent: ev => this.onEvent(ev), onEncounter: () => this.encounter(), onTalk: n => say(n.talk.map(t => ['村人', t])),
      stageVisible: id => this.stageVisible(id), stageCleared: id => !!(this.state && this.state.cleared[id]),
      isNight: () => this.state && this.state.flags.night,
    });
    this.bindControls();
    if (!isStandalone()) $('#trial').classList.remove('hide');
    window.__game = this; // 開発・テスト用
    this.title();
  }

  // ---------- 状態 ----------
  newState(name) {
    const m = JSON.parse(JSON.stringify(BASE)); m.hero.name = name;
    return { v: 1, name, map: 'village', x: 7, y: 12, party: ['hero'], members: m, skills: [], items: { yakusou: 3, mizu: 1 }, gold: 20, exp: 0,
      flags: { night: true }, cleared: {}, zukan: {}, lastInn: { map: 'village', x: 3, y: 11 }, combo: { n: 0, topics: [] }, savedAt: null };
  }
  save() { // 役場の「届出」
    const s = this.state; s.map = this.field.mapId; s.x = this.field.x; s.y = this.field.y; s.savedAt = new Date().toISOString();
    store.set('game', s); Learn.save();
  }
  gainExp(n) {
    const msgs = []; this.state.exp += n;
    for (const id of this.state.party) {
      const m = this.state.members[id]; m.exp = (m.exp || 0) + n;
      while (m.exp >= EXP_NEXT(m.lv)) { m.exp -= EXP_NEXT(m.lv); m.lv++; m.mhp += 4; m.mmp += 2; m.atk += 1; m.def += 1; msgs.push(`${m.name}はレベル${m.lv}に上がった！`); }
    }
    return msgs;
  }
  combo(ok, topic) { // 合成魔法の連続カウント（Phase 2で使う）
    const c = this.state.combo; if (!ok) { c.n = 0; c.topics = []; return; } c.n++; c.topics.push(topic); if (c.topics.length > 3) c.topics.shift();
  }
  buildKidEnemy() { // 復活させる魔物：知識 → 魔物（ボスは除く）
    this.kidEnemy = {};
    const stageEnemy = {};
    for (const [id, S] of Object.entries(this.world.stages)) { const [t, n] = id.split('-'); if (!S.boss) stageEnemy[t + ':' + n] = S.enemy; }
    for (const q of this.questions) {
      const E = q.enemy && this.world.enemies[q.enemy];
      if (E && !E.boss) this.kidEnemy[q.knowledge_id] = this.kidEnemy[q.knowledge_id] || q.enemy;
      else if (stageEnemy[q.town + ':' + q.stage]) this.kidEnemy[q.knowledge_id] = this.kidEnemy[q.knowledge_id] || stageEnemy[q.town + ':' + q.stage];
      else if (q.town === 'V0') this.kidEnemy[q.knowledge_id] = this.kidEnemy[q.knowledge_id] || 'hibana';
    }
  }

  // ---------- タイトル ----------
  async title() {
    $('#field-wrap').classList.add('hide'); $('#pad').classList.add('hide');
    let saved = store.get('game');
    if (saved && !this.validGame(saved)) { store.set('game-broken-' + Date.now(), saved); store.del('game'); saved = null; await say('冒険の記録（届出）が壊れていたため、使わないことにしました。学習の記録は残っています。'); }
    if (Learn.brokenFound) { Learn.brokenFound = false; await say('学習の記録が壊れていたため、新しく始めます。壊れた記録は端末内に別に保管しました。バックアップがあれば読み込んでください。'); }
    const t = el('div', 'titlescr');
    t.innerHTML = `<div class="logo">乙4 RPG</div><div class="sub">～危険物の世界～</div><div class="ver">試作品 ${APP_VERSION}／問題データ ${this.dataVersion}</div>`;
    this.ui.appendChild(t);
    const items = [];
    if (saved) items.push({ label: 'つづきから', value: 'cont', note: `${saved.name}・${this.world.maps[saved.map].name}` });
    items.push({ label: 'はじめから', value: 'new' });
    items.push({ label: '試験センター（模試）', value: 'exam', note: 'Phase 5で追加' });
    items.push({ label: 'バックアップ', value: 'backup' });
    const v = await choose(null, items, { cancel: false, cls: 'titlemenu' });
    t.remove();
    if (v === 'backup') { await this.backupMenu(); return this.title(); }
    if (v === 'exam') { await say('試験センターの模擬試験は、Phase 5で追加します。本番と同じ35問・2時間の形式で、ゲームの世界の外で受けます。'); return this.title(); }
    if (v === 'new') {
      if (saved) { const ok = await choose('前の冒険の記録（届出）は消えます。学習記録は残ります。', [{ label: 'はじめる', value: 1 }]); if (!ok) return this.title(); }
      const name = ((await prompt('主人公の名前は？', { value: 'ユウ' })) || 'ユウ').slice(0, 8);
      this.state = this.newState(name);
      this.enterWorld();
      await this.opening();
    } else { this.state = saved; this.migrate(); this.enterWorld(); await this.homeReport(); }
  }
  validGame(s) {
    try {
      const M = this.world.maps[s.map]; if (!s || typeof s.name !== 'string' || !M) return false;
      if (!Number.isInteger(s.x) || !Number.isInteger(s.y) || s.y < 0 || s.y >= M.tiles.length || s.x < 0 || s.x >= M.tiles[0].length) return false;
      if (!Array.isArray(s.party) || !s.party.length || !s.party.every(id => s.members && s.members[id] && typeof s.members[id].hp === 'number' && typeof s.members[id].mhp === 'number')) return false;
      if (!s.items || typeof s.items !== 'object' || !s.flags || typeof s.flags !== 'object' || !s.cleared || typeof s.cleared !== 'object' || typeof s.gold !== 'number') return false;
      if (!Array.isArray(s.skills) || !s.skills.every(k => this.world.skills[k])) return false;
      if (s.lastInn && !this.world.maps[s.lastInn.map]) return false;
      return true;
    } catch (e) { return false; }
  }
  migrate() { const s = this.state; s.combo = s.combo || { n: 0, topics: [] }; s.zukan = s.zukan || {}; }
  enterWorld() {
    $('#field-wrap').classList.remove('hide'); $('#pad').classList.remove('hide');
    this.field.party = this.state.party.slice(0, 2);
    this.field.load(this.state.map, this.state.x, this.state.y); this.field.resize();
  }
  roadmapLines() {
    const T = Learn.d.time.bySubject || {};
    return [['導入', 3], ['法令', 17], ['物理・化学', 13], ['性質・消火', 13], ['弱点復習', 7], ['模擬試験', 14], ['最終確認', 3]].map(([k, h]) => `${k} ${fmtMin(T[k] || 0)}／${h}時間`);
  }
  async homeReport() {
    const st = Learn.stats(); const lines = [];
    lines.push(`今日の学習時間：${fmtMin(Learn.d.time.byDay[studyDay()] || 0)}／今週：${fmtMin(Learn.weekSeconds())}／累計：${fmtMin(Learn.d.time.total)}`);
    lines.push('ロードマップ（目安70時間）：' + this.roadmapLines().slice(0, 2).join('、'));
    lines.push(st.due ? `復習の時期が来た知識が${st.due}こあります。草原に「復活した魔物」として現れます。` : '今日の復習はありません。');
    const lb = Learn.d.lastBackup; const days = lb ? Math.floor((Date.now() - new Date(lb)) / 86400e3) : null;
    if (st.answers > 0 && (days == null || days >= 14)) lines.push('しばらくバックアップをしていません。役場の「バックアップ」から書き出しておくと安心です。');
    await say(lines);
  }

  // ---------- 物語 ----------
  async opening() {
    const n = this.state.name;
    await say([
      '――ある夜、始まりの村。',
      '油をしまっていた倉庫から、突然火の手が上がった。',
      '火は床をはうように広がり、村人たちは逃げまどう……。',
      ['ショウボウ老師', 'みな下がっておれ！ 風上へ回れ、水はかけるでない！'],
      '老師の指図で、火はなんとか消し止められた。だが、火元はわからないままだった。',
      ['ショウボウ老師', `……${n}よ。夜が明けたら、消防署へ来なさい。`],
    ]);
  }
  async roshi() {
    const s = this.state, n = s.name;
    if (!s.flags.tutorial) {
      s.flags.night = false;
      await say([
        ['ショウボウ老師', `来たか、${n}。昨夜の火事、火の気はかまどくらいじゃった。なのに床から一気に燃え広がった……。`],
        ['ショウボウ老師', '近ごろ各地で、こうした不思議な火事が続いておる。北の塔で、大火災の王エンジョウが目覚めかけておるという話もある。'],
        ['ショウボウ老師', '炎を正しく扱う者――「危険物取扱者」になれ。それが、この世界を守る力になる。'],
        ['ショウボウ老師', '試験は3つの科目じゃ。法令、物理・化学、危険物の性質と消火。それぞれの科目で6割以上とらねばならん。合計点ではないぞ。'],
        ['ショウボウ老師', '危険物とは、消防法の「別表第一」に載っている物品で、決まった性状を持つものじゃ。乙4で扱うのは第4類、引火性液体じゃな。'],
        ['ショウボウ老師', '……ちょうど裏庭に、煙の魔物が迷いこんでおる。腕だめしじゃ！'],
      ]);
      const r = await this.battle('kemurin', { tutorial: true, noFlee: true });
      if (r !== 'win') { this.healAll(); await say([['ショウボウ老師', 'なに、最初はそんなものじゃ。休んで、もう一度来なさい。']]); return; }
      s.flags.tutorial = true; s.items.yakusou += 3;
      await say([
        ['ショウボウ老師', 'うむ、見事じゃ。知恵で大技を止める――それがこの世界の戦い方じゃ。'],
        ['ショウボウ老師', 'やくそうを3つ持っていけ。北の草原を抜けた先に、法令の国の「定義の町」がある。'],
        ['ショウボウ老師', '道に迷ったら役場で「届出」をしておくのじゃぞ。旅の記録が残る。'],
        `${n}はやくそうを3つ受け取った。`,
      ]);
      return;
    }
    const st = Learn.stats();
    await say([['ショウボウ老師', st.due ? `復習の時期が来た知識が${st.due}こあるようじゃ。草原の魔物が復活しておるぞ。` : '焦らず、ひとつずつ身につけるのじゃ。'], ['ショウボウ老師', '知識は使わねばさびる。さびた技は、思い出せば元に戻るぞ。']]);
  }
  async hoanJoin() {
    const n = this.state.name;
    await say([
      ['ホアン', 'ようこそ、定義の町の役場へ。……と言いたいところですが、見てのとおりです。'],
      ['ホアン', '町じゅうの樽のラベルが入れ替えられ、量り屋はごまかし、空き地には勝手に油が積まれている。'],
      ['ホアン', '書記官の私が「決まりを守ってください」と言っても、だれも聞きやしない。ルールなんて、もう……。'],
      [n, '（老師に言われて、危険物取扱者を目指していることを話した）'],
      ['ホアン', '……危険物取扱者を？ なら、まずは「危険物とは何か」から。私が教えましょう。いっしょに町を回ってください。'],
      'ホアンが仲間に加わった！',
    ]);
    this.state.party = ['hero', 'hoan']; this.state.flags.hoan = true; this.field.setParty ? this.field.setParty(['hero', 'hoan']) : (this.field.party = ['hero', 'hoan']);
  }
  async ending() {
    const n = this.state.name;
    await say([
      'カリチョゾウ・オーガは、積み上げた樽を置いて逃げていった。',
      ['ホアン', '……指定数量、倍数、仮貯蔵は承認を受けて10日以内。こうして一つずつ当てはめれば、ちゃんと止められるんですね。'],
      ['ホアン', '昔、この町の倉庫で大きな火事があったそうです。ルールは、そういう事故のあとに作られてきた。守る意味が、少しわかった気がします。'],
      ['ホアン', `${n}さん。次は「許可の町」です。製造所等をつくる手続きを学びましょう。`],
      ['ホアン', '許可の町へは、この町の東の出口から街道を北へ進みます。'],
    ]);
    this.state.flags.protoClear = true;
  }

  async ending2() {
    const n = this.state.name;
    await say([
      'カッテカイゾウ・トロールは、作り変えた建物を残して逃げ去った。',
      ['ホアン', '許可、完成検査、仮使用は承認、変更は10日前までに届出……。手続きの順番どおりに進めれば、施設は安全に使えるんですね。'],
      ['ホアン', `${n}さん、次は「保安の町」です。危険物取扱者や免状、保安の体制を学びましょう。`],
      '――今の版はここまでです。保安の町は次の版で追加します。',
    ]);
    this.state.flags.l2clear = true;
    await this.recordScreen();
  }

  // ---------- イベント ----------
  async onEvent(ev) {
    const s = this.state;
    if (ev.type === 'exit') {
      if (this.field.mapId === 'village' && !s.flags.tutorial) { await say(s.flags.night ? '夜の外は危ない。夜が明けたら消防署へ行こう。' : '老師に会ってから旅立とう。消防署は村の左上だ。'); this.field.y += 1; return; }
      if (ev.need && !s.cleared[ev.need]) { await say(ev.needmsg || 'まだ先へは進めない。'); this.field.x -= 1; return; }
      this.field.load(ev.to, ev.tx, ev.ty); s.map = ev.to;
      if (ev.to === 'town2' && !s.flags.town2) { s.flags.town2 = true; await say(['許可の町に着いた。', 'あちこちで工事の音がする。真新しいタンク、建てかけの倉庫……。', ['ホアン', 'ここは「製造所等」をつくる手続きを学ぶ町です。許可、承認、届出。順番に見ていきましょう。']]); }
      if (ev.to === 'town1' && !s.flags.town1) { s.flags.town1 = true; await say(['定義の町に着いた。', '町の人たちが、樽の前で困り果てている……。', '（役場で話を聞いてみよう）']); }
      return;
    }
    if (ev.type === 'building') return this.building(ev);
    if (ev.type === 'stage') return this.stage(ev.id);
  }
  stageVisible(id) {
    if (!this.state) return false; const S = this.world.stages[id];
    if (!S || !S.boss) return true; const pre = id.replace('boss', '4');
    return !!this.state.cleared[pre] || !!this.state.cleared[id];
  }
  async building(ev) {
    const s = this.state;
    if (ev.id === 'firehouse') return this.roshi();
    if (ev.id === 'inn') {
      const v = await choose('宿屋「旅人のやすらぎ」', [{ label: '泊まる（無料）', value: 'stay' }]);
      if (v) { this.healAll(); s.lastInn = { map: this.field.mapId, x: ev.x, y: ev.y + 1 }; await say('ぐっすり眠った。HPとMPが回復した！'); }
      return;
    }
    if (ev.id === 'shop') {
      while (true) {
        const its = Object.entries(this.world.items).map(([k, I]) => ({ label: I.name, note: `${I.price}G（持っている数 ${s.items[k] || 0}）`, value: k, disabled: s.gold < I.price || (s.items[k] || 0) >= 9 }));
        const v = await choose(`道具屋（所持金 ${s.gold}G）`, its); if (!v) return;
        s.gold -= this.world.items[v].price; s.items[v] = (s.items[v] || 0) + 1; toast(`${this.world.items[v].name}を買った`);
      }
    }
    if (ev.id === 'office') {
      if (this.field.mapId === 'town1' && !s.flags.hoan) await this.hoanJoin();
      while (true) {
        const v = await choose('役場', [
          { label: '届出（旅の記録をつける）', value: 'save' },
          { label: 'バックアップ（書き出し・読み込み）', value: 'backup' },
        ]);
        if (!v) return;
        if (v === 'save') { this.save(); await say(['届出を受け付けました。旅の記録をつけました。', '（学習の記録は、解くたびに自動で保存されています）']); }
        if (v === 'backup') { const r = await this.backupMenu(); if (r === 'reset') { this.field.busy = false; return this.title(); } }
      }
    }
  }
  healAll() { for (const id of Object.keys(this.state.members)) { const m = this.state.members[id]; m.hp = m.mhp; m.mp = m.mmp; } }

  async stage(id) {
    const s = this.state, S = this.world.stages[id];
    if (!s.flags.hoan) { await say('（まずは役場で話を聞いてみよう）'); this.field.y -= 0; return; }
    if (s.cleared[id]) { await say(`${S.name}の事件は解決した。`); return; }
    if (S.need && !s.cleared[S.need]) { await say([['ホアン', `ここはあとにしましょう。先に「${this.world.stages[S.need].name}」の事件を。`]]); return; }
    const go = await choose(`${S.name}`, [{ label: '事件の現場に入る', value: 1 }]); if (!go) return;
    Learn.subject = '法令';
    await say(S.lesson);
    if (S.skill && !s.skills.includes(S.skill)) {
      s.skills.push(S.skill); const K = this.world.skills[S.skill];
      await say([`${K.user === 'hoan' ? 'ホアン' : s.name}は「${K.name}」を覚えた！`, K.desc]);
    }
    const r = await this.battle(S.enemy, { noFlee: !!S.boss, stage: true, town: id.split('-')[0] });
    if (r === 'lose') return this.retreat();
    if (r !== 'win') { await say([['ホアン', 'いったん引きましょう。準備ができたら、また来てください。']]); return; }
    s.cleared[id] = true;
    if (S.doc && !(s.docs || (s.docs = [])).includes(S.doc)) { s.docs.push(S.doc); await say([`大事なもの「${S.doc}」を手に入れた！`, ['ホアン', S.doc === '許可書' ? '設置の許可を受けた証です。次は工事、そして完成検査。手続きには順番があります。' : '完成検査で基準に適合していると認められた証です。これでようやく使い始められます。']]); }
    if (S.boss) return id === 'L1-boss' ? this.ending() : this.ending2();
    // ホアンの確認：そのステージの五肢択一から2問（未出題を優先）
    const done = new Set(Learn.d.answers.map(a => a.qid));
    const [town, sn] = id.split('-');
    const pool = this.questions.filter(q => q.town === town && q.stage === Number(sn) && q.kind === 'mcq5');
    const qs = pool.filter(q => !done.has(q.id)).concat(pool.filter(q => done.has(q.id))).slice(0, 2);
    await say([['ホアン', '事件は解決です。念のため、書類で確かめておきましょう。']]);
    const hero = s.members.hero, again = [];
    for (const q of qs) { const a = await ask(q, { title: 'ホアンの確認', mode: 'stage', hint: { cost: 1, use: () => { if (hero.mp < 1) return false; hero.mp -= 1; return true; } } }); if (!a.correct || a.unsure || a.hint) again.push(q); }
    if (again.length) { await say([['ホアン', 'まちがえた・迷ったところを、もう一度確かめましょう。']]); for (const q of again) await ask(q, { title: 'ふりかえり', mode: 'furikaeri' }); }
    await say([['ホアン', sn === '4' ? 'これで町の4つの事件はすべて解決……いや、町はずれに、大きな影が！' : 'つぎの現場へ行きましょう。宿屋で休むのも忘れずに。']]);
  }
  async retreat() {
    this.healAll(); const L = this.state.lastInn; this.field.load(L.map, L.x, L.y);
    await say(['目の前が真っ暗になった……。', '気がつくと、宿屋で寝かされていた。（失ったものはない）', ['ホアン', '予告が出たら「たいさく」です。正体を見抜けば、再生も止まります。']]);
  }
  async battle(enemyId, opt) {
    $('#pad').classList.add('hide'); Learn.subject = this.world.enemies[enemyId].area === 'tutorial' ? '導入' : '法令';
    const r = await new Battle(this).run(enemyId, opt); $('#pad').classList.remove('hide');
    if (r === 'lose' && !opt.tutorial && !opt.stage) await this.retreat();
    return r;
  }
  async encounter() {
    const s = this.state;
    const due = Learn.dueKids().filter(k => this.kidEnemy[k] && (s.zukan[this.kidEnemy[k]] || {}).defeated);
    if (due.length && Math.random() < .6) {
      const kid = pick(due), en = this.kidEnemy[kid];
      const qs = this.questions.filter(q => q.knowledge_id === kid && q.pool !== 'mock');
      const q = pick(qs.filter(x => x.kind === 'mcq5').length ? qs.filter(x => x.kind === 'mcq5') : qs);
      return this.battle(en, { revived: true, reviveQ: q });
    }
    return this.battle(pick(['kemurin', 'hibana']), {});
  }

  // ---------- メニュー ----------
  async menu() {
    if (this.field.busy) return; this.field.busy = true;
    try {
      while (true) {
        const v = await choose('メニュー', [
          { label: 'つよさ', value: 'st' }, { label: 'とくぎ', value: 'sk' }, { label: 'ふくろ', value: 'bag' },
          { label: 'きろく（学習）', value: 'rec' }, { label: 'ずかん', value: 'zk' }, { label: 'せってい', value: 'set' }]);
        if (!v) break;
        if (v === 'st') await say(this.state.party.map(id => { const m = this.state.members[id]; return `${m.name}　Lv${m.lv}　HP ${m.hp}/${m.mhp}　MP ${m.mp}/${m.mmp}　こうげき ${m.atk}　まもり ${m.def}`; }).concat([`所持金 ${this.state.gold}G`]));
        if (v === 'sk') await say(this.state.skills.length ? this.state.skills.map(id => { const K = this.world.skills[id]; const rust = K.kids.some(k => Learn.isDue(k)); return `${K.name}（${K.user === 'hoan' ? 'ホアン' : this.state.name}・MP${K.mp}）${rust ? '【さび】' : ''}：${K.desc}`; }) : 'まだ技を覚えていない。');
        if (v === 'bag') await this.bag();
        if (v === 'rec') await this.recordScreen();
        if (v === 'zk') { const z = this.state.zukan; const ks = Object.keys(z).filter(k => z[k].defeated); await say(ks.length ? ks.map(k => `${this.world.enemies[k].name}（倒した数 ${z[k].defeated}）弱点：${z[k].weak || '？（物質識別で見抜くと記録される）'}`) : 'まだ魔物を倒していない。'); }
        if (v === 'set') { const r = await this.settings(); if (r) { this.field.busy = false; return this.title(); } }
      }
    } finally { this.field.busy = false; }
  }
  async bag() {
    const v = await choose('ふくろ', [{ label: 'どうぐ', value: 'i' }, { label: '装備（見た目だけ）', value: 'e' }, { label: '知識', value: 'k' }, { label: '大事なもの', value: 'd' }]);
    if (v === 'i') await say(Object.entries(this.state.items).filter(([, n]) => n > 0).map(([k, n]) => `${this.world.items[k].name} ×${n}：${this.world.items[k].desc}`).concat(['（どうぐは戦闘中に使える）']));
    if (v === 'e') await say('たびびとの服（見た目だけ。強さには影響しない）');
    if (v === 'k') {
      const got = Object.keys(Learn.d.review); if (!got.length) return say('まだ知識カードがない。');
      const groups = { '法令': [], '試験制度': [] };

      for (const kid of got) { const q = this.questions.find(x => x.knowledge_id === kid && x.kind === 'mcq5') || this.questions.find(x => x.knowledge_id === kid); if (!q) continue; (groups[q.subject] = groups[q.subject] || []).push(q); }
      const g = await choose('知識（第1段階）', Object.entries(groups).filter(([, a]) => a.length).map(([k, a]) => ({ label: k, note: `${a.length}枚`, value: k })));
      if (!g) return;
      const tps = {}; groups[g].forEach(q => (tps[q.topic] = tps[q.topic] || []).push(q));
      const t = await choose(`${g}（第2段階）`, Object.entries(tps).map(([k, a]) => ({ label: k, note: `${a.length}枚`, value: k })));
      if (!t) return;
      await say(tps[t].map(q => { const r = Learn.d.review[q.knowledge_id]; return `【${r.mastered ? '習得' : '段階' + r.stage}】${q.explanation}`; }));
    }
    if (v === 'd') { const d = this.state.docs || []; await say(d.length ? ['大事なもの（手続きの順に並んでいる）：' + d.join(' → '), '書類は手続きの順番どおりにしか手に入らない。'] : '大事なもの：まだない。（許可の町で、手続きの書類が手に入る）'); }
  }
  async recordScreen() {
    const st = Learn.stats(); const hero = this.state.members.hero;
    await say([
      `【3つの成長指標】`,
      `冒険者レベル：Lv${hero.lv}（ゲームの進み具合。勝敗や合格とは関係ない）`,
      `学習熟練度：学んだ知識${st.learned}こ／安定${st.stable}こ／習得${st.mastered}こ`,
      `試験戦闘力：模試は未受験（試験センターはPhase 5で追加）`,
      `学習時間：今日 ${fmtMin(Learn.d.time.byDay[studyDay()] || 0)}／今週 ${fmtMin(Learn.weekSeconds())}／累計 ${fmtMin(Learn.d.time.total)}`,
      `判断・解答 ${st.answers}回（正しい ${st.correct}回・${st.rate}%）／迷った ${st.unsure}回／ヒント ${st.hint}回`,
      `今日の復習：${st.due}こ${st.held ? `／保留の記録 ${st.held}件` : ''}`,
      'ロードマップの進み具合（目安70時間）：\n' + this.roadmapLines().join('\n'),
    ]);
  }
  async settings() {
    const v = await choose('せってい', [{ label: 'バックアップ（書き出し・読み込み）', value: 'b' }, { label: '版の情報', value: 'v' }, { label: 'タイトルにもどる', value: 't' }]);
    if (v === 'b') return this.backupMenu();
    if (v === 'v') await say([`アプリ ${APP_VERSION}`, `問題データ ${this.dataVersion}（確認前の問題を含む試作版）`, `表示：${isStandalone() ? 'ホーム画面版' : 'Safari版（お試し）'}`, `最終バックアップ：${Learn.d.lastBackup ? new Date(Learn.d.lastBackup).toLocaleString('ja-JP') : 'まだ'}`]);
    if (v === 't') { const ok = await choose('届出していない進み具合は失われます（学習記録は残ります）。', [{ label: 'タイトルにもどる', value: 1 }]); if (ok) return 'title'; }
  }
  async backupMenu() {
    const v = await choose('バックアップ', [
      { label: '書き出す：ファイルで保存', value: 'file' }, { label: '書き出す：テキストをコピー', value: 'copy' },
      { label: '読み込む：ファイルを選ぶ', value: 'load' }, { label: '読み込む：テキストを貼り付け', value: 'paste' }]);
    if (!v) return;
    const game = store.get('game'); // 書き出すのは最後の届出の内容（現在地は保存しない）
    const text = JSON.stringify(Learn.exportObj(game));
    if (v === 'file') {
      const a = el('a'); a.href = URL.createObjectURL(new Blob([text], { type: 'application/json' })); a.download = `otsu4rpg-backup-${studyDay()}.json`; document.body.appendChild(a); a.click(); a.remove();
      Learn.markBackup(); return say(['バックアップのファイルを書き出しました。「ファイル」アプリなどに保存してください。', '（保存の画面が出なかった場合は、「テキストをコピー」を使ってください。claude.ai上の試作品ではファイル保存が使えません）']);
    }
    if (v === 'copy') {
      try { await navigator.clipboard.writeText(text); Learn.markBackup(); return say('バックアップをコピーしました。メモアプリなどに貼り付けて保存してください。'); }
      catch (e) { await prompt('コピーできませんでした。下の文字をすべて選んでコピーしてください。', { value: text, multiline: true, ok: '閉じる' }); Learn.markBackup(); return; }
    }
    let raw = null;
    if (v === 'paste') raw = await prompt('バックアップの文字を貼り付けてください', { multiline: true });
    if (v === 'load') raw = await new Promise(res => { const f = el('input'); f.type = 'file'; f.accept = '.json,application/json,text/plain'; f.onchange = () => { const r = new FileReader(); r.onload = () => res(r.result); r.readAsText(f.files[0]); }; f.click(); });
    if (!raw) return;
    const p = Learn.parseImport(raw);
    if (!p.error && p.ok.game != null && !this.validGame(p.ok.game)) p.error = '冒険の記録（届出）の中身が壊れています。読み込めません。（今のデータは変わっていません）';
    if (p.error) return say(p.error);
    const ok = await choose('この内容で上書きしますか？\n' + p.summary, [{ label: '先に今のデータを書き出してから上書き', value: 'bk' }, { label: '上書きする', value: 'ow' }]);
    if (!ok) return;
    if (ok === 'bk') { const a = el('a'); a.href = URL.createObjectURL(new Blob([text], { type: 'application/json' })); a.download = `otsu4rpg-before-import-${studyDay()}.json`; document.body.appendChild(a); a.click(); a.remove(); }
    const held = Learn.applyImport(p.ok);
    await say([`読み込みました。${held ? `問題データにない記録 ${held}件は「保留」にしました。` : ''}`, 'タイトルにもどります。']);
    return 'reset';
  }

  // ---------- 操作 ----------
  bindControls() {
    const f = this.field;
    document.querySelectorAll('#pad [data-dir]').forEach(b => {
      const d = b.dataset.dir;
      b.addEventListener('pointerdown', e => { e.preventDefault(); f.held = d; f.step(d); });
      ['pointerup', 'pointerleave', 'pointercancel'].forEach(ev => b.addEventListener(ev, () => { if (f.held === d) f.held = null; }));
    });
    $('#btnA').addEventListener('click', () => f.action());
    $('#btnM').addEventListener('click', () => this.menu());
    addEventListener('keydown', e => {
      const k = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right' }[e.key];
      if (k && !$('#field-wrap').classList.contains('hide') && !this.ui.querySelector('.win,.battle')) { e.preventDefault(); f.step(k); }
      if ((e.key === 'Enter' || e.key === ' ') && !this.ui.querySelector('.win,.battle')) f.action();
    });
    $('#trial-close').addEventListener('click', () => $('#trial').classList.toggle('mini'));
  }
}

// オフライン対応と更新のお知らせ（claude.ai上の試作品ではService Workerが使えないので何もしない）
function setupSW() {
  if (!('serviceWorker' in navigator)) return;
  navigator.serviceWorker.register('sw.js').then(reg => {
    const show = w => { const b = document.getElementById('update'); b.classList.remove('hide');
      b.onclick = () => { if (document.querySelector('.battle')) { b.textContent = '戦闘が終わってから更新してください'; return; } w.postMessage('skipWaiting'); }; };
    if (reg.waiting && navigator.serviceWorker.controller) show(reg.waiting);
    reg.addEventListener('updatefound', () => { const w = reg.installing; w && w.addEventListener('statechange', () => { if (w.state === 'installed' && navigator.serviceWorker.controller) show(w); }); });
    let reloaded = false; navigator.serviceWorker.addEventListener('controllerchange', () => { if (!reloaded) { reloaded = true; location.reload(); } });
  }).catch(() => {});
}
try { setupSW(); } catch (e) {}

window.addEventListener('error', e => { const d = document.getElementById('err'); if (d) { d.textContent = 'エラー：' + e.message; d.classList.remove('hide'); } });
new Game().start().catch(e => { const d = document.getElementById('err'); d.textContent = '読み込みに失敗しました：' + e.message; d.classList.remove('hide'); });
