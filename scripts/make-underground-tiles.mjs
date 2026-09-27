// 自作のマップチップ（地下・怪異の屋内）を作る（node scripts/make-underground-tiles.mjs）。
//
//   public/assets/walksim/underground.png … 16px チップのシート（8列）。data/tiles-underground.ts の underground(c, r) で切り出す
//
// 旧版（WOLF 風チップ・洞窟・屋内の共用パレット）で描いていた4つのマップの絵を置き換える：
//   黄色い部屋（yellow）   … 黄ばんだ壁紙・しめったカーペット・事務机と椅子・自販機（事務所のありふれた不気味さ）
//   過去ログの地層（kakolog2）… 地下の書庫の廃墟。ログの綴じ込みの棚・目録カードの棚・石の床・黒い海を渡る階段
//   伊佐貫トンネル（tunnel） … 煤けたレンガの巻き・湿ったコンクリートとケーブル棚・枕木と線路
//   蔵のなか（kura）       … 古い床板・漆喰の壁と腰板・木箱・文机の帳面・白い布の台・樽
// 文字の意味（通れる・通れない・何の絵か）は変えない。
// ジオラマ表示（?diorama）は色を場面パレットに置き換えるので、大事なのは形と明るさの段差。
// 物（地と壁以外）には1画素の輪郭をつける（make-home-tiles.mjs と同じ理由）。

import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { hash, sprite, writeSheet } from "./lib/pixel.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "public/assets/walksim");

const PAL = {
	K: "#1a1612", // 輪郭
	// 黄色い部屋：壁紙
	Y: "#c8b872",
	y: "#b6a660",
	u: "#d8ca8a",
	U: "#8e7e46", // 幅木
	V: "#6e6034",
	// 黄色い部屋：カーペット
	c: "#a89868",
	C: "#968658",
	d: "#b6a878",
	e: "#7a6c46", // しみ
	E: "#62563a",
	// 隠し部屋の赤いじゅうたん
	r: "#7a3a30",
	R: "#662e26",
	5: "#8c4a3c",
	// 紙
	p: "#e4dcc4",
	P: "#c8bea4",
	6: "#a89e86",
	// 事務の灰色（机・扉・自販機）
	g: "#9a9a94",
	G: "#7c7c78",
	h: "#b8b8b0",
	H: "#5e5e5c",
	// 椅子の布（くすんだ紺）
	b: "#4a5064",
	B: "#383c4c",
	7: "#5e6478",
	// 黒・画面
	k: "#222226",
	j: "#34363c",
	J: "#4a4e56",
	// 段ボール
	a: "#a88458",
	A: "#8c6c44",
	8: "#bc9a6c",
	// 木（明るい・中・暗い）
	w: "#8a6440",
	W: "#6c4c30",
	9: "#a47c52",
	v: "#4e3622",
	// 石の床（書庫）
	s: "#6e665a",
	S: "#5a5348",
	0: "#80786a",
	1: "#4a443a",
	2: "#3a352e",
	// 鉄
	i: "#5a5650",
	I: "#403c38",
	o: "#7a4a30", // さび
	// 水
	q: "#3e4a52",
	Q: "#5c6c74",
	// 灯り・差し色
	l: "#f0e6b0",
	L: "#d8c870",
	z: "#9a3a30", // 赤（ラベル・ピン）
	Z: "#c8a030", // 工事中の黄
	f: "#5a7a8a", // くすんだ青（背表紙・ふとん）
	F: "#46626e",
	n: "#7a8a5a", // くすんだ緑（背表紙）
	// レンガ（トンネル）
	m: "#5e3e30",
	M: "#4a3026",
	3: "#6e4c3a",
	4: "#2e2420",
	// コンクリート（トンネル）
	t: "#6a6862",
	T: "#56544e",
	x: "#7c7a72",
	X: "#3e3c38",
	// 漆喰（蔵）
	N: "#cfc6b0",
	O: "#b8ae96",
	// 白い布
	"+": "#e8e4d8",
	"-": "#c4beb0",
};

/** 16×16 を base の地で塗り、ノイズで点を散らす。 */
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

