// TODO: 仮マップ（データの骨組み）。あとの段階（world: yellow 担当）が
// docs/content-briefs.md「world: yellow」に沿って、このファイルごと完全に置き換える。
// 本実装: 26×18 のバックルーム Level 0（迷路・ポスターの反復・テト・ミャウミャウ目撃①）。
// いまは「入る → レコードAを拾う → もどる」だけができる最小の部屋。

import type { MapDef } from "../../engine/defs";
import { warp } from "../helpers";
import { SPR } from "../sprites";
import { INDOOR } from "../tiles";

const rows = [
	"##########", // y0
	"#HHHHHHHH#", // y1
	"#hhhhhhhh#", // y2
	"#.....t..#", // y3  事務机 (6,3)・レコードA (7,3)
	"#........#", // y4
	"#........#", // y5  入ってくる場所 (4,5)
	"####D#####", // y6  もどる扉 (4,6) → hub
];

export const yellow: MapDef = {
	id: "yellow",
	name: "黄色い部屋",
	bgm: "deep2",
	tint: "rgba(180,150,40,0.18)",
	ambient: { kind: "dust" },
	outside: "#141005",
	tiles: INDOOR,
	rows,
	events: [
		warp(
			"to_hub",
			4,
			6,
			{ map: "hub", x: 3, y: 3, dir: "down" },
			{ se: "door" },
		),
		// ── レコードA「深夜のスレ」（最奥の机の上） ──
		{
			id: "rec_a_ev",
			x: 7,
			y: 3,
			sprite: SPR.record,
			trigger: "talk",
			fixedDir: true,
			when: (st) => !(st.items.rec_a ?? 0),
			run: async (s) => {
				s.se("item");
				s.give("rec_a");
				s.set("got_rec_a");
				await s.narrate("机の上の　黒いレコードを\nひろった。");
				await s.record("rec_a");
			},
		},
		{
			id: "wallpaper",
			x: 2,
			y: 2,
			trigger: "talk",
			run: async (s) => {
				await s.narrate("黄ばんだ　かべ紙。\nどこかで　見たことがある。");
			},
		},
	],
};
