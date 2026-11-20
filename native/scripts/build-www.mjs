// リポジトリ直下のWebアプリを、アプリに入れる www フォルダへ写す（sw.js と開発用のファイルは入れない）
import { cpSync, rmSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const here = dirname(fileURLToPath(import.meta.url)), root = join(here, '..', '..'), www = join(here, '..', 'www');
rmSync(www, { recursive: true, force: true }); mkdirSync(www, { recursive: true });
for (const f of ['index.html', 'manifest.json', 'css', 'js', 'data', 'icons', 'vendor', 'assets']) {
  const src = join(root, f); if (existsSync(src)) cpSync(src, join(www, f), { recursive: true });
}
console.log('www を作りました:', www);
