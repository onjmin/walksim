// 自作のマップチップ（キリコの部屋・アパートの廊下）を作る（node scripts/make-home-tiles.mjs）。
//
//   public/assets/walksim/home.png … 16px チップのシート（8列）。data/tiles.ts の home(c, r) で切り出す
//
// ジオラマ表示（?diorama）は描いた後で色を場面パレットに置き換えるので、ここで大事なのは
// 「形」と「明るさの段差」。色は通常表示でも破綻しない程度の、くすんだ現実の色にしておく。
// 題材は日本のワンルームと団地っぽいアパートの共用廊下（参考作品の絵はトレースしない）。
// 依存なし。PNG の書き出しとドット絵の部品は scripts/lib/pixel.mjs。

import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { hash, sprite, writeSheet } from "./lib/pixel.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "public/assets/walksim");

// ───────────────── 色（1文字 = 1色。"." は透明） ─────────────────

const PAL = {
	K: "#1c1816", // 輪郭
	k: "#3a302a", // 濃い木
	// フローリング
	a: "#aa8058",
	A: "#9a724c",
	q: "#b88e64",
	Q: "#86623e",
	// 壁紙・幅木
	w: "#dcd6c8",
	W: "#c4bdac",
	V: "#a8a090",
	b: "#7a6450",
	B: "#5e4a38",
	// 窓（夜）・カーテン
	x: "#eeeeea",
	X: "#b0b0aa",
	n: "#26344e",
	N: "#3a5070",
	m: "#c8d8f0",
	c: "#8494a8",
	C: "#647488",
	// 紙・差し色
	p: "#f2eee2",
	P: "#d4ceba",
	r: "#c04848",
	R: "#8e3030",
	u: "#4a6a9a",
	U: "#34507a",
	g: "#5a8a5a",
	G: "#3e6a3e",
	y: "#d8b048",
	Y: "#a8842c",
	// 金属・樹脂・画面
	l: "#b8bcc0",
	L: "#8a8e94",
	M: "#5a5e64",
	d: "#2a2e34",
	s: "#a8d8ff",
	S: "#6aa0d0",
	// 布団
	f: "#ece8de",
	F: "#cbc5b6",
	e: "#6e7ea8",
	E: "#53638c",
	z: "#8a9ac0",
	// コンクリート（共用廊下）
	o: "#b4b2aa",
	O: "#9a988f",
	j: "#c6c4bc",
	J: "#85837b",
	// 鉄の扉
	h: "#7c8a8e",
	H: "#5e6c70",
	i: "#98a6aa",
};

// ───────────────── 地（手続きで作る繰り返し模様） ─────────────────

/** フローリング：4画素の板を4段。継ぎ目は段ごとにずらす。 */
const woodFloor = () => {
	const s = sprite();
	const joints = [5, 12, 2, 9];
	for (let y = 0; y < 16; y++)
		for (let x = 0; x < 16; x++) {
			const board = y >> 2;
			let c = "a";
			if (y % 4 === 0) c = "A";
			else if (x === joints[board]) c = "Q";
			else if (y % 4 === 1 && hash(x, y, 1) < 0.25) c = "q";
			else if (hash(x, y, 2) < 0.05) c = "A";
			s.px(x, y, c);
		}
	return s;
};

/** 壁紙：細い縦じま。top は天井際の影、bottom は幅木。 */
const wallpaper = (part) => {
	const s = sprite();
	for (let y = 0; y < 16; y++)
		for (let x = 0; x < 16; x++) {
			// 4画素ごとの細い縦じま（1画素おきの点線で、ほんのり）
			const c = x % 4 === 1 && y % 2 === 0 ? "W" : "w";
			s.px(x, y, c);
		}
	if (part === "top") {
		s.hline(0, 0, 16, "V");
		s.hline(0, 1, 16, "W");
	} else {
		s.hline(0, 12, 16, "W");
		s.hline(0, 13, 16, "b");
		s.hline(0, 14, 16, "b");
		s.hline(0, 15, 16, "B");
	}
	return s;
};

