// 終電（きさらぎ線・車内）。DESIGN §4・content-briefs「line: train / kisaragi / tunnel」。板の 名残「別の 掲示板へ 移った 人」（STORY.md §5.97）。
// 14×6。hub の改札から乗る（着地 (2,3)）。眠る乗客×5（起きない）。
// タイムスタンプ「――23:14」で目がさめる。レイのアナウンス（voice rei）のあと、
// 東のドア (12,3) から降車 → kisaragi (4,4)。**片道**（うしろの車両のドアは開かない。
// 電車は きさらぎ駅で去る。帰りは トンネルを ぬけて、まちの せんろぞいの 踏切へ 出る。地続き）。
// s.note: saruyume（乗客の寝言）・isanuki（窓の外の駅名。kisaragi 西端の看板でも呼ぶ）。

import type { MapDef, Story, TileDef } from "../../engine/defs";
import { TRAIN } from "../tiles-station";

/** 駅のアナウンス（レイの機械音声。立ち絵なし・名前欄「アナウンス」）。 */
const announce = (s: Story, text: string) =>
	s.say("rei", text, { name: "アナウンス", noPortrait: true });

// 車内のチップ（data/tiles-station.ts の TRAIN）。
//   h 化粧板の壁（網棚とつり革） / W 車窓 / Q 路線図・中づり / n ロングシート
//   E 降車ドア（東の端。ステンレスの扉）
const tiles: Record<string, TileDef> = TRAIN;

const rows = [
	"##############", // y0
	"#hWhQWhWQhWhh#", // y1  路線図 (4,1)・窓 (5,1)・中づり (8,1)
	"#n.n..n..n.n.#", // y2  座席。乗客 (3,2)(6,2)(11,2)・かさ (9,2)・だれもいない席 (1,2)
	"#............E", // y3  通路。乗車位置 (2,3)・降車 (12,3)・うしろのドア (1,3)
	"#.n..n..n..n.#", // y4  座席。乗客 (5,4)(8,4)
	"##############", // y5
];

/** 眠る乗客の共通の1枚目。 */
const asleep = (s: Story) =>
	s.narrate("（ふかく　ねむっている。\n起きる気配は　ない。）");

export const train: MapDef = {
	id: "train",
	scene: "train", // ジオラマ表示の場面（怪異の地区は箱がほどける）
	name: "終電",
	bgm: null,
	outside: "#000",
	tiles,
	rows,
	events: [
		// ── 乗った直後（auto once）。――23:14 ──
		{
			id: "wake",
			x: 2,
			y: 3,
			trigger: "auto",
			once: true,
			run: async (s) => {
				await s.wait(500);
				s.se("train", { volume: 0.6 });
				await s.narrate("――23:14");
				await s.say("kiriko", "……この車両、こんなに\nながかったンゴ？");
				await s.narrate("乗客は、みんな　ねむっている。");
				s.se("train", { volume: 0.4 });
				await s.wait(600);
				await announce(s, "つぎは――　きさらぎ、\nきさらぎ、です");
				await s.say("kiriko", "……そんな駅、路線図に\nあったンゴ？");
			},
		},

		// ── 降車ドア（東・片道）。踏むと きさらぎ駅へ ──
		{
			id: "alight",
			x: 12,
			y: 3,
			trigger: "touch",
			through: true,
			run: async (s) => {
				s.se("door");
				await s.narrate("ドアが　ひらいた。");
				await s.warp("kisaragi", 4, 4, "down");
			},
		},
		// ── うしろの車両へのドア（あかない） ──
		{
			id: "backdoor",
			x: 1,
			y: 3,
			trigger: "touch",
			through: true,
			when: (st) => !st.flags.seen_traindoor,
			run: async (s) => {
				s.set("seen_traindoor");
				await s.narrate("うしろの車両への　ドア。\n……あかない。");
				await s.narrate("窓の向こうは、くらくて\nなにも　見えない。");
			},
		},

		// ── 眠る乗客×5（話しかけても起きない） ──
		{
			id: "sleeper_a",
			x: 3,
			y: 2,
			sprite: "pub:sprites/mob_mama.png",
			dir: "down",
			trigger: "talk",
			fixedDir: true,
			run: async (s) => {
				await asleep(s);
				await s.narrate("マフラーが、座席まで\nずりおちている。");
			},
		},
		{
			id: "sleeper_b",
			x: 6,
			y: 2,
			sprite: "pub:sprites/mob_man.png",
			dir: "down",
			trigger: "talk",
			fixedDir: true,
			run: async (s) => {
				await asleep(s);
				await s.narrate("ねごとが、聞こえた。\n『……いい、ゆめ……』");
				await s.say("kiriko", "……起こさないほうが、\nいい気がするンゴ");
				await s.note("saruyume");
			},
		},
		{
			id: "sleeper_c",
			x: 11,
			y: 2,
			sprite: "pub:sprites/mob_obaachan.png",
			dir: "down",
			trigger: "talk",
			fixedDir: true,
			run: async (s) => {
				await asleep(s);
				await s.narrate("切符を、にぎったまま。\n行き先は、見えない。");
			},
		},
		{
			id: "sleeper_d",
			x: 5,
			y: 4,
			sprite: "pub:sprites/mob_salaryman.png",
			dir: "up",
			trigger: "talk",
			fixedDir: true,
			run: async (s) => {
				await asleep(s);
				await s.narrate("ときどき、くちもとが\nわらう。");
			},
		},
		{
			id: "sleeper_e",
			x: 8,
			y: 4,
			sprite: "pub:sprites/mob_ol.png",
			dir: "up",
			trigger: "talk",
			fixedDir: true,
			run: async (s) => {
				await asleep(s);
				await s.narrate("ヘッドホンから、ちいさな\n音が　もれている。");
			},
		},

		// ── しらべられるもの ──
		{
			id: "empty_seat",
			x: 1,
			y: 2,
			trigger: "talk",
			run: async (s) => {
				await s.narrate("だれも　座っていない。\n……ここだけ、あたたかい。");
			},
		},
		{
			id: "umbrella",
			x: 9,
			y: 2,
			trigger: "talk",
			run: async (s) => {
				await s.narrate("わすれものの　かさ。");
				await s.narrate("……この車両の　だれかの、\nという気は　しない。");
			},
		},
		{
			id: "routemap",
			x: 4,
			y: 1,
			trigger: "talk",
			run: async (s) => {
				await s.narrate(
					"路線図。……見おぼえのある\n駅名は、とちゅうで　おわる。",
				);
				await s.narrate("その先は、しらない字が\nならんでいる。");
			},
		},
		// 窓の外の駅（いさぬき）。ノートは kisaragi 西端の看板とどちらか先の方で
		{
			id: "window_isanuki",
			x: 5,
			y: 1,
			trigger: "talk",
			run: async (s) => {
				await s.narrate("窓の外。トンネルを　ぬけた。\n――『いさぬき』…？");
				await s.say("kiriko", "しらない駅ンゴ。……とまらず、\nとおりすぎたンゴ");
				await s.note("isanuki");
			},
		},
		// 中づり広告（二度目に見ると、やぶれ方がちがう。考察バイト）
		{
			id: "nakazuri",
			x: 8,
			y: 1,
			trigger: "talk",
			run: async (s) => {
				if (!s.flag("seen_nakazuri")) {
					s.set("seen_nakazuri");
					await s.narrate("中づり広告。『行楽は　い』\n……やぶれて、よめない。");
					return;
				}
				await s.narrate("……『行楽は　い』。\nやぶれ方が、さっきと　ちがう。");
			},
		},
	],
};
