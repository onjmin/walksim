// 雑居ビルの、もう一つの 10階（夜の 寄り道「エレベーター」。STORY.md §5.4）。
// 深夜、1階の エレベーターで 4→2→6→2→10→5 と おし、5階で 乗ってきた だれかに 話しかけず・
// ふり向かずに いると、１を おしても かごが 上へ あがって ここに 着く（zakkyo.ts の ijou）。
// 地続き：ビルの 中を エレベーターで あがった 先。帰りも エレベーターで 1階へ おりる。
//
// 見た目は いつもの 10階（囲碁サロンの 前の ホール）と 同じ。ちがうのは 音と 灯りだけ：
//   蛍光灯は ついているのに 鳴っていない・窓の 外の 町に 灯りが ひとつも ない・湯のみの 湯気。
//
// 恐怖の 3要素（春日武彦『恐怖の正体』）:
//   危機感      階段室の 足音（ここで 何かを 調べる たびに 一段 ちかづく。ashiStep）。
//               ノブが まわるまでに エレベーターへ もどらないと、つかまる（zakkyo の tsukamaru）
//   不条理感    月曜で 休みの 囲碁サロンに うちかけの 石と 湯気。窓の 町に 灯りが ない
//   視野狭窄    実況の 人の スマホ（最後の 書きこみ『５階』）。レコードの 声の 人は どう なったか
//               （答えは ここでは 出さない。真の 筋の 窓の 場面で、その 人の 窓に 灯りが ある）
//
// 段と回収:
//   窓       seen_ijou_mado（数）1 灯りが ない → 2 とおくに 一つ → 3 さっきより ちかい
//   スマホ   seen_ijou_sumaho → street mado（実況の 窓）
//   碁石     goishi（アイテム）→ 朝 okujo の 管理人さん「月曜は　お休みなんだけどね」
//   足音     seen_ijou_ashi（この 階に いる あいだの 数。着くたびに 0 に もどす）
//   帰り     seen_ijou_kaeri → zakkyo の 1階（蛍光灯が 鳴る・表示が ひとりでに あがる）

import type { MapDef, Story, TileDef } from "../../engine/defs";
import { numFlag } from "../nostalgia";
import { APART, home, ROOM } from "../tiles";
import { STN } from "../tiles-station";
import { tsukamaru } from "./zakkyo";

/** 足音が 一段 ちかづく。ノブが まわったら true（つかまる）。 */
const ashiStep = async (s: Story): Promise<boolean> => {
	const n = numFlag(s, "seen_ijou_ashi") + 1;
	s.set("seen_ijou_ashi", n);
	if (n === 2) {
		s.se("door", { volume: 0.15, pan: 0.6 });
		await s.narrate("下の　ほうで、\n鉄の　扉の　しまる　音。");
	} else if (n === 3) {
		s.se("stairs", { volume: 0.2, pan: 0.6 });
		await s.narrate("階段を　のぼる　足音。\nゆっくり。");
	} else if (n === 4) {
		s.se("stairs", { volume: 0.4, pan: 0.6 });
		await s.narrate("足音が、ひとつ　下の\nおどりばで　とまった。");
	} else if (n >= 5) {
		s.se("stairs", { volume: 0.6, pan: 0.6 });
		await s.wait(900);
		await s.narrate("階段室の　ノブが、\nゆっくり　まわった――");
		await tsukamaru(s);
		return true;
	}
	return false;
};

/** 調べる もの（足音が 先に ちかづき、つかまったら 中身は 出さない）。 */
const shiraberu =
	(body: (s: Story) => Promise<void>) =>
	async (s: Story): Promise<void> => {
		await body(s);
		await ashiStep(s);
	};

const mado = shiraberu(async (s) => {
	const n = numFlag(s, "seen_ijou_mado");
	if (n < 3) s.set("seen_ijou_mado", n + 1);
	if (n === 0) {
		await s.narrate("窓から、町が　見える。");
		await s.narrate("灯りが、ひとつも　ない。");
		if (s.flag("seen_okujo_nagame"))
			await s.say("kiriko", "（屋上から　見た　駅も、\n国道も……）");
		else await s.narrate("駅も、コンビニも、国道も。");
		return;
	}
	if (n === 1) {
		await s.narrate("……いちばん　とおくに、\n灯りが　ひとつ　ある。");
		return;
	}
	await s.narrate("灯りが、さっきより\nちかい　気が　する。");
	await s.say("kiriko", "（……気の　せいンゴ）");
});

const salon = shiraberu(async (s) => {
	await s.narrate("『囲碁サロン』の　とびらが、\nあいている。");
	await s.narrate("碁盤の　上に、\nうちかけの　石。");
	await s.narrate("湯のみから、\n湯気が　たっている。");
	if (!s.has("goishi")) {
		await s.narrate("ゆかに、白い　石が\nひとつ　おちていた。");
		s.se("item");
		s.give("goishi");
		return;
	}
	await s.say("kiriko", "（……だれも　いないンゴ）");
});

