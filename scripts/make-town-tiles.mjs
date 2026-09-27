// 自作のマップチップ（屋外の町）を作る（node scripts/make-town-tiles.mjs）。
//
//   public/assets/walksim/town.png … 16px チップのシート（8列）。data/tiles.ts の town(c, r) で切り出す
//
// data/tiles.ts の TOWN（屋外の地区すべてが使う文字の割り当て）の絵を、日本の郊外の住宅街に置き換える。
// 文字の意味（通れる・通れない・何の絵か）は変えない：瓦屋根・トタン屋根・サイディングの家・
// 板張りの古い家・商店のモルタル壁と看板・アルミサッシの窓・自販機・電柱の街灯・生けがき・網フェンス。
// ジオラマ表示（?diorama）は色を場面パレットに置き換えるので、大事なのは形と明るさの段差。
// 物（地と壁以外）には1画素の輪郭をつける（make-home-tiles.mjs と同じ理由）。

import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { hash, sprite, writeSheet } from "./lib/pixel.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "public/assets/walksim");

const PAL = {
	K: "#1c1816", // 輪郭
	// アスファルト
	t: "#4a4a4e",
	T: "#3e3e42",
	1: "#58585c",
	// 歩道・路地のコンクリート平板
	o: "#9a9890",
	O: "#86847c",
	j: "#aaa8a0",
	J: "#72706a",
	// 地面（草と土）
	g: "#6a7a48",
	G: "#58683a",
	h: "#7a8a56",
	u: "#7a6a50",
	U: "#685a44",
	// 瓦屋根
	r: "#4e5660",
	R: "#3c434c",
	2: "#646d78",
	// トタン屋根
	b: "#4a6478",
	B: "#3a5062",
	3: "#5e7a90",
	// 茶色のスレート屋根
	n: "#7a5238",
	N: "#603e2a",
	4: "#8e6446",
	// サイディング（白い家）
	w: "#d8d4c8",
	W: "#bcb8ac",
	5: "#a09c90",
	// 板張り（古い家）
	k: "#5a4432",
	6: "#483626",
	7: "#6c5440",
	// 商店のモルタル壁・タイル
	s: "#c8b8a0",
	S: "#b0a088",
	8: "#98886e",
	// 看板の地
	v: "#3a3e48",
	V: "#2a2e36",
	// 基礎
	c: "#8a8880",
	C: "#74726a",
	// ガラス・サッシ
	q: "#2a3444",
	Q: "#3a4a60",
	m: "#8aa0b8",
	a: "#b8bcc0",
	A: "#8a8e94",
	// 扉
	e: "#6a4a34",
	E: "#54382a",
	// 葉
	f: "#4e7a4e",
	F: "#3a5e3a",
	l: "#6a9a5a",
	// 花・白・赤
	y: "#d8c060",
	p: "#e0a0b0",
	x: "#f0eee4",
	z: "#b84040",
	Z: "#8e3030",
	// 自販機
	i: "#e8e8e4",
	I: "#c8c8c4",
	L: "#f4f0d0",
	// 金属の柱・灯り
	9: "#7a7e84",
	0: "#5a5e64",
	Y: "#fff0b0",
	// 水
	H: "#4a6a88",
	X: "#6a8aa8",
};

/** 16×16 を ch の地で塗り、ノイズで点を散らす。 */
const noise = (base, spots, seed) => {
	const s = sprite();
	for (let y = 0; y < 16; y++)
		for (let x = 0; x < 16; x++) {
			let c = base;
			const r = hash(x, y, seed);
			let acc = 0;
			for (const [ch, p] of spots) {
				acc += p;
				if (r < acc) {
					c = ch;
					break;
				}
			}
			s.px(x, y, c);
		}
	return s;
};

// ───────────────── 地 ─────────────────

/** 歩道・路地：8画素角のコンクリート平板。 */
const pave = () => {
	const s = noise("o", [
		["O", 0.06],
		["j", 0.05],
	], 21);
	s.hline(0, 0, 16, "O").hline(0, 8, 16, "O");
	s.vline(0, 0, 16, "O").vline(8, 0, 8, "O").vline(4, 8, 8, "O").vline(12, 8, 8, "O");
	return s;
};

/** 車道：アスファルト。 */
const asphalt = () =>
	noise("t", [
		["T", 0.12],
		["1", 0.08],
	], 22);

/** 地面：短い草と、ところどころの土。 */
const ground = () => {
	const s = noise("g", [
		["G", 0.14],
		["h", 0.08],
		["u", 0.03],
	], 23);
	s.rect(10, 3, 3, 2, "u").px(11, 5, "U").px(3, 11, "u").px(4, 11, "U");
	return s;
};

/** 屋根の本体：横に並ぶ瓦（半円の段）／トタン（縦の波）／スレート（ずらした板）。 */
const roof = (kind, part) => {
	const s = sprite();
	const [c, d, hl] = { kawara: ["r", "R", "2"], tin: ["b", "B", "3"], slate: ["n", "N", "4"] }[
		kind
	];
	for (let y = 0; y < 16; y++)
		for (let x = 0; x < 16; x++) {
			let ch = c;
			if (kind === "kawara") {
				// 4画素の段ごとに、瓦の丸み（上端が明るく下端が暗い）
				const yy = y % 4;
				const xx = (x + (Math.floor(y / 4) % 2) * 2) % 4;
				if (yy === 3) ch = d;
				else if (yy === 0 && xx !== 0) ch = hl;
				else if (xx === 0) ch = d;
			} else if (kind === "tin") {
				ch = x % 3 === 0 ? hl : x % 3 === 2 ? d : c;
			} else {
				const yy = y % 4;
				const xx = (x + (Math.floor(y / 4) % 2) * 4) % 8;
				if (yy === 3) ch = d;
				else if (xx === 0) ch = d;
				else if (hash(x, y, 24) < 0.1) ch = hl;
			}
			s.px(x, y, ch);
		}
	if (part === "eave") {
		// 軒先：屋根の終わりの縁と、その下の影
		s.rect(0, 11, 16, 2, hl);
		s.rect(0, 13, 16, 3, "K");
		s.hline(0, 13, 16, d);
	}
	return s;
};

