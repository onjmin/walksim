// TODO: 仮マップ（データの骨組み）。あとの段階（line: kisaragi 担当）が
// docs/content-briefs.md「line: train / kisaragi / tunnel / terminus」に沿って、
// このファイルごと完全に置き換える。
// 本実装: 24×6・dark 0.85 の一本道（中間で照明が一瞬消える演出・壁の落書き）。
// いまは西へ抜けるだけの最小のトンネル。

import type { MapDef } from "../../engine/defs";
import { warp } from "../helpers";
import { CAVE } from "../tiles";

const rows = [
	"##########", // y0
	"#WWWWWWWW#", // y1
	"#wwwwwwww#", // y2
	"..........", // y3  西 (0,3) → terminus ／ 東 (9,3) → kisaragi
	"##########", // y4
];

export const tunnel: MapDef = {
	id: "tunnel",
	name: "伊佐貫トンネル",
	bgm: null,
	dark: 0.85,
	outside: "#000",
	tiles: CAVE,
	rows,
	events: [
		warp("to_kisaragi", 9, 3, { map: "kisaragi", x: 1, y: 3, dir: "right" }),
		warp("to_terminus", 0, 3, { map: "terminus", x: 12, y: 3, dir: "left" }),
	],
};
