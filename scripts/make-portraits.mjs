// ジオラマ表示の立ち絵（胸像のドット絵 48x48）を作る（node scripts/make-portraits.mjs）。
//
//   public/portraits-dot/<キャラid>.png
//
// 顔・目・前髪・後ろ髪・服・小物を部品にして組み合わせるので、全員が同じ絵柄になる。
// 色は歩行グラ（public/sprites）と cast.ts のキャラ色から。表示するときに場面パレットへ落とし、
// ディザと輪郭をかける（engine/diorama.ts の stylize）ので、ここでは明るさの段差が大事。
// 作者が描いたドット立ち絵を同じ名前で置けば、そちらに差し替わる（このスクリプトで上書きしないよう注意）。
// 八尺様（？？？）は立ち絵を出さない（顔を見せない）。

import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { sprite, writeSheet } from "./lib/pixel.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "public/portraits-dot");
const N = 48;

const BASE_PAL = {
	K: "#1a1418",
	s: "#f4d8c4", // 肌
	S: "#d8b098",
	p: "#f0a0a0", // ほお
	x: "#ffffff",
	R: "#b0505a", // 口
	d: "#2a2a30",
};

/** 楕円を塗る。 */
const ellipse = (s, cx, cy, rx, ry, c) => {
	for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++)
		for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
			const dx = (x + 0.5 - cx) / rx;
			const dy = (y + 0.5 - cy) / ry;
			if (dx * dx + dy * dy <= 1) s.px(x, y, c);
		}
};

/**
 * 胸像を1枚描く。o の中身:
 *   hair: "bob" | "long" | "short" | "mush" | "bun" | "none" | "back"
 *   tails: "twin" | "pony" | "drill"  bangs: "even" | "cover" | "side"
 *   eyes: "normal" | "sleepy" | "jito" | "none"  mouth: "smile" | "open" | "flat"
 *   extra(s): 小物を描く関数（最後に呼ぶ）  collar: 襟の色（x など）
 */
const bust = (o) => {
	const s = sprite(N, N);
	const cx = 24;
	// 後ろ髪
	if (o.hair !== "none") {
		ellipse(s, cx, 19, 11.5, 11, "h");
		if (o.hair === "long" || o.hair === "back") {
			s.rect(13, 19, 22, 24, "h");
			s.rect(13, 36, 22, 7, "H");
		}
		if (o.hair === "bob") s.rect(13, 19, 22, 12, "h").hline(13, 30, 22, "H");
		if (o.hair === "mush") s.rect(13, 19, 22, 7, "h");
		if (o.tails === "twin") {
			ellipse(s, 9, 30, 4, 12, "h");
			ellipse(s, 39, 30, 4, 12, "h");
			ellipse(s, 9, 37, 3, 5, "H");
			ellipse(s, 39, 37, 3, 5, "H");
		}
		if (o.tails === "drill") {
			for (let i = 0; i < 4; i++) {
				ellipse(s, 11, 24 + i * 5, 3.5 - i * 0.4, 2.8, i % 2 ? "H" : "h");
				ellipse(s, 37, 24 + i * 5, 3.5 - i * 0.4, 2.8, i % 2 ? "H" : "h");
			}
		}
		if (o.tails === "pony") {
			ellipse(s, 37, 22, 5, 9, "h");
			s.rect(36, 26, 6, 18, "h").vline(41, 26, 18, "H");
		}
		if (o.hair === "bun") ellipse(s, cx, 7, 5, 4, "h");
	}
	// 体（肩と服）
	for (let y = 34; y < N; y++) {
		const half = Math.min(19, 9 + (y - 34) * 1.3);
		s.hline(Math.round(cx - half), y, Math.round(half * 2), "c");
		s.px(Math.round(cx - half), y, "C").px(Math.round(cx + half) - 1, y, "C");
	}
	s.rect(21, 30, 6, 5, "S");
	if (o.collar) {
		s.art(17, 34, [
			"..cc....cc..",
			"...cc..cc...",
		].map((r) => r.replaceAll("c", o.collar)));
		s.px(23, 35, o.collar).px(24, 35, o.collar);
	}
	// 顔
	if (o.hair !== "back") {
		ellipse(s, cx, 22, 8.5, 9.5, "s");
		s.hline(17, 30, 14, "S");
		// 目
		const eyeY = 22;
		for (const ex of [18, 27]) {
			if (o.eyes === "sleepy") s.hline(ex, eyeY + 1, 3, "K");
			else if (o.eyes === "jito") {
				s.hline(ex, eyeY, 3, "K").hline(ex, eyeY + 1, 3, "K");
				s.rect(ex + 1, eyeY + 2, 2, 1, "e");
			} else if (o.eyes !== "none") {
				s.hline(ex, eyeY - 1, 3, "K");
				s.rect(ex, eyeY, 3, 3, "e");
				s.px(ex, eyeY, "x").px(ex + 2, eyeY + 2, "E");
			}
		}
		if (o.eyes !== "none") {
			s.px(17, 27, "p").px(18, 27, "p").px(29, 27, "p").px(30, 27, "p");
		}
		if (o.mouth === "open") s.rect(23, 27, 3, 2, "R").px(24, 28, "p");
		else if (o.mouth === "smile") s.px(22, 27, "R").hline(23, 28, 2, "R").px(25, 27, "R");
		else if (o.mouth === "flat") s.hline(23, 28, 2, "R");
	}
	// 前髪
	if (o.hair !== "none" && o.hair !== "back") {
		const bottom = (x) => {
			if (o.bangs === "cover" && x >= 25) return 25 + (x % 2);
			if (o.bangs === "side") return x < 22 ? 19 - ((x + 1) % 2) : 15 + (x % 3 === 0 ? 1 : 0);
			return 17 + [0, 1, 2, 1][x % 4];
		};
		for (let x = 14; x <= 34; x++) {
			const top = 10;
			const dx = (x + 0.5 - cx) / 11.5;
			if (dx * dx > 1) continue;
			const b = Math.min(bottom(x), o.hair === "mush" ? 20 : 30);
			for (let y = top; y < b; y++) {
				const dy = (y + 0.5 - 19) / 11;
				if (dx * dx + dy * dy <= 1.08) s.px(x, y, "h");
			}
		}
		// つや
		s.hline(18, 12, 4, "j").hline(26, 12, 3, "j").px(17, 13, "j");
	}
	if (o.hair === "back") {
		// 後ろ姿：頭は髪だけ。髪の分け目
		s.vline(cx, 9, 12, "H");
		s.hline(20, 14, 9, "j");
	}
	for (const f of [o.extra].flat().filter(Boolean)) f(s);
	return s.outline("K");
};

