# 物語と短い授業の見本画面を撮る（定義の町 L1-1 → ボス前の推理 → 事件の手帳）
import asyncio, re, sys, os
src = open(os.path.join(os.path.dirname(__file__), 'playthrough.py')).read().replace('asyncio.run(main())', '')
sys.argv = ['x', '0.95', '3']; exec(src)
async def run():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox','--use-gl=swiftshader','--enable-webgl','--ignore-gpu-blocklist'])
        pg = await b.new_page(viewport={'width':390,'height':844}, device_scale_factor=1, is_mobile=True, has_touch=True)
        errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto('http://localhost:8765/index.html'); await pg.wait_for_timeout(1000)
        for _ in range(40):
            r = await bot_step(pg, None)
            if r == 'idle' and await pg.evaluate("!!(window.__game.state)"): break
            await pg.wait_for_timeout(60)
        await pg.evaluate("() => { const g=window.__game; window.__log=[]; g.state.flags.hoan=true; g.state.flags.tutorial=true; g.state.party=['hero','hoan']; g.state.members.hoan={id:'hoan',name:'ホアン',lv:5,hp:60,mhp:60,mp:20,mmp:20,atk:12,def:10,exp:0}; g.field.load('town1',5,8); window.__sd=false; g.stage('L1-1').then(()=>window.__sd=true); }")
        shots = []
        async def shot(name):
            await pg.wait_for_timeout(150); await pg.screenshot(path=f'/tmp/st_{name}.png'); shots.append(name)
        await pg.wait_for_timeout(200)
        # 現場に入る
        await pg.evaluate("[...document.querySelectorAll('#ui .menu .item')][0].click()"); await pg.wait_for_timeout(200)
        for i in range(7):
            await shot(f'seq{i}')
            if not await pg.evaluate("!!document.querySelector('#ui .msg')"): break
            await pg.evaluate("document.querySelector('#ui .msg').click()"); await pg.wait_for_timeout(150)
        # 戦闘はボットで進める。手がかりの画面で撮る
        for i in range(600):
            t = await pg.evaluate("(document.querySelector('#ui .msg')||{}).innerText||''")
            if '手がかり「' in t: await shot('4clue'); break
            await bot_step(pg, None); await pg.wait_for_timeout(40)
        for i in range(200):
            if await pg.evaluate("window.__sd"): break
            await bot_step(pg, None); await pg.wait_for_timeout(40)
        # 手がかりを4つ持った状態でボスの推理
        await pg.evaluate("() => { const g=window.__game, s=g.state; ['L1-1','L1-2','L1-3','L1-4'].forEach(k=>s.cleared[k]=true); s.clues={L1:['油でぬれた大きな足あと','角でひっかいたラベル','書きかえられた台帳','空き地の鍵']}; g.seenSet=()=>new Set(g.questions.map(q=>q.id)); window.__sd=false; g.stage('L1-boss').then(()=>window.__sd=true); }")
        await pg.wait_for_timeout(200); await pg.evaluate("[...document.querySelectorAll('#ui .menu .item')][0].click()"); await pg.wait_for_timeout(200)
        await shot('5reveal')
        print('shots', shots, 'errors', errs or 'none', flush=True)
        await b.close()
asyncio.run(run())