/** 楕円を塗る（中心 cx, cy・半径 rx, ry）。 */
const ellipse = (s, cx, cy, rx, ry, c) => {
	for (let y = 0; y < s.h; y++)
		for (let x = 0; x < s.w; x++) {
			const dx = (x + 0.5 - cx) / rx;
			const dy = (y + 0.5 - cy) / ry;
			if (dx * dx + dy * dy <= 1) s.px(x, y, c);
		}
	return s;
};

// ═════════════════ 黄色い部屋 ═════════════════

/** しめったカーペット（毛足の短い、黄ばんだベージュ）。 */
const carpet = () =>
	noise("c", [
		["C", 0.13],
		["d", 0.08],
	], 101);

/** 水を吸ったカーペット（ぐっしょりした、しみ）。 */
const carpetDamp = () => {
	const s = carpet();
	ellipse(s, 8, 8.5, 7, 5, "e");
	ellipse(s, 8.5, 8.5, 5, 3.4, "E");
	for (let y = 0; y < 16; y++)
		for (let x = 0; x < 16; x++)
			if (s.cells[y][x] === "e" && hash(x, y, 102) < 0.15) s.px(x, y, "C");
	s.px(6, 7, "e").px(10, 9, "e");
	return s;
};

/** 隠し部屋の赤いじゅうたん（色あせた臙脂）。 */
const redCarpet = () => {
	const s = noise("r", [
		["R", 0.14],
		["5", 0.06],
	], 103);
	return s;
};

/** 壁紙（縦の細い縞。上の段・天井までつづく面）。 */
const yWall = () => {
	const s = sprite();
	for (let y = 0; y < 16; y++)
		for (let x = 0; x < 16; x++) {
			let ch = "Y";
			if (x % 4 === 0) ch = "y";
			else if (x % 4 === 2 && y % 4 === 1) ch = "u";
			if (hash(x, y, 104) < 0.05) ch = "y";
			s.px(x, y, ch);
		}
	return s;
};

/** 壁紙の下の段（幅木つき。床との境に影）。 */
const yWallLow = () => {
	const s = yWall();
	// 下のほうの黄ばみ・水のしみ
	for (let x = 0; x < 16; x++) if (hash(x, 9, 105) < 0.35) s.px(x, 11, "y");
	s.rect(0, 12, 16, 3, "U").hline(0, 12, 16, "u").hline(0, 15, 16, "V");
	return s;
};

/** おんJマンのポスター（同じ絵がどこまでも貼ってある）。 */
const poster = () => {
	const s = sprite();
	s.rect(3, 1, 10, 12, "p").hline(3, 12, 10, "P").vline(12, 1, 12, "P");
	s.hline(4, 2, 8, "z"); // 上の帯
	ellipse(s, 8, 6, 2.6, 2.6, "k"); // まるい頭
	s.px(7, 5, "p").px(9, 5, "p"); // 目
	s.rect(6, 8, 5, 2, "k"); // 肩
	s.hline(4, 10, 8, "6").hline(5, 11, 5, "6"); // 文字
	s.px(3, 1, "h").px(12, 1, "h"); // テープ
	return s;
};

/** はり紙（矢印と字。「出口は　こちら」）。 */
const notice = () => {
	const s = sprite();
	s.rect(4, 2, 8, 9, "p").hline(4, 10, 8, "P");
	s.hline(5, 4, 5, "k").px(9, 3, "k").px(9, 5, "k").px(10, 4, "k"); // →
	s.hline(5, 7, 6, "6").hline(5, 9, 4, "6");
	s.px(7, 2, "z");
	return s;
};

/** 壁かけのモニター（消えている）。 */
const monitor = () => {
	const s = sprite();
	s.rect(2, 2, 12, 9, "H").rect(3, 3, 10, 7, "k");
	s.px(4, 4, "J").px(5, 4, "j").px(4, 5, "j"); // 画面の映りこみ
	s.hline(3, 10, 10, "G").px(12, 10, "l"); // 電源の小さな灯り
	s.rect(7, 11, 2, 2, "G");
	return s;
};

