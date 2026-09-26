// 登場人物（DESIGN §5）。歩行グラは RPGEN 形式（16x16・2コマ×4方向）。
// 新キャラ（ネムリン・ミャウミャウ・つくよみちゃん・八尺様）は scripts/make-sprites.mjs で作った仮グラ。
// 立ち絵（portrait.src）は public/portraits/ に透過 PNG を置けば表示される。無ければダミー表示。
// 立ち絵は右向きで描けば、右側に立つときは自動で左右反転する（ui/message.ts）。
// 声（voice）は uc / roze / rei / tsukuyomi の4つだけ（engine/audio.ts の prepareSpeech と合わせる）。

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
		walk: "pub:assets/rpgen/char/03-elderly-a.png",
		color: "#9a9a90",
	}),
};