/** 共用廊下の壁：塗装したコンクリート。上は影、下は腰の灰色の帯。 */
const concreteWall = (part) => {
	const s = sprite();
	for (let y = 0; y < 16; y++)
		for (let x = 0; x < 16; x++) s.px(x, y, hash(x, y, 4) < 0.06 ? "o" : "j");
	if (part === "top") {
		s.hline(0, 0, 16, "O");
		s.hline(0, 1, 16, "o");
	} else {
		s.rect(0, 10, 16, 6, "O");
		s.hline(0, 10, 16, "J");
		for (let x = 0; x < 16; x++) if (hash(x, 11, 5) < 0.2) s.px(x, 12 + (x % 3), "J");
		s.hline(0, 15, 16, "J");
	}
	return s;
};

/** 共用廊下の床：コンクリートの打ちっぱなし。1マスごとに目地。 */
const concreteFloor = () => {
	const s = sprite();
	for (let y = 0; y < 16; y++)
		for (let x = 0; x < 16; x++) {
			const r = hash(x, y, 6);
			s.px(x, y, r < 0.1 ? "O" : r > 0.93 ? "j" : "o");
		}
	s.hline(0, 0, 16, "O");
	s.vline(0, 0, 16, "O");
	return s;
};

/** 玄関のたたき（部屋の出口）：灰色のタイルに、キリコのサンダル。 */
const genkan = () => {
	const s = sprite().rect(0, 0, 16, 16, "o");
	s.hline(0, 7, 16, "O").vline(7, 0, 16, "O");
	s.hline(0, 0, 16, "J");
	// サンダル（ふたつ）
	s.rect(3, 9, 3, 5, "U").hline(3, 10, 3, "u");
	s.rect(9, 10, 3, 5, "U").hline(9, 11, 3, "u");
	return s;
};

/** 下り階段（共用廊下の出口）。手前ほど暗い段。 */
const stairsDown = () => {
	const s = sprite();
	const steps = ["j", "o", "O", "J"];
	steps.forEach((c, i) => {
		s.rect(1, i * 4, 14, 4, c);
		s.hline(1, i * 4, 14, i === 0 ? "p" : steps[i - 1]);
	});
	s.vline(0, 0, 16, "M").vline(15, 0, 16, "M");
	return s;
};

// ───────────────── 壁のもの ─────────────────

const windowNight = () =>
	sprite().art(0, 0, [
		"................",
		"CCxxxxxxxxxxxxCC",
		"cCxNNNNmxnNNNxCc",
		"cCxNNNmmxnnNNxCc",
		"cCxnNNNNxnnnNxCc",
		"cCxnnNNNxnnnnxCc",
		"cCxxxxxxxxxxxxCc",
		"cCxnnnnnxnnnnxCc",
		"cCxnnnnnxnnnnxCc",
		"cCxnnnnnxnnnnxCc",
		"cCxxxxxxxxxxxxCc",
		"cCXXXXXXXXXXXXCc",
		"cc............cc",
		"c..............c",
	]);

/** ポスター（夜の町と月。何のポスターかは決めない）。 */
const poster = () => {
	const s = sprite();
	s.rect(3, 2, 10, 11, "P");
	s.rect(4, 3, 8, 9, "u");
	s.hline(7, 4, 2, "y").rect(6, 5, 4, 2, "y").hline(7, 7, 2, "y");
	s.rect(4, 9, 8, 3, "U");
	s.px(5, 8, "U").px(6, 8, "U").px(10, 8, "U");
	s.hline(5, 10, 3, "p").hline(9, 10, 2, "p");
	s.px(3, 2, "l").px(12, 2, "l");
	s.vline(13, 3, 10, "W");
	return s;
};