/** 事務机（灰色のスチール。右に引き出し）。 */
const officeDesk = () => {
	const s = sprite();
	s.rect(0, 3, 16, 3, "h").hline(0, 5, 16, "g");
	s.rect(1, 6, 14, 8, "g");
	s.rect(2, 6, 5, 8, "G"); // 足もとの奥（暗い）
	s.vline(8, 6, 8, "G");
	s.hline(9, 9, 6, "G").hline(9, 12, 6, "G");
	s.hline(11, 7, 2, "H").hline(11, 10, 2, "H").hline(11, 13, 2, "H");
	s.vline(1, 6, 9, "H").vline(14, 6, 9, "H");
	return s;
};

/** パイプいす（紺の布張り）。 */
const chair = () => {
	const s = sprite();
	s.rect(4, 2, 8, 5, "b").hline(4, 2, 8, "7");
	s.vline(4, 2, 12, "G").vline(11, 2, 12, "G");
	s.rect(4, 8, 8, 3, "b").hline(4, 8, 8, "7").hline(4, 10, 8, "B");
	s.vline(5, 11, 4, "g").vline(10, 11, 4, "g");
	return s;
};

/** 事務椅子（背の高い回転いす。先客の席）。 */
const swivelChair = () => {
	const s = sprite();
	s.rect(4, 1, 8, 7, "b").hline(5, 1, 6, "7").vline(4, 2, 5, "B").vline(11, 2, 5, "B");
	s.rect(7, 8, 2, 1, "H");
	s.rect(3, 9, 10, 3, "b").hline(3, 9, 10, "7").hline(3, 11, 10, "B");
	s.vline(2, 8, 3, "H").vline(13, 8, 3, "H"); // ひじかけ
	s.vline(7, 12, 2, "G").vline(8, 12, 2, "H");
	s.hline(3, 14, 10, "H").px(2, 15, "k").px(13, 15, "k").px(7, 15, "k");
	return s;
};

/** 段ボール箱。 */
const cardboard = () => {
	const s = sprite();
	s.rect(2, 4, 12, 3, "8").rect(2, 7, 12, 7, "a");
	s.hline(2, 6, 12, "A");
	s.rect(7, 4, 2, 5, "P"); // ガムテープ
	s.vline(11, 7, 7, "A").vline(13, 4, 10, "A");
	s.hline(4, 10, 3, "W"); // マジックの字
	return s;
};

/** 事務所の扉（16x32。どこにも着かないのと、帰れるのと、同じ絵）。 */
const officeDoor = () => {
	const s = sprite(16, 32);
	s.rect(1, 7, 14, 25, "G");
	s.rect(2, 8, 12, 23, "h");
	s.vline(13, 8, 23, "g").hline(2, 8, 12, "g");
	s.rect(4, 11, 4, 5, "j").rect(5, 12, 2, 3, "J"); // 小窓
	s.hline(10, 20, 3, "H").px(10, 21, "H"); // レバー
	s.hline(4, 27, 8, "g").hline(4, 28, 8, "G"); // がらり
	s.hline(1, 31, 14, "H");
	return s;
};

/** 自販機（16x32。うなっている）。 */
const vending = () => {
	const s = sprite(16, 32);
	s.rect(1, 3, 14, 29, "g").vline(14, 3, 29, "G").hline(1, 3, 14, "h");
	s.rect(2, 5, 9, 13, "l");
	const cans = ["z", "f", "n", "a", "F", "z"];
	for (let row = 0; row < 3; row++)
		for (let i = 0; i < 4; i++) {
			const c = cans[(row * 4 + i) % cans.length];
			s.rect(3 + i * 2, 6 + row * 4, 1, 3, c);
		}
	s.hline(2, 17, 9, "L");
	s.rect(12, 7, 2, 5, "G").px(12, 8, "k").px(12, 10, "h"); // 硬貨の口
	s.rect(3, 22, 9, 4, "k").hline(3, 22, 9, "H"); // とり出し口
	s.hline(1, 31, 14, "H");
	return s;
};

// ═════════════════ 過去ログの地層 ═════════════════

/** 石の床（書庫の通路。ほこり）。 */
const stoneFloor = () => {
	const s = noise("s", [
		["S", 0.1],
		["0", 0.06],
	], 111);
	s.hline(0, 0, 16, "1").hline(0, 8, 16, "1");
	s.vline(0, 0, 8, "1").vline(10, 0, 8, "1").vline(5, 8, 8, "1");
	s.px(12, 4, "P").px(3, 12, "6");
	return s;
};