// ───────────────── 小物 ─────────────────

const ribbon = (s) => {
	// 大きなリボン（頭の左上。キリコ）
	ellipse(s, 13, 9, 4, 3, "a");
	ellipse(s, 20, 7, 4, 3, "a");
	s.rect(15, 7, 3, 3, "A");
};
const buns = (s) => {
	ellipse(s, 13, 9, 4, 3.5, "a");
	ellipse(s, 35, 9, 4, 3.5, "a");
	s.px(13, 8, "x").px(35, 8, "x");
};
const headband = (s) => {
	s.hline(13, 11, 23, "a").hline(14, 10, 21, "A");
	s.vline(33, 3, 8, "A").rect(32, 2, 3, 2, "a");
};
const tie = (s) => {
	s.rect(23, 35, 2, 6, "a").px(22, 35, "a").px(25, 35, "a");
};
const hakama = (s) => {
	s.rect(12, 44, 24, 4, "a");
	s.art(18, 34, ["xx......xx", ".xx....xx.", "..xx..xx.."]);
};
const nightcap = (s) => {
	for (let y = 2; y < 13; y++) s.hline(14 + Math.floor((12 - y) * 0.2), y, Math.max(2, 20 - (12 - y) * 1.6), "a");
	s.hline(13, 12, 23, "x").hline(13, 13, 23, "x");
	ellipse(s, 34, 4, 2.5, 2.5, "x");
};
const paperBag = (s) => {
	s.rect(14, 6, 21, 27, "a");
	s.rect(14, 6, 21, 3, "A");
	for (let x = 14; x < 35; x += 3) s.px(x, 5, "a");
	s.rect(18, 17, 3, 3, "K").rect(28, 17, 3, 3, "K");
	s.vline(24, 9, 22, "A");
};
const onFace = (s) => {
	// (o'ω'n) の顔そのもの
	ellipse(s, 24, 24, 14, 13, "a");
	ellipse(s, 16, 23, 2, 2, "K");
	s.px(16, 23, "a").px(20, 20, "K");
	s.px(28, 20, "K");
	s.art(21, 26, ["K.K.K", ".K.K."]);
	s.art(30, 22, ["KK.", "K.K", "K.K"]);
};
const mujjeFur = (s) => {
	for (let y = 6; y < N; y++)
		for (let x = 4; x < 44; x++) {
			const dx = (x - 24) / 19;
			const dy = (y - 30) / 22;
			const r = dx * dx + dy * dy;
			if (r < 1 - ((x * 7 + y * 3) % 5) * 0.02) s.px(x, y, (x + y * 2) % 7 === 0 ? "A" : "a");
		}
	s.art(15, 20, ["xxx.......xxx", "xKx.......xKx", "xxx.......xxx"]);
	s.art(19, 28, ["K.K.KKK.KKK", ".K..K.K.K.K"]);
};
const beard = (s) => {
	ellipse(s, 24, 30, 7, 4, "a");
	s.hline(19, 27, 11, "a");
	s.hline(22, 28, 4, "R");
};
const bunTie = (s) => {
	s.hline(20, 10, 9, "a");
};
const apron = (s) => {
	s.rect(15, 38, 18, 10, "a").hline(15, 38, 18, "A");
	s.vline(16, 34, 4, "A").vline(31, 34, 4, "A");
};
const glasses = (s) => {
	for (const ex of [17, 26]) {
		s.hline(ex, 20, 5, "a").hline(ex, 25, 5, "a").vline(ex, 21, 4, "a").vline(ex + 4, 21, 4, "a");
	}
	s.hline(22, 21, 4, "a");
};
const catEars = (s) => {
	s.art(12, 3, ["KK.................KK", "KdK...............KdK", "KddK.............KddK", "KdddKKKKKKKKKKKKKdddK"]);
};
const maidCollar = (s) => {
	s.rect(19, 34, 10, 3, "x").hline(20, 37, 8, "x");
	s.rect(22, 37, 4, 11, "x");
};
const horns = (s) => {
	s.art(10, 2, ["AA........................", "aAA.....................AA", ".aaA...................AAa", "..aaA.................Aaa.", "...aa................aa..."].map((r) => r.slice(0, 29)));
};
const blueTrim = (s) => {
	s.art(17, 34, ["aa......aa", ".aa....aa.", "..aaaaaa.."]);
	s.rect(12, 44, 24, 2, "a");
};
const sketch = (s) => {
	// 描きかけ：塗りを抜いて線だけにする（輪郭は後で K でつく）
	for (let y = 0; y < N; y++)
		for (let x = 0; x < N; x++) {
			const c = s.cells[y][x];
			if (c !== "." && c !== "K" && c !== "e" && (x + y) % 5 !== 0) s.cells[y][x] = ".";
		}
};

