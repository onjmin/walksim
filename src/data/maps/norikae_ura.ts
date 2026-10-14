// 路地の むこうの、もう一つの のりかえのみち（夜の 寄り道「駅と 駅の あいだ」。STORY.md §5.4）。
// 深夜、のりかえのみちの 路地の 門（norikae の roji_mon）が あいていて、路地を ぬけると ここに 出る。
// 地続き：床屋の 横の 路地を 歩いて ぬけた 先。帰りは ガードの わきの 細道から、もとの ガード下へ。
//
// 見た目は のりかえのみちの 西半分（x3〜33・y5〜14）と 同じ。ちがうのは 音と 灯りだけ：
//   床屋の ポールが 夜中に まわっている・じはんきが くらい・東の 街灯が ない・ガードの 蛍光灯が 鳴らない。
// 東の はしを ぬけると 西の はしに、西の はしを ぬけると 東の はしに 出る（ひとまわり＝一周）。
//
// ルールは 1つ：電柱の 札の 矢印に したがう（レコード「夜釣り」の『札の　矢印に　ついていけば　いい』）。
// 矢印と ちがう はしへ ぬけようと すると、えらばせて、行けば まよう（mayou。理由は 言わない）。
//   周  札の 矢印                 床屋の ポール        ガード
//   0   道の さき（東）           まわっている         しずか
//   1   道の さき・札が もう一枚  また まわっている    クーラーボックス
//   2   きた ほう（西）・針金     しまが 下へ          （とおらない）
//   3   柱の 札＝わきの 細道      とまっている         貨物の 音・釣りざお
//
// 恐怖の 3要素（春日武彦『恐怖の正体』）:
//   危機感      もどれない 門（2周目から 南京錠）・近づく 貨物の 音・線路の 土手の やぶれ目
//   不条理感    同じ 床屋に 何度も 出会う・2枚目の 札・針金なのに ぎゃくを むいた 矢印
//   視野狭窄    のこされた クーラーボックスと 釣りざお。レコードの 声は「じゃ、いってくる」と ふつうに 終わったのに、
//               その 人は どこへ 行ったか
//               （答えは ここでは 出さない。真の 筋の 窓の 場面で、その 人が 竿を かついで 出かける）
//
// 段と回収:
//   周       seen_ura_shuu（数）・見た 矢印 seen_ura_yaji（数。どの 周の 矢印を 見たか）
//   床屋     seen_ura_toko（数。その 周で 見たか）／ガード seen_ura_guard（数）
//   札       ura_fuda（アイテム。1周目）→ 朝 norikae の 床屋「うちの　字だ」
//   帰り     seen_ura_kaeri → norikae の 路地の 門に 南京錠・釣り糸
//   まよった seen_ura_mayotta（数）

import type { MapDef, Story } from "../../engine/defs";
import { numFlag } from "../nostalgia";
import { tiles, uraReset } from "./norikae";

type Yaji = "right" | "left" | "down";

/** 周ごとの 札の 矢印（3周目は ガードの 柱の 札）。 */
const YAJI: Yaji[] = ["right", "right", "left", "down"];

/** いま したがう 矢印（見た 周の もの。見ていない 周の 矢印には まだ したがえない）。 */
const yaji = (s: Story): Yaji => YAJI[Math.min(numFlag(s, "seen_ura_yaji"), 3)];

/**
 * まよった（矢印と ちがう はしへ ぬけた）。暗転して、もとの のりかえのみちの 電柱の 下で
 * 目が さめる。なにが あったかは 書かない。
 */
