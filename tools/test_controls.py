# 操作の確認：斜めに歩ける／ボタン以外をたたいても話せる
import asyncio
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox','--use-gl=swiftshader','--enable-webgl','--ignore-gpu-blocklist'])
        pg = await b.new_page(viewport={'width':390,'height':844}, device_scale_factor=1, is_mobile=True, has_touch=True)
        errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto('http://localhost:8765/index.html'); await pg.wait_for_timeout(1200)
        for _ in range(40):
            if await pg.evaluate("!!(window.__game.state) && !document.querySelector('#ui .msg') && !document.querySelector('#ui .menu')"): break
            await pg.evaluate("""() => { const ui=document.getElementById('ui'); const m=ui.querySelector('.msg'); if (m) return m.click();
              const mm=ui.querySelector('.menu'); if (mm) { const inp=mm.querySelector('.inp'); const it=[...mm.querySelectorAll('.item')]; (it.find(b=>b.textContent.startsWith(inp?'決定':'はじめから'))||it[0]).click(); } }""")
            await pg.wait_for_timeout(120)
        # 村人の横に立って、反対を向いた状態で、パッドのすき間をたたく
        n = await pg.evaluate("(() => { const g=window.__game, f=g.field; f.load('village', 0, 0); const n=g.world.maps.village.npcs[0]; f.x=n.x+1; f.y=n.y; f.dir='right'; return [n.x,n.y]; })()")
        await pg.wait_for_timeout(300)
        pad = await pg.locator('#pad').bounding_box()
        print('pad', pad, await pg.evaluate("(() => { const e=document.elementFromPoint(%d,%d); return e.id+'.'+e.className+' busy:'+window.__game.field.busy+' anim:'+!!window.__game.field.anim; })()" % (pad['x']+pad['width']/2, pad['y']+12)), flush=True)
        await pg.mouse.click(pad['x']+pad['width']/2, pad['y']+12); await pg.wait_for_timeout(400)
        print('talk opened', await pg.evaluate("(document.querySelector('#ui .msg')||{}).innerText || 'none'"), 'dir', await pg.evaluate("window.__game.field.dir"), flush=True)
        for _ in range(10): await pg.evaluate("document.querySelector('#ui .msg') && document.querySelector('#ui .msg').click()"); await pg.wait_for_timeout(150)
        # 斜め：スティックを右上に倒す
        f0 = await pg.evaluate("(() => { const f=window.__game.field; f.load('village', 1, 12); return [f.x,f.y,f.mapId]; })()")
        await pg.wait_for_timeout(300)
        box = await pg.locator('#stick').bounding_box(); cx, cy = box['x']+box['width']/2, box['y']+box['height']/2
        # 上に倒してから右上へずらす（向きの切り替えの確認）
        await pg.mouse.move(cx, cy); await pg.mouse.down(); await pg.mouse.move(cx, cy-60, steps=3); await pg.wait_for_timeout(120)
        p1 = await pg.evaluate("[window.__game.field.x, window.__game.field.y, window.__game.field.held]")
        await pg.mouse.move(cx+45, cy-45, steps=3); await pg.wait_for_timeout(450)
        p2 = await pg.evaluate("[window.__game.field.x, window.__game.field.y, window.__game.field.held]")
        await pg.mouse.up(); await pg.wait_for_timeout(300)
        print('start', f0, 'up', p1, 'upright', p2, flush=True)
        await pg.screenshot(path='/tmp/ctl.png')
        print('errors', errs or 'none')
        await b.close()
asyncio.run(main())
