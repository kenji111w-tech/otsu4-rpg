import asyncio
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox','--use-gl=swiftshader','--enable-webgl','--ignore-gpu-blocklist'])
        pg = await b.new_page(viewport={'width':390,'height':844}, device_scale_factor=2, is_mobile=True, has_touch=True)
        await pg.goto('http://localhost:8765/index.html'); await pg.wait_for_timeout(800)
        await pg.evaluate("""(async()=>{const g=window.__game; document.querySelector('.titlemenu .item').click(); await new Promise(r=>setTimeout(r,200)); document.querySelector('.menu .item').click(); })(); 0""")
        await pg.wait_for_timeout(500)
        for _ in range(8):
            await pg.evaluate("document.querySelector('.msg') && document.querySelector('.msg').click()"); await pg.wait_for_timeout(80)
        await pg.screenshot(path='/tmp/v_village_night.png')
        await pg.evaluate("""(()=>{const g=window.__game; g.state.flags.night=false; g.state.flags.tutorial=true; g.state.party=['hero','hoan']; g.field.party=['hero','hoan']; g.state.skills=['miyaburu']; g.field.load('town1',9,8); })(); 0""")
        await pg.wait_for_timeout(400); await pg.screenshot(path='/tmp/v_town.png')
        await pg.evaluate("window.__game.field.load('field',10,9); 0"); await pg.wait_for_timeout(300); await pg.screenshot(path='/tmp/v_fieldmap.png')
        await pg.evaluate("window.__game.battle('nazono',{noFlee:true}); 0"); await pg.wait_for_timeout(2500)
        await pg.screenshot(path='/tmp/v_battle_cmd.png')
        # こうげき → 敵ターン（予告）
        await pg.evaluate("[...document.querySelectorAll('.menu .item')].find(b=>b.textContent.startsWith('こうげき')).click()"); await pg.wait_for_timeout(300)
        await pg.evaluate("[...document.querySelectorAll('.menu .item')].find(b=>b.textContent.startsWith('こうげき')).click()"); await pg.wait_for_timeout(4000)
        await pg.screenshot(path='/tmp/v_tele.png')
        await pg.evaluate("document.querySelector('.msg') && document.querySelector('.msg').click()"); await pg.wait_for_timeout(500)
        await pg.evaluate("[...document.querySelectorAll('.menu .item')].find(b=>b.textContent.startsWith('★')).click()"); await pg.wait_for_timeout(500)
        await pg.evaluate("document.querySelector('.choice').click()"); await pg.wait_for_timeout(200)
        await pg.screenshot(path='/tmp/v_quiz.png')
        await pg.evaluate("document.querySelector('.confirm .ok').click()"); await pg.wait_for_timeout(300)
        await pg.screenshot(path='/tmp/v_result.png')
        await b.close()
asyncio.run(main())
