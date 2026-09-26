// TODO: 仮マップ（データの骨組み）。あとの段階（line: kisaragi 担当）が
// docs/content-briefs.md「line: train / kisaragi / tunnel / terminus」に沿って、
// このファイルごと完全に置き換える。
// 本実装: 16×10 の終点ホーム（ロゼとの会話・蓄音機台の本演出・エンディング分岐・朝の部屋）。
// いまは仮の蓄音機台：レコード3枚を順に再生 → rec_last が回りはじめ → 仮エンディング。

import type { MapDef } from "../../engine/defs";
import { npc, warp } from "../helpers";
import { SPR } from "../sprites";
import { TOWN } from "../tiles";

const rows = [
	"              ", // y0
	" .L........L. ", // y1  街灯
	" ............ ", // y2  蓄音機台 (5,2)・ロゼ (8,2)
	" .............", // y3  東 (13,3) → tunnel
	" ............ ", // y4
	"              ", // y5
];

export const terminus: MapDef = {
	id: "terminus",
	name: "供養スレ駅",
	bgm: "secret",
	outside: "#000",
	tiles: TOWN,
	rows,
	events: [
		warp("to_tunnel", 13, 3, { map: "tunnel", x: 1, y: 3, dir: "right" }),
		// ── 蓄音機台（仮）。本実装では「もう聞いた分はスキップ」やロゼの掛け合いが入る ──
		{
			id: "pedestal",
			x: 5,
			y: 2,
			sprite: SPR.phono,
			trigger: "talk",
			fixedDir: true,
			run: async (s) => {
				const all = s.has("rec_a") && s.has("rec_b") && s.has("rec_c");
				if (!all) {
					await s.narrate("蓄音機の台だ。\nレコードを　置く　くぼみが　3つ。");
					return;
				}
				if (s.flag("got_rec_last")) {
					await s.narrate("レコードは、もう　ぜんぶ\n聞いた。");
					return;
				}
				await s.narrate("3まいの　レコードを、じゅんに\nのせて　まわした。");
				await s.record("rec_a");
				await s.record("rec_b");
				await s.record("rec_c");
				await s.narrate(
					"――もう1まい、黒いレコードが\nいつのまにか　のっている。",
				);
				s.se("item");
				s.give("rec_last");
				s.set("got_rec_last");
				await s.record("rec_last");
				await s.narrate("……今夜の　日付だった。");
				s.set("clear");
				s.set("ending_seen");
				await s.fadeOut(1200);
				await s.ending();
			},
		},
		npc(
			"roze_t",
			8,
			2,
			"char:roze",
			async (s) => {
				await s.say("roze", "……来たアル");
				await s.say("roze", "ここが　終点アル");
			},
			{ dir: "left" },
		),
	],
};
