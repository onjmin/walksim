// TODO: 仮マップ（データの骨組み）。あとの段階（line: kisaragi 担当）が
// docs/content-briefs.md「line: train / kisaragi / tunnel / terminus」に沿って、
// このファイルごと完全に置き換える。
// 本実装: 30×12 の横長（無人ホーム→線路歩き・レイのアナウンス・太鼓と鈴・片足の老人・目撃③）。
// いまは「降りる → 西のトンネルへ歩く」だけができる最小のホーム。

import type { MapDef } from "../../engine/defs";
import { sign, warp } from "../helpers";
import { TOWN } from "../tiles";

const rows = [
	"            ", // y0
	" .L......L. ", // y1  街灯
	" .......... ", // y2
	"............", // y3  西 (0,3) → tunnel ／ 東 (11,3) → train
	" .......... ", // y4  駅名標 (2,4)
	"            ", // y5
];

export const kisaragi: MapDef = {
	id: "kisaragi",
	name: "きさらぎ駅",
	bgm: null,
	ambient: { kind: "static" },
	outside: "#000",
	tiles: TOWN,
	rows,
	events: [
		warp(
			"to_train",
			11,
			3,
			{ map: "train", x: 8, y: 3, dir: "left" },
			{ se: "door" },
		),
		warp("to_tunnel", 0, 3, { map: "tunnel", x: 8, y: 3, dir: "left" }),
		sign("ekimei", 2, 4, "駅名標。……『きさらぎ』。\nきいたことのない　駅だ。"),
	],
};