/** 暗い床（dat落ちのくぼみ。紙くずが落ちている）。 */
const darkFloor = () => {
	const s = noise("S", [
		["1", 0.16],
		["s", 0.05],
	], 112);
	s.hline(0, 0, 16, "2").vline(7, 0, 16, "2");
	s.rect(2, 4, 3, 2, "6").px(2, 5, "P");
	s.rect(10, 10, 2, 3, "6").px(11, 10, "P");
	s.px(13, 3, "6");
	return s;
};

/** 下りの階段（黒い海を渡る石段。段ごとに奥が暗い）。 */
const stairsDown = () => {
	const s = sprite();
	for (let step = 0; step < 4; step++) {
		const y = step * 4;
		s.rect(0, y, 16, 3, step % 2 ? "s" : "0");
		s.hline(0, y + 3, 16, "2");
		for (let x = 0; x < 16; x++) if (hash(x, y, 113) < 0.12) s.px(x, y + 1, "S");
	}
	s.vline(0, 0, 16, "1").vline(15, 0, 16, "1");
	return s;
};

/** 上りの階段（16x32。回線の間へ。上ほど明るい）。 */
const stairsUp = () => {
	const s = sprite(16, 32);
	const tones = ["h", "0", "0", "s", "s", "S", "S"];
	for (let step = 0; step < 7; step++) {
		const y = 4 + step * 4;
		s.rect(1, y, 14, 3, tones[step]);
		s.hline(1, y + 3, 14, "1");
	}
	s.vline(0, 4, 28, "2").vline(15, 4, 28, "2");
	s.hline(0, 3, 16, "2");
	return s;
};

/** 水たまり（しみ出した水）。 */
const puddle = () => {
	const s = darkFloor();
	ellipse(s, 8, 9, 6.5, 4, "q");
	s.hline(5, 7, 4, "Q").px(10, 10, "Q");
	return s;
};

/** 奥の間の台座（床にはめこんだ円い石。通れる）。 */
const dais = () => {
	const s = sprite();
	ellipse(s, 8, 8.5, 7.5, 6, "1");
	ellipse(s, 8, 8, 7, 5.4, "0");
	ellipse(s, 8, 8.5, 5, 3.6, "s");
	ellipse(s, 8, 8.5, 4, 2.8, "h");
	s.hline(6, 7, 4, "0");
	return s;
};

/** 閲覧机（古い木の机。左に紙の束）。 */
const readingDesk = () => {
	const s = sprite();
	s.rect(1, 4, 14, 4, "9").hline(1, 7, 14, "w");
	s.rect(1, 8, 14, 2, "W");
	s.rect(2, 10, 2, 5, "W").rect(12, 10, 2, 5, "W");
	s.rect(3, 3, 4, 2, "p").hline(3, 5, 4, "P"); // 紙の束
	return s;
};

/** 鉄の柵（さびた格子）。 */
const ironFence = () => {
	const s = sprite();
	s.hline(0, 2, 16, "i").hline(0, 3, 16, "I");
	s.hline(0, 12, 16, "i").hline(0, 13, 16, "I");
	for (let x = 1; x < 16; x += 3) {
		s.vline(x, 1, 14, "i").vline(x + 1, 3, 12, "I");
		s.px(x, 1, "I");
		if (hash(x, 0, 114) < 0.6) s.px(x, 8 + Math.floor(hash(x, 1, 114) * 4), "o");
	}
	return s;
};

/** 木の床（おんちゃんの部屋。あたたかい色の板）。 */
const warmWood = () => {
	const s = sprite();
	for (let y = 0; y < 16; y++)
		for (let x = 0; x < 16; x++) {
			let ch = "9";
			if (y % 4 === 3) ch = "w";
			else if (hash(x, y, 115) < 0.08) ch = "w";
			s.px(x, y, ch);
		}
	for (let row = 0; row < 4; row++) s.vline((row * 5 + 3) % 16, row * 4, 3, "w");
	return s;
};

