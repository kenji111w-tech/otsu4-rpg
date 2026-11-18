// フィールド・町を3Dで表示する（three.js）。2D版 Field と同じ使い方
import * as THREE from '../vendor/three.module.min.js';
import { drawCharacter, Assets, STYLE, characterDot } from './art.js';

const BLOCK = new Set(['T', '~', '#', 'R', 'W', 'X']);
const DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
const STEP_MS = 170;

function charTexture(look, dir) {
  let c;
  if (STYLE.dot) c = characterDot(look, dir);
  else { c = document.createElement('canvas'); c.width = 256; c.height = 384; drawCharacter(c.getContext('2d'), 256, 384, look, dir); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  if (STYLE.dot) { t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter; t.generateMipmaps = false; } else t.anisotropy = 4;
  return t;
}
function labelTexture(text) {
  const c = document.createElement('canvas'); c.width = 256; c.height = 72; const x = c.getContext('2d');
  x.fillStyle = 'rgba(10,10,30,.78)'; x.beginPath(); x.roundRect(4, 6, 248, 60, 14); x.fill(); x.strokeStyle = '#ffd76a'; x.lineWidth = 3; x.stroke();
  x.fillStyle = '#fff'; x.font = 'bold 34px sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(text, 128, 38);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

export class Field3D {
  constructor(canvas, world, hooks) {
    this.cv = canvas; this.world = world; this.hooks = hooks;
    this.busy = false; this.dir = 'down'; this.held = null; this.anim = null; this.party = ['hero'];
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
    this.renderer.shadowMap.enabled = true; this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace; this.renderer.toneMapping = THREE.ACESFilmicToneMapping; this.renderer.toneMappingExposure = 1.05;
    this.camera = new THREE.PerspectiveCamera(38, 1, .1, 200);
    this.texCache = {};
    this.resize(); addEventListener('resize', () => this.resize());
    const loop = () => { this.frame(); requestAnimationFrame(loop); }; requestAnimationFrame(loop);
    setInterval(() => { if (this.held && !this.anim && !this.busy) this.step(this.held); }, 40);
  }
  resize() {
    const w = Math.min(this.cv.parentElement.clientWidth || 390, 480), h = Math.round(w * 1.0);
    this.renderer.setSize(w, h); this.camera.aspect = w / h; this.camera.updateProjectionMatrix();
  }
  tex(look, dir) { const k = look + ':' + dir; return this.texCache[k] || (this.texCache[k] = charTexture(look, dir)); }
  tile(x, y) { const r = this.map.tiles[y]; return r ? (r[x] || '#') : '#'; }
  npcAt(x, y) { return (this.map.npcs || []).find(n => n.x === x && n.y === y); }
  eventAt(x, y) { return (this.map.events || []).find(e => e.x === x && e.y === y); }
  canWalk(x, y) { return !BLOCK.has(this.tile(x, y)) && !this.npcAt(x, y); }

  // ---------- 地図を3Dで組み立てる ----------
  load(mapId, x, y) {
    this.mapId = mapId; this.map = this.world.maps[mapId]; this.x = x; this.y = y; this.prev = { x, y: y + 1 }; this.anim = null;
    const scene = this.scene = new THREE.Scene();
    const town = mapId !== 'field' && !this.map.encounter && mapId !== 'village' ? true : false;
    scene.background = new THREE.Color(0x9ccfff); scene.fog = new THREE.Fog(0x9ccfff, 14, 34);
    this.hemi = new THREE.HemisphereLight(0xdfefff, 0x5a7a3a, 1.1); scene.add(this.hemi);
    const sun = this.sun = new THREE.DirectionalLight(0xfff2d8, 2.2); sun.position.set(-6, 12, 6); sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024); Object.assign(sun.shadow.camera, { left: -12, right: 12, top: 12, bottom: -12, near: 1, far: 40 }); sun.shadow.bias = -0.0008;
    scene.add(sun); scene.add(sun.target);
    const H = this.map.tiles.length, W = this.map.tiles[0].length, M = 6; // 周りに余白（森・壁）
    const geoTile = new THREE.BoxGeometry(1, .2, 1);
    const mats = {
      grass: new THREE.MeshLambertMaterial({ color: 0xffffff }), road: new THREE.MeshLambertMaterial({ color: 0xd9c08a }), stone: new THREE.MeshLambertMaterial({ color: 0xb8b0a0 }),
      water: new THREE.MeshPhongMaterial({ color: 0x3a86d8, shininess: 90, transparent: true, opacity: .9 }), dark: new THREE.MeshLambertMaterial({ color: 0x3a3530 }),
    };
    const lists = { grass: [], road: [], stone: [], water: [], dark: [] }, trees = [], walls = [], flowers = [], bridges = [];
    for (let j = -M; j < H + M; j++) for (let i = -M; i < W + M; i++) {
      const inside = i >= 0 && j >= 0 && i < W && j < H; let c = inside ? this.map.tiles[j][i] : (this.map.encounter || mapId === 'village' ? 'T' : '#');
      if (c === '.' || c === 'F' || c === 'T') lists.grass.push([i, j]); else if (c === '=' || c === 'S' || c === 'D') lists[town ? 'stone' : 'road'].push([i, j]);
      else if (c === '~') lists.water.push([i, j]); else if (c === 'B') { lists.water.push([i, j]); bridges.push([i, j]); } else if (c === 'X') lists.dark.push([i, j]); else lists[town ? 'stone' : 'grass'].push([i, j]);
      if (c === 'T') trees.push([i, j]); if (c === '#') walls.push([i, j]); if (c === 'F') flowers.push([i, j]);
    }
    const inst = (geo, mat, arr, f) => { const m = new THREE.InstancedMesh(geo, mat, arr.length); const d = new THREE.Object3D(); arr.forEach((p, k) => { f(d, p, k, m); d.updateMatrix(); m.setMatrixAt(k, d.matrix); }); m.receiveShadow = true; scene.add(m); return m; };
    const col = new THREE.Color();
    inst(geoTile, mats.grass, lists.grass, (d, [i, j], k, m) => { d.position.set(i, -.1, j); col.setHSL(.29 + ((i * 7 + j * 13) % 5) * .006, .5, .38 + ((i * 3 + j * 5) % 4) * .02); m.setColorAt(k, col); });
    inst(geoTile, mats.road, lists.road, (d, [i, j]) => d.position.set(i, -.08, j));
    inst(geoTile, mats.stone, lists.stone, (d, [i, j], k, m) => { d.position.set(i, -.08, j); col.setHSL(.09, .12, .62 + ((i + j) % 2) * .05); m.setColorAt(k, col); });
    this.water = inst(new THREE.BoxGeometry(1, .1, 1), mats.water, lists.water, (d, [i, j]) => d.position.set(i, -.25, j));
    inst(geoTile, mats.dark, lists.dark, (d, [i, j]) => d.position.set(i, -.06, j));
    // 木
    const trunk = inst(new THREE.CylinderGeometry(.08, .12, .6, 8), new THREE.MeshLambertMaterial({ color: 0x6a4428 }), trees, (d, [i, j]) => d.position.set(i, .3, j)); trunk.castShadow = true;
    const leaf = inst(new THREE.IcosahedronGeometry(.48, 1), new THREE.MeshLambertMaterial({ color: 0xffffff, flatShading: true }), trees, (d, [i, j], k, m) => { const s = .85 + ((i * 31 + j * 17) % 7) * .05; d.position.set(i + ((i * 13) % 3 - 1) * .06, .85 * s, j); d.scale.set(s, s * 1.1, s); col.setHSL(.3 + ((i + j) % 3) * .01, .55, .28 + ((i * 7 + j) % 4) * .03); m.setColorAt(k, col); }); leaf.castShadow = true;
    // 石の壁
    const wm = inst(new THREE.BoxGeometry(1, .9, 1), new THREE.MeshLambertMaterial({ color: 0x9a96a0 }), walls, (d, [i, j]) => d.position.set(i, .45, j)); wm.castShadow = true;
    // 花
    inst(new THREE.SphereGeometry(.06, 6, 6), new THREE.MeshLambertMaterial({ color: 0xffffff }), flowers.flatMap(p => [0, 1, 2, 3].map(k => [p, k])), (d, [[i, j], k], n, m) => { d.position.set(i - .3 + k * .2, .06, j + ((k % 2) - .5) * .4); m.setColorAt(n, col.set([0xff7ab0, 0xffe066, 0xff6a5a, 0xffffff][k])); });
    // 橋
    bridges.forEach(([i, j]) => { const b = new THREE.Mesh(new THREE.BoxGeometry(1.02, .12, .9), new THREE.MeshLambertMaterial({ color: 0x9a6a3a })); b.position.set(i, -.02, j); b.receiveShadow = b.castShadow = true; scene.add(b); });
    // 建物（R=家の屋根、W=倉庫）をかたまりごとに作る
    this.buildBlocks('R', H, W); this.buildBlocks('W', H, W);
    // 焼け跡
    lists.dark.forEach(([i, j], k) => { const p = new THREE.Mesh(new THREE.BoxGeometry(.5, .25 + (k % 3) * .1, .15), new THREE.MeshLambertMaterial({ color: 0x1e1a16 })); p.position.set(i + (k % 2 - .5) * .3, .15, j); p.rotation.y = k; p.castShadow = true; scene.add(p); });
    // 看板（施設名）
    (this.map.events || []).filter(e => e.type === 'building').forEach(e => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: labelTexture(e.label), depthTest: false })); s.scale.set(1.3, .37, 1); s.position.set(e.x, 2.15, e.y - .7); s.renderOrder = 10; scene.add(s); });
    // 事件の現場の目印
    this.marks = [];
    (this.map.events || []).filter(e => e.type === 'stage').forEach(e => {
      const g = new THREE.Group(); const gem = new THREE.Mesh(new THREE.OctahedronGeometry(.22), new THREE.MeshPhongMaterial({ color: 0xff3a2a, emissive: 0x801010, shininess: 80 }));
      gem.position.y = 1.1; g.add(gem); const ring = new THREE.Mesh(new THREE.RingGeometry(.3, .42, 24), new THREE.MeshBasicMaterial({ color: 0xff5a3a, transparent: true, opacity: .6, side: THREE.DoubleSide })); ring.rotation.x = -Math.PI / 2; ring.position.y = .02; g.add(ring);
      g.position.set(e.x, 0, e.y); scene.add(g); this.marks.push({ e, g, gem, ring });
    });
    // 人物（板に描いた絵を常にカメラへ向ける）
    const mkChar = look => this.mkChar(look);
    this.npcs = (this.map.npcs || []).map(n => { const g = mkChar(n.look); g.position.set(n.x, 0, n.y); return g; });
    this.heroObj = mkChar('hero'); this.mateObj = this.party[1] ? mkChar(this.party[1]) : null;
    const nm = document.getElementById('mapname'); if (nm) nm.textContent = this.map.name;
    this.placeParty(this.x, this.y, this.x, this.y + 1);
    this.applyNight();
  }
  mkChar(look) {
    const g = new THREE.Group(); const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.tex(look, 'down'), transparent: true, alphaTest: .1 })); const real = !STYLE.dot && !!Assets.chars[look]; s.scale.set(real ? 1.15 : 1.0, real ? 1.75 : 1.5, 1); s.position.y = real ? .85 : .72; g.add(s); g.userData.y0 = s.position.y;
    const sh = new THREE.Mesh(new THREE.CircleGeometry(.28, 16), new THREE.MeshBasicMaterial({ color: 0, transparent: true, opacity: .28 })); sh.rotation.x = -Math.PI / 2; sh.position.y = .01; g.add(sh);
    g.userData = Object.assign(g.userData, { s, look }); this.scene.add(g); return g;
  }
  setParty(list) { this.party = list.slice(0, 2); if (this.scene && this.party[1] && !this.mateObj) { this.mateObj = this.mkChar(this.party[1]); this.placeParty(this.x, this.y, this.prev.x, this.prev.y); } }
  buildBlocks(ch, H, W) {
    const seen = new Set();
    for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
      if (this.map.tiles[j][i] !== ch || seen.has(i + ',' + j)) continue;
      let w = 0; while (this.map.tiles[j][i + w] === ch) w++; let h = 0; while (this.map.tiles[j + h] && this.map.tiles[j + h][i] === ch) h++;
      for (let b = 0; b < h; b++) for (let a = 0; a < w; a++) seen.add((i + a) + ',' + (j + b));
      const cx = i + (w - 1) / 2, cz = j + (h - 1) / 2 + .1, house = ch === 'R';
      const body = new THREE.Mesh(new THREE.BoxGeometry(w - .1, house ? 1.3 : 1.1, h - .1), new THREE.MeshLambertMaterial({ color: house ? 0xf0e2c4 : 0x9a7048 }));
      body.position.set(cx, house ? .65 : .55, cz); body.castShadow = body.receiveShadow = true; this.scene.add(body);
      if (house) {
        const roofG = new THREE.CylinderGeometry(.01, (h + .3) * .62, w + .3, 4, 1); roofG.rotateZ(Math.PI / 2); roofG.rotateX(Math.PI / 4);
        const roof = new THREE.Mesh(roofG, new THREE.MeshLambertMaterial({ color: 0xb8432c, flatShading: true })); roof.scale.set(1, .75, 1); roof.position.set(cx, 1.62, cz); roof.castShadow = true; this.scene.add(roof);
        for (let a = 0; a < w; a++) { const win = new THREE.Mesh(new THREE.PlaneGeometry(.32, .28), new THREE.MeshLambertMaterial({ color: 0x6aa0d0, emissive: 0x000000 })); win.position.set(i + a, .85, cz + (h - .1) / 2 + .005); this.scene.add(win); (this.windows = this.windows || []).push(win); }
        // 扉（建物のすぐ下のD）
        for (let a = 0; a < w; a++) if (this.tile(i + a, j + h) === 'D') { const door = new THREE.Mesh(new THREE.BoxGeometry(.42, .7, .06), new THREE.MeshLambertMaterial({ color: 0x5a3418 })); door.position.set(i + a, .35, cz + (h - .1) / 2 + .03); this.scene.add(door); }
      } else {
        const top = new THREE.Mesh(new THREE.BoxGeometry(w + .1, .12, h + .1), new THREE.MeshLambertMaterial({ color: 0x6a4a2e })); top.position.set(cx, 1.15, cz); top.castShadow = true; this.scene.add(top);
        for (let a = 0; a < w; a++) { const bar = new THREE.Mesh(new THREE.CylinderGeometry(.18, .18, .45, 12), new THREE.MeshLambertMaterial({ color: 0x8a5a2a })); bar.position.set(i + a, .22, cz + h / 2 + .15); bar.castShadow = true; this.scene.add(bar); }
      }
    }
  }
  applyNight() {
    const night = this.hooks.isNight && this.hooks.isNight(); this.night = night;
    this.hemi.intensity = night ? .35 : 1.1; this.sun.intensity = night ? .25 : 2.2; this.sun.color.set(night ? 0x8aa0ff : 0xfff2d8);
    this.scene.background.set(night ? 0x0c1430 : 0x9ccfff); this.scene.fog.color.set(night ? 0x0c1430 : 0x9ccfff);
    (this.windows || []).forEach(w => w.material.emissive.set(night ? 0xffb04a : 0x000000));
  }
  placeParty(hx, hy, mx, my) { this.heroObj.position.set(hx, 0, hy); if (this.mateObj) this.mateObj.position.set(mx, 0, my); }

  // ---------- 移動 ----------
  step(d) {
    if (this.busy || this.anim || !this.map) return;
    this.dir = d; const [dx, dy] = DIRS[d]; const nx = this.x + dx, ny = this.y + dy;
    this.setDirTex();
    if (!this.canWalk(nx, ny)) return;
    this.anim = { fx: this.x, fy: this.y, px: this.prev.x, py: this.prev.y, t0: performance.now() };
    this.prev = { x: this.x, y: this.y }; this.x = nx; this.y = ny;
    setTimeout(() => { this.anim = null; this.arrive(); }, STEP_MS);
  }
  setDirTex() { const d = this.dir === 'up' ? 'up' : 'down'; this.heroObj.userData.s.material.map = this.tex('hero', d); if (this.mateObj) this.mateObj.userData.s.material.map = this.tex(this.party[1], d); }
  async arrive() {
    const ev = this.eventAt(this.x, this.y);
    if (ev && (ev.type !== 'stage' || this.hooks.stageVisible(ev.id))) { this.held = null; this.busy = true; await this.hooks.onEvent(ev); this.busy = false; return; }
    if (this.map.encounter) {
      const c = this.tile(this.x, this.y); const rate = c === '.' ? 1 / 12 : c === '=' ? 1 / 40 : 0;
      if (Math.random() < rate) { this.held = null; this.busy = true; await this.hooks.onEncounter(); this.busy = false; }
    }
  }
  async action() {
    if (this.busy || this.anim) return;
    const [dx, dy] = DIRS[this.dir]; const n = this.npcAt(this.x + dx, this.y + dy);
    if (n) { this.busy = true; await this.hooks.onTalk(n); this.busy = false; return; }
    const ev = this.eventAt(this.x + dx, this.y + dy);
    if (ev && ev.type === 'building') { this.busy = true; await this.hooks.onEvent(ev); this.busy = false; }
  }

  // ---------- 描画 ----------
  frame() {
    if (!this.scene) return;
    const now = performance.now(), t = now / 1000;
    let hx = this.x, hy = this.y, mx = this.prev.x, my = this.prev.y, walking = 0;
    if (this.anim) { const k = Math.min(1, (now - this.anim.t0) / STEP_MS); hx = this.anim.fx + (this.x - this.anim.fx) * k; hy = this.anim.fy + (this.y - this.anim.fy) * k; mx = this.anim.px + (this.prev.x - this.anim.px) * k; my = this.anim.py + (this.prev.y - this.anim.py) * k; walking = 1; }
    this.placeParty(hx, hy, mx, my);
    const bob = walking ? Math.abs(Math.sin(t * 18)) * .06 : Math.sin(t * 2) * .01;
    this.heroObj.userData.s.position.y = this.heroObj.userData.y0 + bob; if (this.mateObj) this.mateObj.userData.s.position.y = this.mateObj.userData.y0 + (walking ? Math.abs(Math.cos(t * 18)) * .06 : 0);
    this.npcs.forEach((g, i) => g.userData.s.position.y = g.userData.y0 + Math.abs(Math.sin(t * 1.5 + i)) * .03);
    this.marks.forEach(m => { const vis = this.hooks.stageVisible(m.e.id), done = this.hooks.stageCleared(m.e.id); m.g.visible = vis; m.gem.rotation.y = t * 2; m.gem.position.y = 1.1 + Math.sin(t * 3) * .08; m.gem.material.color.set(done ? 0x9a9a9a : 0xff3a2a); m.gem.material.emissive.set(done ? 0x202020 : 0x801010); m.ring.material.color.set(done ? 0x888888 : 0xff5a3a); });
    if (this.water) this.water.position.y = Math.sin(t * 1.5) * .015;
    if (this.night !== (this.hooks.isNight && this.hooks.isNight())) this.applyNight();
    // カメラ：斜め上から主人公を追う
    const cx = hx, cz = hy; this.camera.position.set(cx, 10.5, cz + 5.6); this.camera.lookAt(cx, .2, cz - .6);
    this.sun.position.set(cx - 6, 12, cz + 6); this.sun.target.position.set(cx, 0, cz);
    this.renderer.render(this.scene, this.camera);
  }
}