/** カレンダー（2021年3月。15日にまる＝room.ts の考察バイト）。 */
const calendar = () => {
	const s = sprite();
	s.rect(4, 1, 8, 10, "p");
	s.rect(4, 1, 8, 2, "r");
	s.px(6, 1, "K").px(9, 1, "K");
	for (const y of [4, 6, 8]) for (let x = 5; x <= 10; x += 2) s.px(x, y, "P");
	s.rect(8, 5, 3, 3, "r").px(9, 6, "p");
	s.vline(12, 2, 10, "W").hline(5, 11, 8, "W");
	return s;
};

/** 壁掛け時計（2:00 で止まっている）。 */
const clock = () =>
	sprite().art(0, 2, [
		".....KKKKK......",
		"....KpppppK.....",
		"...KpppKpKpK....",
		"...KpppKKppK....",
		"...KpppKpppK....",
		"...KpppppppK....",
		"....KpppppK.....",
		".....KKKKK......",
		".......WW.......",
	]);

// ───────────────── 部屋の家具 ─────────────────

const bedTop = () => {
	const s = sprite();
	s.rect(1, 0, 14, 16, "k");
	s.hline(1, 0, 14, "a").hline(1, 1, 14, "A");
	s.rect(2, 3, 12, 13, "f");
	s.rect(4, 4, 8, 4, "p").hline(4, 7, 8, "F").px(4, 4, "F").px(11, 4, "F");
	s.rect(2, 11, 12, 5, "e").hline(2, 11, 12, "z").hline(2, 12, 12, "f");
	s.vline(2, 3, 13, "F");
	return s;
};

const bedBottom = () => {
	const s = sprite();
	s.rect(1, 0, 14, 14, "k");
	s.rect(2, 0, 12, 12, "e");
	s.hline(3, 4, 9, "E").hline(5, 8, 8, "E").px(4, 5, "z").px(9, 9, "z");
	s.vline(2, 0, 12, "E").vline(13, 0, 12, "E");
	s.rect(1, 12, 14, 2, "k").hline(1, 12, 14, "A");
	s.hline(2, 14, 12, "Q");
	return s;
};

/** ローテーブル（机）。ノートと マグカップ。 */
const lowTable = () => {
	const s = sprite();
	s.rect(1, 3, 14, 7, "a").hline(1, 3, 14, "q");
	s.rect(1, 10, 14, 2, "A").hline(1, 11, 14, "Q");
	s.vline(2, 12, 2, "k").vline(13, 12, 2, "k");
	s.rect(3, 4, 5, 4, "p").hline(4, 5, 3, "P").hline(4, 6, 2, "P");
	s.rect(10, 4, 3, 3, "l").px(11, 5, "k").px(13, 5, "l");
	return s;
};

/** 小さな台に やかん。 */
const kettleTable = () => {
	const s = sprite();
	s.rect(3, 8, 10, 4, "a").hline(3, 8, 10, "q");
	s.rect(3, 12, 10, 2, "A").vline(4, 14, 1, "k").vline(11, 14, 1, "k");
	s.rect(5, 3, 6, 5, "L").hline(5, 3, 6, "l").hline(6, 2, 4, "l");
	s.px(7, 1, "M").px(8, 1, "M");
	s.px(11, 5, "L").px(12, 4, "L");
	s.hline(5, 7, 6, "M");
	return s;
};

/** 本棚（16x32。上半分は奥の壁に重なる）。 */
const bookshelf = () => {
	const s = sprite(16, 32);
	s.rect(2, 4, 12, 27, "A");
	s.rect(2, 2, 12, 2, "q");
	const colors = ["r", "u", "g", "y", "p", "l", "R", "U", "G"];
	for (const top of [6, 13, 20]) {
		s.rect(3, top, 10, 6, "k");
		let x = 3;
		let i = top;
		while (x < 13) {
			const bw = 1 + Math.floor(hash(x, top, 7) * 2);
			const bh = 4 + Math.floor(hash(x, top, 8) * 2);
			const c = colors[Math.floor(hash(x, i, 9) * colors.length)];
			if (hash(x, top, 10) > 0.12) s.rect(x, top + 6 - bh, Math.min(bw, 13 - x), bh, c);
			x += bw;
			i++;
		}
	}
	s.rect(3, 27, 10, 2, "Q");
	s.hline(2, 30, 12, "Q");
	return s;
};

