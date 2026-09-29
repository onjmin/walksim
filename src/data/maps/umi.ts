// うみべ（団地の南の坂をくだった先の、小さな漁港と防波堤）。docs/content-briefs.md「日常の町 拡張」・
// docs/style-everyday.md・docs/style-spaces.md。44×20・outdoor・BGM "@tod"（波の音の SE は無いので、音は文で書く）。
// 北の坂 → 海ぞいの道と護岸 → 西の漁港（魚市場の小屋・あみ・さかなばこ・桟橋）／まん中の小さな浜／
// 長い防波堤と赤いぼうしの灯台 → 東の岬の、ホームが一枚だけの駅と、トンネルへきえる単線。
// 海（~）は広い余白のまま残す（1画面に主役1つ）。
//
// 時間帯の顔（flags.tod）:
//   夕方 … 海のきらめき。NPC 4体（あみ番のじいちゃん=3層会話・水きりの子・犬のさんぽの人・
//           防波堤のつり人）。トンネルの奥へ電車の音が遠ざかる（定時音は正常の側）。怪異ゼロ
//   宵   … NPC 0体（docs/nostalgia.md P0-1）。文は におい・音・点いた灯り だけ
//   深夜 … NPC 0体必達。灯台のあかりだけの海。防波堤のふちに すわれる（seen_suwari_umi）。
//           脇道の違和感は一つだけ: 沖のあかり（seen_umi_okibi。まばたきで消える・いさり火かも）
//   朝   … 漁船がかえってくる。NPC 4体（あみ番・つり人・ジョギングの人・…船は音と文）。
//           結（STORY.md §5.5・§5.9）：まちのどおりの 窓の 場面（転）の あと、団地の 坂を くだって 来る
//           （tod="asa"・ending_ready）。坂で 辞めた 人（早番）と すれ違い（yoake_arrive）、
//           駅の ベンチの やきうの となりで「保守」と 書いて おわる（yakiu_end → まとめカード）
//
// 座標: 北 (20,0)→danchi(15,22)・danchi からの着地 (20,1) 下向き。
// 線路 y17（x35〜42 が歩ける）。(43,17) はトンネルの口（決してワープしない・一歩押しもどす）。
// (42,17) は夜明けの着地。ホーム(y16)→駅前(y15)→岬の草はら→海ぞいの道 と歩いてつながる。

import type {
	EventDef,
	GameState,
	MapDef,
	Story,
	TileDef,
} from "../../engine/defs";
import { npc, warp } from "../helpers";
import {
	kanHeld,
	kanLine,
	kanTick,
	NIKKI_TITLE,
	nikkiSummary,
	yoruAkubi,
	yoruClock,
} from "../nostalgia";
import { ALL_RECORDS } from "../records";
import { base, DOOR, FIELD, JP, TOWN, WALL, WIN } from "../tiles";
import { STN } from "../tiles-station";

// ── タイル ──
//   ,  草  |  生けがき（道のおわり）  /  坂  :  海ぞいの道  .  コンクリート（歩道・岸壁・防波堤）
//   %  護岸・小屋のかべ  =  石段  s  浜  ~  海  o  テトラポッド  ^  岬の岩  #  桟橋
//   z Z  赤い屋根（海の家・灯台のぼうし）  ] M  海の家の板かべ・シャッター  V  じはんき
//   n u  魚市場の小屋の屋根  j  小屋の戸  l L  街灯（草の上・岸壁の上）
//   y  干したあみ  k  さかなばこ  p  ポリバケツ  h  灯台の胴
//   t  線路  E  車止め  e  ホーム  I  ホームの灯り  B b  ベンチ  K  ホームの時計  X  トンネルの口
const PAVE = JP.pave;
const PLAT = STN.platform;
const tiles: Record<string, TileDef> = {
	...TOWN,
	",": { layers: [JP.grassTuft], color: "#6a7a48", passable: true },
	"/": { layers: [JP.slopeStep], color: "#8a8478", passable: true },
	":": { layers: [JP.road], color: "#5a5a5e", passable: true },
	".": { layers: [PAVE], color: "#9a9a9a", passable: true },
	"=": { layers: [JP.stoneSteps], color: "#8a8a8a", passable: true },
	s: { layers: [JP.sand], color: "#e8cc90", passable: true },
	"~": { layers: [JP.water], color: "#3a5a80", passable: false },
	o: {
		layers: [JP.water, base(1, 13)],
		color: "#8a8a88",
		passable: false,
	},
	"^": FIELD["^"],
	"#": { layers: [JP.bridgeV], color: "#8a7a60", passable: true },
	M: {
		layers: [WALL.boardLo, STN.officeShutter],
		color: "#8a8a8a",
		passable: false,
	},
	j: {
		layers: [WALL.mortar, DOOR.sliding],
		color: "#6a4a2a",
		passable: false,
	},
	u: TOWN["^"],
	l: { ...TOWN.L, layers: [JP.ground, JP.lamp] },
	L: { ...TOWN.L, layers: [PAVE, JP.lamp] },
	y: { layers: [PAVE, JP.ropeFence], color: "#6a6a50", passable: false },
	k: { layers: [PAVE, JP.ringoBox], color: "#8a6a3a", passable: false },
	p: { layers: [PAVE, JP.polyBucket], color: "#4a7aaa", passable: false },
	h: {
		layers: [WALL.sidingLo, WIN.sash],
		color: "#e8e8e8",
		passable: false,
	},
	t: { layers: [STN.track], color: "#2e2620", passable: true },
	E: {
		layers: [STN.track, STN.bufferStop],
		color: "#8a3a2a",
		passable: false,
	},
	e: { layers: [STN.platformEdge], color: "#8a8a80", passable: true },
	I: {
		layers: [PLAT, STN.lamp],
		color: "#8a8a80",
		passable: false,
		thin: true,
	},
	B: { layers: [PLAT, STN.benchL], color: "#8a8a80", passable: false },
	b: { layers: [PLAT, STN.benchR], color: "#8a8a80", passable: false },
	K: { layers: [PLAT, STN.clock], color: "#8a8a80", passable: false },
	X: { layers: [], color: "#040405", passable: true },
};

