// 学習記録・復習・学習時間・バックアップ（仕様書 第8・9・16章）
import { store, studyDay, addDays, SCHEMA_VERSION, APP_VERSION, isStandalone } from './util.js';

// 段階0=当日ふりかえり、1=翌日 … 5=30日後。値は「前回からの間隔（日）」
export const INTERVALS = [0, 1, 2, 4, 7, 16];
const IDLE_LIMIT = 5 * 60 * 1000;

export const Learn = {
  d: null, qById: {}, dataVersion: '',
  init(questions, dataVersion) {
    this.dataVersion = dataVersion;
    questions.forEach(q => this.qById[q.id] = q);
    const raw = store.get('learn');
    this.d = Learn.valid(raw) ? raw : this.blank();
    if (raw && !Learn.valid(raw)) { store.set('learn-broken-' + Date.now(), raw); this.brokenFound = true; }
    this.d.time.bySubject = this.d.time.bySubject || {};
    this.d.pending = this.d.pending || [];
    // 問題データ更新で消えた・停止した問題の記録は保留にする（全体を止めない）
    for (const a of this.d.answers) {
      const q = this.qById[a.qid];
      if (!q || q.review_status === 'suspended' || q.review_status === 'retired') a.held = true;
    }
  },
  blank() {
    return { answers: [], review: {}, time: { total: 0, byDay: {}, bySubject: {} }, lastBackup: null, pending: [] };
  },
  save() { store.set('learn', this.d); },

  // 解答・判断を1件記録し、復習段階を更新する。mode: battle/stage/furikaeri/rust/revive/identify/tutorial
  record(q, { correct, unsure = false, hint = false, mode = 'battle', order = null, ms = 0 }) {
    const today = studyDay();
    this.d.answers.push({ qid: q.id, kid: q.knowledge_id, kind: q.kind, day: today, ts: Date.now(), correct, unsure, hint, mode, order, ms, dv: this.dataVersion });
    if (mode !== 'furikaeri') this.updateReview(q.knowledge_id, { correct, unsure, hint }, today);
    this.save();
  },
  updateReview(kid, { correct, unsure, hint }, today = studyDay()) {
    const r = this.d.review[kid];
    const confident = correct && !unsure && !hint;
    if (!r) { // 初めて学んだ日：結果にかかわらず翌日から
      this.d.review[kid] = { stage: 1, due: addDays(today, 1), first: today, last: today, mastered: false };
      return;
    }
    r.last = today;
    if (r.mastered) { if (!correct || hint) { r.mastered = false; r.stage = 1; r.due = addDays(today, 1); } return; }
    const reached = !r.due || r.due <= today; // 期限が来ているか
    if (confident) {
      if (!reached) return; // 期限前の正解では段階を進めない
      if (r.stage >= 5) { r.mastered = true; r.due = null; }
      else { r.stage += 1; r.due = addDays(today, INTERVALS[r.stage]); }
    } else if (correct && unsure && !hint) {
      if (!reached) return;
      r.due = addDays(today, INTERVALS[Math.max(1, r.stage)]);
    } else { // ヒント使用・誤答
      r.stage = 1; r.due = addDays(today, 1);
    }
  },
  isDue(kid, today = studyDay()) { const r = this.d.review[kid]; return !!(r && !r.mastered && r.due && r.due <= today); },
  dueKids(today = studyDay()) { return Object.keys(this.d.review).filter(k => this.isDue(k, today)); },
  learned(kid) { return !!this.d.review[kid]; },

  // 学習時間：画面表示中で、最後の操作から5分以内だけ数える
  lastInput: Date.now(), examMode: false, _timer: null, subject: '導入',
  startClock() {
    const mark = () => { this.lastInput = Date.now(); };
    ['pointerdown', 'keydown', 'touchstart'].forEach(ev => addEventListener(ev, mark, { passive: true }));
    let tick = 0;
    this._timer = setInterval(() => {
      if (document.visibilityState !== 'visible') return;
      if (!this.examMode && Date.now() - this.lastInput > IDLE_LIMIT) return;
      const day = studyDay();
      this.d.time.total += 1; this.d.time.byDay[day] = (this.d.time.byDay[day] || 0) + 1;
      const sj = this.subject || 'その他'; this.d.time.bySubject[sj] = (this.d.time.bySubject[sj] || 0) + 1;
      if (++tick % 15 === 0) this.save();
    }, 1000);
    addEventListener('visibilitychange', () => { if (document.visibilityState !== 'visible') this.save(); });
  },
  weekSeconds() {
    const today = studyDay(); let s = 0;
    for (let i = 0; i < 7; i++) s += this.d.time.byDay[addDays(today, -i)] || 0;
    return s;
  },
  // 苦手の判定：分野（topic）ごとに、最近の解答の正答率を出す（3問以上答えた分野だけ）
  weakTopics(limit = 3) {
    const by = {};
    for (const a of this.d.answers) { if (a.held || a.mode === 'furikaeri') continue; const q = this.qById[a.qid]; if (!q || q.topic === 'identify') continue; (by[q.topic] = by[q.topic] || []).push(a); }
    return Object.entries(by).map(([t, as]) => { const r = as.slice(-20); const c = r.filter(a => a.correct && !a.hint).length; return { topic: t, n: r.length, rate: Math.round(c / r.length * 100) }; })
      .filter(x => x.n >= 3 && x.rate < 80).sort((a, b) => a.rate - b.rate).slice(0, limit);
  },
  stats() {
    const live = this.d.answers.filter(a => !a.held && a.mode !== 'furikaeri');
    const c = live.filter(a => a.correct).length;
    const kids = Object.values(this.d.review);
    return {
      answers: live.length, correct: c,
      rate: live.length ? Math.round(c / live.length * 100) : 0,
      unsure: live.filter(a => a.unsure).length, hint: live.filter(a => a.hint).length,
      learned: kids.length, stable: kids.filter(r => r.mastered || r.stage >= 3).length,
      mastered: kids.filter(r => r.mastered).length, due: this.dueKids().length,
      held: this.d.answers.filter(a => a.held).length,
    };
  },

  valid(d) {
    try {
      if (!d || typeof d !== 'object' || !Array.isArray(d.answers) || !d.review || typeof d.review !== 'object' || Array.isArray(d.review)) return false;
      if (!d.time || typeof d.time.total !== 'number' || !d.time.byDay || typeof d.time.byDay !== 'object') return false;
      for (const a of d.answers) if (!a || typeof a.qid !== 'string' || typeof a.correct !== 'boolean') return false;
      for (const k in d.review) { const r = d.review[k]; if (!r || typeof r.stage !== 'number' || r.stage < 1 || r.stage > 5) return false; if (r.due != null && !/^\d{4}-\d{2}-\d{2}$/.test(r.due)) return false; }
      return true;
    } catch (e) { return false; }
  },
  // ---- バックアップ（第16-3節） ----
  exportObj(game) {
    return { app: 'otsu4rpg', schema_version: SCHEMA_VERSION, app_version: APP_VERSION, data_version: this.dataVersion,
      saved_at: new Date().toISOString(), saved_from: isStandalone() ? 'home' : 'safari', learn: this.d, game };
  },
  markBackup() { this.d.lastBackup = new Date().toISOString(); this.save(); },
  parseImport(text) {
    let o; try { o = JSON.parse(text); } catch (e) { return { error: 'JSONとして読めませんでした。' }; }
    if (!o || o.app !== 'otsu4rpg' || !o.learn) return { error: '乙4 RPGのバックアップではありません。' };
    if (o.schema_version > SCHEMA_VERSION) return { error: `新しい形式（${o.schema_version}）のバックアップです。アプリを更新してから読み込んでください。` };
    if (!(o.schema_version >= 1)) return { error: '形式の番号がない、または古すぎるバックアップです。読み込めません。' };
    if (!this.valid(o.learn)) return { error: '学習記録の中身が壊れています。読み込めません。（今のデータは変わっていません）' };
    return { ok: o, summary: `保存日時：${o.saved_at && !isNaN(new Date(o.saved_at)) ? new Date(o.saved_at).toLocaleString('ja-JP') : '不明'}\n保存した場所：${o.saved_from === 'home' ? 'ホーム画面版' : 'Safari版'}\n解答数：${(o.learn.answers || []).length}件\n形式：${o.schema_version}／問題データ：${o.data_version}` };
  },
  applyImport(o) {
    this.d = Object.assign(this.blank(), o.learn);
    let held = 0;
    for (const a of this.d.answers) { if (!this.qById[a.qid]) { a.held = true; held++; } }
    this.d.time.bySubject = this.d.time.bySubject || {};
    this.d.lastBackup = new Date().toISOString(); // バックアップから戻したので、バックアップはある
    this.save();
    if (o.game) store.set('game', o.game); else store.del('game');
    return held;
  },
};