/** ブラウン管テレビ（砂あらし）を低い台に。 */
const crtTv = () => {
	const s = sprite();
	s.rect(2, 11, 12, 4, "k").hline(2, 11, 12, "A");
	s.rect(3, 2, 10, 9, "L").hline(3, 1, 10, "l").hline(3, 2, 10, "l");
	s.rect(4, 3, 8, 6, "d");
	for (let y = 3; y < 9; y++)
		for (let x = 4; x < 12; x++) {
			const r = hash(x, y, 11);
			if (r < 0.3) s.px(x, y, "M");
			else if (r > 0.85) s.px(x, y, "l");
		}
	s.px(11, 9, "r").px(9, 9, "M");
	s.px(6, 0, "M").px(9, 0, "M");
	return s;
};

/** パソコン机（モニターの光）。 */
const pcDesk = () => {
	const s = sprite();
	s.rect(0, 8, 16, 4, "a").hline(0, 8, 16, "q");
	s.rect(0, 12, 16, 2, "A").vline(1, 14, 2, "k").vline(14, 14, 2, "k");
	s.rect(4, 1, 8, 6, "M");
	s.rect(5, 2, 6, 4, "s").hline(5, 3, 4, "S").hline(6, 4, 3, "S");
	s.rect(7, 7, 2, 1, "M");
	s.rect(3, 9, 7, 2, "l").hline(3, 10, 7, "L");
	s.px(12, 9, "l").px(12, 10, "L");
	return s;
};

/** 回転いす（机のほうを向いている＝背もたれが手前）。 */
const chair = () => {
	const s = sprite();
	s.rect(4, 3, 8, 6, "M").hline(4, 3, 8, "L");
	s.rect(3, 8, 10, 4, "d").hline(3, 8, 10, "M");
	s.vline(7, 12, 2, "K").vline(8, 12, 2, "K");
	s.px(4, 14, "K").px(8, 14, "K").px(11, 14, "K");
	return s;
};

/** 日記（床に置いたノートと ペン）。セーブ点の絵。 */
const diary = () => {
	const s = sprite();
	s.rect(4, 5, 9, 7, "U").hline(4, 5, 9, "u");
	s.vline(12, 6, 6, "p");
	s.rect(6, 7, 4, 2, "p");
	s.px(3, 12, "y").px(4, 11, "y").px(5, 10, "y").px(2, 13, "K");
	s.hline(5, 12, 8, "A");
	return s;
};

// ───────────────── 部屋の小物（生活感） ─────────────────

/** 座布団。 */
const cushion = () => {
	const s = sprite();
	s.rect(3, 5, 10, 8, "R").rect(4, 5, 8, 7, "r");
	s.px(3, 5, ".").px(12, 5, ".").px(3, 12, ".").px(12, 12, ".");
	s.px(7, 8, "R").px(8, 8, "R");
	s.hline(4, 13, 8, "Q");
	return s;
};

/** 雑誌とマンガの山。 */
const magazines = () => {
	const s = sprite();
	s.rect(3, 9, 9, 4, "u").hline(3, 12, 9, "U");
	s.rect(4, 7, 8, 3, "p").hline(4, 9, 8, "P");
	s.rect(5, 5, 7, 3, "y").hline(5, 7, 7, "Y").rect(7, 5, 3, 1, "p");
	s.rect(9, 11, 5, 3, "g").hline(9, 13, 5, "G");
	s.hline(3, 13, 6, "Q");
	return s;
};