/** 商店の上の壁（モルタル）。 */
const mortarUpper = () => {
	const s = noise("s", [["S", 0.07]], 25);
	s.hline(0, 0, 16, "8");
	return s;
};

/** 商店の下の壁（小さなタイル張り・腰に暗い帯）。 */
const tileLower = () => {
	const s = sprite();
	for (let y = 0; y < 16; y++)
		for (let x = 0; x < 16; x++) s.px(x, y, x % 4 === 0 || y % 4 === 0 ? "S" : "s");
	s.rect(0, 12, 16, 4, "8").hline(0, 12, 16, "C");
	return s;
};

/** サイディング（横の筋）。lower は基礎つき。 */
const siding = (part) => {
	const s = sprite();
	for (let y = 0; y < 16; y++)
		for (let x = 0; x < 16; x++) s.px(x, y, y % 4 === 3 ? "W" : "w");
	if (part === "upper") s.hline(0, 0, 16, "5");
	else s.rect(0, 12, 16, 4, "c").hline(0, 12, 16, "C").hline(0, 15, 16, "C");
	return s;
};

/** 板張り（縦の板）。lower は基礎つき。 */
const boards = (part) => {
	const s = sprite();
	for (let y = 0; y < 16; y++)
		for (let x = 0; x < 16; x++) {
			let ch = x % 4 === 0 ? "6" : "k";
			if (x % 4 === 2 && hash(x, y, 26) < 0.3) ch = "7";
			s.px(x, y, ch);
		}
	if (part === "upper") s.hline(0, 0, 16, "6");
	else s.rect(0, 12, 16, 4, "c").hline(0, 12, 16, "C").hline(0, 15, 16, "C");
	return s;
};

// ───────────────── 壁のもの ─────────────────

/** アルミサッシの窓（夜。カーテンごしの暗いガラス）。grille で面格子。 */
const sash = (grille) => {
	const s = sprite();
	s.rect(2, 3, 12, 10, "A");
	s.rect(3, 4, 10, 8, "q");
	s.vline(8, 4, 8, "A");
	s.rect(3, 4, 4, 3, "Q").px(4, 5, "m");
	s.hline(2, 13, 12, "a");
	if (grille) for (let x = 4; x < 13; x += 2) s.vline(x, 3, 10, "a");
	return s;
};

/** 商店のガラス戸（16x32。下の壁に重ね、上は上の壁に食い込む）。 */
const shopDoor = () => {
	const s = sprite(16, 32);
	s.rect(1, 10, 14, 22, "A");
	s.rect(2, 11, 12, 20, "q");
	s.vline(8, 11, 20, "A");
	s.rect(3, 12, 4, 6, "Q").px(4, 13, "m").px(5, 14, "m");
	s.rect(2, 7, 12, 3, "v").hline(3, 8, 10, "x");
	s.hline(1, 31, 14, "C");
	return s;
};

/** 民家の玄関ドア（16x32）。 */
const houseDoor = () => {
	const s = sprite(16, 32);
	s.rect(2, 10, 12, 21, "e");
	s.rect(3, 11, 10, 19, "E");
	s.rect(4, 12, 8, 8, "e").rect(4, 21, 8, 8, "e");
	s.vline(6, 13, 5, "q");
	s.px(11, 20, "y");
	s.rect(1, 8, 14, 2, "c");
	s.hline(1, 31, 14, "C");
	return s;
};

/** 引き戸（格子。古い家）。 */
const slidingDoor = () => {
	const s = sprite(16, 32);
	s.rect(1, 10, 14, 21, "6");
	s.rect(2, 11, 12, 19, "7");
	for (let x = 3; x < 14; x += 2) s.vline(x, 11, 12, "6");
	for (let y = 13; y < 23; y += 3) s.hline(2, y, 12, "6");
	s.rect(2, 23, 12, 7, "k");
	s.vline(8, 11, 19, "6");
	s.hline(1, 31, 14, "C");
	return s;
};

/** 看板（横長の箱看板）。 */
const signBoard = () => {
	const s = sprite();
	s.rect(1, 3, 14, 9, "v").hline(1, 3, 14, "a").hline(1, 11, 14, "V");
	s.hline(3, 6, 4, "x").hline(8, 6, 5, "x").hline(4, 8, 7, "y");
	return s;
};

/** 縦看板（袖看板）。 */
const signVertical = () => {
	const s = sprite();
	s.hline(4, 1, 2, "9");
	s.rect(6, 0, 6, 15, "z").vline(6, 0, 15, "Z");
	for (let y = 2; y < 14; y += 3) s.hline(8, y, 3, "x");
	return s;
};

/** 薬・医院の看板（緑の十字）。 */
const signCross = () => {
	const s = sprite();
	s.rect(3, 2, 10, 10, "x").hline(3, 11, 10, "I");
	s.rect(7, 3, 2, 8, "f").rect(4, 6, 8, 2, "f");
	return s;
};

// ───────────────── 置き物 ─────────────────

/** 生けがき。 */
const hedge = () => {
	const s = sprite();
	for (let y = 4; y < 15; y++)
		for (let x = 0; x < 16; x++) {
			const r = hash(x, y, 27);
			s.px(x, y, y < 6 ? (r < 0.5 ? "l" : "f") : r < 0.25 ? "F" : r > 0.85 ? "l" : "f");
		}
	for (let x = 0; x < 16; x++) if (hash(x, 3, 28) < 0.5) s.px(x, 3, "f");
	s.hline(0, 15, 16, "F");
	return s;
};

