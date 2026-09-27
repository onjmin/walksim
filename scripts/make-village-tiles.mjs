// 自作のマップチップ（夕暮れの村）を作る（node scripts/make-village-tiles.mjs）。
//
//   public/assets/walksim/village.png … 16px チップのシート（8列）。data/tiles-village.ts の village(c, r) で切り出す
//
// maps/village.ts の旧チップ（WOLF 風・フィールド・RPGEN）を、古い山あいの村の絵に置き換える。
// 地面・土の道・用水路・橋・瓦屋根・板壁・引き戸・絵馬かけ・さいせん箱は town.png（JP / TOWN）を使い、
// ここには足りない物だけを描く：茅葺き屋根・白壁（真壁）・格子窓・灯りの窓・実った稲の田・
// かきの木・小さな石灯籠・地蔵（立っている／倒れた）・朽ちた看板（まっすぐ／かたむいた）・ほこら・
// 田の白いもの・木の電柱・つるべ井戸・蔵の戸・バス停。
// ジオラマ表示は色を場面パレット（夕焼け）に置き換えるので、大事なのは形と明るさの段差。
// 物（地と壁以外）には1画素の輪郭をつける（make-town-tiles.mjs と同じ）。

import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { hash, sprite, writeSheet } from "./lib/pixel.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "public/assets/walksim");

const PAL = {
	K: "#1c1816", // 輪郭
	// 茅（古いわら。灰がかった黄土）
	a: "#8a7a58",
	A: "#6a5c42",
	b: "#a8966e",
	B: "#4e4432",
	// 白壁（しっくい）
	w: "#d6cebc",
	W: "#bab29e",
	v: "#9e9684",
	// 柱・板（古い木）
	k: "#5a4432",
	6: "#463424",
	7: "#6e5642",
	8: "#86705a",
	// 石
	c: "#8a8880",
	C: "#6e6c66",
	j: "#a8a69c",
	J: "#56544e",
	// 窓の中
	q: "#2a2c34",
	Q: "#3c404c",
	y: "#e0c070",
	Y: "#f4e2a8",
	x: "#ece6d6",
	X: "#c8c2b2",
	m: "#7a90b0",
	M: "#a8bcd8",
	// 稲
	g: "#6a7040",
	G: "#50562e",
	h: "#8a8a4a",
	i: "#b09e5a",
	I: "#c8b46e",
	u: "#3e3a26",
	// 葉・土
	f: "#5e6638",
	F: "#464c2a",
	l: "#7a7a44",
	U: "#685a44",
	// 柿の実・よだれかけ・花
	o: "#d07a34",
	O: "#a85a28",
	r: "#a83c32",
	R: "#7e2c26",
	p: "#d8a0a8",
	// 金物
	9: "#7a7e84",
	0: "#5a5e64",
	s: "#8a5a3a",
};

/** 16×16 を base で塗り、ノイズで点を散らす。 */
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

// ───────────────── 屋根・壁 ─────────────────

/** 茅葺き屋根。わらの筋（縦に短く）を段ごとに重ね、eave は厚い切り口と下の影。 */
const thatch = (part) => {
	const s = sprite();
	for (let y = 0; y < 16; y++)
		for (let x = 0; x < 16; x++) {
			// わらの筋：縦に3画素ずつ同じ色（段ごとに筋の位置がずれる）
			const r = hash(x, Math.floor((y + (x % 3)) / 3), 60);
			let ch = r < 0.3 ? "A" : r > 0.78 ? "b" : "a";
			// 5画素ごとに、刈り込んだ段のかげとその上の明るい縁
			if (y % 5 === 4) ch = hash(x, y, 61) < 0.75 ? "A" : "B";
			if (y % 5 === 0 && hash(x, y, 62) < 0.5) ch = "b";
			s.px(x, y, ch);
		}
	if (part === "eave") {
		// 軒先：刈りそろえた厚い切り口（横の細い段）と、その下の深い影
		for (let x = 0; x < 16; x++) {
			s.px(x, 8, "A");
			for (let y = 9; y < 13; y++) s.px(x, y, (x + y * 3) % 5 === 0 ? "a" : "b");
			s.px(x, 13, "B");
		}
		s.rect(0, 14, 16, 2, "K");
	}
	return s;
};