/** 脱ぎっぱなしの服。 */
const laundry = () => {
	const s = sprite();
	s.rect(2, 7, 7, 5, "l").rect(3, 8, 5, 3, "p").px(2, 11, ".");
	s.rect(6, 9, 8, 4, "U").hline(7, 9, 6, "u").px(13, 12, ".");
	s.px(10, 13, "Q").hline(3, 12, 3, "Q");
	return s;
};

/** 鉢植え（ポトス）。 */
const plant = () => {
	const s = sprite();
	s.rect(5, 10, 6, 5, "b").hline(5, 10, 6, "a").hline(6, 15, 4, "B");
	s.art(2, 1, [
		"....gG......",
		"..ggGgg.gg..",
		".gGggGGgGgg.",
		"gGg.gGgGg.Gg",
		".g.GgGgGgGg.",
		"...gGgggGg..",
		"..Gg.GgG.gG.",
		".g....G...g.",
		"......g.....",
	]);
	return s;
};

/** 段ボール箱（引っ越しから開けていない）。 */
const boxes = () => {
	const s = sprite();
	s.rect(1, 7, 10, 8, "Y").rect(1, 5, 10, 2, "y").hline(1, 14, 10, "B");
	s.vline(6, 5, 2, "Y").rect(3, 9, 5, 2, "p");
	s.rect(8, 2, 7, 6, "Y").rect(8, 1, 7, 2, "y").vline(11, 1, 2, "Y");
	s.hline(8, 7, 7, "B");
	return s;
};

/** ごみ箱（丸めた紙）。 */
const trash = () => {
	const s = sprite();
	s.rect(4, 5, 8, 2, "M").rect(5, 5, 6, 1, "d");
	s.rect(4, 7, 8, 7, "l").vline(4, 7, 7, "L").vline(11, 7, 7, "L");
	s.px(6, 4, "p").px(7, 4, "p").px(9, 3, "p").px(8, 4, "P");
	s.hline(5, 14, 6, "Q");
	return s;
};

/** 扇風機（しまい忘れ）。 */
const fan = () => {
	const s = sprite();
	s.art(3, 0, [
		"...LLLL...",
		"..LlllLL..",
		".LllMllL..",
		".LlMdMlL..",
		".LllMllL..",
		"..LlllL...",
		"...LLLL...",
		".....M....",
		".....M....",
		".....M....",
		"....MMM...",
		"..LLLLLLL.",
		"..MMMMMMM.",
	]);
	s.hline(5, 13, 7, "Q");
	return s;
};

// ───────────────── 共用廊下のもの ─────────────────

/** 鉄の玄関扉（16x32。上半分は奥の壁の上段に重なる）。 */
const steelDoor = (plate) => {
	const s = sprite(16, 32);
	s.rect(1, 1, 14, 31, "H");
	s.rect(2, 2, 12, 29, "h");
	s.vline(3, 3, 27, "i");
	s.rect(6, 6, 4, 2, plate);
	s.px(8, 10, "K");
	s.rect(5, 20, 6, 1, "H");
	s.px(11, 17, "l").px(11, 18, "L").px(12, 17, "l");
	s.hline(1, 31, 14, "J");
	return s;
};

/** 集合郵便受け（16x32。三段）。 */
const mailbox = () => {
	const s = sprite(16, 32);
	s.rect(2, 6, 12, 2, "j");
	s.rect(2, 8, 12, 22, "l");
	for (const top of [9, 16, 23]) {
		s.rect(3, top, 10, 6, "L").hline(3, top, 10, "l");
		s.hline(5, top + 2, 6, "d");
		s.rect(4, top + 4, 3, 1, "p");
	}
	s.hline(2, 30, 12, "J");
	return s;
};