/** 棚の本体（16x32）。side は "left"/"right"/"single"。綴じたログの背表紙が並ぶ。 */
const logShelf = (side, seed) => {
	const s = sprite(16, 32);
	s.rect(0, 2, 16, 30, "W");
	s.hline(0, 2, 16, "w");
	const spines = ["P", "a", "6", "f", "n", "A", "8", "P"];
	for (let shelf = 0; shelf < 4; shelf++) {
		const top = 4 + shelf * 7;
		s.rect(0, top, 16, 5, "v"); // 奥の暗がり
		let x = side === "right" ? 0 : 1;
		const end = side === "left" ? 16 : 15;
		while (x < end) {
			const r = hash(x, shelf, seed);
			if (r < 0.12) {
				x += 2; // 抜けたすきま
				continue;
			}
			const wdt = r < 0.55 ? 1 : 2;
			const c = spines[Math.floor(hash(x, shelf + 9, seed) * spines.length)];
			const h = r > 0.9 ? 3 : 5;
			s.rect(x, top + 5 - h, Math.min(wdt, end - x), h, c);
			if (h === 5 && wdt === 2) s.px(x, top + 2, "p"); // 背のラベル
			x += wdt;
		}
		s.hline(0, top + 5, 16, "w").hline(0, top + 6, 16, "W");
	}
	if (side !== "right") s.vline(0, 2, 30, "v");
	if (side !== "left") s.vline(15, 2, 30, "v");
	// はみ出した紙
	s.px(side === "right" ? 4 : 9, 10, "p").px(side === "right" ? 4 : 9, 11, "p");
	return s;
};

/** 目録カードの棚（16x32。小さな引き出しが並ぶ）。 */
const cardCatalog = () => {
	const s = sprite(16, 32);
	s.rect(1, 4, 14, 28, "w").hline(1, 4, 14, "9").vline(14, 4, 28, "W");
	s.rect(3, 1, 5, 3, "p").hline(3, 3, 5, "P"); // 上に置いた紙
	for (let row = 0; row < 6; row++)
		for (let col = 0; col < 2; col++) {
			const x = 2 + col * 6;
			const y = 6 + row * 4;
			s.rect(x, y, 5, 3, "9").hline(x, y + 3, 5, "v");
			s.px(x + 2, y + 1, "L");
			if (hash(col, row, 116) < 0.2) s.rect(x, y, 5, 3, "v"); // 抜けた引き出し
		}
	s.hline(1, 31, 14, "v");
	return s;
};

/** ブラウン管（16x16。床に置いた古いパソコンの画面）。 */
const crt = () => {
	const s = sprite();
	s.rect(2, 3, 12, 10, "P").vline(13, 3, 10, "6").hline(2, 12, 12, "6");
	s.rect(3, 4, 8, 6, "j");
	s.hline(4, 6, 3, "Q").hline(4, 8, 5, "Q");
	s.rect(4, 13, 8, 2, "6");
	return s;
};

/** お絵かき掲示板（16x32。台の上のブラウン管に、描きかけの線）。 */
const crtDesk = () => {
	const s = sprite(16, 32);
	s.rect(1, 6, 14, 12, "P").vline(14, 6, 12, "6").hline(1, 17, 14, "6");
	s.rect(2, 7, 10, 8, "j");
	// 描きかけの輪郭（頭と肩の線だけ）
	s.art(4, 8, ["..hhh.", ".h...h", ".h...h", "..h.h.", ".h...h", "h.....h"]);
	s.rect(4, 18, 8, 2, "6");
	s.rect(0, 20, 16, 2, "9").hline(0, 21, 16, "w");
	s.rect(1, 22, 14, 3, "W");
	s.rect(1, 25, 2, 7, "W").rect(13, 25, 2, 7, "W");
	return s;
};

/** スレタイの札（木の札に紙を貼った、立て札）。 */
const placard = () => {
	const s = sprite();
	s.rect(2, 2, 12, 8, "w").hline(2, 9, 12, "W");
	s.rect(3, 3, 10, 5, "p").hline(3, 7, 10, "P");
	s.hline(4, 4, 7, "6").hline(4, 6, 5, "6");
	s.rect(7, 10, 2, 5, "W").hline(5, 14, 6, "v");
	return s;
};

