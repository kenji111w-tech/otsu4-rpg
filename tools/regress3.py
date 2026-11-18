import asyncio
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
        pg = await b.new_page(viewport={'width':390,'height':844})
        await pg.add_init_script('window.setTimeout = ((st) => (f, ms, ...a) => st(f, Math.min(ms||0, 3), ...a))(window.setTimeout);')
        await pg.goto('http://localhost:8765/index.html'); await pg.wait_for_timeout(800)
        await pg.evaluate("""(async()=>{ const g=window.__game; document.querySelectorAll('#ui > *').forEach(e=>e.remove()); g.state=g.newState('T'); g.state.party=['hero','hoan']; g.enterWorld();
          for (const id of ['hero','hoan']) Object.assign(g.state.members[id],{lv:30,hp:999,mhp:999,atk:80,def:40});
          const {Battle}=await import('./js/battle.js'); window.__out={};
          window.__iv=setInterval(()=>{ const ui=document.getElementById('ui'); const r=ui.querySelector('.quiz.result'); if(r){r.querySelector('.item').click();return;} const q=ui.querySelector('.quiz'); if(q){q.querySelector('.choice').click(); q.querySelector('.ok').click(); return;} const m=ui.querySelector('.msg'); if(m){m.click();return;}
            const mm=ui.querySelector('.menu'); if(mm){ const its=[...mm.querySelectorAll('.item')]; const it=its.find(b=>b.textContent.startsWith('こうげき')); if(it) it.click(); else { const c=its.find(b=>!b.classList.contains('cancel')); c&&c.click(); } } },5);
          for (const en of ['nazono','ogre']) { const bt=new Battle(g); let turns=0; const orig=bt.enemyTurn.bind(bt); bt.enemyTurn=async()=>{ if(++turns>25){ bt.e.hp=0; bt.timeout=true; return; } return orig(); };
            const r=await bt.run(en,{noFlee:true}); window.__out[en]= bt.timeout ? 'not defeated after 25 turns' : r; }
          window.__fin=true; })(); 0""")
        for i in range(120):
            await pg.wait_for_timeout(1000)
            if await pg.evaluate("!!window.__fin"): break
        print(await pg.evaluate("JSON.stringify(window.__out)"), await pg.evaluate("document.getElementById('ui').innerText.slice(0,100)"))
        await b.close()
asyncio.run(main())
