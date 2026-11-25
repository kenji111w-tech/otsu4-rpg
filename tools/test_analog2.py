# 押し戻し・💬の大きさの確認
import asyncio, math
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox','--use-gl=swiftshader','--enable-webgl','--ignore-gpu-blocklist'])
        pg = await b.new_page(viewport={'width':390,'height':844}, device_scale_factor=2, is_mobile=True, has_touch=True)
        errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto('http://localhost:8765/index.html'); await pg.wait_for_timeout(800)
        await pg.evaluate("""(async()=>{document.querySelector('.titlemenu .item').click(); await new Promise(r=>setTimeout(r,200)); document.querySelector('.menu .item').click(); })(); 0""")
        await pg.wait_for_timeout(500)
        for _ in range(30): await pg.evaluate("document.querySelector('.msg') && document.querySelector('.msg').click()"); await pg.wait_for_timeout(80)
        await pg.evaluate("(()=>{const g=window.__game; g.state.flags.night=false; g.state.flags.tutorial=true; g.state.flags.menu=true;})()")
        box = await pg.locator('#stick').bounding_box(); cx, cy = box['x']+box['width']/2, box['y']+box['height']/2
        async def push(ang, ms, r=50):
            a=math.radians(ang); await pg.mouse.move(cx,cy); await pg.mouse.down(); await pg.mouse.move(cx+r*math.cos(a), cy+r*math.sin(a), steps=2); await pg.wait_for_timeout(ms); await pg.mouse.up(); await pg.wait_for_timeout(80)
        g = lambda: pg.evaluate("(()=>{const f=window.__game.field; return [f.mapId, +f.px.toFixed(2), +f.py.toFixed(2)]})()")
        clr = "(async()=>{for(let i=0;i<10;i++){const m=document.querySelector('#ui .msg'); if(m) m.click(); await new Promise(r=>setTimeout(r,100));}})()"
        for m,x,y in [('field3',16,11),('castle3',16,1),('field4',9,1),('dungeon1',15,1)]:
            await pg.evaluate(f"window.__game.field.load('{m}',{x},{y})"); await pg.wait_for_timeout(200)
            await push(-90, 1500); await pg.evaluate(clr); a=await g()
            await push(90, 900); await pg.evaluate(clr); z=await g(); print(m,'押し戻し後',a,'→ 下へ',z)
        await pg.evaluate("(()=>{window.__game.dirty=true; window.__game.field.load('village',7,9)})()"); await pg.wait_for_timeout(1200)
        await pg.screenshot(path='/tmp/bub.png', clip={'x':0,'y':60,'width':390,'height':390})
        print('errs', errs); await b.close()
asyncio.run(main())
