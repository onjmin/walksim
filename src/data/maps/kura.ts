// TODO: 仮マップ（データの骨組み）。あとの段階（world: village 担当）が
// docs/content-briefs.md「world: village + kura」に沿って、このファイルごと完全に置き換える。
// 本実装: 10×8・dark 0.7。古い日記の断片（看板×3）とレコードB。
// いまは「入る → レコードBを拾う → もどる」だけができる最小の蔵。

import type { MapDef } from "../../engine/defs";
import { sign, warp } from "../helpers";
import { SPR } from "../sprites";
import { CAVE } from "../tiles";

const rows = [
	"########", // y0
	"#WWWWWW#", // y1
	"#wwwwww#", // y2
	"#......#", // y3  帳面 (2,3)・レコードB (5,3)
	"#......#", // y4
	"#......#", // y5  入ってくる場所 (3,5)
	"###.####", // y6  出口 (3,6) → village
];

export const kura: MapDef = {
	id: "kura",
	name: "蔵のなか",
	bgm: null,
	dark: 0.7,
	outside: "#050408",
	tiles: CAVE,
	rows,
	events: [
		warp(
			"to_village",
			3,
			6,
			{ map: "village", x: 5, y: 5, dir: "down" },
			{ se: "stairs" },
		),
		// ── レコードB「祭りのあと」（最奥） ──
		{
			id: "rec_b_ev",
			x: 5,
			y: 3,
			sprite: SPR.record,
			trigger: "talk",
			fixedDir: true,
			when: (st) => !(st.items.rec_b ?? 0),
			run: async (s) => {
				s.se("item");
				s.give("rec_b");
				s.set("got_rec_b");
				await s.narrate("ほこりの下から　黒いレコードを\nひろった。");
				await s.record("rec_b");
			},
		},
		sign("memo", 2, 3, "古い帳面だ。\n……くらくて　よめない。"),
	],
};
