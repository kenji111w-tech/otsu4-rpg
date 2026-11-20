# 乙4 RPG ～危険物の世界～（試作品）

乙種第4類危険物取扱者試験の合格を目指す、ドラクエ型のブラウザRPG。iPhoneのホーム画面に追加して遊ぶ。仕様は『乙4 RPG 共同開発仕様書』（最新版：v1.9）を参照。

## 中身
- 物語：序章（村）→ 第1章 法令の国（ホアン）→ 第2章 物理・化学の国（ケミ）→ 第3章 危険物の国（セキユ）→ 終章 試練の塔（4人）→ エピローグ
- 出題範囲：81項目（法令47・物理化学22・性質消火12）をすべて扱う。どの問題も、ゲームの中で先に教えてから出す
- 戦闘：クイズ形式。こちらの攻撃も敵の攻撃も問題で決まる。ボス・中ボスには、その章で苦手だった問題が混ざる
- 復習：宿屋の手紙、「にがて」、間隔をあけた復習（0・1・2・4・7・16日）
- 試験センター（タイトル画面）：
  - 本番模試：模試専用問題210問（6回分）。物語クリア後。途中再開・時間切れ自動提出
  - 練習模試：本番形式／科目免除（性質・消火のみ）／苦手中心
  - 再挑戦模試：6回分を受け終えた後
  - 結果：科目別の得点、合否、まちがえた問題の見直し、次に復習する場所

## 起動方法
- GitHub Pages：このフォルダの中身をリポジトリの直下に置き、Settings → Pages で公開する。`https://kenji111w-tech.github.io/（リポジトリ名）/` で開ける。
- 手元で試す：`python3 -m http.server` を実行し、`http://localhost:8000/` を開く（ファイルを直接開くと問題データを読めない）。

## ファイル構成
- index.html：入口 ／ css/style.css：画面デザイン ／ sw.js：オフライン対応（VERSION は js/util.js の APP_VERSION とそろえる）
- js/game.js：本体（タイトル・物語・施設・メニュー・届出・試験センター）
- js/battle.js：戦闘 ／ js/exam.js：模擬試験 ／ js/field3d.js・js/field.js：移動 ／ js/ui.js：窓・出題 ／ js/learn.js：学習記録・復習・学習時間・バックアップ
- js/art.js・js/sprites.js：人物・魔物・背景の絵（コードで描画） ／ js/util.js：共通
- data/questions.json：問題（練習・模試専用・導入） ／ data/world.json：地図・ステージ・敵・技 ／ data/syllabus.json：出題範囲81項目
- tools/：開発用（公開には不要）
  - make_questions.py：問題データを作る
  - check_taught.py：教える前に問う問題がないか ／ check_terms.py：用語が説明より先に出ていないか ／ coverage.py：出題範囲の網羅
  - playthrough.py：自動プレイ（`python3 tools/playthrough.py 0.75 7 all|ch2|ch3|ch3late`）／ smoke.py：起動確認

## 更新方法
問題を直すときは tools/make_questions.py を編集して `python3 tools/make_questions.py data/questions.json` を実行する。review_status が verified でない問題は「確認前の問題」と表示される（試作品の開発モード）。

## バックアップ
役場またはタイトルの「バックアップ」から、ファイルまたはテキストで書き出し・読み込みできる。Safari版とホーム画面版はデータが別なので、移すときはこの機能を使う。
