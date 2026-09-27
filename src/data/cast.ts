// 登場人物（DESIGN §5）。歩行グラは RPGEN 形式（16x16・2コマ×4方向）。
// 新キャラ（ネムリン・ミャウミャウ・つくよみちゃん・八尺様・リノ・シヨ・アル・ゼロ・アイ・うしろ）は
// scripts/make-sprites.mjs で作った仮グラ。
// 立ち絵（portrait.src）は public/portraits/ に透過 PNG を置けば表示される。無ければダミー表示。
// 立ち絵は右向きで描けば、右側に立つときは自動で左右反転する（ui/message.ts）。
// 声（voice）はコア8音源 uc / roze / rei / tsukuyomi / rino121 / teto / shiyo / hibika_aru
// （engine/audio.ts の CORE_VOICE_MODELS と合わせる。春音リノの現行版キーワードは rino121）。

import type { CharDef } from "../engine/defs";

const c = (d: CharDef) => d;

export const cast: Record<string, CharDef> = {
	/** 主人公。一人称「吾輩」・語尾「ンゴ」。夢の中では口数少なめ。 */
	kiriko: c({
		id: "kiriko",
		name: "キリコ",
		walk: "pub:sprites/kiriko.png",
		color: "#7be0a0",
		voice: { model: "uc" },
		portrait: { src: "portraits/kiriko.png", side: "left" },
	}),
	/** 改札の番人。一人称「うち」・語尾「ピロ」・口癖「眠たいむ〜ん」。虚弱。ヒント役。 */
	nemurin: c({
		id: "nemurin",
		name: "ネムリン",
		walk: "pub:sprites/nemurin.png",
		color: "#b9a8e8",
	}),
	/**
	 * 出会うたび姿が違う（公式にデザイン未確定）。敵対しない。語尾「ぷ」「ぷゆゆ🥺」。
	 * 歩行グラはイベント側で sprites.ts の myaumyauA/B/C を使い分ける（これは既定の A）。
	 */
	myaumyau: c({
		id: "myaumyau",
		name: "ミャウミャウ",
		walk: "pub:sprites/myaumyau_a.png",
		color: "#e8dfc8",
	}),
	/** 村の神社の巫女。丁寧で優しい。ルール説明役。 */
	tsukuyomi: c({
		id: "tsukuyomi",
		name: "つくよみちゃん",
		walk: "pub:sprites/tsukuyomi.png",
		color: "#f08a9e",
		voice: { model: "tsukuyomi" },
	}),
	/** 過去ログの地層の安全地帯の主。語尾「〜おん」。あたたかい。 */
	onchan: c({
		id: "onchan",
		name: "おんちゃん",
		walk: "sa:oLrlUq", // rpgen no.1212「おんちゃん」の歩行シート（rpg と同じ）
		color: "#f5c56a",
	}),
	/** 「〜ニィ」。夢の中では毎日「今日　日曜日だニィ！」（data/weekday.ts）。 */
	nichie: c({
		id: "nichie",
		name: "にぃちぇ",
		walk: "pub:sprites/minors_nichie.png",
		color: "#b48be0",
	}),
	/** 近づけない奥の赤い気配。「ホゲェ……」だけ聞こえる。 */
	mujje: c({
		id: "mujje",
		name: "ムッジェ",
		walk: "pub:sprites/mujje.png",
		color: "#d8352a",
	}),
	/** 終点で待つ先輩。「〜アル」。 */
	roze: c({
		id: "roze",
		name: "ロゼ",
		walk: "sa:mHhx69",
		color: "#ff6f91",
		voice: { model: "roze" },
		portrait: { src: "portraits/roze.png", side: "right" },
	}),
	/**
	 * 駅の自動アナウンス。レコードの朗読音声もレイの機械音声。
	 * 姿はマップに出さない（歩行グラは rpg と同じものを念のため引き当てておく）。
	 * アナウンスのときは opt.name「アナウンス」＋ noPortrait で出す。
	 */
	rei: c({
		id: "rei",
		name: "レイ",
		walk: "sa:TI21YC",
		color: "#ff8a3d",
		voice: { model: "rei" },
		portrait: { src: "portraits/rei.png", side: "right" },
	}),
	/** 遠景専用。セリフは「ぽ　ぽ　ぽ」のみ。接近しない（16×32 の白い長身シルエット）。 */
	hasshaku: c({
		id: "hasshaku",
		name: "？？？",
		walk: "pub:sprites/hasshaku.png",
		color: "#e8e8f0",
	}),
	/** きさらぎ駅の線路脇。話しかけると消える。無言（同梱の RPGEN DQ 風の老人グラ）。 */
	oldman: c({
		id: "oldman",
		name: "片足の老人",
		walk: "pub:sprites/mob_ojiichan.png",
		color: "#9a9a90",
	}),
	/**
	 * 黄色い部屋の「先客」。事務椅子の主。「べ、別に」型の照れ隠し。
	 * 31年ここにいる気がする、等（歩行グラ・立ち絵・色は rpg と同じ）。
	 */
	teto: c({
		id: "teto",
		name: "テト",
		walk: "sa:3xUW5Y",
		color: "#e2455b",
		voice: { model: "teto" },
		portrait: { src: "portraits/teto.png", side: "right" },
	}),
	/** 過去ログの地層の小さな食堂の女将。45歳・伊勢出身。生活感のある落ち着き。 */
	rino: c({
		id: "rino",
		name: "リノ",
		walk: "pub:sprites/rino.png",
		color: "#c88a5a",
		voice: { model: "rino121" },
	}),
	/**
	 * hub の壊れた自販機に小銭を入れ続けている。16歳・ツンデレ・一人称「あたす」。
	 * 照れ・動揺の瞬間だけ津軽弁が一瞬漏れる。
	 */
	shiyo: c({
		id: "shiyo",
		name: "シヨ",
		walk: "pub:sprites/shiyo.png",
		portrait: { src: "portraits/shiyo.png", side: "right" },
		color: "#cfa236",
		voice: { model: "shiyo" },
	}),
	/** hub の開かないエレベーターを調べている科学部の18歳。計測はするが説明はしない。 */
	aru: c({
		id: "aru",
		name: "アル",
		walk: "pub:sprites/aru.png",
		color: "#7ab8d4",
		voice: { model: "hibika_aru" },
	}),
	/**
	 * 筆談アンドロイド（声のないUTAU・史実）。セリフは全て
	 * 「（スケッチブックを見せている）」形式＋地の文なので voice は持たない。
	 */
	zero: c({
		id: "zero",
		name: "ゼロ",
		walk: "pub:sprites/zero.png",
		portrait: { src: "portraits/zero.png", side: "right" },
		color: "#8ab0e8",
	}),
	/**
	 * 2日で消えた3番目の企画（史実）。お絵かき掲示板の「描きかけの絵」の正体。
	 * 台詞は遺構の2行だけ。声は無い。
	 */
	ai: c({
		id: "ai",
		name: "アイ",
		walk: "pub:sprites/ai.png",
		color: "#c8ccd8",
	}),
	/**
	 * 「君の、うしろ」。きさらぎ駅ホームの柱の陰。話しかけると消え、
	 * 直後に自分の真後ろに立っている。無害。声は無い（音源はあるが koe 未収録）。
	 */
	ushiro: c({
		id: "ushiro",
		name: "うしろ",
		walk: "pub:sprites/ushiro.png",
		color: "#b04a86",
	}),
	/**
	 * 朝のスレの「名無しさん」の声その1（クッキー☆由来の UTAU。声のみ使用・DESIGN §5）。
	 * 姿はマップに出さない（terminus の朝の書き込みを noPortrait＋名前欄「名無しさん」で読む。
	 * 歩行グラは念のため同梱の汎用グラを引き当てておく）。
	 */
	mgroid: c({
		id: "mgroid",
		name: "名無しさん",
		walk: "pub:sprites/mob_man.png",
		color: "#8a97a8",
		voice: { model: "mgroid" },
	}),
	/** 朝のスレの「名無しさん」の声その2（mgroid と同じ扱い）。 */
	motroid: c({
		id: "motroid",
		name: "名無しさん",
		walk: "pub:sprites/mob_salaryman.png",
		color: "#98a88a",
		voice: { model: "motroid" },
	}),
	/** 朝のスレの「名無しさん」の声その3（mgroid と同じ扱い）。 */
	nynroid: c({
		id: "nynroid",
		name: "名無しさん",
		walk: "pub:sprites/mob_mama.png",
		color: "#a88a98",
		voice: { model: "nynroid" },
	}),
};
