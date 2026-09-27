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

// 本編の区切りごとに立っているフラグ（前の区切りに足していく）。
// tod は時間帯システム（DESIGN §4）: 夢パートは "shinya"
const AWAKE: Flags = {
	...done("room", "opening"),
	seen_door: true,
	tod: "shinya",
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
	// 日常レイヤー（開始は street の夕方。data/index.ts の start と同じ）
	{
		id: "cp_street_yu",
		label: "はじまり（まちのどおり・夕方）",
		sprite: "pub:sprites/mob_shopkeeper.png",
		flags: { tod: "yu" },
		items: {},
		to: { map: "street", x: 24, y: 10, dir: "left" },
	},
	{
		id: "cp_apart",
		label: "アパートの廊下（夕方）",
		sprite: SPR.woman,
		flags: { tod: "yu", got_dinner_onigiri: true },
		items: {},
		to: { map: "apart", x: 10, y: 5, dir: "left" },
	},
	{
		id: "cp_room",
		label: "キリコの部屋（深夜2:00）",
		sprite: "char:kiriko",
		flags: { tod: "shinya" },
		items: {},
		to: { map: "room", x: 2, y: 4, dir: "down" },
	},
	{
		id: "cp_street_shinya",
		label: "まちのどおり（深夜2:00）",
		sprite: SPR.townsfolk,
		flags: { ...AWAKE, got_dinner_onigiri: true },
		items: {},
		to: { map: "street", x: 2, y: 10, dir: "down" },
	},
	// 日常の町 拡張（座標凍結v3 の着地座標に飛ぶ。content-briefs「日常の町 拡張」）
	{
		id: "cp_sumire_yu",
		label: "すみれ町（夕方）",
		sprite: "pub:sprites/mob_child.png",
		flags: { tod: "yu" },
		items: {},
		to: { map: "sumire", x: 37, y: 3, dir: "left" },
	},
	{
		id: "cp_kawara_yu",
		label: "かわらのみち（夕方）",
		sprite: "pub:sprites/mob_ojiichan.png",
		flags: { tod: "yu" },
		items: {},
		to: { map: "kawara", x: 5, y: 2, dir: "down" },
	},
	{
		id: "cp_danchi_shinya",
		label: "すみれ台団地（深夜2:00）",
		sprite: "pub:sprites/mob_ol.png",
		flags: { ...AWAKE, got_dinner_onigiri: true },
		items: {},
		to: { map: "danchi", x: 30, y: 12, dir: "left" },
	},
	{
		id: "cp_kokudo_shinya",
		label: "こくどう（深夜2:00）",
		sprite: "pub:sprites/mob_salaryman.png",
		flags: { ...AWAKE, got_dinner_onigiri: true },
		items: {},
		to: { map: "kokudo", x: 38, y: 10, dir: "left" },
	},
	{
		id: "cp_ekimae_yu",
		label: "えきまえ（夕方）",
		sprite: "pub:sprites/mob_obachan.png",
		flags: { tod: "yu" },
		items: {},
		to: { map: "ekimae", x: 30, y: 9, dir: "left" },
	},
	{
		id: "cp_tonarimachi_yu",
		label: "となりまち（夕方）",
		sprite: "pub:sprites/mob_shopkeeper.png",
		flags: { tod: "yu", got_dinner_onigiri: true },
		items: {},
		to: { map: "tonarimachi", x: 3, y: 10, dir: "right" },
	},
	{
		id: "cp_hub",
		label: "回線の間（レコード0まい）",
		sprite: "char:nemurin",
		flags: AWAKE,
		items: {},
		to: { map: "hub", x: 10, y: 12, dir: "up" },
	},
	{
		id: "cp_yellow",
		label: "黄色い部屋",
		sprite: SPR.myaumyauA,
		flags: AWAKE,
		items: {},
		to: { map: "yellow", x: 3, y: 2, dir: "down" },
	},
	{
		id: "cp_village",
		label: "夕暮れの村",
		sprite: "char:tsukuyomi",
		flags: AWAKE,
		items: {},
		to: { map: "village", x: 3, y: 2, dir: "down" },
	},
	{
		id: "cp_kura",
		label: "蔵のなか（お守りあり）",
		sprite: SPR.myaumyauB,
		flags: { ...AWAKE, got_omamori: true },
		items: { omamori: 1 },
		to: { map: "kura", x: 4, y: 6, dir: "up" },
	},
	{
		id: "cp_kakolog",
		label: "過去ログの地層",
		sprite: "char:onchan",
		flags: AWAKE,
		items: {},
		to: { map: "kakolog2", x: 3, y: 2, dir: "down" },
	},
	{
		id: "cp_train",
		label: "終電（レコード3まい）",
		sprite: "char:rei",
		flags: REC3,
		items: KEYS3,
		to: { map: "train", x: 2, y: 3, dir: "right" },
	},
	{
		id: "cp_kisaragi",
		label: "きさらぎ駅",
		sprite: "char:oldman",
		flags: REC3,
		items: KEYS3,
		to: { map: "kisaragi", x: 4, y: 4, dir: "down" },
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
		to: { map: "terminus", x: 13, y: 5, dir: "left" },
	},
	// 地続きの拡張（2026-09-28）の新しい地区
	{
		id: "cp_senro_yu",
		label: "せんろぞいのみち（夕方）",
		sprite: SPR.woman,
		flags: { tod: "yu" },
		items: {},
		to: { map: "senro", x: 42, y: 7, dir: "left" },
	},
	{
		id: "cp_koen_yu",
		label: "みどりがおか公園（夕方）",
		sprite: "pub:sprites/mob_ojiichan.png",
		flags: { tod: "yu" },
		items: {},
		to: { map: "koen", x: 20, y: 22, dir: "up" },
	},
	{
		id: "cp_yamamichi_shinya",
		label: "やまみち（深夜・峠のてまえ）",
		sprite: "pub:sprites/mob_ojiichan.png",
		flags: AWAKE,
		items: {},
		to: { map: "yamamichi", x: 4, y: 1, dir: "down" },
	},
	// 夜明けの うみべ（終点から線路を歩いて出てきたところ。ending_ready は terminus が立てる）
	{
		id: "cp_umi_asa",
		label: "うみべ（朝・終点から歩いて出てきた）",
		sprite: "pub:sprites/mob_ojiichan.png",
		flags: {
			...REC3,
			tod: "asa",
			ending_ready: true,
			clear: true,
			ending_seen: true,
			seen_kaeri: "walk",
		},
		items: KEYS3,
		to: { map: "umi", x: 42, y: 17, dir: "left" },
	},
	// 朝のまちのどおり（エンディングは東端の囲いの手前。ending_ready は terminus が立てる）
	{
		id: "cp_street_asa",
		label: "まちのどおり（朝・エンディング）",
		sprite: "pub:sprites/mob_worker.png",
		flags: {
			...REC3,
			tod: "asa",
			ending_ready: true,
			seen_kaeri: "walk",
			got_dinner_onigiri: true,
		},
		items: KEYS3,
		to: { map: "street", x: 2, y: 10, dir: "right" },
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
		// tod は set でも入れ直す（値は同じ。validate の2周目が時間帯の分岐を通れるように）
		const tod = cp.flags.tod;
		if (typeof tod === "string") s.set("tod", tod);
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

// 人の並び（x = 2〜14 の偶数 × 3行。チェックポイントが増えたら行を足す）
const spots: [number, number][] = [
	[2, 2],
	[4, 2],
	[6, 2],
	[8, 2],
	[10, 2],
	[12, 2],
	[14, 2],
	[2, 4],
	[4, 4],
	[6, 4],
	[8, 4],
	[10, 4],
	[12, 4],
	[14, 4],
	[2, 6],
	[4, 6],
	[6, 6],
	[8, 6],
	[10, 6],
	[12, 6],
	[14, 6],
	[4, 8],
	[8, 8],
	[12, 8],
	[14, 8],
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
		"#################",
		"#HHHHHHHHHHHHHHH#",
		"#...............#",
		"#...............#",
		"#...............#",
		"#...............#",
		"#...............#",
		"#...............#",
		"#...............#",
		"#...............#",
		"#################",
	],
	events,
};

/** タイトルから入るときの状態（場面を選ぶと作りなおす）。 */
export const debugStart = { mapId: "debug", x: 6, y: 9, dir: "up" as Dir };
