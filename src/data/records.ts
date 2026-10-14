// レコード盤（去った おんJ民の、その後の 一夜）。物語の 正本は STORY.md（§4.5）。
// 2作目（roguelike）の 植民地に 落ちている「最後の レス」の、その 続き。今夜（9/14(火) の 未明）の 声
// （書きこみとは かぎらない。rec_q の 主は ネットを 辞めていて、もう 書きこまない）。
// 去り方は 1枚に 1つ（良し悪しを つけない。亡くなった 人は 入れない）。
// 中身は 実在スレの 引用ではなく 創作。朗読は レイの 機械音声（rei）。1要素＝メッセージ窓1枚・全角22字×2行まで。
// rec_q は まちのどおりの バス停（真の 筋）。転（まちのどおりの 窓）は rec_q で 開く（data/maps/street.ts の madoReady）。
// 夜の 寄り道（STORY.md §5.4）の レコードは、その 寄り道の 入口に おちている（rec_e・rec_t）。
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
	// 雑居ビルの かごの すみ（夜の 寄り道「エレベーター」。STORY.md §5.4）：別の 掲示板へ
	// （2 の 最後の レス「実況は　あっちで　やっとるで」）。『５階』で 切れる（data/maps/zakkyo.ts の ijou）。
	// 声の 主は 無事で、真の 筋の 窓の 場面で 自分の 窓に いる（street.ts の mado）
	rec_e: {
		id: "rec_e",
		title: "実況",
		voice: rei,
		date: "2032/09/14(火) 01:41",
		lines: [
			"はい、実況　はじめるで。\nエレベーターで　異世界　いくやつ",
			"４階。……２階。……６階。\n草　生やしとる　場合ちゃうな",
			"２階。……１０階。……５階",
			"……だれか　のってきた",
			"……え、なんで。１　おしたのに\n上　いくん",
		],
	},
	// のりかえのみちの 路地の 門の まえ（夜の 寄り道「駅と 駅の あいだ」。STORY.md §5.4）：飽きた
	// （2 の 最後の レス「飽きたわ」）。おんJには 飽きて、いまは 夜釣り。ガードの 数で 切れる
	// （data/maps/norikae.ts の rojiShinya）。声の 主は 無事で、真の 筋の 窓の 場面で 竿を かついで 出かける
	rec_t: {
		id: "rec_t",
		title: "夜釣り",
		voice: rei,
		date: "2032/09/14(火) 01:58",
		lines: [
			"夜釣り、いくで。\n始発で　港まで　出るんや",
			"つきみまで、乗りかえの　道。\n札の　矢印　見とけば　ええ",
			"……床屋、さっきも　とおったな",
			"矢印は　道の　さき。\n……さきで　ええんよな",
			"ガード、これで　四つめや。\n……一つしか　ない　はずやのに",
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
	rec_e: {
		id: "rec_e",
		name: "レコード「実況」",
		desc: "去った　おんJ民の、今夜の　声。\nメニューの「レコード」で　聞ける。",
		key: true,
	},
	rec_t: {
		id: "rec_t",
		name: "レコード「夜釣り」",
		desc: "去った　おんJ民の、今夜の　声。\nメニューの「レコード」で　聞ける。",
		key: true,
	},
	// 路地の むこうの 電柱の 下で ひろう（norikae_ura の fuda）。朝、のりかえのみちの 床屋が 見る
	ura_fuda: {
		id: "ura_fuda",
		name: "乗りかえの札",
		desc: "手書きの『のりかえ　つきみ駅　→』。\n電柱の　札と、同じ　字。",
		key: true,
	},
	// 雑居ビルの もう一つの 10階で ひろう（zakkyo10 の salon）。朝、屋上の 管理人さんが 見る（okujo）
	goishi: {
		id: "goishi",
		name: "白い碁石",
		desc: "雑居ビルの　１０階で　ひろった。\nつめたい。",
		key: true,
	},
};

/** 持っている レコードの id（メニュー・まとめカード・窓の 場面が 使う）。 */
export const ALL_RECORDS = ["rec_q", "rec_e", "rec_t"] as const;
