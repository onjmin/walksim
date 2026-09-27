// 地下・怪異の屋内の自作チップ（public/assets/walksim/underground.png。scripts/make-underground-tiles.mjs で作る。8列）。
// 旧版（WOLF 風チップ・CAVE / INDOOR の共用パレット）で描いていた4つのマップの絵を置き換える。
// 文字の意味（通れる・通れない・カウンター）はそれぞれのマップの旧版と同じまま。
//   YELLOW  … 黄色い部屋（yellow.ts）   KAKOLOG … 過去ログの地層（kakolog2.ts）
//   TUNNEL  … 伊佐貫トンネル（tunnel.ts） KURA    … 蔵のなか（kura.ts）
//   UG      … イベントの絵（レコード盤・懐中電灯・スレタイの札・貼り紙など）

import type { TileDef } from "../engine/defs";

const UG_PNG = "pub:assets/walksim/underground.png";
/** underground.png の (c, r) マスから w×h マス。 */
export const underground = (c: number, r: number, w = 1, h = 1): string =>
	`${UG_PNG}#${c * 16},${r * 16},${w * 16},${h * 16}`;

const floor = (color: string, ...layers: string[]): TileDef => ({
	layers,
	color,
	passable: true,
});
const solid = (color: string, ...layers: string[]): TileDef => ({
	layers,
	color,
	passable: false,
});
const BLACK: TileDef = { layers: [], color: "#000", passable: false };

/** イベントの絵（拾う物・しらべる物）。 */
export const UG = {
	record: underground(4, 1), // レコード盤（机・台の上）
	flashlight: underground(5, 1), // 懐中電灯
	placard: underground(6, 1), // スレタイの札（立て札）
	memo: underground(7, 1), // 杭に留めた貼り紙
	crt: underground(7, 2), // ブラウン管
	crtDesk: underground(6, 2, 1, 2), // お絵かき掲示板（台の上のブラウン管）
	kouji: underground(7, 3), // 工事中のバリケード
} as const;

// ───────────────── 黄色い部屋 ─────────────────
//   H h 壁紙（上段・下段）  u 隠し（壁紙の上段に見えるが通れる）  . カーペット  ; しめったカーペット
//   ~ 隠し部屋の赤いじゅうたん  D 扉（hub へ）  E 開かない扉（同じ絵）  Q ポスター  N はり紙
//   M 消えたモニター  V 自販機  t 事務机  n パイプいす  r 事務椅子（先客の席）  x 段ボール
const Y_CARPET = underground(0, 0);
const Y_WALL_UP = underground(3, 0);
const Y_WALL_LOW = underground(4, 0);
const C_Y_WALL = "#c8b872";
const C_Y_CARPET = "#a89868";

export const YELLOW: Record<string, TileDef> = {
	H: solid(C_Y_WALL, Y_WALL_UP),
	h: solid(C_Y_WALL, Y_WALL_LOW),
	".": floor(C_Y_CARPET, Y_CARPET),
	";": floor(C_Y_CARPET, underground(1, 0)),
	"~": floor("#7a3a30", underground(2, 0)),
	u: floor(C_Y_WALL, Y_WALL_UP),
	D: floor(C_Y_WALL, Y_WALL_LOW, underground(0, 2, 1, 2)),
	E: solid(C_Y_WALL, Y_WALL_LOW, underground(0, 2, 1, 2)),
	Q: solid(C_Y_WALL, Y_WALL_LOW, underground(5, 0)),
	N: solid(C_Y_WALL, Y_WALL_LOW, underground(6, 0)),
	M: solid(C_Y_WALL, Y_WALL_LOW, underground(7, 0)),
	V: solid(C_Y_WALL, Y_WALL_UP, underground(1, 2, 1, 2)),
	t: solid(C_Y_CARPET, Y_CARPET, underground(0, 1)),
	n: solid(C_Y_CARPET, Y_CARPET, underground(1, 1)),
	r: solid(C_Y_CARPET, Y_CARPET, underground(2, 1)),
	x: solid(C_Y_CARPET, Y_CARPET, underground(3, 1)),
	" ": BLACK,
};

