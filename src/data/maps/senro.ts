// せんろぞいのみち（えきまえ と となりまち をつなぐ、線路わきの長い道）。
// docs/content-briefs.md「日常の町 拡張」・docs/style-everyday.md・docs/nostalgia.md。
// 44×14・outdoor・BGM @tod。地続きのルール（2026-09-28）で、ワープではなく歩いて
// となりまちのアーケードまで行ける道。進行には関係しない「歩くための場所」。
//
// 時間帯の顔（flags.tod）:
//   夕方 … 踏切が鳴り、電車がとおる（定時音は正常の側）。ガード下で頭の上を電車がとおる。
//           NPC 4体（鉄道ずきの人=3層会話・下校の高校生×2・コスモスのじいちゃん）。
//           出前の自転車は人ではなく「ぬいていく」場面だけ。西の端から となりまち のアーケードへ入れる
//   宵   … NPC 0体（docs/nostalgia.md P0-1）。文は におい・音・点いた灯り だけ。
//           アーケードは店じまいの音（シャッター）で、入れない
//   深夜 … NPC 0体必達。踏切はくらい。ふみきりまちのブロックべいに すわれる（seen_suwari_senro）。
//           じはんきで缶が買える（kanShinya）・地区を移るたびに冷める（kanTick）。
//           脇道の微差は一つだけ: 電車の来ない踏切が、一度だけ「カン」と鳴る（ノートには書かない）
//   朝   … NPC 3体（鉄道ずきの人・高校生・通勤の人）。夕方の setup の payoff
//           （始発の写真・小テストのはんい・コスモスの水やりのあと）
//
// 出入口（地続き）:
//   東 (43,7) → ekimae (1,9) right／ekimae からの着地 (42,7) left
//   西 (0,7) touch … 夕方だけ tonarimachi (34,16) left へ。ほかの時間帯はアーケードの
//   シャッターがおりていて、一歩もどる。tonarimachi からの着地 (1,7) right
//
// 経路: 一本道にしない。線路の道(y7)⇄踏切(x31)⇄線路の北のあぜ道(y2)⇄ガード下(x9) のループと、
// 線路の道⇄路地(x1・x29)⇄家のうらの細道(y13) のループ。
// 隠し: いけがきの　すきま (10,9)（見た目は生けがき・通れる）→ うら庭 → 細道。
// 二度目で変わる: ガード下のポスター（下の古いポスター）・コスモスのちょうちょ。

import type {
	EventDef,
	GameState,
	MapDef,
	Story,
	TileDef,
} from "../../engine/defs";
import { npc, warp } from "../helpers";
import { kanHeld, kanLine, kanShinya, kanTick, yoruAkubi } from "../nostalgia";
import { DOOR, JP, TOWN, WALL, WIN } from "../tiles";
import { STN } from "../tiles-station";

// ── タイル ──
// TOWN をベースに、線路まわりを data/tiles-station.ts の STN から借りる。
//   -  あぜ道・うらの細道（土）   r  ロープの柵（線路ぎわの砂利）   F  網フェンス（線路ぎわの砂利）
//   t  線路（通れない）   X  踏切（通れる）   Y  踏切のけいほうき   y  しゃだんき
//   H  ガードの橋台（コンクリート）   u  ガード下の通路   Q  ガード下の掲示板
//   & *  コスモス（通れない）   h  生けがき（見た目は | ・通れる＝隠し）   m  ブロックべい（すわれる）
//   S  工場のシャッター   N  工場の名札   o j  しまった戸   c  下段の窓   k  空き地の囲い
const GRAVEL = STN.gravel;
const tiles: Record<string, TileDef> = {
	...TOWN,
	"-": { layers: [JP.dirtPath], color: "#7a6a50", passable: true },
	r: {
		layers: [GRAVEL, JP.ropeFence],
		color: "#26221e",
		passable: false,
	},
	F: { layers: [GRAVEL, JP.fence], color: "#26221e", passable: false },
	t: { layers: [STN.track], color: "#2e2620", passable: false },
	X: { layers: [STN.track], color: "#4a4a4e", passable: true },
	Y: { layers: [GRAVEL, STN.signal], color: "#26221e", passable: false },
	y: { layers: [GRAVEL, STN.bufferStop], color: "#26221e", passable: false },
	H: { layers: [STN.platformWall], color: "#3a3630", passable: false },
	u: { layers: [JP.road], color: "#2a2a2e", passable: true },
	Q: {
		layers: [STN.platformWall, STN.noticeBoard],
		color: "#3a3630",
		passable: false,
	},
	h: { layers: [JP.ground, JP.hedge], color: "#6a7a48", passable: true },
	m: { layers: [JP.ground, WALL.tileLo], color: "#c8b8a0", passable: false },
	S: {
		layers: [WALL.tileLo, STN.officeShutter],
		color: "#8a8a8a",
		passable: false,
	},
	N: {
		layers: [WALL.tileLo, JP.signBoard],
		color: "#c8b8a0",
		passable: false,
	},
	o: {
		layers: [WALL.sidingLo, DOOR.house],
		color: "#e8e8e8",
		passable: false,
	},
	j: {
		layers: [WALL.boardLo, DOOR.sliding],
		color: "#6a4a2a",
		passable: false,
	},
	c: {
		layers: [WALL.sidingLo, WIN.sash],
		color: "#e8e8e8",
		passable: false,
	},
	k: { layers: [JP.ground, JP.kakoi], color: "#6a7a48", passable: false },
};

