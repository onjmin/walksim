// 歩行グラ・置物の名前 → 素材参照。マップやイベントはこの名前で参照する。
// `sa:<id>` … RPGEN 歩行グラ（rpgen-search）、`pub:` … public/ 配下、`sp:<id>` … RPGEN 単体スプライト。

import { PROPS } from "./tiles";

export const SPR = {
	// ── 置物 ──
	/** 蓄音機（メニューの案内・キリコの 部屋）。public/sprites/phono.png は scripts/make-sprites.mjs で作る。 */
	phono: "pub:sprites/phono.png#0,0,16,16",
	/** レコード盤（拾う前の見た目） */
	record: "sp:3dANW5P",
	/** 灯ったランプ（懐中電灯の落ちている見た目の仮） */
	lantern: PROPS.lantern,

	// ── 新しく描いた歩行グラ（scripts/make-sprites.mjs） ──
	/** ミャウミャウ（紙袋頭。出会うたび姿が違うので A/B/C をイベント側で使い分ける） */
	myaumyauA: "pub:sprites/myaumyau_a.png",
	myaumyauB: "pub:sprites/myaumyau_b.png",
	myaumyauC: "pub:sprites/myaumyau_c.png",

	// ── モブ（同梱の RPGEN DQ 風キャラ） ──
	townsfolk: "pub:sprites/mob_man.png",
	woman: "pub:sprites/mob_mama.png",
} as const;
