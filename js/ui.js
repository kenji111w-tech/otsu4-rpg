// 画面部品：メッセージ窓、選択肢、問題（五肢択一・たいさく）の出題と解説
import { el, shuffle } from './util.js';
import { Learn } from './learn.js';
import { Sound } from './sound.js';

let layer;
export function initUI(root) { layer = root; }

function panel(cls) { const p = el('div', 'win ' + (cls || '')); layer.appendChild(p); return p; }
const close = p => p.remove();

// 会話・ナレーション。lines: [[話者, 文], ...] または文字列
// 《》でかこんだ所を、目立つ色で表示する（重要な所のハイライト）
function markText(box, text) {
  String(text).split(/(《[^》]*》)/).forEach(part => {
    if (part.startsWith('《') && part.endsWith('》')) box.appendChild(el('span', 'hl', part.slice(1, -1)));
    else if (part) box.appendChild(document.createTextNode(part));
  });
  return box;
}
// 町の人の話や合言葉で、数字・決まり言葉を自動で《》にする（「」は魔物のうそにも使うので光らせない）
const HL_RE = /([－−-]?\d[\d,.]*(?:〜[－−-]?\d[\d,.]*)?(?:m|L|kg|℃|％|%|倍|年|か月|日|時間|基|人|kV|V|個)(?:以上|以下|未満|以内|ごと)?|市町村長等の「?許可」?|承認|認可|遅滞なく|10日前まで|火気厳禁|耐アルコール泡|窒息消火|空気より重い|水より軽い|水より重い|低い所|引火点|発火点|沸点)/g;
export function hl(text) { // 《》で囲んだ所はそのまま、それ以外は自動で光らせる。令和8年などの年号は光らせない
  return String(text).split(/(《[^》]*》)/).map(t => t.startsWith('《') ? t : t.replace(HL_RE, (m, a, i) => /(令和|平成|昭和)$/.test(t.slice(Math.max(0, i - 2), i)) ? m : `《${m}》`)).join('');
}
export function say(lines) {
  if (!Array.isArray(lines)) lines = [lines];
  return new Promise(res => {
    const p = panel('msg'); let i = 0;
    const show = () => {
      const ln = lines[i]; p.innerHTML = '';
      const [who, text] = Array.isArray(ln) ? ln : [null, ln];
      if (who) p.appendChild(el('div', 'who', who));
      p.appendChild(markText(el('div', 'txt', ''), text));
      p.appendChild(el('div', 'next', '▼'));
    };
    // 画面のどこをタップしても次へ進む（会話の枠の外も）
    const all = el('div', 'tapall', ''); layer.appendChild(all);
    let t0 = Date.now();
    const next = () => { if (Date.now() - t0 < 120) return; t0 = Date.now(); i++; if (i >= lines.length) { close(p); all.remove(); res(); } else show(); };
    p.addEventListener('click', next); all.addEventListener('click', next);
    show();
  });
}

// メニュー選択。items: [{label, value, disabled, note}]
export function choose(title, items, { cancel = true, cls = '' } = {}) {
  return new Promise(res => {
    const p = panel('menu ' + cls);
    if (title) p.appendChild(el('div', 'title', title));
    items.forEach(it => {
      const b = el('button', 'item' + (it.disabled ? ' off' : ''), '');
      b.appendChild(el('span', '', it.label));
      if (it.note) b.appendChild(el('span', 'note', it.note));
      b.onclick = () => { if (it.disabled) return; close(p); res(it.value); };
      p.appendChild(b);
    });
    if (cancel) { const c = el('button', 'item cancel', 'もどる'); c.onclick = () => { close(p); res(null); }; p.appendChild(c); }
  });
}

export function toast(text, ms = 1600) {
  const t = el('div', 'toast', text); layer.appendChild(t); setTimeout(() => t.remove(), ms);
}

// テキスト入力（名前・バックアップ貼り付け）
export function prompt(title, { value = '', multiline = false, ok = '決定' } = {}) {
  return new Promise(res => {
    const p = panel('menu');
    p.appendChild(el('div', 'title', title));
    const inp = multiline ? el('textarea', 'inp') : el('input', 'inp');
    inp.value = value; p.appendChild(inp);
    const b = el('button', 'item', ok); b.onclick = () => { close(p); res(inp.value); }; p.appendChild(b);
    const c = el('button', 'item cancel', 'もどる'); c.onclick = () => { close(p); res(null); }; p.appendChild(c);
    setTimeout(() => inp.focus(), 50);
  });
}

// 表示順を作る（shuffle: all / none / fix_last）
export function makeOrder(q) {
  const idx = q.choices.map((_, i) => i);
  if (q.shuffle === 'none') return idx;
  if (q.shuffle === 'fix_last') return shuffle(idx.slice(0, -1)).concat(idx.slice(-1));
  return shuffle(idx);
}