/** 網フェンス。 */
const fence = () => {
	const s = sprite();
	s.vline(1, 2, 13, "0").vline(14, 2, 13, "0");
	s.hline(1, 2, 14, "9");
	for (let y = 3; y < 14; y++)
		for (let x = 2; x < 14; x++) if ((x + y) % 3 === 0 || (x - y + 30) % 3 === 0) s.px(x, y, "A");
	s.hline(0, 14, 16, "J");
	return s;
};

/** 花（雑草の花／花壇）。 */
const flowers = (c1, c2) => {
	const s = sprite();
	const spots = [
		[3, 7],
		[7, 5],
		[11, 8],
		[5, 11],
		[10, 12],
	];
	for (const [x, y] of spots) {
		s.px(x, y + 1, "F").px(x, y + 2, "F").px(x - 1, y + 2, "f");
		s.px(x, y, c1).px(x - 1, y, c2).px(x + 1, y, c2).px(x, y - 1, c2);
	}
	return s;
};

/** 植木鉢。 */
const pot = () => {
	const s = sprite();
	s.rect(5, 9, 6, 5, "n").hline(4, 9, 8, "4").hline(6, 14, 4, "N");
	s.art(4, 3, ["..fl.f..", ".flfFlf.", "fFlffFf.", ".fFfl...", "..F....."]);
	return s;
};

/** 植え込みの木（16x32）。 */
const pottedTree = () => {
	const s = sprite(16, 32);
	s.rect(4, 24, 8, 6, "c").hline(3, 24, 10, "j").hline(4, 30, 8, "C");
	s.vline(7, 14, 10, "6").vline(8, 16, 8, "k");
	for (let y = 2; y < 17; y++)
		for (let x = 2; x < 14; x++) {
			const dx = x - 7.5;
			const dy = y - 9;
			if (dx * dx + dy * dy * 1.2 < 36) {
				const r = hash(x, y, 29);
				s.px(x, y, dy < -2 && r < 0.5 ? "l" : r < 0.3 ? "F" : "f");
			}
		}
	return s;
};

/** 街路樹・庭木（32x32。上の層に描く）。 */
const tree = () => {
	const s = sprite(32, 32);
	s.rect(14, 22, 4, 9, "6").vline(15, 22, 9, "k");
	s.hline(11, 31, 10, "U");
	for (let y = 1; y < 25; y++)
		for (let x = 2; x < 30; x++) {
			const dx = x - 15.5;
			const dy = y - 12;
			const d = dx * dx + dy * dy * 1.3;
			if (d < 190 - hash(x, y, 30) * 40) {
				const r = hash(x, y, 31);
				let ch = r < 0.3 ? "F" : "f";
				if (dy < -4 && dx < 4 && r < 0.45) ch = "l";
				if (dy > 5 && r < 0.6) ch = "F";
				s.px(x, y, ch);
			}
		}
	return s;
};

/** 小さな池の噴水（48x48）。 */
const pond = () => {
	const s = sprite(48, 48);
	for (let y = 0; y < 48; y++)
		for (let x = 0; x < 48; x++) {
			const dx = x - 23.5;
			const dy = y - 24;
			const d = Math.sqrt(dx * dx + dy * dy * 1.4);
			if (d < 22) s.px(x, y, d > 19 ? "c" : d > 18 ? "C" : hash(x, y, 32) < 0.1 ? "X" : "H");
		}
	s.rect(21, 16, 6, 10, "c").hline(21, 16, 6, "j").rect(22, 11, 4, 5, "X").px(23, 9, "m").px(24, 10, "m");
	return s;
};

/** 水のみ場。 */
const drinkingFountain = () => {
	const s = sprite();
	s.rect(5, 6, 6, 8, "c").vline(5, 6, 8, "C").hline(5, 6, 6, "j");
	s.rect(4, 4, 8, 3, "j").rect(6, 5, 4, 1, "H");
	s.px(8, 3, "9");
	s.hline(5, 14, 6, "C");
	return s;
};

/** ビールケース（黄色いプラスチックに瓶）。 */
const crate = () => {
	const s = sprite();
	s.rect(2, 6, 12, 8, "y").hline(2, 6, 12, "L");
	for (let x = 4; x < 13; x += 3) s.vline(x, 8, 5, "Y");
	s.rect(3, 3, 2, 3, "n").rect(6, 2, 2, 4, "n").rect(9, 3, 2, 3, "n");
	s.hline(2, 14, 12, "U");
	return s;
};

/** 立て看板（A型）。 */
const aSign = () => {
	const s = sprite();
	s.rect(4, 3, 8, 9, "x").hline(4, 3, 8, "a");
	s.hline(5, 5, 6, "z").hline(5, 7, 5, "v").hline(5, 9, 6, "v");
	s.vline(4, 12, 3, "0").vline(11, 12, 3, "0");
	return s;
};

/** ベンチ（左・右の2マス）。 */
const bench = (side) => {
	const s = sprite();
	s.rect(0, 6, 16, 3, "7").hline(0, 6, 16, "a").hline(0, 8, 16, "6");
	s.rect(0, 10, 16, 2, "7").hline(0, 11, 16, "6");
	const leg = side === "left" ? 2 : 13;
	s.vline(leg, 12, 3, "0");
	if (side === "left") s.vline(0, 6, 6, "0");
	else s.vline(15, 6, 6, "0");
	return s;
};

