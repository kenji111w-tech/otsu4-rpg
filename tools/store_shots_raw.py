# ストア用の素の画面を撮る（390x844、3倍）→ /tmp/ss/raw_*.png
import asyncio, os, random
from playwright.async_api import async_playwright
OUT = '/tmp/ss'; os.makedirs(OUT, exist_ok=True)
HIDE = "() => { const s=document.createElement('style'); s.textContent='.tver,.ver,.version{visibility:hidden!important}'; document.head.appendChild(s); [...document.querySelectorAll('*')].filter(e=>e.children.length===0 && /試作品/.test(e.textContent)).forEach(e=>e.style.visibility='hidden'); }"
MSG = "document.querySelector('#ui .msg') && document.querySelector('#ui .msg').click()"
async def start(pg):
    await pg.goto('http://localhost:8765/index.html'); await pg.wait_for_timeout(2500)
    for _ in range(40):
        if await pg.evaluate("!!(window.__game.state) && !document.querySelector('#ui .msg') && !document.querySelector('#ui .menu')"): break
        await pg.evaluate("""() => { const ui=document.getElementById('ui'); const m=ui.querySelector('.msg'); if (m) return m.click();
          const mm=ui.querySelector('.menu'); if (mm) { const inp=mm.querySelector('.inp'); if (inp && !inp.value) inp.value='ユウキ'; const it=[...mm.querySelectorAll('.item')]; (it.find(b=>b.textContent.startsWith(inp?'決定':'はじめから'))||it[0]).click(); } }""")
        await pg.wait_for_timeout(120)
    await pg.evaluate("() => { const g=window.__game; Object.assign(g.state.flags,{night:false,tutorial:true,menu:true}); g.state.party=['hero','hoan']; g.field.party=['hero','hoan']; }")
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox','--use-gl=swiftshader','--enable-webgl','--ignore-gpu-blocklist'])
        cx = await b.new_context(viewport={'width':390,'height':844}, device_scale_factor=3, is_mobile=True, has_touch=True, service_workers='block')
        pg = await cx.new_page(); errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)))
        # 1 タイトル
        await pg.goto('http://localhost:8765/index.html'); await pg.wait_for_timeout(1500)
        await pg.evaluate(HIDE); await pg.wait_for_timeout(200)
        await pg.screenshot(path=f'{OUT}/raw_1.png')
        await start(pg)
        # 2 町の人の合言葉（ハイライト）
        await pg.evaluate("() => { const g=window.__game; g.field.load('town1',9,8); }"); await pg.wait_for_timeout(400)
        await pg.evaluate("() => { const g=window.__game; g.talk(g.world.maps.town1.npcs[0]); }"); await pg.wait_for_timeout(300)
        for i in range(8):
            if await pg.evaluate("!!document.querySelector('#ui .msg .hl')"): break
            await pg.evaluate(MSG); await pg.wait_for_timeout(250)
        await pg.evaluate(HIDE); await pg.wait_for_timeout(600); await pg.screenshot(path=f'{OUT}/raw_2.png')
        for i in range(30):
            if not await pg.evaluate("!!document.querySelector('#ui .msg')"): break
            await pg.evaluate(MSG); await pg.wait_for_timeout(100)
        # 3 戦い（クイズ）
        await pg.evaluate("() => { window.__game.battle('inkaten',{noFlee:true}); }"); await pg.wait_for_timeout(2500)
        for i in range(40):
            if await pg.evaluate("!!document.querySelector('.choice')"): break
            await pg.evaluate("""() => { const it=[...document.querySelectorAll('.menu .item')]; const c=it.find(b=>/^★/.test(b.textContent))||it.find(b=>b.textContent.startsWith('たたかう')); if (c) return c.click(); const m=document.querySelector('#ui .msg'); m && m.click(); }""")
            await pg.wait_for_timeout(350)
        await pg.evaluate(HIDE); await pg.wait_for_timeout(300)
        await pg.screenshot(path=f'{OUT}/raw_3.png')
        # 4 合言葉帳
        pg2 = await cx.new_page(); await start(pg2)
        await pg2.evaluate("() => { const g=window.__game; g.aiko.filter(t=>['V0','L1','H3','Q2','P1'].includes(t.town)).forEach(t=>(g.state.aiko=g.state.aiko||[]).push(t.id)); g.field.load('town8',9,8); }"); await pg2.wait_for_timeout(500)
        await pg2.evaluate("() => { window.__game.bag(); }"); await pg2.wait_for_timeout(300)
        await pg2.evaluate("[...document.querySelectorAll('#ui .menu .item')].find(b=>b.textContent.startsWith('合言葉帳')).click()"); await pg2.wait_for_timeout(300)
        await pg2.evaluate("() => { const it=[...document.querySelectorAll('#ui .menu .item')].find(b=>b.textContent.startsWith('第1石油類')); it && it.click(); }"); await pg2.wait_for_timeout(400)
        await pg2.evaluate(HIDE); await pg2.screenshot(path=f'{OUT}/raw_4.png')
        # 5 出題メーター
        pg3 = await cx.new_page(); await start(pg3)
        await pg3.evaluate("() => { const g=window.__game; const P=g.townPool(g.mapTown('town1')); g.seenSet=()=>new Set(P.slice(0,Math.round(P.length*0.85)).map(q=>q.id)); g.field.load('town1',9,8); g.updateMeter(); }"); await pg3.wait_for_timeout(500)
        await pg3.evaluate("() => { const g=window.__game; g.field.busy=true; g.meterHelp(); }"); await pg3.wait_for_timeout(400)
        await pg3.evaluate(HIDE); await pg3.screenshot(path=f'{OUT}/raw_5.png')
        await b.close(); print('errors', errs or 'none')
asyncio.run(main())
