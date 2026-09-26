// 蔵のなか。docs/content-briefs.md「world: village + kura」・DESIGN §4。
// 10×8・dark 0.7・BGM null（そとの音もしない）。箱の中の箱（style-spaces §2）。
// 蔵を整理した「誰か」の覚え書き（帳面×3。1つに 2021/03/15 の日付、
// 1つに削除スレの断片の漂着＝考察バイト技法3・10）と、最奥の台のレコードB。
// 入口(4,6)⇔村の蔵の戸。出口は南 (4,7) → village (20,5)。

import type { MapDef } from "../../engine/defs";
import { warp } from "../helpers";
import { SPR } from "../sprites";
import { INDOOR } from "../tiles";

// INDOOR の文字そのまま。x 木箱 / t 机 / O 白い台 / U 樽
const rows = [
	"##########", // y0
	"#HHHHHHHH#", // y1
	"#hhhhhhhh#", // y2
	"#x..t..O.#", // y3  木箱 (1,3)・帳面の机 (4,3)・レコードBの台 (7,3)
	"#........#", // y4
	"#.x...x.U#", // y5  帳面の木箱 (2,5)(6,5)・樽 (8,5)
	"#........#", // y6  入ってくる場所 (4,6)
	"####.#####", // y7  出口 (4,7) → village
];

export const kura: MapDef = {
	id: "kura",
	name: "蔵のなか",
	bgm: null,
	dark: 0.7,
	outside: "#080604",
	tiles: INDOOR,
	rows,
	events: [
		warp(
			"to_village",
			4,
			7,
			{ map: "village", x: 20, y: 5, dir: "down" },
			{ se: "door" },
		),

		// ── はじめて入ったとき（auto once） ──
		{
			id: "arrive",
			x: 4,
			y: 6,
			trigger: "auto",
			once: true,
			run: async (s) => {
				await s.wait(400);
				await s.narrate("ほこりと、ふるい木の\nにおいがする。");
				await s.narrate("そとの音が、きこえない。");
			},
		},

		// ── レコードB「祭りのあと」（最奥の台の上） ──
		{
			id: "rec_b_ev",
			x: 7,
			y: 3,
			sprite: SPR.record,
			trigger: "talk",
			fixedDir: true,
			when: (st) => !(st.items.rec_b ?? 0),
			run: async (s) => {
				await s.narrate("台の上に、黒いレコード。\nほこりを、はらった。");
				s.se("item");
				s.give("rec_b");
				s.set("got_rec_b");
				await s.narrate("レコード『祭りのあと』を\n手にいれた。");
				await s.record("rec_b");
				// 途切れた日常のあとに、日常の一言（dialogue-guide §3）
				await s.say("kiriko", "……やきう、見れたンゴかな");
			},
		},
		{
			id: "dai_empty",
			x: 7,
			y: 3,
			trigger: "talk",
			when: (st) => (st.items.rec_b ?? 0) > 0,
			run: async (s) => {
				await s.narrate("台の上には、まるい\nほこりの跡だけ　のこった。");
			},
		},

		// ── 覚え書き①（机の帳面。日付 2021/03/15） ──
		{
			id: "memo1",
			x: 4,
			y: 3,
			trigger: "talk",
			run: async (s) => {
				await s.narrate("帳面が　ひらいてある。\n……だれかの、覚え書きだ。");
				await s.narrate(
					"『2021/03/15　くらの整理、\nなかばまで。つづきは　あす』",
				);
				await s.narrate("つぎの　ページは、白い。");
			},
		},
		// ── 覚え書き②（木箱の帳面。村のしきたりの走り書き） ──
		{
			id: "memo2",
			x: 2,
			y: 5,
			trigger: "talk",
			run: async (s) => {
				await s.narrate("ふるい帳面。\n字が、ていねいだ。");
				await s.narrate("『まつりの　たいこは\n北へ　むけて　たたかない』");
				await s.narrate("『地蔵の　はな、わすれず』");
			},
		},
		// ── 覚え書き③（木箱の帳面。はさまった一枚＝削除スレの断片の漂着） ──
		{
			id: "memo3",
			x: 6,
			y: 5,
			trigger: "talk",
			run: async (s) => {
				await s.narrate("帳面に、一枚だけ\nちがう紙が　はさまっている。");
				await s.narrate(
					"――たのしかったなあ、また\nやりたいなあ、ばんめし　なんやろ",
				);
				await s.narrate("紙の　はしが、しめっている。");
			},
		},

		// ── そのほかの物 ──
		{
			id: "hako",
			x: 1,
			y: 3,
			trigger: "talk",
			run: async (s) => {
				await s.narrate("木箱。なかは、からだ。\nこめの　ひと粒も　ない。");
			},
		},
		{
			id: "taru",
			x: 8,
			y: 5,
			trigger: "talk",
			run: async (s) => {
				await s.narrate("たるの底に、みずが\nすこしだけ。");
				await s.narrate("……おまつりの、におい。");
			},
		},
	],
};
