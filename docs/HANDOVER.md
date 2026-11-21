# 引き継ぎメモ（乙4 RPG）

新しいチャットで続けるときは「docs/HANDOVER.md を読んで続けて」と伝えてください。
このメモは、作業のたびに Claude が更新します。

最終更新：2026-11-21（v0.9.66-proto）

## 1. プロジェクトの概要
- 乙種第4類危険物取扱者の試験を学ぶ、DQ風のスマホRPG。商品として売る予定（買い切り）。
- 役割：Claude＝開発の担当、Gemini／ChatGPT＝第三者チェック、ユーザー＝決める人・iPhoneでテストする人。
- 乙4が「完璧」に仕上がったら、次は衛生管理者RPG（企画案 v0.1 あり）。それまで、質問も作業も乙4だけ。

## 2. ユーザーとの約束（必ず守る）
- 返事は日本語。毎回、最後に時刻を書く。例：（2026-11-21 19:55）
- 4時間ごとに、正直に進み具合を報告する。
- 「作業を止めて下さい」と言われるまでは作業を続ける。作業中は send_later で「続き」のリマインドを入れておく。
- 問題を出す前に、必ず教える（教えてから聞く）。
- モンスターの名前で、問題の中身のヒントが分かるようにする。
- 画面のどこをタップしても、話が先へ進む。
- Fable（上位モデル）は使わない。1回だけ確認用に使った。
- 公式サイト（e-Gov など）は、2026-11-21 に読む許可をもらった。

## 3. 今の状態
- 問題は1,332問。全部「確認済み」（ChatGPTの一次確認と、Fableの1問ずつの精査を反映し、ユーザーが承認した）。
- iPhoneでの確認：OK（2026-11-21）。
- 令和8年改正の3点を公式資料と照らし合わせた（2026-11-21）。
  - 高圧ガス施設との保安距離の特例（規則第12条）
  - 保有空地の特例（耐火構造の塀＋散水設備など。規則第13条）
  - 航空機給油取扱所の特例（専門員が給油するときだけ、原動機を止めずに給油できる）。自動車への給油は、今もエンジン停止が原則（政令第27条第6項第1号ロ）。
  - 出典：消防庁の報道資料（令和8年4月3日）。
  - まだ入れていない：LiB屋外貯蔵所の特例（試験に出る可能性は低い～中）。
- アプリ化：Capacitor 8（native/）。GitHub Actions で iOS（シミュレータ）と Android（debug APK）のビルドが通る。
- まだストアには出していない（Macが届いてから）。

## 4. ユーザーに決めてもらうこと（まだ決まっていない）
- 価格（買い切り）
- アプリID（仮：jp.otsu4rpg.app）
- 運営者の名前・連絡先（プライバシーポリシーとストア掲載に必要）
- リポジトリを非公開にする時期（今は公開。GitHub Pages で使っている）

## 5. Macが届いたらやること
1. Apple Developer Program に登録し、署名の設定をする。
2. TestFlight で実機テストをして、App Store に申請する。
3. Google Play Console に登録し、リリース用ビルド（署名付きAAB）を作って申請する。

## 6. 開発のしかた（Claude向け）
- 作業する場所：/home/claude/app。終わったら /home/claude/otsu4-rpg（git）へコピーして push する。
  - リポジトリ：kenji111w-tech/otsu4-rpg
- バージョンを上げるとき：sw.js と js/util.js を sed で一緒に書き換える。
- 問題を作り直す：`python3 tools/make_questions.py data/questions.json`
  - 間違い以外の選択肢の作り直しは tools/choice_fix_*.py に書く（後のファイルが前のファイルを上書きする）。
  - 確認済みのIDは tools/verified_ids.txt に書く（今は ALL）。
- そのほかの作り直し：tools/aikotoba.py、tools/characters.py、tools/apply_story.py
- チェック：check_data.py、check_taught.py、check_terms.py、check_length.py、smoke.py、regress*.py、playthrough.py、monkey.py、test_*.py
  - どれも、コマンドのたびに `python3 -m http.server 8765` を立ち上げ直してから実行する。
  - Playwright の evaluate は Promise を待つので、`() => { g.x(); }` の形で包む。
- ビルド用フォルダ（/home/claude/build）：仕様書 v1.9（content.js → build.js）、レビュー用の資料、ストア掲載文の下書き、衛生管理者RPGの企画案。
