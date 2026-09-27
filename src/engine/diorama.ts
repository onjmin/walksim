// ジオラマ表示（試作。URL に ?diorama を付けたときだけ）。
//
// 目標の絵作り: 黒い虚空に「断面の箱」がひとつ浮かび、その中だけが少色のドット絵になっている画面
// （参考: 🔷 / コインランドリーで寝ちゃった / クロマグロがとんでくる / Dequivsia）。
// 素材の出自（WOLF 風・RPGEN 風）が混ざっていても一枚絵に見えるよう、描いた後で色を揃える:
//   1. 箱の範囲だけ作業キャンバスに描く（地形・キャラ・上の層）
//   2. 輝度 → 場面パレット（5〜8色）のグラデーションマップ。4×4 ベイヤーでディザ。
//      壁のざらつきは世界座標に固定したノイズで足す（歩いても砂嵐にならない）
//   3. 箱の断面（切り口の明るい縁・床の厚み）を描き、虚空に星を散らす
// 屋内は外周の壁1マスを除いた部屋ぜんぶが1箱。屋外は CHUNK_W×CHUNK_H マスごとの箱で、
// 端へ歩くと隣の箱へ切り替わる（画面切り替え式）。

import type { Actor, Field } from "./field";
import { TILE } from "./types";

export const DIORAMA =
	typeof location !== "undefined" &&
	new URLSearchParams(location.search).has("diorama");

// 会話を画面下の字幕にする（style.css の html.diorama）
if (DIORAMA) document.documentElement.classList.add("diorama");

/** 屋外の箱の大きさ（マス）。 */
const CHUNK_W = 12;
const CHUNK_H = 8;
/** 断面の縁・床の厚み（ソース画素）。 */
const EDGE = 2;
const SLAB = 6;
/** 屋内の奥の壁を上へ伸ばす高さ（ソース画素）。 */
const WALL_EXT = 12;
/** 屋外の背景幕に使う、箱の上のマス数。 */
const BACK_ROWS = 2;

/** 時間帯ごとの場面パレット（暗→明）と、断面・虚空の色。 */
type Scene = {
	ramp: string[];
	accent: string[];
	cut: string;
	slab: string;
	star: string;
};
const SCENES: Record<string, Scene> = {
	yu: {
		accent: ["#5a2418", "#b8502c", "#f0a040", "#ffe08a"],
		ramp: [
			"#140c14",
			"#3a1c2a",
			"#6e3240",
			"#a8544a",
			"#d98c5c",
			"#f2c58c",
			"#fff0d4",
		],
		cut: "#f7e3c4",
		slab: "#5a2a34",
		star: "#f2c58c",
	},
	yoru: {
		accent: ["#4a2a14", "#a86a28", "#f0c050", "#fff2b0"],
		ramp: [
			"#0c0b1a",
			"#1d1c3a",
			"#323a64",
			"#50628c",
			"#7c94b4",
			"#b8c8da",
			"#eef2f6",
		],
		cut: "#dfe6f0",
		slab: "#262a4c",
		star: "#b8c8da",
	},
	shinya: {
		accent: ["#3a3414", "#8c7e2c", "#d8c860", "#fff6b8"],
		ramp: [
			"#070b12",
			"#122032",
			"#1f3c52",
			"#356270",
			"#5a9498",
			"#98c8c0",
			"#e2f2ea",
		],
		cut: "#cfe6e0",
		slab: "#15293a",
		star: "#98c8c0",
	},
	asa: {
		accent: ["#5a3a2a", "#b87850", "#f0b880", "#fff0d8"],
		ramp: [
			"#23232c",
			"#484a58",
			"#78808e",
			"#a6acb6",
			"#cdd1d4",
			"#ebe8e0",
			"#fffdf4",
		],
		cut: "#ffffff",
		slab: "#5c606c",
		star: "#cdd1d4",
	},
};

const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map(
	(v) => v / 16 - 0.5,
);

const hex = (s: string): [number, number, number] => [
	Number.parseInt(s.slice(1, 3), 16),
	Number.parseInt(s.slice(3, 5), 16),
	Number.parseInt(s.slice(5, 7), 16),
];

/** 世界座標に固定した 0..1 のノイズ。 */
const hash = (x: number, y: number): number => {
	let h = (x * 374761393 + y * 668265263) | 0;
	h = Math.imul(h ^ (h >>> 13), 1274126177);
	return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
};

