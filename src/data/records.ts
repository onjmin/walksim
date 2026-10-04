// レコード盤（去った おんJ民の、その後の 一夜）。物語の 正本は STORY.md（§4.5）。
// 2作目（roguelike）の 植民地に 落ちている「最後の レス」の、その 続き。今夜（9/14(火) の 未明）の 声
// （書きこみとは かぎらない。rec_q の 主は ネットを 辞めていて、もう 書きこまない）。
// 去り方は 1枚に 1つ（良し悪しを つけない。亡くなった 人は 入れない）。
// 中身は 実在スレの 引用ではなく 創作。朗読は レイの 機械音声（rei）。1要素＝メッセージ窓1枚・全角22字×2行まで。
// rec_q は まちのどおりの バス停（真の 筋）。転（まちのどおりの 窓）は rec_q で 開く（data/maps/street.ts の madoReady）。
// 2026-10-04 怪異側（板の 名残）を 消して 作りなおし中。名残の レコード 4枚も いっしょに 消した（STORY.md §5.97）。
// rec_q の 1行目「……今日も　早番や」は、夜明けの うみべで 本人の 声で 聞く（umi.ts の yoake_arrive）。

import type { ItemDef, RecordDef } from "../engine/defs";

const rei = { model: "rei" } as const;

export const records: Record<string, RecordDef> = {
	// まちのどおりの バス停：ネットを 辞めた（2 の 最後の レス「もう　来ないと　思う。楽しかった」）。
	// 夜明けに うみべで すれ違う 人（data/maps/umi.ts の yoake_arrive）
	rec_q: {
		id: "rec_q",
		title: "早番",
		voice: rei,
		date: "2032/09/14(火) 04:10",
		lines: [
			"……今日も　早番や",
			"ネット？　とっくに　やめたで",
			"……楽しかったな、あのころ",
			"ほな、いってきます",
		],
	},
};

// 本作のアイテムは全部 key: true（使えない・減らない）。レコードは records と同じ id で登録する。
export const items: Record<string, ItemDef> = {
	rec_q: {
		id: "rec_q",
		name: "レコード「早番」",
		desc: "去った　おんJ民の、今夜の　声。\nメニューの「レコード」で　聞ける。",
		key: true,
	},
};

/** 持っている レコードの id（メニュー・まとめカード・窓の 場面が 使う）。 */
export const ALL_RECORDS = ["rec_q"] as const;
