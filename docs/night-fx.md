# 夜演出 実装仕様（深夜グレーディング・光源・ビネット・可読性）
対象: src/engine/game.ts（TOD_PRESETS / render / drawDark）、src/engine/defs.ts（MapDef）。追加バッファは光源スタンプ（キャッシュ）とビネット1枚のみ。

## 1. 深夜グレーディング（TOD_PRESETS.shinya 差し替え）
現行 multiply rgba(90,110,190,.70) は実効係数 R×.55/G×.60/B×.82 で、ツクール夜(-68,-68,0,68)〜深夜(-136,-136,0,136)の中間に相当し方向は正しい。定番則「青は最後まで残す・彩度を落とす・純黒にしない」に合わせ微調整:
```ts
shinya: { passes: [
  { color: "rgba(90,110,210,0.70)", blend: "multiply" },    // B係数 .82→.88（青チャンネル温存）
  { color: "rgba(128,128,128,0.45)", blend: "saturation" }, // 彩度-45%（ツクール灰136相当。1パス追加のみ）
  { color: "rgba(12,16,48,0.22)" },                          // 紺の底上げ。黒の下限≈RGB(3,4,11)＝純黒禁止
], outside: "#04060f" }
```
- creep（入場後60秒で黒+0.28）は現状維持。合成後の画面中心輝度は元の約25%で、Stardew の下限（7%残し）より明るい側。
- 夕・朝のパスは変更なし。UI は従来どおり render() の外＝夜色を乗せない（現代の定番運用）。

## 2. 光源システム（MapDef.lights）
```ts
lights?: { x: number; y: number; r: number; color?: string }[] // r=タイル半径、color="#rrggbb"（既定 #ffcc88）
```
- 描画順: tint → creep → ビネット → drawDark → **lights（globalCompositeOperation="lighter"）** → ambient。
  「色調変更の上に加算光源」がツクール定番構成。drawDark より後なので暗闇マップでも灯りが沈まない。
- スタンプキャッシュ: Map<`${r}:${color}`, HTMLCanvasElement>。一辺 2*r*TILE、createRadialGradient の stops:
  0 → color+"7a"（α.48）/ 0.5 → color+"2e"（α.18）/ 1 → color+"00"。毎フレームは drawImage のみ（生成は初回だけ）。
- 描画位置: ((x+0.5)*TILE - camX, (y+0.5)*TILE - camY) 中心。画面外（±r*TILE）はスキップ。目安 同時8灯/画面（Stardew の減衰しきい値）。
- ゆらぎ: globalAlpha ×(1 + 0.05*sin(time/300 + i*7))。ステートレスで既存 ambient と同思想。
- def.dark>0 のマップでは drawDark のバッファへ各光源位置に destination-out で半径 r*0.8 の穴も開ける
  （stampFor を半径引数で汎用化して流用。灯り＝視界のランドマークになる）。
- 色・半径の定番値:
  | 用途 | color | r |
  |---|---|---|
  | 窓明かり | #ffcc88 | 2 |
  | 街灯 | #ffdf9e | 3 |
  | コンビニ店先（蛍光灯） | #cfe4ff | 4 |
  | 自販機 | #eef4ff | 1.5 |
  暖色主体に白青を少量混ぜるのが夜景の定番（単調回避。Stardew 実測の暖色 ≈#FFAF5F とも整合）。

## 3. ビネット（作者要望「画面端ほど黒が濃い」→ 採用）
- 画面サイズのキャンバス1枚を全強度で生成しキャッシュ（リサイズ時のみ再生成）、描画は globalAlpha で tod 別に減衰。
- グラデ: 中心(w/2,h/2)、外周 R=0.5*hypot(w,h)。stops: 0.55→α0 / 0.80→α0.45 / 1.0→α1.0。色は #05060f（青黒。純黒より murk になりにくい）。
- 強度（globalAlpha）: shinya 0.30 / yu 0.12 / asa 0.08 / それ以外 0。研究の上限「0.5 未満・気づかれたら強すぎ」の内側。
- def.dark>0 のマップでは 0（穴あき暗闇との重ね掛けが murk の主因。二重にしない）。
- 中心55%は完全素通し＝ほぼ画面中央にいるプレイヤーは一切暗くならない（可読性の守りを兼ねる）。