/** 箱の範囲（マス）。 */
export type Box = { x: number; y: number; w: number; h: number };

export const boxFor = (field: Field, player: Actor): Box => {
	const px = Math.round(player.fx);
	const py = Math.round(player.fy);
	// マップが箱の区切りを持っていれば、それに従う（MapDef.boxes）
	for (const b of field.def.boxes ?? [])
		if (px >= b.x && py >= b.y && px < b.x + b.w && py < b.y + b.h) return b;
	if (!field.def.outdoor) {
		// 屋内: 外周の壁1マスを除いた部屋ぜんぶ（奥の壁の面は残る）
		return { x: 1, y: 1, w: field.w - 2, h: field.h - 2 };
	}
	const x = Math.floor(px / CHUNK_W) * CHUNK_W;
	const y = Math.floor(py / CHUNK_H) * CHUNK_H;
	return {
		x,
		y,
		w: Math.min(CHUNK_W, field.w - x),
		h: Math.min(CHUNK_H, field.h - y),
	};
};

/**
 * 箱の上に足す「奥」の高さ（ソース画素）。
 * 屋内は奥の壁を WALL_EXT だけ高く伸ばす。屋外は箱の上 BACK_ROWS マスを暗く沈めた背景幕を見せる。
 */
const backHeight = (field: Field, box: Box): number =>
	field.def.outdoor ? Math.min(BACK_ROWS, box.y) * TILE : WALL_EXT;

/** 箱を画面のどこに置くか（ソース画素）。カメラ（camX/camY）もこれに合わせる。 */
export const boxPlacement = (
	field: Field,
	box: Box,
	screenW: number,
	screenH: number,
	player: Actor,
): { sx: number; sy: number; camX: number; camY: number } => {
	const bw = box.w * TILE;
	const bh = box.h * TILE;
	const back = backHeight(field, box);
	const margin = TILE / 2;
	// 箱が画面に収まれば真ん中へ。はみ出すとき（縦長の画面の広い店など）は、箱の中で
	// キリコを追って動かす（箱の端は画面の端から margin より内へは入れない）
	const fit = (
		screen: number,
		size: number,
		center: number,
		extra: number,
	): number =>
		size + extra + margin * 2 <= screen
			? Math.round((screen - size - extra) / 2)
			: Math.round(
					Math.min(
						margin,
						Math.max(screen - size - margin, screen / 2 - center),
					),
				);
	const px = (player.fx - box.x) * TILE + TILE / 2;
	const py = (player.fy - box.y) * TILE + TILE / 2;
	const sx = fit(screenW, bw, px, 0);
	// 下に字幕が来るので少し上寄り
	const sy =
		bh + back + SLAB + margin * 2 <= screenH
			? Math.round(back + (screenH - back - bh - SLAB) / 2 - screenH * 0.06)
			: back + fit(screenH - back - SLAB, bh, py, 0);
	return { sx, sy, camX: box.x * TILE - sx, camY: box.y * TILE - sy };
};

const canvas = (w: number, h: number): HTMLCanvasElement => {
	const c = document.createElement("canvas");
	c.width = w;
	c.height = h;
	return c;
};

type Ramp = [number, number, number][];
/** 箱の中の座標（ソース画素）に直した灯り。 */
type Lamp = { x: number; y: number; r: number; ramp?: Ramp };

/** 灯りの色から差し色の段（暗→灯りの色→白寄り）を作る。場面の最暗色へ寄せて沈める。 */
const lampRamp = (color: string, base: Ramp): Ramp => {
	const c = hex(color);
	const d = base[0];
	const mix = (
		a: number[],
		b: number[],
		t: number,
	): [number, number, number] => [
		Math.round(a[0] + (b[0] - a[0]) * t),
		Math.round(a[1] + (b[1] - a[1]) * t),
		Math.round(a[2] + (b[2] - a[2]) * t),
	];
	return [mix(d, c, 0.3), mix(d, c, 0.6), c, mix(c, [255, 255, 255], 0.3)];
};
const rampCache = new Map<string, { ramp: Ramp; accent: Ramp }>();