/** 自販機（16x32）。上は明るい見本の段、下は取り出し口。 */
const vending = () => {
	const s = sprite(16, 32);
	s.rect(1, 3, 14, 28, "i").vline(1, 3, 28, "I").hline(1, 3, 14, "x");
	s.rect(2, 5, 12, 12, "L");
	const cans = ["z", "b", "y", "f", "z", "n"];
	for (let row = 0; row < 3; row++)
		for (let k = 0; k < 5; k++) s.rect(3 + k * 2, 6 + row * 4, 1, 3, cans[(row * 5 + k) % cans.length]);
	for (let k = 0; k < 5; k++) s.px(3 + k * 2, 17, "z");
	s.rect(3, 19, 6, 3, "v").px(11, 19, "0").px(11, 20, "0");
	s.rect(3, 24, 10, 4, "V");
	s.hline(1, 31, 14, "J");
	return s;
};

/** 町内会の掲示板（左右の2マス。16x32 ずつ）。 */
const board = (side) => {
	const s = sprite(16, 32);
	s.rect(0, 6, 16, 3, "r").hline(0, 6, 16, "2");
	s.rect(0, 9, 16, 12, "k").rect(side === "left" ? 1 : 0, 10, 15, 10, "u");
	const papers = side === "left" ? [[3, 11, 5, 6, "x"], [9, 12, 5, 4, "y"]] : [[1, 11, 4, 5, "x"], [6, 11, 6, 7, "x"], [12, 13, 3, 4, "p"]];
	for (const [x, y, w, h, c] of papers) {
		s.rect(x, y, w, h, c);
		s.hline(x + 1, y + 2, w - 2, "A");
	}
	s.vline(side === "left" ? 2 : 13, 21, 10, "6");
	return s;
};

/** 電柱の街灯（16x32）。 */
const lampPole = () => {
	const s = sprite(16, 32);
	s.rect(7, 1, 3, 30, "9").vline(7, 1, 30, "0");
	s.hline(4, 4, 9, "0");
	s.hline(9, 8, 5, "0").rect(11, 9, 4, 2, "a").hline(11, 11, 4, "Y");
	s.rect(6, 16, 5, 3, "x").hline(7, 17, 3, "v");
	s.hline(5, 31, 7, "J");
	return s;
};

// ───────────────── 地区ごとの部品（川・神社・学校・公園・国道・駅・商店街） ─────────────────

/** 道路にこぼれた店の灯り（地面に重ねる。ディザの明るいまだら）。 */
const lightSpill = () => {
	const s = sprite();
	for (let y = 0; y < 16; y++)
		for (let x = 0; x < 16; x++) {
			const d = Math.hypot(x - 7.5, y - 7.5) / 9;
			if (hash(x, y, 40) > d * 1.1 && (x + y) % 2 === 0) s.px(x, y, "L");
		}
	return s;
};

/** すなば。 */
const sand = () =>
	noise("y", [
		["Y", 0.12],
		["x", 0.05],
	], 41);

/** 土の道（土手）。 */
const dirtPath = () => {
	const s = noise("u", [
		["U", 0.14],
		["8", 0.06],
	], 42);
	s.hline(0, 4, 3, "U").hline(9, 11, 4, "U");
	return s;
};

/** 川の水（横に流れるさざなみ）。 */
const water = () => {
	const s = sprite().rect(0, 0, 16, 16, "H");
	for (let y = 1; y < 16; y += 4)
		for (let x = 0; x < 16; x++)
			if (hash(x >> 2, y, 43) < 0.45) s.px((x + y * 3) % 16, y, "X");
	return s;
};

/** 橋（縦にわたる。板と両側のらんかん）。 */
const bridgeV = () => {
	const s = sprite().rect(0, 0, 16, 16, "c");
	for (let y = 0; y < 16; y += 3) s.hline(2, y, 12, "C");
	s.rect(0, 0, 2, 16, "a").vline(1, 0, 16, "A");
	s.rect(14, 0, 2, 16, "a").vline(14, 0, 16, "A");
	return s;
};

/** 田んぼ（水を張った田に苗の列）。 */
const paddy = () => {
	const s = sprite().rect(0, 0, 16, 16, "H");
	for (let y = 0; y < 16; y++) if (hash(3, y, 44) < 0.3) s.px((y * 5) % 16, y, "X");
	for (let y = 2; y < 16; y += 4)
		for (let x = 1; x < 15; x += 3) s.px(x, y, "l").px(x, y - 1, "f").px(x + 1, y, "F");
	s.hline(0, 0, 16, "U");
	return s;
};

/** ススキのしげみ。 */
const susuki = () => {
	const s = sprite();
	for (const x of [2, 5, 7, 10, 12, 14]) {
		const h = 7 + Math.floor(hash(x, 0, 45) * 5);
		s.vline(x, 15 - h, h, "G");
		s.px(x, 15 - h, "x").px(x + 1, 15 - h, "j").px(x, 16 - h, "j").px(x - 1, 17 - h, "x");
	}
	for (let x = 1; x < 15; x++) s.px(x, 14 + (x % 2), "g");
	return s;
};

/** 石段（縦に上る）。 */
const stoneSteps = () => {
	const s = sprite();
	for (let i = 0; i < 4; i++) {
		s.rect(1, i * 4, 14, 4, i % 2 ? "c" : "j");
		s.hline(1, i * 4 + 3, 14, "C");
	}
	s.vline(0, 0, 16, "g").vline(15, 0, 16, "g");
	return s;
};

/** 石畳。 */
const ishidatami = () => {
	const s = noise("c", [["j", 0.06]], 46);
	for (let y = 0; y < 16; y += 5) {
		s.hline(0, y, 16, "C");
		const off = (y / 5) % 2 ? 3 : 9;
		s.vline(off, y, 5, "C").vline((off + 8) % 16, y, 5, "C");
	}
	return s;
};