## 4. 夕方・朝の扱い
- 光源: 夕方は強度 0.4 で点灯（営業中の店の窓灯り。style-everyday §2「生活の密度」と整合）。朝・yoru（室内）・tod 無しは 0＝描かない。
- ビネット: 夕 0.12・朝 0.08（ほぼ知覚されない様式レベル）。朝は「町が返ってくる」開放感を優先し光源なし。

## 5. 可読性の守り
- shinya ではプレイヤー足元に擬似光を常駐（lights と同経路）: r=1.75、color #9db4e8（月明かり色。ランタンに見せない）、globalAlpha 0.25。
- 純黒禁止: §1 の紺底上げで最低 RGB(3,4,11) を保証。multiply の B 実効係数は 0.85 未満にしない。
- creep 上限 0.28・ビネット中心素通しは固定値として守る（暗さの総和が murk の原因。暗さは対比＝灯りの配置で作る）。

---

# 2D JRPG／RPGツクールにおける「夜」演出の定番調査

## 1. RPGツクール「色調変更」の夜の定番値

### エディタ標準プリセット（MV/MZ）
イベントコマンド「画面の色調変更」には「通常」「ダーク」「セピア」「夕暮れ」「夜」の5プリセットボタンがある（公式ヘルプ・公式講座）。値は [赤, 緑, 青, グレー]（各 -255〜255、グレーは彩度落とし 0〜255）。

- **夜 = (-68, -68, 0, 68)**：赤・緑を落として**青だけ残し**、グレー68で彩度を落とすのがツクール流の夜。Yahoo!知恵袋の回答やプラグインのデフォルト値として広く流通している定番値。
  - https://detail.chiebukuro.yahoo.co.jp/qa/question_detail/q11198436396
- **夕暮れ = (68, -34, -34, 0)**（赤を持ち上げ青緑を落とす）
- スクリプトからは `$gameScreen.startTint([赤,緑,青,グレー], 変化時間)`。
  - https://santerabyte.com/rpg-maker-mv-script-tint-screen/
  - https://rpgmaker-script-wiki.xyz/screentone_mv.php

### 時間帯システムのデフォルト値（うなぎおおとろ「時間経過システム AdvanceTimeSystem」MZ版）
歩数で時間が進む古典的システムのデフォルト色調。エディタプリセットとほぼ同系で、実戦的な「時間帯パレット」としてそのまま使える。
- 朝 [-34, -34, 0, 34] ／ 昼 [0, 0, 0, 0] ／ 夕方 [68, -34, -34, 0] ／ **夜 [-68, -68, 0, 68]** ／ **深夜 [-136, -136, 0, 136]** ／ 夜明け [-68, -68, 0, 68]
- 深夜は夜のちょうど2倍の強度、朝は半分、という「-34刻み」の設計が読み取れる。
- https://plugin-mz.fungamemake.com/archives/892

### 旧作（XP）の定番値（KGC_DayNight、RPGツクールテクニック集）
Tone.new(赤,緑,青)方式。**夜 (-128, -128, -32)**（青の減衰を最小にして青藍に）、夕方 (-32, -96, -96)、朝 (-48, -48, -16)、昼 (0,0,0)。世代を問わず「夜＝青を最後まで残す」設計が一貫している。
- https://ytomy.sakura.ne.jp/tkool/rpgtech/tech_xp/special_system/daynight_xp.html

### 公式講座が教える運用の定番
- 夜マップ用グラフィックは作らず、昼素材＋色調変更で表現する。切替は「時間1フレーム＋ウェイト」。
- **色調はマップ移動後も引き継がれる**ため、屋内に入ったら「通常」に戻す処理が必須（＝室内は夜色にしないのが定番運用）。
- きれいな切替は「フェードアウト→（暗転中に）場所移動＋色調変更→フェードイン」。場所移動側のフェードは「なし」にする。
- https://rpgmakerofficial.com/product/mv/guide/006_003u.html （MV版）
- https://tkool.jp/products/rpgvxace/lecture/006_003u/ （VX Ace版）

## 2. 窓明かり・街灯など「光」の定番表現

### 合成方法の使い分け
ピクチャ表示の合成方法は 通常/加算/乗算/スクリーン（スクリプトでは 0/1/2/3）。**光素材は「加算」が定番**（RGBを足すので発光表現向き）。暗闇側は乗算または黒ピクチャで作る。
- https://rpgmaker-script-wiki.xyz/showpic_mv.php
- https://x.com/MinamiYotuba/status/1495638733454032898 （初心者向け合成方法解説）

