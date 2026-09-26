// デバッグルーム（開発用。タイトルの「デバッグルーム」から来る。本編からは入れない）。
// 並んだ人に話しかけると、その場面の手前まで進めた状態（フラグ・大事なもの）に作りなおして、
// そこへ飛ぶ。フラグの並びは本編の s.set の順（各マップ）。本編の流れを変えたら、ここも合わせる。

import type { EventDef, GameState, MapDef, Story } from "../../engine/defs";
import type { Dir } from "../../engine/types";
import { npc, savePoint } from "../helpers";
import { SPR } from "../sprites";
import { INDOOR } from "../tiles";

type Flags = GameState["flags"];
type Items = GameState["items"];

/** once のイベントを見たことにする。 */
const done = (map: string, ...ids: string[]): Flags =>
	Object.fromEntries(ids.map((id) => [`done:${map}:${id}`, true]));

// 本編の区切りごとに立っているフラグ（前の区切りに足していく）
const AWAKE: Flags = {
	...done("room", "opening"),
	seen_door: true,
};
const REC3: Flags = {
	...AWAKE,
	...done("hub", "gate_open_ev"),
	seen_nemurin: true,
	got_rec_a: true,
	got_rec_b: true,
	got_rec_c: true,
	flashlight: true,
	got_omamori: true,
	gate_open: true,
};

const KEYS3: Items = {
	rec_a: 1,
	rec_b: 1,
	rec_c: 1,
	omamori: 1,
	flashlight: 1,
};

type Checkpoint = {
	id: string;
	/** 話しかけたときに出す見出し。 */
	label: string;
	sprite: string;
	flags: Flags;
	items: Items;
	to: { map: string; x: number; y: number; dir: Dir };
};

const CHECKPOINTS: Checkpoint[] = [
	{
		id: "cp_room",
		label: "はじまり（キリコの部屋）",
		sprite: "char:kiriko",
		flags: {},
		items: {},
		to: { map: "room", x: 2, y: 4, dir: "down" },
	},
	{
		id: "cp_hub",
		label: "回線の間（レコード0まい）",
		sprite: "char:nemurin",
		flags: AWAKE,
		items: {},
		to: { map: "hub", x: 4, y: 10, dir: "up" },
	},
	{
		id: "cp_yellow",
		label: "黄色い部屋",
		sprite: SPR.myaumyauA,
		flags: AWAKE,
		items: {},
		to: { map: "yellow", x: 4, y: 5, dir: "up" },
	},
	{
		id: "cp_village",
		label: "夕暮れの村",
		sprite: "char:tsukuyomi",
		flags: AWAKE,
		items: {},
		to: { map: "village", x: 4, y: 6, dir: "up" },
	},
	{
		id: "cp_kura",
		label: "蔵のなか（お守りあり）",
		sprite: SPR.myaumyauB,
		flags: { ...AWAKE, got_omamori: true },
		items: { omamori: 1 },
		to: { map: "kura", x: 3, y: 5, dir: "up" },
	},
	{
		id: "cp_kakolog",
		label: "過去ログの地層",
		sprite: "char:onchan",
		flags: AWAKE,
		items: {},
		to: { map: "kakolog2", x: 4, y: 6, dir: "up" },
	},
	{
		id: "cp_train",
		label: "終電（レコード3まい）",
		sprite: "char:rei",
		flags: REC3,
		items: KEYS3,
		to: { map: "train", x: 1, y: 3, dir: "right" },
	},
	{
		id: "cp_kisaragi",
		label: "きさらぎ駅",
		sprite: "char:oldman",
		flags: REC3,
		items: KEYS3,
		to: { map: "kisaragi", x: 10, y: 3, dir: "left" },
	},
	{
		id: "cp_tunnel",
		label: "伊佐貫トンネル",
		sprite: SPR.myaumyauC,
		flags: REC3,
		items: KEYS3,
		to: { map: "tunnel", x: 8, y: 3, dir: "left" },
	},
	{
		id: "cp_terminus",
		label: "供養スレ駅（レコード3まい）",
		sprite: "char:roze",
		flags: REC3,
		items: KEYS3,
		to: { map: "terminus", x: 12, y: 3, dir: "left" },
	},
];

/** その場面の手前まで進めた状態に作りなおして飛ぶ（いまの状態は捨てる）。 */
const jump =
	(cp: Checkpoint) =>
	async (s: Story): Promise<void> => {
		await s.narrate(`${cp.label}\nここへ　とびますか？`);
		const n = await s.choose(["とぶ", "やめる"], { cancel: 1 });
		if (n !== 0) return;
		s.state.flags = { ...cp.flags, debug: true };
		s.state.items = { ...cp.items };
		await s.warp(cp.to.map, cp.to.x, cp.to.y, cp.to.dir, { se: "warp" });
	};

/** 大事なものを配る。 */
const supply = async (s: Story): Promise<void> => {
	for (const id of ["rec_a", "rec_b", "rec_c", "omamori", "flashlight"])
		if (!s.has(id)) s.give(id);
	s.set("flashlight");
	s.se("item");
	await s.narrate("大事なものを　ぜんぶ　もらった。");
};

// 人の並び（x = 2, 4, 6, 8, 10 の2列）
const spots: [number, number][] = [
	[2, 2],
	[4, 2],
	[6, 2],
	[8, 2],
	[10, 2],
	[2, 5],
	[4, 5],
	[6, 5],
	[8, 5],
	[10, 5],
];

const events: EventDef[] = [
	...CHECKPOINTS.map((cp, i) =>
		npc(cp.id, spots[i][0], spots[i][1], cp.sprite, jump(cp)),
	),
	npc("dbg_items", 10, 8, "char:mujje", supply, { dir: "left" }),
	savePoint("dbg_save", 6, 8),
	// 八尺様の 16×32 グラの表示テスト（遠景専用キャラ。話しかけても「ぽ」だけ）
	{
		id: "dbg_hasshaku",
		x: 2,
		y: 8,
		sprite: "char:hasshaku",
		dir: "down",
		trigger: "talk",
		fixedDir: true,
		run: async (s) => {
			await s.say("hasshaku", "ぽ　ぽ　ぽ");
		},
	},
];

export const debug: MapDef = {
	id: "debug",
	name: "デバッグルーム",
	bgm: "title", // DESIGN §4（開発用なので聞き慣れた曲を流しておく）
	tiles: INDOOR,
	rows: [
		"#############",
		"#HHHHHHHHHHH#",
		"#...........#",
		"#...........#",
		"#...........#",
		"#...........#",
		"#...........#",
		"#...........#",
		"#...........#",
		"#...........#",
		"#############",
	],
	events,
};

/** タイトルから入るときの状態（場面を選ぶと作りなおす）。 */
export const debugStart = { mapId: "debug", x: 6, y: 9, dir: "up" as Dir };