/**
 * 画用紙の中身を場面パレットへ落とす（その場で書き換え）。透明な画素は透明のまま。
 * lift はキャラを背景より一段明るく浮かせるための輝度の上乗せ。
 */
const quantize = (
	g: CanvasRenderingContext2D,
	w: number,
	h: number,
	ox: number,
	oy: number,
	ramp: Ramp,
	accent: Ramp,
	lift: number,
	lamps: Lamp[],
): void => {
	const img = g.getImageData(0, 0, w, h);
	const d = img.data;
	const n = ramp.length - 1;
	for (let y = 0; y < h; y++) {
		// 天井から光が落ちている：奥（上）の端と手前の角が暗く、床の中ほどが明るい
		const fy = y / h;
		const lightY =
			0.7 + 0.42 * Math.sin(Math.PI * Math.min(1, 0.15 + fy * 0.95));
		for (let x = 0; x < w; x++) {
			const i = (y * w + x) * 4;
			if (d[i + 3] < 128) {
				d[i + 3] = 0;
				continue;
			}
			const r = d[i];
			const gg = d[i + 1];
			const b = d[i + 2];
			const fx = (x / w) * 2 - 1;
			const light = lightY * (1 - 0.3 * fx * fx);
			let l = (0.3 * r + 0.55 * gg + 0.15 * b) / 255;
			// コントラストを少し立てる（S字）
			l = l * l * (3 - 2 * l);
			l = l * light + lift;
			l += (hash(ox + x, oy + y) - 0.5) * 0.07;
			const dither = BAYER[(y & 3) * 4 + (x & 3)];
			// 灯り（MapDef.lights）の届くところだけ差し色の系統に落とす。
			// 素材の色（彩度）では判定しない：RPGEN 系のチップは草も水も原色で、全部が差し色になる
			let glow = 0;
			let lit: Ramp = accent;
			for (const lp of lamps) {
				const dx = x - lp.x;
				const dy = y - lp.y;
				const k = 1 - Math.sqrt(dx * dx + dy * dy) / lp.r;
				if (k > glow) {
					glow = k;
					lit = lp.ramp ?? accent;
				}
			}
			let c: [number, number, number];
			if (glow + dither * 0.5 > 0.3) {
				l += glow * 0.25;
				const nl = lit.length - 1;
				c = lit[Math.max(0, Math.min(nl, Math.round(l * nl + dither * 0.8)))];
			} else {
				c = ramp[Math.max(0, Math.min(n, Math.round(l * n + dither * 0.9)))];
			}
			d[i] = c[0];
			d[i + 1] = c[1];
			d[i + 2] = c[2];
			d[i + 3] = 255;
		}
	}
	g.putImageData(img, 0, 0);
};

/** 描いたものの外側に1画素の輪郭（キャラを床から浮かせる。参考作品のキャラも輪郭で立っている）。 */
const outline = (
	g: CanvasRenderingContext2D,
	w: number,
	h: number,
	c: [number, number, number],
): void => {
	const img = g.getImageData(0, 0, w, h);
	const d = img.data;
	const src = new Uint8Array(w * h);
	for (let i = 0; i < w * h; i++) src[i] = d[i * 4 + 3] > 0 ? 1 : 0;
	for (let y = 0; y < h; y++)
		for (let x = 0; x < w; x++) {
			const i = y * w + x;
			if (src[i]) continue;
			if (
				(x > 0 && src[i - 1]) ||
				(x < w - 1 && src[i + 1]) ||
				(y > 0 && src[i - w]) ||
				(y < h - 1 && src[i + w])
			) {
				d[i * 4] = c[0];
				d[i * 4 + 1] = c[1];
				d[i * 4 + 2] = c[2];
				d[i * 4 + 3] = 255;
			}
		}
	g.putImageData(img, 0, 0);
};

/** 地形の層（下・上）の変換結果。箱・時間帯・マップが変わるまで使い回す。 */
let terrain: {
	key: string;
	below: HTMLCanvasElement;
	above: HTMLCanvasElement;
	back: HTMLCanvasElement | null;
} | null = null;

/**
 * 箱の「奥」。屋内は奥の壁の上端の色で壁を伸ばす（ざらつき付き）。
 * 屋外は箱の上のマスを暗く沈めて描き、上へ行くほど虚空へ溶かす（遠くの町並み）。
 */
