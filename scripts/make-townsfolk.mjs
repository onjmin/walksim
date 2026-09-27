// 町の人の歩行グラを作る（node scripts/make-townsfolk.mjs）。
//
//   public/sprites/mob_<種類>.png … 32x64（16x16 セル・2コマ×4方向。行は 後・右・前・左＝RPGEN 規格）
//
// これまで町の人は RPGEN の RPG 風の歩行グラ（戦士・商人・王女…）を流用していた（作者指摘で差し替え）。
// 現代の日本の町の人を、scripts/make-sprites.mjs の自作キャラと同じ絵柄（丸い頭の小さな体）で描く。
// 部品: 頭（髪型）・顔・服（上）・脚（ズボン／スカート）・小物（ランドセル・エプロン・ヘルメット・
// ネクタイ・杖・かばん・めがね）。色は くすんだ現実の色（ジオラマ表示で場面の色に置き換わる）。

import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { sprite, writeSheet } from "./lib/pixel.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "public/sprites");

const BASE = {
	K: "#1c1a20", // 輪郭・くつ
	s: "#f2d4bc", // 肌
	S: "#d4ae94",
	x: "#f4f2ec", // 白
	r: "#c03a34", // 赤（ランドセル・ネクタイ）
	R: "#8a2622",
	y: "#e0b830", // 黄（ヘルメット・帽子）
	Y: "#a8841c",
	g: "#8a8e94", // 灰（めがね・杖・かばんの金具）
};

const DIRS = ["up", "right", "down", "left"];

/**
 * 1コマ（16x16）を描く。o: { hair, long, bald, pants|skirt, extras } 。
 * 色は h/H（髪）・c/C（服）・p/P（脚）を PAL で与える。
 */
const frame = (s, ox, oy, dir, step, o) => {
	// コマの中の座標で描く（続けて呼んでもコマの位置がずれないよう、自分を返す）
	const P = {
		px: (x, y, c) => {
			s.px(ox + x, oy + y, c);
			return P;
		},
		rect: (x, y, w, h, c) => {
			s.rect(ox + x, oy + y, w, h, c);
			return P;
		},
	};
	const { px, rect } = P;
	const bob = step ? 1 : 0; // 足踏みで体が1ドット沈む
	// 脚（ズボンかスカート）とくつ
	const legY = 13;
	if (o.skirt) {
		rect(5, 11 + bob, 6, 2, "p");
		px(5, 12 + bob, "P");
	}
	const lx = [6, 9];
	lx.forEach((x, i) => {
		const up = step && i === (dir === "left" ? 1 : 0) ? 1 : 0;
		const lenY = 2 - up;
		rect(x, legY + bob, 1, lenY, o.skirt ? "s" : "p");
		px(x, legY + bob + lenY, "K");
		if (!o.skirt) {
			rect(x - (dir === "right" ? 0 : dir === "left" ? 1 : 0), legY + bob, 1, lenY, "p");
		}
	});
	// 体
	rect(4, 8 + bob, 8, 5, "c");
	rect(4, 12 + bob, 8, 1, "C");
	if (dir === "down") {
		px(3, 9 + bob, "c").px(12, 9 + bob, "c");
		px(3, 11 + bob, "s").px(12, 11 + bob, "s");
	} else if (dir === "up") {
		px(3, 9 + bob, "c").px(12, 9 + bob, "c");
		px(3, 11 + bob, "s").px(12, 11 + bob, "s");
	} else {
		const ax = dir === "right" ? 7 + (step ? 1 : 0) : 8 - (step ? 1 : 0);
		px(ax, 10 + bob, "C").px(ax, 11 + bob, "s");
	}
	// 頭
	const hy = 1 + bob;
	rect(4, hy, 8, 7, "h");
	rect(3, hy + 1, 10, 5, "h");
	if (o.bald) rect(5, hy, 6, 2, "s");
	if (dir === "down") {
		rect(4, hy + 3, 8, 4, "s");
		rect(3, hy + 3, 1, 2, "h").px(12, hy + 3, "h").px(12, hy + 4, "h");
		if (o.bald) rect(4, hy + 1, 8, 2, "s");
		px(6, hy + 5, "K").px(9, hy + 5, "K");
		if (o.glasses) rect(5, hy + 5, 6, 1, "g").px(6, hy + 5, "K").px(9, hy + 5, "K");
		if (o.long) rect(3, hy + 5, 1, 3, "h").px(12, hy + 5, "h").px(12, hy + 6, "h").px(12, hy + 7, "h");
	} else if (dir === "right") {
		rect(7, hy + 3, 5, 4, "s");
		px(10, hy + 5, "K");
		if (o.bald) rect(6, hy + 1, 6, 2, "s");
		if (o.glasses) px(11, hy + 5, "g").px(9, hy + 5, "g");
		if (o.long) rect(3, hy + 5, 3, 4, "h");
	} else if (dir === "left") {
		rect(4, hy + 3, 5, 4, "s");
		px(5, hy + 5, "K");
		if (o.bald) rect(4, hy + 1, 6, 2, "s");
		if (o.glasses) px(4, hy + 5, "g").px(6, hy + 5, "g");
		if (o.long) rect(10, hy + 5, 3, 4, "h");
	} else if (o.long) {
		rect(4, hy + 6, 8, 3, "h");
	}
	for (const f of o.extras ?? []) f({ px, rect, dir, step, bob, hy });
};

