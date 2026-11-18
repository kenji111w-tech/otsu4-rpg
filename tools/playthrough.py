# 自動で試作品を最初から最後まで遊ぶ（UIを実際にタップして進める）
import asyncio, sys, random, json
from playwright.async_api import async_playwright
ACC = float(sys.argv[1]) if len(sys.argv) > 1 else 0.8  # 正答率
random.seed(int(sys.argv[2]) if len(sys.argv) > 2 else 1)

SCEN = """
(async () => {
  const g = window.__game; window.__done = false; window.__log = [];
  const ev = async e => { await g.onEvent(e); };
  try {
    await ev({type:'exit', to:'field', tx:9, ty:16});          // チュートリアル前は出られない
    await ev({type:'building', id:'firehouse'});
    await ev({type:'exit', to:'field', tx:9, ty:16});
    for (let i=0;i<3;i++) await g.encounter();
    await ev({type:'exit', to:'town1', tx:8, ty:14});
    await ev({type:'stage', id:'L1-1'});                         // 役場の前は入れない
    await ev({type:'building', id:'office', x:8, y:3});
    for (const st of ['L1-1','L1-2','L1-3','L1-4','L1-boss']) {
      for (let k=0;k<4 && !g.state.cleared[st];k++) { await ev({type:'building', id:'inn', x:3, y:3}); await ev({type:'stage', id:st}); }
      window.__log.push(st + ':' + !!g.state.cleared[st] + ' lv' + g.state.members.hero.lv);
    }
    await ev({type:'exit', to:'field2', tx:1, ty:8, need:'L1-boss'});
    for (let i=0;i<2;i++) await g.encounter();
    await ev({type:'exit', to:'town2', tx:8, ty:14});
    for (const st of ['L2-1','L2-2','L2-3','L2-4','L2-boss']) {
      for (let k=0;k<4 && !g.state.cleared[st];k++) { await ev({type:'building', id:'inn', x:3, y:3}); await ev({type:'stage', id:st}); }
      window.__log.push(st + ':' + !!g.state.cleared[st] + ' lv' + g.state.members.hero.lv);
    }
    window.__log.push('docs:' + (g.state.docs||[]).join('>'));
    await ev({type:'exit', to:'field3', tx:1, ty:8, need:'L2-boss'});
    await ev({type:'exit', to:'town3', tx:8, ty:14});
    await ev({type:'building', id:'koshujo', x:13, y:8});
    for (const st of ['L3-1','L3-2','L3-3','L3-4','L3-boss']) {
      for (let k=0;k<4 && !g.state.cleared[st];k++) { await ev({type:'building', id:'inn', x:3, y:3}); await ev({type:'stage', id:st}); }
      window.__log.push(st + ':' + !!g.state.cleared[st] + ' lv' + g.state.members.hero.lv);
    }
    await ev({type:'exit', to:'field3', tx:9, ty:2});
    await ev({type:'exit', to:'dungeon1', tx:9, ty:14, need:'L3-boss'});
    await ev({type:'chest', id:'d1c1', item:'yakusou', n:3}); await ev({type:'chest', id:'d1c1', item:'yakusou', n:3});
    for (let i=0;i<2;i++) await g.encounter();
    for (const st of ['D1-1','D1-2','D1-3','D1-4','D1-boss']) {
      for (let k=0;k<4 && !g.state.cleared[st];k++) { await ev({type:'spring'}); await ev({type:'stage', id:st}); if (!g.state.cleared[st]) g.field.load('dungeon1', 9, 14); }
      window.__log.push(st + ':' + !!g.state.cleared[st] + ' lv' + g.state.members.hero.lv);
    }
    await ev({type:'exit', to:'pass2', tx:9, ty:14, need:'D1-boss'});
    await ev({type:'chest', id:'d2c3', item:'yakusou', n:2});
    for (const st of ['D2-1','D2-2','D2-3','D2-4','D2-boss']) {
      for (let k=0;k<4 && !g.state.cleared[st];k++) { await ev({type:'spring'}); await ev({type:'stage', id:st}); if (!g.state.cleared[st]) g.field.load('pass2', 9, 14); }
      window.__log.push(st + ':' + !!g.state.cleared[st] + ' lv' + g.state.members.hero.lv);
    }
    await ev({type:'exit', to:'castle3', tx:9, ty:14, need:'D2-boss'});
    for (const st of ['D3-1','D3-2','D3-3','D3-4','D3-boss']) {
      for (let k=0;k<4 && !g.state.cleared[st];k++) { await ev({type:'spring'}); await ev({type:'stage', id:st}); if (!g.state.cleared[st]) g.field.load('castle3', 9, 14); }
      window.__log.push(st + ':' + !!g.state.cleared[st] + ' lv' + g.state.members.hero.lv);
    }
    for (let i=0;i<2;i++) await g.encounter();
    await g.menu();
  } catch (e) { window.__log.push('ERR ' + e.message + e.stack); }
  window.__done = true;
})(); 0;
"""