/** 車道のセンターライン（黄色い実線）。 */
const roadCenter = () => {
	const s = asphalt();
	s.hline(0, 7, 16, "y").hline(0, 8, 16, "Y");
	return s;
};

/** 校庭の土。 */
const schoolDirt = () =>
	noise("s", [
		["S", 0.1],
		["8", 0.04],
	], 47);

/** 坂の段差（コンクリートの段）。 */
const slopeStep = () => {
	const s = pave();
	s.rect(0, 9, 16, 3, "c").hline(0, 9, 16, "j").hline(0, 12, 16, "J");
	return s;
};

/** 草の地面（ひざ丈の草のまじる土手）。 */
const grassTuft = () => {
	const s = ground();
	for (const [x, y] of [
		[3, 5],
		[10, 9],
		[6, 13],
	])
		s.px(x, y, "l").px(x - 1, y + 1, "f").px(x + 1, y + 1, "f").px(x, y + 1, "F");
	return s;
};

/** 店のカウンター（左・中・右）。 */
const counter = (part) => {
	const s = sprite();
	s.rect(0, 4, 16, 4, "4").hline(0, 4, 16, "y");
	s.rect(0, 8, 16, 7, "n").hline(0, 14, 16, "N");
	for (let x = 3; x < 16; x += 5) s.vline(x, 9, 5, "N");
	if (part === "left") s.vline(0, 4, 11, "N");
	if (part === "right") s.vline(15, 4, 11, "N");
	if (part === "mid") s.rect(5, 2, 5, 2, "x").px(7, 1, "z");
	return s;
};

/** 校門の門柱（コンクリート・表札）。 */
const gatePillar = () => {
	const s = sprite();
	s.rect(3, 1, 10, 14, "j").vline(3, 1, 14, "c").hline(3, 1, 10, "x");
	s.rect(5, 4, 6, 6, "a").hline(6, 6, 4, "v").hline(6, 8, 3, "v");
	s.hline(3, 15, 10, "C");
	return s;
};

/** 閉まった校門（鉄の引き戸の柵）。 */
const schoolGate = () => {
	const s = asphalt();
	s.hline(0, 3, 16, "a").hline(0, 12, 16, "A");
	for (let x = 1; x < 16; x += 3) s.vline(x, 3, 10, "9");
	s.rect(0, 13, 16, 2, "0");
	for (let x = 2; x < 16; x += 5) s.px(x, 14, "K");
	return s;
};

/** 空き地のロープ柵（杭とトラロープ）。 */
const ropeFence = () => {
	const s = sprite();
	s.vline(2, 5, 9, "u").vline(13, 5, 9, "u");
	for (let x = 2; x <= 13; x++)
		s.px(
			x,
			6 + Math.round(Math.sin(((x - 2) / 11) * Math.PI) * 2),
			(x >> 1) % 2 ? "y" : "K",
		);
	return s;
};

/** 洗車機（上・下）。 */
const carWash = (part) => {
	const s = sprite();
	if (part === "top") {
		s.rect(1, 2, 14, 14, "i").hline(1, 2, 14, "x");
		s.rect(3, 5, 10, 3, "b").hline(3, 6, 10, "B");
		s.rect(3, 10, 10, 6, "q");
		s.vline(1, 2, 14, "I").vline(14, 2, 14, "I");
	} else {
		s.rect(1, 0, 14, 14, "i").vline(1, 0, 14, "I").vline(14, 0, 14, "I");
		s.rect(3, 0, 10, 12, "q");
		for (let y = 1; y < 12; y += 2) s.hline(4, y, 8, "B");
		s.hline(1, 14, 14, "J");
	}
	return s;
};

/** 地下へ下りる駅の階段（囲いのおく）。 */
const stationStairs = () => {
	const s = sprite();
	const steps = ["j", "c", "C", "0", "V", "K"];
	for (let i = 0; i < 6; i++) s.rect(2, 2 + i * 2, 12, 2, steps[i]);
	s.rect(0, 0, 2, 16, "a").rect(14, 0, 2, 16, "a");
	s.hline(0, 0, 16, "A");
	return s;
};

/** 絵馬かけ。 */
const emakake = () => {
	const s = sprite();
	s.vline(2, 3, 12, "6").vline(13, 3, 12, "6");
	s.rect(1, 2, 14, 2, "k").hline(1, 2, 14, "7");
	for (const [x, y] of [
		[3, 6],
		[7, 5],
		[10, 7],
		[5, 9],
	])
		s.rect(x, y, 3, 3, "4").px(x + 1, y, "y");
	s.hline(2, 12, 12, "k");
	return s;
};

/** バケツ（つりの人の）。 */
const bucket = () => {
	const s = sprite();
	s.rect(5, 8, 7, 6, "b").hline(5, 8, 7, "3").rect(6, 9, 5, 1, "H");
	s.hline(5, 6, 7, "0").px(4, 7, "0").px(12, 7, "0");
	s.hline(6, 14, 5, "B");
	return s;
};

/** 花火のあと（焦げたあとと燃えかす）。 */
const hanabiAto = () => {
	const s = sprite();
	for (let y = 4; y < 14; y++)
		for (let x = 3; x < 14; x++)
			if (hash(x, y, 48) < 0.45 - Math.hypot(x - 8, y - 9) * 0.05) s.px(x, y, "V");
	s.vline(6, 7, 5, "z").vline(9, 9, 4, "p").vline(11, 8, 4, "b");
	s.px(6, 6, "K").px(9, 8, "K").px(11, 7, "K");
	return s;
};

/** 石碑。 */
const sekihi = () => {
	const s = sprite();
	s.rect(4, 1, 8, 12, "c").vline(4, 1, 12, "C").hline(4, 1, 8, "j");
	for (let y = 3; y < 11; y += 2) s.hline(7, y, 2, "C");
	s.rect(2, 13, 12, 2, "C").hline(2, 13, 12, "c");
	return s;
};