// 北＝団地からの坂(x20)と草の土手（海の家・じはんき・街灯）。y5-6＝海ぞいの道と歩道（西は生けがきで行きどまり）。
// 西＝漁港の岸壁（魚市場の小屋・あみ・さかなばこ・桟橋 x9）。中＝護岸の石段(20,7)の下の小さな浜。
// y13＝防波堤（つり座 (23,14)・すわる所 (27,14)・灯台 (31,13)）。東＝岬と駅・線路・トンネル (43,17)。
const rows = [
	"                    /                       ", // y0  danchi への出口 (20,0)
	"                  |,/,|                     ", // y1  danchi からの着地 (20,1)
	"          ,,,,,,,,,,/,,,,,zzzzz,,,,,        ", // y2  海の家の屋根
	"        ,,,,,,,,,,,,/,,,,,ZZZZZ,,,,,,,      ", // y3
	"    ,,,,,,,,l,,,,,,,/,,,,,]]M]],V,,,l,,,    ", // y4  街灯 (12,4)(36,4)・メニュー (26,4)・シャッター (28,4)・じはんき (32,4)
	" |::::::::::::::::::::::::::::::::::::::::^^", // y5  海ぞいの道。西の行きどまり (1,5)
	" |........................................^^", // y6  歩道
	" %............%%%%%%=%%%%%%%%%%%%%,,,,,,,,^^", // y7  護岸・チョークの字 (24,7)・石段 (20,7)
	" %.nnnnnn.L...%sssssssssssss~~~~~~^,,,,,,,^^", // y8  しお見表 (2,8)・みなとの街灯 (10,8)
	" %.uuuuuu..yy.%sssssssssssss~~~~~~^,,,,,^,^^", // y9  魚市場の小屋・あみ (11,9)(12,9)・浜
	" %.%%j%%%.....~~~~~~~~~~~~~~~~~~~~^,,,,,,^^^", // y10 小屋の戸 (5,10)・うきわ (6,10)・あみ番 (11,10)
	" %........kk..~~~~~~~~~~~~~~~~~~~~^,,,,,,,^^", // y11 さかなばこ (10,11)(11,11)
	" %p...........~~~~~~~~~~~~~~~~~z~~^,,,,,,,^^", // y12 つりの決まり (13,12)・みなとの中 (22,12)・灯台のぼうし
	" %.............................h~~^,,,,,,,^^", // y13 防波堤 x14〜30・灯台 (31,13)
	"~~~~~~~~~#~~~~ooooooooo.oo~~~ooo~~^,,,,,,,^^", // y14 桟橋・テトラ・つり座 (23,14)・ふち (27,14)
	"~~~~~~~~~#~~~~~~~~~~~~~~~~~~~~~~~~^I..BbK.^^", // y15 船 (8,15)(10,15)・駅前・時計 (40,15)・時刻表 (41,15)
	"~~~~~~~~~#~~~~~~~~~~~~~~~~~~~~~~~~^eeeeeee^^", // y16 ホーム
	"~~~~~~~~~#~~~~~~~~~~~~~~~~~~~~~~~~EttttttttX", // y17 車止め (34,17)・線路・夜明けの着地 (42,17)・トンネル (43,17)
	"~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~^^^^^^^^^^", // y18 桟橋のさき (9,18)
	"~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~", // y19
];

// ── モブの歩行グラ ──
const GRANDPA = "pub:sprites/mob_ojiichan.png";
const KID = "pub:sprites/mob_child.png";
const WALKER = "pub:sprites/mob_mama.png";
const ANGLER = "pub:sprites/mob_man.png";
const JOGGER = "pub:sprites/mob_student.png";

/** 朝、漁船がかえってくる（岸壁・防波堤の帯。一度だけ seen_umi_fune_asa）。 */
const funeBelt = (x: number, y: number): EventDef => ({
	id: `fune_belt_${x}_${y}`,
	x,
	y,
	trigger: "touch",
	through: true,
	when: (st) => st.flags.tod === "asa" && !st.flags.seen_umi_fune_asa,
	run: async (s) => {
		s.set("seen_umi_fune_asa");
		await s.narrate("とん、とん、とん、と\n漁船の　エンジンの音。");
		await s.narrate("みなとの口から、船が\n一そう　はいってくる。");
	},
});

/** 街灯（(12,4)(36,4) の土手と (10,8) の岸壁で共用。lights は yoru,shinya で点く）。 */
const gaitou = async (s: Story): Promise<void> => {
	const t = s.flag("tod");
	if (t === "shinya") {
		await s.narrate("あかりの輪の中だけ、\nコンクリートが　見える。");
		return;
	}
	if (t === "yoru") {
		await s.narrate("街灯のあかりに、羽虫が\nあつまっている。");
		return;
	}
	if (t === "asa") {
		await s.narrate("街灯。もう、\nきえている。");
		return;
	}
	await s.narrate("しおで　さびた街灯。\nまだ、ついていない。");
};