// 北＝信号所の屋根と、線路の北のあぜ道(y2)・コスモス畑(y1)。まんなか＝線路(y4-5)とガード(x9)と踏切(x31)。
// 線路の道(y7)が東西に長くのびる。南＝家々・つぶれた工場・空き地、そのうらの細道(y13)。
const rows = [
	"                                  AAAA      ", // y0  信号所の屋根
	"    r,,,,,,&*&&*&&,&&*&&&*&&*&,,,,(w((,     ", // y1  コスモス (14,1)(26,1)・じいちゃん (18,1)夕・キロポスト (32,1)・信号所の窓 (35,1)・名札 (37,1)
	"    r----------------------------------     ", // y2  あぜ道。道のおわり (4,2)・レール (24,3) を見る
	"rrrrrrrrHuHrrrrrrrrrrrrrrrrrrrYXyrrrrrrrrrrr", // y3  ガードの北口 (9,3)・北のけいほうき (30,3)
	"ttttttttHuHttttttttttttttttttttXtttttttttttt", // y4  線路。ガード下 (9,4)・自転車の札 (10,4)
	"ttttttttQuHttttttttttttttttttttXtttttttttttt", // y5  ガード下の掲示板 (8,5)
	"FFFFFFFFHuHFFFFFFFFFFFFFFFFFFFyXYFFFFFFFFFFF", // y6  しゃだんき (30,6)・踏切 (31,6)・けいほうき (32,6)
	"::::::::::::::::::::::::::::::::::::::::::::", // y7  線路の道。西 (0,7)→tonarimachi・着地 (1,7)／東 (43,7)→ekimae・着地 (42,7)
	",,!,,L,,,,,,,,,,,,,,,,,,L,,,,,,,,mm,,VV,,,, ", // y8  案内板 (2,8)・街灯 (5,8)(24,8)・ブロックべい (33,8)(34,8)・じはんき (37,8)(38,8)
	" ,nnnnnn||h||aaaaaaaaaa|kkkkk,zzzzzz|nnnnn  ", // y9  隠しのすきま (10,9)・空き地の囲い (26,9)
	" ,^^^^^^|,,p|AAAAAAAAAA|,,,P,,ZZZZZZ|^^^^^  ", // y10 うら庭のものほし (10,10)
	" ,(w((w(|,,,|%W%%$%%W%%|,,,,,,[w[[w[|(w(w(  ", // y11
	" ,)o))c)|,,,|##S##N####|,x,,,,]j]]]]|)o)c)  ", // y12 まど (6,12)・工場のシャッター (15,12)・名札 (18,12)・ひきど (31,12)
	" ----------------------------------------p  ", // y13 うらの細道。行きどまりの　うえきばち (41,13)
];

// ── モブの歩行グラ（同梱の RPGEN DQ 風） ──
const FAN = "pub:sprites/mob_man.png";
const STUDENT = "pub:sprites/mob_student.png";
const GRANDPA = "pub:sprites/mob_ojiichan.png";
const COMMUTER = "pub:sprites/mob_salaryman.png";

/**
 * 環境音のワンショット（夕＝ヒグラシ／朝＝スズメ）。kawara と同じ方式：
 * 直前に鳴らした帯をモジュール変数で覚え、往復の連打を防ぐ（セーブしない）。
 */
let lastWave = "";
const wave = (id: string, pan: number) => async (s: Story) => {
	if (lastWave === id) return;
	lastWave = id;
	const t = s.flag("tod");
	if (t === "yu") s.se("higurashi", { pan, volume: 0.8 });
	else if (t === "asa") s.se("suzume", { pan, volume: 0.8 });
};
/** 見えない環境音の帯（線路の道 y7 に置く）。 */
const waveBelt = (id: string, x: number, pan: number): EventDef => ({
	id,
	x,
	y: 7,
	trigger: "touch",
	through: true,
	when: (st: GameState) => st.flags.tod === "yu" || st.flags.tod === "asa",
	run: wave(id, pan),
});

/** 踏切の警報（tick を「カン」に見立てて数回。pan は踏切の方向）。 */
const kankan = async (s: Story, n: number, volume: number): Promise<void> => {
	for (let i = 0; i < n; i++) {
		s.se("tick", { pan: 0.1, volume });
		await s.wait(420);
	}
};

/**
 * 踏切の前の帯（y7 の x29〜33）。夕方は一度だけ電車がとおる（定時音は正常の側）。
 * 深夜は一度だけ、電車の来ない踏切が「カン」と一つ鳴る（否認できる微差。ノートには書かない）。
 */