// ───────────────── 過去ログの地層 ─────────────────
//   . 石の床（通路）  , 暗い床（くぼみ・紙くず）  > 下りの石段  ( 上りの階段（hub へ）  ~ 水たまり
//   m 奥の間の台座（通れる）  h 隠しすきま（外の黒と同じ色・通れる）
//   S s ログの大きな棚（左右）  B 目録カードの棚  t 閲覧机  x 段ボール  f 鉄の柵
//   [ = ] 食堂のカウンター（counter）  b おんちゃんの部屋の木の床  Z z ふとん（枕・すそ）
const K_FLOOR = underground(0, 4);
const K_DARK = underground(1, 4);
const K_WOOD = underground(7, 4);
const C_K_FLOOR = "#6e665a";
const C_K_SHELF = "#3a3226";
const C_K_WOOD = "#a47c52";
const onDark = (img: string): TileDef => solid(C_K_SHELF, K_DARK, img);

export const KAKOLOG: Record<string, TileDef> = {
	".": floor(C_K_FLOOR, K_FLOOR),
	",": floor(C_K_FLOOR, K_DARK),
	">": floor(C_K_FLOOR, underground(2, 4)),
	"(": floor(C_K_FLOOR, K_FLOOR, underground(5, 2, 1, 2)),
	"~": floor(C_K_FLOOR, underground(3, 4)),
	m: floor(C_K_FLOOR, K_DARK, underground(4, 4)),
	h: { layers: [], color: "#050408", passable: true },
	S: onDark(underground(2, 2, 1, 2)),
	s: onDark(underground(3, 2, 1, 2)),
	B: onDark(underground(4, 2, 1, 2)),
	t: onDark(underground(5, 4)),
	x: onDark(underground(3, 1)),
	f: onDark(underground(6, 4)),
	"[": { ...onDark(underground(0, 5)), counter: true },
	"=": { ...onDark(underground(1, 5)), counter: true },
	"]": { ...onDark(underground(2, 5)), counter: true },
	b: floor(C_K_WOOD, K_WOOD),
	Z: solid(C_K_WOOD, K_WOOD, underground(3, 5)),
	z: solid(C_K_WOOD, K_WOOD, underground(4, 5)),
	" ": BLACK,
};

// ───────────────── 伊佐貫トンネル ─────────────────
//   # 闇  W 巻きのレンガ  w 側壁（湿ったコンクリートとケーブル棚）  t 線路（枕木・砂利）
export const TUNNEL: Record<string, TileDef> = {
	"#": solid("#08070a"),
	W: solid("#4a3026", underground(5, 5)),
	w: solid("#56544e", underground(6, 5)),
	t: floor("#2e2620", underground(7, 5)),
	" ": BLACK,
};

// ───────────────── 蔵のなか ─────────────────
//   # 闇（梁の上）  H h 漆喰の壁（上段＝梁の下・下段＝板の腰壁）  . 古い床板
//   x 木箱（長持）  t 文机（帳面）  O 白い布の台  U 樽
const KURA_FLOOR = underground(0, 6);
const C_KURA = "#6c4c30";

export const KURA: Record<string, TileDef> = {
	"#": solid("#1b1410"),
	H: solid("#cfc6b0", underground(1, 6)),
	h: solid("#cfc6b0", underground(2, 6)),
	".": floor(C_KURA, KURA_FLOOR),
	x: solid(C_KURA, KURA_FLOOR, underground(3, 6)),
	t: solid(C_KURA, KURA_FLOOR, underground(4, 6)),
	O: solid(C_KURA, KURA_FLOOR, underground(5, 6)),
	U: solid(C_KURA, KURA_FLOOR, underground(6, 6)),
	" ": BLACK,
};
