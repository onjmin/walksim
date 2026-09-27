// 夕暮れの村（maps/village.ts）のマップチップ。
//
// 絵は自作チップ（public/assets/walksim/village.png。scripts/make-village-tiles.mjs）と、
// town.png の JP / TOWN（地面・土の道・用水路・橋・瓦屋根・板壁・引き戸）。
// 文字の意味（通れる・通れない・調べられる）は旧版（WOLF 風・フィールドのチップ）と同じまま、
// 古い山あいの村の絵に置き換えた：
//   :  あぜ道（土の道）   . ,  草地（, は草むら）   i  実った稲の田（通れない・counter）
//   ~  用水路   #  橋   T  かきの木   L  木の電柱   G  小さな石灯籠   U  つるべ井戸
//   n ^  瓦屋根（神社・母屋）   z Z  茅葺き屋根   ( )  白壁（真壁。上段・下段）   [ ]  板壁
//   w  格子窓（白壁の上段）   W  灯りの窓（白壁の下段）   m  テレビの光の窓（板壁の下段）
//   q  しまった引き戸（通れない）   d  蔵の戸（通れる。warp を置く）

import type { TileDef } from "../engine/defs";
import { DOOR, JP, TOWN, WALL } from "./tiles";

const VILLAGE_PNG = "pub:assets/walksim/village.png";
/** village.png の (c, r) マスから w×h マス。 */
export const village = (c: number, r: number, w = 1, h = 1): string =>
	`${VILLAGE_PNG}#${c * 16},${r * 16},${w * 16},${h * 16}`;

const PLASTER_UP = village(2, 0);
const PLASTER_LO = village(3, 0);
const C_GROUND = "#6a7a48";
const C_PLASTER = "#d6cebc";

/** イベントの絵（地蔵・看板・ほこら・田の白いもの・バス停）。 */
export const VILLAGE_SPR = {
	jizo: village(2, 1),
	jizoFallen: village(3, 1),
	oldSign: village(4, 1),
	tiltedSign: village(5, 1),
	hokora: village(6, 1),
	kunekune: village(7, 1),
	busStop: village(3, 2, 1, 2),
} as const;

export const VILLAGE: Record<string, TileDef> = {
	":": { layers: [JP.dirtPath], color: "#7a6a50", passable: true },
	".": { layers: [JP.ground], color: C_GROUND, passable: true },
	",": { layers: [JP.grassTuft], color: C_GROUND, passable: true },
	i: {
		layers: [village(7, 0)],
		color: "#6a7040",
		passable: false,
		counter: true,
	},
	"~": { layers: [JP.water], color: "#4a6a88", passable: false },
	"#": { layers: [JP.water, JP.bridgeV], color: "#8a8880", passable: true },
	T: { layers: [JP.ground, village(0, 1)], color: C_GROUND, passable: false },
	// 電柱は細いので裏が無い（TOWN の L と同じ）
	L: {
		layers: [JP.ground, village(0, 2, 1, 2)],
		color: C_GROUND,
		passable: false,
		thin: true,
	},
	G: { layers: [JP.ground, village(1, 1)], color: C_GROUND, passable: false },
	U: {
		layers: [JP.ground, village(1, 2, 1, 2)],
		color: C_GROUND,
		passable: false,
	},
	n: TOWN.n,
	"^": TOWN["^"],
	z: { layers: [village(0, 0)], color: "#8a7a58", passable: false },
	Z: { layers: [village(1, 0)], color: "#8a7a58", passable: false },
	"(": { layers: [PLASTER_UP], color: C_PLASTER, passable: false },
	")": { layers: [PLASTER_LO], color: C_PLASTER, passable: false },
	"[": TOWN["["],
	"]": TOWN["]"],
	w: {
		layers: [PLASTER_UP, village(4, 0)],
		color: C_PLASTER,
		passable: false,
	},
	W: {
		layers: [PLASTER_LO, village(5, 0)],
		color: C_PLASTER,
		passable: false,
	},
	m: {
		layers: [WALL.boardLo, village(6, 0)],
		color: "#5a4432",
		passable: false,
	},
	q: {
		layers: [PLASTER_LO, DOOR.sliding],
		color: C_PLASTER,
		passable: false,
	},
	d: {
		layers: [PLASTER_LO, village(2, 2, 1, 2)],
		color: C_PLASTER,
		passable: true,
	},
	" ": { layers: [], color: "#000", passable: false },
};