const fumikiriBelt = (x: number): EventDef => ({
	id: `fumikiri_belt_${x}`,
	x,
	y: 7,
	trigger: "touch",
	through: true,
	when: (st) =>
		(st.flags.tod === "yu" && !st.flags.seen_fumikiri_yu) ||
		(st.flags.tod === "shinya" && !st.flags.seen_fumikiri_shinya),
	run: async (s) => {
		if (s.flag("tod") === "shinya") {
			s.set("seen_fumikiri_shinya");
			await s.wait(700);
			s.se("tick", { pan: 0.1, volume: 0.35 });
			await s.wait(900);
			await s.narrate("……カン、と　一度だけ、\nふみきりが　鳴った。");
			await s.wait(500);
			await s.narrate("しゃだんきは、あがったまま。\nランプも　ついていない。");
			await s.say("kiriko", "……気のせいンゴ");
			return;
		}
		s.set("seen_fumikiri_yu");
		await kankan(s, 3, 0.6);
		await s.narrate("カン、カン、と\nふみきりが　鳴りはじめた。");
		await kankan(s, 2, 0.6);
		await s.narrate("しゃだんきが、ゆっくり\nおりてくる。");
		s.se("train", { pan: 0.2, volume: 0.9 });
		await s.wait(900);
		await s.narrate("電車が、目のまえを\nとおりすぎていく。");
		await s.narrate("まどが　ぜんぶ、\n夕日の色だ。");
		await kankan(s, 1, 0.4);
		await s.narrate("しゃだんきが、あがった。");
	},
});

/** 街灯（(5,8)(24,8) で共用。lights は yoru,shinya で点く）。 */
const gaitou = async (s: Story): Promise<void> => {
	const t = s.flag("tod");
	if (t === "shinya") {
		await s.narrate("街灯の　あかりに、羽虫が\nあつまっている。");
		return;
	}
	if (t === "yoru") {
		await s.narrate("電柱の　街灯。まるい\nあかりが、線路の道に　おちる。");
		return;
	}
	if (t === "asa") {
		await s.narrate("街灯は、もう　きえている。\n電線に、スズメが　ならぶ。");
		return;
	}
	await s.narrate("電柱の　街灯。まだ、\nついていない。");
};

/**
 * 深夜、ふみきりまちの　ブロックべいに すわる（seen_suwari_senro。docs/nostalgia.md P0-7 の型）。
 * なにも起きない。目をとじる → 暗転して、目をあける → 虫の声がふえる → ブロックのつめたさ
 * （缶があれば缶の1行に替える）。暗転中は文を出さない。電車の音は鳴らさない。
 * 2回目からは選ばずに短い1行だけ。
 */
const suwaru = async (s: Story): Promise<void> => {
	if (s.flag("seen_suwari_senro")) {
		if (kanHeld(s)) await kanLine(s);
		else
			await s.narrate("ブロックべいに　すわって、\nすこし　線路を　ながめた。");
		return;
	}
	const i = await s.choose(["＞＞1 すわる", "＞＞2 やめておく"], {
		cancel: 1,
	});
	if (i !== 0) return;
	s.set("seen_suwari_senro");
	await s.narrate("ブロックべいに　こしかけて、\n目を　とじた。");
	await s.fadeOut(900, "#04060f");
	await s.wait(900);
	await s.fadeIn(900);
	await s.narrate("線路の　むこうで、虫の声が\nすこしずつ　ふえてくる。");
	if (kanHeld(s)) await kanLine(s);
	else await s.narrate("ブロックが、夜つゆで\nしっとり　つめたい。");
	await s.say("kiriko", "……おしりが、ひえたンゴ");
};

/** ブロックべい（(33,8)(34,8) で共用）。 */
const blockBei = async (s: Story): Promise<void> => {
	const t = s.flag("tod");
	if (t === "shinya") {
		await s.narrate("ふみきりまちの　ブロックべい。\nひくくて、ひらたい。");
		await suwaru(s);
		return;
	}
	if (t === "yoru") {
		await s.narrate("ブロックが、ひるまの\nぬくみを　のこしている。");
		return;
	}
	if (t === "asa") {
		await s.narrate("ブロックに、朝つゆ。\nすわるのは　やめておく。");
		return;
	}
	await s.narrate(
		"ふみきりまちの　ブロックべい。\nてっぺんが、すりへって　まるい。",
	);
	await s.narrate("電車を　まつ人の、\nこしかけ　らしい。");
};

