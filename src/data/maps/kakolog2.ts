// TODO: 仮マップ（データの骨組み）。あとの段階（world: kakolog2 担当）が
// docs/content-briefs.md「world: kakolog2」に沿って、このファイルごと完全に置き換える。
// 本実装: 26×22 の地下のスレ廃墟（dat落ちスレの棚・おんちゃんの部屋・リノの食堂・にぃちぇ・ムッジェ）。
// いまは「入る → 懐中電灯とレコードCを拾う → もどる」だけができる最小の地下室。

import type { MapDef } from "../../engine/defs";
import { sign, warp } from "../helpers";
import { SPR } from "../sprites";
import { CAVE } from "../tiles";

const rows = [
	"##########", // y0
	"#WWWWWWWW#", // y1
	"#wwwwwwww#", // y2
	"#........#", // y3  懐中電灯 (2,3)・レコードC (7,3)
	"#........#", // y4  スレタイの看板 (5,4)
	"#........#", // y5
	"#........#", // y6  入ってくる場所 (4,6)
	"####.#####", // y7  出口 (4,7) → hub
];

export const kakolog2: MapDef = {
	id: "kakolog2",
	name: "過去ログの地層",
	bgm: "deep4",
	dark: 0.5,
	ambient: { kind: "dust" },
	outside: "#050408",
	tiles: CAVE,
	rows,
	events: [
		warp(
			"to_hub",
			4,
			7,
			{ map: "hub", x: 11, y: 3, dir: "down" },
			{ se: "door" },
		),
		// ── 懐中電灯（序盤。フラグ flashlight で光の半径が 3.5 → 6.5 になる） ──
		{
			id: "flashlight_ev",
			x: 2,
			y: 3,
			sprite: SPR.lantern,
			trigger: "talk",
			fixedDir: true,
			when: (st) => !(st.items.flashlight ?? 0),
			run: async (s) => {
				s.se("item");
				s.give("flashlight");
				s.set("flashlight");
				await s.narrate(
					"ゆかに　懐中電灯が　おちている。\nまだ　あたたかい気がする。",
				);
				await s.narrate("あかりが　とおくまで\nとどくようになった。");
			},
		},
		// ── レコードC「おやすみ」（最深部） ──
		{
			id: "rec_c_ev",
			x: 7,
			y: 3,
			sprite: SPR.record,
			trigger: "talk",
			fixedDir: true,
			when: (st) => !(st.items.rec_c ?? 0),
			run: async (s) => {
				s.se("item");
				s.give("rec_c");
				s.set("got_rec_c");
				await s.narrate("棚の　いちばん奥から\n黒いレコードを　ひろった。");
				await s.record("rec_c");
			},
		},
		sign("shelf", 5, 4, "『【急募】眠れない時の\n過ごし方』……dat落ちだ。"),
	],
};