const mayou = async (s: Story): Promise<void> => {
	uraReset(s);
	s.set("seen_ura_mayotta", numFlag(s, "seen_ura_mayotta") + 1);
	// 静寂（STORY.md §5.4）：その 瞬間は 見せず、音も なく 切って、あとの 場面へ とぶ
	s.bgm(null);
	await s.fadeOut(0);
	await s.wait(2600);
	await s.warp("norikae", 8, 10, "left", { fade: false });
	// 町の 曲は、ここを 出るまで 戻さない（warp が @tod を 鳴らしなおすので すぐ 止める）
	s.bgm(null);
	await s.fadeIn(0);
	await s.wait(1800);
	await s.narrate("……電柱に　もたれて、\nすわりこんでいた。");
	await s.wait(1200);
	await s.narrate("札が、風で　くるりと\nまわった。");
};

/** 一周（はしを ぬけて 反対の はしへ）。 */
const isshuu = async (s: Story, x: number, y: number, dir: Yaji) => {
	s.set("seen_ura_shuu", numFlag(s, "seen_ura_shuu") + 1);
	await s.warp("norikae_ura", x, y, dir, { fade: false });
};

/** 東の はし（(30,4)(30,5)）。 */
const higashi =
	(y: number) =>
	async (s: Story): Promise<void> => {
		if (yaji(s) === "right") {
			await isshuu(s, 1, y, "right");
			return;
		}
		await chigau(s, "l");
	};

/** 西の はし（(0,4)(0,5)）。 */
const nishi =
	(y: number) =>
	async (s: Story): Promise<void> => {
		if (yaji(s) === "left") {
			await isshuu(s, 29, y, "left");
			return;
		}
		await chigau(s, "r");
	};

/** 矢印と ちがう ほうへ ぬけようと した（山。行けば まよう）。back は もどる 一歩。 */
const chigau = async (s: Story, back: string): Promise<void> => {
	await s.narrate("札の　矢印は、\nこっちを　さしていない。");
	const i = await s.choose(["＞＞1 このまま　行く", "＞＞2 やめておく"], {
		cancel: 1,
	});
	if (i === 0) {
		await mayou(s);
		return;
	}
	await s.move("player", back);
};

/** 電柱の 札の 前を とおる・調べる（周ごとに 一度。調べたら いまの 矢印を くりかえす）。 */
const fuda = async (s: Story, talk: boolean): Promise<void> => {
	const n = numFlag(s, "seen_ura_shuu");
	const seen = numFlag(s, "seen_ura_yaji") >= n;
	if (seen && !talk) return;
	if (n >= 3) {
		await s.narrate("札の　矢印は、\nガードの　ほうを　さしている。");
		return;
	}
	if (n === 2) {
		s.set("seen_ura_yaji", 2);
		await s.narrate("札の　矢印が、\nきた　ほうを　さしている。");
		await s.narrate("ひもは、針金で\nとめてある。");
		return;
	}
	s.set("seen_ura_yaji", n);
	if (n === 1 && !s.has("ura_fuda")) {
		await s.narrate("同じ　札。\n矢印は、道の　さき。");
		await s.narrate("足もとに、同じ　札が\nもう　一枚　おちていた。");
		s.se("item");
		s.give("ura_fuda");
		return;
	}
	await s.narrate("『のりかえ　つきみ駅　→』\n矢印は、道の　さき。");
};

/** 床屋の 前を とおる（周ごとに 一度）。 */
const tokoya = async (s: Story): Promise<void> => {
	const n = numFlag(s, "seen_ura_shuu");
	if (numFlag(s, "seen_ura_toko") >= n) return;
	s.set("seen_ura_toko", n);
	if (n === 0) await s.narrate("床屋の　ポールが、\nまわっている。");
	else if (n === 1) await s.narrate("……床屋。\nポールが　まわっている。");
	else if (n === 2) await s.narrate("ポールの　しまが、\n下へ　おりていく。");
	else await s.narrate("ポールは、とまっている。");
};