export const senro: MapDef = {
	id: "senro",
	// ジオラマ表示の箱。上段＝線路と線路の道／下段＝家のうらと細道
	boxes: [
		{ x: 0, y: 0, w: 15, h: 8 }, // ガードと西の道
		{ x: 15, y: 0, w: 15, h: 8 }, // コスモスと線路のなかほど
		{ x: 30, y: 0, w: 14, h: 8 }, // 踏切と信号所
		{ x: 0, y: 8, w: 15, h: 6 }, // 西の家とうら庭
		{ x: 15, y: 8, w: 15, h: 6 }, // つぶれた工場と空き地
		{ x: 30, y: 8, w: 14, h: 6 }, // ふみきりまちの家々
	],
	name: "せんろぞいのみち",
	bgm: "@tod", // 時間帯の曲（生活音の下にごく薄く。data/index.ts の todBgm）
	outdoor: true,
	outside: "#0c0b09",
	tiles,
	rows,
	// 光源は街灯2本・じはんき・ガード下の蛍光灯・踏切の灯り（宵だけ）・信号所の窓・家の窓2つ・
	// 西のアーケードの灯り。深夜の踏切は　くらいまま（docs/night-fx.md §2）
	lights: [
		{ x: 5, y: 8, r: 3, color: "#ffdf9e", only: "yoru,shinya" },
		{ x: 24, y: 8, r: 3, color: "#ffdf9e", only: "yoru,shinya" },
		{ x: 37, y: 8, r: 1.5, color: "#eef4ff", only: "yoru,shinya" },
		{ x: 9, y: 5, r: 2, color: "#e8f0ff", only: "yoru,shinya" }, // ガード下の蛍光灯
		{ x: 31, y: 6, r: 2.5, color: "#ffdf9e", only: "yoru" }, // 踏切の灯り
		{ x: 35, y: 1, r: 2, color: "#cfe4ff", only: "yu,yoru" }, // 信号所の窓
		{ x: 6, y: 12, r: 2, only: "yu,yoru" },
		{ x: 40, y: 12, r: 2, only: "yu,yoru" },
		{ x: 0, y: 7, r: 2.5, color: "#ffcc88", only: "yu,yoru,shinya" }, // アーケードの灯り
	],
	// 入るたびに環境音を一波（夕方＝ヒグラシ／朝＝スズメ。宵・深夜は鳴らさない）。
	// 深夜は、手の中の缶が地区ひとつぶん冷める（nostalgia.md P0-6。文は出さない）
	onEnter: async (s) => {
		lastWave = "";
		kanTick(s);
		const t = s.flag("tod");
		if (t === "yu") s.se("higurashi", { volume: 0.8 });
		else if (t === "asa") s.se("suzume", { volume: 0.8 });
	},
	events: [
		// ── 着いたとき（時間帯ごとに一度だけ。座標は y0 の空き） ──
		{
			id: "arrive_yu",
			x: 0,
			y: 0,
			trigger: "auto",
			once: true,
			when: (st) => st.flags.tod === "yu",
			run: async (s) => {
				await s.wait(500);
				await s.narrate("線路ぞいに、ながい道が\nつづいている。");
				await s.narrate("レールが、夕日を\nはねかえしている。");
			},
		},
		// 宵（nostalgia.md P0-1。におい・音・点いた灯り だけ）
		{
			id: "arrive_yoru",
			x: 3,
			y: 0,
			trigger: "auto",
			once: true,
			when: (st) => st.flags.tod === "yoru",
			run: async (s) => {
				await s.wait(500);
				await s.narrate("どこかの　台所から、\nてんぷらを　あげる　におい。");
				await yoruAkubi(s);
			},
		},
		{
			id: "arrive_shinya",
			x: 1,
			y: 0,
			trigger: "auto",
			once: true,
			when: (st) => st.flags.tod === "shinya",
			run: async (s) => {
				await s.wait(700);
				await s.narrate("線路は、しんと　している。");
				await s.wait(400);
				await s.narrate("ふみきりの　あかりも、\nついていない。");
			},
		},
		{
			id: "arrive_asa",
			x: 2,
			y: 0,
			trigger: "auto",
			once: true,
			when: (st) => st.flags.tod === "asa",
			run: async (s) => {
				await s.wait(500);
				s.se("suzume", { pan: -0.3, volume: 0.8 });
				await s.wait(600);
				await s.narrate("レールが、あさの光で\n白く　ひかっている。");
			},
		},

		// ── 出入り口（地続き） ──
		warp("to_ekimae", 43, 7, { map: "ekimae", x: 1, y: 9, dir: "right" }),
		// 西: となりまちのアーケード（夕方だけ あいている）
		{
			id: "to_tonarimachi",
			x: 0,
			y: 7,
			trigger: "touch",
			through: true,
			run: async (s) => {
				const t = s.flag("tod");
				if (t === "yu") {
					if (!s.flag("seen_senro_arcade")) {
						s.set("seen_senro_arcade");
						await s.narrate(
							"道の　さきに、アーケードの\nあかりが　ともっている。",
						);
					}
					await s.warp("tonarimachi", 34, 16, "left");
					return;
				}
				if (t === "yoru") {
					s.se("shutter", { pan: -0.6, volume: 0.4 });
					await s.narrate(
						"アーケードの　シャッターが、\nはんぶん　おりている。",
					);
					await s.narrate("おくで、ガラガラと\nシャッターを　おろす音。");
					await s.say("kiriko", "……店じまいンゴ");
				} else if (t === "shinya") {
					await s.narrate("アーケードの　シャッターは、\nおりている。");
					await s.narrate("天井の　常夜灯が、\nひとつだけ　ついている。");
				} else {
					await s.narrate("シャッターは、まだ\nおりている。");
					await s.narrate("荷おろしの　トラックが、\nエンジンを　かけたまま。");
				}
				await s.move("player", "r");
			},
		},

		// ── 環境音の帯（線路の道。歩くたび遠近が変わる） ──
		waveBelt("wave_w", 10, -0.4),
		waveBelt("wave_m", 22, 0),
		waveBelt("wave_e", 36, 0.4),

		// ── 踏切の場面（夕方＝電車がとおる／深夜＝一度だけ「カン」） ──
		...[29, 30, 31, 32, 33].map(fumikiriBelt),

		// ── ガード下で、頭の上を電車がとおる（夕方に一度） ──
		...[4, 5].map(
			(y): EventDef => ({
				id: `guard_densha_${y}`,
				x: 9,
				y,
				trigger: "touch",
				through: true,
				when: (st) => st.flags.tod === "yu" && !st.flags.seen_guard_densha,
				run: async (s) => {
					s.set("seen_guard_densha");
					s.se("train", { volume: 1 });
					await s.wait(500);
					await s.narrate("――頭の上を、電車が\nとおっていく。");
					await s.narrate("ガードの中が、音で\nいっぱいに　なった。");
					await s.say("kiriko", "（……耳が、じんじん\nするンゴ）");
				},
			}),
		),

		// ── 出前の自転車（夕方に一度。人ではなく、ぬいていく場面だけ） ──
		...[16, 17].map(
			(x): EventDef => ({
				id: `demae_${x}`,
				x,
				y: 7,
				trigger: "touch",
				through: true,
				when: (st) => st.flags.tod === "yu" && !st.flags.seen_demae_senro,
				run: async (s) => {
					s.set("seen_demae_senro");
					await s.narrate(
						"チリン、と　鳴らして、\n出前の　自転車が　ぬいていった。",
					);
					await s.narrate("おかもちが、すこしも\nゆれていない。");
					await s.say("kiriko", "（……プロンゴ）");
				},
			}),
		),

		// ── 隠し: いけがきの　すきま（見た目は生けがき。はじめて抜けたときだけ一言） ──
		{
			id: "sukima_ikegaki",
			x: 10,
			y: 9,
			trigger: "touch",
			through: true,
			when: (st) => !st.flags.seen_senro_sukima,
			run: async (s) => {
				s.set("seen_senro_sukima");
				await s.narrate(
					"いけがきの　すきまを、\nからだを　よこにして　ぬけた。",
				);
				await s.say("kiriko", "（……近道、はっけんンゴ）");
			},
		},

		// ── 踏切（x31） ──
		{
			id: "fumikiri",
			x: 31,
			y: 6,
			trigger: "talk",
			run: async (s) => {
				const t = s.flag("tod");
				if (t === "shinya") {
					await s.narrate("ふみきりは、くらい。\nレールの　音も　しない。");
					return;
				}
				if (t === "yoru") {
					await s.narrate(
						"ふみきりの　灯りが、\nレールを　白く　てらしている。",
					);
					return;
				}
				if (t === "asa") {
					await s.narrate("ふみきりの　みぞに、\nコスモスの　花びら。");
					return;
				}
				await s.narrate("ふみきり。左を見て、\n右を見る。");
				await s.say("kiriko", "……よし、ンゴ");
			},
		},
		{
			id: "keihouki_s",
			x: 32,
			y: 6,
			trigger: "talk",
			run: async (s) => {
				const t = s.flag("tod");
				if (t === "shinya") {
					await s.narrate("けいほうきの　ランプは、\nどちらも　ついていない。");
					return;
				}
				if (t === "yoru") {
					await s.narrate("けいほうきの　上で、\n羽虫が　まわっている。");
					return;
				}
				if (t === "asa") {
					await s.narrate(
						"けいほうきに、クモの巣。\nあさつゆで　ひかっている。",
					);
					return;
				}
				await s.narrate("けいほうき。赤い　ランプが\nふたつ、ならんでいる。");
				await s.narrate("『とまれ　みよ』の字が、\nすこし　はげている。");
			},
		},
		{
			id: "shadanki",
			x: 30,
			y: 6,
			trigger: "talk",
			run: async (s) => {
				await s.narrate("しゃだんき。黄色と　黒の\nしましま。");
				await s.narrate(
					"ささくれた　ところに、\nビニールテープが　まいてある。",
				);
			},
		},
		{
			id: "keihouki_n",
			x: 30,
			y: 3,
			trigger: "talk",
			run: async (s) => {
				await s.narrate("けいほうきの　名札。\n『はやせみち　ふみきり』");
				await s.narrate("むかしの　道の名前が、\nここにだけ　のこっている。");
			},
		},

		// ── 線路の北のあぜ道（コスモス・キロポスト・信号所・道のおわり） ──
		{
			id: "cosmos_a",
			x: 14,
			y: 1,
			trigger: "talk",
			run: async (s) => {
				const t = s.flag("tod");
				if (t === "shinya") {
					await s.narrate("コスモスが、くらやみで\nうすく　白い。");
					return;
				}
				if (t === "yoru") {
					await s.narrate("コスモスの　ねもとで、\n虫が　鳴いている。");
					return;
				}
				if (t === "asa") {
					if (s.flag("seen_senro_jii")) {
						await s.narrate(
							"ねもとの土が、しめっている。\n……水やりの　あとだ。",
						);
						return;
					}
					await s.narrate("コスモスに、朝つゆ。\n花が　すこし　おもそうだ。");
					return;
				}
				await s.narrate("線路ぞいの　コスモス。\nピンクと　白が　ゆれている。");
			},
		},
		{
			id: "cosmos_b",
			x: 26,
			y: 1,
			trigger: "talk",
			run: async (s) => {
				const t = s.flag("tod");
				if (t === "shinya") {
					await s.narrate("花の　かたちだけ、\nうっすら　わかる。");
					return;
				}
				if (t === "yoru") {
					await s.narrate("コスモスが、夜風で\nさらさら　鳴る。");
					return;
				}
				if (t === "asa") {
					await s.narrate("コスモスが、みんな\n東に　かたむいている。");
					return;
				}
				if (!s.flag("seen_cosmos_chou")) {
					s.set("seen_cosmos_chou");
					await s.narrate("ひとつだけ、ちょうちょが\nとまっている。");
					return;
				}
				await s.narrate("ちょうちょは、となりの\n花に　うつっていた。");
			},
		},
		{
			id: "kilopost",
			x: 32,
			y: 1,
			sprite: JP.signpost,
			trigger: "talk",
			fixedDir: true,
			run: async (s) => {
				await s.narrate("白い　くいに、数字。\n『1.2』");
				await s.narrate("えきから　1.2キロ、\nという　しるしらしい。");
				await s.say("kiriko", "（あるいた　きょりンゴ）");
			},
		},
		{
			id: "shingo_mado",
			x: 35,
			y: 1,
			trigger: "talk",
			run: async (s) => {
				const t = s.flag("tod");
				if (t === "shinya") {
					await s.narrate("信号所の　まどの中は、\nくらい。");
					return;
				}
				if (t === "yoru") {
					await s.narrate("まどの中の　ランプが、ひとつ\nみどりに　かわった。");
					return;
				}
				if (t === "asa") {
					await s.narrate("まどガラスに、\nあさの光が　うつっている。");
					return;
				}
				await s.narrate("信号所の　まど。中で、\nランプが　ならんで　ともる。");
			},
		},
		{
			id: "shingo_fuda",
			x: 37,
			y: 1,
			trigger: "talk",
			run: async (s) => {
				await s.narrate("小屋の名札。\n『東3号　信号所』");
				await s.narrate("戸のよこの　当番表は、\nいちばん下の日付が　古い。");
			},
		},
		{
			id: "michi_owari",
			x: 4,
			y: 2,
			trigger: "talk",
			run: async (s) => {
				const t = s.flag("tod");
				if (t === "shinya") {
					await s.narrate("あぜ道は、ここで　おわり。");
					await s.narrate("レールだけが、くらやみの\nほうへ　のびている。");
					return;
				}
				if (t === "yoru") {
					await s.narrate("西のほうに、アーケードの\nあかりが　ぼんやり。");
					return;
				}
				if (t === "asa") {
					await s.narrate("レールの　さきが、\nあさの　かすみに　とける。");
					return;
				}
				await s.narrate(
					"あぜ道は、ここで　おわり。\nレールだけが　西へ　つづく。",
				);
				await s.narrate("むこうに、アーケードの\n屋根が　見える。");
			},
		},
		{
			id: "rail",
			x: 24,
			y: 3,
			trigger: "talk",
			run: async (s) => {
				const t = s.flag("tod");
				if (t === "shinya") {
					await s.narrate(
						"ロープの　むこうに、レール。\nつめたそうに　しずかだ。",
					);
					return;
				}
				if (t === "yoru") {
					await s.narrate("レールが、街灯の光を\nほそく　ひろっている。");
					return;
				}
				if (t === "asa") {
					await s.narrate(
						"ロープの　むこうで、\nスズメが　砂利を　つついている。",
					);
					return;
				}
				await s.narrate(
					"ロープの　むこうに、レール。\n夕日で　二本の線に　ひかる。",
				);
				await s.narrate("ロープに、『線路に\nはいらないでね』の札。");
			},
		},

		// ── ガード下（x9） ──
		// 掲示板（貼り紙の下の貼り紙。二度目に古いポスターの端が見える）
		{
			id: "guard_board",
			x: 8,
			y: 5,
			trigger: "talk",
			run: async (s) => {
				if (s.flag("tod") === "shinya") {
					await s.narrate("蛍光灯の下で、ポスターが\n白っぽく　見える。");
				}
				if (!s.flag("seen_guard_board")) {
					s.set("seen_guard_board");
					await s.narrate("ガード下の　掲示板。\nこどもの　交通安全ポスター。");
					await s.narrate("クレヨンの　電車と、\n『とまって　みて　わたろう』");
					await s.narrate("すみに、金色の\n『入選』の　シール。");
					return;
				}
				await s.narrate(
					"画びょうの下から、もっと\n古い　ポスターの　はしっこ。",
				);
				await s.narrate("おなじ　電車の絵が、\nすこしだけ　見えている。");
			},
		},
		{
			id: "guard_fuda",
			x: 10,
			y: 4,
			trigger: "talk",
			run: async (s) => {
				await s.narrate("『自転車は　おりて\nおしてください』");
				await s.narrate("ハンドルの　高さに、\nこすれた　あとが　ならぶ。");
			},
		},

		// ── 線路の道の南がわ（案内板・街灯・ブロックべい・じはんき） ──
		{
			id: "annai",
			x: 2,
			y: 8,
			trigger: "talk",
			run: async (s) => {
				await s.narrate("『この先　となりまち\nつきみ商店街』");
				await s.narrate(
					"商店会の　手がき。矢印が、\nすこし　上を　むいている。",
				);
			},
		},
		{ id: "lamp_w", x: 5, y: 8, trigger: "talk", run: gaitou },
		{ id: "lamp_e", x: 24, y: 8, trigger: "talk", run: gaitou },
		{ id: "block_a", x: 33, y: 8, trigger: "talk", run: blockBei },
		{ id: "block_b", x: 34, y: 8, trigger: "talk", run: blockBei },
		{
			id: "jihanki_a",
			x: 37,
			y: 8,
			trigger: "talk",
			run: async (s) => {
				const t = s.flag("tod");
				if (t === "shinya") {
					await s.narrate(
						"じはんきの　あかりが、\n道に　しかくく　おちている。",
					);
					await kanShinya(s);
					return;
				}
				if (t === "yoru") {
					await s.narrate("はしの一列だけ、\nあかい札。『あったか～い』");
					return;
				}
				if (t === "asa") {
					await s.narrate("おつりの口に、\n10円玉が　ひとつ。");
					await s.say("kiriko", "（……そっとしておくンゴ）");
					return;
				}
				await s.narrate(
					"ふみきりまちの　じはんき。\nボタンが、夕日で　あつい。",
				);
			},
		},
		{
			id: "jihanki_b",
			x: 38,
			y: 8,
			trigger: "talk",
			run: async (s) => {
				await s.narrate("こっちは、\n『つめた～い』しか　ない。");
				await s.narrate("ボタンの　ひとつに、\n『故障中』の　テープ。");
			},
		},

		// ── 家のうら・工場・空き地（うらの細道 y13 から） ──
		{
			id: "akichi_kakoi",
			x: 26,
			y: 9,
			trigger: "talk",
			run: async (s) => {
				await s.narrate("空き地の　かこいに、\n『建設予定地』の　看板。");
				await s.narrate("完成予定の　年は、\nとっくに　すぎている。");
			},
		},
		{
			id: "koujou_shutter",
			x: 15,
			y: 12,
			trigger: "talk",
			run: async (s) => {
				const t = s.flag("tod");
				if (t === "shinya") {
					await s.narrate("シャッターの　貼り紙は、\nくらくて　よめない。");
					return;
				}
				if (t === "yoru") {
					await s.narrate("シャッターの　すきまから、\n機械油の　におい。");
					return;
				}
				if (t === "asa") {
					await s.narrate("貼り紙の　かどに、\nあたらしい　セロハンテープ。");
					return;
				}
				await s.narrate("シャッターに　貼り紙。\n『ながいあいだ　ありがとう』");
				await s.narrate("かどが　めくれて、\n風に　ぱたぱた　鳴っている。");
			},
		},
		{
			id: "koujou_fuda",
			x: 18,
			y: 12,
			trigger: "talk",
			run: async (s) => {
				await s.narrate("『もりた　製作所』\nペンキが、うすく　なっている。");
				await s.narrate("足もとに、小さな　ばねが\nひとつ　おちている。");
			},
		},
		{
			id: "monohoshi",
			x: 10,
			y: 10,
			trigger: "talk",
			run: async (s) => {
				const t = s.flag("tod");
				if (t === "shinya") {
					await s.narrate("ものほしざおに、\nせんたくばさみが　ひとつ。");
					return;
				}
				if (t === "yoru") {
					await s.narrate("どこかの　ふろばから、\nせっけんの　におい。");
					return;
				}
				if (t === "asa") {
					await s.narrate("あさいちばんの　シーツが、\nもう　ほしてある。");
					return;
				}
				await s.narrate("うら庭の　ものほし。\nタオルが　ならんでいる。");
				await s.say("kiriko", "（とりこみ　わすれンゴ？）");
			},
		},
		{
			id: "ie_mado",
			x: 6,
			y: 12,
			trigger: "talk",
			run: async (s) => {
				const t = s.flag("tod");
				if (t === "shinya") {
					await s.narrate("まどの　カーテンが、\nしまっている。");
					return;
				}
				if (t === "yoru") {
					await s.narrate("まどから、ナイター中継の\n音が　もれてくる。");
					return;
				}
				if (t === "asa") {
					await s.narrate("まどから、みそしるの\nにおい。");
					return;
				}
				await s.narrate("まどの　むこうで、なべが\nことこと　いっている。");
			},
		},
		{
			id: "ie_hikido",
			x: 31,
			y: 12,
			trigger: "talk",
			run: async (s) => {
				const t = s.flag("tod");
				if (t === "shinya") {
					await s.narrate("ひきどの　前に、\n長ぐつが　そろえてある。");
					return;
				}
				if (t === "yoru") {
					await s.narrate(
						"ひきどの　すりガラスが、\nオレンジに　ひかっている。",
					);
					return;
				}
				if (t === "asa") {
					await s.narrate("ひきどの　おくから、\nほうきの　音。");
					return;
				}
				await s.narrate("ひきどの　前に、\nこども用の　長ぐつ。");
				await s.narrate("かたほうだけ、\nたおれている。");
			},
		},
		{
			id: "ikidomari",
			x: 41,
			y: 13,
			trigger: "talk",
			run: async (s) => {
				const t = s.flag("tod");
				if (t === "shinya") {
					await s.narrate("行きどまり。\nうえきばちが　ひとつ。");
					return;
				}
				if (t === "yoru") {
					await s.narrate("うえきばちの　土が、\nまだ　しめっている。");
					return;
				}
				if (t === "asa") {
					await s.narrate("うえきばちの上で、\nねこが　のびを　した。");
					return;
				}
				await s.narrate("うえきばちの　かげで、\nねこが　まるくなっている。");
				await s.narrate("……目だけ　あけて、\nまた　とじた。");
			},
		},

		// ── 夕方の人たち（くだらない雑談だけ。説明しない） ──
		// 鉄道ずきの人（3層: 初回／二層目=夕日の車体／待機）
		npc(
			"tetsu_yu",
			28,
			8,
			FAN,
			async (s) => {
				if (!s.flag("seen_senro_tetsu")) {
					s.set("seen_senro_tetsu");
					await s.say(null, "つぎの　通過まで、\nあと　4分", {
						name: "カメラの人",
					});
					await s.say("kiriko", "（きいてないンゴ……）");
					await s.say(null, "……3分　50秒", { name: "カメラの人" });
					return;
				}
				if (!s.flag("seen_senro_tetsu2")) {
					s.set("seen_senro_tetsu2");
					await s.say(null, "この時間だけ、車体が\nオレンジに　なるんだ", {
						name: "カメラの人",
					});
					await s.say("kiriko", "もとから　オレンジンゴ？");
					await s.say(null, "銀色だよ。\n……いまだけ", { name: "カメラの人" });
					await s.say(null, "だから、あしたの\n始発も　くるの", {
						name: "カメラの人",
					});
					return;
				}
				if (s.flag("seen_fumikiri_yu")) {
					await s.say(null, "……いまの、ちょっと\nぶれた", {
						name: "カメラの人",
					});
					return;
				}
				await s.say(null, "……しっ。レールが\n鳴りはじめた", {
					name: "カメラの人",
				});
			},
			{ dir: "up", when: (st) => st.flags.tod === "yu" },
		),
		// 下校の高校生（ふたり。朝に片方がつづきを話す）
		npc(
			"koukou_a",
			12,
			8,
			STUDENT,
			async (s) => {
				if (!s.flag("seen_senro_koukou")) {
					s.set("seen_senro_koukou");
					await s.say(null, "あしたの　小テスト、\nはんい　知ってる？", {
						name: "高校生",
					});
					await s.say("kiriko", "（しらないンゴ）");
					await s.say(null, "……だよね。\nこいつも　知らないって", {
						name: "高校生",
					});
					return;
				}
				await s.say(null, "まあ、あさ　電車で\nやれば　いけるっしょ", {
					name: "高校生",
				});
			},
			{ dir: "right", when: (st) => st.flags.tod === "yu" },
		),
		npc(
			"koukou_b",
			13,
			8,
			STUDENT,
			async (s) => {
				if (!s.flag("seen_senro_koukou_b")) {
					s.set("seen_senro_koukou_b");
					await s.say(null, "ここの　ふみきり、\nつづけて　3本　くるから", {
						name: "高校生",
					});
					await s.say(null, "まってるあいだに、\n英単語　ひとつ　おぼえる", {
						name: "高校生",
					});
					await s.say("kiriko", "（えらいンゴ）");
					return;
				}
				await s.say(null, "……で、わすれる", { name: "高校生" });
			},
			{ dir: "left", when: (st) => st.flags.tod === "yu" },
		),
		// コスモスのじいちゃん（畑の中。あぜ道から話しかける）
		npc(
			"cosmos_jii",
			18,
			1,
			GRANDPA,
			async (s) => {
				if (!s.flag("seen_senro_jii")) {
					s.set("seen_senro_jii");
					await s.say(null, "コスモスはな、ほっといても\nさくもんでね", {
						name: "コスモスの人",
					});
					await s.say(null, "でも　ほっとくと、\nおこるんだ", {
						name: "コスモスの人",
					});
					await s.say("kiriko", "コスモスが？");
					await s.say(null, "ばあさんが、だよ", { name: "コスモスの人" });
					return;
				}
				await s.say(null, "電車の　かぜでな、\nみんな　東に　かたむくの", {
					name: "コスモスの人",
				});
			},
			{ dir: "down", when: (st) => st.flags.tod === "yu" },
		),

		// ── 朝の人たち（セリフ全差し替え。夕方の setup の payoff） ──
		npc(
			"tetsu_asa",
			28,
			8,
			FAN,
			async (s) => {
				if (!s.flag("seen_senro_tetsu_asa")) {
					s.set("seen_senro_tetsu_asa");
					if (s.flag("seen_senro_tetsu2")) {
						await s.say(null, "始発、とれたよ。\n……ほら、銀色", {
							name: "カメラの人",
						});
						await s.say("kiriko", "（ほんとに　銀色ンゴ）");
						return;
					}
					await s.say(null, "あさは、光が　よこから\nくるから　いいんだ", {
						name: "カメラの人",
					});
					return;
				}
				await s.narrate("カメラの　画面を、\nじっと　見ている。");
			},
			{ dir: "up", when: (st) => st.flags.tod === "asa" },
		),
		npc(
			"koukou_asa",
			13,
			8,
			STUDENT,
			async (s) => {
				if (!s.flag("seen_senro_koukou_asa")) {
					s.set("seen_senro_koukou_asa");
					if (s.flag("seen_senro_koukou")) {
						await s.say(null, "小テストの　はんい、\nぜんぶ　だった", {
							name: "高校生",
						});
						await s.say("kiriko", "（……ぜんぶンゴ）");
						return;
					}
					await s.say(null, "あさの　ふみきりは、\nみじかいから　すき", {
						name: "高校生",
					});
					return;
				}
				await s.narrate(
					"単語帳を　めくりながら、\nえきの　ほうへ　歩いていく。",
				);
			},
			{ dir: "right", when: (st) => st.flags.tod === "asa" },
		),
		npc(
			"tsuukin_asa",
			20,
			8,
			COMMUTER,
			async (s) => {
				if (!s.flag("seen_senro_tsuukin")) {
					s.set("seen_senro_tsuukin");
					await s.say(null, "すみません、いそいでて。\n……8時2分の、なんです", {
						name: "通勤の人",
					});
					await s.say("kiriko", "（いってらっしゃいンゴ）");
					return;
				}
				await s.narrate("うで時計を　見て、\nはやあしに　なった。");
			},
			{ dir: "right", when: (st) => st.flags.tod === "asa" },
		),
	],
};
