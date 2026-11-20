import asyncio, json
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
        pg = await b.new_page(viewport={'width':390,'height':844})
        await pg.add_init_script('window.setTimeout = ((st) => (f, ms, ...a) => st(f, Math.min(ms||0, 3), ...a))(window.setTimeout);')
        errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto('http://localhost:8765/index.html'); await pg.wait_for_timeout(800)
        # (2) 同じ日に何度正解しても段階は進まない
        r = await pg.evaluate("""(async()=>{ const {Learn}=await import('./js/learn.js'); const {studyDay,addDays}=await import('./js/util.js');
          const t=studyDay(); delete Learn.d.review['X']; for(let i=0;i<7;i++) Learn.updateReview('X',{correct:true,unsure:false,hint:false},t);
          const a=JSON.stringify(Learn.d.review['X']);
          Learn.updateReview('X',{correct:true,unsure:false,hint:false},addDays(t,1)); const b=Learn.d.review['X'].stage;
          Learn.updateReview('X',{correct:false,unsure:false,hint:false},addDays(t,1)); const c=JSON.stringify(Learn.d.review['X']);
          delete Learn.d.review['X']; return [a,b,c]; })()""")
        print('same-day:', r)
        # (1) 壊れたバックアップは拒否される
        r = await pg.evaluate("""(async()=>{ const {Learn}=await import('./js/learn.js'); const g=window.__game;
          const good=Learn.exportObj(null);
          const bad1=JSON.parse(JSON.stringify(good)); bad1.learn.answers='x';
          const bad2=JSON.parse(JSON.stringify(good)); bad2.game={name:'a',map:'nowhere',x:1,y:1,party:['hero'],members:{hero:{hp:1,mhp:1}},items:{},flags:{},cleared:{},gold:0,skills:[]};
          const bad3=JSON.parse(JSON.stringify(good)); delete bad3.schema_version;
          const p1=Learn.parseImport(JSON.stringify(bad1)); const p2=Learn.parseImport(JSON.stringify(bad2)); const p3=Learn.parseImport(JSON.stringify(bad3));
          return [p1.error||'ACCEPTED', p2.error ? p2.error : (g.validGame(p2.ok.game)?'ACCEPTED':'game rejected by validGame'), p3.error||'ACCEPTED']; })()""")
        print('import:', r)
        # 壊れた保存領域で起動しても止まらない
        await pg.evaluate("localStorage.setItem('otsu4rpg:learn', JSON.stringify({answers:'x'})); localStorage.setItem('otsu4rpg:game', JSON.stringify({map:'nowhere'}))")
        await pg.reload(); await pg.wait_for_timeout(1000)
        print('broken boot ui:', (await pg.evaluate("document.getElementById('ui').innerText"))[:80].replace('\n',' / '), '| err:', await pg.evaluate("document.getElementById('err').className"))
        # (3) 高レベルでも知識なしでは強い敵・ボスに勝てない
        await pg.evaluate("localStorage.clear()"); await pg.reload(); await pg.wait_for_timeout(800)
        res = await pg.evaluate("""(async()=>{ const g=window.__game; g.state=g.newState('T'); g.state.party=['hero','hoan']; g.enterWorld();
          for (const id of ['hero','hoan']) Object.assign(g.state.members[id],{lv:30,hp:999,mhp:999,atk:80,def:40});
          const {Battle}=await import('./js/battle.js'); const out={};
          // 知識なし：問題はわざとまちがえる
          const iv=setInterval(()=>{ const ui=document.getElementById('ui'); const rs=ui.querySelector('.quiz.result'); if(rs){rs.querySelector('.item').click();return;} const q=ui.querySelector('.quiz'); if(q){ const txt=q.querySelector('.qtext').textContent; const btns=[...q.querySelectorAll('.choice')]; const cts=btns.map(b=>b.querySelector('.ct').textContent); const qq=g.questions.find(x=>x.question===txt&&cts.every(c=>x.choices.includes(c))); const wb=qq&&btns.find(b=>b.querySelector('.ct').textContent!==qq.choices[qq.answer]); (wb||btns[0]).click(); q.querySelector('.ok').click(); return;} const m=ui.querySelector('.msg'); if(m){m.click();return;}
            const mm=ui.querySelector('.menu'); if(mm){ const it=[...mm.querySelectorAll('.item')].find(b=>b.textContent.startsWith('たたかう')); if(it) it.click(); else { const c=[...mm.querySelectorAll('.item')].find(b=>!b.classList.contains('cancel')); c&&c.click(); } } },5);
          for (const en of ['nazono','ogre']) { const bt=new Battle(g); let turns=0; const orig=bt.enemyTurn.bind(bt); bt.enemyTurn=async()=>{ if(++turns>25){ bt.e.hp=0; bt.timeout=true;} return orig(); };
            const r=await bt.run(en,{noFlee:true}); out[en]= bt.timeout ? 'not defeated after 25 turns' : r; }
          clearInterval(iv); return out; })()""")
        print('no-knowledge high level:', res)
        print('errors', errs or 'none')
        await b.close()
asyncio.run(main())