### 定番手法A：色調変更＋加算合成の光素材（イベント/プラグイン）
「色調変更で夜にした上に、街灯・窓・松明の位置へ放射状グラデーションの光画像を加算で重ねる」のが最も普及した構成。TMAnimeLight.js の例では `animeLight 1 TMAnimeLight1 255 0 -12 4`（不透明度255、Y補正-12、Z=4）、プレイヤー持ちの灯りは対象-1で `animeLight -1 TMAnimeLight2 255 0 -24 4`。ゆらぎアニメ付きの暖色（黄〜オレンジ）光が標準素材。
- https://fungamemake.com/archives/11892
- https://takaryo.site/?p=877
- 多彩な灯りプラグイン MPP_MapLight の紹介: https://media-faust-create.jpn.org/?p=503

### 定番手法B：穴あき黒ピクチャ（暗闇＋視界）
画面より大きい「中央に穴の開いた黒画像」を最前面に置き、主人公周辺だけ明るくする。fungamemake の MZ 講座の具体値：解像度816×624に対し**912×720**のピクチャ、中心原点で座標**(408,312)**、色調**(-250,-250,-250,0)**で暗闇化、視界の広さは拡大率**100%（狭）/150%（標準）/400%（広）**、切替60フレーム。マップ端対策に左右8タイル・上下6タイルの余白＋オフセット(X:8,Y:6)。
- https://fungamemake.com/archives/11734
- 同系のプラグイン不要講座（穴あきフレーム＋自動実行→セルフスイッチ）: https://yuzuyu3.com/rpgmaker-mv-light/

### 定番手法C：遠景（パノラマ）・多層レイヤー
マップ設定の「遠景」に夜空・星空画像を敷く（例：星空画像を横スクロール速度50で流す。ファイル名先頭「!」で視差ゼロ固定）。一枚絵マップ＋光レイヤーを遠景/近景として重ねるパララックスマッピングも普及。
- https://rpgmaker-script-wiki.xyz/parallax_mv.php
- https://note.com/maduzu/n/n5feb7d3b92f7 （MZで遠景マップを作る）
- https://newrpg.seesaa.net/article/488413806.html （近景・遠景を自在に表示 NRP_ParallaxesPlus）

### 光の「色」の定番（ドット絵側の知見）
- **窓明かりはオレンジ系か白系**が基本。白×水色を混ぜて単調さを回避。ビル上の**赤い航空障害灯**が夜景のアクセントとして効く。夜空は意外に明るく、**建物は空より暗く**塗るのがリアルに見せる鍵。影は光の補色（オレンジ光→紫の影）を半透明で。
  - https://logical-skyblue.hatenablog.com/entry/2021/12/08/012423
- クリスタ併用のツクールマップメイキングでは、オーバーレイで「**暗部に黒めの青、光の近くに白めの黄**」を置き、色相差で明暗を作る。「光を有効に使いたいのであれば、思い切り暗くすることを恐れてはならない」。
  - https://note.com/kiharu_tsuki/n/ndd2c181a40a3

## 3. コンシューマ2D RPGの夜の伝統

- **ドラゴンクエスト（FC DQ3〜）**：夜はフィールドが「青く（暗く）」なるパレット差し替え。FC版では**メニューウィンドウまで青くなる**。夜は城に入れず住民は就寝、店じまい（宿屋と教会だけは常時営業）、夜限定の会話・イベント・アイテムがあるため昼夜両方の探索が前提。DQ3は歩数で時刻が進み、朝夕のグラデーションなしで一瞬で昼夜が切り替わる。
  - https://wikiwiki.jp/dqdic3rd/%E3%80%90%E6%98%BC%E3%81%A8%E5%A4%9C%E3%80%91
  - https://futaman.futabanet.jp/articles/-/127606?page=1
- **ポケモン金銀（GBC）**：実時間連動で、フィールドのグラフィックが**朝は黄色がかり、昼は明るく、夜は暗く（青紫がかった）**パレットに差し替わる。時間帯区分は第2世代で朝4:00–9:59／昼10:00–17:59／夜18:00–3:59。夜はBGMも落ち着いたものに。GB/GBC世代はタイルパレット交換方式なので「夜＝青藍のパレット」という伝統がここで確立。
  - https://w.atwiki.jp/gcmatome/pages/4244.html
  - https://wiki.pokemonwiki.com/wiki/%E6%99%82%E9%96%93%E5%B8%AF
  - https://ja.wikipedia.org/wiki/%E3%83%9D%E3%82%B1%E3%83%83%E3%83%88%E3%83%A2%E3%83%B3%E3%82%B9%E3%82%BF%E3%83%BC_%E9%87%91%E3%83%BB%E9%8A%80