const makeBack = (
	field: Field,
	box: Box,
	h: number,
	pal: { ramp: Ramp; accent: Ramp },
	lamps: Lamp[],
	below: CanvasRenderingContext2D,
): HTMLCanvasElement | null => {
	if (h <= 0) return null;
	const bw = box.w * TILE;
	const c = canvas(bw, h);
	const g = c.getContext("2d", { willReadFrequently: true });
	if (!g) return null;
	g.imageSmoothingEnabled = false;
	if (!field.def.outdoor) {
		// 奥の壁のいちばん上の列で、いちばん多い色を壁の色とする
		const top = below.getImageData(0, 1, bw, 1).data;
		const count = new Map<number, number>();
		for (let i = 0; i < top.length; i += 4) {
			const k = (top[i] << 16) | (top[i + 1] << 8) | top[i + 2];
			count.set(k, (count.get(k) ?? 0) + 1);
		}
		let wall = 0;
		let best = -1;
		for (const [k, v] of count)
			if (v > best) {
				best = v;
				wall = k;
			}
		// 壁の色の一段暗い色で、ざらつきを散らす
		const idx = pal.ramp.findIndex(
			(r) => ((r[0] << 16) | (r[1] << 8) | r[2]) === wall,
		);
		const dark = pal.ramp[Math.max(0, idx - 1)];
		const img = g.createImageData(bw, h);
		for (let y = 0; y < h; y++)
			for (let x = 0; x < bw; x++) {
				const i = (y * bw + x) * 4;
				// 上の方ほど暗い粒が多い（天井の影）
				const p = 0.08 + 0.35 * (1 - y / h);
				const useDark = idx > 0 && hash(box.x * TILE + x, y - 999) < p;
				const col = useDark
					? dark
					: [wall >> 16, (wall >> 8) & 255, wall & 255];
				img.data[i] = col[0];
				img.data[i + 1] = col[1];
				img.data[i + 2] = col[2];
				img.data[i + 3] = 255;
			}
		g.putImageData(img, 0, 0);
		return c;
	}
	const ox = box.x * TILE;
	const oy = box.y * TILE - h;
	g.fillStyle = "#000";
	g.fillRect(0, 0, bw, h);
	field.drawBelow(g, ox, oy);
	field.drawAbove(g, ox, oy);
	const shifted = lamps.map((l) => ({ ...l, y: l.y + h }));
	quantize(g, bw, h, ox, oy, pal.ramp, pal.accent, -0.22, shifted);
	// 上へ行くほど虚空へ溶かす（ディザで。半透明にはしない）
	const img = g.getImageData(0, 0, bw, h);
	for (let y = 0; y < h; y++)
		for (let x = 0; x < bw; x++) {
			const t = y / h;
			if (t + BAYER[(y & 3) * 4 + (x & 3)] * 0.6 < 0.45)
				img.data[(y * bw + x) * 4 + 3] = 0;
		}
	g.putImageData(img, 0, 0);
	return c;
};
let actorLayer: HTMLCanvasElement | null = null;

