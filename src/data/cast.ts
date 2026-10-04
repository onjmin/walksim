// 登場人物（DESIGN §5）。歩行グラは RPGEN 形式（16x16・2コマ×4方向）。
// 2作目の 村の 仲間（ロゼ・フェリス・シヨ・ゼロ）と 住人（アル・リノ）は 3作目には 出ない（STORY.md §5.97）。
// 2026-10-04 怪異側（板の 名残）と、現実ばなれした マスコット（ネムリン・ミャウミャウ・おんちゃん・
// にぃちぇ・ムッジェ・アイ・うしろ・八尺様 ほか）と、名残の 案内役（つくよみ・テト）は 消した（世界観を 保つため）。
// 立ち絵（portrait.src）は public/portraits/ に透過 PNG を置けば表示される。無ければダミー表示。
// 立ち絵は右向きで描けば、右側に立つときは自動で左右反転する（ui/message.ts）。
// 声（voice）は engine/audio.ts の CORE_VOICE_MODELS から選ぶ。

import type { CharDef } from "../engine/defs";

const c = (d: CharDef) => d;

export const cast: Record<string, CharDef> = {
	/**
	 * やきう（名無しの おんJ民。猛虎弁。UTAU の 声は 無い）。2作目の 結末で 外へ 出た。
	 * 3作目では 夜明けの うみべの ベンチで スマホの 保守村の スレを 見ている（STORY.md §5.9）。
	 */
	nanj: c({
		id: "nanj",
		name: "やきう",
		walk: "sa:4rSOzo",
		color: "#f5d142",
	}),
	/** 主人公。一人称「吾輩」・語尾「ンゴ」。夢の中では口数少なめ。 */
	kiriko: c({
		id: "kiriko",
		name: "キリコ",
		walk: "sa:vHsmy5",
		color: "#7be0a0",
		voice: { model: "uc" },
		portrait: { src: "portraits/kiriko.png", side: "left" },
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
	/**
	 * 朝のスレの「名無しさん」の声その1（クッキー☆由来の UTAU。声のみ使用・DESIGN §5）。
	 * 姿はマップに出さない（キリコの 部屋の 朝の スレの 書き込みを noPortrait＋名前欄「名無しさん」で読む。
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
