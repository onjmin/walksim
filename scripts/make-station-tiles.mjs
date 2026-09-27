// 自作のマップチップ（駅と終電）を作る（node scripts/make-station-tiles.mjs）。
//
//   public/assets/walksim/station.png … 16px チップのシート（8列）。data/tiles-station.ts の station(c, r) で切り出す
//
// 回線の間（hub）・終電（train）・きさらぎ駅（kisaragi）・供養スレ駅（terminus）の絵。
// 旧版（WOLF 風・RPGEN 風チップ）の文字の意味（通れる・通れない・何の絵か）は変えずに、
// 深夜の田舎の無人駅に置き換える：アルミとスチール・タイルの床・蛍光灯・古い琺瑯の看板・
// 砂利とレールと枕木・コンクリートのホーム（黄色い点字ブロックと白線）・通勤電車のロングシート。
// ジオラマ表示は色を場面パレットに置き換えるので、大事なのは形と明るさの段差。
// 物（地と壁以外）には1画素の輪郭をつける（make-town-tiles.mjs と同じ）。

import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { hash, sprite, writeSheet } from "./lib/pixel.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "public/assets/walksim");

const PAL = {
	K: "#1c1816", // 輪郭
	// ホームのコンクリート
	c: "#8e8c86",
	C: "#7a7872",
	j: "#a4a29a",
	J: "#64625c",
	// ホームの壁面（暗いコンクリート）
	d: "#5c5a55",
	D: "#46443f",
	e: "#727069",
	// 砂利（バラスト）
	g: "#5e5852",
	G: "#45403b",
	h: "#7a746c",
	u: "#908878",
	// 枕木
	w: "#5c4838",
	W: "#443428",
	7: "#76604c",
	// 鉄（レール・柱・枠）
	r: "#8a8e94",
	R: "#5a5e64",
	9: "#b8bcc2",
	0: "#3e4248",
	// 点字ブロック
	y: "#c4a648",
	Y: "#9c8236",
	// 白（白線・紙・琺瑯）
	x: "#e8e6de",
	X: "#c4c2ba",
	// 待合室のしっくい壁
	p: "#cfc7b0",
	P: "#b8b09a",
	5: "#a29a84",
	// 腰壁（くすんだ緑）
	v: "#6a7466",
	V: "#56604f",
	// 待合室の床（テラゾー）
	f: "#a09a8c",
	F: "#8a8476",
	6: "#b2ac9e",
	// 夜のガラス
	q: "#1e2632",
	Q: "#34404e",
	m: "#7a90a8",
	// 灯り（蛍光灯・常夜灯）
	t: "#fff6d8",
	L: "#f4ecc8",
	T: "#e8c890",
	H: "#c8a870",
	// 電光板の橙
	o: "#d88838",
	O: "#8a4a1c",
	// 赤（信号・縞）
	z: "#b83a32",
	Z: "#7a2622",
	// 座席のモケット
	s: "#4a6470",
	S: "#384e58",
	8: "#5e7a86",
	// 車内の化粧板
	n: "#c6cabe",
	N: "#aab0a4",
	4: "#8e9488",
	// 車内の床
	a: "#6c7076",
	A: "#5a5e64",
	1: "#7e8288",
	// 草
	i: "#5e7048",
	I: "#46563a",
	// 扉の鉄板（緑がかった灰）
	b: "#5e6862",
	B: "#4c5650",
	3: "#727e76",
	// 公衆電話の緑
	k: "#5e7a62",
	2: "#4a6250",
	// ベンチの座面（樹脂）
	"@": "#9a6848",
	"%": "#7a5036",
	"&": "#b07e5a",
};

