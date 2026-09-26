// レコード盤（消えたおんJ民の「最終レス」）と、大事なもの（DESIGN §6）。
// 中身は実在スレの引用ではなく創作。他愛ない日常の言葉が、途中で終わる感じにする
// （悲惨・不吉にしすぎない。最後のレコードだけ今夜の日付で、キリコの声）。
// rec_a〜c の朗読はレイの機械音声（rei）。1要素＝メッセージ窓1枚・全角22字×2行まで。
// trueVoice は終点・供養スレ駅の一斉再生（Story.record の opt.trueVoice）でだけ流れる
// 「本人の声」（rec_last はもともとキリコ＝uc の声なので trueVoice は持たない）。

import type { ItemDef, RecordDef } from "../engine/defs";

const rei = { model: "rei" } as const;

export const records: Record<string, RecordDef> = {
	rec_a: {
		id: "rec_a",
		title: "深夜のスレ",
		voice: rei,
		trueVoice: { model: "ruko_male" },
		date: "2021/03/15(月) 03:04",
		lines: [
			"だれか　おるか？\n眠れんくて　スレ立てたわ",
			"こんな時間やのに\nレス早くて草",
			"せっかくやし　朝まで\n語ろうや",
			"……ちょっと　風呂\n入ってくるわ",
		],
	},
	rec_b: {
		id: "rec_b",
		title: "祭りのあと",
		voice: rei,
		trueVoice: { model: "ruko_female" },
		date: "2021/03/15(月) 03:09",
		lines: [
			"今日の実況　たのしかったわ。\nはらいたい",
			"まとめたら　絶対のびるやろ\nこれ",
			"明日は　やきう見るんや。\nはよ寝な",
		],
	},
	rec_c: {
		id: "rec_c",
		title: "おやすみ",
		voice: rei,
		trueVoice: { model: "teto" },
		date: "2021/03/15(月) 03:15",
		lines: [
			"みんな　まだ起きてて草",
			"ワイ　明日から　ちょっと\n忙しくなるんや",
			"落ちてたら　また誰か\n立ててくれや",
			"ほな　おやすみ",
		],
	},
	// キリコ自身の声。日付は今夜（DESIGN §1・§6）
	rec_last: {
		id: "rec_last",
		title: "黒いレコード",
		voice: { model: "uc" },
		date: "今夜",
		lines: [
			"眠れないから　ちょっと\n歩いてくるンゴ",
			"もどったら　つづき\n書くンゴ",
		],
	},
};

// 本作のアイテムは全部 key: true（使えない・減らない）。レコードは records と同じ id で登録する。
export const items: Record<string, ItemDef> = {
	rec_a: {
		id: "rec_a",
		name: "レコード「深夜のスレ」",
		desc: "きえた　おんJ民の　最終レス①。\nメニューの「レコード」で　聞ける。",
		key: true,
	},
	rec_b: {
		id: "rec_b",
		name: "レコード「祭りのあと」",
		desc: "きえた　おんJ民の　最終レス②。\nメニューの「レコード」で　聞ける。",
		key: true,
	},
	rec_c: {
		id: "rec_c",
		name: "レコード「おやすみ」",
		desc: "きえた　おんJ民の　最終レス③。\nメニューの「レコード」で　聞ける。",
		key: true,
	},
	rec_last: {
		id: "rec_last",
		name: "黒いレコード",
		desc: "今夜の日付の　レコード。\nきいたことのある　声がする。",
		key: true,
	},
	omamori: {
		id: "omamori",
		name: "つくよみのお守り",
		desc: "神社で　もらった　お守り。\n持っていると「ぽぽぽ」が　とおざかる。",
		key: true,
	},
	flashlight: {
		id: "flashlight",
		name: "懐中電灯",
		desc: "くらい場所でも　あかりが\nとおくまで　とどく。",
		key: true,
	},
};
