// 共通の小道具
export const APP_VERSION = '0.9.63-proto';
export const SCHEMA_VERSION = 1;
export const KEY = 'otsu4rpg:'; // GitHub Pages では同じユーザーの全リポジトリが保存領域を共有するため必ず付ける

export const $ = (s, r = document) => r.querySelector(s);
export const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
export const sleep = ms => new Promise(r => setTimeout(r, ms));
export const rand = (a, b) => a + Math.random() * (b - a);
export const randInt = (a, b) => Math.floor(rand(a, b + 1));
export const pick = arr => arr[Math.floor(Math.random() * arr.length)];
export function shuffle(arr) { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

// 日本時間（UTC+9）・午前4時切替の「学習日」。端末のタイムゾーンに左右されない
export const DAY_START_HOUR = 4;
export function studyDay(ts = Date.now()) {
  const d = new Date(ts + (9 - DAY_START_HOUR) * 3600e3);
  return d.toISOString().slice(0, 10);
}
export function addDays(day, n) {
  const d = new Date(day + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10);
}
export function dayDiff(a, b) { return Math.round((new Date(b + 'T00:00:00Z') - new Date(a + 'T00:00:00Z')) / 86400e3); }

export const store = {
  get(k, def = null) { try { const v = localStorage.getItem(KEY + k); return v == null ? def : JSON.parse(v); } catch (e) { return def; } },
  set(k, v) { try { const t = JSON.stringify(v); localStorage.setItem(KEY + k, t); nativeSave(KEY + k, t); return true; } catch (e) { console.warn('save failed', e); return false; } },
  del(k) { try { localStorage.removeItem(KEY + k); nativeSave(KEY + k, null); } catch (e) {} },
};

// スマホアプリ版（Capacitor）で動いているか
export function isNative() { try { return !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform()); } catch (e) { return false; } }
// アプリ版では、localStorage に加えて端末の保存領域（Preferences）にも書く。
// iPhoneは空き容量が少ないとWebの保存データを消すことがあるので、起動時にPreferencesから戻す
const Prefs = () => (isNative() && window.Capacitor.Plugins && window.Capacitor.Plugins.Preferences) || null;
function nativeSave(key, text) { const P = Prefs(); if (!P) return; (text == null ? P.remove({ key }) : P.set({ key, value: text })).catch(() => {}); }
export async function restoreNativeStore() {
  const P = Prefs(); if (!P) return 0; let n = 0;
  try {
    const { keys } = await P.keys();
    for (const key of keys) {
      if (!key.startsWith(KEY)) continue;
      const { value } = await P.get({ key });
      if (value != null && localStorage.getItem(key) == null) { localStorage.setItem(key, value); n++; }
    }
    // 古い版で localStorage にだけあるものは、Preferences にも写しておく
    for (let i = 0; i < localStorage.length; i++) { const key = localStorage.key(i); if (key && key.startsWith(KEY) && !keys.includes(key)) nativeSave(key, localStorage.getItem(key)); }
  } catch (e) {}
  return n;
}
export function isStandalone() {
  if (isNative()) return true;
  try { return !!(navigator.standalone || (window.matchMedia && matchMedia('(display-mode: standalone)').matches)); } catch (e) { return false; }
}
export function fmtMin(sec) { const m = Math.floor(sec / 60); return m >= 60 ? `${Math.floor(m / 60)}時間${m % 60}分` : `${m}分`; }
