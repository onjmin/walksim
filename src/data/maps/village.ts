// TODO: 仮マップ（データの骨組み）。あとの段階（world: village 担当）が
// docs/content-briefs.md「world: village + kura」に沿って、このファイルごと完全に置き換える。
// 本実装: 26×20 の夕暮れの村（神社・つくよみちゃん・お守り・八尺様・地蔵・蔵への道）。
// いまは「入る → 蔵へ行く → もどる」だけができる最小の原っぱ。お守り（omamori）の入手もここ。

import type { MapDef } from "../../engine/defs";
import { sign, warp } from "../helpers";
import { FIELD, PROPS } from "../tiles";

const rows = [
	"TTTTTTTTTT", // y0
	"T........T", // y1
	"T..!.....T", // y2  看板 (3,2)・お守り (7,2)
	"T........T", // y3
	"T....C...T", // y4  蔵の入口 (5,4) → kura
	"T........T", // y5
	"T........T", // y6  入ってくる場所 (4,6)
	"TTTT.TTTTT", // y7  南の出口 (4,7) → hub
];

export const village: MapDef = {
	id: "village",
	name: "夕暮れの村",
	bgm: "sad",
	tint: "rgba(150,60,50,0.25)",
	outside: "#1a0d0a",
	tiles: FIELD,
	rows,
	events: [
		warp(
			"to_hub",
			4,
			7,
			{ map: "hub", x: 7, y: 3, dir: "down" },
			{ se: "door" },
		),
		warp(
			"to_kura",
			5,
			4,
			{ map: "kura", x: 3, y: 5, dir: "up" },
			{ se: "stairs" },
		),
		// 仮のお守り（本実装ではつくよみちゃんがルール説明のあとにくれる）
		{
			id: "omamori_ev",
			x: 7,
			y: 2,
			sprite: PROPS.chest,
			trigger: "talk",
			fixedDir: true,
			when: (st) => !(st.items.omamori ?? 0),
			run: async (s) => {
				s.se("item");
				s.give("omamori");
				s.set("got_omamori");
				await s.narrate(
					"あぜ道に　お守りが　おちていた。\n……つくよみのお守り、と書いてある。",
				);
			},
		},
		sign("kura_sign", 3, 2, "『くら』\n村のものは　入らないこと。"),
	],
};