/** 貼り紙（杭に留めた一枚の紙）。 */
const memoStake = () => {
	const s = sprite();
	s.rect(7, 8, 2, 7, "W");
	s.rect(4, 1, 8, 10, "p").vline(11, 1, 10, "P").hline(4, 10, 8, "P");
	s.px(4, 1, "P").px(11, 10, "6"); // 角のめくれ
	s.hline(5, 4, 5, "6").hline(5, 6, 4, "6").hline(5, 8, 5, "6");
	s.px(8, 2, "z"); // 画びょう
	return s;
};

/** 工事中の看板（黄と黒のななめ縞のバリケード）。 */
const koujiSign = () => {
	const s = sprite();
	for (let y = 3; y < 9; y++)
		for (let x = 1; x < 15; x++) s.px(x, y, (x + y) % 6 < 3 ? "Z" : "k");
	s.hline(1, 3, 14, "L");
	s.vline(2, 9, 6, "i").vline(13, 9, 6, "i");
	s.hline(1, 14, 3, "I").hline(12, 14, 3, "I");
	return s;
};

/** 食堂のカウンター（木の屋台。side は "left"/"mid"/"right"）。 */
const counter = (side) => {
	const s = sprite();
	const x0 = side === "left" ? 1 : 0;
	const x1 = side === "right" ? 15 : 16;
	s.rect(x0, 4, x1 - x0, 3, "9").hline(x0, 4, x1 - x0, "8").hline(x0, 7, x1 - x0, "v");
	s.rect(x0, 8, x1 - x0, 7, "w");
	for (let x = x0; x < x1; x++) if (x % 4 === 1) s.vline(x, 8, 7, "W");
	if (side === "left") s.vline(1, 4, 11, "W");
	if (side === "right") s.vline(14, 4, 11, "W");
	if (side === "mid") s.rect(5, 2, 6, 2, "H").rect(6, 1, 4, 1, "G"); // 鍋
	return s;
};

/** ふとん（part は "head"＝枕の側 / "foot"＝すそ）。 */
const futon = (part) => {
	const s = sprite();
	if (part === "head") {
		s.rect(2, 3, 12, 13, "+").vline(13, 3, 13, "-");
		s.rect(4, 4, 8, 4, "p").hline(4, 7, 8, "P"); // 枕
		s.rect(2, 10, 12, 6, "f").hline(2, 10, 12, "F");
		for (let x = 3; x < 14; x += 3) s.vline(x, 11, 5, "F");
	} else {
		s.rect(2, 0, 12, 11, "f");
		for (let x = 3; x < 14; x += 3) s.vline(x, 0, 11, "F");
		s.hline(2, 5, 12, "F");
		s.rect(2, 11, 12, 2, "+").hline(2, 13, 12, "-");
	}
	return s;
};

// ═════════════════ 伊佐貫トンネル ═════════════════

/** 巻きのレンガ（煤けて黒ずんだ、古い隧道のレンガ）。 */
const brickLining = () => {
	const s = sprite();
	for (let y = 0; y < 16; y++)
		for (let x = 0; x < 16; x++) {
			const row = Math.floor(y / 4);
			const xx = (x + (row % 2) * 4) % 8;
			let ch = hash(x, y, 121) < 0.25 ? "M" : "m";
			if (hash(Math.floor((x + (row % 2) * 4) / 8), row, 122) < 0.25) ch = "3";
			if (y % 4 === 3 || xx === 0) ch = "4";
			s.px(x, y, ch);
		}
	return s;
};

/** 側壁（湿ったコンクリート。ケーブル棚と、したたりの筋）。 */
const tunnelWall = () => {
	const s = noise("t", [
		["T", 0.14],
		["x", 0.05],
	], 123);
	// したたりの筋
	for (const x of [3, 12])
		for (let y = 0; y < 12; y++) if (hash(x, y, 124) < 0.7) s.px(x, y, "T");
	s.vline(12, 2, 6, "X");
	// ケーブル棚
	s.px(1, 3, "I").px(9, 3, "I").px(1, 4, "I").px(9, 4, "I");
	s.hline(0, 4, 16, "k").hline(0, 5, 16, "j").hline(0, 7, 16, "k");
	s.hline(0, 8, 16, "I");
	// 足もとの側溝
	s.hline(0, 13, 16, "x").rect(0, 14, 16, 2, "X");
	return s;
};

