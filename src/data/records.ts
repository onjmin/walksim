// レコード盤（去った おんJ民の、その後の 一夜）。物語の 正本は STORY.md（§4.5）。
// 2作目（roguelike）の 植民地に 落ちている「最後の レス」の、その 続き。今夜（9/14(火) の 未明）の 声
// （書きこみとは かぎらない。rec_q の 主は ネットを 辞めていて、もう 書きこまない）。
// 去り方は 1枚に 1つ（良し悪しを つけない。亡くなった 人は 入れない）。
// 中身は 実在スレの 引用ではなく 創作。朗読は レイの 機械音声（rei）。1要素＝メッセージ窓1枚・全角22字×2行まで。
// rec_q は まちのどおりの バス停（真の 筋）。転（まちのどおりの 窓）は rec_q と 寄り道の レコード 2枚で 開く（data/maps/street.ts の madoReady）。
// 夜の 寄り道（STORY.md §5.4）の レコードは、たいてい その 寄り道の 入口に おちている（rec_k だけ 中）。
// 寄り道の レコードは ルール（手順）だけ 教え、異変は 先に 言わない（遊ぶ 人が 自分で 気づくため）。
// 型を そろえない：途中で 切れる（rec_e・rec_k・rec_s）／ふつうに 終わる（rec_t）。
// 声は 人ごとに 変える（高さ pitchOffset と 話し方。猛虎弁は 書きこみの 口調で、声では 本人の ことばに もどる）。
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
		date: "2032/09/14(火) 01:50",
		lines: [
			"……今日も　早番や",
			"ネット？　とっくに　やめたで",
			"……楽しかったな、あのころ",
			"ほな、いってきます",
		],
	},
	// 雑居ビルの かごの すみ（夜の 寄り道「エレベーター」。STORY.md §5.4）：別の 掲示板へ
	// （2 の 最後の レス「実況は　あっちで　やっとるで」）。5階で 乗ってきた だれかで 切れる（data/maps/zakkyo.ts の ijou）。
	// 声の 主は 無事で、真の 筋の 窓の 場面で 自分の 窓に いる（street.ts の mado）
	rec_e: {
		id: "rec_e",
		title: "実況",
		// まだ 書いている 人。早口で、ネットの 口調の まま
		voice: { model: "rei", pitchOffset: 2 },
		date: "2032/09/14(火) 01:41",
		lines: [
			"はい、実況　はじめるで。\nエレベーターで　異世界　いくやつ",
			"４階。……２階。……６階。\n草　生やしとる　場合ちゃうな",
			"２階。……１０階。……５階",
			"……だれか　のってきた",
		],
	},
	// のりかえのみちの 路地の 門の まえ（夜の 寄り道「駅と 駅の あいだ」。STORY.md §5.4）：飽きた
	// （2 の 最後の レス「飽きたわ」）。おんJには 飽きて、いまは 夜釣り。この 1枚だけ 切れずに ふつうに 終わる
	// （data/maps/norikae.ts の rojiShinya）。なのに 路地の むこうには クーラーボックスと 竿だけが のこっている。
	// 声の 主は 無事で、真の 筋の 窓の 場面で 竿を かついで 出かける
	rec_t: {
		id: "rec_t",
		title: "夜釣り",
		// 年かさで、ことば少な
		voice: { model: "rei", pitchOffset: -3 },
		date: "2032/09/14(火) 01:58",
		lines: [
			"夜釣りに　いく。\n始発で、港まで",
			"つきみまで、乗りかえの　道。\n札の　矢印に　ついていけば　いい",
			"クーラーボックス、よし。\n竿、よし",
			"……じゃ、いってくる",
		],
	},
	// かわかない 店の わすれものの 箱（夜の 寄り道「終わらない 洗濯」の 中。STORY.md §5.4）：結婚・子ども
	// （2 の 最後の レス「嫁に　見つかった」）。この 1枚だけ 入口に なく、ガラスの むこうの 泣き声を 聞いた
	// あとに 拾う（data/maps/laundry_ura.ts の wasuremono）。泣き声で 切れる。
	// 声の 主の 子は 無事で、真の 筋の 窓の 場面で その 人が 家で あやしている
	rec_k: {
		id: "rec_k",
		title: "夜泣き",
		// 寝不足の 父親。小声で、やさしい
		voice: { model: "rei", pitchOffset: -1 },
		date: "2032/09/14(火) 01:26",
		lines: [
			"うちの　乾燥機、こわれちゃって。\n夜中の　コインランドリー",
			"子どもの　服って、\nちっさいなあ",
			"……あ、泣いてる",
			"うちの　子の　声だ",
		],
	},
	// せんろぞいのみちの あぜ道の おわり（夜の 寄り道「線路ぞいの 無人駅」。STORY.md §5.4）：就職
	// （2 の 最後の レス「来月から　社会人や」）。線路の むこうの 灯りへ 歩きだして 切れる（data/maps/senro.ts の ekiShinya）。
	// 声の 主は 無事で、真の 筋の 窓の 場面で 自分の 部屋に 帰っている
	rec_s: {
		id: "rec_s",
		title: "終電",
		// 社会人 一年め。若く、まだ ていねい
		voice: { model: "rei", pitchOffset: 3 },
		date: "2032/09/14(火) 00:58",
		lines: [
			"終電、寝すごしました。\n……どこだ、ここ",
			"無人駅。駅名は……\nいや、読まないで　おこう",
			"線路の　むこうに、灯り。\n……歩いて　いけるかな",
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
	rec_k: {
		id: "rec_k",
		name: "レコード「夜泣き」",
		desc: "去った　おんJ民の、今夜の　声。\nメニューの「レコード」で　聞ける。",
		key: true,
	},
	rec_s: {
		id: "rec_s",
		name: "レコード「終電」",
		desc: "去った　おんJ民の、今夜の　声。\nメニューの「レコード」で　聞ける。",
		key: true,
	},
	// 地図に ない 駅の ホームの 灯りの 下で ひろう（senro_eki の akari）。朝、せんろぞいの カメラの人が 見る
	kouken: {
		id: "kouken",
		name: "かたい切符",
		desc: "地図に　ない　駅で　ひろった。\n駅名の　ところが、にじんでいる。",
		key: true,
	},
	// かわかない 店の 4ばんで ひろう（laundry_ura の yonban）。朝、店の おばちゃんが 見る（laundry）
	chiisai_kutsushita: {
		id: "chiisai_kutsushita",
		name: "ちいさなくつした",
		desc: "コインランドリーの　４ばんで\nひろった。かたほうだけ。",
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

/** 夜の 寄り道の レコード（STORY.md §5.4）。2枚 そろうと 窓の 場面が 開く（street の madoReady）。 */
export const YORIMICHI_RECORDS = ["rec_e", "rec_t", "rec_k", "rec_s"] as const;

/** 持っている レコードの id（メニュー・まとめカード・窓の 場面が 使う）。 */
export const ALL_RECORDS = [
	"rec_q",
	"rec_e",
	"rec_t",
	"rec_k",
	"rec_s",
] as const;