/** 白壁（真壁）。柱が左端、上段は梁、下段は腰板と石の土台。 */
const plaster = (part) => {
	const s = noise("w", [["W", 0.06]], part === "upper" ? 63 : 64);
	s.rect(0, 0, 2, 16, "k").vline(1, 0, 16, "6");
	if (part === "upper") {
		s.rect(0, 0, 16, 2, "k").hline(0, 1, 16, "6");
		s.hline(2, 2, 14, "v");
	} else {
		// 腰板（横の板）と土台の石
		s.rect(2, 7, 14, 6, "7");
		s.hline(2, 7, 14, "8").hline(2, 9, 14, "k").hline(2, 11, 14, "k");
		s.rect(0, 13, 16, 3, "c").hline(0, 13, 16, "j").hline(0, 15, 16, "C");
		for (const x of [4, 10]) s.px(x, 14, "C");
	}
	return s;
};

/** 格子窓（上段の壁に重ねる。中は暗い）。 */
const latticeWin = () => {
	const s = sprite();
	s.rect(3, 4, 10, 9, "k");
	s.rect(4, 5, 8, 7, "q");
	s.rect(4, 5, 3, 2, "Q");
	for (let x = 5; x < 12; x += 2) s.vline(x, 5, 7, "7");
	s.hline(3, 4, 10, "8").hline(2, 13, 12, "6");
	return s;
};

/** 灯りのついた窓（レースのカーテンごし。下段の白壁に重ねる）。 */
const litWin = () => {
	const s = sprite();
	s.rect(2, 1, 12, 11, "k");
	s.rect(3, 2, 10, 9, "y");
	// レースのカーテン（ディザ）と、まん中のすきまの灯り
	for (let y = 2; y < 11; y++)
		for (let x = 3; x < 13; x++) if ((x + y) % 2 === 0 && x !== 7 && x !== 8) s.px(x, y, "x");
	s.vline(7, 2, 9, "Y").vline(8, 2, 9, "Y");
	s.hline(3, 2, 10, "X");
	s.hline(2, 12, 12, "6");
	return s;
};

/** テレビの光がもれる窓（板壁の下段に重ねる。暗い部屋に青白いまだら）。 */
const tvWin = () => {
	const s = sprite();
	s.rect(2, 1, 12, 10, "6");
	s.rect(3, 2, 10, 8, "q");
	for (let y = 2; y < 10; y++)
		for (let x = 3; x < 13; x++) {
			const d = Math.hypot(x - 9, y - 7);
			if (hash(x, y, 65) > d * 0.2 + 0.2) s.px(x, y, d < 2 ? "M" : "m");
		}
	s.vline(8, 2, 8, "k");
	s.hline(2, 11, 12, "8");
	return s;
};

/** 実った稲の田（通れない地）。株の列に、垂れた穂。 */
const inaho = () => {
	const s = noise("G", [
		["u", 0.12],
		["g", 0.2],
	], 66);
	for (let row = 0; row < 4; row++) {
		const y = row * 4 + 3;
		const off = row % 2 ? 2 : 0;
		for (let x = off; x < 16; x += 4) {
			s.vline(x, y - 2, 3, "g").px(x + 1, y - 1, "h");
			// 穂は右へ垂れる
			s.px(x, y - 3, "i").px(x + 1, y - 3, "I").px(x + 2, y - 2, "i").px(x + 2, y - 1, "h");
		}
	}
	return s;
};

// ───────────────── 置き物（16×16） ─────────────────

/** かきの木（小さな木。高いところに実がひとつ）。 */
const kakiTree = () => {
	const s = sprite();
	s.rect(7, 10, 2, 6, "k").vline(8, 10, 6, "6").px(6, 15, "k").px(9, 15, "6");
	s.px(6, 9, "k").px(10, 8, "k").px(9, 9, "k");
	for (let y = 0; y < 11; y++)
		for (let x = 1; x < 15; x++) {
			const dx = x - 7.5;
			const dy = y - 5;
			if (dx * dx + dy * dy * 1.5 < 40 - hash(x, y, 67) * 12) {
				const r = hash(x, y, 68);
				let ch = r < 0.3 ? "F" : "f";
				if (dy < -1 && dx < 2 && r < 0.5) ch = "l";
				if (dy > 2 && r < 0.6) ch = "F";
				s.px(x, y, ch);
			}
		}
	// 実はひとつだけ、いちばん上に
	s.px(10, 1, "o").px(11, 1, "o").px(10, 2, "O").px(11, 2, "o");
	return s;
};

/** 小さな石灯籠（神社の。1マスに収まる背の低いもの）。 */
const smallLantern = () => {
	const s = sprite();
	s.art(3, 1, [
		"....cc....",
		"..jjjjjj..",
		"jjjjjjjjjj",
		"CCCCCCCCCC",
		"..jyyyyc..",
		"..jyYyyc..",
		"..jjjjjc..",
		".cccccccc.",
		"...jjjc...",
		"...jjjc...",
		"...jjjc...",
		".jjjjjjjc.",
		".CCCCCCCC.",
	]);
	return s;
};