/** つないである漁船（(8,15)(10,15) の桟橋の両わき）。 */
const fune = async (s: Story, name: string): Promise<void> => {
	const t = s.flag("tod");
	if (t === "shinya") {
		await s.narrate("船は、くろい　かたまりに\nなっている。");
		await s.narrate("ロープが、ぎい、と\nきしんだ。");
		return;
	}
	if (t === "yoru") {
		await s.narrate("船べりに、波が　ちゃぷ\nちゃぷと　あたる音。");
		return;
	}
	if (t === "asa") {
		if (name === "第三") {
			await s.narrate(
				"ここの船は、もう　出ていった\nあとだ。ロープだけ　ういている。",
			);
			return;
		}
		await s.narrate("船の上で、ラジオが\n天気よほうを　言っている。");
		return;
	}
	await s.narrate("小さな漁船が、ロープで\nつながれて　ゆれている。");
	await s.narrate(`へさきに、『${name}　はま丸』。`);
};

/**
 * 防波堤のふちに すわる（(27,14) の海を (27,13) から。seen_suwari_umi）。
 * 深夜は kawara の fumiato と同じ型（目をとじる → 暗転 → 音がふえる → 缶の1行か、からだの1行）。なにも起きない。
 * 朝はみじかく（帰り道のひと休み）。夕方・宵は見るだけ。
 */
const suwaru = async (s: Story): Promise<void> => {
	const t = s.flag("tod");
	if (t !== "shinya" && t !== "asa") {
		if (t === "yoru") {
			await s.narrate("波の音が、足もとから\nのぼってくる。");
			return;
		}
		await s.narrate(
			"ふちの　コンクリートが、\n日なたの　ぬくもりで　あたたかい。",
		);
		return;
	}
	if (s.flag("seen_suwari_umi")) {
		if (t === "shinya" && kanHeld(s)) {
			await kanLine(s);
			return;
		}
		await s.narrate("ふちに　すわって、\nすこし　波の音を　きいた。");
		return;
	}
	const i = await s.choose(["＞＞1 すわる", "＞＞2 やめておく"], {
		cancel: 1,
	});
	if (i !== 0) return;
	s.set("seen_suwari_umi");
	if (t === "asa") {
		await s.narrate("あしを　ぶらぶらさせて、\nすこし　海を　見た。");
		await s.narrate("しおかぜが、まだ\nすこし　つめたい。");
		await s.say("kiriko", "……よし。いくンゴ");
		return;
	}
	await s.narrate("防波堤の　ふちに　すわって、\n目を　とじた。");
	await s.fadeOut(900, "#04060f");
	await s.wait(900);
	await s.fadeIn(900);
	await s.narrate("テトラの　すきまで、波が\nちゃぷ、ちゃぷ、と　鳴る。");
	if (kanHeld(s)) await kanLine(s);
	else await s.narrate("コンクリートが、まだ\nすこし　あたたかい。");
	await s.say("kiriko", "……よし。もうすこし\nあるくンゴ");
};

