# 音の確認：AudioContextが作られ、場所や戦いで曲が切りかわり、設定でオフにできるか
import asyncio, sys, os
src = open(os.path.join(os.path.dirname(__file__), 'playthrough.py')).read().replace('asyncio.run(main())', '')
sys.argv = ['x', '0.9', '5']; exec(src)
async def run():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox','--use-gl=swiftshader','--enable-webgl','--ignore-gpu-blocklist','--autoplay-policy=no-user-gesture-required'])
        pg = await b.new_page(viewport={'width':390,'height':844}, is_mobile=True, has_touch=True)
        errs=[]; pg.on('pageerror', lambda e: errs.append(str(e))); pg.on('console', lambda m: errs.append(m.text) if m.type=='error' and '404' not in m.text and 'favicon' not in m.text else None)
        await pg.goto('http://localhost:8765/index.html'); await pg.wait_for_timeout(800)
        await pg.mouse.click(200, 400); await pg.wait_for_timeout(300)
        S = "(() => { const S = window.__game && (window.__sound || null); return null; })()"
        cur = "window.__S.cur ? window.__S.cur.name : null"
        await pg.evaluate("import('./js/sound.js').then(m => window.__S = m.Sound)"); await pg.wait_for_timeout(200)
        print('ctx', await pg.evaluate("window.__S.ctx ? window.__S.ctx.state : 'none'"), 'title:', await pg.evaluate(cur), flush=True)
        for _ in range(40):
            r = await bot_step(pg, None)
            if r == 'idle' and await pg.evaluate("!!(window.__game.state)"): break
            await pg.wait_for_timeout(60)
        print('village:', await pg.evaluate(cur))
        for m in ['town1','town5','town8','field2','dungeon1']:
            await pg.evaluate(f"window.__game.field.load('{m}', 5, 8)"); await pg.wait_for_timeout(100)
            print(m, await pg.evaluate(cur))
        await pg.evaluate("() => { window.__S.jingle('victory', 'field'); }"); await pg.wait_for_timeout(100)
        print('jingle', await pg.evaluate(cur)); await pg.wait_for_timeout(3500); print('after jingle', await pg.evaluate(cur))
        await pg.evaluate("() => { window.__S.setBgm(false); }"); print('off', await pg.evaluate(cur), await pg.evaluate("localStorage.getItem('otsu4rpg:sound')"))
        await pg.evaluate("() => { window.__S.setBgm(true); }"); await pg.wait_for_timeout(100); print('on again', await pg.evaluate(cur))
        print('errors', errs or 'none')
        await b.close()
asyncio.run(run())