const sumaho = shiraberu(async (s) => {
	if (!s.flag("seen_ijou_sumaho")) {
		s.set("seen_ijou_sumaho");
		await s.narrate("ゆかに、スマホが\nおちている。画面が　ついている。");
		await s.narrate("実況の　スレ。\nさいごの　書きこみは　『５階』。");
		await s.narrate("そのあとには、\nなにも　ない。");
		await s.say("kiriko", "（……レコードの　人ンゴ）");
		return;
	}
	await s.narrate("画面は　『５階』の　まま。\n電池の　のこりが　へっていく。");
});

const kaidan = async (s: Story): Promise<void> => {
	const n = numFlag(s, "seen_ijou_ashi");
	if (n >= 3) await s.narrate("扉の　むこうで、\nだれかが　息を　している。");
	else await s.narrate("階段室の　鉄の扉。\nつめたい。");
	await ashiStep(s);
};

/** 帰りの エレベーター（1階へ。5階で とまりかけて、とまらない）。 */
const elevator = async (s: Story): Promise<void> => {
	await s.narrate("エレベーター。\n表示は　『１０』。");
	const i = await s.choose(["＞＞1 １階へ　おりる", "＞＞2 まだ　のらない"], {
		cancel: 1,
	});
	if (i !== 0) return;
	s.se("door", { volume: 0.6 });
	await s.narrate("のりこんで、１を　おした。");
	s.se("hum", { volume: 0.3 });
	await s.narrate("９……８……７……６……");
	await s.wait(600);
	await s.narrate("……５。");
	await s.narrate("かごが、とまりかけて――");
	await s.wait(1200);
	await s.narrate("……とまらなかった。");
	await s.narrate("４……３……２……１。");
	await s.fadeOut(700);
	s.set("seen_ijou_kaeri");
	s.set("seen_ijou_ashi", 0);
	await s.warp("zakkyo", 11, 3, "down", { se: "door" });
	// 一息：蛍光灯の 音が もどる。説明せず、少し 間を おいて ひとことだけ
	s.se("hum", { volume: 0.5 });
	await s.wait(1800);
	await s.say("kiriko", "……鳴ってるンゴ");
};

// ── タイル（1階の ホールと 同じ コンクリート。蛍光灯は ついているが、鳴らない） ──
//   H h  かべ  .  ゆか  W  窓（町が 見える）  G  囲碁サロンの とびら  E  エレベーター  S  階段室
//   b  長いす
const A_WALL_LO = APART.h.layers[0];
const C_CONC = "#b4b2aa";
const onWall = (img: string): TileDef => ({
	layers: [A_WALL_LO, img],
	color: C_CONC,
	passable: false,
});
const tiles: Record<string, TileDef> = {
	" ": APART[" "],
	H: APART.H,
	h: APART.h,
	".": APART["."],
	W: onWall(home(0, 1)),
	G: APART.q,
	E: onWall(STN.elevator),
	S: onWall(STN.northDoor),
	b: { ...ROOM.n },
};

const rows = [
	"                 ", // y0
	" HHHHHHHHHHHHHHH ", // y1
	" hWhhWhGhhhEhhSh ", // y2  窓 (2,2)(5,2)・囲碁サロン (7,2)・エレベーター (11,2)・階段室 (14,2)
	" ............... ", // y3  着地 (11,3)
	" ..b............ ", // y4  長いす (3,4)・スマホ (10,4)
	" ............... ", // y5
	"                 ", // y6
];

export const zakkyo10: MapDef = {
	id: "zakkyo10",
	name: "駅前の雑居ビル　１０階",
	bgm: null,
	outside: "#0c0b09",
	tiles,
	rows,
	lights: [{ x: 8, y: 4, r: 3, color: "#e6eef8" }],
	onEnter: async (s) => {
		s.set("seen_ijou_ashi", 0);
	},
	events: [
		{
			id: "arrive",
			x: 0,
			y: 0,
			trigger: "auto",
			once: true,
			run: async (s) => {
				s.set("seen_ijou_ashi", 1);
				// 静寂：曲も 蛍光灯の 音も ない。説明は せず、間だけ おく
				await s.wait(2200);
				await s.narrate("とびらが　ひらいた。\n１０階。");
				await s.wait(1600);
				await s.narrate("蛍光灯は　ついている。");
			},
		},
		{ id: "mado_a", x: 2, y: 2, trigger: "talk", run: mado },
		{ id: "mado_b", x: 5, y: 2, trigger: "talk", run: mado },
		{ id: "salon", x: 7, y: 2, trigger: "talk", run: salon },
		{ id: "elevator", x: 11, y: 2, trigger: "talk", run: elevator },
		{ id: "kaidan", x: 14, y: 2, trigger: "talk", run: kaidan },
		{
			id: "sumaho",
			x: 10,
			y: 4,
			trigger: "talk",
			through: false,
			run: sumaho,
		},
		{
			id: "isu",
			x: 3,
			y: 4,
			trigger: "talk",
			run: shiraberu(async (s) => {
				await s.narrate("長いす。すわった　あとの\nくぼみが　あたたかい。");
			}),
		},
	],
};