/** ガードの 下を とおる（周ごとに 一度。3周目は 柱の 札で 細道を さす）。 */
const guard = async (s: Story): Promise<void> => {
	const n = numFlag(s, "seen_ura_shuu");
	if (numFlag(s, "seen_ura_guard") >= n) return;
	s.set("seen_ura_guard", n);
	if (n === 0) {
		await s.narrate("ガードの　下。\n蛍光灯は　ついている。");
		return;
	}
	if (n === 1) {
		await s.narrate("ガードの　下に、\nクーラーボックス。");
		await s.narrate("ふたが　あいている。\n中は、とけかけた　氷だけ。");
		return;
	}
	if (n === 2) return;
	s.set("seen_ura_yaji", 3);
	s.se("train", { pan: -0.6, volume: 0.3 });
	await s.wait(900);
	await s.narrate("……ゴトン、ゴトン。\nとおくから、ながい　音。");
	await s.narrate("柱に、同じ　札。\n矢印は、わきの　細道。");
	await s.narrate("柱に、釣りざおが\n立てかけてある。");
};

/** ガードの わきの 細道（3周目の 矢印の さき。線路の 土手の やぶれ目から もどる）。 */
const hosomichi = async (s: Story): Promise<void> => {
	if (numFlag(s, "seen_ura_yaji") < 3) return;
	await s.narrate("細道の　さきに、\n線路の　土手。");
	await s.narrate("フェンスが、\nやぶれている。");
	s.se("train", { pan: -0.4, volume: 0.5 });
	const i = await s.choose(["＞＞1 くぐる", "＞＞2 やめておく"], {
		cancel: 1,
	});
	if (i !== 0) {
		await s.move("player", "u");
		return;
	}
	await s.narrate("やぶれ目を　くぐった。");
	await s.narrate("砂利。\nレールが、鳴っている。");
	s.se("train", { volume: 0.9 });
	await s.wait(1500);
	await s.narrate("カーブの　むこうが、\nしろく　光った――");
	// 静寂：その 瞬間は 見せない。音も 切って、もとの ガード下へ とぶ
	s.bgm(null);
	await s.fadeOut(0);
	await s.wait(2600);
	uraReset(s);
	s.set("seen_ura_kaeri");
	await s.warp("norikae", 23, 10, "up", { fade: false });
	s.bgm(null);
	await s.fadeIn(0);
	await s.wait(1800);
	// 一息：蛍光灯の 音が 先に もどり、ことばは 遅れて ひとことだけ
	s.se("hum", { volume: 0.5 });
	await s.narrate("……ガードの　下に、\n立っていた。");
	await s.wait(1800);
	await s.say("kiriko", "……ひとつ、ンゴ");
};

/** 出てきた 門（0周目なら 路地を もどれる。1周目からは 南京錠）。 */
const mon = async (s: Story): Promise<void> => {
	if (numFlag(s, "seen_ura_shuu") >= 1) {
		await s.narrate("門に、南京錠。\nかかっている。");
		return;
	}
	await s.narrate("門の　むこうに、\nくらい　路地。");
	const i = await s.choose(["＞＞1 路地を　もどる", "＞＞2 やめておく"], {
		cancel: 1,
	});
	if (i !== 0) return;
	uraReset(s);
	await s.fadeOut(700);
	await s.wait(900);
	await s.warp("norikae", 9, 9, "down", { fade: false });
	await s.fadeIn(700);
};

// 地図は norikae の rows の x3〜33・y5〜14 を うつして、西の はしの 路地（x0）を ブロックべいで ふさいだ もの。
//   門 (6,3)・床屋の まど (2,3)・じはんき (7,3)・けた下の 札 (19,3)・電柱の 札 (4,5)・
//   ガード下 (19〜20,4〜5)・わきの 細道 (18,6〜9)・西の はし (0,4〜5)・東の はし (30,4〜5)
const rows = [
	"mnnnnn-aazzznnnaaaaHHnnnnnaaaaa", // y0
	"m^^^^^-AAZZZ^^^AAAAHH^^^^^AAAAA", // y1
	"m(wIw(-(([j[%I%%W$%HH%W$W%(w(w(", // y2  床屋の 袖看板 (3,2)
	"m)coc)gVVG=G#j##tj#QH#rqr#)SMS)", // y3  床屋の まど (2,3)・門 (6,3)・じはんき (7,3)・けた下 (19,3)
	":::::::::::::::::::uu::::::::::", // y4  道。着地 (6,4)
	"....L..............uu..........", // y5  電柱の 札 (4,5)（東の 街灯は ない）
	"mnnnnnzzzzzaaaannn,HHnnnnnnzzzz", // y6  わきの 細道 (18,6)
	"m^^^^^ZZZZZAAAA^^^,HH^^^^^^ZZZZ", // y7
	"m(w(w([[w[[(w(((w(,HH(w((w([w[[", // y8
	"m)o)c)]]j]])c)o)o),HH)c)c)c]]]]", // y9
];

