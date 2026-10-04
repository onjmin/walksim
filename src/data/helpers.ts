// マップのイベントを書くための部品（扉・セーブ点・看板・人）。
// どのマップでも同じ見た目・同じ手触りになるよう、なるべくこれを使う。
// レコード・お守りなどの入手は、マップごとの専用スクリプトで書く（宝箱の共通部品は無い）。

import type { EventDef, Script } from "../engine/defs";
import type { Dir } from "../engine/types";
import { PROPS } from "./tiles";

/** イベントの見た目に使う置物（同梱チップシートの切り出し。ほかの候補は data/tiles.ts の PROPS）。 */
export const OBJ = {
	save: PROPS.crystalBall, // 水晶玉（記録の水晶。蓄音機の絵が入るまでの仮）
	sign: PROPS.sign, // 立て看板
	pc: PROPS.monitor, // 小さなモニター
	board: PROPS.board, // 掲示板（2マス幅）
	piano: PROPS.piano, // ピアノ（2マス幅）
} as const;

type WarpTo = { map: string; x: number; y: number; dir?: Dir };

/**
 * 乗ると別のマップへ移る床（扉・階段・マップの端）。見た目はタイル側に任せる。
 * se: "door" / "stairs" / "warp" など（省略時は無音）。
 */
export const warp = (
	id: string,
	x: number,
	y: number,
	to: WarpTo,
	opt: { se?: string; when?: EventDef["when"] } = {},
): EventDef => ({
	id,
	x,
	y,
	trigger: "touch",
	through: true,
	when: opt.when,
	// 踏みこむ向き＝着く向き（出入口の向きは そろえてある）。画面の 矢印に 使う
	exit: to.dir,
	run: async (s) => {
		await s.warp(to.map, to.x, to.y, to.dir, { se: opt.se });
	},
});

/** 横一列・縦一列に並んだ出口（マップの端など）をまとめて作る。 */
export const warpLine = (
	id: string,
	cells: [number, number][],
	to: (i: number) => WarpTo,
	opt: { se?: string; when?: EventDef["when"] } = {},
): EventDef[] => cells.map(([x, y], i) => warp(`${id}_${i}`, x, y, to(i), opt));

/** セーブ点（調べると記録できる）。 */
export const savePoint = (id: string, x: number, y: number): EventDef => ({
	id,
	x,
	y,
	sprite: OBJ.save,
	trigger: "talk",
	fixedDir: true,
	run: async (s) => {
		await s.saveMenu();
	},
});

/** 看板（調べると文が出る）。 */
export const sign = (
	id: string,
	x: number,
	y: number,
	text: string,
	sprite: string = OBJ.sign,
): EventDef => ({
	id,
	x,
	y,
	sprite,
	trigger: "talk",
	fixedDir: true,
	run: async (s) => {
		await s.say(null, text);
	},
});

/**
 * 話しかけられる人。
 * talk は「セリフの配列」（話者は who）か、自由なスクリプト。
 * who はキャラ ID（data/cast.ts）。名前だけ変えたいモブは name を渡す。
 */
export const npc = (
	id: string,
	x: number,
	y: number,
	sprite: string,
	talk: string[] | Script,
	opt: {
		who?: string;
		name?: string;
		dir?: Dir;
		wander?: boolean;
		when?: EventDef["when"];
	} = {},
): EventDef => ({
	id,
	x,
	y,
	sprite,
	dir: opt.dir ?? "down",
	trigger: "talk",
	wander: opt.wander,
	when: opt.when,
	run:
		typeof talk === "function"
			? talk
			: async (s) => {
					for (const line of talk)
						await s.say(opt.who ?? null, line, { name: opt.name });
				},
});