// 問題を出す。opts: {title, hint: {available, use()}, mode}
// 戻り値: {correct, unsure, hint, order, ms, chosen}
export function ask(q, { title = '', hint = null, showDraft = true, mode = null, hintText = null, hintLabel = 'ヒント', erase = null } = {}) {
  return new Promise(res => {
    const p = panel('quiz ' + (q.kind === 'situation' ? 'sit' : 'mcq'));
    const order = makeOrder(q);
    const labels = q.kind === 'mcq5' ? ['A', 'B', 'C', 'D', 'E'] : ['1', '2', '3', '4'];
    const t0 = Date.now();
    let sel = null, usedHint = false;
    const head = el('div', 'qhead');
    head.appendChild(el('span', 'qtitle', title || (q.kind === 'mcq5' ? '問題' : 'たいさく')));
    if (showDraft && q.review_status !== 'verified') head.appendChild(el('span', 'draft', '確認前の問題'));
    p.appendChild(head);
    p.appendChild(el('div', 'qtext', q.question));
    const list = el('div', 'choices'); p.appendChild(list);
    const btns = [];
    order.forEach((oi, k) => {
      const b = el('button', 'choice'); b.appendChild(el('span', 'lab', labels[k])); b.appendChild(el('span', 'ct', q.choices[oi]));
      b.onclick = () => { sel = oi; btns.forEach(x => x.classList.remove('sel')); b.classList.add('sel'); confirm.classList.remove('hide'); };
      btns.push(b); list.appendChild(b);
    });
    const hintBox = el('div', 'hintbox hide'); p.appendChild(hintBox);
    const confirm = el('div', 'confirm hide');
    const ok = el('button', 'ok', 'これで決定'), uns = el('button', 'uns', '迷ったけど決定');
    confirm.append(ok, uns); p.appendChild(confirm);
    const htxt = hintText || q.hint;
    if (hint && htxt) {
      const hb = el('button', 'hintbtn', `${hintLabel}（MP${hint.cost || 1}）`);
      hb.onclick = () => { if (usedHint) return; if (!hint.use()) { hb.textContent = 'MPが足りない'; return; } usedHint = true; hintBox.textContent = ''; markText(hintBox, '💡 ' + hl(htxt)); hintBox.classList.remove('hide'); hb.remove(); };
      head.appendChild(hb);
    }
    if (erase && erase.left() > 0) { // けしけし草：まちがいの選択肢を消す（ヒント扱い）
      const eb = el('button', 'hintbtn', `けしけし草（残り${erase.left()}）`);
      eb.onclick = () => { if (!erase.use()) return; usedHint = true; const wrong = btns.map((b, k) => [b, order[k]]).filter(([, oi]) => oi !== q.answer && oi !== sel);
        wrong.sort(() => Math.random() - .5).slice(0, q.choices.length >= 5 ? 2 : 1).forEach(([b]) => { b.disabled = true; b.classList.add('erased'); b.onclick = null; }); eb.remove(); };
      head.appendChild(eb);
    }
    const finish = unsure => {
      const correct = sel === q.answer; const dms = Date.now() - t0;
      // 解説を見る前に記録する（解説画面で閉じても失われない）
      if (mode) Learn.record(q, { correct, unsure: !!unsure, hint: mode === 'furikaeri' ? false : usedHint, mode, order, ms: Date.now() - t0 });
      p.innerHTML = '';
      p.classList.add('result');
      Sound.se(correct ? 'ok' : 'ng');
      p.appendChild(el('div', 'verdict ' + (correct ? 'good' : 'bad'), correct ? (unsure ? '正解！（迷った）' : '正解！') : '不正解……'));
      p.appendChild(el('div', 'qtext small', q.question));
      const ex = el('div', 'expl'); ex.textContent = q.explanation; p.appendChild(ex);
      const det = el('div', 'cexps');
      order.forEach((oi, k) => {
        const row = el('div', 'cexp' + (oi === q.answer ? ' ans' : '') + (oi === sel && oi !== q.answer ? ' mine' : ''));
        row.appendChild(el('span', 'lab', labels[k]));
        const box = el('span', 'ct'); box.appendChild(el('b', '', q.choices[oi])); box.appendChild(el('span', 'why', q.choice_explanations[oi] || '')); row.appendChild(box);
        det.appendChild(row);
      });
      p.appendChild(det);
      if (q.source_title) p.appendChild(el('div', 'src', `根拠：${q.source_title}${q.legal_reference ? '（' + q.legal_reference + '）' : ''}`));
      const nx = el('button', 'item', '次へ'); p.appendChild(nx);
      nx.onclick = () => { close(p); res({ correct, unsure: !!unsure, hint: usedHint, order, ms: Date.now() - t0, dms, chosen: sel }); };
      p.scrollTop = 0;
    };
    ok.onclick = () => sel != null && finish(false);
    uns.onclick = () => sel != null && finish(true);
  });
}