// ───────────────── キャラ ─────────────────

const C = (h, H, j, c, cc, extra = {}) => ({ h, H, j, c, C: cc, ...extra });

const CHARS = {
	kiriko: [
		C("#1c2a4a", "#101a30", "#34466e", "#3aa050", "#27803a", { a: "#c0342a", A: "#7a2020", e: "#2a8a5a", E: "#1a5a3a" }),
		{ hair: "bob", bangs: "cover", eyes: "normal", mouth: "smile", extra: ribbon },
	],
	roze: [
		C("#f07aa0", "#c0507a", "#ffb8cc", "#3a2a3a", "#261a26", { a: "#f0c040", A: "#b08a20", e: "#8a2a4a", E: "#5a1a30" }),
		{ hair: "short", tails: "twin", bangs: "even", eyes: "normal", mouth: "smile", extra: buns },
	],
	rei: [
		C("#f0903a", "#b8601e", "#ffc080", "#a89a78", "#7a6e54", { a: "#8a8e94", A: "#5a5e64", e: "#6a3a1a", E: "#3a2010" }),
		{ hair: "long", bangs: "even", eyes: "normal", mouth: "open", collar: "d", extra: headband },
	],
	teto: [
		C("#d83a4a", "#9a2030", "#ff7888", "#8a8a96", "#5a5a66", { a: "#c02030", A: "#801020", e: "#8a1a2a", E: "#5a0a1a" }),
		{ hair: "short", tails: "drill", bangs: "side", eyes: "normal", mouth: "smile", collar: "x", extra: tie },
	],
	tsukuyomi: [
		C("#2e2630", "#1a141c", "#4a3e50", "#f4f0e8", "#c8c2b4", { a: "#c8323e", A: "#8a2028", e: "#6a2a3a", E: "#3a1a20" }),
		{ hair: "bob", bangs: "even", eyes: "normal", mouth: "flat", extra: hakama },
	],
	nemurin: [
		C("#b9a8e8", "#8a7ac8", "#dcd0f4", "#8a7ac8", "#6a5aa8", { a: "#6a5aa8", A: "#4a3a88", e: "#4a3a6a", E: "#2a1a4a" }),
		{ hair: "short", bangs: "even", eyes: "sleepy", mouth: "flat", extra: nightcap },
	],
	myaumyau: [
		C("#3a3630", "#2a2620", "#55504a", "#f4f2ea", "#d8d4c8", { a: "#e8dcc0", A: "#c8b890", e: "#000000", E: "#000000" }),
		{ hair: "none", eyes: "none", mouth: "none", extra: paperBag },
	],
	onchan: [
		C("#f5c56a", "#c8963a", "#fff0b0", "#f5c56a", "#c8963a", { a: "#f5c56a", A: "#c8963a", e: "#000000", E: "#000000" }),
		{ hair: "none", eyes: "none", mouth: "none", extra: onFace },
	],
	nichie: [
		C("#b48be0", "#7d5aa8", "#dcc4f4", "#3a4a8a", "#28336a", { a: "#b48be0", A: "#7d5aa8", e: "#4a2a6a", E: "#2a1a3a" }),
		{ hair: "long", bangs: "side", eyes: "normal", mouth: "smile", collar: "x" },
	],
	mujje: [
		C("#d8352a", "#9e1f17", "#f06050", "#d8352a", "#9e1f17", { a: "#d8352a", A: "#9e1f17", e: "#f6c945", E: "#f6c945" }),
		{ hair: "none", eyes: "none", mouth: "none", extra: mujjeFur },
	],
	oldman: [
		C("#b8b8b0", "#8a8a84", "#dcdcd4", "#6a5a48", "#4a3e30", { a: "#d0d0c8", A: "#9a9a90", e: "#3a3a3a", E: "#1a1a1a" }),
		{ hair: "mush", bangs: "side", eyes: "jito", mouth: "none", extra: beard },
	],
	rino: [
		C("#6a4a38", "#4c3426", "#8a5a4a", "#9a8e5e", "#766a44", { a: "#f2ead6", A: "#c8bea4", e: "#3a2a22", E: "#1a100a" }),
		{ hair: "bun", bangs: "side", eyes: "normal", mouth: "smile", extra: [bunTie, apron] },
	],
	shiyo: [
		C("#c8a132", "#97781f", "#e8c860", "#1c1820", "#2c2836", { a: "#c8323e", A: "#8a2028", e: "#c02020", E: "#801010" }),
		{ hair: "short", tails: "pony", bangs: "even", eyes: "normal", mouth: "smile", extra: [glasses, catEars, maidCollar] },
	],
	aru: [
		C("#3e5a5e", "#2c4246", "#5a7a7e", "#e8ecf2", "#c0c6d0", { a: "#3e5a5e", A: "#2c4246", e: "#2a3a40", E: "#1a2428" }),
		{ hair: "mush", bangs: "even", eyes: "normal", mouth: "flat", collar: "C" },
	],
	zero: [
		C("#f0e2ac", "#d4c184", "#fff4d0", "#f8f8fc", "#c8c8d8", { a: "#3a6ae0", A: "#1a3a90", e: "#8a3a2a", E: "#5a2018" }),
		{ hair: "long", bangs: "even", eyes: "jito", mouth: "flat", extra: [horns, blueTrim] },
	],
	ai: [
		C("#cdd2de", "#a8aebc", "#eef0f4", "#cdd2de", "#a8aebc", { a: "#cdd2de", A: "#a8aebc", e: "#6a7080", E: "#4a5060" }),
		{ hair: "short", bangs: "side", eyes: "normal", mouth: "flat", extra: sketch },
	],
	ushiro: [
		C("#a04070", "#7a2c56", "#c86a98", "#6a4a38", "#4c3426", { a: "#a04070", A: "#7a2c56", e: "#000000", E: "#000000" }),
		{ hair: "back", tails: "twin" },
	],
};

for (const [id, [colors, o]] of Object.entries(CHARS)) {
	const pal = { ...BASE_PAL, ...colors };
	console.log(`${id}.png ${writeSheet(join(OUT, `${id}.png`), [[0, 0, bust(o)]], pal, 3, 3)}`);
}