async def bot_step(pg, state):
    return await pg.evaluate("""(acc) => {
      const g = window.__game; const ui = document.getElementById('ui');
      const res = ui.querySelector('.quiz.result'); if (res) { res.querySelector('.item').click(); return 'next'; }
      const qz = ui.querySelector('.quiz'); if (qz) {
        const txt = qz.querySelector('.qtext').textContent; const cts = [...qz.querySelectorAll('.choice .ct')].map(b => b.textContent); const q = g.questions.find(x => x.question === txt && cts.every(c => x.choices.includes(c)));
        const btns = [...qz.querySelectorAll('.choice')];
        let target = btns[0];
        if (q) { const right = btns.find(b => b.querySelector('.ct').textContent === q.choices[q.answer]); const wrong = btns.filter(b => b !== right);
          target = Math.random() < acc ? right : (wrong[Math.floor(Math.random()*wrong.length)] || right); }
        if (!target) target = btns[0]; target.click(); (Math.random() < .2 ? qz.querySelector('.uns') : qz.querySelector('.ok')).click(); return 'answer';
      }
      const msg = ui.querySelector('.msg'); if (msg) { msg.click(); return 'msg'; }
      const m = ui.querySelector('.menu'); if (m) {
        const title = (m.querySelector('.title')||{}).textContent || '';
        const items = [...m.querySelectorAll('.item')]; const by = t => items.find(b => b.textContent.startsWith(t));
        const inp = m.querySelector('.inp'); if (inp) { by('決定').click(); return 'prompt'; }
        if (title === 'メニュー') { window.__menuN = (window.__menuN||0)+1; const order=['つよさ','とくぎ','きろく（学習）','ずかん']; const t = order[window.__menuN-1]; (t? by(t): by('もどる')).click(); return 'menu'; }
        if (title === 'ふくろ') { by('もどる').click(); return 'x'; }
        if (title === '役場') { window.__off = (window.__off||0)+1; (window.__off===1? by('届出') : by('もどる')).click(); return 'office'; }
        if (title.startsWith('宿屋')) { by('泊まる').click(); return 'inn'; }
        if (title.includes('のこうどう')) {
          const tai = by('★たいさく'); if (tai) { tai.click(); return 'taisaku'; }
          const sk = by('とくぎ'); if (sk && Math.random() < .45) { sk.click(); return 'skill'; }
          const it = by('どうぐ'); if (it && Math.random() < .06) { it.click(); return 'item'; }
          by('こうげき').click(); return 'atk';
        }
        const first = items.find(b => !b.classList.contains('off') && !b.classList.contains('cancel'));
        (first || by('もどる')).click(); return 'menu:' + title.slice(0,12);
      }
      return 'idle';
    }""", ACC)

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox','--use-gl=swiftshader','--enable-webgl','--ignore-gpu-blocklist'])
        pg = await b.new_page(viewport={'width': 390, 'height': 844}, device_scale_factor=1, is_mobile=True, has_touch=True)
        errs = []
        pg.on('pageerror', lambda e: errs.append('PAGEERR ' + str(e)))
        pg.on('console', lambda m: errs.append(m.text) if m.type == 'error' and 'favicon' not in m.text and '404' not in m.text else None)
        await pg.add_init_script("Math.random = (() => { let s = %d; return () => { s = (s * 1103515245 + 12345) %% 2147483648; return s / 2147483648; }; })(); window.setTimeout = ((st) => (f, ms, ...a) => st(f, Math.min(ms||0, 5), ...a))(window.setTimeout);" % random.randint(1, 10**6))
        await pg.goto('http://localhost:8765/index.html'); await pg.wait_for_timeout(800)
        # タイトル→はじめから→名前→オープニング
        for _ in range(30):
            r = await bot_step(pg, None)
            if r == 'idle' and await pg.evaluate("!!(window.__game.state)"): break
            await pg.wait_for_timeout(30)
        await pg.evaluate(SCEN)
        counts = {}
        for i in range(11000):
            if await pg.evaluate("window.__done"): break
            r = await bot_step(pg, None); counts[r.split(':')[0]] = counts.get(r.split(':')[0], 0) + 1
            await pg.wait_for_timeout(15)
            if i % 150 == 0: print(i, r, await pg.evaluate("JSON.stringify([window.__log, document.getElementById('ui').innerText.slice(0,120)])"), flush=True)
        log = await pg.evaluate("window.__log")
        st = await pg.evaluate("(() => { const g=window.__game; return {cleared:g.state.cleared, lv:g.state.members.hero.lv, gold:g.state.gold, skills:g.state.skills, answers: JSON.parse(localStorage.getItem('otsu4rpg:learn')).answers.length, review: Object.keys(JSON.parse(localStorage.getItem('otsu4rpg:learn')).review).length, saved: !!localStorage.getItem('otsu4rpg:game'), done: window.__done}; })()")
        await pg.screenshot(path='/tmp/end.png')
        print('ACC', ACC, 'steps', counts); print('log', log); print('state', json.dumps(st, ensure_ascii=False)); print('errors', errs or 'none')
        await b.close()
asyncio.run(main())
