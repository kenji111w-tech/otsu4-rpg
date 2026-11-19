# 自動で試作品を最初から最後まで遊ぶ（UIを実際にタップして進める）
import asyncio, sys, random, json
from playwright.async_api import async_playwright
MODE = sys.argv[3] if len(sys.argv) > 3 else 'all'
ACC = float(sys.argv[1]) if len(sys.argv) > 1 else 0.8  # 正答率
random.seed(int(sys.argv[2]) if len(sys.argv) > 2 else 1)

SCEN_CH3 = """(async () => {
  const g = window.__game; window.__done = false; window.__log = [];
  const ev = async e => { await g.onEvent(e); };
  try {
    // 第2章から試す：第1章をクリアした状態をつくる
    const s = g.state; Object.keys(g.world.stages).filter(k => /^[LDQP]/.test(k)).forEach(k => s.cleared[k] = true);
    Object.keys(g.world.stages).filter(k => /^[LDQ]/.test(k) && g.world.stages[k].skill).forEach(k => { if (!s.skills.includes(g.world.stages[k].skill)) s.skills.push(g.world.stages[k].skill); });
    s.flags.tutorial = true; s.flags.hoan = true; s.party = ['hero','hoan']; s.members.hero.lv = 23; Object.assign(s.members.hero, {mhp: 130, hp: 130, mmp: 56, mp: 56, atk: 33, def: 27}); s.flags.chapter2 = true; s.members.kemi = {id:'kemi',name:'ケミ',lv:22,hp:112,mhp:112,mp:54,mmp:54,atk:28,def:26,exp:0}; s.party=['hero','kemi'];
    Object.assign(s.members.hoan, {lv: 14, mhp: 78, hp: 78, mmp: 36, mp: 36, atk: 20, def: 18});
    s.items = {yakusou: 8, mizu: 4}; s.gold = 3000;
    g.field.load('tower5', 16, 1);
    await ev({type:'exit', to:'town6', tx:8, ty:14, need:'P4-boss'});
    window.__log.push('party3:' + g.state.party.join(','));
    for (const st of ['H1-1','H1-2','H1-3','H1-4','H1-boss']) {
      for (let k=0;k<4 && !g.state.cleared[st];k++) { await ev({type:'building', id:'inn'}); await ev({type:'stage', id:st}); if (!g.state.cleared[st]) g.field.load('town6', 8, 14); }
      window.__log.push(st + ':' + !!g.state.cleared[st] + ' lv' + g.state.members.hero.lv + '/' + g.state.members.sekiyu.lv);
    }
    g.field.load('town6', 16, 8);
    await ev({type:'exit', to:'town7', tx:8, ty:14, need:'H1-boss'});
    for (const st of ['H2-1','H2-2','H2-3','H2-4','H2-boss']) {
      for (let k=0;k<4 && !g.state.cleared[st];k++) { await ev({type:'building', id:'inn'}); await ev({type:'stage', id:st}); if (!g.state.cleared[st]) g.field.load('town7', 8, 14); }
      window.__log.push(st + ':' + !!g.state.cleared[st] + ' lv' + g.state.members.hero.lv + '/' + g.state.members.sekiyu.lv);
    }
    g.field.load('town7', 16, 7);
    await ev({type:'exit', to:'town8', tx:8, ty:14, need:'H2-boss'});
    for (const st of ['H3-1','H3-2','H3-3','H3-4','H3-boss']) {
      for (let k=0;k<4 && !g.state.cleared[st];k++) { await ev({type:'building', id:'inn'}); await ev({type:'stage', id:st}); if (!g.state.cleared[st]) g.field.load('town8', 8, 14); }
      window.__log.push(st + ':' + !!g.state.cleared[st] + ' lv' + g.state.members.hero.lv + '/' + g.state.members.sekiyu.lv);
    }
    window.__log.push('skills:' + g.state.skills.slice(-3).join(','));
    await g.menu();
  } catch (e) { window.__log.push('EXC ' + e.message + ' ' + e.stack); }
  window.__done = true;
})(); 0;"""
SCEN_CH2 = """(async () => {
  const g = window.__game; window.__done = false; window.__log = [];
  const ev = async e => { await g.onEvent(e); };
  try {
    // 第2章から試す：第1章をクリアした状態をつくる
    const s = g.state; Object.keys(g.world.stages).filter(k => /^[LDQ]/.test(k)).forEach(k => s.cleared[k] = true);
    Object.keys(g.world.stages).filter(k => /^[LDQ]/.test(k) && g.world.stages[k].skill).forEach(k => { if (!s.skills.includes(g.world.stages[k].skill)) s.skills.push(g.world.stages[k].skill); });
    s.flags.tutorial = true; s.flags.hoan = true; s.party = ['hero','hoan']; s.members.hero.lv = 14; Object.assign(s.members.hero, {mhp: 82, hp: 82, mmp: 34, mp: 34, atk: 22, def: 17});
    Object.assign(s.members.hoan, {lv: 14, mhp: 78, hp: 78, mmp: 36, mp: 36, atk: 20, def: 18});
    s.items = {yakusou: 6, mizu: 3}; s.gold = 1000;
    g.field.load('castle3', 16, 1);
    await ev({type:'exit', to:'town4', tx:8, ty:14, need:'D3-boss'});
    window.__log.push('party:' + g.state.party.join(','));
    for (const st of ['P1-1','P1-2','P1-3','P1-4','P1-boss']) {
      for (let k=0;k<4 && !g.state.cleared[st];k++) { await ev({type:'building', id:'inn'}); await ev({type:'stage', id:st}); if (!g.state.cleared[st]) g.field.load('town4', 8, 14); }
      window.__log.push(st + ':' + !!g.state.cleared[st] + ' lv' + g.state.members.hero.lv + '/' + g.state.members.kemi.lv);
    }
    await ev({type:'exit', to:'town5', tx:8, ty:14, need:'P1-boss'});
    for (const st of ['P2-1','P2-2','P2-3','P2-4','P2-boss']) {
      for (let k=0;k<4 && !g.state.cleared[st];k++) { await ev({type:'building', id:'inn'}); await ev({type:'stage', id:st}); if (!g.state.cleared[st]) g.field.load('town5', 8, 14); }
      window.__log.push(st + ':' + !!g.state.cleared[st] + ' lv' + g.state.members.hero.lv + '/' + g.state.members.kemi.lv);
    }
    g.field.load('town5', 16, 7);
    await ev({type:'exit', to:'dungeon4', tx:9, ty:14, need:'P2-boss'});
    for (let i=0;i<2;i++) await g.encounter();
    for (const st of ['P3-1','P3-2','P3-3','P3-4','P3-boss']) {
      for (let k=0;k<4 && !g.state.cleared[st];k++) { await ev({type:'spring'}); await ev({type:'stage', id:st}); if (!g.state.cleared[st]) g.field.load('dungeon4', 9, 14); }
      window.__log.push(st + ':' + !!g.state.cleared[st] + ' lv' + g.state.members.hero.lv + '/' + g.state.members.kemi.lv);
    }
    g.field.load('dungeon4', 15, 1);
    await ev({type:'exit', to:'tower5', tx:9, ty:14, need:'P3-boss'});
    for (let i=0;i<2;i++) await g.encounter();
    for (const st of ['P4-1','P4-2','P4-3','P4-4','P4-boss']) {
      for (let k=0;k<4 && !g.state.cleared[st];k++) { await ev({type:'spring'}); await ev({type:'stage', id:st}); if (!g.state.cleared[st]) g.field.load('tower5', 9, 14); }
      window.__log.push(st + ':' + !!g.state.cleared[st] + ' lv' + g.state.members.hero.lv + '/' + g.state.members.kemi.lv);
    }
    g.field.load('tower5', 16, 1);
    await ev({type:'exit', to:'town6', tx:8, ty:14, need:'P4-boss'});
    window.__log.push('party3:' + g.state.party.join(','));
    for (const st of ['H1-1','H1-2','H1-3','H1-4','H1-boss']) {
      for (let k=0;k<4 && !g.state.cleared[st];k++) { await ev({type:'building', id:'inn'}); await ev({type:'stage', id:st}); if (!g.state.cleared[st]) g.field.load('town6', 8, 14); }
      window.__log.push(st + ':' + !!g.state.cleared[st] + ' lv' + g.state.members.hero.lv + '/' + g.state.members.sekiyu.lv);
    }
    g.field.load('town6', 16, 8);
    await ev({type:'exit', to:'town7', tx:8, ty:14, need:'H1-boss'});
    for (const st of ['H2-1','H2-2','H2-3','H2-4','H2-boss']) {
      for (let k=0;k<4 && !g.state.cleared[st];k++) { await ev({type:'building', id:'inn'}); await ev({type:'stage', id:st}); if (!g.state.cleared[st]) g.field.load('town7', 8, 14); }
      window.__log.push(st + ':' + !!g.state.cleared[st] + ' lv' + g.state.members.hero.lv + '/' + g.state.members.sekiyu.lv);
    }
    g.field.load('town7', 16, 7);
    await ev({type:'exit', to:'town8', tx:8, ty:14, need:'H2-boss'});
    for (const st of ['H3-1','H3-2','H3-3','H3-4','H3-boss']) {
      for (let k=0;k<4 && !g.state.cleared[st];k++) { await ev({type:'building', id:'inn'}); await ev({type:'stage', id:st}); if (!g.state.cleared[st]) g.field.load('town8', 8, 14); }
      window.__log.push(st + ':' + !!g.state.cleared[st] + ' lv' + g.state.members.hero.lv + '/' + g.state.members.sekiyu.lv);
    }
    window.__log.push('skills:' + g.state.skills.slice(-4).join(','));
    await g.menu();
  } catch (e) { window.__log.push('EXC ' + e.message + ' ' + e.stack); }
  window.__done = true;
})(); 0;"""
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
    g.field.load('field3', 9, 4);
    for (const st of ['Q1-1','Q1-2','Q1-3','Q1-4']) {
      for (let k=0;k<4 && !g.state.cleared[st];k++) { await ev({type:'inn', price:0}); await ev({type:'spring'}); await ev({type:'stage', id:st}); if (!g.state.cleared[st]) g.field.load('field3', 9, 4); }
      window.__log.push(st + ':' + !!g.state.cleared[st]);
    }
    window.__log.push('q1reward:' + !!g.state.flags.q1reward);
    g.field.load('field2', 9, 4);
    for (const st of ['Q2-1','Q2-2','Q2-3','Q2-4']) {
      for (let k=0;k<4 && !g.state.cleared[st];k++) { await ev({type:'spring'}); await ev({type:'stage', id:st}); if (!g.state.cleared[st]) g.field.load('field2', 9, 4); }
      window.__log.push(st + ':' + !!g.state.cleared[st]);
    }
    window.__log.push('q2reward:' + !!g.state.flags.q2reward);
    g.field.load('castle3', 16, 1);
    await ev({type:'exit', to:'town4', tx:8, ty:14, need:'D3-boss'});
    window.__log.push('party:' + g.state.party.join(','));
    for (const st of ['P1-1','P1-2','P1-3','P1-4','P1-boss']) {
      for (let k=0;k<4 && !g.state.cleared[st];k++) { await ev({type:'building', id:'inn'}); await ev({type:'stage', id:st}); if (!g.state.cleared[st]) g.field.load('town4', 8, 14); }
      window.__log.push(st + ':' + !!g.state.cleared[st] + ' lv' + g.state.members.hero.lv + '/' + g.state.members.kemi.lv);
    }
    await ev({type:'exit', to:'town5', tx:8, ty:14, need:'P1-boss'});
    for (const st of ['P2-1','P2-2','P2-3','P2-4','P2-boss']) {
      for (let k=0;k<4 && !g.state.cleared[st];k++) { await ev({type:'building', id:'inn'}); await ev({type:'stage', id:st}); if (!g.state.cleared[st]) g.field.load('town5', 8, 14); }
      window.__log.push(st + ':' + !!g.state.cleared[st] + ' lv' + g.state.members.hero.lv + '/' + g.state.members.kemi.lv);
    }
    g.field.load('town5', 16, 7);
    await ev({type:'exit', to:'dungeon4', tx:9, ty:14, need:'P2-boss'});
    for (let i=0;i<2;i++) await g.encounter();
    for (const st of ['P3-1','P3-2','P3-3','P3-4','P3-boss']) {
      for (let k=0;k<4 && !g.state.cleared[st];k++) { await ev({type:'spring'}); await ev({type:'stage', id:st}); if (!g.state.cleared[st]) g.field.load('dungeon4', 9, 14); }
      window.__log.push(st + ':' + !!g.state.cleared[st] + ' lv' + g.state.members.hero.lv + '/' + g.state.members.kemi.lv);
    }
    g.field.load('dungeon4', 15, 1);
    await ev({type:'exit', to:'tower5', tx:9, ty:14, need:'P3-boss'});
    for (let i=0;i<2;i++) await g.encounter();
    for (const st of ['P4-1','P4-2','P4-3','P4-4','P4-boss']) {
      for (let k=0;k<4 && !g.state.cleared[st];k++) { await ev({type:'spring'}); await ev({type:'stage', id:st}); if (!g.state.cleared[st]) g.field.load('tower5', 9, 14); }
      window.__log.push(st + ':' + !!g.state.cleared[st] + ' lv' + g.state.members.hero.lv + '/' + g.state.members.kemi.lv);
    }
    g.field.load('tower5', 16, 1);
    await ev({type:'exit', to:'town6', tx:8, ty:14, need:'P4-boss'});
    window.__log.push('party3:' + g.state.party.join(','));
    for (const st of ['H1-1','H1-2','H1-3','H1-4','H1-boss']) {
      for (let k=0;k<4 && !g.state.cleared[st];k++) { await ev({type:'building', id:'inn'}); await ev({type:'stage', id:st}); if (!g.state.cleared[st]) g.field.load('town6', 8, 14); }
      window.__log.push(st + ':' + !!g.state.cleared[st] + ' lv' + g.state.members.hero.lv + '/' + g.state.members.sekiyu.lv);
    }
    g.field.load('town6', 16, 8);
    await ev({type:'exit', to:'town7', tx:8, ty:14, need:'H1-boss'});
    for (const st of ['H2-1','H2-2','H2-3','H2-4','H2-boss']) {
      for (let k=0;k<4 && !g.state.cleared[st];k++) { await ev({type:'building', id:'inn'}); await ev({type:'stage', id:st}); if (!g.state.cleared[st]) g.field.load('town7', 8, 14); }
      window.__log.push(st + ':' + !!g.state.cleared[st] + ' lv' + g.state.members.hero.lv + '/' + g.state.members.sekiyu.lv);
    }
    g.field.load('town7', 16, 7);
    await ev({type:'exit', to:'town8', tx:8, ty:14, need:'H2-boss'});
    for (const st of ['H3-1','H3-2','H3-3','H3-4','H3-boss']) {
      for (let k=0;k<4 && !g.state.cleared[st];k++) { await ev({type:'building', id:'inn'}); await ev({type:'stage', id:st}); if (!g.state.cleared[st]) g.field.load('town8', 8, 14); }
      window.__log.push(st + ':' + !!g.state.cleared[st] + ' lv' + g.state.members.hero.lv + '/' + g.state.members.sekiyu.lv);
    }
    window.__log.push('skills:' + g.state.skills.slice(-4).join(','));
    g.state.items.yakusou = 9; g.state.items.mizu = 3;
    await ev({type:'building', id:'shop'});
    window.__log.push('kama keshi:' + (g.state.items.keshi||0) + ' jouyaku:' + (g.state.items.jouyaku||0));
    await g.weakScreen(); window.__log.push('weak-ok');
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
      const msg = ui.querySelector('.msg'); if (msg) { if (msg.innerText.includes('苦手だった')) window.__log.push('WEAKMSG'); msg.click(); return 'msg'; }
      const m = ui.querySelector('.menu'); if (m) {
        const title = (m.querySelector('.title')||{}).textContent || '';
        const items = [...m.querySelectorAll('.item')]; const by = t => items.find(b => b.textContent.startsWith(t));
        const inp = m.querySelector('.inp'); if (inp) { by('決定').click(); return 'prompt'; }
        if (title === 'メニュー') { window.__menuN = (window.__menuN||0)+1; const order=['つよさ','とくぎ','きろく（学習）','にがて','ずかん']; const t = order[window.__menuN-1]; (t? by(t): by('もどる')).click(); return 'menu'; }
        if (title.startsWith('道具屋')) { window.__shopN = (window.__shopN||0)+1; const k = by('知恵の釜'); if (window.__shopN === 1 && k) { k.click(); return 'kama'; } (m.querySelector('.cancel') || by('もどる')).click(); return 'shopx'; }
        if (title === '知恵の釜') { const f = items.find(b => !b.classList.contains('off') && !b.classList.contains('cancel')); (f || m.querySelector('.cancel')).click(); return 'kama2'; }
        if (title.startsWith('にがて')) { const f = items.find(b => !b.classList.contains('off') && !b.classList.contains('cancel')); (f || m.querySelector('.cancel')).click(); return 'weak'; }
        if (title === 'ふくろ') { by('もどる').click(); return 'x'; }
        if (title === '役場') { window.__off = (window.__off||0)+1; (window.__off===1? by('届出') : by('もどる')).click(); return 'office'; }
        if (title.startsWith('宿屋')) { by('泊まる').click(); return 'inn'; }
        if (title.includes('のこうどう')) {
          const sp = by('じゅもん'); if (sp && !sp.classList.contains('off') && Math.random() < .25) { sp.click(); return 'spell'; }
          const sk = by('とくぎ'); if (sk && Math.random() < .45) { sk.click(); return 'skill'; }
          const it = by('どうぐ'); if (it && Math.random() < .06) { it.click(); return 'item'; }
          by('たたかう').click(); return 'atk';
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
        await pg.evaluate(SCEN_CH3 if MODE == "ch3" else SCEN_CH2 if MODE == "ch2" else SCEN)
        counts = {}
        for i in range(17000):
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
