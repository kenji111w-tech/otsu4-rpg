# でたらめ操作テスト：画面のあちこちをたたき、スティックを倒し、メニューを開く。エラーが出ないかを見る
import asyncio, random, sys, time
from playwright.async_api import async_playwright
SEED = int(sys.argv[1]) if len(sys.argv) > 1 else 1; SECS = int(sys.argv[2]) if len(sys.argv) > 2 else 120; TELE = len(sys.argv) > 3
async def main():
    rnd = random.Random(SEED)
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox','--use-gl=swiftshader','--enable-webgl','--ignore-gpu-blocklist'])
        pg = await b.new_page(viewport={'width':390,'height':844}, is_mobile=True, has_touch=True)
        errs = []
        pg.on('pageerror', lambda e: errs.append('PAGEERR ' + str(e)[:300]))
        pg.on('console', lambda m: errs.append('CONSOLE ' + m.text[:300]) if m.type == 'error' and 'favicon' not in m.text else None)
        pg.on('filechooser', lambda fc: asyncio.ensure_future(fc.set_files([])))  # ファイル選びは「やめた」ことにする
        await pg.goto('http://localhost:8765/index.html'); await pg.wait_for_timeout(1000)
        t0 = time.time(); n = 0; stuck = 0; last = ''; hist = []
        while time.time() - t0 < SECS:
            n += 1
            if TELE and n % 60 == 1 and await pg.evaluate("!!(window.__game && window.__game.state && window.__game.field && !document.querySelector('#ui .msg, #ui .menu, #ui .battle, #ui .quiz'))"):
                m = await pg.evaluate("""(() => { const g = window.__game, s = g.state; const ids = Object.keys(g.world.maps).filter(k => !/^fire/.test(k));
                  const k = ids[Math.floor(Math.random() * ids.length)]; const M = g.world.maps[k];
                  Object.keys(g.world.stages).forEach(st => { if (Math.random() < 0.6) s.cleared[st] = true; });
                  Object.assign(s.flags, { tutorial: true, hoan: true, menu: true, kemi: true, sekiyu: true }); s.party = ['hero','hoan','kemi','sekiyu'].filter(x => s.members[x]) ;
                  let x = 1, y = 1; for (let t = 0; t < 200; t++) { x = 1 + Math.floor(Math.random() * (M.tiles[0].length - 2)); y = 1 + Math.floor(Math.random() * (M.tiles.length - 2)); if (g.field.canWalk ? true : true) break; }
                  g.field.load(k, x, y); return k; })()""")
                hist.append('TELE ' + m)
            r = rnd.random()
            try:
                items = await pg.query_selector_all('#ui .menu .item, #ui .quiz .choice, #ui .quiz button, #ui .exam button')
                if items and r < 0.55:
                    it = rnd.choice(items); hist.append(((await it.inner_text())[:30]).replace('\n',' ')); await it.click(timeout=500)
                elif r < 0.75: await pg.mouse.click(rnd.randint(5, 385), rnd.randint(5, 839))
                elif r < 0.9:
                    box = await pg.locator('#stick').bounding_box()
                    if box:
                        cx, cy = box['x'] + box['width']/2, box['y'] + box['height']/2; a = rnd.random() * 6.28
                        import math; await pg.mouse.move(cx, cy); await pg.mouse.down(); await pg.mouse.move(cx + 50*math.cos(a), cy + 50*math.sin(a), steps=2); await pg.wait_for_timeout(rnd.randint(100, 700)); await pg.mouse.up()
                else:
                    btn = await pg.query_selector('#btnM:not(.locked)')
                    if btn and await btn.is_visible(): await btn.click(timeout=500)
            except Exception as e:
                pass
            await pg.wait_for_timeout(rnd.randint(20, 120))
            if n % 50 == 0:
                cur = await pg.evaluate("document.getElementById('ui').innerText.slice(0,60) + '|' + (window.__game && window.__game.field ? window.__game.field.mapId + ',' + window.__game.field.x + ',' + window.__game.field.y : '')")
                stuck = stuck + 1 if cur == last else 0; last = cur
                if stuck >= 6:
                    errs.append('STUCK? ' + cur + ' HIST ' + ' / '.join(hist[-12:])); stuck = 0; await pg.screenshot(path=f'/tmp/stuck_{SEED}.png'); errs.append('HTML ' + (await pg.evaluate("document.getElementById('app').innerHTML.slice(0,600)")))
        info = await pg.evaluate("JSON.stringify({map: window.__game.field && window.__game.field.mapId, cleared: Object.keys((window.__game.state||{}).cleared||{}).length, lv: window.__game.state && window.__game.state.members.hero.lv})")
        print('seed', SEED, 'actions', n, info)
        for e in dict.fromkeys(errs): print(e)
        await b.close()
asyncio.run(main())
