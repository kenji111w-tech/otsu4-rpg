// 試験センター：本番と同じ形の模擬試験（ゲームの世界の外で受ける）
import { el, shuffle, fmtMin } from './util.js';
import { Learn } from './learn.js';
import { choose, say } from './ui.js';

// 本番の形：法令15・物理化学10・性質消火10、2時間。科目ごとに6割以上で合格
export const FORMS = {
  full: { name: '練習模試（本番形式35問・2時間）', parts: { '法令': 15, '物理・化学': 10, '性質・消火': 10 }, minutes: 120 },
  menjo: { name: '練習模試（科目免除：性質・消火10問・35分）', parts: { '性質・消火': 10 }, minutes: 35, note: '乙種の他の類の免状を持っている人は、法令と物理・化学が免除されます。' },
  weak: { name: '苦手中心の練習模試（35問・時間制限なし）', parts: { '法令': 15, '物理・化学': 10, '性質・消火': 10 }, minutes: 0, weak: true },
};

// 出題できる問題：習ったステージの五肢択一だけ（教える前に問わない）
export function examPool(questions, cleared, all = false) {
  return questions.filter(q => q.kind === 'mcq5' && !q.call && q.pool === 'practice' && q.topic !== 'identify' && q.subject in FORMS.full.parts &&
    (all || q.town === 'V0' || cleared[`${q.town}-${q.stage}`]));
}

function score(q) { // 苦手度：まちがい・迷い・ヒント・遅い答えが多いほど高い
  let s = 0; for (const a of Learn.d.answers) if (a.qid === q.id) s += (!a.correct || a.unsure || a.hint || a.ms > 20000) ? 1 : -.5; return s;
}
export function buildExam(pool, form) {
  const out = [], seen = new Set(Learn.d.answers.filter(a => a.mode === 'mock').map(a => a.qid));
  for (const [sj, n] of Object.entries(form.parts)) {
    let cand = pool.filter(q => q.subject === sj);
    if (form.weak) cand = shuffle(cand).sort((a, b) => score(b) - score(a));
    else { // 模試で出ていない問題を優先し、同じ知識が続かないように散らす
      const fresh = shuffle(cand.filter(q => !seen.has(q.id))), old = shuffle(cand.filter(q => seen.has(q.id)));
      cand = fresh.concat(old);
    }
    const kids = new Set(), pickd = [];
    for (const q of cand) { if (pickd.length >= n) break; if (kids.has(q.knowledge_id)) continue; kids.add(q.knowledge_id); pickd.push(q); }
    for (const q of cand) { if (pickd.length >= n) break; if (!pickd.includes(q)) pickd.push(q); }
    out.push(...pickd);
  }
  return out;
}

