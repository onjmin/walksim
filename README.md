# 蓄音キリコと よふかしのまち

おんJ（おーぷん2ちゃんねる なんでも実況J）発の UTAU 音源「蓄音キリコ」が主人公の、ウォーキングシミュレーターです。夕方の町を歩くところから始まります。
深夜2時、部屋のドアの外が いつもの廊下ではなく、誰もいない駅の待合室につながっている——歩く・見る・聞く・拾う、だけのゲームです。

- 遊ぶ: https://onjmin.github.io/walksim/
- 操作: 画面の十字キーと A/B（B でメニュー）、または行きたい場所・話したい人をタップ。PC はキーボード（矢印/WASD・Z/Enter・X/Esc）。
- **ヘッドホン推奨**です。音の左右・遠近が、そのまま演出です。
- 右上の 🔊 で BGM・効果音をまとめてミュートできます。
- セリフの読み上げ（ボイス）は既定で OFF です。メニューの「せってい」→「ボイス」で ON にできます。初回に数十MBの音声データを取得します（ブラウザに保存され（Cache API）、2回目からはすぐ始まります）。終盤に一度だけ、追加の音源を読み込む場面があります（進捗表示が出ます）。
- セーブはメニューの「きろく」（またはマップのセーブ点）でいつでも。夜の町は どこからも 歩いて 部屋へ 帰れます。
- 公開サイトでは、アクセス解析のために Google アナリティクスを使っています（Cookie を使います。個人を特定する情報は集めません）。

## 物語

物語の 正本は [STORY.md](./STORY.md)（3作の 設計書）。2作目「蓄音キリコと 過去ログの底」の あと、外の 町で 暮らしはじめた キリコが、眠れない 夜に 町を 歩き、おんJを 去った 人たちの その後に ふれる 話です。真の 筋（夕方 → 深夜 → 窓 → 夜明けの うみべ）と、1話 完結の「板の 名残」（オムニバス）で できています。

## コンテンツノート

**ジャンプスケアはありません。流血・残酷描写もありません。誰も死にません**（最悪でも、画面が暗くなって安全な場所で目が覚めるだけです）。
こわさの材料は、説明の欠如・違和感・ルール・音（環境音の変化と静寂）だけです。

本作はフィクションです。実在の駅・人物・掲示板の出来事とは関係ありません。
きさらぎ駅・八尺様・バックルームなどのインターネット怪談（ネットロア）を元にした創作で、出典となった掲示板文化・怪談文化への敬意のうえに作られた、非営利のファンゲームです。

## 立ち絵の差し替え

キリコ・ロゼ・テト・足立レイの4人には描き下ろしの立ち絵が入っています（rpg から流用。表情差分なし・1枚絵）。ほかのキャラはキャラ色のシルエット（ダミー）で表示されます。

差し替えは、透過 PNG を `public/portraits/<キャラid>.png` の名前で置くだけです（コード変更不要）。**どのキャラが未着か・デザインの手がかり・優先度は [ART_TODO.md](./ART_TODO.md)（作者への発注リスト）にまとめてあります。** 歩行グラ・マップチップ・BGM の発注メモも同じファイルです。

描き方の仕様は rpg と同じです：

- **全身・右向き（画面の右側を見る向き）・透過PNG**。キャンバスの大きさ・余白・ポーズは自由です。
- 透明な余白は自動で切り詰め、全身の高さと頭の位置を絵から測って、どのキャラも同じ大きさ・同じ高さにそろえます（アホ毛や耳の先は頭の高さに数えません）。
- 右側に立つときは自動で左右反転して画面の中央を向きます。反転させたくないキャラは左向きで描いて、`src/data/cast.ts` の `portrait` に `facing: "left"` を足してください。
- 会話では上から約6割（頭〜腰）を切り出して見せます（`portrait.crop` でキャラごとに変更可。1 で全身）。
- 自動の結果がずれるときだけ、`portrait` の `scale`・`offsetX`・`offsetY` で手直しできます。