/** かさ立て。 */
const umbrellaStand = () => {
	const s = sprite();
	s.vline(6, 1, 7, "u").px(5, 1, "u").px(5, 0, "U");
	s.vline(9, 2, 6, "r").px(10, 2, "r").px(10, 1, "R");
	s.vline(8, 3, 5, "l");
	s.rect(5, 6, 6, 2, "d");
	s.rect(5, 8, 6, 6, "M").vline(5, 8, 6, "L");
	s.hline(5, 14, 6, "J");
	return s;
};

/** 外廊下の手すり（腰壁）。上半分は透明＝その向こうは夜空。 */
const railing = () => {
	const s = sprite();
	s.hline(0, 5, 16, "l").hline(0, 6, 16, "L");
	s.rect(0, 7, 16, 9, "O");
	s.hline(0, 7, 16, "j");
	for (let x = 0; x < 16; x++) if (hash(x, 9, 12) < 0.2) s.px(x, 9 + (x % 4), "J");
	s.hline(0, 15, 16, "J");
	return s;
};

/** 消火器（手すりの前に置く）。 */
const extinguisher = () => {
	const s = sprite();
	s.rect(6, 5, 4, 9, "r").vline(6, 5, 9, "R").vline(9, 6, 7, "p");
	s.rect(7, 3, 2, 2, "d").hline(8, 2, 3, "d").px(10, 3, "d");
	s.rect(6, 8, 4, 2, "p").hline(7, 9, 2, "P");
	s.hline(6, 14, 4, "R");
	return s;
};

// ───────────────── スーパーみなみ（夕方だけの、ふるい駅前スーパー） ─────────────────

/** 店の壁（上段）：クリームの壁に赤い帯と、手書きのポップ。 */
const shopWallTop = () => {
	const s = sprite();
	for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) s.px(x, y, "w");
	s.hline(0, 0, 16, "V").rect(0, 3, 16, 2, "r").hline(0, 5, 16, "R");
	s.rect(2, 8, 5, 6, "y").hline(3, 10, 3, "r").hline(3, 12, 2, "K");
	s.rect(9, 7, 5, 6, "p").hline(10, 9, 3, "u").hline(10, 11, 3, "r");
	return s;
};

/** オープンの冷蔵ケース（16x32。牛乳・とうふ。棚の奥が明るい）。 */
const reefer = () => {
	const s = sprite(16, 32);
	s.rect(0, 2, 16, 28, "l").hline(0, 2, 16, "p");
	s.rect(0, 4, 16, 2, "s");
	for (const [top, a, b] of [
		[7, "p", "u"],
		[13, "p", "p"],
		[19, "x", "f"],
	]) {
		s.rect(1, top, 14, 5, "d");
		for (let x = 2; x < 14; x += 3) s.rect(x, top + 1, 2, 4, x % 2 ? a : b).px(x, top + 1, "p");
		s.hline(1, top + 5, 14, "L");
	}
	s.rect(0, 25, 16, 5, "M").hline(0, 25, 16, "L");
	s.hline(0, 30, 16, "Q");
	return s;
};

/** 冷凍ケース（16x32。霜のついたガラス戸）。 */
const freezer = () => {
	const s = sprite(16, 32);
	s.rect(0, 2, 16, 28, "l").hline(0, 2, 16, "p");
	s.rect(1, 5, 14, 20, "N").vline(8, 5, 20, "l");
	for (let y = 6; y < 25; y++)
		for (let x = 1; x < 15; x++) if (hash(x, y, 50) < 0.18) s.px(x, y, "m");
	s.rect(2, 8, 5, 4, "s").rect(9, 14, 5, 4, "s");
	s.vline(7, 12, 5, "L").vline(9, 12, 5, "L");
	s.rect(0, 25, 16, 5, "M").hline(0, 25, 16, "L");
	s.hline(0, 30, 16, "Q");
	return s;
};

