// スマホアプリ版（Capacitor）だけで使う処理。ブラウザ版では何もしない
import { isNative } from './util.js';

const P = name => (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins[name]) || null;

export function setupNative() {
  if (!isNative()) return;
  document.documentElement.classList.add('native');
  try { const SB = P('StatusBar'); if (SB) { SB.setStyle({ style: 'DARK' }).catch(() => {}); SB.setBackgroundColor && SB.setBackgroundColor({ color: '#0b0b1a' }).catch(() => {}); } } catch (e) {}
  // Androidの「戻る」ボタン：開いている枠を閉じる・会話を進める。何も開いていなければアプリを裏に回す（終了はしない）
  try {
    const A = P('App'); if (!A) return;
    A.addListener('backButton', () => {
      const ui = document.getElementById('ui'); if (!ui) return;
      const cancel = ui.querySelector('.menu .cancel'); if (cancel) { cancel.click(); return; }
      const msg = ui.querySelector('.msg'); if (msg) { msg.click(); return; }
      if (ui.querySelector('.menu, .quiz, .battle')) return; // 選ぶ必要がある画面・問題・戦闘中は何もしない
      A.minimizeApp && A.minimizeApp().catch(() => {});
    });
    // アプリが裏に回ったら音を止める（Sound側でも visibilitychange で止める）
  } catch (e) {}
}
export function hideSplash() { try { const S = P('SplashScreen'); if (S) S.hide().catch(() => {}); } catch (e) {} }
// バックアップをファイルにして、共有の画面を出す（アプリ版）
export async function shareBackupFile(name, text) {
  const FS = P('Filesystem'), SH = P('Share'); if (!FS || !SH) return false;
  try {
    const r = await FS.writeFile({ path: name, data: text, directory: 'CACHE', encoding: 'utf8' });
    await SH.share({ title: '乙4 RPG のバックアップ', files: [r.uri] });
    return true;
  } catch (e) { return /cancel/i.test(String(e && e.message)); } // 共有をやめただけなら成功あつかい
}