歩行グラは `public/sprites/<name>.png`（32×64、16×16セル・2フレーム×4方向。八尺様だけ 32×128 の縦長セル）。現在は `scripts/make-sprites.mjs` の自動生成ドット絵が入っていて、同じ名前で置き換えれば反映されます。

## 開発

```bash
pnpm install
pnpm dev
```

- `pnpm build` … 型チェックして `build/` に出力（`GITHUB_PAGES=true` で `/walksim/` 配下向け）
- `pnpm check` … 型チェックだけ
- `pnpm lint` … Biome（`pnpm format` で自動修正）
- `pnpm validate` … ゲームデータの検証（マップの形・ワープ先・話し手・セリフの長さ（全角22字×2行）・レコード・かいいノート・フラグの約束など。イベントを空の Story で実際に走らせて調べます）
- `pnpm loudness` … 効果音の大きさ（LUFS）を測り直す（`src/data/loudness.ts`。ffmpeg が要ります）
- エディタや Claude Code からのプレビューは `.claude/launch.json` の `walksim-dev`（`pnpm dev --port 5180 --strictPort`、http://localhost:5180 ）
- main に push すると GitHub Actions（`.github/workflows/gh-pages.yml`）がビルドして GitHub Pages に公開します

### URL デバッグ起動

開発中（`pnpm dev` のとき）は URL でタイトルを飛ばして好きな場所から始められます：

```
http://localhost:5180/?map=kura&x=4&y=5&dir=up&flags={"flashlight":true}&items=rec_a:1,omamori:1
```

- `?map=&x=&y=&dir=` … 開始マップと位置・向き
- `&flags={"seen_mado":true}` … フラグの決め打ち（JSON）
- `&items=rec_a:1,omamori:1` … 持ちものの決め打ち（数を省くと 1、`:0` で なくす）
- `&date=MMDD&time=HHMM&wday=0〜6` … 端末の日時・曜日の決め打ち（`src/data/weekday.ts`。0 が日曜。にぃちぇの曜日ギミックの確認に）
- `?debug` … タイトルに「デバッグルーム」を出す（これだけは公開版でも効きます。開発中は常に出ています）

### 構成

- `src/engine/` … エンジン（画面・入力・マップ・イベント実行・音・セーブ）。型とシナリオ API は `src/engine/defs.ts`
- `src/ui/` … メッセージ窓・立ち絵・メニュー・タイトル・エンディング（DOM）
- `src/data/` … ゲームの中身（マップ・キャラ・レコード・かいいノート・BGM・効果音）
  - マップとイベントは `src/data/maps/*.ts`。シナリオは `async (s) => { await s.say("kiriko", "……") }` の形で書きます（使える命令は `src/engine/defs.ts` の `Story`）
  - rpg からの追加命令: `s.se(name, { pan })`（効果音の左右パン。「ぽ……ぽ……」の距離感）・`s.record(id)`（レコード再生演出：回転ノイズ → 朗読 → 針の上がる音）・`s.note(id)`（かいいノートに書き留める）
  - `MapDef` の雰囲気フィールド: `ambient`（ただよう粒。dust / snow / rain / static / embers）・`tint`（マップ全体に乗せる半透明の色。夕焼け・黄ばみ）・`dark`（暗闇。プレイヤー中心の光半径の外を暗くする。懐中電灯で半径 3.5→6.5 タイル）
  - **かいいノート**: 怪異・小ネタの図鑑（`src/data/notes.ts`）。シナリオが発見の瞬間に `s.note(id)` を呼ぶとフラグ `note_<id>` が立ち、メニューの「ノート」で読み返せます。未発見は「？？？」（hint があれば薄字）。収集率はエンディングのまとめカードに出ます
  - マップチップは同梱シート（`public/assets/rpg-reze/Base.png`・`field.png`、`public/assets/rpgen/map.png`）から `src/data/tiles.ts` のパレットで切り出しています。キリコの部屋・アパートの廊下・屋外の町並み（TOWN）は自作チップ（`public/assets/walksim/home.png`・`town.png`。`node scripts/make-home-tiles.mjs`・`make-town-tiles.mjs` で生成）です。効果音は RPGEN の素材の直リンクと、手打ちの MML（`src/data/sfx.ts`）です