// 試験を受ける。戻り値：結果オブジェクト
export function runExam(layer, qs, form) {
  return new Promise(res => {
    const root = el('div', 'win exam'); layer.appendChild(root);
    const ans = qs.map(() => null), mark = qs.map(() => false), orders = qs.map(q => shuffle(q.choices.map((c, i) => i)));
    const t0 = Date.now(), limit = form.minutes * 60e3; let cur = 0, timer = null;
    const head = el('div', 'exhead'), tm = el('span', 'extime'), prog = el('span', 'exprog'); head.append(prog, tm); root.appendChild(head);
    const body = el('div', 'exbody'); root.appendChild(body);
    const nav = el('div', 'exnav'); root.appendChild(nav);
    const left = () => Math.max(0, limit - (Date.now() - t0));
    const tick = () => { if (limit) { const l = left(); tm.textContent = `残り ${Math.floor(l / 60e3)}分${String(Math.floor(l / 1e3) % 60).padStart(2, '0')}秒`; if (l <= 0) end(true); } else tm.textContent = `経過 ${fmtMin((Date.now() - t0) / 1e3)}`; };
    const show = () => {
      const q = qs[cur], labels = ['A', 'B', 'C', 'D', 'E'];
      prog.textContent = `問${cur + 1}／${qs.length}（${q.subject}）　答えた数 ${ans.filter(a => a !== null).length}`;
      body.innerHTML = '';
      body.appendChild(el('div', 'qtext', q.question));
      const list = el('div', 'choices');
      orders[cur].forEach((oi, k) => { const b = el('button', 'choice' + (ans[cur] === oi ? ' sel' : '')); b.append(el('span', 'lab', labels[k]), el('span', 'ct', q.choices[oi])); b.onclick = () => { ans[cur] = oi; show(); }; list.appendChild(b); });
      body.appendChild(list);
      const mk = el('button', 'exmark' + (mark[cur] ? ' on' : ''), mark[cur] ? '★ 見直す印あり' : '☆ 見直す印をつける'); mk.onclick = () => { mark[cur] = !mark[cur]; show(); }; body.appendChild(mk);
      nav.innerHTML = '';
      const pv = el('button', 'exbtn', '← 前'); pv.disabled = cur === 0; pv.onclick = () => { cur--; show(); };
      const nx = el('button', 'exbtn', cur === qs.length - 1 ? '一覧へ' : '次 →'); nx.onclick = () => { if (cur < qs.length - 1) { cur++; show(); } else grid(); };
      const gl = el('button', 'exbtn', '一覧'); gl.onclick = grid;
      nav.append(pv, gl, nx);
    };
    const grid = () => {
      body.innerHTML = ''; prog.textContent = `答えた数 ${ans.filter(a => a !== null).length}／${qs.length}　★見直し ${mark.filter(Boolean).length}`;
      const g = el('div', 'exgrid');
      qs.forEach((q, i) => { const b = el('button', 'excell' + (ans[i] !== null ? ' done' : '') + (mark[i] ? ' mark' : ''), String(i + 1)); b.onclick = () => { cur = i; show(); }; g.appendChild(b); });
      body.appendChild(el('div', 'exnote', '番号をタップすると、その問題に戻れます。白は未回答、★は見直す印です。'));
      body.appendChild(g);
      nav.innerHTML = '';
      const bk = el('button', 'exbtn', '問題に戻る'); bk.onclick = show;
      const fin = el('button', 'exbtn exfin', '採点する'); fin.onclick = async () => { const un = ans.filter(a => a === null).length; const ok = await choose(un ? `未回答が${un}問あります。採点しますか？（未回答は不正解）` : '採点しますか？', [{ label: '採点する', value: 1 }]); if (ok) end(false); };
      nav.append(bk, fin);
    };
    let done = false;
    const end = timeUp => {
      if (done) return; done = true; clearInterval(timer); root.remove();
      const ms = Date.now() - t0, by = {};
      qs.forEach((q, i) => { const c = ans[i] === q.answer; (by[q.subject] = by[q.subject] || { n: 0, ok: 0 }).n++; if (c) by[q.subject].ok++;
        Learn.record(q, { correct: c, unsure: mark[i], hint: false, mode: 'mock', order: orders[i], ms: Math.round(ms / qs.length) }); });
      const pass = Object.values(by).every(v => v.ok / v.n >= .6);
      const r = { day: new Date().toISOString().slice(0, 10), form: form.name, by, pass, ms, timeUp, wrong: qs.map((q, i) => ({ q, a: ans[i] })).filter(x => x.a !== x.q.answer).map(x => ({ id: x.q.id, a: x.a })) };
      (Learn.d.mocks = Learn.d.mocks || []).push({ day: r.day, form: r.form, by, pass, ms }); Learn.save();
      res(r);
    };
    timer = setInterval(tick, 1000); tick(); show();
  });
}

export async function showResult(r, qById) {
  const lines = [`【採点結果】${r.form}${r.timeUp ? '（時間切れ）' : ''}`];
  for (const [sj, v] of Object.entries(r.by)) { const p = Math.round(v.ok / v.n * 100); lines.push(`${sj}：${v.ok}／${v.n}問（${p}%）${p >= 60 ? '　合格ライン到達' : '　あと' + (Math.ceil(v.n * .6) - v.ok) + '問'}`); }
  lines.push(r.pass ? '判定：合格！ すべての科目で6割以上です。' : '判定：不合格……。1科目でも6割に届かないと不合格です。');
  lines.push(`かかった時間：${fmtMin(r.ms / 1e3)}`);
  await say(lines);
  if (!r.wrong.length) return;
  const v = await choose(`まちがえた問題（${r.wrong.length}問）を見直しますか？`, [{ label: '見直す', value: 1 }, { label: 'あとで', value: 0 }], { cancel: false });
  if (!v) return;
  for (const w of r.wrong) {
    const q = qById[w.id]; const mine = w.a === null ? '（未回答）' : q.choices[w.a];
    await say([`【${q.subject}】${q.question}`, `あなたの答え：${mine}`, `正解：${q.choices[q.answer]}`, `解説：${q.explanation}`]);
  }
}