export const renderDiorama = (
	ctx: CanvasRenderingContext2D,
	screenW: number,
	screenH: number,
	field: Field,
	player: Actor,
	actors: Actor[],
	time: number,
	tod: string | undefined,
): void => {
	const scene = SCENES[tod ?? ""] ?? SCENES.shinya;
	let pal = rampCache.get(tod ?? "");
	if (!pal) {
		pal = { ramp: scene.ramp.map(hex), accent: scene.accent.map(hex) };
		rampCache.set(tod ?? "", pal);
	}
	const box = boxFor(field, player);
	const { sx, sy } = boxPlacement(field, box, screenW, screenH, player);
	const back = backHeight(field, box);
	const bw = box.w * TILE;
	const bh = box.h * TILE;
	const ox = box.x * TILE;
	const oy = box.y * TILE;

	// 虚空（黒＋ゆっくりまたたく星）
	ctx.fillStyle = "#000";
	ctx.fillRect(0, 0, screenW, screenH);
	ctx.fillStyle = scene.star;
	for (let i = 0; i < 90; i++) {
		const x = Math.floor(hash(i, 1) * screenW);
		const y = Math.floor(hash(i, 2) * screenH);
		const tw = 0.5 + 0.5 * Math.sin(time / (900 + hash(i, 3) * 1800) + i);
		ctx.globalAlpha = 0.08 + 0.35 * tw * hash(i, 4);
		ctx.fillRect(x, y, 1, 1);
	}
	ctx.globalAlpha = 1;

	const lamps: Lamp[] = (field.def.lights ?? [])
		.filter((l) => !l.only || !tod || l.only.split(",").includes(tod))
		.map((l) => ({
			x: (l.x + 0.5) * TILE - ox,
			y: (l.y + 0.5) * TILE - oy,
			r: l.r * TILE,
			// 色の指定がない灯りは場面の差し色（暖色）
			ramp: l.color ? lampRamp(l.color, pal.ramp) : undefined,
		}))
		.filter(
			(l) => l.x > -l.r && l.y > -l.r && l.x < bw + l.r && l.y < bh + l.r,
		);

	// 地形（下の層・上の層）は変わったときだけ変換し直す
	field.sync();
	const key = `${field.def.id}:${box.x},${box.y},${box.w},${box.h}:${tod}:${field.version}`;
	if (!terrain || terrain.key !== key) {
		const below = canvas(bw, bh);
		const bg = below.getContext("2d", { willReadFrequently: true });
		const above = canvas(bw, bh);
		const ag = above.getContext("2d", { willReadFrequently: true });
		if (!bg || !ag) return;
		bg.imageSmoothingEnabled = false;
		ag.imageSmoothingEnabled = false;
		bg.fillStyle = "#000";
		bg.fillRect(0, 0, bw, bh);
		field.drawBelow(bg, ox, oy);
		quantize(bg, bw, bh, ox, oy, pal.ramp, pal.accent, 0, lamps);
		field.drawAbove(ag, ox, oy);
		quantize(ag, bw, bh, ox, oy, pal.ramp, pal.accent, 0, lamps);
		terrain = {
			key,
			below,
			above,
			back: makeBack(field, box, back, pal, lamps, bg),
		};
	}

	// キャラは毎フレーム。背景より一段明るく浮かせる
	if (!actorLayer || actorLayer.width !== bw || actorLayer.height !== bh)
		actorLayer = canvas(bw, bh);
	const g = actorLayer.getContext("2d", { willReadFrequently: true });
	if (!g) return;
	g.setTransform(1, 0, 0, 1, 0, 0);
	g.imageSmoothingEnabled = false;
	g.clearRect(0, 0, bw, bh);
	const sorted = [...actors].sort((a, b) => a.fy - b.fy);
	for (const a of sorted) a.draw(g, ox, oy, time);
	quantize(g, bw, bh, ox, oy, pal.ramp, pal.accent, 0.12, lamps);
	outline(g, bw, bh, pal.ramp[0]);

	// 床の厚み → 箱の中身 → 断面の縁
	ctx.fillStyle = scene.slab;
	ctx.fillRect(sx - EDGE, sy + bh, bw + EDGE * 2, SLAB);
	ctx.fillStyle = "rgba(0,0,0,0.35)";
	ctx.fillRect(sx - EDGE, sy + bh + SLAB - 2, bw + EDGE * 2, 2);
	if (terrain.back) ctx.drawImage(terrain.back, sx, sy - back);
	ctx.drawImage(terrain.below, sx, sy);
	ctx.drawImage(actorLayer, sx, sy);
	ctx.drawImage(terrain.above, sx, sy);
	ctx.fillStyle = scene.cut;
	if (field.def.outdoor) {
		// 屋外: 地面の奥の端にだけ細い線（遠くは虚空へ溶けている）
		ctx.globalAlpha = 0.35;
		ctx.fillRect(sx, sy, bw, 1);
		ctx.globalAlpha = 1;
		ctx.fillRect(sx - EDGE, sy, EDGE, bh); // 左
		ctx.fillRect(sx + bw, sy, EDGE, bh); // 右
	} else {
		ctx.fillRect(sx - EDGE, sy - back - EDGE, bw + EDGE * 2, EDGE); // 上（奥の壁の切り口）
		ctx.fillRect(sx - EDGE, sy - back, EDGE, bh + back); // 左
		ctx.fillRect(sx + bw, sy - back, EDGE, bh + back); // 右
	}
	ctx.fillRect(sx - EDGE, sy + bh, bw + EDGE * 2, 1); // 床の切り口
};