### セリフの書き方

1行は全角22字・2行まで（`pnpm validate` が見ます）。そのうえで rpg の規範を引き継ぎます——**説明しない・気持ちに名前をつけない・「だから」「つまり」でつながない・主題を言わせない**。加えて本作では、ジャンプスケアに当たる演出（突然の大音量・急な顔アップ・追いかけ回し）を書かないこと。詳しくは `DESIGN.md` §8 と `docs/dialogue-guide.md`。

## クレジット

### キャラクター・音源

- 蓄音キリコ © おーぷん2ちゃんねる有志（音声: 野良 / キャラクター: 釣りンゴ / ロゴ: ロゴ太郎） https://suzuhete.wixsite.com/home （[利用規約](https://suzuhete.wixsite.com/home/利用規約)）
- 束音ロゼ（音声: 面倒ミル / キャラクター: wQ8G） https://tabaneroze.ninja-web.net/ （[利用規約](https://tabaneroze.ninja-web.net/terms-of-use.html)）
- 重音テト © 線・小山乃舞世／TWINDRILL https://kasaneteto.jp/ （[音源利用規約](https://kasaneteto.jp/guidelines/voice.html)）
- 足立レイ © Mechanical Girl https://mechanicalgirl.jp/ （[利用規約](https://mechanicalgirl.jp/guidelines/)）
- つくよみちゃん © Rei Yumesaki（フリー素材キャラクター） https://tyc.rei-yumesaki.net/ （[UTAU音源利用規約](https://tyc.rei-yumesaki.net/material/utau/terms/)）
- 革命シヨ [公式サイト・利用規約](https://kakumeisiyo.my.canva.site/dagkuyjwycs)（非営利利用OK・クレジット記載）
- やきう（なんJ・おんJ の名無し）: なんJ・おんJ のみんな
- MGRoid・MOTRoid・NYNRoid（クッキー☆由来の UTAU 音源。終盤のカメオ音声として、声のみ使用しています）: 利用条件の所在 … [MGRoid](https://x.com/nisusansu/status/1048825378188353536) / [MOTRoid](https://www.nicovideo.jp/watch/sm40031282) / [NYNRoid](https://www.bilibili.com/video/BV1V24y1a7qs)
- ミャウミャウ・ネムリン・おんちゃん・にぃちぇ・ムッジェ: おんJ のみんな（設定は [おんJwiki](https://w.atwiki.jp/openj3/) を参考にした、非公式のファン創作です）
- 優音アイ・君野うしろ: おんJ・おーぷん2ちゃんねるの企画スレ発キャラクターの、非公式のファン創作です
- 本作のキャラクターの口調・設定の一部は非公式の創作です

### スタッフ

- 原案・ディレクター: このゲームの作者
- シナリオ・ゲームデザイン・マップデザイン: Claude Code（Claude Fable 5）
- プログラム・デバッグ・サウンドエンジニア: Claude Code（Claude Fable 5）
- 音楽: このゲームの作者・Claude Code（Claude Fable 5）
- 素材提供（歩行グラ・マップチップ・効果音）: RPGEN（rpgen-search） / キリコの歩行グラ: https://i.imgur.com/hNXnQHv.png
- 音楽・音声合成: [@onjmin/dtm](https://github.com/onjmin/dtm)・koe UtauTTS
- HTS voice tohoku-f01 © 2015 Intelligent Communication Network (Ito-Nose) Laboratory, Tohoku University（CC BY 4.0）
- フォント: DotGothic16（SIL Open Font License）

このゲームは非営利のファンゲームです。各キャラクター・音源の利用規約に従っています。

## ライセンス

コードのライセンスは AGPL-3.0 です。キャラクター・音源・素材はそれぞれの権利者のものです（上のクレジットと各利用規約に従ってください）。