- **MOTHER2**：昼夜サイクルはないが、スリークは昼夜を問わず薄暗い「常夜の町」として演出され（ゾンビ占拠・住民は屋内退避）、「暗さ＝異常事態」の記号として使われる好例。
  - https://w.atwiki.jp/aniwotawiki/pages/33593.html
- **室内は暖色のまま**：DQ・ポケモンとも屋内マップは夜でも通常の明るさで描かれる（夜色は屋外専用）。ツクール公式講座が「屋内に入ったら色調を戻す」処理を必須手順として教えるのは、この慣習のエディタ的翻訳。なお映像分野でも「昼素材を青く沈めて夜に見せる」Day for Night（アメリカの夜）というグレーディングの伝統があり、「夜＝青」はゲーム固有ではなく映像文化全体の記号。
  - https://vook.vc/n/601

## 4. 夜マップで「見やすさ」を保つ工夫

- **青チャンネルを残す**：ツクールの夜プリセット (-68,-68,0,68) は B=0（青無変化）＋グレーで彩度を落とす設計。真っ黒にせず青藍に振ることで、輝度を確保したまま「夜らしさ」を出す。深夜級の暗さ [-136,-136,0,136] はイベント・ダンジョン用で、自由移動時間帯は -68 程度に留めるのがプラグインのデフォルト設計（§1参照）。
- **嘘ライティング**：物理的に正しくなくても、目立たせたい対象（出入口・NPC・調べポイント）に嘘の光を、周囲に嘘の影を置いて視線誘導する。反射光（水辺は水色、地面は赤系）で立体感も補う。
  - https://note.com/kiharu_tsuki/n/ndd2c181a40a3
- **相対的な暗さで描く**：夜空は明るめに、建物シルエットを空より暗く。全体を沈めるのではなく明暗の対比で「夜」を読ませる（暗い場所の光は範囲を狭く、グラデーションを弱く）。
  - https://logical-skyblue.hatenablog.com/entry/2021/12/08/012423
- **視界演出は拡大率で調整**：穴あきピクチャ方式なら視界サイズを拡大率100〜400%で段階制御でき、ゲーム難度・視認性を数値で管理できる（§2B参照）。
- **UI・切替の作法**：色調変更はマップ移動後も残るため戻し忘れが最大の事故要因（公式講座が明記）。切替は暗転中に済ませてプレイヤーに色の遷移過程を見せない。FC版DQのように夜はウィンドウまで青くする演出もあるが、現代の定番はマップのみ夜色にしてUIの可読性を保つ運用。
  - https://rpgmakerofficial.com/product/mv/guide/006_003u.html

## 実装向けまとめ（定番レシピ）
1. 屋外の夜＝色調 (-68,-68,0,68)、夕暮れ (68,-34,-34,0)、朝 (-34,-34,0,34)、深夜 (-136,-136,0,136)。屋内では (0,0,0,0) に戻す。
2. その上に窓・街灯へ**加算合成**の暖色（オレンジ〜黄、白・水色を少量混ぜる）光素材。影を落とすなら光の補色（紫系）。
3. 空は遠景の星空パノラマ（ゆっくり横スクロール）で「空だけ明るい夜」を作る。
4. 重要オブジェクトは嘘ライティングで照らし、暗さは対比で表現して視認性を確保する。

---

# 2Dピクセルゲームにおける夜演出の調査レポート

## 1. Stardew Valley の夕方→夜の遷移

