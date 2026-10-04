# 作者への発注メモ（イラスト・素材）

ゲームは全部ダミーで動く状態にしてあります。ここにあるものは**差し替えるだけで反映**されます（コード変更不要）。
優先度: ★★★=画面に出る頻度が高い ／ ★★=1シーンだが見せ場 ／ ★=任意・こだわり枠

## 1. 立ち絵（透過PNG を public/portraits/<id>.png に置くだけ）

仕様は rpg と同じ: **全身・右向き・透過PNG**。余白やキャンバスサイズは自由（自動でトリム・
頭位置・身長をそろえます）。無いキャラはキャラ色のシルエットで表示されます。
会話では上から約6割（頭〜腰）を切り出して表示。手直しは src/data/cast.ts の portrait 設定で可能。

（いまは 発注なし。2026-10-04 に マスコットと 怪異側の キャラを 消した）

済み（rpg から流用）: kiriko.png / roze.png / rei.png / teto.png
済み（roguelike と共通）: shiyo.png / zero.png / rino.png / aru.png

## 2. 歩行グラ（差し替え任意。現在は自動生成ドット絵）

`public/sprites/<name>.png`、32×64（16×16セル・2フレーム×4方向、rpg と同じ並び）。
現状 `scripts/make-sprites.mjs` の生成品が入っています。描き直すなら:

- nemurin / myaumyau_a / myaumyau_b / myaumyau_c / tsukuyomi / rino / aru / ai / ushiro
- kiriko / shiyo / zero は RPGEN に投入された歩行グラ（`sa:vHsmy5` / `sa:y8Kr53` / `sa:KxS5YZ`）を参照しています
- `hasshaku.png` だけ特殊: 32×128（**16×32の縦長セル**×2フレーム×4方向）。白いワンピース＋帽子の長身シルエット
- ushiro は全方向「後ろ姿」で描いてあります（仕様です）

- 町の人（`mob_child` / `mob_mama` / `mob_salaryman` / `mob_obaachan` / `mob_ojiichan` / `mob_student` /
  `mob_man` / `mob_worker` / `mob_obachan` / `mob_shopkeeper` / `mob_ol`）は `scripts/make-townsfolk.mjs` の生成品
  （RPGEN の RPG 風の歩行グラから差し替え）。描き直すなら同じ規格で、スクリプトの MOBS から外す

## 3. マップチップ（任意・現在は既存チップ+色調で代用）

- 暗色系の差し替えチップ一式（現在は rpg-reze/Base.png を tint/dark で暗くして代用）
- 単品候補: 踏切警報機・信号機・鳥居・地蔵・カラーコーン（黒地に映える小さな赤/黄アクセントで十分）
- 蓄音機・レコード盤の16×16小物（現在は phono.png と水晶玉で代用）

## 4. BGM（任意・歓迎。無くても完結します）

現在は rpg/roguelike の MML 流用+編集的変換で構成。差し替え歓迎:
- 解音ゼロの代読歌（15〜20秒の素朴な単旋律。現在は仮 MML）

## 5. その他（任意）

- walksim 専用 favicon（現在は rpg のキリコを流用）
- OGP 画像（現在なし）

---
更新履歴はこのファイルに追記してください。実装側の対応が必要になったら issue かスレで一言ください。