/** 線路（砂利・枕木・二本のレール。東西に通る）。 */
const rails = () => {
	const s = noise("T", [
		["X", 0.18],
		["t", 0.12],
		["S", 0.06],
	], 125);
	for (const x0 of [1, 9]) s.rect(x0, 1, 4, 14, "W").vline(x0, 1, 14, "v").hline(x0, 1, 4, "w");
	for (const y of [4, 10]) {
		s.hline(0, y - 1, 16, "i");
		s.hline(0, y, 16, "h").hline(0, y + 1, 16, "I");
	}
	return s;
};

// ═════════════════ 蔵のなか ═════════════════

/** 蔵の床板（くすんだ古い板。ほこり）。 */
const kuraFloor = () => {
	const s = sprite();
	for (let y = 0; y < 16; y++)
		for (let x = 0; x < 16; x++) {
			let ch = "W";
			if (y % 4 === 3) ch = "v";
			else if (y % 4 === 1 && hash(Math.floor(x / 3), y, 131) < 0.5) ch = "w"; // 木目
			else if (hash(x, y, 132) < 0.03) ch = "9"; // すり減った所
			s.px(x, y, ch);
		}
	// 板の継ぎ目は2段に1つ（長い板に見せる）
	s.vline(5, 0, 3, "v").vline(12, 8, 3, "v");
	return s;
};

/** 漆喰の壁（上の段。天井の梁の下）。 */
const plasterUp = () => {
	const s = noise("N", [["O", 0.08]], 133);
	s.rect(0, 0, 16, 3, "W").hline(0, 3, 16, "v");
	s.vline(0, 0, 3, "v");
	// ひび
	s.px(11, 6, "O").px(12, 7, "O").px(12, 8, "O").px(13, 9, "O");
	return s;
};

/** 漆喰の壁（下の段。板の腰壁）。 */
const plasterLow = () => {
	const s = noise("N", [["O", 0.08]], 134);
	s.hline(0, 6, 16, "O");
	s.rect(0, 7, 16, 9, "w").hline(0, 7, 16, "9").hline(0, 8, 16, "v");
	for (let x = 0; x < 16; x += 4) s.vline(x, 9, 7, "W");
	s.hline(0, 15, 16, "v");
	return s;
};

/** 木箱（古い長持のような、金具つきの箱）。 */
const woodBox = () => {
	const s = sprite();
	s.rect(1, 4, 14, 3, "9").hline(1, 7, 14, "v");
	s.rect(1, 8, 14, 6, "w").hline(1, 11, 14, "W");
	s.vline(14, 4, 10, "W");
	s.rect(1, 4, 2, 2, "i").rect(13, 4, 2, 2, "i"); // 角の金具
	s.rect(1, 12, 2, 2, "i").rect(13, 12, 2, 2, "i");
	s.rect(7, 7, 2, 3, "I").px(7, 8, "o"); // 錠前
	return s;
};

/** 文机（帳面がひらいてある）。 */
const fuzukue = () => {
	const s = sprite();
	s.rect(1, 6, 14, 3, "w").hline(1, 6, 14, "9").hline(1, 9, 14, "v");
	s.rect(2, 10, 2, 4, "W").rect(12, 10, 2, 4, "W");
	s.hline(1, 13, 3, "v").hline(12, 13, 3, "v");
	// ひらいた帳面
	s.rect(4, 4, 4, 3, "p").rect(8, 4, 4, 3, "P").vline(8, 4, 3, "6");
	s.hline(5, 5, 2, "6").hline(9, 5, 2, "6");
	return s;
};

/** 白い布をかけた台。 */
const whiteStand = () => {
	const s = sprite();
	s.rect(2, 4, 12, 5, "+").hline(2, 4, 12, "+");
	s.rect(2, 9, 12, 5, "-");
	for (let x = 3; x < 14; x += 3) s.vline(x, 9, 5, "+");
	s.hline(2, 8, 12, "-");
	s.rect(3, 14, 2, 1, "W").rect(11, 14, 2, 1, "W");
	return s;
};