export const norikaeUra: MapDef = {
	id: "norikae_ura",
	boxes: [
		{ x: 0, y: 0, w: 9, h: 6 }, // 床屋と 門
		{ x: 9, y: 0, w: 12, h: 6 }, // お稲荷さんと 飲み屋と ガード
		{ x: 21, y: 0, w: 10, h: 6 }, // 八百屋
		{ x: 0, y: 6, w: 21, h: 4 }, // 家なみと 細道
		{ x: 21, y: 6, w: 10, h: 4 },
	],
	name: "のりかえのみち",
	bgm: null,
	outdoor: true,
	outside: "#0c0a0a",
	tiles,
	rows,
	// 灯りは 床屋の ポール・西の 街灯・ガード下の 蛍光灯だけ（じはんきと 東の 街灯が ない）
	lights: [
		{ x: 3, y: 2, r: 1.5, color: "#ff8a8a" },
		{ x: 4, y: 5, r: 3, color: "#ffdf9e" },
		{ x: 19, y: 4, r: 2, color: "#e8f0ff" },
	],
	events: [
		{ id: "mon", x: 6, y: 3, trigger: "talk", run: mon },
		{
			id: "tokoya_mado",
			x: 2,
			y: 3,
			trigger: "talk",
			run: async (s) => {
				await s.narrate(
					"まどの　中に、いすが　三つ。\n白い　布は、かかっていない。",
				);
				await tokoya(s);
			},
		},
		...[2, 3].flatMap((x) =>
			[4, 5].map((y) => ({
				id: `toko_${x}_${y}`,
				x,
				y,
				trigger: "touch" as const,
				through: true,
				run: tokoya,
			})),
		),
		{
			id: "jihanki",
			x: 7,
			y: 3,
			trigger: "talk",
			run: async (s) => {
				await s.narrate("じはんき。\n灯りが、ついていない。");
			},
		},
		{
			id: "guard_board",
			x: 19,
			y: 3,
			trigger: "talk",
			run: async (s) => {
				await s.narrate("『けた下　2.4m』の　札。\n黄色と　黒の　しましま。");
				await s.narrate("背くらべの　線は、\nひとつも　ない。");
			},
		},
		{
			id: "fuda",
			x: 4,
			y: 5,
			trigger: "talk",
			run: (s) => fuda(s, true),
		},
		{
			id: "fuda_pass",
			x: 4,
			y: 4,
			trigger: "touch",
			through: true,
			run: (s) => fuda(s, false),
		},
		...[19, 20].flatMap((x) =>
			[4, 5].map((y) => ({
				id: `guard_${x}_${y}`,
				x,
				y,
				trigger: "touch" as const,
				through: true,
				run: guard,
			})),
		),
		{
			id: "hosomichi",
			x: 18,
			y: 6,
			trigger: "touch",
			through: true,
			run: hosomichi,
		},
		...[4, 5].flatMap((y) => [
			{
				id: `nishi_${y}`,
				x: 0,
				y,
				trigger: "touch" as const,
				exit: "left" as const,
				through: true,
				run: nishi(y),
			},
			{
				id: `higashi_${y}`,
				x: 30,
				y,
				trigger: "touch" as const,
				exit: "right" as const,
				through: true,
				run: higashi(y),
			},
		]),
	],
};