export const umi: MapDef = {
	id: "umi",
	name: "うみべ",
	// ジオラマ表示の箱（場面ごと。歩けるマスはどれかの箱に入る）
	boxes: [
		{ x: 0, y: 0, w: 13, h: 7 }, // 西の土手と道のおわり
		{ x: 13, y: 0, w: 16, h: 7 }, // 坂と海の家
		{ x: 29, y: 0, w: 15, h: 7 }, // じはんきと道の東
		{ x: 0, y: 7, w: 14, h: 7 }, // 漁港の岸壁
		{ x: 0, y: 14, w: 14, h: 6 }, // 桟橋と海
		{ x: 14, y: 7, w: 17, h: 6 }, // 浜とみなとの中
		{ x: 14, y: 13, w: 17, h: 7 }, // 防波堤
		{ x: 34, y: 7, w: 10, h: 6 }, // 岬の草はら
		{ x: 31, y: 13, w: 13, h: 7 }, // 灯台の先と、駅と線路
	],
	bgm: "@tod",
	// 宵と深夜は海の曲（data/bgm.ts の amb_minasoko「水底にさす光」。灯台のあかりだけの海）
	todBgm: { yoru: "amb_minasoko", shinya: "amb_minasoko" },
	outdoor: true,
	outside: "#070a10",
	tiles,
	rows,
	// 光源: 灯台・街灯3本・ホームの灯り・じはんき（海の上は光らせない＝余白を黒のままに）
	lights: [
		{ x: 31, y: 12, r: 4, color: "#fff4cc", only: "yoru,shinya" }, // 灯台
		{ x: 12, y: 4, r: 3, color: "#ffdf9e", only: "yoru,shinya" },
		{ x: 36, y: 4, r: 3, color: "#ffdf9e", only: "yoru,shinya" },
		{ x: 10, y: 8, r: 3, color: "#ffdf9e", only: "yoru,shinya" }, // みなとの街灯
		{ x: 35, y: 15, r: 2, color: "#ffdf9e", only: "yoru,shinya" }, // ホームの灯り
		{ x: 32, y: 4, r: 1.5, color: "#eef4ff" }, // じはんき
	],
	// 入るたびに生活音を一波（夕方＝坂の上のヒグラシ／朝＝スズメ）。深夜は缶が地区ひとつぶん冷める
	onEnter: async (s) => {
		kanTick(s);
		const t = s.flag("tod");
		if (t === "yu") s.se("higurashi", { pan: -0.2, volume: 0.6 });
		else if (t === "asa") s.se("suzume", { pan: -0.3, volume: 0.6 });
	},
	events: [
		// ── 夜明け（窓の 場面の あと、団地の 坂を くだって 来た 朝。ほかの arrive より先に置く） ──
		// 結①：辞めた 人（レコード「早番」の 声の 主）と すれ違う。もう 何も 見ていない。キリコが だれかも 知らず、会釈だけ 返す
		{
			id: "yoake_arrive",
			x: 4,
			y: 0,
			trigger: "auto",
			once: true,
			when: (st) =>
				st.flags.tod === "asa" &&
				!!st.flags.ending_ready &&
				!st.flags.seen_yoake_umi,
			run: async (s) => {
				s.set("seen_yoake_umi");
				await s.wait(800);
				await s.narrate("坂を　くだると、\n海が　しろく　ひかっていた。");
				s.se("tick", { volume: 0.7 });
				await s.wait(500);
				await s.narrate("ジョギングの　人が、\n坂を　のぼってくる。");
				await s.say(null, "……今日も　早番や", {
					name: "ジョギングの人",
					noPortrait: true,
				});
				await s.narrate("……夜に、レコードで\n聞いた　声だった。");
				await s.say("kiriko", "……おはようンゴ");
				await s.narrate("会釈だけして、\n坂を　のぼっていった。");
				await s.narrate("とおくの　駅の　ベンチに、\nだれか　すわっている。");
			},
		},
		// 結②（頂点）：駅の ベンチの やきう。キリコが 外から「保守」と 書く → まとめカード
		npc(
			"yakiu_end",
			39,
			15,
			"char:nanj",
			async (s) => {
				await s.narrate("野球帽の　人が、朝つゆも\n気に　せず　すわっている。");
				await s.narrate("スマホの　画面に、\n保守村の　スレ。");
				await s.say("nanj", "おう。……早いな");
				await s.say("kiriko", "……やきうンゴ");
				await s.narrate(
					"保守村で　いちばん　長く\n保守していた、名無しの　おんJ民。",
				);
				await s.say("nanj", "外で　見とる　言うたやろ");
				await s.narrate("キリコは、となりに\nすわった。");
				await s.narrate("スマホを　だして、\n書きこんだ。「保守」");
				s.se("item");
				await s.narrate("やきうの　画面に、\nレスが　ひとつ　ふえた。");
				await s.say("nanj", "……草");
				await s.wait(700);
				await s.narrate("漁船の　エンジンの　音が、\nちかづいてくる。");
				s.set("seen_hoshu_end");
				s.set("clear");
				s.set("ending_seen");
				const recs = ALL_RECORDS.filter((id) => s.has(id) > 0).length;
				const myau = ["seen_myau1", "seen_myau2", "seen_myau3"].filter(
					(f) => !!s.flag(f),
				).length;
				const lines = [
					`レコード　${recs}まい`,
					`ミャウミャウ目撃　${myau}かい`,
				];
				if (s.flag("found_miniwai")) lines.push("ミニワイに　会った（もきゅ）");
				if (s.flag("seen_yobigoe_reply")) lines.push("呼び声に　へんじをした");
				else if (s.flag("note_yobigoe")) lines.push("呼び声に　だまっていた");
				lines.push("やきうの　となりで　保守した");
				await s.ending({
					summary: {
						sections: [
							{ title: NIKKI_TITLE, lines: nikkiSummary(s) },
							{ title: "こんやの　きろく", lines },
						],
					},
				});
			},
			{
				dir: "up",
				when: (st) =>
					st.flags.tod === "asa" &&
					!!st.flags.ending_ready &&
					!st.flags.seen_hoshu_end,
			},
		),

		// ── 着いたとき（時間帯ごとに一度だけ） ──
		{
			id: "arrive_yu",
			x: 0,
			y: 0,
			trigger: "auto",
			once: true,
			when: (st) => st.flags.tod === "yu",
			run: async (s) => {
				await s.wait(500);
				await s.narrate("しおの　においがする。");
				await s.narrate("坂の下で、海が\nいちめん　ひかっている。");
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
				await s.narrate("しおかぜに、どこかの\nふろの　においが　まじる。");
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
				await s.narrate("くらくて、海は\n見えない。");
				await s.narrate("灯台のあかりだけが、\nおきへ　のびている。");
			},
		},
		// 朝（エンディングの帰り道は yoake_arrive が受け持つので、ここは ending_ready の無い朝だけ）
		{
			id: "arrive_asa",
			x: 2,
			y: 0,
			trigger: "auto",
			once: true,
			when: (st) => st.flags.tod === "asa" && !st.flags.ending_ready,
			run: async (s) => {
				await s.wait(500);
				await s.narrate("海が、あさの光で\nしろく　ひかっている。");
			},
		},

		// ── 出入り口 ──
		warp("to_danchi", 20, 0, { map: "danchi", x: 15, y: 22, dir: "up" }),
		// トンネルの口（決してワープしない。一歩おしもどす）
		{
			id: "tunnel_mouth",
			x: 43,
			y: 17,
			trigger: "touch",
			through: true,
			run: async (s) => {
				const t = s.flag("tod");
				await s.narrate("レールは、くらい　トンネルの\n中へ　きえている。");
				if (t === "asa" && s.flag("seen_yoake_umi")) {
					await s.say("kiriko", "（……こっちじゃ\nないンゴ）");
				} else if (t === "shinya") {
					await s.narrate("おくから、つめたい風が\nふいてくる。");
				} else {
					await s.say("kiriko", "……入るのは、\nやめておくンゴ");
				}
				await s.move("player", "l");
			},
		},

		// ── 朝の漁船（岸壁と防波堤の帯。どれか一つで一度だけ） ──
		funeBelt(6, 7),
		funeBelt(12, 7),
		funeBelt(16, 13),

		// ── 夕方、トンネルの奥へ電車の音（定時音を正常の側に置く。一度だけ） ──
		...([37, 38] as const).map((x) => ({
			id: `densha_belt_${x}`,
			x,
			y: 12,
			trigger: "touch" as const,
			through: true,
			when: (st: GameState) =>
				st.flags.tod === "yu" && !st.flags.seen_umi_densha,
			run: async (s: Story) => {
				s.set("seen_umi_densha");
				s.se("densha_far", { pan: 0.8, volume: 0.5 });
				await s.narrate("トンネルの　おくで、\n電車の音が　とおくなっていく。");
			},
		})),

		// ── 深夜、防波堤の先で一度だけ（沖のあかり。いさり火かもしれない） ──
		{
			id: "okibi",
			x: 29,
			y: 13,
			trigger: "touch",
			through: true,
			when: (st) => st.flags.tod === "shinya" && !st.flags.seen_umi_okibi,
			run: async (s) => {
				s.set("seen_umi_okibi");
				await s.wait(400);
				await s.narrate("おきのほうに、あかりが\nひとつ　見える。");
				await s.wait(900);
				await s.narrate("……まばたきを　したら、\nなくなっていた。");
				await s.say("kiriko", "……いさり火ンゴ。\nたぶん");
			},
		},

		// ── 北の土手（海の家・じはんき・街灯・道のおわり） ──
		{
			id: "uminoie",
			x: 28,
			y: 4,
			trigger: "talk",
			run: async (s) => {
				const t = s.flag("tod");
				if (t === "shinya") {
					await s.narrate("シャッターに、灯台の\nあかりが　とどいている。");
					return;
				}
				if (t === "yoru") {
					await s.narrate("シャッターの前で、\n虫が　ないている。");
					return;
				}
				if (t === "asa") {
					await s.narrate("シャッターが、あさの光で\nしろく　見える。");
					return;
				}
				await s.narrate(
					"海の家の　シャッター。\n『今年の営業は　おわりました』",
				);
				await s.narrate("『また来年！』の字だけ、\nやけに　大きい。");
			},
		},
		{
			id: "uminoie_menu",
			x: 26,
			y: 4,
			trigger: "talk",
			run: async (s) => {
				if (s.flag("tod") === "shinya") {
					await s.narrate("かべの　メニューは、\nくらくて　よめない。");
					return;
				}
				await s.narrate("かべの　メニュー。『やきそば\nラムネ　かき氷』");
				if (!s.flag("seen_umi_menu")) {
					s.set("seen_umi_menu");
					await s.narrate("かき氷の　ブルーハワイだけ、\n字が　青い。");
					await s.say("kiriko", "（味は、いまだに\nなぞンゴ）");
					return;
				}
				await s.narrate(
					"ラムネの　ねだんに、\nシールが　二まい　かさねてある。",
				);
			},
		},
		{
			id: "vending_ev",
			x: 32,
			y: 4,
			trigger: "talk",
			run: async (s) => {
				const t = s.flag("tod");
				if (t === "shinya") {
					await s.narrate("じはんきだけが、\nこうこうと　ついている。");
					return;
				}
				if (t === "yoru") {
					await s.narrate("じはんきの　あかりに、\n虫が　あつまっている。");
					return;
				}
				if (t === "asa") {
					await s.narrate("じはんきの前に、\nぬれた　長ぐつのあと。");
					return;
				}
				await s.narrate("じはんき。よこっ腹が、\nしおかぜで　さびている。");
			},
		},
		{ id: "lamp_w", x: 12, y: 4, trigger: "talk", run: gaitou },
		{ id: "lamp_e", x: 36, y: 4, trigger: "talk", run: gaitou },
		{
			id: "ikidomari",
			x: 1,
			y: 5,
			trigger: "talk",
			run: async (s) => {
				await s.narrate("生けがきの　むこうは、\n草やぶだ。");
				await s.narrate("道は、ここで\nおわっている。");
			},
		},

		// ── 護岸のチョークの字（水きりの子が かぞえた） ──
		{
			id: "chalk",
			x: 24,
			y: 7,
			trigger: "talk",
			run: async (s) => {
				const t = s.flag("tod");
				if (t === "shinya") {
					await s.narrate("護岸の　チョークの字は、\nくらくて　よめない。");
					return;
				}
				if (t === "yoru") {
					await s.narrate("チョークの字が、街灯で\n白く　うかんでいる。");
					return;
				}
				if (t === "asa") {
					await s.narrate(
						"『213歩』『212歩』の下に、\n『214歩』が　ふえている。",
					);
					await s.say("kiriko", "（あしの　ながさの\nちがいンゴ）");
					return;
				}
				await s.narrate(
					"護岸に、チョークの字。\n『ここから　灯台まで　213歩』",
				);
				await s.narrate("よこに　『212歩』。\nだれかが、かぞえなおした。");
			},
		},
		{
			id: "hama",
			x: 20,
			y: 9,
			trigger: "talk",
			when: (st) => st.flags.tod !== "yu",
			run: async (s) => {
				const t = s.flag("tod");
				if (t === "shinya") {
					await s.narrate("すなが、夜つゆで\nしっとり　している。");
					return;
				}
				if (t === "yoru") {
					await s.narrate("浜の　すなに、\nまだ　昼の　ぬくもり。");
					return;
				}
				await s.narrate("なみうちぎわに、\nひらたい石が　ならんでいる。");
				await s.narrate("だれかの、水きりの\nとっておきらしい。");
			},
		},

		// ── 漁港の岸壁（しお見表・小屋・うきわ・あみ・さかなばこ） ──
		{
			id: "shiomihyo",
			x: 2,
			y: 8,
			sprite: JP.infoSign,
			trigger: "talk",
			fixedDir: true,
			run: async (s) => {
				await s.narrate("しお見表。漁協の人の\n手書きだ。");
				if (s.flag("tod") === "asa") {
					await s.narrate("『満潮　5:52』。\n……いまが、ちょうど　らしい。");
					return;
				}
				await s.narrate("『大潮』に　赤丸。\nすみに、タコの　らくがき。");
				await s.narrate("タコは、はちまきを\nしめている。");
			},
		},
		{
			id: "koya_door",
			x: 5,
			y: 10,
			trigger: "talk",
			run: async (s) => {
				const t = s.flag("tod");
				if (t === "shinya") {
					await s.narrate("戸は、しまっている。\nカギのかわりに、針金。");
					return;
				}
				if (t === "yoru") {
					await s.narrate("小屋の中から、ラジオの\nナイター中継が　きこえる。");
					return;
				}
				if (t === "asa") {
					await s.narrate(
						"戸が、ぜんぶ　あいている。\n中から、氷を　くだく音。",
					);
					return;
				}
				await s.narrate("魚市場の　小屋。戸が\n半分　あいている。");
				await s.narrate("中は　からっぽで、\n氷の　においだけ　する。");
			},
		},
		{
			id: "ukiwa",
			x: 6,
			y: 10,
			trigger: "talk",
			run: async (s) => {
				const t = s.flag("tod");
				if (t === "shinya") {
					await s.narrate("小屋のかべの　うきわが、\n風で　こつん、と鳴った。");
					return;
				}
				if (t === "asa") {
					await s.narrate("うきわが、朝つゆで\nぬれている。");
					return;
				}
				await s.narrate("小屋のかべに、こどもの\nうきわが　かけてある。");
				await s.narrate("はり紙。『おとしもの\n8月3日　はまで』");
				if (t === "yu" && !s.flag("seen_umi_ukiwa")) {
					s.set("seen_umi_ukiwa");
					await s.narrate("あひるの　かおが、\nだいぶ　日にやけている。");
				}
			},
		},
		{
			id: "ami_a",
			x: 11,
			y: 9,
			trigger: "talk",
			run: async (s) => {
				const t = s.flag("tod");
				if (t === "shinya") {
					await s.narrate("あみに、夜つゆが\nついている。");
					return;
				}
				if (t === "yoru") {
					await s.narrate("あみから、しおと　海そうの\nにおいが　する。");
					return;
				}
				if (t === "asa") {
					await s.narrate("あみの　半分が、もう\nたたんで　ある。");
					return;
				}
				await s.narrate("干してある　あみ。\nところどころ、あたらしい糸。");
			},
		},
		{
			id: "ami_b",
			x: 12,
			y: 9,
			trigger: "talk",
			run: async (s) => {
				if (s.flag("tod") === "shinya") {
					await s.narrate("あみの　うきが、\n白く　ならんでいる。");
					return;
				}
				await s.narrate("あみに、小さな　カニが\nひっかかっている。");
				await s.narrate("……にげていった。");
			},
		},
		{
			id: "sakanabako",
			x: 10,
			y: 11,
			trigger: "talk",
			run: async (s) => {
				const t = s.flag("tod");
				if (t === "shinya") {
					await s.narrate("からの　さかなばこが、\nきちんと　つんである。");
					return;
				}
				if (t === "yoru") {
					await s.narrate("さかなばこから、\nうすく　魚の　におい。");
					return;
				}
				if (t === "asa") {
					await s.narrate(
						"さかなばこに、氷と　アジが\nぎっしり　つまっている。",
					);
					return;
				}
				await s.narrate("さかなばこ。マジックで\n『はま丸』と　書いてある。");
			},
		},
		{
			id: "bucket",
			x: 2,
			y: 12,
			trigger: "talk",
			run: async (s) => {
				await s.narrate("ポリバケツ。ふたに\n『つりえさ　もちかえり』。");
				await s.narrate("『り』だけ、あとから\nたしてある。");
			},
		},
		{
			id: "tsuri_rule",
			x: 13,
			y: 12,
			sprite: JP.infoSign,
			trigger: "talk",
			fixedDir: true,
			run: async (s) => {
				s.set("seen_umi_rule");
				await s.narrate(
					"『防波堤の　つりは　日の出\nから　日の入りまで　漁協』",
				);
				await s.narrate("下に、べつの字で\n『ネコに　えさを　やらないで』");
			},
		},

		// ── 桟橋と船・海 ──
		{
			id: "fune_a",
			x: 8,
			y: 15,
			trigger: "talk",
			run: async (s) => {
				await fune(s, "第三");
			},
		},
		{
			id: "fune_b",
			x: 10,
			y: 15,
			trigger: "talk",
			run: async (s) => {
				await fune(s, "第五");
			},
		},
		{
			id: "sanbashi_saki",
			x: 9,
			y: 18,
			trigger: "talk",
			run: async (s) => {
				const t = s.flag("tod");
				if (t === "shinya") {
					await s.narrate("まっくらな　海。\n波の音だけが　とどく。");
					return;
				}
				if (t === "yoru") {
					await s.narrate("海と　空の　さかいめが、\nもう　わからない。");
					return;
				}
				if (t === "asa") {
					await s.narrate("水平線が、しろく\nにじんでいる。");
					return;
				}
				await s.narrate("夕日が、海の上に\n一本の　道を　つくっている。");
			},
		},

		// ── 防波堤（みなとの中・テトラ・すわる所・灯台） ──
		{
			id: "minato_naka",
			x: 22,
			y: 12,
			trigger: "talk",
			run: async (s) => {
				const t = s.flag("tod");
				if (t === "shinya") {
					await s.narrate("みなとの中は　しずかで、\n水の音も　しない。");
					return;
				}
				if (t === "yoru") {
					await s.narrate("みなとの水に、街灯が\nゆらゆら　うつっている。");
					return;
				}
				if (t === "asa") {
					await s.narrate(
						"かえってきた船の　波が、\nみなとの中まで　とどいた。",
					);
					return;
				}
				await s.narrate("みなとの中は、\n波が　たたない。");
				await s.narrate("――ぴしゃ、と\nボラが　はねた。");
			},
		},
		{
			id: "tetora",
			x: 19,
			y: 14,
			trigger: "talk",
			run: async (s) => {
				const t = s.flag("tod");
				if (t === "shinya") {
					await s.narrate("テトラの　かげが、\nくろく　かさなっている。");
					return;
				}
				if (t === "yoru") {
					await s.narrate("テトラの　おくで、\n波が　ごぼ、と鳴る。");
					return;
				}
				if (t === "asa") {
					await s.narrate("テトラの　あたまに、\nカモメが　一羽。");
					return;
				}
				await s.narrate("テトラポッドの　すきまで、\nフナムシが　にげた。");
			},
		},
		{
			id: "fuchi",
			x: 27,
			y: 14,
			trigger: "talk",
			run: suwaru,
		},
		{
			id: "toudai",
			x: 31,
			y: 13,
			trigger: "talk",
			run: async (s) => {
				const t = s.flag("tod");
				if (!s.flag("seen_toudai")) {
					s.set("seen_toudai");
					await s.narrate("赤い　ぼうしの、\nちいさな　灯台。");
					await s.narrate("銘板。『昭和三十八年\n初点灯』");
					return;
				}
				if (t === "shinya") {
					await s.narrate("灯台の　あかりだけが、\nおきへ　のびている。");
					return;
				}
				if (t === "yoru") {
					await s.narrate("灯台に、あかりが　入った。\nジジ、と　小さな音。");
					return;
				}
				if (t === "asa") {
					await s.narrate("灯台の　あかりが、\nいま　きえた。");
					return;
				}
				await s.narrate(
					"銘板の下に、もう一行。\n『光の　とどく　きょり　八海里』",
				);
				await s.say("kiriko", "（かいり……\nたぶん、遠いンゴ）");
			},
		},

		// ── 岬の駅（車止め・時計・時刻表） ──
		{
			id: "kurumadome",
			x: 34,
			y: 17,
			trigger: "talk",
			run: async (s) => {
				const t = s.flag("tod");
				await s.narrate("線路の　おわり。車止めの\nむこうは、もう　海だ。");
				if (t === "shinya") {
					await s.narrate("車止めの　すぐ下で、\n波の音。");
					return;
				}
				if (t === "yoru") {
					await s.narrate("車止めの　赤い板に、\n灯台の　あかりが　とどく。");
					return;
				}
				if (t === "asa") {
					await s.narrate("車止めに、あさの光が\nあたっている。");
				}
			},
		},
		{
			id: "eki_tokei",
			x: 40,
			y: 15,
			trigger: "talk",
			run: async (s) => {
				const t = s.flag("tod");
				if (t === "shinya") {
					await s.narrate("ホームの時計。――2:00。");
					return;
				}
				if (t === "yoru") {
					await s.narrate(`ホームの時計。――${yoruClock(s, 2)}。`);
					await s.narrate("文字盤に、羽虫が\n一ぴき　とまっている。");
					return;
				}
				if (t === "asa") {
					await s.narrate("ホームの時計。――5:48。");
					await s.narrate("秒しんが、こつ、こつ、と\nうごいている。");
					return;
				}
				await s.narrate("ホームの時計。――17:38。");
				await s.narrate("文字盤が、しおで\nすこし　くもっている。");
			},
		},
		{
			id: "jikokuhyo",
			x: 41,
			y: 15,
			sprite: JP.infoSign,
			trigger: "talk",
			fixedDir: true,
			run: async (s) => {
				if (s.flag("tod") === "shinya") {
					await s.narrate("時刻表。つぎの電車の\nらんは、朝まで　空いている。");
					return;
				}
				await s.narrate("時刻表。のぼりが\n一日　四本。くだりは　ない。");
				await s.narrate("……ここが、はしっこ\nだかららしい。");
			},
		},
		{
			id: "eki_bench",
			x: 38,
			y: 15,
			trigger: "talk",
			run: async (s) => {
				const t = s.flag("tod");
				if (t === "asa") {
					if (s.flag("seen_hoshu_end")) {
						await s.narrate("ベンチに、朝つゆ。\n……ふたりぶん、かわいている。");
						return;
					}
					await s.narrate("ベンチに、朝つゆ。\nすわるのは、やめておく。");
					return;
				}
				await s.narrate("ホームの　ベンチ。\nせもたれに、うすい　らくがき。");
				await s.narrate("『また　夏に』");
			},
		},

		// ── 夕方の人たち（くだらない雑談だけ。説明しない） ──
		// あみ番のじいちゃん（3層: 初回／二層目=せがれの船／待機）
		npc(
			"amiban",
			11,
			10,
			GRANDPA,
			async (s) => {
				if (!s.flag("seen_amiban")) {
					s.set("seen_amiban");
					await s.say(
						null,
						"あみの目は、ひとつ　やぶれ\nると、となりも　やぶれる",
						{
							name: "あみ番",
						},
					);
					await s.say("kiriko", "（……なにかの\nたとえンゴ？）");
					await s.say(null, "たとえじゃねえ。\nあみの話だ", { name: "あみ番" });
					return;
				}
				if (!s.flag("seen_amiban2")) {
					s.set("seen_amiban2");
					await s.say(
						null,
						"あしたの朝、四時に　出る。\n……おれじゃなく、せがれがな",
						{
							name: "あみ番",
						},
					);
					await s.say("kiriko", "おじいさんは、\n出ないンゴ？");
					await s.say(null, "おれは　あみ番。\n陸の　船長だ", {
						name: "あみ番",
					});
					return;
				}
				await s.narrate("指が、ずっと\nうごいている。");
				await s.say(null, "……ここ、もう　一目", { name: "あみ番" });
			},
			{ dir: "up", when: (st) => st.flags.tod === "yu" },
		),
		npc(
			"mizukiri_umi",
			19,
			9,
			KID,
			async (s) => {
				if (!s.flag("seen_mizukiri_umi")) {
					s.set("seen_mizukiri_umi");
					await s.say(null, "見てて。……そりゃっ", { name: "浜の子" });
					await s.narrate("石は、三回　はねて\nしずんだ。");
					await s.say(null, "……いまの、四回に\nしといて", { name: "浜の子" });
					await s.say("kiriko", "（水ましンゴ）");
					return;
				}
				await s.say(null, "護岸の　歩数、あれ\nぼくが　かぞえたんだ", {
					name: "浜の子",
				});
				await s.say(null, "……にいちゃんは、\n212だって　言うけど", {
					name: "浜の子",
				});
			},
			{ dir: "down", when: (st) => st.flags.tod === "yu" },
		),
		npc(
			"inu_umi",
			16,
			5,
			WALKER,
			async (s) => {
				if (!s.flag("seen_inu_umi")) {
					s.set("seen_inu_umi");
					await s.narrate("犬が、海のほうへ\nリードを　ひっぱっている。");
					await s.say(
						null,
						"この子、夏じゅう　およいで\nたから、まだ　その気なの",
						{
							name: "犬のさんぽの人",
						},
					);
					await s.say("kiriko", "（もう、秋ンゴ）");
					return;
				}
				await s.say(null, "かえったら、\nシャンプーなのよ", {
					name: "犬のさんぽの人",
				});
			},
			{ wander: true, when: (st) => st.flags.tod === "yu" },
		),
		npc(
			"tsuribito_yu",
			23,
			14,
			ANGLER,
			async (s) => {
				if (!s.flag("seen_tsuribito_umi")) {
					s.set("seen_tsuribito_umi");
					await s.say(null, "アジは、もうちょい\nくらくなってからだな", {
						name: "つり人",
					});
					if (s.flag("seen_umi_rule")) {
						await s.say(
							"kiriko",
							"（看板には、日の入り\nまでって　あったンゴ）",
						);
						await s.say(
							null,
							"日の入りの『入り』が、\nいちばん　ながいんだよ",
							{
								name: "つり人",
							},
						);
					}
					return;
				}
				await s.narrate("うきが、夕日の中で\nちかちかしている。");
			},
			{ dir: "down", when: (st) => st.flags.tod === "yu" },
		),

		// ── 朝の人たち（夕方の setup の payoff。帰り道なので、しずかに） ──
		npc(
			"amiban_asa",
			11,
			10,
			GRANDPA,
			async (s) => {
				if (!s.flag("seen_amiban_asa")) {
					s.set("seen_amiban_asa");
					if (s.flag("ending_ready")) {
						await s.say(null, "はやいね。……気いつけて\nかえんな", {
							name: "あみ番",
						});
					}
					await s.say(null, "ほら、あの音。\nせがれの船だ", { name: "あみ番" });
					if (s.flag("seen_amiban2")) {
						await s.say(null, "ゆうべの　あみが、\nいま　あがってくる", {
							name: "あみ番",
						});
						await s.say("kiriko", "（陸の　船長ンゴ）");
					}
					return;
				}
				await s.narrate("みなとの口を、\nじっと　見ている。");
			},
			{ dir: "down", when: (st) => st.flags.tod === "asa" },
		),
		npc(
			"tsuribito_asa",
			23,
			14,
			ANGLER,
			async (s) => {
				if (!s.flag("seen_tsuribito_asa")) {
					s.set("seen_tsuribito_asa");
					await s.say(null, "日の出から、ってな。\nきっちり　守ってるだろ", {
						name: "つり人",
					});
					if (s.flag("seen_tsuribito_umi")) {
						await s.say("kiriko", "ゆうべは、アジ\nつれたンゴ？");
						await s.say(null, "……それは、\nきかない　やくそく", {
							name: "つり人",
						});
					}
					return;
				}
				await s.narrate("バケツの中は、\n海の水だけだ。");
			},
			{ dir: "down", when: (st) => st.flags.tod === "asa" },
		),
		npc(
			"jogger_asa",
			30,
			5,
			JOGGER,
			async (s) => {
				if (!s.flag("seen_jogger_umi")) {
					s.set("seen_jogger_umi");
					await s.narrate("おはようございます、と\n息だけで　言われた。");
					await s.narrate("……おはようございます。");
					return;
				}
				await s.narrate("坂の下で、ひとつ\nのびを　していった。");
			},
			// 結の 朝は 出さない（坂で すれ違った 辞めた 人と 重ねない）
			{
				wander: true,
				when: (st) => st.flags.tod === "asa" && !st.flags.ending_ready,
			},
		),
	],
};
