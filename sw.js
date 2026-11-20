// オフライン対応（仕様書 第16-4節）。版を上げるときは VERSION と js/util.js の APP_VERSION をそろえる
const VERSION = '0.9.22-proto';
const CACHE = 'otsu4rpg-' + VERSION;
const FILES = ['./', 'index.html', 'manifest.json', 'css/style.css', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png',
  'js/util.js', 'js/learn.js', 'js/sprites.js', 'js/art.js', 'js/ui.js', 'js/field.js', 'js/field3d.js', 'js/battle.js', 'js/exam.js', 'js/game.js',
  'vendor/three.module.min.js', 'data/world.json', 'data/questions.json', 'data/assets.json'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES))); });
self.addEventListener('activate', e => {
  // otsu4rpg- で始まる古いキャッシュだけを消す（同じサイトの他のリポジトリのキャッシュには触れない）
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('otsu4rpg-') && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('message', e => { if (e.data === 'skipWaiting') self.skipWaiting(); });
const networkFirst = async req => {
  const c = await caches.open(CACHE);
  try {
    const res = await Promise.race([fetch(req), new Promise((_, rj) => setTimeout(() => rj(new Error('timeout')), 3000))]);
    if (res && res.ok) c.put(req, res.clone()); return res;
  } catch (err) { const hit = await c.match(req, { ignoreSearch: true }); if (hit) return hit; throw err; }
};
const cacheFirst = async req => { const hit = await caches.match(req, { ignoreSearch: true }); return hit || fetch(req); };
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url); if (e.request.method !== 'GET' || u.origin !== location.origin) return;
  const p = u.pathname;
  e.respondWith(p.endsWith('/') || p.endsWith('.html') || p.endsWith('.json') ? networkFirst(e.request) : cacheFirst(e.request));
});
