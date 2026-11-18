# 乙4 RPG ～危険物の世界～（試作品）

乙種第4類危険物取扱者試験の合格を目指す、ドラクエ型のブラウザRPG。仕様は『乙4 RPG 共同開発仕様書』（最新版）を参照。

## 起動方法
- GitHub Pages：このフォルダの中身をリポジトリの直下に置き、Settings → Pages で公開する。`https://kenji111w-tech.github.io/（リポジトリ名）/` で開ける。
- 手元で試す：`python3 -m http.server` を実行し、`http://localhost:8000/` を開く（ファイルを直接開くと問題データを読めない）。

## ファイル構成
- index.html：入口 ／ css/style.css：画面デザイン
- js/game.js：本体（タイトル・物語・施設・メニュー・届出）
- js/battle.js：戦闘 ／ js/field.js：移動 ／ js/ui.js：窓・出題 ／ js/learn.js：学習記録・復習・学習時間・バックアップ
- js/sprites.js：キャラクター・敵・地形の絵（コードで描画） ／ js/util.js：共通
- data/questions.json：問題（五肢択一・状況判断） ／ data/world.json：地図・敵・技・物語
- tools/：開発用（自動テスト、設定画）。公開には不要

## 更新方法
問題を直すときは data/questions.json を編集し、data_version を上げる。review_status が verified でない問題は「確認前の問題」と表示される（試作品の開発モード）。

## バックアップ
役場またはタイトルの「バックアップ」から、ファイルまたはテキストで書き出し・読み込みできる。Safari版とホーム画面版はデータが別なので、移すときはこの機能を使う。