// ───────────────── 小物 ─────────────────

const randoseru = ({ rect, px, dir, bob }) => {
	if (dir === "up") rect(4, 8 + bob, 8, 5, "r"), rect(5, 9 + bob, 6, 1, "R");
	if (dir === "right") rect(3, 8 + bob, 3, 5, "r"), px(3, 12 + bob, "R");
	if (dir === "left") rect(10, 8 + bob, 3, 5, "r"), px(12, 12 + bob, "R");
	if (dir === "down") px(4, 8 + bob, "r").px(11, 8 + bob, "r");
};
const apron = ({ rect, dir, bob }) => {
	if (dir === "down") rect(5, 9 + bob, 6, 4, "x");
	if (dir === "right") rect(8, 9 + bob, 3, 4, "x");
	if (dir === "left") rect(5, 9 + bob, 3, 4, "x");
};
const tie = ({ px, dir, bob }) => {
	if (dir === "down") px(7, 8 + bob, "x").px(8, 8 + bob, "x").px(8, 9 + bob, "r").px(8, 10 + bob, "r").px(8, 11 + bob, "R");
};
const helmet = ({ rect, px, dir, hy }) => {
	rect(3, hy - 1, 10, 3, "y");
	rect(4, hy - 2, 8, 1, "y");
	if (dir === "down") rect(3, hy + 2, 10, 1, "Y");
	if (dir === "right") rect(8, hy + 2, 5, 1, "Y");
	if (dir === "left") rect(3, hy + 2, 5, 1, "Y");
	px(7, hy - 1, "x");
};
const cane = ({ rect, px, dir, bob }) => {
	const x = dir === "left" ? 2 : 13;
	if (dir !== "up") rect(x, 9 + bob, 1, 6, "g"), px(dir === "left" ? 3 : 12, 9 + bob, "g");
};
const bag = ({ rect, dir, bob }) => {
	if (dir === "down") rect(12, 10 + bob, 3, 3, "K");
	if (dir === "right") rect(5, 10 + bob, 3, 3, "K");
	if (dir === "left") rect(8, 10 + bob, 3, 3, "K");
};
const shopBag = ({ rect, dir, bob }) => {
	if (dir === "down") rect(1, 10 + bob, 3, 4, "x");
	if (dir === "right") rect(9, 10 + bob, 3, 4, "x");
	if (dir === "left") rect(4, 10 + bob, 3, 4, "x");
};
const cap = ({ rect, dir, hy }) => {
	rect(4, hy - 1, 8, 2, "c");
	if (dir === "down") rect(4, hy + 1, 8, 1, "C");
	if (dir === "right") rect(10, hy + 1, 4, 1, "C");
	if (dir === "left") rect(2, hy + 1, 4, 1, "C");
};
const collar = ({ px, dir, bob }) => {
	if (dir === "down") px(6, 8 + bob, "x").px(9, 8 + bob, "x").px(7, 8 + bob, "r").px(8, 8 + bob, "r");
};

