// キリコの部屋（はじまりの部屋）。DESIGN §4。
// 12×10 の室内。ベッド・机とモニター・蓄音機・日記（セーブ）・ドア。
// 時計は「2:00」で止まっている。BGM は無音（時計まで止まっているので、音がしない）。
// 深夜2時に目が覚め、ドアの外が いつもの廊下ではなく「回線の間」につながっている（opening）。

import type { MapDef } from "../../engine/defs";
import { OBJ } from "../helpers";
import { SPR } from "../sprites";
import { INDOOR } from "../tiles";

// INDOOR の文字そのまま。W 窓 / k 柱時計 / Z z ベッド / t 机 / B 本棚 / M モニター / n いす
const rows = [
	"############", // y0
	"#HHWHHHHHHH#", // y1  窓 (3,1)
	"#hhhhhhhkhh#", // y2  柱時計 (8,2)
	"#Zt...B..M.#", // y3  ベッド (1,3)・机 (2,3)・本棚 (6,3)・モニター (9,3)
	"#z.......n.#", // y4  いす (9,4)。起きた場所 (2,4)
	"#..........#", // y5
	"#..........#", // y6  日記 (2,6)・蓄音機 (5,6)
	"#..........#", // y7
	"#..........#", // y8
	"#####D######", // y9  ドア (5,9) → hub
];

export const room: MapDef = {
	id: "room",
	name: "キリコの部屋",
	bgm: null,
	outside: "#1b1410",
	tiles: INDOOR,
	rows,
	events: [
		// ── 目が覚める（auto once）。短く：2:00・音がしない・ドアの下の光 ──
		{
			id: "opening",
			x: 2,
			y: 4,
			trigger: "auto",
			once: true,
			run: async (s) => {
				await s.wait(600);
				await s.narrate("……目が　さめた。");
				await s.narrate("時計の音が　しない。\n――2:00。とまっている。");
				await s.say("kiriko", "……まだ　よなかンゴ");
				await s.narrate(
					"ドアの下から、しろい光が\nすじに　なって　もれている。",
				);
				await s.say("kiriko", "……ろうかの電気、\nこんな色だったンゴ？");
			},
		},
		// ── ドア。はじめて開けたときだけ、外がおかしいことに気づく ──
		{
			id: "door",
			x: 5,
			y: 9,
			trigger: "touch",
			through: true,
			run: async (s) => {
				if (!s.flag("seen_door")) {
					s.set("seen_door");
					s.se("door");
					await s.narrate("ドアを　あけた。\n――いつもの　ろうかが、ない。");
					await s.narrate(
						"だれもいない　駅の待合室が、\nしずかに　つづいている。",
					);
					await s.warp("hub", 4, 10, "up");
					return;
				}
				await s.warp("hub", 4, 10, "up", { se: "door" });
			},
		},
		// ── 日記（セーブ）。絵は記録の水晶（helpers.ts の OBJ.save）で代用 ──
		{
			id: "diary",
			x: 2,
			y: 6,
			sprite: OBJ.save,
			trigger: "talk",
			fixedDir: true,
			run: async (s) => {
				await s.narrate(
					"日記帳だ。ひらいたページに\n今日の日付だけ　書いてある。",
				);
				await s.saveMenu();
			},
		},
		// ── 蓄音機（メニューの案内） ──
		{
			id: "phono",
			x: 5,
			y: 6,
			sprite: SPR.phono,
			trigger: "talk",
			fixedDir: true,
			run: async (s) => {
				await s.narrate("キリコの　蓄音機だ。");
				await s.narrate(
					"ひろった　レコードは、メニューの\n「レコード」で　いつでも　聞ける。",
				);
			},
		},
		// ── しらべられる家具（見えない talk イベント） ──
		{
			id: "clock",
			x: 8,
			y: 2,
			trigger: "talk",
			run: async (s) => {
				await s.narrate("かべの時計。\n――2:00で　とまっている。");
				await s.narrate("秒針も、うごいていない。");
			},
		},
		{
			id: "window",
			x: 3,
			y: 2,
			trigger: "talk",
			run: async (s) => {
				await s.narrate("そとは　まっくら。\nまちの明かりが、ひとつもない。");
			},
		},
		{
			id: "bed",
			x: 1,
			y: 4,
			trigger: "talk",
			run: async (s) => {
				await s.narrate(
					"ふとんは　まだ　あたたかい。\n……もう　ねむれる気が　しない。",
				);
			},
		},
		{
			id: "pc",
			x: 9,
			y: 3,
			trigger: "talk",
			run: async (s) => {
				await s.narrate(
					"モニターは　ついていない。\nじぶんの顔だけ、うつっている。",
				);
			},
		},
		{
			id: "shelf",
			x: 6,
			y: 3,
			trigger: "talk",
			run: async (s) => {
				await s.narrate("本と、レコードの空き箱。\nどれも　見おぼえがある。");
			},
		},
	],
};