/** 陳列棚（16x32。色とりどりの商品）。 */
const gondola = () => {
	const s = sprite(16, 32);
	s.rect(0, 3, 16, 27, "L").hline(0, 3, 16, "l");
	const goods = ["r", "y", "u", "g", "p", "e", "R", "Y", "U"];
	for (const top of [5, 12, 19]) {
		s.rect(1, top, 14, 6, "M");
		let x = 1;
		while (x < 15) {
			const w = 2 + Math.floor(hash(x, top, 51) * 2);
			const h = 3 + Math.floor(hash(x, top, 52) * 3);
			s.rect(x, top + 6 - h, Math.min(w, 15 - x), h, goods[Math.floor(hash(x, top, 53) * goods.length)]);
			x += w;
		}
		s.hline(1, top + 6, 14, "p");
	}
	s.rect(0, 26, 16, 4, "M");
	s.hline(0, 30, 16, "Q");
	return s;
};

/** 惣菜のケース（コロッケ・煮物・卵焼き）。 */
const deliCase = () => {
	const s = sprite();
	s.rect(0, 2, 16, 13, "l").hline(0, 2, 16, "p");
	s.rect(1, 4, 14, 6, "m");
	s.rect(2, 5, 3, 4, "A").px(3, 6, "q");
	s.rect(6, 5, 4, 4, "g").px(7, 6, "G");
	s.rect(11, 5, 3, 4, "y").px(12, 6, "Y");
	s.rect(1, 11, 14, 3, "M").hline(1, 11, 14, "L");
	s.rect(12, 1, 3, 2, "y").px(13, 1, "r");
	return s;
};

/** 特売ワゴン（金網のかごに山盛り、赤い札）。 */
const wagon = () => {
	const s = sprite();
	s.rect(1, 6, 14, 7, "L").hline(1, 6, 14, "l");
	for (let x = 2; x < 15; x += 2) s.vline(x, 7, 5, "M");
	for (const [x, y, c] of [
		[3, 3, "y"],
		[6, 2, "r"],
		[9, 3, "u"],
		[12, 2, "g"],
		[5, 5, "p"],
		[10, 5, "e"],
	])
		s.rect(x, y, 3, 3, c);
	s.rect(5, 8, 6, 3, "r").hline(6, 9, 4, "p");
	s.px(2, 14, "K").px(13, 14, "K");
	return s;
};

/** 米袋の山。 */
const riceBags = () => {
	const s = sprite();
	for (const [x, y] of [
		[1, 7],
		[8, 7],
		[4, 2],
	]) {
		s.rect(x, y, 7, 6, "p").hline(x, y, 7, "x").hline(x, y + 5, 7, "P");
		s.hline(x + 2, y + 2, 3, "r").hline(x + 2, y + 3, 2, "g");
	}
	s.hline(1, 13, 14, "Q");
	return s;
};

/** 店内放送のスピーカー（柱にとりつけ）。 */
const speaker = () => {
	const s = sprite();
	s.vline(7, 6, 9, "M");
	s.rect(4, 1, 8, 6, "l").vline(4, 1, 6, "L").rect(6, 2, 4, 4, "d").px(7, 3, "M");
	s.hline(5, 15, 6, "Q");
	return s;
};

/** レジ台（左・レジ・右）。 */
const register = (part) => {
	const s = sprite();
	s.rect(0, 6, 16, 3, "l").hline(0, 6, 16, "p");
	s.rect(0, 9, 16, 5, "L").hline(0, 13, 16, "M");
	if (part === "left") s.vline(0, 6, 8, "M");
	if (part === "right") s.vline(15, 6, 8, "M");
	if (part === "mid") {
		s.rect(3, 1, 10, 6, "M").rect(4, 2, 8, 2, "d").hline(5, 2, 4, "g");
		s.rect(4, 5, 8, 1, "l");
	}
	return s;
};

