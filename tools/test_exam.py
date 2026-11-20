# 模擬試験を最後まで：本番模試（第1回）を全部答えて採点し、結果画面と記録を確かめる
import asyncio, random
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox','--use-gl=swiftshader','--enable-webgl','--ignore-gpu-blocklist'])
        pg = await b.new_page(viewport={'width':390,'height':844}, is_mobile=True, has_touch=True)
        errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto('http://localhost:8765/index.html'); await pg.wait_for_timeout(1200)
        await pg.evaluate("() => { localStorage.setItem('otsu4rpg:game', JSON.stringify(Object.assign(window.__game.newState('テスト'), { flags: { cleared: true, tutorial: true, menu: true } }))); }")
        await pg.reload(); await pg.wait_for_timeout(1200)
        await pg.evaluate("[...document.querySelectorAll('#ui .menu .item')].find(b => b.textContent.startsWith('試験センター')).click()")
        click = lambda js: pg.evaluate(js)
        for _ in range(30):
            if await pg.evaluate("[...document.querySelectorAll('#ui .menu .item')].some(b => b.textContent.startsWith('本番模試'))"): break
            await click("document.querySelector('#ui .msg') && document.querySelector('#ui .msg').click()"); await pg.wait_for_timeout(150)
        print('menu:', await pg.evaluate("[...document.querySelectorAll('#ui .menu .item')].map(b=>b.textContent).join(' | ')"))
        await click("[...document.querySelectorAll('#ui .menu .item')].find(b => b.textContent.startsWith('本番模試')).click()"); await pg.wait_for_timeout(200)
        await click("[...document.querySelectorAll('#ui .menu .item')].find(b => b.textContent.startsWith('始める')).click()"); await pg.wait_for_timeout(300)
        n = 0
        for i in range(40):
            ch = await pg.query_selector_all('#ui .exam .choice')
            if not ch: break
            await random.choice(ch).click(); n += 1; await pg.wait_for_timeout(40)
            await click("[...document.querySelectorAll('#ui .exam .exbtn')].find(b => /次 →|一覧へ/.test(b.textContent)).click()"); await pg.wait_for_timeout(40)
        await pg.screenshot(path='/tmp/ex_grid.png')
        await click("document.querySelector('#ui .exam .exfin').click()"); await pg.wait_for_timeout(200)
        await click("[...document.querySelectorAll('#ui .menu .item')].filter(b => b.textContent.startsWith('採点する')).pop().click()"); await pg.wait_for_timeout(300)
        await pg.screenshot(path='/tmp/ex_result.png')
        res = await pg.evaluate("document.getElementById('ui').innerText.slice(0,200)")
        for _ in range(30):
            if await pg.evaluate("[...document.querySelectorAll('#ui .menu .item')].some(b => b.textContent.startsWith('はじめから'))"): break
            await click("document.querySelector('#ui .msg') && document.querySelector('#ui .msg').click()"); await pg.wait_for_timeout(120)
        print('answered', n, '| result:', res.replace('\n',' / '))
        print('mocks', await pg.evaluate("JSON.stringify((window.__game && JSON.parse(localStorage.getItem('otsu4rpg:learn')||'{}').mocks||[]).slice(-1))"))
        print('errors', errs or 'none')
        await b.close()
asyncio.run(main())