/** さいせん箱。 */
const saisen = () => {
	const s = sprite();
	s.rect(2, 5, 12, 9, "k").hline(2, 5, 12, "7");
	for (let x = 3; x < 13; x += 2) s.vline(x, 6, 3, "6");
	s.hline(3, 10, 10, "7").hline(3, 12, 10, "6");
	s.hline(2, 14, 12, "K");
	return s;
};

/** 鉄棒。 */
const tetsubo = () => {
	const s = ground();
	s.vline(2, 3, 11, "0").vline(13, 3, 11, "0").vline(8, 5, 9, "0");
	s.hline(2, 3, 7, "a").hline(8, 5, 6, "a");
	return s;
};

/** ごみ集積所の袋とネット。 */
const gomi = () => {
	const s = sprite();
	for (const [x, y, c] of [
		[2, 7, "i"],
		[8, 6, "I"],
		[5, 10, "i"],
		[10, 10, "i"],
	]) {
		s.rect(x, y, 5, 4, c).px(x + 2, y - 1, "I").px(x + 2, y - 2, "y");
		s.px(x + 1, y + 1, "a");
	}
	s.hline(0, 2, 16, "b");
	return s;
};

/** タイヤのあと（アスファルトに重ねる黒い弧）。 */
const tireMarks = () => {
	const s = sprite();
	for (let x = 0; x < 16; x++) {
		const y = 5 + Math.round(Math.sin(x / 5) * 2);
		s.px(x, y, "V").px(x, y + 5, "V");
	}
	return s;
};

/** 空き缶の回収かご。 */
const cansCrate = () => {
	const s = sprite();
	s.rect(2, 6, 12, 8, "b").hline(2, 6, 12, "3");
	for (let x = 3; x < 13; x += 2) s.vline(x, 7, 6, "B");
	s.px(4, 4, "a").px(5, 4, "a").px(8, 5, "z").px(10, 4, "a").px(11, 5, "y");
	s.hline(2, 14, 12, "K");
	return s;
};

/** 中古レコードのワゴン。 */
const recordWagon = () => {
	const s = sprite();
	s.rect(1, 5, 14, 7, "7").hline(1, 5, 14, "4");
	const c = ["V", "z", "b", "y", "V", "x"];
	for (let x = 2; x < 14; x += 2) s.rect(x, 3, 1, 5, c[x % 6]);
	s.vline(2, 12, 3, "0").vline(13, 12, 3, "0");
	return s;
};

/** 勝手口のポリバケツ。 */
const polyBucket = () => {
	const s = sprite();
	s.rect(4, 5, 8, 9, "b").vline(4, 5, 9, "B").hline(3, 4, 10, "3");
	s.rect(6, 3, 4, 1, "B");
	s.hline(4, 14, 8, "K");
	return s;
};

/** 祭りのポスター（壁に貼る）。 */
const matsuriPoster = () => {
	const s = sprite();
	s.rect(3, 1, 10, 13, "x");
	s.rect(4, 2, 8, 6, "z").rect(6, 3, 4, 4, "y");
	s.hline(4, 9, 8, "v").hline(5, 11, 6, "v");
	s.px(3, 1, "a").px(12, 1, "a");
	return s;
};

/** りんご箱（木箱に赤い実）。 */
const ringoBox = () => {
	const s = sprite();
	s.rect(2, 7, 12, 7, "7").hline(2, 7, 12, "4").hline(2, 10, 12, "6");
	for (let x = 3; x < 13; x += 3) s.rect(x, 5, 2, 2, "z").px(x, 5, "p");
	s.hline(2, 14, 12, "K");
	return s;
};

/** 道しるべ（杭に矢じるしの板）。 */
const signpost = () => {
	const s = sprite();
	s.vline(7, 3, 12, "k").vline(8, 3, 12, "6");
	s.rect(2, 3, 10, 3, "7").px(12, 4, "7").hline(3, 4, 7, "x");
	s.rect(5, 7, 10, 3, "7").px(4, 8, "7").hline(6, 8, 7, "x");
	return s;
};

/** 案内板（二本足に白い板）。 */
const infoSign = () => {
	const s = sprite();
	s.rect(2, 2, 12, 8, "x").hline(2, 2, 12, "a").hline(2, 9, 12, "I");
	s.hline(4, 4, 8, "v").hline(4, 6, 6, "v").hline(4, 8, 5, "b");
	s.vline(3, 10, 5, "0").vline(12, 10, 5, "0");
	return s;
};

/** 工事の囲い（白い仮囲いのパネル）。 */
const kakoi = () => {
	const s = sprite();
	s.rect(0, 1, 16, 14, "i").hline(0, 1, 16, "x");
	s.vline(0, 1, 14, "I").vline(8, 1, 14, "I");
	s.rect(2, 5, 12, 3, "b").hline(3, 6, 10, "x");
	for (let x = 0; x < 16; x += 4) s.rect(x, 12, 2, 2, "y");
	s.hline(0, 15, 16, "J");
	return s;
};

/** ガードレールの花たば。 */
const hanataba = () => {
	const s = sprite();
	s.hline(0, 5, 16, "a").hline(0, 6, 16, "A").hline(0, 9, 16, "a");
	s.rect(6, 7, 5, 6, "x").px(7, 8, "p").px(9, 8, "y").px(8, 9, "z").px(8, 10, "p");
	s.vline(8, 11, 3, "f");
	s.vline(2, 5, 10, "0").vline(13, 5, 10, "0");
	return s;
};