// ───────────────── 町の人 ─────────────────

const MOBS = {
	// 小学生（ランドセル・黄色い帽子）
	child: [{ h: "#3a2a22", H: "#2a1a14", c: "#5a86c0", C: "#3a5e90", p: "#2a3040", P: "#1a2030" }, { extras: [randoseru, cap] }],
	// 主婦（エプロン・買いもの袋）
	mama: [{ h: "#5a3a2a", H: "#3a2418", c: "#c07a7a", C: "#8e5656", p: "#5a5a6a", P: "#3a3a4a" }, { long: true, extras: [apron, shopBag] }],
	// 会社員（紺のスーツ・ネクタイ・かばん）
	salaryman: [{ h: "#22222a", H: "#14141a", c: "#2e3a5a", C: "#1e2840", p: "#2e3a5a", P: "#1e2840" }, { extras: [tie, bag] }],
	// おばあちゃん（白髪・紫のカーディガン・スカート）
	obaachan: [{ h: "#c8c8c8", H: "#a0a0a0", c: "#7a5a8a", C: "#5a3e6a", p: "#5a4a40", P: "#3a2e28" }, { skirt: true, glasses: true }],
	// おじいちゃん（はげ頭・杖・茶色の上着）
	ojiichan: [{ h: "#b0b0aa", H: "#8a8a84", c: "#7a6a4a", C: "#5a4c34", p: "#4a4a44", P: "#34342e" }, { bald: true, extras: [cane] }],
	// 高校生（セーラー服）
	student: [{ h: "#2a1e1a", H: "#1a100c", c: "#2a3450", C: "#1a2238", p: "#2a3450", P: "#1a2238" }, { long: true, skirt: true, extras: [collar, bag] }],
	// 普段着のおじさん（ポロシャツ）
	man: [{ h: "#2e2a26", H: "#1e1a16", c: "#6a8a6a", C: "#4a6a4a", p: "#6a5a44", P: "#4a3e2e" }, {}],
	// 作業員（ヘルメット・作業着）
	worker: [{ h: "#2e2a26", H: "#1e1a16", c: "#5a6a7a", C: "#3e4c5a", p: "#5a6a7a", P: "#3e4c5a" }, { extras: [helmet] }],
	// 店のおばちゃん（パーマ・割烹着）
	obachan: [{ h: "#4a3a3a", H: "#2e2222", c: "#e8e4dc", C: "#c0bcb4", p: "#6a5a6a", P: "#4a3e4a" }, { glasses: true }],
	// 店主（前かけ・はちまき色の帽子）
	shopkeeper: [{ h: "#2a2622", H: "#1a1612", c: "#8a8a80", C: "#6a6a60", p: "#3a4a6a", P: "#2a3450" }, { extras: [apron] }],
	// 会社勤めの女性（ブラウス・スカート・かばん）
	ol: [{ h: "#3a2a22", H: "#241812", c: "#e8e4ec", C: "#c0bcc8", p: "#3a3a4a", P: "#26263a" }, { long: true, skirt: true, extras: [bag] }],
};

for (const [name, [colors, o]] of Object.entries(MOBS)) {
	const s = sprite(32, 64);
	DIRS.forEach((dir, row) => {
		for (let f = 0; f < 2; f++) frame(s, f * 16, row * 16, dir, f, o);
	});
	// 各コマの外側に輪郭（コマの境をまたがないよう、コマごとに）
	const out = sprite(32, 64);
	for (let row = 0; row < 4; row++)
		for (let f = 0; f < 2; f++) {
			const cell = sprite(16, 16);
			for (let y = 0; y < 16; y++)
				for (let x = 0; x < 16; x++) cell.cells[y][x] = s.cells[row * 16 + y][f * 16 + x];
			cell.outline("K");
			for (let y = 0; y < 16; y++)
				for (let x = 0; x < 16; x++) out.cells[row * 16 + y][f * 16 + x] = cell.cells[y][x];
		}
	const pal = { ...BASE, ...colors };
	console.log(`mob_${name}.png ${writeSheet(join(OUT, `mob_${name}.png`), [[0, 0, out]], pal, 2, 4)}`);
}
