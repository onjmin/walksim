// 出口の矢印（作者指示 2026-10-04「移動できる場所には三角形の矢印ガイドが小さく欲しい。ドット絵で」）。
// EventDef.exit（ぬける向き）を持つ踏みイベントの上に、その向きの小さな三角を1ドット単位で描く。
// ジオラマ表示（diorama.ts）と旧表示（game.ts）の両方から呼ぶ。

import type { Dir } from "./types";
import { TILE } from "./types";

export type ExitMark = { x: number; y: number; dir: Dir };

// 右向きの三角（3×5）。ほかの向きは回して使う
const RIGHT = ["X..", "XX.", "XXX", "XX.", "X.."];

/** 向きごとの点（三角の中心を 0,0 として）。 */
const dots = (dir: Dir): [number, number][] => {
	const out: [number, number][] = [];
	RIGHT.forEach((row, j) => {
		[...row].forEach((c, i) => {
			if (c !== "X") return;
			const x = i - 1;
			const y = j - 2;
			if (dir === "right") out.push([x, y]);
			else if (dir === "left") out.push([-x, y]);
			else if (dir === "down") out.push([y, x]);
			else out.push([y, -x]);
		});
	});
	return out;
};
const DOTS: Record<Dir, [number, number][]> = {
	up: dots("up"),
	down: dots("down"),
	left: dots("left"),
	right: dots("right"),
};
const STEP: Record<Dir, [number, number]> = {
	up: [0, -1],
	down: [0, 1],
	left: [-1, 0],
	right: [1, 0],
};

/**
 * 出口の矢印を描く。ox/oy はマップの左上をどこに置くか（画面の座標）。
 * 矢印はマスの中心から ぬける向きへ 4 ドット寄せ、0.6 秒ごとに 1 ドットだけ前後する。
 * 色は明るい点と、まわりを囲む暗い縁（背景に溶けないように）。
 */
export const drawExitMarks = (
	ctx: CanvasRenderingContext2D,
	marks: ExitMark[],
	ox: number,
	oy: number,
	time: number,
	light: string,
	dark: string,
): void => {
	const bob = Math.floor(time / 600) % 2;
	for (const m of marks) {
		const [dx, dy] = STEP[m.dir];
		const cx = Math.round(ox + m.x * TILE + TILE / 2 + dx * (4 + bob));
		const cy = Math.round(oy + m.y * TILE + TILE / 2 + dy * (4 + bob));
		const pts = DOTS[m.dir];
		ctx.fillStyle = dark;
		for (const [px, py] of pts)
			for (const [ex, ey] of [
				[1, 0],
				[-1, 0],
				[0, 1],
				[0, -1],
			])
				ctx.fillRect(cx + px + ex, cy + py + ey, 1, 1);
		ctx.fillStyle = light;
		for (const [px, py] of pts) ctx.fillRect(cx + px, cy + py, 1, 1);
	}
};