/** 地蔵（立っている。赤いよだれかけ）。 */
const jizo = () => {
	const s = sprite();
	s.art(3, 1, [
		"...jjjj...",
		"..jjjjjj..",
		"..jCjjCj..",
		"..jjjjjc..",
		"...jjjc...",
		"..rrrrrr..",
		".rrrrrrrr.",
		".jRrrrrRc.",
		".jjjjjjjc.",
		".jjcjjjjc.",
		".jjjjjjjc.",
		"cccccccccc",
		"CCCCCCCCCC",
	]);
	return s;
};

/** 倒れた地蔵（横たわる。頭は左）。そばに新しい花。 */
const jizoFallen = () => {
	const s = sprite();
	s.art(0, 7, [
		"..jjj.rr.......",
		".jjjjjrrrjjjjc.",
		".jCjjjrrrjjjjjc",
		".jjjjjrrrjjcjjc",
		".jjjjcrrrjjjjjc",
		"..ccc.RR.cccccc",
	]);
	// 竹の花立てと、あたらしい花
	s.rect(12, 3, 2, 4, "l").px(12, 3, "f");
	s.px(11, 1, "p").px(12, 0, "x").px(13, 1, "p").px(14, 2, "y").px(12, 2, "f").px(13, 2, "f");
	s.hline(0, 13, 16, "U").hline(1, 14, 14, "U");
	return s;
};

/** 朽ちた木の看板（二本の杭に横板。字はほとんど消えている）。 */
const oldSign = () => {
	const s = sprite();
	s.vline(3, 9, 6, "6").vline(12, 9, 6, "6").vline(4, 9, 6, "k").vline(11, 10, 5, "k");
	s.rect(1, 2, 14, 8, "7").hline(1, 2, 14, "8").hline(1, 9, 14, "6");
	s.hline(1, 5, 14, "k");
	// かすれた字と、ひび
	for (const [x, y] of [
		[3, 3],
		[4, 3],
		[6, 3],
		[9, 3],
		[10, 3],
		[3, 7],
		[5, 7],
		[6, 7],
	])
		s.px(x, y, "K");
	s.px(12, 6, "6").px(13, 7, "6").px(13, 8, "6");
	s.px(14, 9, "."); // 右下の角が欠けている
	return s;
};

/** かたむいた看板（一本の杭が傾き、板が斜めに垂れる）。 */
const tiltedSign = () => {
	const s = sprite();
	// 看板をまっすぐに描いた座標 (u, v) を、根元 (6, 15) を中心に右へ傾けて置く
	const t = 0.3;
	const [cs, sn] = [Math.cos(t), Math.sin(t)];
	for (let y = 0; y < 16; y++)
		for (let x = 0; x < 16; x++) {
			const dx = x + 0.5 - 6;
			const dy = y + 0.5 - 15;
			const u = dx * cs + dy * sn + 6;
			const v = -dx * sn + dy * cs + 15;
			let ch = null;
			if (v >= 3 && v < 9 && u >= 1 && u < 11.5) {
				ch = v < 4 ? "8" : v >= 8 ? "6" : "7";
				// 大きな字の名残（三つの黒いかたまり）
				if (v >= 5 && v < 7 && [2.8, 6.2, 9.6].some((c) => Math.abs(u - c) < 0.9)) ch = "K";
			} else if (v >= 9 && v < 15.5 && u >= 5 && u < 7) ch = u < 6 ? "6" : "k";
			if (ch) s.px(x, y, ch);
		}
	s.hline(3, 15, 7, "U");
	return s;
};

/** 小さなほこら（石の台に木の社。中は暗い）。 */
const hokora = () => {
	const s = sprite();
	s.art(2, 1, [
		".....KK.....",
		"...k7777k...",
		".k77777777k.",
		"666666666666",
		"..77qqqq6...",
		"..77qQqq6...",
		"..77qqqq6...",
		"..7777776...",
		".cccccccccc.",
		".jjjjjjjjjc.",
		"cccccccccccc",
		"CCCCCCCCCCCC",
	]);
	s.px(7, 7, "o"); // あめ玉
	s.vline(2, 12, 2, "C");
	return s;
};

/** 田の白いもの（ほそく、くねった形）。 */
const kunekune = () => {
	const s = sprite();
	for (let y = 1; y < 15; y++) {
		const x = 7 + Math.round(Math.sin(y * 0.9) * 1.5);
		s.px(x, y, "x").px(x + 1, y, y % 3 === 0 ? "X" : "x");
	}
	// 腕のようなもの
	for (let i = 0; i < 4; i++) {
		s.px(5 - i, 5 - Math.round(Math.sin(i * 1.4)), "x");
		s.px(10 + i, 7 + Math.round(Math.sin(i * 1.4 + 1)), "x");
	}
	return s;
};

