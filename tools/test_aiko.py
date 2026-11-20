# 合言葉の確認：村人から教わる→合言葉帳→戦いのヒントに出る→★よく出る
import asyncio
from playwright.async_api import async_playwright
async def tap_until(pg, cond, n=60, shot=None):
    for i in range(n):
        if await pg.evaluate(cond): return True
        t = await pg.evaluate("""() => { const ui=document.getElementById('ui'); const m=ui.querySelector('.msg'); if (m) { m.click(); return 'msg'; } return 'none'; }""")
        await pg.wait_for_timeout(60)
    return False
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox','--use-gl=swiftshader','--enable-webgl','--ignore-gpu-blocklist'])
        pg = await b.new_page(viewport={'width':390,'height':844}, device_scale_factor=1, is_mobile=True, has_touch=True)
        errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto('http://localhost:8765/index.html'); await pg.wait_for_timeout(1200)
        print('start', flush=True)
        for _ in range(40):
            if await pg.evaluate("!!(window.__game.state) && !document.querySelector('#ui .msg') && !document.querySelector('#ui .menu')"): break
            await pg.evaluate("""() => { const ui=document.getElementById('ui'); const m=ui.querySelector('.msg'); if (m) return m.click();
              const mm=ui.querySelector('.menu'); if (mm) { const inp=mm.querySelector('.inp'); const it=[...mm.querySelectorAll('.item')]; (it.find(b=>b.textContent.startsWith(inp?'決定':'はじめから'))||it[0]).click(); } }""")
            await pg.wait_for_timeout(120)
        await pg.evaluate("() => { window.__p = window.__game.talk(window.__game.world.maps.village.npcs[0]).then(()=>window.__t1=true); }")
        for i in range(4):
            await pg.evaluate("document.querySelector('#ui .msg') && document.querySelector('#ui .msg').click()"); await pg.wait_for_timeout(120)
        await pg.screenshot(path='/tmp/ak1.png')
        await tap_until(pg, "!!window.__t1")
        await pg.evaluate("() => { window.__t1=false; window.__game.state.aiko=[]; window.__game.talk(window.__game.world.maps.dungeon1.npcs[0]).then(()=>window.__t1=true); }")
        await pg.wait_for_timeout(150); await pg.evaluate("document.querySelector('#ui .msg').click()"); await pg.wait_for_timeout(150)
        await pg.screenshot(path='/tmp/ak0.png')
        await tap_until(pg, "!!window.__t1")
        print('village aiko', await pg.evaluate("window.__game.state.aiko"), flush=True)
        # H3の合言葉を聞いた状態にして、ガソリンの問題で戦いのヒントを見る
        await pg.evaluate("""() => { const g=window.__game; g.aiko.filter(t=>['H3','L1'].includes(t.town)).forEach(t=>g.state.aiko.push(t.id)); }""")
        await pg.evaluate("""() => { const g=window.__game; window.__p2 = g.bag().then(()=>window.__t2=true); }""")
        await pg.wait_for_timeout(200)
        await pg.evaluate("[...document.querySelectorAll('#ui .menu .item')].find(b=>b.textContent.startsWith('合言葉帳')).click()"); await pg.wait_for_timeout(200)
        await pg.screenshot(path='/tmp/ak2.png')
        await pg.evaluate("[...document.querySelectorAll('#ui .menu .item')].find(b=>b.textContent.startsWith('第1石油類')).click()"); await pg.wait_for_timeout(200)
        await pg.screenshot(path='/tmp/ak3.png')
        await tap_until(pg, "!!window.__t2")
        await pg.evaluate("""async () => { const g=window.__game; const mod = await import('./js/battle.js'); const bt = new mod.Battle(g); bt.refresh = () => {}; bt.review = [];
          const q = g.questions.find(x => x.town==='H3' && x.topic==='ガソリン' && x.kind==='mcq5'); window.__aq = g.aikoFor(q);
          window.__p3 = bt.askQ(q, 'battle', 'たたかう').then(()=>window.__t3=true); return 1; }""")
        await pg.wait_for_timeout(300)
        await pg.evaluate("document.querySelector('#ui .hintbtn') && document.querySelector('#ui .hintbtn').click()"); await pg.wait_for_timeout(300)
        await pg.screenshot(path='/tmp/ak4.png')
        print('aikoFor', await pg.evaluate("window.__aq"), flush=True)
        print('title', await pg.evaluate("(document.querySelector('#ui .quiz')||{}).innerText.slice(0,40)"), flush=True)
        print('weak', await pg.evaluate("window.__game.trickRate()"), flush=True)
        print('errors', errs or 'none', flush=True)
        await b.close()
asyncio.run(main())