/** ガチャガチャ（赤い台に丸いドーム）。 */
const gacha = () => {
	const s = sprite(16, 32);
	s.art(2, 4, [
		"...mmmmmm...",
		"..mrmmymm...",
		".mmmumpmmm..",
		".myrmmgmrm..",
		".mmgmpmmum..",
		"..mmmrmmm...",
		"...mmmmmm...",
	]);
	s.rect(3, 11, 10, 18, "r").vline(3, 11, 18, "R").hline(3, 11, 10, "p");
	s.rect(6, 14, 4, 4, "l").px(7, 15, "M").px(8, 16, "M");
	s.rect(5, 21, 6, 3, "d");
	s.rect(3, 29, 10, 1, "R").hline(3, 30, 10, "Q");
	return s;
};

/** 買いものかごの山。 */
const baskets = () => {
	const s = sprite();
	for (let i = 0; i < 4; i++) s.rect(3, 9 - i * 2, 10, 3, i % 2 ? "e" : "r").hline(3, 9 - i * 2, 10, i % 2 ? "E" : "R");
	s.rect(3, 12, 10, 2, "r").hline(4, 13, 8, "R");
	s.hline(3, 14, 10, "Q");
	return s;
};

/** 出口のマット。 */
const exitMat = () => {
	const s = sprite().rect(0, 0, 16, 16, "M");
	for (let y = 1; y < 16; y += 2) s.hline(1, y, 14, "d");
	s.rect(0, 0, 16, 1, "L");
	return s;
};

// ───────────────── シートに並べる（8列。16x32 は縦2マス） ─────────────────

// 地（床・壁・階段）以外の物には1画素の輪郭をつける。ジオラマ表示は色数が少ないので、
// 輪郭がないと床と同じ明るさの家具（机・棚）が床に溶ける
const LAYOUT = [
	// [c, r, sprite]
	[0, 0, woodFloor()],
	[1, 0, wallpaper("top")],
	[2, 0, wallpaper("bottom")],
	[3, 0, concreteWall("top")],
	[4, 0, concreteWall("bottom")],
	[5, 0, concreteFloor()],
	[6, 0, genkan()],
	[7, 0, stairsDown()],
	[0, 1, windowNight().outline()],
	[1, 1, poster().outline()],
	[2, 1, calendar().outline()],
	[3, 1, clock().outline()],
	[4, 1, bedTop().outline()],
	[5, 1, bedBottom().outline()],
	[6, 1, lowTable().outline()],
	[7, 1, kettleTable().outline()],
	[0, 2, crtTv().outline()],
	[1, 2, pcDesk().outline()],
	[2, 2, chair().outline()],
	[3, 2, diary().outline()],
	[4, 2, umbrellaStand().outline()],
	[5, 2, cushion().outline()],
	[6, 2, magazines().outline()],
	[7, 2, laundry().outline()],
	[4, 3, plant().outline()],
	[5, 3, boxes().outline()],
	[6, 3, trash().outline()],
	[7, 3, fan().outline()],
	[4, 4, railing()],
	[5, 4, extinguisher().outline()],
	[0, 3, bookshelf().outline()],
	[1, 3, steelDoor("p").outline()],
	[2, 3, steelDoor("P").outline()],
	[3, 3, mailbox().outline()],
	// スーパーみなみ（data/tiles.ts の SHOP）
	[6, 4, shopWallTop()],
	[7, 4, exitMat()],
	[0, 5, reefer().outline()],
	[1, 5, freezer().outline()],
	[2, 5, gondola().outline()],
	[3, 5, gacha().outline()],
	[4, 5, deliCase().outline()],
	[5, 5, wagon().outline()],
	[6, 5, riceBags().outline()],
	[7, 5, speaker().outline()],
	[4, 6, register("left").outline()],
	[5, 6, register("mid").outline()],
	[6, 6, register("right").outline()],
	[7, 6, baskets().outline()],
];

console.log(
	`home.png ${writeSheet(join(OUT, "home.png"), LAYOUT, PAL, 8, 7)}`,
);