/** 樽（竹のたが）。 */
const barrel = () => {
	const s = sprite();
	ellipse(s, 8, 5, 5.5, 2, "W");
	s.rect(3, 5, 10, 9, "w");
	s.vline(3, 5, 9, "W").vline(12, 5, 9, "W").vline(6, 6, 8, "9");
	ellipse(s, 8, 5, 5.5, 2, "W");
	ellipse(s, 8, 5, 4.2, 1.2, "v");
	s.hline(3, 7, 10, "n").hline(3, 12, 10, "n");
	s.hline(4, 14, 8, "W");
	return s;
};

// ═════════════════ 拾う物（イベントの絵） ═════════════════

/** レコード盤（机・台の上に置いてある）。 */
const recordDisc = () => {
	const s = sprite();
	ellipse(s, 8, 7.5, 6, 3, "k");
	ellipse(s, 8, 7.5, 4.5, 2, "j");
	ellipse(s, 8, 7.5, 3.4, 1.4, "k");
	ellipse(s, 8, 7.5, 1.6, 1, "z");
	s.px(8, 7, "p");
	s.hline(5, 5, 3, "J"); // つや
	return s;
};

/** 懐中電灯（机の上に、横たわっている）。 */
const flashlight = () => {
	const s = sprite();
	s.rect(3, 6, 8, 3, "k").hline(3, 6, 8, "J");
	s.rect(11, 5, 3, 5, "g").vline(13, 5, 5, "h").px(11, 5, "G");
	s.px(14, 6, "l").px(14, 7, "l").px(14, 8, "L");
	s.px(6, 7, "z"); // スイッチ
	return s;
};

// ───────────────── シートに並べる ─────────────────

const LAYOUT = [
	// 黄色い部屋
	[0, 0, carpet()],
	[1, 0, carpetDamp()],
	[2, 0, redCarpet()],
	[3, 0, yWall()],
	[4, 0, yWallLow()],
	[5, 0, poster().outline()],
	[6, 0, notice().outline()],
	[7, 0, monitor().outline()],
	[0, 1, officeDesk().outline()],
	[1, 1, chair().outline()],
	[2, 1, swivelChair().outline()],
	[3, 1, cardboard().outline()],
	// 拾う物・しらべる物
	[4, 1, recordDisc().outline()],
	[5, 1, flashlight().outline()],
	[6, 1, placard().outline()],
	[7, 1, memoStake().outline()],
	// 背の高い物（16x32）
	[0, 2, officeDoor().outline()],
	[1, 2, vending().outline()],
	[2, 2, logShelf("left", 141).outline()],
	[3, 2, logShelf("right", 142).outline()],
	[4, 2, cardCatalog().outline()],
	[5, 2, stairsUp()],
	[6, 2, crtDesk().outline()],
	[7, 2, crt().outline()],
	[7, 3, koujiSign().outline()],
	// 過去ログの地層
	[0, 4, stoneFloor()],
	[1, 4, darkFloor()],
	[2, 4, stairsDown()],
	[3, 4, puddle()],
	[4, 4, dais()],
	[5, 4, readingDesk().outline()],
	[6, 4, ironFence().outline()],
	[7, 4, warmWood()],
	[0, 5, counter("left").outline()],
	[1, 5, counter("mid").outline()],
	[2, 5, counter("right").outline()],
	[3, 5, futon("head").outline()],
	[4, 5, futon("foot").outline()],
	// 伊佐貫トンネル
	[5, 5, brickLining()],
	[6, 5, tunnelWall()],
	[7, 5, rails()],
	// 蔵のなか
	[0, 6, kuraFloor()],
	[1, 6, plasterUp()],
	[2, 6, plasterLow()],
	[3, 6, woodBox().outline()],
	[4, 6, fuzukue().outline()],
	[5, 6, whiteStand().outline()],
	[6, 6, barrel().outline()],
];

console.log(
	`underground.png ${writeSheet(join(OUT, "underground.png"), LAYOUT, PAL, 8, 7)}`,
);