// ───────────────── 背の高いもの（16×32） ─────────────────

/** 木の電柱（腕木とがいし。はり紙）。 */
const woodPole = () => {
	const s = sprite(16, 32);
	s.rect(7, 1, 3, 30, "7").vline(7, 1, 30, "6").vline(9, 1, 30, "k");
	s.rect(2, 4, 12, 2, "6").hline(2, 4, 12, "k");
	for (const x of [3, 7, 12]) s.px(x, 3, "x").px(x, 2, "X");
	s.px(5, 6, "6").px(4, 7, "6"); // 支え
	for (let y = 10; y < 26; y += 4) s.px(10, y, "0"); // 足場ボルト
	s.rect(6, 15, 5, 5, "x").hline(7, 16, 3, "C").hline(7, 18, 2, "C"); // はり紙
	s.hline(5, 31, 7, "U");
	return s;
};

/** つるべ井戸（石の井げた・板のふたに石・柱と滑車）。 */
const well = () => {
	const s = sprite(16, 32);
	s.vline(2, 5, 17, "k").vline(13, 5, 17, "k").vline(3, 5, 17, "6").vline(12, 5, 17, "6");
	s.rect(1, 4, 14, 2, "7").hline(1, 4, 14, "8");
	s.rect(7, 6, 2, 3, "0").px(7, 7, "9"); // 滑車
	s.vline(8, 9, 10, "X"); // 縄
	s.rect(1, 20, 14, 10, "c").hline(1, 20, 14, "j").hline(1, 29, 14, "C");
	for (const [x, y] of [
		[5, 22],
		[10, 24],
		[3, 26],
		[8, 27],
	])
		s.hline(x, y, 3, "C");
	// 板のふたと、のせた石
	s.rect(1, 18, 14, 3, "7").hline(1, 18, 14, "8").vline(5, 18, 3, "k").vline(10, 18, 3, "k");
	s.rect(6, 15, 4, 3, "c").hline(7, 15, 2, "j").hline(6, 17, 4, "C");
	s.hline(0, 30, 16, "U");
	return s;
};

/** 蔵の戸（厚いしっくいの段になった枠に、黒い戸と金具）。 */
const kuraDoor = () => {
	const s = sprite(16, 32);
	s.rect(1, 9, 14, 22, "W").hline(1, 9, 14, "w");
	s.rect(2, 11, 12, 20, "v").hline(2, 11, 12, "W");
	s.rect(3, 13, 10, 18, "q").rect(3, 13, 10, 1, "Q");
	s.vline(8, 13, 18, "K");
	for (let y = 16; y < 30; y += 5) s.hline(3, y, 10, "J");
	s.px(6, 21, "9").px(10, 21, "9").px(6, 22, "0").px(10, 22, "0");
	s.hline(1, 31, 14, "C");
	return s;
};

/** バス停（さびた丸い標識と、白くやけた時刻表。重しのコンクリート）。 */
const busStop = () => {
	const s = sprite(16, 32);
	s.art(3, 1, [
		"...ssss...",
		".ssXXXXss.",
		".sXXXXXXs.",
		"sXXrrrrXXs",
		"sXXXXXXXXs",
		".sXXXXXXs.",
		".ssXXXXss.",
		"...ssss...",
	]);
	s.rect(7, 9, 2, 19, "9").vline(7, 9, 19, "0");
	s.rect(4, 12, 8, 7, "x").hline(4, 12, 8, "X").px(5, 14, "X").px(9, 16, "X");
	s.rect(4, 27, 8, 3, "c").hline(4, 27, 8, "j").hline(4, 30, 8, "C");
	return s;
};

// ───────────────── シートに並べる ─────────────────

const LAYOUT = [
	[0, 0, thatch("body")],
	[1, 0, thatch("eave")],
	[2, 0, plaster("upper")],
	[3, 0, plaster("lower")],
	[4, 0, latticeWin().outline()],
	[5, 0, litWin().outline()],
	[6, 0, tvWin().outline()],
	[7, 0, inaho()],
	[0, 1, kakiTree().outline()],
	[1, 1, smallLantern().outline()],
	[2, 1, jizo().outline()],
	[3, 1, jizoFallen().outline()],
	[4, 1, oldSign().outline()],
	[5, 1, tiltedSign().outline()],
	[6, 1, hokora().outline()],
	[7, 1, kunekune().outline()],
	[0, 2, woodPole().outline()],
	[1, 2, well().outline()],
	[2, 2, kuraDoor().outline()],
	[3, 2, busStop().outline()],
];

console.log(
	`village.png ${writeSheet(join(OUT, "village.png"), LAYOUT, PAL, 8, 4)}`,
);