/** 16×16 を ch の地で塗り、ノイズで点を散らす。 */
const noise = (base, spots, seed, w = 16, h = 16) => {
	const s = sprite(w, h);
	for (let y = 0; y < h; y++)
		for (let x = 0; x < w; x++) {
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

// ───────────────── ホームと線路の地 ─────────────────

/** ホームのコンクリート（継ぎ目つき）。 */
const platform = () => {
	const s = noise("c", [
		["C", 0.08],
		["j", 0.05],
		["J", 0.02],
	], 101);
	s.vline(0, 0, 16, "C").hline(0, 15, 16, "C");
	return s;
};

/** ホームの端：点字ブロック（点の並び）→ コンクリート → 白線 → 縁石。 */
const platformEdge = () => {
	const s = platform();
	s.rect(0, 2, 16, 6, "y");
	for (let y = 3; y < 7; y += 2) for (let x = 1; x < 16; x += 2) s.px(x, y, "Y");
	s.hline(0, 2, 16, "Y").hline(0, 7, 16, "Y");
	s.rect(0, 11, 16, 2, "x").hline(0, 13, 16, "X");
	s.rect(0, 14, 16, 2, "j").hline(0, 15, 16, "C");
	return s;
};

/** ホームの壁面（線路から見上げる側面）。上に縁石のかげ、下は砂利にうもれる。 */
const platformWall = () => {
	const s = noise("d", [
		["D", 0.1],
		["e", 0.05],
	], 102);
	s.rect(0, 0, 16, 2, "e").hline(0, 2, 16, "K").hline(0, 3, 16, "D");
	s.vline(0, 3, 13, "D").vline(8, 4, 8, "D");
	// しみ（雨だれ）
	s.vline(4, 4, 5, "D").vline(12, 4, 3, "D");
	// 足もとの砂利
	for (let x = 0; x < 16; x++) {
		const r = hash(x, 0, 103);
		s.px(x, 15, r < 0.5 ? "g" : "G");
		if (r < 0.35) s.px(x, 14, "h");
	}
	return s;
};

/** ホームから線路へ降りる段（コンクリートの3段・両わきに壁）。 */
const steps = () => {
	const s = sprite();
	for (let i = 0; i < 3; i++) {
		const y = 1 + i * 5;
		s.rect(2, y, 12, 3, i === 0 ? "j" : "c");
		s.rect(2, y + 3, 12, 2, "C").hline(2, y + 4, 12, "J");
	}
	s.rect(0, 0, 2, 16, "d").vline(1, 0, 16, "D");
	s.rect(14, 0, 2, 16, "d").vline(14, 0, 16, "e");
	s.hline(0, 0, 16, "e");
	return s;
};

/** 砂利（バラスト）。 */
const gravel = (seed = 104) => {
	const s = noise("g", [
		["G", 0.2],
		["h", 0.12],
		["u", 0.04],
	], seed);
	// ところどころの大きめの石（明るい頭と暗い下）
	for (let k = 0; k < 6; k++) {
		const x = Math.floor(hash(k, 1, seed) * 15);
		const y = Math.floor(hash(k, 2, seed) * 15);
		s.px(x, y, "u").px(x + 1, y, "h").px(x, y + 1, "G").px(x + 1, y + 1, "G");
	}
	return s;
};

/** 線路：砂利に枕木（縦）とレール（横）1本。2段かさねて1組の軌道になる。 */
const track = () => {
	const s = gravel(105);
	for (const x0 of [1, 9]) {
		s.rect(x0, 0, 4, 16, "w").vline(x0, 0, 16, "7").vline(x0 + 3, 0, 16, "W");
		for (let y = 2; y < 16; y += 5) s.px(x0 + 1 + (y % 2), y, "W");
	}
	// レール（頭が光る）と、枕木の上の留め具
	s.hline(0, 6, 16, "9").hline(0, 7, 16, "r").hline(0, 8, 16, "R").hline(0, 9, 16, "0");
	for (const x0 of [1, 9]) s.px(x0 + 1, 9, "K").px(x0 + 2, 9, "K").px(x0 + 1, 5, "R");
	return s;
};

/** 終点の線路の名残（草にうもれた枕木と2本のレール・さび）。 */
const trackOld = () => {
	const s = gravel(106);
	for (const x0 of [2, 10]) {
		s.rect(x0, 1, 4, 14, "W").vline(x0, 1, 14, "w");
		s.px(x0 + 2, 4, "G").px(x0 + 1, 10, "G");
	}
	for (const y of [4, 11]) {
		s.hline(0, y, 16, "r").hline(0, y + 1, 16, "R").hline(0, y + 2, 16, "0");
		for (let x = 0; x < 16; x++) if (hash(x, y, 107) < 0.2) s.px(x, y, "O");
	}
	// 草の房
	for (const [x, y] of [
		[0, 8],
		[7, 1],
		[13, 7],
		[6, 14],
	]) {
		s.px(x, y, "i").px(x + 1, y - 1, "i").px(x + 2, y, "I").px(x + 1, y, "I");
	}
	return s;
};

/** 向かいのホームの縁（線路の向こう側。縁石・白線・点字ブロック）。 */
const oppEdge = () => {
	const s = platform();
	s.hline(0, 0, 16, "K").rect(0, 1, 16, 2, "j");
	s.rect(0, 3, 16, 2, "x").hline(0, 5, 16, "X");
	s.rect(0, 8, 16, 6, "y");
	for (let y = 9; y < 13; y += 2) for (let x = 1; x < 16; x += 2) s.px(x, y, "Y");
	s.hline(0, 8, 16, "Y").hline(0, 13, 16, "Y");
	return s;
};

// ───────────────── 待合室（回線の間）の地と壁 ─────────────────

/** 待合室の床（テラゾーの8画素角タイル。目地と、石粒の点）。 */
const hubFloor = () => {
	const s = sprite();
	for (let y = 0; y < 16; y++)
		for (let x = 0; x < 16; x++) {
			const tile = ((x >> 3) + (y >> 3)) % 2;
			let ch = tile ? "f" : "6";
			const r = hash(x, y, 111);
			if (r < 0.08) ch = "F";
			else if (r > 0.95) ch = tile ? "6" : "f";
			s.px(x, y, ch);
		}
	s.hline(0, 0, 16, "F").hline(0, 8, 16, "F").vline(0, 0, 16, "F").vline(8, 0, 16, "F");
	return s;
};

/** 待合室の壁（上段）。しっくいに、蛍光灯の器具がならぶ。 */
const hubWallUp = () => {
	const s = noise("p", [
		["P", 0.06],
		["5", 0.01],
	], 112);
	s.hline(0, 0, 16, "5");
	s.rect(1, 5, 14, 3, "9").hline(1, 7, 14, "R");
	s.hline(2, 6, 12, "t").hline(2, 5, 12, "L");
	s.vline(4, 1, 4, "R").vline(11, 1, 4, "R");
	return s;
};

/** 待合室の壁（下段）。しっくいの下に緑の腰壁と幅木。 */
const hubWallLo = () => {
	const s = noise("p", [
		["P", 0.06],
		["5", 0.01],
	], 113);
	s.rect(0, 7, 16, 7, "v").hline(0, 7, 16, "5").hline(0, 8, 16, "V");
	for (let x = 0; x < 16; x += 8) s.vline(x, 9, 5, "V");
	s.rect(0, 14, 16, 2, "D").hline(0, 14, 16, "d");
	return s;
};

// ───────────────── 車内（終電） ─────────────────

/** 車内の床（ゴムの床に細かな粒）。 */
const trainFloor = () => {
	const s = noise("a", [
		["A", 0.12],
		["1", 0.06],
	], 121);
	s.hline(0, 15, 16, "A");
	return s;
};

/** 車内の壁（化粧板）。上に網棚、つり革が2つ下がる。 */
const trainWallBase = () => {
	const s = noise("n", [["N", 0.05]], 122);
	s.rect(0, 0, 16, 3, "R").hline(0, 0, 16, "9").hline(0, 1, 16, "r");
	for (let x = 1; x < 16; x += 2) s.px(x, 2, "0");
	s.rect(0, 13, 16, 3, "4").hline(0, 13, 16, "N");
	return s;
};
const straps = (s) => {
	for (const x of [4, 12]) {
		s.vline(x, 3, 4, "X");
		s.px(x - 1, 7, "9").px(x + 1, 7, "9").px(x - 1, 8, "9").px(x + 1, 8, "9");
		s.px(x, 6, "x").px(x, 9, "9");
		s.px(x - 1, 9, "R").px(x + 1, 9, "R");
	}
	return s;
};
const trainWall = () => straps(trainWallBase());

/** 車窓（夜。暗いガラスに車内の蛍光灯の映りこみ）。 */
const trainWindow = () => {
	const s = trainWallBase();
	s.rect(1, 3, 14, 10, "9").rect(2, 4, 12, 8, "q");
	s.hline(2, 4, 12, "Q").vline(8, 4, 8, "r");
	s.hline(3, 6, 4, "Q").hline(10, 9, 3, "Q");
	s.px(11, 7, "m").px(5, 10, "Q");
	s.hline(1, 12, 14, "R");
	return straps(s);
};

/** 路線図・中づり（化粧板に白い札。線と駅の点、とちゅうから読めない字）。 */
const trainAd = () => {
	const s = trainWallBase();
	s.rect(2, 3, 12, 9, "x").hline(2, 11, 12, "X").vline(13, 3, 9, "X");
	s.hline(3, 6, 10, "z");
	for (const x of [4, 7, 10]) s.px(x, 5, "0").px(x, 7, "0");
	s.px(12, 5, "X").px(12, 7, "X");
	s.hline(3, 9, 4, "4").hline(8, 9, 3, "X");
	return straps(s);
};

/** ロングシート（背もたれと座面。縦のひだ・座面のふち・下のかげ。1マスに2人ぶん）。 */
const trainSeat = () => {
	const s = sprite();
	s.rect(0, 2, 16, 5, "S").hline(0, 2, 16, "s");
	s.rect(0, 7, 16, 5, "s").hline(0, 7, 16, "8").hline(0, 8, 16, "8");
	for (let x = 1; x < 16; x += 4) {
		s.vline(x, 3, 4, "0");
		s.vline(x, 9, 3, "S");
	}
	s.vline(8, 2, 10, "K");
	s.hline(0, 12, 16, "S").hline(0, 13, 16, "R").hline(0, 14, 16, "0");
	return s;
};

/** 車両の端の扉（16x32。ステンレスに縦長の窓）。 */
const trainDoor = () => {
	const s = sprite(16, 32);
	s.rect(0, 0, 16, 32, "4").vline(0, 0, 32, "R").vline(15, 0, 32, "R");
	s.rect(2, 3, 12, 28, "9").vline(2, 3, 28, "r").vline(13, 3, 28, "R");
	s.rect(4, 6, 8, 12, "q").hline(4, 6, 8, "0").rect(5, 8, 2, 4, "Q");
	s.px(9, 14, "m");
	s.rect(11, 20, 1, 4, "0");
	s.rect(2, 28, 12, 3, "r").hline(2, 30, 12, "R");
	s.hline(0, 31, 16, "0");
	return s;
};

// ───────────────── 待合室の物 ─────────────────

/** 時刻表のわく（なにも貼られていない。中だけほこりが無い）。 */
const timetableFrame = () => {
	const s = sprite();
	s.rect(2, 1, 12, 12, "r").rect(3, 2, 10, 10, "x");
	s.hline(2, 1, 12, "9").hline(2, 12, 12, "R");
	s.rect(3, 2, 10, 1, "X").px(3, 3, "X");
	return s.outline();
};

/** はり紙（顔の部分だけ、やぶりとられている）。 */
const notice = () => {
	const s = sprite();
	s.rect(3, 1, 10, 13, "x").vline(12, 1, 13, "X");
	s.hline(4, 2, 8, "0").hline(5, 3, 6, "0");
	s.rect(5, 5, 6, 5, "p").art(5, 5, ["P.PP.P", ".P..P.", "P....P", ".P.P..", "P.P.PP"]);
	s.hline(4, 11, 7, "X").hline(4, 12, 5, "X");
	s.px(3, 1, "y").px(12, 1, "y");
	return s.outline();
};

/** 駅の時計（16x32。壁の上のほうに腕木で下がる。2:00 のまま）。 */
const stationClock = () => {
	const s = sprite(16, 32);
	s.rect(7, 0, 2, 3, "R");
	for (let y = 3; y < 17; y++)
		for (let x = 1; x < 15; x++) {
			const d = Math.hypot(x - 7.5, y - 9.5);
			if (d < 6.6) s.px(x, y, d > 5.4 ? "R" : d > 4.6 ? "9" : "x");
		}
	for (const [x, y] of [
		[7, 5],
		[12, 9],
		[7, 14],
		[3, 9],
	])
		s.px(x, y, "0");
	s.vline(7, 6, 4, "K");
	s.px(8, 9, "K").px(9, 8, "K").px(10, 8, "K");
	return s.outline();
};

/** 駅のベンチ（樹脂の座面が2つずつ・鉄の脚。左右の2マス）。 */
const bench = (side) => {
	const s = sprite();
	for (const x0 of [1, 9]) {
		s.rect(x0, 3, 6, 4, "%").hline(x0, 3, 6, "@");
		s.rect(x0, 7, 6, 3, "@").hline(x0, 7, 6, "&");
	}
	s.rect(0, 10, 16, 2, "r").hline(0, 11, 16, "R");
	const leg = side === "left" ? 2 : 13;
	s.vline(leg, 12, 3, "0").hline(leg - 1, 14, 3, "0");
	if (side === "left") s.vline(0, 4, 8, "R");
	else s.vline(15, 4, 8, "R");
	return s.outline();
};

/** 自動改札機（上に電光板の『回送』）。 */
const ticketGate = () => {
	const s = sprite();
	s.rect(3, 5, 10, 10, "X").vline(3, 5, 10, "r").hline(3, 5, 10, "x");
	s.rect(4, 6, 8, 2, "9");
	s.rect(4, 1, 8, 4, "0").hline(5, 2, 6, "O");
	for (const x of [5, 7, 9]) s.px(x, 3, "o");
	s.rect(5, 9, 5, 2, "Q").px(6, 9, "m");
	s.rect(12, 8, 2, 4, "R");
	s.hline(3, 14, 10, "R");
	return s.outline();
};

/** 北の扉（16x32。すりガラスの鉄の扉と、上の札）。 */
const northDoor = () => {
	const s = sprite(16, 32);
	s.rect(1, 8, 14, 23, "r").hline(1, 8, 14, "9");
	s.rect(2, 10, 12, 21, "b").vline(2, 10, 21, "3").vline(13, 10, 21, "B");
	s.rect(4, 12, 8, 8, "X").rect(5, 13, 6, 6, "p").px(5, 13, "x").px(6, 14, "x");
	s.rect(11, 21, 2, 2, "9");
	s.hline(2, 29, 12, "B");
	s.rect(4, 3, 8, 3, "x").hline(5, 4, 6, "0");
	return s.outline();
};

/** 開かないエレベーター（16x32。ステンレスの両開き。階の表示は消えていて、ボタンは無い）。 */
const elevator = () => {
	const s = sprite(16, 32);
	s.rect(0, 7, 16, 25, "R").hline(0, 7, 16, "r");
	s.rect(1, 10, 14, 21, "9").vline(7, 10, 21, "R").vline(8, 10, 21, "r");
	s.vline(1, 10, 21, "r").vline(14, 10, 21, "r");
	s.vline(4, 11, 18, "x").vline(11, 11, 18, "x");
	s.rect(4, 3, 8, 3, "0").px(6, 4, "O").px(9, 4, "O");
	s.hline(1, 30, 14, "R");
	return s.outline();
};

/** 南口のガラス戸（16x32。上下のマスに分けて使う。外はまっくら）。 */
const exitDoor = () => {
	const s = sprite(16, 32);
	s.rect(2, 4, 12, 3, "0").hline(3, 5, 4, "x").hline(8, 5, 4, "y");
	s.rect(2, 8, 12, 23, "9").vline(2, 8, 23, "r").vline(13, 8, 23, "R");
	s.rect(3, 9, 4, 20, "q").rect(9, 9, 4, 20, "q");
	s.vline(7, 9, 20, "r").vline(8, 9, 20, "R");
	s.rect(3, 10, 2, 5, "Q").px(10, 12, "Q");
	s.px(6, 19, "x").px(9, 19, "x");
	s.hline(2, 30, 12, "R");
	return s.outline();
};

/** 売店（16x32。上は『売店』の看板の箱、下はおりたシャッター。左・中・右）。 */
const kiosk = (part) => {
	const s = sprite(16, 32);
	const x0 = part === "left" ? 1 : 0;
	const x1 = part === "right" ? 15 : 16;
	const w = x1 - x0;
	s.rect(x0, 6, w, 7, "0").hline(x0, 6, w, "R");
	if (part === "mid") s.rect(3, 8, 10, 3, "o").hline(4, 9, 3, "x").hline(9, 9, 3, "x");
	else s.hline(x0 + 1, 9, w - 2, "O");
	s.rect(x0, 13, w, 11, "r");
	for (let y = 14; y < 24; y += 2) s.hline(x0, y, w, "R");
	if (part === "mid") s.rect(5, 16, 6, 3, "x").hline(6, 17, 4, "X");
	s.rect(x0, 24, w, 6, "X").hline(x0, 24, w, "x").hline(x0, 29, w, "5");
	if (part === "left") s.vline(1, 6, 24, "R");
	if (part === "right") s.vline(14, 6, 24, "R");
	return s.outline();
};

/** 床にかかれた白い円（チョーク）。 */
const chalkCircle = () => {
	const s = sprite();
	for (let y = 0; y < 16; y++)
		for (let x = 0; x < 16; x++) {
			const d = Math.hypot(x - 7.5, (y - 8.5) * 1.35);
			if (d > 5.2 && d < 6.6 && hash(x, y, 131) < 0.85) s.px(x, y, d < 6 ? "x" : "X");
		}
	return s;
};

// ───────────────── ホームの物（きさらぎ・終点） ─────────────────

/** 信号灯（地上の小さな信号。赤いレンズ）。 */
const signalLight = () => {
	const s = sprite();
	s.rect(7, 8, 2, 7, "R").vline(7, 8, 7, "r");
	s.rect(4, 1, 8, 7, "0").hline(4, 1, 8, "R");
	s.rect(6, 3, 4, 3, "z").px(6, 3, "Z").px(8, 4, "x");
	s.hline(5, 15, 6, "D");
	return s.outline();
};

/** そなえた花（ワンカップの瓶に一輪）。 */
const flower = () => {
	const s = sprite();
	s.rect(6, 10, 4, 5, "X").vline(6, 10, 5, "x").hline(6, 12, 4, "m");
	s.vline(8, 5, 6, "i").px(9, 7, "I").px(10, 6, "i");
	s.art(6, 2, [".x.x.", "xxyxx", ".xXx."]);
	return s.outline();
};

/** 小さな墓標（風化した石）。 */
const grave = () => {
	const s = sprite();
	s.rect(5, 3, 6, 9, "e").hline(5, 3, 6, "j").vline(10, 3, 9, "d");
	s.px(7, 5, "D").px(7, 6, "D").px(8, 8, "D");
	s.px(6, 10, "i").px(5, 11, "i");
	s.rect(3, 12, 10, 3, "d").hline(3, 12, 10, "e").hline(3, 14, 10, "D");
	return s.outline();
};

/** 車止め（黄と黒の縞の横木を、レールを曲げた脚が支える）。 */
const bufferStop = () => {
	const s = sprite();
	s.vline(3, 7, 8, "R").vline(12, 7, 8, "R");
	s.px(4, 11, "R").px(5, 12, "R").px(11, 11, "R").px(10, 12, "R");
	s.rect(1, 3, 14, 4, "y");
	for (let x = 1; x < 15; x++) for (let y = 3; y < 7; y++) if ((x + y) % 4 < 2) s.px(x, y, "0");
	s.hline(1, 3, 14, "x").hline(1, 7, 14, "K");
	s.px(8, 2, "z").px(7, 2, "Z");
	return s.outline();
};

/** ホームの柱（16x32。鉄の柱にペンキ、足もとの台）。 */
const pillar = () => {
	const s = sprite(16, 32);
	s.rect(6, 0, 4, 29, "9").vline(6, 0, 29, "r").vline(9, 0, 29, "R");
	s.vline(7, 0, 29, "x");
	s.rect(6, 12, 4, 3, "z").hline(6, 14, 4, "Z");
	s.rect(4, 28, 8, 3, "C").hline(4, 28, 8, "j");
	return s.outline();
};

/** 駅員室のシャッター（16x32。『駅員室』の札と、おりたシャッター）。 */
const officeShutter = () => {
	const s = sprite(16, 32);
	s.rect(0, 3, 16, 7, "d").hline(0, 3, 16, "e");
	s.rect(3, 5, 10, 3, "x").hline(4, 6, 8, "0");
	s.rect(1, 10, 14, 21, "r");
	for (let y = 11; y < 31; y += 2) s.hline(1, y, 14, "R");
	s.rect(6, 27, 4, 2, "0");
	s.vline(0, 10, 21, "D").vline(15, 10, 21, "D");
	s.hline(0, 31, 16, "D");
	return s.outline();
};

/** 公衆電話（16x32。台の上の緑の電話と、小さなひさし）。 */
const phoneStand = () => {
	const s = sprite(16, 32);
	s.rect(2, 4, 12, 2, "r").hline(2, 4, 12, "9");
	s.rect(3, 6, 10, 10, "k").vline(3, 6, 10, "2").vline(12, 6, 10, "2");
	s.rect(4, 7, 3, 7, "2").vline(5, 8, 5, "k");
	s.rect(8, 8, 3, 2, "Q").rect(8, 11, 3, 3, "X");
	s.rect(2, 16, 12, 2, "R").hline(2, 16, 12, "9");
	s.rect(7, 18, 2, 12, "R").vline(7, 18, 12, "r");
	s.hline(5, 30, 6, "0");
	return s.outline();
};

/** ホームの掲示板（16x32。緑の板に画鋲だけ）。 */
const noticeBoard = () => {
	const s = sprite(16, 32);
	s.rect(1, 5, 14, 13, "w").rect(2, 6, 12, 11, "v").hline(1, 5, 14, "7");
	for (const [x, y] of [
		[4, 8],
		[9, 7],
		[11, 12],
		[5, 14],
		[8, 11],
		[12, 9],
	])
		s.px(x, y, "x");
	s.rect(3, 9, 3, 3, "V");
	s.vline(3, 18, 12, "W").vline(12, 18, 12, "W");
	s.hline(2, 30, 3, "D").hline(11, 30, 3, "D");
	return s.outline();
};

/** ホームの電灯・常夜灯（16x32。細い柱に笠つきの灯り）。 */
const platformLamp = () => {
	const s = sprite(16, 32);
	s.rect(7, 4, 2, 26, "R").vline(7, 4, 26, "r");
	s.rect(3, 2, 10, 2, "0").hline(4, 1, 8, "R");
	s.rect(4, 4, 8, 2, "t").hline(5, 6, 6, "L");
	s.rect(5, 29, 6, 2, "C");
	return s.outline();
};

/** 駅名標（16x32。白い琺瑯の板に名前、下の帯にとなりの駅名＝空欄）。 */
const nameSign = () => {
	const s = sprite(16, 32);
	s.vline(3, 16, 15, "R").vline(12, 16, 15, "R");
	s.rect(0, 4, 16, 13, "x").hline(0, 4, 16, "9").vline(15, 4, 13, "X");
	s.art(2, 6, [".0...0..0..0", "000.00.000.0", ".0...0..0.0.", "00..0..00..0"]);
	s.rect(0, 12, 16, 4, "V").hline(1, 13, 5, "v").hline(10, 13, 5, "v");
	s.hline(0, 16, 16, "X");
	return s.outline();
};

/** かたむいた看板（16x32。一本足で右に傾き、さびている）。 */
const tiltedSign = () => {
	const s = sprite(16, 32);
	for (let y = 16; y < 31; y++) s.px(6 + Math.floor((30 - y) / 6), y, "W");
	for (let j = 0; j < 9; j++) {
		const off = Math.floor(j / 3);
		s.hline(2 + off, 7 + j, 11, j === 0 ? "j" : "X");
	}
	s.art(5, 10, ["0.00.0", ".0..00"]);
	s.px(3, 9, "O").px(4, 14, "O").px(12, 8, "O").px(13, 13, "O").px(9, 15, "O");
	return s.outline();
};

/** 待合室の扉（16x32。木の枠のガラス戸。中の灯りですりガラスがあたたかい）。 */
const waitingDoor = () => {
	const s = sprite(16, 32);
	s.rect(1, 8, 14, 23, "w").hline(1, 8, 14, "7");
	s.rect(3, 10, 4, 18, "T").rect(9, 10, 4, 18, "T");
	s.hline(3, 16, 10, "w").hline(3, 22, 10, "w").vline(7, 10, 18, "W").vline(8, 10, 18, "w");
	s.rect(3, 10, 4, 2, "L").rect(9, 10, 4, 2, "L").px(4, 13, "H").px(11, 19, "H");
	s.hline(1, 30, 14, "W");
	return s.outline();
};

/** 時刻表（32x32 を左右2マスに。白い板に罫線だけ、なにも書かれていない）。 */
const timetable = () => {
	const s = sprite(32, 32);
	s.rect(2, 4, 28, 22, "r").hline(2, 4, 28, "9");
	s.rect(3, 6, 26, 19, "x");
	s.rect(3, 6, 26, 2, "V").hline(8, 6, 16, "v");
	for (let y = 10; y < 25; y += 3) s.hline(3, y, 26, "X");
	s.vline(15, 8, 17, "X").vline(16, 8, 17, "X");
	s.hline(2, 25, 28, "R");
	return s.outline();
};
/** 32 幅の絵の左半分・右半分。 */
const half = (src, side) => {
	const s = sprite(16, src.h);
	const ox = side === "left" ? 0 : 16;
	for (let y = 0; y < src.h; y++) for (let x = 0; x < 16; x++) s.cells[y][x] = src.cells[y][x + ox];
	return s;
};

// ───────────────── シートに並べる ─────────────────

const EXIT = exitDoor();
const TT = timetable();
const LAYOUT = [
	// 0 行：ホームと線路の地
	[0, 0, platform()],
	[1, 0, platformEdge()],
	[2, 0, platformWall()],
	[3, 0, steps()],
	[4, 0, gravel()],
	[5, 0, track()],
	[6, 0, trackOld()],
	[7, 0, oppEdge()],
	// 1 行：待合室と車内の地・壁
	[0, 1, hubFloor()],
	[1, 1, hubWallUp()],
	[2, 1, hubWallLo()],
	[3, 1, trainFloor()],
	[4, 1, trainWall()],
	[5, 1, trainWindow()],
	[6, 1, trainAd()],
	[7, 1, trainSeat().outline()],
	// 2・3 行：16x16 の物
	[0, 2, timetableFrame()],
	[1, 2, notice()],
	[2, 2, bench("left")],
	[3, 2, bench("right")],
	[4, 2, ticketGate()],
	[5, 2, chalkCircle()],
	[6, 2, signalLight()],
	[7, 2, flower()],
	[0, 3, grave()],
	[1, 3, bufferStop()],
	// 4・5 行：16x32 の物（待合室・車内）
	[0, 4, stationClock()],
	[1, 4, northDoor()],
	[2, 4, elevator()],
	[3, 4, EXIT],
	[4, 4, kiosk("left")],
	[5, 4, kiosk("mid")],
	[6, 4, kiosk("right")],
	[7, 4, trainDoor()],
	// 6・7 行：16x32 の物（ホーム）
	[0, 6, nameSign()],
	[1, 6, tiltedSign()],
	[2, 6, pillar()],
	[3, 6, officeShutter()],
	[4, 6, phoneStand()],
	[5, 6, noticeBoard()],
	[6, 6, platformLamp()],
	[7, 6, waitingDoor()],
	// 8・9 行：終点の時刻表（左右）
	[0, 8, half(TT, "left")],
	[1, 8, half(TT, "right")],
];

console.log(
	`station.png ${writeSheet(join(OUT, "station.png"), LAYOUT, PAL, 8, 10)}`,
);
