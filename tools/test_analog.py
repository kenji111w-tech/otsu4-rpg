# アナログ移動と💬の確認
import asyncio, math
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox','--use-gl=swiftshader','--enable-webgl','--ignore-gpu-blocklist'])
        pg = await b.new_page(viewport={'width':390,'height':844}, device_scale_factor=1, is_mobile=True, has_touch=True)
        errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto('http://localhost:8765/index.html'); await pg.wait_for_timeout(800)
        await pg.evaluate("""(async()=>{document.querySelector('.titlemenu .item').click(); await new Promise(r=>setTimeout(r,200)); document.querySelector('.menu .item').click(); })(); 0""")
        await pg.wait_for_timeout(500)
        for _ in range(30):
            await pg.evaluate("document.querySelector('.msg') && document.querySelector('.msg').click()"); await pg.wait_for_timeout(80)
        await pg.evaluate("(()=>{const g=window.__game; g.state.flags.night=false; g.state.flags.tutorial=true; g.state.flags.menu=true; g.updateMenuBtn&&g.updateMenuBtn();})()")
        box = await pg.locator('#stick').bounding_box(); cx, cy = box['x']+box['width']/2, box['y']+box['height']/2
        async def push(ang_deg, ms, r=50):
            a=math.radians(ang_deg); await pg.mouse.move(cx,cy); await pg.mouse.down(); await pg.mouse.move(cx+r*math.cos(a), cy+r*math.sin(a), steps=2); await pg.wait_for_timeout(ms); await pg.mouse.up(); await pg.wait_for_timeout(80)
        pos = "(()=>{const f=window.__game.field; return [f.mapId, +f.px.toFixed(2), +f.py.toFixed(2), f.x, f.y, f.dir]})()"
        g = lambda: pg.evaluate(pos)
        await pg.evaluate("window.__game.field.load('village', 7, 14)"); await pg.wait_for_timeout(300)
        fps = await pg.evaluate("new Promise(r=>{let n=0;const t0=performance.now();const f=()=>{n++; if(performance.now()-t0<1000) requestAnimationFrame(f); else r(n)}; requestAnimationFrame(f)})")
        print('fps', fps)
        print('start', await g())
        await pg.evaluate("window.__game.field.load('village', 7, 9)"); await pg.wait_for_timeout(200)
        for ang,name in [(-90,'上'),(90,'下'),(0,'右'),(180,'左'),(-45,'右上'),(135,'左下'),(-20,'右やや上')]:
            await pg.evaluate("window.__game.field.load('village', 7, 9)"); await pg.wait_for_timeout(150)
            a=await g(); await push(ang, 700); z=await g(); print(name, a[1:3],'->',z[1:3], z[5])
        await pg.evaluate("window.__game.field.load('village', 7, 9)"); await pg.wait_for_timeout(150)
        a=await g(); await push(0, 700, r=14); z=await g(); print('少し倒す 右', a[1:3],'->',z[1:3])
        # 壁ぞい：上の家の壁に向かって右上に押す → 右へすべる
        await pg.evaluate("window.__game.field.load('village', 2, 6)"); await pg.wait_for_timeout(150)
        a=await g(); await push(-60, 900); z=await g(); print('家の下で右上', a[1:3],'->',z[1:3])
        # 扉の吸い寄せ：扉(3,4)の右となり(4,5)から上へ
        await pg.evaluate("(()=>{window.__game.field.load('village', 4, 5); window.__game.state.flags.tutorial=true})()"); await pg.wait_for_timeout(150)
        await push(-90, 1200)
        print('扉', await g(), 'menu/msg:', await pg.evaluate("(document.querySelector('#ui .menu .title')||document.querySelector('#ui .msg')||{}).innerText||'none'"))
        for _ in range(8): await pg.evaluate("document.querySelector('#ui .msg') && document.querySelector('#ui .msg').click()"); await pg.wait_for_timeout(100)
        # 💬：村人に話すと消える
        bub = "(()=>{const f=window.__game.field; f.bubbleT=0; f.updateBubbles(performance.now()); return f.bubbles.map(o=>(o.d.id||o.d.look)+':'+o.b.visible).join(' ')})()"
        print('bubbles', await pg.evaluate(bub))
        await pg.evaluate("(()=>{const f=window.__game.field; f.load('village', 6, 7); f.dir='left'; })()"); await pg.wait_for_timeout(200)
        await pg.evaluate("window.__game.field.action(); 0"); await pg.wait_for_timeout(200)
        for _ in range(12): await pg.evaluate("document.querySelector('#ui .msg') && document.querySelector('#ui .msg').click()"); await pg.wait_for_timeout(100)
        print('話したあと', await pg.evaluate(bub))
        await pg.evaluate("window.__game.dirty=true"); print('戦闘後（窓口）', await pg.evaluate(bub))
        print('errs', errs)
        await b.close()
asyncio.run(main())