### 仕様(Wiki より)
- 暗くなり始める時刻は季節で変わる: 春・夏 20時 / 秋 19時 / 冬 18時。一気に暗転せず、ゲーム内10分刻みで徐々に暗くなる ([Day Cycle - Stardew Valley Wiki](https://stardewvalleywiki.com/Day_Cycle))。
- 夜になると屋内は「窓が暗くなり、ランプや壁掛け燭台が点灯」する。屋内は光源で満たされていない限り暗くなる。

### 実装(逆コンパイルソース [veywrn/StardewValley Game1.cs](https://github.com/veywrn/StardewValley/blob/master/StardewValley/Game1.cs) で確認、DL先: C:/Users/frgk2/AppData/Local/Temp/claude/C---own-git--users-onjmin-walksim/6ee89596-e407-4d23-b6c0-7c28d35fe7a6/scratchpad/Game1.cs)
- **ライトマップ + 逆減算(ReverseSubtract)方式**。低解像度の RenderTarget(lightmap)に「暗闇色」を塗り、その上に光源スプライトを描き、最後に画面へ `ColorBlendFunction=ReverseSubtract, ColorSourceBlend=SourceColor, ColorDestinationBlend=One`(= dest − src×src)で合成する。つまり「暗闇を上書きする」のではなく「画面から色を引く」。
- **夜の暗闇色は黄色**: `eveningColor = (255,255,0)`。黄色を引くと R/G が減って B が残るため、画面は自然に**青い夜**になる。値は `outdoorLight = eveningColor × t` で、t は「暗くなり始め」時点で 0.30 から徐々に増加し、「完全な夜(truly dark)」で 0.75、**上限 0.93**(UpdateGameClock 内、増分は序盤 0.00225/分・終盤 0.000625/分)。上限が 0.93 なので**完全な黒には決してならない** — 地面のタイルは常にうっすら見える。
- **光源は「暗闇に開ける穴」**: LightSource のデフォルト色は `Color.Black`(=何も引かない=そこだけ全明るさ)。色付きの光は**補色で指定**する — 例: たいまつ/ランプは `new Color(0, 80, 160)`(青)を指定 → 引き算の結果、知覚される光は約 (255,175,95) ≈ **#FFAF5F の暖色オレンジ**になる(Object.cs で確認)。タスク文の「#ffcc88 系の暖色グロー」がまさにこの帯域。
- **窓明かり**は `LightContext.WindowLight` として区別され、「暗い or 雨」のときだけライトマップに描かれる。雨の日は eveningColor でなく ambientLight を使い、さらに画面全体に `OrangeRed × 0.45` を重ねて雨の鈍い色調を作る。
- ライトマップは `lightingQuality` に応じた低解像度で描いて LinearClamp で拡大合成するため、光の縁が自然にぼける(=グラデ円テクスチャ+低解像度アップスケールでソフトグローを安価に実現)。
- 画面数(最大8灯)を超えるとライトを減衰させる定数もある(`maxLightsOnScreenBeforeReduction = 8`)。

## 2. 2Dの「偽ライト」定番レシピ(減算穴あけ vs 加算グロー)

### 減算・穴あけ方式(GameMaker 公式チュートリアルの定番)
- カメラサイズのサーフェスに**黒を alpha 0.8** で塗る → `gpu_set_blendmode(bm_subtract)` にして光スプライト(白のラジアルグラデ)を描くと、その部分の暗闇が「くり抜かれ」て下の画面が見える ([GameMaker 公式 Simple Lighting](https://gamemaker.io/en/tutorials/coffee-break-tutorial-simple-lighting-gml))。光の大きさはスプライトのスケールで調整(例: プレイヤー 1.0、小物 0.5〜0.75、ゆらぎはスケールを揺らす)。
- より高度な実装(シャドウキャスト等)は [GameMaker 公式 Realtime 2D Lighting](https://gamemaker.io/en/blog/realtime-2d-lighting) と [ブレンドモードガイド](https://manual.gamemaker.io/monthly/en/Additional_Information/Guide_To_Using_Blendmodes.htm)。

### 加算グロー方式
- ラジアルグラデーションのスプライトを **bm_add / additive** で重ねると「光のにじみ」になる。暗闇の穴あけと違い画面を明るくしすぎるので、ランプの「ハロー」表現として穴あけと併用するのが定番 ([GameMaker Glow Effect (Additive Blending)](https://www.youtube.com/watch?v=lsnMpAlBcBA)、[Unity 2D グロー](https://www.gamedeveloper.com/design/how-to-create-2d-glow-effects-in-unity))。

### Unity URP 2D(Happy Harvest 公式デモ)
- **Global Light 2D** を1灯置き、夜は強度を下げつつ色を寒色(青紫)へ、昼は暖色へ、スクリプト(DayCycleHandler)のグラデーションカーブで遷移させる。ブレンドスタイルは **additive(明るくする)と multiply(「負のライト」で影を作る)** を使い分ける ([Unity: 2D light and shadow techniques](https://discussions.unity.com/t/2d-light-and-shadow-techniques-with-the-universal-render-pipeline/1641848))。
- ランプ類は Sprite Light(任意形状のライトテクスチャ)で「窓から漏れる光の形」を投影する。

### RPGツクール流(和製RPGの慣習)
- 定番は「画面の色調変更 **(R−68, G−68, B±0, グレー68)**」= 夜プリセット。**青チャンネルを削らず**赤緑を減らし彩度を落とすのがポイント ([FGMG: 夜マップの光源](https://fungamemake.com/archives/11892)、[RPGツクール公式 VX Ace 講座](https://rpgmakerofficial.com/product/products/rpgvxace/lecture/006_003u/))。
- その上にグラデ円の光源画像を**加算表示**(プラグインなら TMAnimeLight 等、不透明度 255・キャラ追従は ID −1)で重ねる。暗闇を黒ピクチャで作り穴を開ける方式も紹介されている ([FGMG: 暗闇とライト](https://fungamemake.com/archives/11734))。

### 色の慣習
- 夜のベースは**低彩度の青〜青紫**、人工光は**橙〜黄の暖色アクセント**という補色設計が定石。「暖色の光源は寒色の影を落とす」「シャドウは青紫へ、ハイライトは黄橙へヒューシフト」([Pixel-Editor: Color Theory](https://www.pixel-editor.com/articles/color-theory-for-pixel-art)、[Pixnote](https://pixnote.net/en/learn/color-palette/))。タスク想定の「#223 系の冷たい夜地に #ffcc88 系の暖グロー」はこの慣習どおりで、Stardew の実測値(青夜 × #FFAF5F 光)とも一致する。

## 3. トップダウンピクセルゲームのビネット

- ビネットは「画面端を暗くして視線を中央へ集める」演出。Unity 公式チュートリアルでは**強度(intensity)は 0.5 が上限**とされ、控えめ運用が前提 ([Unity Learn: Vignette](https://learn.unity.com/tutorial/post-processing-effects-vignette-2019-3))。
- 2Dピクセル向けビネットオーバーレイ集の設計思想は「**気づかれたら強すぎ**」— プレイヤーが意識しない強さで緊張感だけ足すのがスタイルとして成立する条件 ([Indie Game Feel – Psychological Vignette Overlays](https://alandassets.itch.io/indie-game-feel-psychological-vignette-overlays))。
- 失敗例: Manor Lords では夜サイクル+ビネットで「暗すぎて見えない」という苦情スレッドが立っている。常時の強いビネット+夜の暗さの重ね掛けは「濁り(murk)」として認識される ([Steam: Game too dark/vignette effect](https://steamcommunity.com/app/1363080/discussions/0/4355619963544425851/))。
- トップダウンの夜では、画面端固定のビネットより**プレイヤー中心の光円(追従する逆ビネット)**の方が主流。Don't Starve は「光の輪の外=即死級の脅威」としてゲームメカニクスに昇華している ([Wikipedia: Don't Starve](https://en.wikipedia.org/wiki/Don%27t_Starve))。
- まとめると: スタイルとして読ませるなら「弱く・スムーズに・夜の暗さとは加算しない」、murk になるのは「強度高+夜tint重ね+光源なし」のとき。

## 4. 夜でもゲームプレイを可読に保つ工夫

- **完全な黒にしない**: Stardew は減算率上限 0.93 で止め、かつ黄色減算で青を残す。RPGツクール夜プリセットも B±0。純黒背景はコントラストが取れず視認性を壊すため避けるのが定石 ([itch.io 討論](https://itch.io/post/5290746)、[PathBits: Top-Down Pixel Art Techniques](https://app.pathbits.com/topics/top-down-pixel-art-techniques))。
- **青シフト+彩度減で「暗さの記号」を作る**: 実際の輝度を落としすぎず、色相で夜を表現する(映画のフィルムティンティング由来の慣習)。
- **キャラクターのリム(縁取り)ライト**: Unity Happy Harvest は昼用/夜用の回転ライトに加えて **DayLightRim / NightLightRim** というキャラ輪郭専用ライトを持ち、マスクマップの R チャンネル(キャラ)/ G チャンネル(小物)でリム対象を分離して、夜でもシルエットが背景から浮くようにしている ([Unity: 2D light and shadow techniques](https://discussions.unity.com/t/2d-light-and-shadow-techniques-with-the-universal-render-pipeline/1641848))。ライトエンジンがない場合は「キャラだけ暗闇オーバーレイの影響を弱める(キャラの上に穴あけライトを常駐)」が同等の効果。
- **光源をランドマーク/導線として配置**: 街灯・窓明かり・たき火を進行方向の目印に置く。Stardew の窓明かりが夜だけ点くのも「建物=目的地」を読ませる装置。
- **足場・インタラクト対象は明るい縁取りや白ハイライトで高コントラストを維持**する(暗背景で効果大)。
- **「見えない暗さ」は意図的なメカニクスのときだけ**: Don't Starve(暗闇=攻撃される)、Terraria/Minecraft(夜=敵スポーン)のように、視界制限をリスク・緊張の演出として使う場合は暗くてよいが、単なる時間帯表現なら可読性優先で「青く・薄く・光源多め」が現代の主流 ([Design The Game: Day and Night Cycles](https://www.designthegame.com/learning/tutorial/day-night-cycles-powerful-design-tool-game-development))。

## walksim への示唆(要点だけ)
1. 夜 tint は「黒を重ねる」より「黄を引く/青を残す」— RGB でいえば R・G を大きく、B をほぼ削らない。上限は 90〜93% 程度で止める。
2. 光源は「グラデ円で暗闇に穴あけ(destination-out / subtract 相当)」+ 必要なら同じ円を弱い加算(#ffcc88 系, alpha 低め)で重ねてハローに。ライトマップを1枚にまとめると光同士が自然に合成される。
3. ビネットは intensity 0.5 未満・「気づかれない」強さ。夜はビネットを強めるのではなく tint 側で表現する。
4. プレイヤーの視認性は「キャラ周囲の常駐光円」or「キャラのリム/縁取り」で担保し、窓明かり・街灯を導線として配置する。

## 主なソース
- [Day Cycle - Stardew Valley Wiki](https://stardewvalleywiki.com/Day_Cycle) / [veywrn/StardewValley (decompiled 1.5)](https://github.com/veywrn/StardewValley/blob/master/StardewValley/Game1.cs)(Game1.cs / LightSource.cs / Object.cs を直接確認)
- [GameMaker: Simple Lighting (coffee-break tutorial)](https://gamemaker.io/en/tutorials/coffee-break-tutorial-simple-lighting-gml) / [Realtime 2D Lighting](https://gamemaker.io/en/blog/realtime-2d-lighting) / [Blend Modes Guide](https://manual.gamemaker.io/monthly/en/Additional_Information/Guide_To_Using_Blendmodes.htm)
- [Unity: 2D light and shadow techniques (Happy Harvest)](https://discussions.unity.com/t/2d-light-and-shadow-techniques-with-the-universal-render-pipeline/1641848) / [Unity Learn: Vignette](https://learn.unity.com/tutorial/post-processing-effects-vignette-2019-3)
- [FGMG: RPGツクールMVで夜マップの光源を作る](https://fungamemake.com/archives/11892) / [FGMG: 暗闇とライトを表現する](https://fungamemake.com/archives/11734) / [RPGツクール公式 VX Ace 夜のシーン講座](https://rpgmakerofficial.com/product/products/rpgvxace/lecture/006_003u/)
- [Pixel-Editor: Color Theory for Pixel Art](https://www.pixel-editor.com/articles/color-theory-for-pixel-art) / [Pixel Art Lighting & Glow Effects](https://www.pixel-editor.com/articles/pixel-art-lighting-effects) / [Pixnote: Color Guide](https://pixnote.net/en/learn/color-palette/)
- [Indie Game Feel – Psychological Vignette Overlays](https://alandassets.itch.io/indie-game-feel-psychological-vignette-overlays) / [Steam: Manor Lords too dark/vignette](https://steamcommunity.com/app/1363080/discussions/0/4355619963544425851/) / [PathBits: Top-Down Pixel Art Techniques](https://app.pathbits.com/topics/top-down-pixel-art-techniques)
- [Wikipedia: Don't Starve](https://en.wikipedia.org/wiki/Don%27t_Starve) / [Design The Game: Day and Night Cycles](https://www.designthegame.com/learning/tutorial/day-night-cycles-powerful-design-tool-game-development)