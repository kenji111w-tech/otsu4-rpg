// 本体：データ読込、タイトル、物語、施設、メニュー、セーブ（届出）
import { $, el, store, studyDay, isStandalone, fmtMin, pick, APP_VERSION } from './util.js';
import { initUI, say, choose, prompt, toast, ask } from './ui.js';
import { Learn } from './learn.js';
import { Field } from './field.js';
import { Field3D, dir8 } from './field3d.js';
import { loadAssets } from './art.js';
import { Battle } from './battle.js';
import { FORMS, examPool, buildExam, runExam, showResult } from './exam.js';

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
      chestOpen: id => !!(this.state && (this.state.chests || {})[id]),
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
    items.push({ label: '試験センター（模試）', value: 'exam', note: '本番と同じ35問・2時間' });
    items.push({ label: 'バックアップ', value: 'backup' });
    const v = await choose(null, items, { cancel: false, cls: 'titlemenu' });
    t.remove();
    if (v === 'backup') { await this.backupMenu(); return this.title(); }
    if (v === 'exam') { await this.examCenter(saved); return this.title(); }
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
        ['ショウボウ老師', 'それから、旅の記録のつけ方を教えておこう。大事なことじゃ。'],
        ['ショウボウ老師', '旅の記録（セーブ）は、村や町の「役場」で「届出」をすると残る。この村なら、右上の建物が役場じゃ。'],
        ['ショウボウ老師', '役場の人に話しかけて「届出（旅の記録をつける）」を選ぶ。それだけじゃ。届出をしないまま旅をやめると、その前の届出から続きになるぞ。'],
        ['ショウボウ老師', 'ダンジョンの中には役場がない。入る前に必ず届出をしておくのじゃ。'],
        ['ショウボウ老師', 'ただし、問題を解いた「学びの記録」は、解くたびに自動で残る。届出を忘れても、覚えたことは消えん。安心せい。'],
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
      ['ホアン', '保安の町へは、この町の東の出口から北の街道を進みます。'],
    ]);
    this.state.flags.l2clear = true;
  }

  async ending3() {
    const n = this.state.name;
    await say([
      'ニセ監督官ハリボテの張りぼては崩れ、中から小さな魔物が逃げていった。',
      ['ホアン', '取扱者、免状、講習、点検……。資格と手続きは、人を縛るためじゃなく、人を守るためにあるんですね。'],
      ['ホアン', `${n}さん。法令の国の3つの町を回りました。この先には、基準の砦、運搬の峠、そして法令の城が待っています。`],
      ['ホアン', '北の街道の東に、石造りの砦がありました。あれが「基準の砦」。施設の位置や構造の基準を、魔物たちがねじ曲げているそうです。'],
      ['ホアン', '砦の中には宿屋も役場もありません。届出（セーブ）をして、やくそうを持ってから向かいましょう。'],
    ]);
    this.state.flags.l3clear = true;
    await this.recordScreen();
  }

  async ending4() {
    const n = this.state.name;
    await say([
      'キジュンクズシ将軍のよろいは音を立てて崩れ、砦に静けさが戻った。',
      ['ホアン', '保安距離、保有空地、標識と掲示板、消火設備……。数字には、火事を広げないための理由がありました。'],
      ['ホアン', '10m、30m、50m。3mと5m。白地に黒、赤地に白。……覚え方より先に「なぜそうなのか」を思い出せば、迷いませんね。'],
      ['ホアン', `${n}さん、砦の奥に峠へ続く道が見えます。次は「運搬の峠」。危険物を運ぶときのルールです。`],
      ['ホアン', '峠への道は、将軍の広間の右奥にあります。泉で休んでから行きましょう。'],
    ]);
    this.state.flags.d1clear = true;
    await this.recordScreen();
  }

  async ending5() {
    const n = this.state.name;
    await say([
      'ムチャハコビ団長の背中の荷が崩れ落ち、団長は峠のむこうへ逃げていった。',
      ['ホアン', '容器に入れて運ぶのが「運搬」、タンクローリーで運ぶのが「移送」。似ているようで、決まりがちがいました。'],
      ['ホアン', '98%と95%、積み重ねは3m、混載できないのは第1類と第6類、「危」の標識、4時間と9時間……。運ぶ人を守る数字ばかりです。'],
      ['ホアン', `${n}さん、峠の上から城が見えます。あれが「法令の城」。法令の国の最後の場所です。`],
      ['ホアン', '城への道は、峠の頂上の左奥から続いています。'],
    ]);
    this.state.flags.d2clear = true;
    await this.recordScreen();
  }

  async finalStart() {
    const s = this.state, n = s.name, hero = s.members.hero, lv = Math.max(1, hero.lv - 1);
    const mk = (id, name) => { const m = s.members[id] || (s.members[id] = { id, name, exp: 0 }); m.lv = Math.max(m.lv || 1, lv); const hp = 30 + 5 * (m.lv - 1), mp = 8 + 2 * (m.lv - 1); m.mhp = Math.max(m.mhp || 0, hp); m.mmp = Math.max(m.mmp || 0, mp); m.hp = m.mhp; m.mp = m.mmp; m.atk = Math.max(m.atk || 0, 8 + m.lv); m.def = Math.max(m.def || 0, 5 + m.lv); };
    mk('hoan', 'ホアン'); mk('kemi', 'ケミ'); mk('sekiyu', 'セキユ');
    await say(['塔の入口に立つと、うしろから聞きなれた声がした。',
      ['ホアン', `${n}さん！ 法令の国から、走ってきましたよ。`],
      ['ケミ', '化学の塔の研究、ひと区切りつけてきたわ。最後くらい、いっしょに行かせて。'],
      ['セキユ', '言っただろう。本当の試練のときは、かならず駆けつけるってな！'],
      'ホアン、ケミ、セキユが仲間に加わった！',
      '――終章「試練の塔」――']);
    s.party = ['hero', 'hoan', 'kemi', 'sekiyu']; s.flags.finale = true; s.lastInn = { map: 'tower6', x: 12, y: 9 };
    if (this.field.setParty) this.field.setParty(s.party); else this.field.party = s.party;
  }
  async finalBoss() {
    const s = this.state;
    for (const [id, words] of [['enjou2', [['エンジョウ', 'ぐぬぬ……法令の知恵か。ならば、この姿はどうだ！'], 'エンジョウの体が、化学反応の泡をまとった姿に変わった！']], ['enjou3', [['エンジョウ', 'まだだ……！ 人が油断するかぎり、わしは消えぬ！'], 'エンジョウの炎が7色にうずまき、地をはう蒸気が広がった！']]]) {
      await say(words);
      const r = await this.battle(id, { noFlee: true, stage: true, town: 'F', stageId: 'F-boss' });
      if (r !== 'win') { s.cleared['F-boss'] = false; return r === 'lose' ? this.retreat() : say([[this.guide(), 'いったん引きましょう。']]); }
    }
    return this.epilogue();
  }
  async epilogue() {
    const n = this.state.name;
    await say([
      'エンジョウの炎が、ふっと小さくなった。最後に残ったのは、ろうそくほどの、あたたかい小さな火だった。',
      ['ショウボウ老師', '……火は、こわいだけのものではない。正しく知り、正しく扱えば、人の暮らしを照らす火になる。'],
      ['ショウボウ老師', `${n}。おまえは、知らなさと油断に、知恵で勝った。わしの長い後悔も、これで終わりじゃ。ありがとう。`],
      ['ホアン', '法令は、人を縛るためじゃなく、守るためにあるんですね。'],
      ['ケミ', '理由がわかれば、こわさの正体も見えるわ。'],
      ['セキユ', '知っていれば防げる。それを、ずっと覚えておくよ。'],
      '――エピローグ――',
      '数日後。ユウは村に戻り、本物の試験に向けて最後の仕上げを始めた。',
      ['ショウボウ老師', '試験センターで、本番と同じ形の「模擬試験」が受けられるようになったぞ。法令15問、物理・化学10問、性質・消火10問。科目ごとに6割で合格じゃ。'],
      ['ショウボウ老師', 'ゲームはここで一区切りじゃが、苦手な問題は宿屋の手紙と「にがて」で何度でも復習できる。合格の日まで、気をゆるめるでないぞ。'],
      '――おめでとう！ 物語はここで完結です。――',
      ['ショウボウ老師', '試験センターは、タイトル画面から行けるぞ。'],
    ]);
    this.state.flags.cleared = true;
    await this.recordScreen();
  }
  async chapter3Start() {
    const s = this.state, n = s.name, hero = s.members.hero;
    await say([['ケミ', `${n}さん、わたしはここまで。塔に残って、物の変化をもっと調べたいの。`], ['ケミ', '燃える仕組みと消す仕組み、物の性質と変化。忘れそうになったら、宿屋に手紙を書くわね。'], 'ケミが手をふって、塔の中へ戻っていった。', '――第3章「危険物の国」――']);
    const lv = Math.max(1, hero.lv - 1);
    s.members.sekiyu = { id: 'sekiyu', name: 'セキユ', lv, hp: 30 + 5 * (lv - 1), mhp: 30 + 5 * (lv - 1), mp: 8 + 2 * (lv - 1), mmp: 8 + 2 * (lv - 1), atk: 8 + lv, def: 5 + lv, exp: 0 };
    await say([['？？？', 'おう、そこの旅の人！ 危険物の国へようこそ、だ。'], ['セキユ', 'おれはセキユ。港町の油問屋のせがれだ。……親父の倉庫は、何年か前に火事で焼けちまった。原因は、いまだにわからねえ。'], ['セキユ', 'だからおれは、油のことを一から調べ直してるんだ。ガソリン、灯油、アルコール……第4類の一つひとつの性質と、火の用心と、消し方をな。'], ['セキユ', `${n}って言うのか。危険物取扱者をめざしてるんなら、ちょうどいい。いっしょに行こうぜ！`], 'セキユが仲間になった！']);
    s.party = ['hero', 'sekiyu']; s.flags.chapter3 = true; s.lastInn = { map: 'town6', x: 3, y: 4 };
    if (this.field.setParty) this.field.setParty(s.party); else this.field.party = s.party;
  }
  async ending18() {
    const n = this.state.name;
    await say([
      '蒸気竜の長い体が、風にほどけるように薄れていった。くぼ地にたまっていた重い蒸気も、もうどこにもない。',
      ['セキユ', 'やったな……。第4類の共通の性質、7つの品名、それに事故を防ぐ知恵。危険物の国は、これで取り戻した。'],
      ['セキユ', `${n}。おれはこの国に残って、親父の店を建て直す。今度は、油のしみたぼろ布なんか、ぜったいにためこまねえ店にな。`],
      ['セキユ', 'だが、おまえが本当の試練に挑むときは、かならず駆けつける。ホアンも、ケミも、きっと同じ気持ちだ。'],
      'セキユが拳を突き出した。ユウも拳を合わせた。',
      '――第3章「危険物の国」完。',
      ['ショウボウ老師', '（どこからか声が響く）よくぞここまで来た。法令、物理・化学、そして危険物。3つの国の知恵がそろったな。'],
      ['ショウボウ老師', '……だが、この国々に炎をもたらした「エンジョウ」は、まだ試練の塔の上におる。あやつの正体については、わしからも話さねばならんことがある。'],
      ['ショウボウ老師', '試練の塔は、低地の油田のくぼ地の奥にある。準備ができたら向かうがよい。'],
    ]);
    this.state.flags.chapter3clear = true;
    await this.recordScreen();
  }
  async ending17() {
    const n = this.state.name;
    await say([
      'ジネンハッカ大樹の幹のうろの熱が、ふっと消えた。根元のぼろ布の山から、もう煙は出ていない。',
      ['セキユ', '……わかったよ、親父。倉庫の火事は、だれのせいでもなかったんだ。'],
      ['セキユ', 'すみに積んであった、アマニ油のしみたぼろ布。あれが、火の気もないのにゆっくり熱をためて……自然発火したんだ。'],
      ['セキユ', `${n}、ありがとう。おまえと旅して、油のことを一から学んで、やっとわかった。知っていれば、防げたんだ。だから、知ることは大事なんだな。`],
      ['セキユ', '第4類の7つの品名は、これでぜんぶ回った。だが……国のいちばん奥で、低い所をはいまわる「蒸気の竜」が目をさましたらしい。'],
      ['セキユ', '低地の油田へは、この町の東の門から行けるぞ。'],
    ]);
    this.state.flags.h7clear = true;
    await this.recordScreen();
  }
  async ending16() {
    const n = this.state.name;
    await say([
      'オモアブラ大魔像がずずんと崩れ、茶色と灰色の油が広場に流れ出して、静かに固まった。',
      ['セキユ', '第3石油類は引火点70℃以上200℃未満で2,000（水溶性4,000）、第4石油類は200℃以上250℃未満で6,000。燃えにくいが、熱すれば燃えて、燃えたら消しにくい。重油は水よりわずかに軽い……。'],
      ['セキユ', `${n}、残るは動植物油類の町だけだ。……あの町には、親父の倉庫の火事の手がかりがある気がするんだ。`],
      ['セキユ', '動植物油類の町へは、この町の東の門から行けるぞ。'],
    ]);
    this.state.flags.h6clear = true;
    await this.recordScreen();
  }
  async ending15() {
    const n = this.state.name;
    await say([
      'ニセキ大槍王の黄金の槍がくだけ、黄色い霧がすっと晴れていった。',
      ['セキユ', '引火点21℃以上70℃未満、指定数量1,000（水溶性2,000）。灯油は40℃以上、軽油は45℃以上。霧や布は引火点以下でも燃える。酢酸は水に溶けて、凍って、腐食する……。'],
      ['セキユ', `……${n}。親父の倉庫には、灯油の樽が積んであった。それに、油のしみたぼろ布も、片すみに山になってたんだ。`],
      ['セキユ', 'いや、いい。先へ行こう。次は第3・第4石油類の町だ。重たくて燃えにくい連中だが、油断はできねえ。'],
      ['セキユ', '第3・第4石油類の町へは、この町の東の門から行けるぞ。'],
    ]);
    this.state.flags.h5clear = true;
    await this.recordScreen();
  }
  async ending14() {
    const n = this.state.name;
    await say([
      'アルコール大司教の杖の宝玉が、ひとつずつ淡い光になって消えていった。',
      ['セキユ', '炭素は1〜3個まで、指定数量は400。メタノールは毒、エタノールは酒の成分。どれも水に溶けて、炎が見えにくい。消すのは耐アルコール泡だ。'],
      ['セキユ', `${n}、次は第2石油類の町だ。灯油や軽油……おれの親父の倉庫にもあった連中だ。`],
      ['セキユ', '第2石油類の町へは、この町の東の門から行けるぞ。'],
    ]);
    this.state.flags.h4clear = true;
    await this.recordScreen();
  }
  async ending13() {
    const n = this.state.name;
    await say([
      'イチセキ大剣豪の赤い剣が、ぽきりと折れた。',
      ['セキユ', '引火点21℃未満、指定数量200（水溶性400）。ガソリンはオレンジ色で引火点−40℃以下、燃焼範囲1.4〜7.6。ベンゼンは毒と、冬に固まる。アセトンは水に溶ける……。'],
      ['セキユ', `${n}、次はアルコール類の町だ。燃えても炎が見えにくい、やっかいな連中だぞ。`],
      ['セキユ', 'アルコール類の町へは、この町の東の門から行けるぞ。'],
    ]);
    this.state.flags.h3clear = true;
    await this.recordScreen();
  }
  async ending12() {
    const n = this.state.name;
    await say([
      'ミツヒクイ魔王の3つの首が、しゅるしゅると黒紫の霧になって消えた。',
      ['セキユ', '引火点がいちばん低いのはジエチルエーテル、発火点は二硫化炭素、沸点はアセトアルデヒド。指定数量は50L。二硫化炭素は水の中、アセトアルデヒドと酸化プロピレンは不活性ガス……。'],
      ['セキユ', `${n}、次は第1石油類の町だ。ガソリンやベンゼン……おなじみの連中が待ってるぜ。`],
      ['セキユ', '第1石油類の町へは、この町の東の門から行けるぞ。'],
    ]);
    this.state.flags.h2clear = true;
    await this.recordScreen();
  }
  async ending11() {
    const n = this.state.name;
    await say([
      'ダイヨンルイ将軍の鎧がガシャンと崩れ、中から小さな油さしがころがり出た。',
      ['セキユ', '蒸気は重い、水より軽くて溶けにくい、静電気がたまりやすい。容器は密栓して冷暗所、換気は低い所も。消すのは泡・粉末・二酸化炭素……。'],
      ['セキユ', `${n}、共通の性質はこれでばっちりだ。次は品名ごとの町をひとつずつ回るぞ。最初は、いちばん燃えやすい「特殊引火物の町」だ。`],
      ['セキユ', '特殊引火物の町へは、この町の東の門から行けるぞ。'],
    ]);
    this.state.flags.h1clear = true;
    await this.recordScreen();
  }
  async chapter2Start() {
    const s = this.state, n = s.name, hero = s.members.hero;
    await say([['ホアン', `${n}さん、ここでお別れです。法令は、だれかを守るための決まり。忘れないでくださいね。`], 'ホアンが手をふって、城へ戻っていった。', '――第2章「物理・化学の国」――', '扉をくぐると、空気が変わった。遠くに、煙突から炎の上がる町が見える。']);
    const lv = Math.max(1, hero.lv - 1);
    s.members.kemi = { id: 'kemi', name: 'ケミ', lv, hp: 24 + 4 * (lv - 1), mhp: 24 + 4 * (lv - 1), mp: 12 + 2 * (lv - 1), mmp: 12 + 2 * (lv - 1), atk: 6 + lv, def: 4 + lv, exp: 0 };
    await say([['？？？', 'ちょっと、そこの人！ 危ないわよ、その町はいま、燃えてばかりなんだから。'], ['ケミ', 'わたしはケミ。錬金術師……の見習い。「物」がどうして燃えるのか、どうして消えるのかを調べているの。'], [n, '（危険物取扱者を目指して旅をしていることを話した）'], ['ケミ', 'へえ、危険物取扱者！ だったら「燃える」ってことを知らなきゃね。いいわ、わたしが教えてあげる。いっしょに行きましょう！'], 'ケミが仲間に加わった！']);
    s.party = ['hero', 'kemi']; s.flags.chapter2 = true; s.lastInn = { map: 'town4', x: 3, y: 4 };
    if (this.field.setParty) this.field.setParty(s.party); else this.field.party = s.party;
  }
  async ending7() {
    const n = this.state.name;
    await say([
      'モエサカル王の炎が、しゅうっと小さくなって消えた。',
      ['ケミ', '燃えるには三要素。燃え方は4つ。引火点と発火点、燃焼範囲。それに自然発火と粉じん爆発……。'],
      ['ケミ', `${n}さん、燃えるしくみがわかったら、次は「消す」しくみよ。この先に「消火の町」があるわ。`],
      ['ケミ', '消火の町へは、この町の東の門から行けるわ。'],
    ]);
    this.state.flags.p1clear = true;
    await this.recordScreen();
  }
  async ending10() {
    const n = this.state.name;
    await say([
      'タンソクサリ大王の鎖がばらばらにほどけ、黒い炭素の玉がころころと床に転がった。',
      ['ケミ', '物理変化と化学変化。単体・化合物・混合物。反応式とmol。酸化と還元、イオン化傾向。酸と塩基。そして有機化合物……。'],
      ['ケミ', `${n}さん、これで物理・化学の国はひと通り取り戻せたわ。物の性質がわかれば、危険物の正体も見えてくるはずよ。`],
      ['ショウボウ老師', '（どこからか声が響く）見事じゃ。次はいよいよ「危険物の国」。第4類の一つひとつと向き合う番じゃぞ。'],
      '――第2章「物理・化学の国」完。',
      ['ケミ', '最上階の奥の階段から、危険物の国への渡り廊下に出られるわ。'],
    ]);
    this.state.flags.p4clear = true;
    await this.recordScreen();
  }
  async ending9() {
    const n = this.state.name;
    await say([
      'フットウ大魔人の湯気がすうっと引いていき、大魔人は小さなやかんになって、ころんと転がった。',
      ['ケミ', '三態と状態変化。比重と蒸気比重。沸点と蒸気圧。比熱と熱量の計算。伝導・対流・放射。そして熱膨張……。'],
      ['ケミ', `${n}さん、物理の基本はこれでひと通りよ。数字の計算も、もうこわくないわね。`],
      ['ケミ', '奥の扉の先は「化学の塔」。物が別の物に変わる仕組み……化学の基本を確かめに行きましょう。'],
    ]);
    this.state.flags.p3clear = true;
    await this.recordScreen();
  }
  async ending8() {
    const n = this.state.name;
    await say([
      'ミズブッカケ大将のバケツがひっくり返り、大将はずぶぬれのまま逃げていった。',
      ['ケミ', '冷却、窒息、除去、抑制。火事の種類はA・B・C。油の火事に棒状の水はだめ。静電気はアースで逃がす……。'],
      ['ケミ', `${n}さん、「燃える」と「消える」がわかったわね。次は、物そのものの性質を調べに行きましょう。`],
      ['ケミ', '東の門の先に「熱の洞窟」があるわ。物が溶けたり、湯気になったり、ふくらんだり……熱の正体を確かめに行きましょう。'],
    ]);
    this.state.flags.p2clear = true;
    await this.recordScreen();
  }
  async ending6() {
    const n = this.state.name;
    await say([
      'ムトドケの王冠が転がり落ち、城じゅうに散らばっていた届出書が、ひらひらと元の棚へ戻っていった。',
      ['ホアン', '廃止も、選任も、解任も、届け出る。予防規程は認可を受ける。くずは毎日片づけて、事故のときはすぐに止めて、すぐに知らせる。'],
      ['ホアン', `……${n}さん。わたし、最初は法令なんて、ただの面倒な決まりだと思っていました。でも、どれも誰かを守るためのものでした。`],
      ['ショウボウ老師', '（どこからか声が響く）よくぞ法令の国を取り戻した。じゃが、敵の正体を知るには「物」そのものを知らねばならん。'],
      ['ホアン', `次は「物理・化学の国」。玉座の奥の扉の先が、国ざかいです。わたしは法令の国に残って、この城を立て直します。`],
      ['ホアン', `${n}さん、扉をくぐったら、いったんお別れです。……また、必ず会いましょう！`],
      '――第1章「法令の国」完。',
      '（法令の国の寄り道をすませてから、玉座の奥の扉へ進もう）',
    ]);
    this.state.flags.d3clear = true; this.state.flags.chapter1 = true;
    await this.recordScreen();
  }

  // ---------- イベント ----------
  async onEvent(ev) {
    const s = this.state;
    if (ev.type === 'exit') {
      if (this.field.mapId === 'village' && !s.flags.tutorial) { await say(s.flags.night ? '夜の外は危ない。夜が明けたら消防署へ行こう。' : '老師に会ってから旅立とう。消防署は村の左上だ。'); this.field.y += 1; return; }
      if (ev.need && !s.cleared[ev.need]) { await say(ev.needmsg || 'まだ先へは進めない。'); this.field.x -= 1; return; }
      this.field.load(ev.to, ev.tx, ev.ty); s.map = ev.to;
      if (ev.to === 'dungeon1' && !s.flags.dungeon1) { s.flags.dungeon1 = true; await say(['基準の砦に入った。', '冷たい石の通路に、たいまつの火がゆれている。', ['ホアン', 'ここは施設の「位置・構造・設備の基準」を守るための砦でした。魔物たちが数字をねじ曲げています。'], ['ホアン', '砦の中は魔物が多い。青く光る泉で休めます。宝箱も探してみましょう。']]); }
      if (ev.to === 'pass2' && !s.flags.pass2) { s.flags.pass2 = true; await say(['運搬の峠に出た。', '細い山道を、荷車やタンクローリーの魔物が行き来している。', ['ホアン', 'ここは危険物を「運ぶ」ときの決まりを学ぶ場所です。容器に入れて運ぶ「運搬」と、タンクローリーで運ぶ「移送」。'], ['ホアン', 'この峠にも宿屋はありません。泉と宝箱を探しましょう。']]); }
      if (ev.to === 'town4' && !s.flags.chapter2) { await this.chapter2Start(); }
      if (ev.to === 'town6' && !s.flags.chapter3) { await this.chapter3Start(); }
      if (ev.to === 'tower6' && !s.flags.finale) { await this.finalStart(); }
      if (ev.to === 'field4' && !s.flags.field4) { s.flags.field4 = true; await say(['低地の油田に出た。', '地面が低くくぼんだ土地。足もとを、うす茶色の重たい蒸気がゆっくり流れていく。', ['セキユ', 'ここが危険物の国のいちばん奥だ。4つの事故現場を調べて、事故を防ぐ知恵を身につけてから、くぼ地の蒸気竜に挑むぞ。']]); }
      if (ev.to === 'town12' && !s.flags.town12) { s.flags.town12 = true; await say(['動植物油類の町に着いた。', '畑と森にかこまれた町。油しぼりの小屋から、ナタネやゴマのこうばしいにおいがする。', ['セキユ', 'ここが最後の品名、動植物油類の町だ。緑の体に弓とつるが目じるしだぞ。'], ['セキユ', '……この町には、ずっと気になってることの答えがある気がするんだ。']]); }
      if (ev.to === 'town11' && !s.flags.town11) { s.flags.town11 = true; await say(['第3・第4石油類の町に着いた。', '煙突の並ぶ工場の町。ボイラーの低い音が響き、歯車がごうんと回っている。', ['セキユ', 'ここは重たい油の町だ。茶色の斧は第3石油類、灰色の大槌は第4石油類だぞ。']]); }
      if (ev.to === 'town10' && !s.flags.town10) { s.flags.town10 = true; await say(['第2石油類の町に着いた。', '黄色い旗の城下町。家々の前に灯油の缶が並び、トラックが行き来している。', ['セキユ', 'ここは第2石油類の町だ。黄色い体に槍が目じるし。霧の炎に気をつけろよ。']]); }
      if (ev.to === 'town9' && !s.flags.town9) { s.flags.town9 = true; await say(['アルコール類の町に着いた。', '町の真ん中に、青白い教会が建っている。どこからか、お酒のような甘いにおいがする。', ['セキユ', 'ここはアルコール類の町だ。青白く透ける体に杖が目じるしだぞ。']]); }
      if (ev.to === 'town8' && !s.flags.town8) { s.flags.town8 = true; await say(['第1石油類の町に着いた。', '町じゅうにガソリンスタンドがあり、赤い旗がはためいている。', ['セキユ', 'ここは引火点が21℃未満の連中の町だ。赤い服に細い剣が目じるしだぞ。']]); }
      if (ev.to === 'town7' && !s.flags.town7) { s.flags.town7 = true; await say(['特殊引火物の町に着いた。', '町のあちこちに、黒紫の旗がはためいている。空気がひんやりして、つんとしたにおいがする。', ['セキユ', 'ここは第4類でいちばん燃えやすい連中の町だ。まずは町の入口の「黒紫の門」で、この国の魔物の見分け方から教えるぞ。']]); }
      if (ev.to === 'tower5' && !s.flags.tower5) { s.flags.tower5 = true; await say(['化学の塔に入った。', 'ガラスの器具がずらりと並び、あちこちで色のちがう液がぶくぶく泡立っている。', ['ケミ', 'ここはわたしの得意分野よ。物が「別の物に変わる」仕組みを学ぶ塔なの。'], ['ケミ', '4つの部屋を回って、最上階をめざしましょう。4つめの部屋では、第4類の正体につながる「有機化合物」も教えるわね。']]); }
      if (ev.to === 'dungeon4' && !s.flags.dungeon4) { s.flags.dungeon4 = true; await say(['熱の洞窟に入った。', 'むっとする熱気。足もとの岩のすき間から、湯気がしゅうしゅうと噴き出している。', ['ケミ', 'ここでは、物が熱でどう変わるかを学ぶわ。溶ける、湯気になる、浮く、沈む、ふくらむ……全部「熱」と「物の性質」のお話よ。'], ['ケミ', '4つの部屋を順に回って、いちばん奥の大広間をめざしましょう。']]); }
      if (ev.to === 'town5' && !s.flags.town5) { s.flags.town5 = true; await say(['消火の町に着いた。', '通りのあちこちに、消火器と水バケツが並んでいる。……でも、どれも使い方がおかしいようだ。', ['ケミ', 'ここは火を「消す」ことを学ぶ町よ。燃焼の町の裏返しね。']]); }
      if (ev.to === 'castle3' && !s.flags.castle3) { s.flags.castle3 = true; await say(['法令の城に入った。', '赤いじゅうたんの上に、破られた届出書が散らばっている。', ['ホアン', 'ここは法令の国の中心。城の主ムトドケが、届出も規程も、ぜんぶ無視させているそうです。'], ['ホアン', '届出、予防規程、貯蔵と取扱いの決まり、事故のときの決まり。法令の国で学ぶ最後の部屋です！']]); }
      if (ev.to === 'town3' && !s.flags.town3) { s.flags.town3 = true; await say(['保安の町に着いた。', '町の中央に、大きな講習所が建っている。', ['ホアン', 'ここは危険物取扱者の町。免状や講習、保安の体制を学びましょう。']]); }
      if (ev.to === 'town2' && !s.flags.town2) { s.flags.town2 = true; await say(['許可の町に着いた。', 'あちこちで工事の音がする。真新しいタンク、建てかけの倉庫……。', ['ホアン', 'ここは「製造所等」をつくる手続きを学ぶ町です。許可、承認、届出。順番に見ていきましょう。']]); }
      if (ev.to === 'town1' && !s.flags.town1) { s.flags.town1 = true; await say(['定義の町に着いた。', '町の人たちが、樽の前で困り果てている……。', '（役場で話を聞いてみよう）']); }
      return;
    }
    if (ev.type === 'building') return this.building(ev);
    if (ev.type === 'stage') return this.stage(ev.id);
    if (ev.type === 'sign') return say(ev.text);
    if (ev.type === 'spring') { this.healAll(); return say(['青く光る泉の水を飲んだ。', 'HPとMPが回復した！']); }
    if (ev.type === 'chest') {
      s.chests = s.chests || {}; if (s.chests[ev.id]) return say('宝箱は空っぽだ。');
      s.chests[ev.id] = true; s.items[ev.item] = (s.items[ev.item] || 0) + ev.n; if (this.field.openChests) this.field.openChests();
      return say([`宝箱を開けた！`, `${this.world.items[ev.item].name}を${ev.n}個手に入れた！`].concat(ev.note ? [ev.note] : []));
    }
  }
  stageVisible(id) {
    if (!this.state) return false; const S = this.world.stages[id];
    if (!S || !S.boss) return true; const pre = id.replace('boss', '4');
    return !!this.state.cleared[pre] || !!this.state.cleared[id];
  }
  async building(ev) {
    const s = this.state;
    if (ev.id === 'firehouse') return this.roshi();
    if (ev.id === 'koshujo') return say([['講習所の係員', 'ここでは都道府県知事等が行う保安講習を開いています。'], ['講習所の係員', '製造所等で危険物の仕事をしている危険物取扱者は、決まった時期に受講してくださいね。受講しないと、免状の返納を命じられることがありますよ。']]);
    if (ev.id === 'inn') {
      const v = await choose('宿屋「旅人のやすらぎ」', [{ label: '泊まる（無料）', value: 'stay' }]);
      if (v) { this.healAll(); s.lastInn = { map: this.field.mapId, x: ev.x, y: ev.y + 1 }; await say('ぐっすり眠った。HPとMPが回復した！'); await this.letter(); }
      return;
    }
    if (ev.id === 'shop') {
      while (true) {
        const its = Object.entries(this.world.items).filter(([, I]) => I.price > 0).map(([k, I]) => ({ label: I.name, note: `${I.price}G（持っている数 ${s.items[k] || 0}）`, value: k, disabled: s.gold < I.price || (s.items[k] || 0) >= 9 }));
        its.push({ label: '知恵の釜（調合する）', value: 'kama', note: '問題に正解すると完成' });
        const v = await choose(`道具屋（所持金 ${s.gold}G）`, its); if (!v) return;
        if (v === 'kama') { await this.kama(); continue; }
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
    const G = this.guide();
    const s = this.state, S = this.world.stages[id];
    if (!s.flags.hoan) { await say('（まずは役場で話を聞いてみよう）'); this.field.y -= 0; return; }
    if (s.cleared[id]) { await say(`${S.name}の事件は解決した。`); return; }
    if (S.need && !s.cleared[S.need]) { await say([[G, `ここはあとにしましょう。先に「${this.world.stages[S.need].name}」の事件を。`]]); return; }
    const go = await choose(`${S.name}`, [{ label: '事件の現場に入る', value: 1 }]); if (!go) return;
    if (S.boss) { // ボス戦の前の作戦会議：この町で学んだ要点とボスの弱点の手がかり
      const town = id.split('-')[0];
      const pts = Object.entries(this.world.stages).filter(([k, X]) => k.startsWith(town + '-') && !X.boss).map(([, X]) => X.lesson[X.lesson.length - 1][1]);
      const E = this.world.enemies[S.enemy];
      const c = await choose(`${G}「ボスに挑む前に、作戦会議をしますか？」`, [{ label: '作戦会議をする', value: 1 }, { label: 'すぐに挑む', value: 2 }], { cancel: false });
      if (c === 1) await say([[G, 'この町で学んだことを振り返りましょう。']].concat(pts.map(p => [G, p])).concat([[G, `${E.name}の弱点は「${E.weak}」に関わる知識のはずです。予告が出たら、落ち着いて思い出しましょう。`]]));
    }
    Learn.subject = id[0] === 'P' ? '物理・化学' : id[0] === 'H' ? '性質・消火' : id[0] === 'F' ? '総合' : '法令';
    await say(S.lesson);
    if (S.skill && !s.skills.includes(S.skill)) {
      s.skills.push(S.skill); const K = this.world.skills[S.skill];
      await say([`${K.user === 'hero' ? s.name : this.world.memberNames[K.user] || K.user}は「${K.name}」を覚えた！`, K.desc]);
    }
    const r = await this.battle(S.enemy, { noFlee: !!S.boss, stage: true, town: id.split('-')[0], stageId: id });
    if (r === 'lose') return this.retreat();
    if (r !== 'win') { await say([[G, 'いったん引きましょう。準備ができたら、また来てください。']]); return; }
    s.cleared[id] = true;
    if (S.doc && !(s.docs || (s.docs = [])).includes(S.doc)) { s.docs.push(S.doc); await say([`大事なもの「${S.doc}」を手に入れた！`, [G, S.doc === '許可書' ? '設置の許可を受けた証です。次は工事、そして完成検査。手続きには順番があります。' : '完成検査で基準に適合していると認められた証です。これでようやく使い始められます。']]); }
    if (S.boss) return ({ 'L1-boss': () => this.ending(), 'L2-boss': () => this.ending2(), 'L3-boss': () => this.ending3(), 'D1-boss': () => this.ending4(), 'D2-boss': () => this.ending5(), 'D3-boss': () => this.ending6(), 'P1-boss': () => this.ending7(), 'P2-boss': () => this.ending8(), 'P3-boss': () => this.ending9(), 'P4-boss': () => this.ending10(), 'H1-boss': () => this.ending11(), 'H2-boss': () => this.ending12(), 'H3-boss': () => this.ending13(), 'H4-boss': () => this.ending14(), 'H5-boss': () => this.ending15(), 'H6-boss': () => this.ending16(), 'H7-boss': () => this.ending17(), 'H8-boss': () => this.ending18(), 'F-boss': () => this.finalBoss() })[id]();
    // ホアンの確認：そのステージの五肢択一から2問（未出題を優先）
    const done = new Set(Learn.d.answers.map(a => a.qid));
    const [town, sn] = id.split('-');
    const pool = this.questions.filter(q => q.town === town && q.stage === Number(sn) && q.kind === 'mcq5');
    const qs = pool.filter(q => !done.has(q.id)).concat(pool.filter(q => done.has(q.id))).slice(0, 2);
    if (!qs.length) return;
    await say([[G, '事件は解決です。念のため、書類で確かめておきましょう。']]);
    const hero = s.members.hero, again = [];
    for (const q of qs) { const a = await ask(q, { title: `${G}の確認`, mode: 'stage', hint: { cost: 1, use: () => { if (hero.mp < 1) return false; hero.mp -= 1; return true; } } }); if (!a.correct || a.unsure || a.hint) again.push(q); }
    if (again.length) { await say([[G, 'まちがえた・迷ったところを、もう一度確かめましょう。']]); for (const q of again) await ask(q, { title: 'ふりかえり', mode: 'furikaeri' }); }
    await say([[G, sn === '4' ? (town === 'Q1' ? 'タンク職人の依頼は、これで全部片づきました！ ゲンさんに知らせましょう。' : town === 'Q2' ? '倉庫番の依頼は、これで全部片づきました！ クラさんに知らせましょう。' : town[0] === 'D' ? '道をふさぐ魔物は片づきました。……奥の広間から、重い足音が聞こえます！' : 'これで町の4つの事件はすべて解決……いや、町はずれに、大きな影が！') : 'つぎの現場へ行きましょう。宿屋で休むのも忘れずに。']]);
    if (id === 'Q2-4' && !s.flags.q2reward) { s.flags.q2reward = true; s.gold += 400; s.items.mizu = Math.min(9, (s.items.mizu || 0) + 3); await say(['（クラさんから、お礼が届いた）', `${this.world.items.mizu.name}3個と400ゴールドを手に入れた！`]); }
    if (id === 'Q1-4' && !s.flags.q1reward) { s.flags.q1reward = true; s.items.yakusou = Math.min(9, (s.items.yakusou || 0) + 5); s.items.mizu = Math.min(9, (s.items.mizu || 0) + 3); s.gold += 300; const I = this.world.items; await say(['（ゲンさんから、お礼が届いた）', `${I.yakusou.name}5個、${I.mizu.name}3個、300ゴールドを手に入れた！`]); }
  }
  async retreat() {
    this.healAll(); const L = this.state.lastInn; this.field.load(L.map, L.x, L.y);
    await say(['目の前が真っ暗になった……。', '気がつくと、宿屋で寝かされていた。（失ったものはない）', [this.guide(), '予告が出たら「たいさく」です。正体を見抜けば、再生も止まります。']]);
  }
  async battle(enemyId, opt) {
    $('#pad').classList.add('hide'); const ar = this.world.enemies[enemyId].area || ''; Learn.subject = ar === 'tutorial' ? '導入' : ar[0] === 'P' ? '物理・化学' : ar[0] === 'H' ? '性質・消火' : ar[0] === 'F' ? '総合' : '法令';
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
    const wild = (this.field.map.wild || []).filter(id => (s.zukan[id] || {}).defeated); // 教える前に戦わせない：倒したことのある魔物だけ
    return this.battle(pick(wild.length ? wild : this.field.map.wildPre || ['kemurin', 'hibana']), {});
  }

  // ---------- メニュー ----------
  async menu() {
    if (this.field.busy) return; this.field.busy = true;
    try {
      while (true) {
        const v = await choose('メニュー', [
          { label: 'つよさ', value: 'st' }, { label: 'とくぎ', value: 'sk' }, { label: 'ふくろ', value: 'bag' },
          { label: 'きろく（学習）', value: 'rec' }, { label: 'にがて', value: 'weak' }, { label: 'ずかん', value: 'zk' }, { label: 'せってい', value: 'set' }]);
        if (!v) break;
        if (v === 'st') await say(this.state.party.map(id => { const m = this.state.members[id]; return `${m.name}　Lv${m.lv}　HP ${m.hp}/${m.mhp}　MP ${m.mp}/${m.mmp}　こうげき ${m.atk}　まもり ${m.def}`; }).concat([`所持金 ${this.state.gold}G`]));
        if (v === 'sk') await say(this.state.skills.length ? this.state.skills.map(id => { const K = this.world.skills[id]; const rust = K.kids.some(k => Learn.isDue(k)); return `${K.name}（${K.user === 'hoan' ? 'ホアン' : this.state.name}・MP${K.mp}）${rust ? '【さび】' : ''}：${K.desc}`; }) : 'まだ技を覚えていない。');
        if (v === 'bag') await this.bag();
        if (v === 'rec') await this.recordScreen();
        if (v === 'weak') await this.weakScreen();
        if (v === 'zk') { const z = this.state.zukan; const ks = Object.keys(z).filter(k => z[k].defeated); await say(ks.length ? ks.map(k => `${this.world.enemies[k].name}（倒した数 ${z[k].defeated}）弱点：${z[k].weak || '？（物質識別で見抜くと記録される）'}`) : 'まだ魔物を倒していない。'); }
        if (v === 'set') { const r = await this.settings(); if (r) { this.field.busy = false; return this.title(); } }
      }
    } finally { this.field.busy = false; }
  }
  // 知恵の釜（仕様書 第6章）：材料を入れ、問題に正解すると道具ができる。失敗しても材料は減らない
  async kama() {
    const s = this.state, I = this.world.items, R = this.world.recipes;
    if (!s.flags.kama) { s.flags.kama = true; await say([['道具屋', 'それは「知恵の釜」。材料を入れて、釜の問いに正しく答えると、新しい道具ができるんだ。'], ['道具屋', 'まちがえても材料はなくならないよ。何度でもためしてごらん。']]); }
    while (true) {
      const v = await choose('知恵の釜', Object.entries(R).map(([k, r]) => ({ label: I[k].name, note: r.need.map(([m, n]) => `${I[m].name}×${n}`).join('＋') + `（持っている数 ${s.items[k] || 0}）`, value: k,
        disabled: r.need.some(([m, n]) => (s.items[m] || 0) < n) || (s.items[k] || 0) >= 9 })));
      if (!v) return;
      const learned = this.questions.filter(q => q.kind === 'mcq5' && Learn.learned(q.knowledge_id) && !q.call && q.pool !== 'mock');
      const q = pick(learned.length ? learned : this.questions.filter(x => x.town === 'V0'));
      await say('材料を釜に入れた。釜がぐつぐつと問いかけてくる……！');
      const r = await ask(q, { title: '知恵の釜の問い', mode: 'battle' });
      if (!r.correct) { await say('釜はしゅうっと静かになった。調合は失敗……（材料はなくなっていない）'); continue; }
      R[v].need.forEach(([m, n]) => { s.items[m] -= n; }); s.items[v] = (s.items[v] || 0) + 1;
      await say([`ぽんっ！ ${I[v].name}ができた！`, `${I[v].name}：${I[v].desc}`]);
    }
  }
  guide() { const p = this.state.party; return p.includes('kemi') ? 'ケミ' : p.includes('sekiyu') ? 'セキユ' : p.includes('hoan') ? 'ホアン' : 'ショウボウ老師'; }
  // 仲間の手紙：宿屋で泊まると、1日1回、復習の時期が来た知識を仲間が手紙で思い出させてくれる（答えは書かず、分野名だけ）
  async letter() {
    const s = this.state, today = studyDay();
    if (s.flags.letterDay === today) return;
    const due = Learn.dueKids(today); if (!due.length) return;
    s.flags.letterDay = today;
    const qs = due.map(k => this.questions.find(q => q.knowledge_id === k && q.kind === 'mcq5') || this.questions.find(q => q.knowledge_id === k)).filter(Boolean);
    const topics = [...new Set(qs.map(q => q.topic))].slice(0, 4);
    const from = s.party.includes('hoan') ? 'ホアン' : 'ショウボウ老師';
    await say([`宿屋の主人「${from}さんから、お手紙が届いていますよ」`, [`${from}の手紙`, `${s.name}さんへ。そろそろ忘れかけているころかもしれない知識を書いておきます。`]]
      .concat([[`${from}の手紙`, topics.map(t => `・「${t}」`).join('\n')]])
      .concat([[`${from}の手紙`, `答えは書きません。目を閉じて、どんな決まりだったか思い出してみてください。今日あたり、戦いの中で問われるかもしれませんよ。`]]));
  }
  // 苦手の判定と練習
  async weakScreen() {
    const w = Learn.weakTopics();
    if (!w.length) return say(['にがての分野は、まだ見つかっていない。', '（同じ分野の問題に3問以上答えると、最近の正答率から判定します。80%未満の分野が「にがて」です）']);
    const v = await choose('にがての分野（最近の正答率）', w.map(x => ({ label: x.topic, note: `${x.rate}%（${x.n}問）`, value: x.topic })).concat([{ label: 'もどる', value: null }]));
    if (!v) return;
    const qs = this.questions.filter(q => q.topic === v && Learn.learned(q.knowledge_id) && !q.call && q.pool !== 'mock');
    if (!qs.length) return say('練習できる問題がない。');
    await say([['ショウボウ老師', `「${v}」の練習じゃな。5問いくぞ。まちがえたら解説をよく読むのじゃ。`]]);
    let ok = 0; const set = qs.sort(() => Math.random() - .5).slice(0, 5);
    for (const q of set) { const r = await ask(q, { title: `にがての練習：${v}`, mode: 'battle' }); if (r.correct) ok++; }
    await say([['ショウボウ老師', `${set.length}問中${ok}問正解じゃ。` + (ok === set.length ? 'よく覚えておる！' : 'まちがえた問題は、また戦いの中で出てくるぞ。')]]);
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
  async examCenter(saved) {
    const cleared = (saved && saved.cleared) || {}, all = !!(saved && saved.flags && saved.flags.cleared);
    const pool = examPool(this.questions, cleared, all);
    const cnt = sj => pool.filter(q => q.subject === sj).length;
    await say(['試験センターへようこそ。ここでは本番と同じ形の模擬試験が受けられます。',
      '本番は、法令15問・物理・化学10問・性質・消火10問の35問を2時間で解きます。科目ごとに6割以上正解すれば合格です。1科目でも6割に届かないと不合格です。',
      all ? '物語をクリアしたので、すべての範囲から出題します。' : `出題は、冒険でもう習った範囲だけです（今は 法令${cnt('法令')}問・物理・化学${cnt('物理・化学')}問・性質・消火${cnt('性質・消火')}問 の中から）。冒険を進めると範囲が広がります。`]);
    const hist = Learn.d.mocks || [];
    const items = Object.entries(FORMS).map(([k, f]) => ({ label: f.name, value: k }));
    if (hist.length) items.push({ label: 'これまでの成績', value: 'hist' });
    const v = await choose('どれを受けますか？', items); if (!v) return;
    if (v === 'hist') { await say(['【これまでの模試】'].concat(hist.slice(-10).map(h => `${h.day} ${h.form}：` + Object.entries(h.by).map(([sj, x]) => `${sj}${x.ok}/${x.n}`).join('・') + (h.pass ? '　合格' : '　不合格')))); return this.examCenter(saved); }
    const form = FORMS[v];
    const short = Object.entries(form.parts).filter(([sj, n]) => cnt(sj) < n);
    if (short.length === Object.keys(form.parts).length && short.every(([sj]) => cnt(sj) === 0)) { await say('まだ習った範囲がありません。冒険を進めてから来てください。'); return; }
    if (short.length) await say(`まだ習った問題が足りない科目があるので、${short.map(([sj, n]) => `${sj}は${cnt(sj)}問`).join('、')}で出題します。`);
    if (form.note) await say(form.note);
    const ok = await choose(`${form.name}を始めます。${form.minutes ? `制限時間は${form.minutes}分です。` : ''}ヒントや正解の表示はありません。`, [{ label: '始める', value: 1 }]); if (!ok) return;
    Learn.examMode = true; Learn.subject = '模試';
    const r = await runExam(this.ui, buildExam(pool, form), form);
    Learn.examMode = false;
    await showResult(r, this.qById);
  }
  async recordScreen() {
    const st = Learn.stats(); const hero = this.state.members.hero;
    await say([
      `【3つの成長指標】`,
      `冒険者レベル：Lv${hero.lv}（ゲームの進み具合。勝敗や合格とは関係ない）`,
      `学習熟練度：学んだ知識${st.learned}こ／安定${st.stable}こ／習得${st.mastered}こ`,
      (() => { const h = (Learn.d.mocks || []).slice(-1)[0]; return h ? `試験戦闘力：最新の模試 ${h.day} ` + Object.entries(h.by).map(([sj, x]) => `${sj}${Math.round(x.ok / x.n * 100)}%`).join('・') + (h.pass ? '（合格ライン）' : '（あと一歩）') : '試験戦闘力：模試は未受験（タイトル画面の「試験センター」で受けられます）'; })(),
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
    // 移動スティック：指の向きで8方向に歩く。指を離すまで歩き続ける
    const stick = $('#stick'), knob = $('#knob'); let pid = null;
    const move = e => {
      const r = stick.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      let dx = e.clientX - cx, dy = e.clientY - cy; const dist = Math.hypot(dx, dy), max = r.width / 2 - 30;
      if (dist > max) { dx = dx / dist * max; dy = dy / dist * max; }
      knob.style.transform = `translate(${dx}px, ${dy}px)`;
      if (dist < 24) { f.held = null; return; }
      // 向きのぶれ止め：今の向きから大きく（約35度以上）ずれた時だけ向きを変える
      const ang = Math.atan2(dy, dx), C = { right: 0, dr: 1, down: 2, dl: 3, left: 4, ul: -3, up: -2, ur: -1 };
      if (f.held && C[f.held] != null) { let df = Math.abs(ang - C[f.held] * Math.PI / 4); if (df > Math.PI) df = 2 * Math.PI - df; if (df < Math.PI / 4 * 1.55) return; }
      const d = dir8(dx, dy); if (f.held !== d) { f.held = d; if (!f.anim) f.step(d); }
    };
    stick.addEventListener('pointerdown', e => { e.preventDefault(); pid = e.pointerId; try { stick.setPointerCapture(pid); } catch (er) {} stick.classList.add('on'); move(e); });
    stick.addEventListener('pointermove', e => { if (e.pointerId === pid) move(e); });
    const up = e => { if (e.pointerId !== pid) return; pid = null; stick.classList.remove('on'); knob.style.transform = ''; f.held = null; };
    stick.addEventListener('pointerup', up); stick.addEventListener('pointercancel', up);
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
