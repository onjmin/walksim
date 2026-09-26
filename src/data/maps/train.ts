// TODO: 仮マップ（データの骨組み）。あとの段階（line: kisaragi 担当）が
// docs/content-briefs.md「line: train / kisaragi / tunnel / terminus」に沿って、
// このファイルごと完全に置き換える。
// 本実装: 14×6 の車内（眠る乗客・レイのアナウンス・タイムスタンプ演出）。
// いまは「乗る → きさらぎ駅で降りる」だけができる最小の車両。

import type { MapDef } from "../../engine/defs";
import { npc, warp } from "../helpers";
import { SPR } from "../sprites";
import { INDOOR } from "../tiles";

const rows = [
	"##########", // y0
	"#hhhhhhhh#", // y1
	"#.n.n.n.n#", // y2  座席。眠る乗客 (3,2)
	"D........D", // y3  西 (0,3) → hub ／ 東 (9,3) → kisaragi
	"##########", // y4
];

export const train: MapDef = {
	id: "train",
	name: "終電",
	bgm: null,
	outside: "#08070c",
	tiles: INDOOR,
	rows,
	events: [
		warp(
			"to_hub",
			0,
			3,
			{ map: "hub", x: 12, y: 6, dir: "left" },
			{ se: "door" },
		),
		warp(
			"to_kisaragi",
			9,
			3,
			{ map: "kisaragi", x: 10, y: 3, dir: "left" },
			{ se: "door" },
		),
		npc("sleeper", 3, 2, SPR.townsfolk, async (s) => {
			await s.narrate("（ふかく　ねむっている。\n起きる気配は　ない。）");
		}),
	],
};