/** 石どうろう（常夜灯。16x32）。 */
const stoneLantern = () => {
	const s = sprite(16, 32);
	s.rect(3, 6, 10, 3, "c").hline(2, 8, 12, "C").px(7, 5, "c").px(8, 5, "c");
	s.rect(4, 9, 8, 6, "j").rect(6, 10, 4, 4, "Y").vline(4, 9, 6, "c");
	s.rect(3, 15, 10, 2, "c");
	s.rect(6, 17, 4, 10, "j").vline(6, 17, 10, "c");
	s.rect(3, 27, 10, 3, "c").hline(3, 30, 10, "C");
	return s;
};

/** 狛犬（a ほえる口／b 閉じた口。16x32）。 */
const komainu = (side) => {
	const s = sprite(16, 32);
	s.rect(2, 24, 12, 6, "c").hline(2, 24, 12, "j").hline(2, 30, 12, "C");
	s.art(3, 10, [
		"...jjjj...",
		"..jjjjjj..",
		".jjKjjKjj.",
		".jjjjjjjc.",
		side === "a" ? ".jjKKKjjc." : ".jjjKjjjc.",
		"..jjjjjc..",
		"..cjjjjc..",
		".jjjjjjjj.",
		".jjcjjcjj.",
		".jjcjjcjj.",
		".jjjjjjjjc",
		"..jj..jj..",
		"..cc..cc..",
	]);
	s.px(side === "a" ? 3 : 12, 9, "j");
	return s;
};

/** 時計柱（公園・駅前の柱の時計。16x32）。 */
const clockPole = () => {
	const s = sprite(16, 32);
	s.rect(7, 12, 2, 18, "9").vline(7, 12, 18, "0");
	s.art(3, 1, [
		"...KKKK...",
		"..KxxxxK..",
		".KxxxKxxK.",
		".KxxxKKxK.",
		".KxxxxxxK.",
		".KxxxxxxK.",
		"..KxxxxK..",
		"...KKKK...",
	]);
	s.rect(5, 9, 6, 3, "9");
	s.rect(5, 29, 6, 2, "c").hline(5, 31, 6, "C");
	return s;
};

/** 郵便ポスト（四角い赤。16x32）。 */
const postSquare = () => {
	const s = sprite(16, 32);
	s.rect(3, 8, 10, 14, "z").vline(3, 8, 14, "Z").hline(3, 8, 10, "p");
	s.rect(5, 11, 6, 1, "V").rect(5, 15, 6, 3, "x").hline(6, 16, 4, "z");
	s.rect(6, 22, 4, 8, "0").hline(4, 30, 8, "J");
	return s;
};

/** 丸ポスト（となりまちの古い通り。16x32）。 */
const postRound = () => {
	const s = sprite(16, 32);
	s.art(3, 5, ["..zzzzzz..", ".zzpzzzzz.", "zzzzzzzzzz", "ZzzzzzzzzZ"]);
	s.rect(3, 9, 10, 19, "z").vline(3, 9, 19, "Z").vline(12, 9, 19, "Z");
	s.rect(5, 12, 6, 1, "V").rect(6, 16, 4, 3, "x");
	s.rect(3, 28, 10, 2, "Z").hline(2, 30, 12, "J");
	return s;
};

/** 給油機（16x32）。 */
const gasPump = () => {
	const s = sprite(16, 32);
	s.rect(3, 6, 10, 23, "i").vline(3, 6, 23, "I").hline(3, 6, 10, "x");
	s.rect(3, 6, 10, 4, "z").hline(4, 7, 8, "x");
	s.rect(5, 12, 6, 4, "q").hline(6, 13, 4, "L");
	s.rect(12, 16, 2, 6, "V").vline(13, 22, 5, "V");
	s.rect(5, 19, 5, 3, "V");
	s.rect(2, 29, 12, 2, "c").hline(2, 31, 12, "C");
	return s;
};

/** 電話ボックス（緑の枠・ガラス・中に公衆電話。16x32）。 */
const phoneBox = () => {
	const s = sprite(16, 32);
	s.rect(1, 2, 14, 29, "f").rect(1, 2, 14, 3, "F").hline(3, 3, 10, "x");
	s.rect(3, 6, 10, 23, "Q");
	s.rect(6, 12, 5, 6, "l").rect(7, 13, 3, 2, "V").px(8, 16, "x");
	s.rect(3, 6, 3, 8, "m");
	s.hline(1, 31, 14, "J");
	return s;
};

/** ブランコ（柱と2本の鎖と座板。16x32・上の層に描く）。 */
const swing = () => {
	const s = sprite(16, 32);
	s.hline(0, 3, 16, "z").hline(0, 4, 16, "Z");
	s.vline(0, 3, 27, "z").vline(15, 3, 27, "z");
	s.vline(4, 5, 16, "A").vline(11, 5, 16, "A");
	s.rect(3, 21, 10, 2, "y").hline(3, 23, 10, "Y");
	s.hline(4, 29, 8, "U");
	return s;
};

/** すべり台（はしごと滑り面。16x32・上の層に描く）。 */
const slide = () => {
	const s = sprite(16, 32);
	s.vline(2, 4, 26, "0").vline(6, 4, 26, "0");
	for (let y = 7; y < 30; y += 4) s.hline(2, y, 5, "9");
	s.rect(2, 2, 6, 3, "b").hline(2, 2, 6, "3");
	for (let y = 5; y < 30; y++) {
		const x = 7 + Math.floor(((y - 5) / 25) * 6);
		s.rect(x, y, 3, 1, "y").px(x + 3, y, "Y");
	}
	return s;
};

/** 空気入れ（スタンドのエアタワー。16x32）。 */
const airTower = () => {
	const s = sprite(16, 32);
	s.rect(5, 8, 6, 21, "b").vline(5, 8, 21, "B").hline(5, 8, 6, "3");
	s.rect(6, 11, 4, 3, "x").px(7, 12, "z");
	s.vline(11, 15, 8, "V").px(12, 23, "V");
	s.rect(4, 29, 8, 2, "c").hline(4, 31, 8, "C");
	return s;
};

/** 給水塔（団地の。細い柱に丸いタンク。16x48）。 */
const waterTower = () => {
	const s = sprite(16, 48);
	s.art(1, 1, [
		"....jjjjjj....",
		"..jjjjjjjjjj..",
		".jjjjjjjjjjjj.",
		"cjjjjjjjjjjjjc",
		"cjjjjjjjjjjjjc",
		"cjjjjjjjjjjjjc",
		"cjjjjjjjjjjjjc",
		"cccjjjjjjjjccc",
		".cccccccccccc.",
		"...cccccccc...",
	]);
	s.hline(3, 6, 10, "c");
	s.rect(6, 11, 4, 35, "j").vline(6, 11, 35, "c");
	s.vline(10, 14, 30, "0");
	for (let y = 14; y < 44; y += 3) s.px(11, y, "0");
	s.rect(3, 45, 10, 3, "c").hline(3, 47, 10, "C");
	return s;
};

/** 道路情報板（電光。国道の。32x32）。 */
const roadInfo = () => {
	const s = sprite(32, 32);
	s.vline(3, 12, 20, "9").vline(28, 12, 20, "9");
	s.rect(1, 2, 30, 12, "0").rect(2, 3, 28, 10, "V");
	for (let x = 4; x < 28; x += 2) if (hash(x, 1, 49) < 0.6) s.px(x, 6, "y");
	for (let x = 4; x < 24; x += 2) if (hash(x, 2, 49) < 0.6) s.px(x, 9, "y");
	return s;
};

// ───────────────── シートに並べる ─────────────────

const LAYOUT = [
	[0, 0, pave()],
	[1, 0, asphalt()],
	[2, 0, ground()],
	[3, 0, roof("kawara", "body")],
	[4, 0, roof("kawara", "eave")],
	[5, 0, roof("tin", "body")],
	[6, 0, roof("tin", "eave")],
	[7, 0, roof("slate", "body")],
	[0, 1, roof("slate", "eave")],
	[1, 1, mortarUpper()],
	[2, 1, tileLower()],
	[3, 1, siding("upper")],
	[4, 1, siding("lower")],
	[5, 1, boards("upper")],
	[6, 1, boards("lower")],
	[7, 1, sash(false).outline()],
	[0, 2, sash(true).outline()],
	[1, 2, signBoard().outline()],
	[2, 2, signVertical().outline()],
	[3, 2, signCross().outline()],
	[4, 2, hedge()],
	[5, 2, fence()],
	[6, 2, flowers("y", "x")],
	[7, 2, flowers("p", "z")],
	[0, 3, shopDoor().outline()],
	[1, 3, houseDoor().outline()],
	[2, 3, slidingDoor().outline()],
	[3, 3, vending().outline()],
	[4, 3, board("left").outline()],
	[5, 3, board("right").outline()],
	[6, 3, pottedTree().outline()],
	[7, 3, lampPole().outline()],
	[0, 5, pot().outline()],
	[1, 5, drinkingFountain().outline()],
	[2, 5, crate().outline()],
	[3, 5, aSign().outline()],
	[4, 5, bench("left").outline()],
	[5, 5, bench("right").outline()],
	[0, 6, tree().outline()],
	[2, 6, pond().outline()],
	// 地区ごとの部品（data/tiles.ts の JP）
	[6, 5, lightSpill()],
	[7, 5, sand()],
	[5, 6, dirtPath()],
	[6, 6, water()],
	[7, 6, bridgeV()],
	[5, 7, paddy()],
	[6, 7, susuki().outline()],
	[7, 7, stoneSteps()],
	[5, 8, ishidatami()],
	[6, 8, roadCenter()],
	[7, 8, schoolDirt()],
	[0, 9, slopeStep()],
	[1, 9, grassTuft()],
	[2, 9, counter("left").outline()],
	[3, 9, counter("mid").outline()],
	[4, 9, counter("right").outline()],
	[5, 9, gatePillar().outline()],
	[6, 9, schoolGate()],
	[7, 9, ropeFence()],
	[0, 10, carWash("top").outline()],
	[1, 10, carWash("bottom").outline()],
	[2, 10, stationStairs()],
	[3, 10, emakake().outline()],
	[4, 10, bucket().outline()],
	[5, 10, hanabiAto()],
	[6, 10, sekihi().outline()],
	[7, 10, saisen().outline()],
	[0, 11, tetsubo()],
	[1, 11, gomi().outline()],
	[2, 11, tireMarks()],
	[3, 11, cansCrate().outline()],
	[4, 11, recordWagon().outline()],
	[5, 11, polyBucket().outline()],
	[6, 11, matsuriPoster().outline()],
	[7, 11, ringoBox().outline()],
	[0, 12, signpost().outline()],
	[1, 12, infoSign().outline()],
	[2, 12, kakoi().outline()],
	[3, 12, hanataba()],
	[0, 13, stoneLantern().outline()],
	[1, 13, komainu("a").outline()],
	[2, 13, komainu("b").outline()],
	[3, 13, clockPole().outline()],
	[4, 13, postSquare().outline()],
	[5, 13, postRound().outline()],
	[6, 13, gasPump().outline()],
	[7, 13, phoneBox().outline()],
	[0, 15, swing()],
	[1, 15, slide().outline()],
	[2, 15, airTower().outline()],
	[3, 15, waterTower().outline()],
	[4, 15, roadInfo().outline()],
];

console.log(
	`town.png ${writeSheet(join(OUT, "town.png"), LAYOUT, PAL, 8, 18)}`,
);
