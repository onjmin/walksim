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
//           夜ふけ（shinyaStep>=7）は、あみ番の「四時に　出る」を聞いた人にだけ、第三 はま丸に あかり（seen_umi_fune_shinya）
//   朝   … 結の 帰り道だけ（ending_ready の 無い 朝は 通しの プレイで 来ないので arrive_asa は 置かない）。
//           漁船がかえってくる（funeBelt）。NPC 3体（あみ番・つり人・駅の ベンチの やきう。船は音と文）。
//           結（STORY.md §5.5・§5.9）：まちのどおりの 窓の 場面（転）の あと、団地の 坂を くだって 来る
//           （tod="asa"・ending_ready）。坂で 辞めた 人（早番）と すれ違い（yoake_arrive）、
//           駅の ベンチの やきうの となりで「保守」と 書いて おわる（yakiu_end → まとめカード）
//
// 海の中の 筋（段・時間帯・回収）:
//   電気うき … 宵、つり座（tsuri_za）から 見える 防波堤の さきの 置きざおと 赤い 電気うき（seen_umi_denkiuki）→
//              深夜は さおが きえて うろこ一まい（うきを 見た 人だけ。seen_umi_uroko）→
//              朝の つり人「……それは、きかない　やくそく」（日の入りまでの 決まりの 外で だれかが つっていた）→
//              2回目に うろこの 話（seen_umi_uroko_neko）「ねこの　ぶんだ」→ sakanabako の ねこに キリコの 一言
//   あみ     … 夕方の あたらしい糸（seen_umi_ami。せがれの 話を 聞いた 人には まだ しろい）→ 宵は あみ針 →
//              深夜の 夜ふけに 半分 なくなる（seen_amiban2。第三の あかりと 同じ 条件）→ 朝、第三が もどった あと ぬれて もどる
//   夕日の道 … 桟橋の さき（seen_umi_yuhi）→ 宵は 灯台の あかりが とおる → 深夜は 第三の エンジン → 朝は 船の すじ
//   はしっこ … 車止め・道の おわり・河口0.0km を 三つ 見る（seen_umi_hashikko。apart shimi が 読む）
//   海の家と ベンチ … 『また来年！』（seen_umi_uminoie）と『いつの？』（seen_umi_bench2）が そろうと 一度（seen_umi_kotae）
//   しお見表 … 夕方の『満潮　6:52』の 赤丸（seen_umi_shiomi）→ 朝は「もう　すぎている」
//   つり人の ぬし … kawara の じいさんの 鯉（seen_tsuri2）を 夕方の つり人に きく（seen_umi_nushi）
//   電車     … 夕方の 車庫の 音（seen_umi_densha）→ トンネルの 口（夕・深夜）・時刻表（深夜）・room の 布団の 遠い音
//   始発     … 時刻表の 夕方『さいごは　17:20』→ 宵は 赤い字の『始発　5:58』（seen_umi_shihatsu）→ 朝「もう　出ていった」
//
// 座標: 北 (20,0)→danchi(15,22)・danchi からの着地 (20,1) 下向き。
// 線路 y17（x35〜42 が歩ける）。(43,17) はトンネルの口（決してワープしない・一歩押しもどす）。
// ホーム(y16)→駅前(y15)→岬の草はら→海ぞいの道 と歩いてつながる。

import type {
	EventDef,
	GameState,
	MapDef,
	Story,
	TileDef,
} from "../../engine/defs";
import { npc, warp } from "../helpers";
import {
	arrived,
	asaClock,
	kanHeld,
	kanLine,
	kanShinya,
	kanTick,
	kirokuLines,
	NIKKI_TITLE,
	nikkiSummary,
	numFlag,
	shinyaClock,
	shinyaStep,
	yoruAkubi,
	yoruClock,
	yoruStep,
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
	"~~~~~~~~~#~~~~~~~~~~~~~~~~~~~~~~~~EttttttttX", // y17 車止め (34,17)・線路・トンネル (43,17)
	"~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~^^^^^^^^^^", // y18 桟橋のさき (9,18)
	"~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~", // y19
];

// ── モブの歩行グラ ──
const GRANDPA = "pub:sprites/mob_ojiichan.png";
const KID = "pub:sprites/mob_child.png";
const WALKER = "pub:sprites/mob_mama.png";
const ANGLER = "pub:sprites/mob_man.png";

/**
 * 朝、漁船がかえってくる（岸壁・防波堤の帯。一度だけ seen_umi_fune_asa）。
 * 夕方に桟橋の『第三』を見た人（seen_umi_fune_yu）か 深夜に あかりを見た人（seen_umi_fune_shinya）には船の名、
 * 深夜の人には もう一行。
 * 読む所: fune（asa の第三）・minato_naka（asa）・vending_ev（asa）。
 */
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
		// shiomihyo（yu）の 赤丸（seen_umi_shiomi）を 見た 人だけ
		if (s.flag("seen_umi_shiomi"))
			await s.narrate("しお見表の　赤丸の\nころだ。");
		if (!s.flag("seen_umi_fune_yu") && !s.flag("seen_umi_fune_shinya")) return;
		await s.narrate("へさきの字は、『第三　はま丸』。");
		if (s.flag("seen_umi_fune_shinya"))
			await s.narrate("……夜中に、あかりの\nついていた　船だ。");
	},
});

/**
 * つないである漁船（(8,15)(10,15) の桟橋の両わき）。
 * 『第三』は、あみ番の せがれの船（夕方の amiban2「あしたの朝、四時に　出る」）。
 * 夕方に見て seen_umi_fune_yu → 深夜の 夜ふけ（shinyaStep>=7・seen_amiban2）に あかりと エンジン（seen_umi_fune_shinya）→
 * 朝は funeBelt で もどってくる（seen_umi_fune_asa）。人は出さない（灯りと 機械の音だけ）。
 * 『第五』は 第三の 対: 深夜は 第三の あかりを 見た 人に「くらい　まま」、
 * 朝は room tv の 天気よほう（seen_tenki）を 見た 人に 船の ラジオの「きょうは　はれ」（⑲）。
 */
const fune = async (s: Story, name: string): Promise<void> => {
	const t = s.flag("tod");
	if (t === "shinya") {
		if (name === "第三" && s.flag("seen_amiban2") && shinyaStep(s) >= 7) {
			s.set("seen_umi_fune_shinya");
			await s.narrate("第三　はま丸に、あかりが\nひとつ　ついている。");
			await s.narrate("エンジンを　あたためる\n音が　する。");
			return;
		}
		// 第三の あかり（seen_umi_fune_shinya）を 見た あとの 第五
		if (name === "第五" && s.flag("seen_umi_fune_shinya")) {
			await s.narrate(
				"第五は、となりの　あかりの\nよこで、くらい　まま　ねている。",
			);
			return;
		}
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
			// funeBelt で もどってくるのを 見た人だけ
			if (s.flag("seen_umi_fune_asa")) {
				await s.narrate("第三　はま丸が、もどって\nきている。氷を　おろす音。");
				return;
			}
			await s.narrate(
				"ここの船は、もう　出ていった\nあとだ。ロープだけ　ういている。",
			);
			return;
		}
		// ⑲ room tv（yoru）の「あしたは、はれ」（seen_tenki）を 見た 人だけ
		if (s.flag("seen_tenki")) {
			await s.narrate("船の　ラジオが、『きょうは\nはれ』と　言っている。");
			await s.say("kiriko", "（テレビの　とおりンゴ）");
			return;
		}
		await s.narrate("船の上で、ラジオが\n天気よほうを　言っている。");
		return;
	}
	if (name === "第三") s.set("seen_umi_fune_yu");
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
	// ⑮ kawara の ススキ（got_susuki）が、まだ room の コップに さされず ポケットに ある 人
	else if (s.flag("got_susuki") && !s.flag("seen_susuki_kabin"))
		await s.narrate("ポケットの　ススキが、\nしおかぜに　ゆれた。");
	else await s.narrate("コンクリートが、まだ\nすこし　あたたかい。");
	await s.say("kiriko", "……よし。もうすこし\nあるくンゴ");
};

/**
 * ② はしっこ: 線路の 車止め（seen_umi_kurumadome）・道の おわり（seen_umi_ikidomari）・
 * 河口の きょり標（seen_umi_kakou）を 三つとも 見たら 一度（seen_umi_hashikko。apart shimi が 朝に 読む）。
 * 呼ぶ所: kurumadome・ikidomari・kyori_0 の さいご。
 */
const hashikko = async (s: Story): Promise<void> => {
	if (s.flag("seen_umi_hashikko")) return;
	if (
		!s.flag("seen_umi_kurumadome") ||
		!s.flag("seen_umi_ikidomari") ||
		!s.flag("seen_umi_kakou")
	)
		return;
	s.set("seen_umi_hashikko");
	await s.say("kiriko", "（道も、川も、線路も\nここで　おしまいンゴ）");
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
				// 1行目は、ゆうべ この海を 見たかで かえる（深夜 ＞ 宵 ＞ 夕方 ＞ はじめて）
				// 宵の枝は arrive_yoru で 見た方（seen_umi_furo 1=ふろ／2=つめたい風）の 回収
				const furo = numFlag(s, "seen_umi_furo");
				await s.narrate(
					arrived(s, "umi", "shinya")
						? "坂を　くだると、ゆうべ\n見えなかった　海が　ひかっていた。"
						: furo === 1
							? "坂を　くだると、ゆうべ\nふろの　においが　した　海。"
							: furo === 2
								? "坂を　くだると、ゆうべ\nかぜの　つめたかった　海。"
								: arrived(s, "umi", "yu")
									? "坂を　くだると、夕方は\n金いろだった　海が、しろい。"
									: "坂を　くだると、\n海が　しろく　ひかっていた。",
				);
				s.se("tick", { volume: 0.7 });
				await s.wait(500);
				await s.narrate("ジョギングの　人が、\n坂を　のぼってくる。");
				await s.say(null, "……今日も　早番や", {
					name: "ジョギングの人",
					noPortrait: true,
				});
				await s.narrate("……夜に、レコードで\n聞いた　声だった。");
				// ⑪ street eshaku（yu）の 作業着の 人を 見た 人だけ（2回目の くつひもまで 見た 人は そっちを）
				if (s.flag("seen_eshaku_kutsu"))
					await s.narrate("夕方、くつひもを\nむすびなおしていた　人だ。");
				else if (s.flag("seen_eshaku_st"))
					await s.narrate("夕方、まちのどおりで\n会釈を　くれた　人だ。");
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
				// eki_bench の らくがきを 見た 人だけ
				if (s.flag("seen_umi_bench"))
					await s.narrate("せもたれの『また　夏に』が、\nせなかに　あたる。");
				// ㉛ room pc（asa）の「……吾輩も、あとで　書くンゴ」を 見た 人だけ
				if (s.flag("seen_asa_thread"))
					await s.say("kiriko", "（あとで　書くって、\n言ったンゴ）");
				await s.narrate("スマホを　だして、\n書きこんだ。「保守」");
				s.se("item");
				await s.narrate("やきうの　画面に、\nレスが　ひとつ　ふえた。");
				await s.say("nanj", "……草");
				await s.wait(700);
				// funeBelt で 第三の もどり（seen_umi_fune_asa）を 見た 人は 岸壁の 氷の 音（深夜の あかりも 見た 人は 第三と）
				await s.narrate(
					s.flag("seen_umi_fune_asa")
						? s.flag("seen_umi_fune_shinya")
							? "岸壁で、第三の　氷を\nおろす音が　している。"
							: "岸壁で、氷を　おろす音が\nしている。"
						: "漁船の　エンジンの　音が、\nちかづいてくる。",
				);
				s.set("seen_hoshu_end");
				s.set("clear");
				s.set("ending_seen");
				const recs = ALL_RECORDS.filter((id) => s.has(id) > 0).length;
				const lines = [`レコード　${recs}まい`, ...kirokuLines(s)];
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
				await s.narrate("坂の下で、海が\nいちめん　金いろに　ひかっている。");
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
				// 宵の段（yoruStep）。はやく来れば ふろの におい、まわってから来れば つめたい風。
				// seen_umi_furo 数（1=ふろ／2=つめたい風）。朝の yoake_arrive の 1行目が 見た方を 読む
				s.set("seen_umi_furo", yoruStep(s) < 2 ? 1 : 2);
				await s.narrate(
					yoruStep(s) < 2
						? "しおかぜに、どこかの\nふろの　においが　まじる。"
						: "しおかぜが、\nだいぶ　つめたく　なった。",
				);
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
		// 朝の着きは yoake_arrive だけ（ending_ready の 無い 朝は 通しの プレイで 来ない）

		// ── ② 河口の きょり標（やまみち 14.0km・かわら 12.5km の つづき。護岸の 石段の よこ） ──
		{
			id: "kyori_0",
			x: 19,
			y: 7,
			sprite: JP.signpost,
			trigger: "talk",
			fixedDir: true,
			// 見ただけで seen_umi_kakou（② はしっこの 一つ）。どの 道でも さいごに hashikko
			run: async (s) => {
				s.set("seen_umi_kakou");
				const hyou = async (): Promise<void> => {
					await s.narrate("くいの　きょり標。\n『河口　0.0km』");
					// ㉒ kawara sagiBelt（asa）で とびたつのを 見た 人だけ、一度
					if (
						s.flag("tod") === "asa" &&
						s.flag("seen_sagi_asa") &&
						!s.flag("seen_sagi_umi")
					) {
						s.set("seen_sagi_umi");
						await s.narrate("河口の　浅瀬に、\nしらさぎが　一羽　立っている。");
					}
					if (s.flag("seen_kyori_14") && s.flag("seen_kyori_12")) {
						if (!s.flag("seen_kyori_0")) {
							s.set("seen_kyori_0");
							await s.narrate("14.0、12.5、……0.0。");
							await s.say("kiriko", "……やまの　上から、\nここまで　来たンゴ");
							return;
						}
						await s.narrate("川は、ここで　おしまいだ。");
						return;
					}
					if (s.flag("seen_kyori_14") || s.flag("seen_kyori_12")) {
						await s.say("kiriko", "（……あの　くいの、\nつづきンゴ）");
						return;
					}
					await s.narrate("川は、浜の　はしで\n海に　とけている。");
				};
				await hyou();
				await hashikko(s);
			},
		},

		// ── 出入り口 ──
		warp("to_danchi", 20, 0, { map: "danchi", x: 15, y: 22, dir: "up" }),
		// トンネルの口（決してワープしない。一歩おしもどす）
		// ④ 夕方の densha_belt（seen_umi_densha）で 車庫へ 入る 音を 聞いた 人は、夕方は その 音の ゆくえ・
		// 深夜は 車庫で ねむる 電車。聞いていない 人の 深夜は、なにも きこえない。宵は 風だけ（人は 出さない）
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
					await s.narrate(
						s.flag("seen_umi_densha")
							? "夕方の　電車が、おくの\n車庫で　ねむっている。"
							: "おくから、なにも\nきこえない。",
					);
				} else if (t === "yoru") {
					await s.narrate("おくから、ひんやりした\n風が　出てくる。");
				} else {
					if (t === "yu" && s.flag("seen_umi_densha"))
						await s.narrate("さっきの　電車の　音は、\nこの　おくへ　きえた。");
					await s.say("kiriko", "……入るのは、\nやめておくンゴ");
				}
				await s.move("player", "l");
			},
		},

		// ── 朝の漁船（岸壁と防波堤の帯。どれか一つで一度だけ） ──
		funeBelt(6, 7),
		funeBelt(12, 7),
		funeBelt(16, 13),

		// ── 夕方、トンネルの奥の車庫へ電車が入る音（一度だけ） ──
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
				await s.narrate(
					"トンネルの　むこうの　車庫へ、\n電車が　入っていく音。",
				);
			},
		})),

		// ── 北の土手（海の家・じはんき・道のおわり。街灯は 灯りだけ＝点く・消えるは 灯台に まかせる） ──
		// 海の家の『また来年！』（seen_umi_uminoie）と、駅の ベンチの『いつの？』（seen_umi_bench2）。
		// どちらを 先に 見ても、二つ目で 一度だけ キリコが 答える（seen_umi_kotae）
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
				s.set("seen_umi_uminoie");
				await s.narrate(
					"海の家の　シャッター。\n『今年の営業は　おわりました』",
				);
				await s.narrate("『また来年！』の字だけ、\nやけに　大きい。");
				// eki_bench の『いつの？』（seen_umi_bench2）を 先に 見た 人だけ、一度
				if (s.flag("seen_umi_bench2") && !s.flag("seen_umi_kotae")) {
					s.set("seen_umi_kotae");
					await s.say("kiriko", "（海の家は、\n『また来年！』ンゴ）");
				}
			},
		},
		{
			id: "uminoie_menu",
			x: 26,
			y: 4,
			trigger: "talk",
			run: async (s) => {
				// 深夜は、街灯の 輪の 外
				const t = s.flag("tod");
				if (t === "shinya") {
					await s.narrate("かべの　メニューは、\nくらくて　よめない。");
					return;
				}
				// 宵は 字が よめない かわりに、夕方の 店の のこりが ひとつ
				if (t === "yoru") {
					await s.narrate(
						"ラムネの　あきびんが、\nかべに　一本　立てかけて　ある。",
					);
					return;
				}
				// 筋(54) 朝は、夕方の ブルーハワイの 字を 見た 人だけ
				if (t === "asa" && s.flag("seen_umi_menu")) {
					await s.narrate("ブルーハワイの　字に、\n朝日が　あたって　青い。");
					// キリコの 一言は 一度だけ（seen_umi_menu_asa）
					if (!s.flag("seen_umi_menu_asa")) {
						s.set("seen_umi_menu_asa");
						await s.say("kiriko", "（やっぱり　なぞンゴ）");
					}
					return;
				}
				await s.narrate("かべの　メニュー。『やきそば\nラムネ　かき氷』");
				if (!s.flag("seen_umi_menu")) {
					s.set("seen_umi_menu");
					await s.narrate("かき氷の　ブルーハワイだけ、\n字が　青い。");
					await s.say("kiriko", "（味は、いまだに\nなぞンゴ）");
					// 筋(54) は umi → suupaa reitou の 一方向（suupaa は umi を 見た 人にしか
					// シロップを 出さないので、逆向きの「スーパーでも」は 見ていない 回収になる）
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
					await kanShinya(s);
					return;
				}
				if (t === "yoru") {
					await s.narrate(
						"いちばん　はしの　ボタンが、\n『あったか～い』に　かわっている。",
					);
					return;
				}
				if (t === "asa") {
					await s.narrate("じはんきの前に、\nぬれた　長ぐつのあと。");
					// funeBelt で 船が もどるのを 見た 人だけ
					if (s.flag("seen_umi_fune_asa"))
						await s.narrate("あき缶入れに、まだ\nあたたかい　缶が　一本。");
					return;
				}
				await s.narrate("じはんき。よこっ腹が、\nしおかぜで　さびている。");
			},
		},
		// 道の おわり（② はしっこの 一つ。seen_umi_ikidomari）
		{
			id: "ikidomari",
			x: 1,
			y: 5,
			trigger: "talk",
			run: async (s) => {
				s.set("seen_umi_ikidomari");
				await s.narrate("生けがきの　むこうは、\n草やぶだ。");
				await s.narrate("道は、ここで\nおわっている。");
				await hashikko(s);
			},
		},

		// ── 護岸のチョークの字（水きりの子が かぞえた。夕方に見て seen_umi_chalk → 浜の子の歩数の話・朝の『214歩』） ──
		{
			id: "chalk",
			x: 24,
			y: 7,
			trigger: "talk",
			run: async (s) => {
				const t = s.flag("tod");
				if (t === "shinya") {
					// 字は 読ませない（灯台の あかりは 護岸を なでるだけ）
					await s.narrate(
						"灯台の　あかりが　とおるたび、\n護岸が　白く　うかぶ。",
					);
					return;
				}
				if (t === "yoru") {
					// 街灯の 輪の 外
					await s.narrate("チョークの字は、街灯の\n輪の　そとに　ある。");
					return;
				}
				if (t === "asa") {
					if (s.flag("seen_umi_chalk")) {
						await s.narrate(
							"『213歩』『212歩』の下に、\n『214歩』が　ふえている。",
						);
						await s.say("kiriko", "（あしの　ながさの\nちがいンゴ）");
						return;
					}
					await s.narrate(
						"『213歩』『212歩』『214歩』。\n字が、三つ　ならんでいる。",
					);
					return;
				}
				s.set("seen_umi_chalk");
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
					await s.narrate("すなに、はだしの　あとが\nいくつも　のこっている。");
					return;
				}
				// ⑥ 朝の石の山（夕方の 浜の子 mizukiri_umi の回収。くらべた ＞ 水まし ＞ 見ていない）
				if (s.flag("seen_mizukiri_kurabe")) {
					await s.narrate("ひらたい石が、二つの　山に\nわけて　おいてある。");
					await s.say("kiriko", "（ひきわけンゴ）");
					return;
				}
				if (s.flag("seen_mizukiri_umi")) {
					await s.narrate("ひらたい石が　四まい、\nならべて　ある。");
					await s.say("kiriko", "（一まい、水ましンゴ）");
					return;
				}
				await s.narrate("なみうちぎわに、ひらたい\n石が　ならんでいる。");
			},
		},

		// ── 漁港の岸壁（しお見表・小屋・うきわ・あみ・さかなばこ） ──
		// しお見表: 夕方に あしたの『満潮　6:52』の 赤丸（seen_umi_shiomi）→ 宵は 字が 夕やみに とけて タコの はちまきだけ →
		// 深夜は まっくら → 朝、見た 人には「もう　すぎている」・funeBelt「赤丸の　ころ」・amiban_asa「しおに　のって」。（9/13 は 上弦の すぐ あと＝大潮では ない）
		{
			id: "shiomihyo",
			x: 2,
			y: 8,
			sprite: JP.infoSign,
			trigger: "talk",
			fixedDir: true,
			run: async (s) => {
				const t = s.flag("tod");
				if (t === "shinya") {
					await s.narrate("しお見表は、まっくらだ。");
					return;
				}
				await s.narrate("しお見表。漁協の人の\n手書きだ。");
				if (t === "asa") {
					// 朝の町の時計（asaClock 6:58〜）より 前の 時刻に そろえる
					if (s.flag("seen_umi_shiomi")) {
						await s.narrate("赤丸の　6:52は、\nもう　すぎている。");
						return;
					}
					await s.narrate("『満潮　6:52』。\n……もう、ひきはじめている。");
					return;
				}
				if (t === "yoru") {
					// 夕方に 赤丸と タコを 見た 人（seen_umi_shiomi）だけ、はちまきが のこる
					await s.narrate(
						s.flag("seen_umi_shiomi")
							? "字は、夕やみに　とけている。\nタコの　はちまきだけ　白い。"
							: "字は、夕やみに\nとけている。",
					);
					return;
				}
				s.set("seen_umi_shiomi");
				await s.narrate("あしたの　らんに　赤丸。\n『満潮　6:52』");
				await s.narrate("すみに、タコの　らくがき。\nはちまきを　しめている。");
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
					// P0-2 room tv の 打ち切り（seen_chukei_end）を 見た 人だけ
					if (s.flag("seen_chukei_end")) {
						await s.narrate(
							"小屋の　ラジオの　延長に、\n波の音が　まざっている。",
						);
						return;
					}
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
		// うきわの あひる（seen_umi_ukiwa）は、朝の amiban_asa の2回目が 読む
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
				if (t === "yoru") {
					// 夕方に あひるの かお（seen_umi_ukiwa）を 見た 人だけ
					await s.narrate(
						s.flag("seen_umi_ukiwa")
							? "街灯の　輪の　はしで、\nあひるの　かおだけ　白い。"
							: "小屋の　かべに、\nうきわの　かげ。",
					);
					return;
				}
				// はり紙は 夕方と 朝だけ 読める
				if (t === "asa") {
					await s.narrate("うきわが、朝つゆで\nぬれている。");
					await s.narrate("はり紙。『おとしもの\n8月3日　はまで』");
					return;
				}
				await s.narrate("小屋のかべに、こどもの\nうきわが　かけてある。");
				await s.narrate("はり紙。『おとしもの\n8月3日　はまで』");
				if (!s.flag("seen_umi_ukiwa")) {
					s.set("seen_umi_ukiwa");
					await s.narrate("あひるの　かおが、\nだいぶ　日にやけている。");
				}
			},
		},
		// 干した あみ: 夕方の あたらしい糸（seen_umi_ami）→ 宵は あみ針が さしたまま →
		// 深夜の 夜ふけ、あみ番の「四時に　出る」を 聞いた 人には 半分 なくなる（せがれが 船に 積んだ。fune の 第三の あかりと 同じ 条件）→
		// 朝、夕方に 見て 第三の もどり（seen_umi_fune_asa）も 見た 人には ぬれて もどっている（船が まだなら「まだ　半分　ない」）。人は 出さない（あみの 変化だけ）
		{
			id: "ami_a",
			x: 11,
			y: 9,
			trigger: "talk",
			run: async (s) => {
				const t = s.flag("tod");
				if (t === "shinya") {
					if (s.flag("seen_amiban2") && shinyaStep(s) >= 7) {
						await s.narrate("あみが、半分　なくなっている。");
						return;
					}
					await s.narrate("あみに、夜つゆが\nついている。");
					return;
				}
				if (t === "yoru") {
					await s.narrate("あみに、あみ針が\nさしたまま　ある。");
					return;
				}
				if (t === "asa") {
					// 第三が もどった（funeBelt の seen_umi_fune_asa）あとだけ、ぬれて もどる。
					// 「しろい　糸」は 夕方に「まだ　しろい」を 見た 人（seen_amiban2）だけ
					if (s.flag("seen_umi_ami") && s.flag("seen_umi_fune_asa")) {
						await s.narrate(
							s.flag("seen_amiban2")
								? "ぬれた　あみが、もどっている。\nしろい　糸の　ところも。"
								: "ぬれた　あみが、もどっている。",
						);
						return;
					}
					// 船が まだ: 四時に 出た 話を 聞いた 人には、深夜の「半分　なくなっている」の 続き
					if (s.flag("seen_amiban2") && !s.flag("seen_umi_fune_asa")) {
						await s.narrate("あみは、まだ　半分　ない。");
						return;
					}
					await s.narrate("あみの　半分が、もう\nたたんで　ある。");
					return;
				}
				s.set("seen_umi_ami");
				await s.narrate("干してある　あみ。\nところどころ、あたらしい糸。");
				// amiban2 の「あしたの朝、四時に　出る」を 聞いた 人だけ
				if (s.flag("seen_amiban2"))
					await s.narrate("あたらしい糸の　ところが、\nまだ　しろい。");
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
					// 第三が もどる（funeBelt の seen_umi_fune_asa）まで、はこは から
					if (!s.flag("seen_umi_fune_asa")) {
						await s.narrate("からの　さかなばこが、\nならべて　ある。");
						return;
					}
					await s.narrate(
						"さかなばこに、氷と　アジが\nぎっしり　つまっている。",
					);
					// 夕方に 桟橋の『第三』を 見た 人（seen_umi_fune_yu）だけ、夕方の『はま丸』の 字の はこ
					if (s.flag("seen_umi_fune_yu"))
						await s.narrate("『はま丸』の　はこから\nいっぱいだ。");
					// ⑤ tsuri_rule の『ネコに　えさを　やらないで』を 見た 人だけ、一度
					if (s.flag("seen_umi_rule") && !s.flag("seen_umi_neko")) {
						s.set("seen_umi_neko");
						await s.narrate(
							"さかなばこの　かげで、ねこが\nアジを　一ぴき　くわえた。",
						);
						// danchi neko_ura の 深夜の あつまりを 見た 人は、その かお
						await s.say(
							"kiriko",
							s.flag("seen_neko_shukai")
								? "（ゆうべの　あつまりの\nかおンゴ）"
								: s.flag("seen_umi_uroko")
									? "（ゆうべの　うろこの\nねこンゴ？）" // 深夜の tsuri_za の うろこ
									: "（……もらったんじゃ\nないンゴね）",
						);
						return;
					}
					// ㊹ suupaa ばあちゃんの「あしたは　アジフライが　半額」（seen_baa_aji）を 聞いた 人だけ、一度（seen_umi_ajifry）
					if (s.flag("seen_baa_aji") && !s.flag("seen_umi_ajifry")) {
						s.set("seen_umi_ajifry");
						await s.say(
							"kiriko",
							"（ばあちゃんの　半額の\nアジフライ、これンゴ？）",
						);
					}
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
				// 深夜は となりの しお見表と おなじく、字が 読めない
				if (s.flag("tod") === "shinya") {
					await s.narrate(
						"ポリバケツ。ふたの　字は、\nかげに　なって　見えない。",
					);
					return;
				}
				await s.narrate("ポリバケツ。ふたに\n『つりえさ　もちかえり』。");
				await s.narrate("『り』だけ、あとから\nたしてある。");
			},
		},
		// つりの決まり（seen_umi_rule）は、夕方の tsuribito_yu と 朝の sakanabako（ねこ）が 読む
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
		// 桟橋の さき: 夕方の 夕日の 道（seen_umi_yuhi）→ 宵は その あたりを 灯台の あかりが とおる →
		// 深夜は 第三の あかり（seen_umi_fune_shinya）を 見た 人に うしろの エンジン →
		// 朝は 船が もどる（seen_umi_fune_asa）のを 見た 人に 白い すじ（夕日の 道を 見た 人には キリコも）
		{
			id: "sanbashi_saki",
			x: 9,
			y: 18,
			trigger: "talk",
			run: async (s) => {
				const t = s.flag("tod");
				if (t === "shinya") {
					if (s.flag("seen_umi_fune_shinya")) {
						await s.narrate(
							"うしろで、第三の　エンジンが\nずっと　鳴っている。",
						);
						return;
					}
					await s.narrate("まっくらな　海。\n波の音だけが　とどく。");
					return;
				}
				if (t === "yoru") {
					if (s.flag("seen_umi_yuhi")) {
						await s.narrate(
							"夕日の　道の　あった　あたりを、\n灯台の　あかりが　とおる。",
						);
						return;
					}
					await s.narrate("海と　空の　さかいめが、\nもう　わからない。");
					return;
				}
				if (t === "asa") {
					if (s.flag("seen_umi_fune_asa")) {
						await s.narrate(
							"船の　とおった　あとが、\n白い　すじに　なっている。",
						);
						if (s.flag("seen_umi_yuhi"))
							await s.say("kiriko", "（ゆうべの、夕日の\n道の　上ンゴ）");
						return;
					}
					await s.narrate("水平線が、しろく\nにじんでいる。");
					return;
				}
				s.set("seen_umi_yuhi");
				await s.narrate("夕日が、海の上に\n一本の　道を　つくっている。");
			},
		},

		// ── 防波堤（みなとの中・つり座・すわる所・灯台） ──
		{
			id: "minato_naka",
			x: 22,
			y: 12,
			trigger: "talk",
			run: async (s) => {
				const t = s.flag("tod");
				if (t === "shinya") {
					// 夕方の ボラ（seen_umi_bora）を 見た 人だけ、深夜の 一度目に（見たら 2 に）
					if (numFlag(s, "seen_umi_bora") === 1) {
						s.set("seen_umi_bora", 2);
						await s.narrate("――ぴしゃ。くらい　みなとで、\n一回だけ　はねた。");
						return;
					}
					await s.narrate("みなとの中は　しずかで、\n水の音も　しない。");
					return;
				}
				if (t === "yoru") {
					await s.narrate("みなとの水に、街灯が\nゆらゆら　うつっている。");
					return;
				}
				if (t === "asa") {
					// funeBelt で 船が もどるのを 見た あとだけ
					if (s.flag("seen_umi_fune_asa")) {
						await s.narrate(
							"かえってきた船の　波が、\nみなとの中まで　とどいた。",
						);
						return;
					}
					await s.narrate("みなとの中は、まだ\nしずかだ。");
					return;
				}
				// 深夜に 見た あと（2）を 1 に もどさない
				if (!s.flag("seen_umi_bora")) s.set("seen_umi_bora");
				await s.narrate("みなとの中は、\n波が　たたない。");
				await s.narrate("――ぴしゃ、と\nボラが　はねた。");
			},
		},
		// つり座（つり人の いない 宵・深夜だけ。夕方と朝は つり人が ここに 立つ）。
		// 宵は 日の入りの あとの、防波堤の さきの 置きざおと 赤い 電気うき（seen_umi_denkiuki。人は 出さない＝さおと うきだけ）→
		// 深夜は さおが きえて うろこ（denkiuki を 見た 人だけ・seen_umi_uroko。見て いない 人には 夜つゆ）→
		// 朝 tsuribito_asa 1回目「きかない　やくそく」・2回目「ねこの　ぶん」・sakanabako の ねこ
		{
			id: "tsuri_za",
			x: 23,
			y: 14,
			trigger: "talk",
			when: (st) => st.flags.tod === "yoru" || st.flags.tod === "shinya",
			run: async (s) => {
				if (s.flag("tod") === "shinya") {
					// 宵の 電気うき（seen_umi_denkiuki）の つづき。うろこは 朝の tsuribito_asa・sakanabako が 読む
					if (s.flag("seen_umi_denkiuki")) {
						s.set("seen_umi_uroko");
						await s.narrate(
							"置きざおは、もう　ない。\nつり座に、アジの　うろこが　一まい。",
						);
						return;
					}
					await s.narrate("つり座が、夜つゆで\nぬれている。");
					return;
				}
				s.set("seen_umi_denkiuki");
				await s.narrate(
					"防波堤の　さきに、置きざおが\n一本。赤い　電気うきが　ゆれている。",
				);
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
			// 段: 夕方の 初回＝銘板 → 夕方の2回目＝八海里（seen_toudai_kairi）／宵は 点く瞬間を一度（seen_toudai_yoru）→ まわる／
			// 深夜は 初回だけ「銘板は くらくて 読めない」（seen_toudai_shinya）→ 明滅／
			// 朝は まず 消える瞬間を一度（seen_toudai_asa。点くのを 見た 人には その 灯台）→ 2回目に 銘板（未読なら）→ もう ひかっていない
			run: async (s) => {
				const t = s.flag("tod");
				const meiban = async () => {
					s.set("seen_toudai");
					await s.narrate("赤い　ぼうしの、\nちいさな　灯台。");
					await s.narrate("銘板。『昭和三十八年\n初点灯』");
				};
				if (t === "yu" && !s.flag("seen_toudai")) {
					await meiban();
					return;
				}
				if (t === "shinya") {
					if (!s.flag("seen_toudai") && !s.flag("seen_toudai_shinya")) {
						s.set("seen_toudai_shinya");
						await s.narrate("銘板は、くらくて\nよめない。");
					}
					await s.narrate("ひかって、きえて、\nまた　ひかる。");
					return;
				}
				if (t === "yoru") {
					if (!s.flag("seen_toudai_yoru")) {
						s.set("seen_toudai_yoru");
						await s.narrate("灯台の　ガラスの　中で、\nジジ、と　小さな音。");
						return;
					}
					await s.narrate("灯台の　あかりが、\nゆっくり　まわっている。");
					return;
				}
				if (t === "asa") {
					if (!s.flag("seen_toudai_asa")) {
						s.set("seen_toudai_asa");
						await s.narrate("灯台の　ガラスに、朝日が\nうつって　ひかった。");
						// 宵に 点く瞬間（seen_toudai_yoru）を 見た 人だけ
						if (s.flag("seen_toudai_yoru"))
							await s.narrate("ゆうべ　点くのを　見た\n灯台だ。");
						return;
					}
					// 消える瞬間を 銘板より 先に（1回しか 調べない 人にも 回収が とどく）
					if (!s.flag("seen_toudai")) {
						await meiban();
						return;
					}
					await s.narrate("灯台は、もう　ひかって\nいない。");
					return;
				}
				s.set("seen_toudai_kairi");
				await s.narrate(
					"銘板の下に、もう一行。\n『光の　とどく　きょり　八海里』",
				);
				await s.say("kiriko", "（かいり……\nたぶん、遠いンゴ）");
			},
		},

		// ── 岬の駅（車止め・時計・時刻表） ──
		// 線路の おわり（② はしっこの 一つ。seen_umi_kurumadome）
		{
			id: "kurumadome",
			x: 34,
			y: 17,
			trigger: "talk",
			run: async (s) => {
				s.set("seen_umi_kurumadome");
				await s.narrate("線路の　おわり。車止めの\nむこうは、もう　海だ。");
				if (s.flag("tod") === "shinya")
					await s.narrate("車止めの　すぐ下で、\n波の音。");
				await hashikko(s);
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
					await s.narrate(`ホームの時計。――${shinyaClock(s, 2)}。`);
					return;
				}
				if (t === "yoru") {
					await s.narrate(`ホームの時計。――${yoruClock(s, 2)}。`);
					await s.narrate("文字盤に、羽虫が\n一ぴき　とまっている。");
					return;
				}
				if (t === "asa") {
					await s.narrate(`ホームの時計。――${asaClock(s, 2)}。`);
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
					// ④ 夕方の densha_belt（seen_umi_densha）で 車庫へ 入る 音を 聞いた 人だけ
					if (s.flag("seen_umi_densha"))
						await s.narrate("……夕方の　あれが、\nここの　さいごだった。");
					return;
				}
				if (s.flag("tod") === "yoru") {
					// 宵は 赤い字だけ（seen_umi_shihatsu）→ 朝に「もう　出ていった」で 回収
					s.set("seen_umi_shihatsu");
					await s.narrate(
						"字は、灯りの　輪の　そと。\n『始発　5:58』の　赤い字だけ　見える。",
					);
					return;
				}
				if (s.flag("tod") === "asa" && s.flag("seen_umi_shihatsu")) {
					await s.narrate("始発の　5:58は、もう\n出ていった　あとだ。");
					await s.say("kiriko", "（一本、のりそこねた\nンゴ）");
					return;
				}
				await s.narrate("時刻表。のぼりが\n一日　四本。くだりは　ない。");
				await s.narrate("ここが　はしっこで、\nトンネルの　むこうは　車庫だ。");
				if (s.flag("tod") === "yu")
					await s.narrate(
						"のぼりの　さいごは　17:20。\nもう、きょうの　ぶんは　ない。",
					);
			},
		},
		{
			id: "eki_bench",
			x: 38,
			y: 15,
			trigger: "talk",
			// 段: 『また　夏に』（seen_umi_bench。結の yakiu_end が読む）→ その下の『いつの？』（seen_umi_bench2）。
			// 『いつの？』の あと、海の家の『また来年！』（seen_umi_uminoie）を 見た 人だけ 一度 答える（seen_umi_kotae）
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
				if (t === "shinya") {
					// らくがきを 夕方・宵に 見た 人だけ「らくがきは」
					if (s.flag("seen_umi_bench")) {
						await s.narrate("らくがきは、くらくて\nよめない。");
						return;
					}
					await s.narrate("ホームの　ベンチ。\nせもたれが、つめたい。");
					return;
				}
				if (!s.flag("seen_umi_bench")) {
					s.set("seen_umi_bench");
					await s.narrate("ホームの　ベンチ。\nせもたれに、うすい　らくがき。");
					await s.narrate("『また　夏に』");
					return;
				}
				if (!s.flag("seen_umi_bench2")) {
					s.set("seen_umi_bench2");
					await s.narrate("せもたれの　らくがき。\n『また　夏に』");
					await s.narrate("その下に、べつの字で\n『いつの？』");
					if (s.flag("seen_umi_uminoie") && !s.flag("seen_umi_kotae")) {
						s.set("seen_umi_kotae");
						await s.say("kiriko", "（海の家は、\n『また来年！』ンゴ）");
					}
					return;
				}
				await s.narrate("『また　夏に』\n『いつの？』");
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
				// ⑥ かわらで 三回 はねさせた 人だけ、くらべる
				if (s.flag("seen_mizukiri_nage") && !s.flag("seen_mizukiri_kurabe")) {
					s.set("seen_mizukiri_kurabe");
					await s.say("kiriko", "吾輩も、かわらで\n三回　はねたンゴ");
					await s.say(null, "……じゃあ、ひきわけ。\nほんとは、ぼくも　三回", {
						name: "浜の子",
					});
					return;
				}
				// ⑥ kawara の 水きりの子と 二回 話した（「五回はねる人も、いるんだ」を 聞いた）人だけ、
				//   ここで 五回を 見る。かわらの 子は ゼロ回（きろくは、ゼロンゴ）。かわらで 投げた 人は 上を 優先
				if (
					!s.flag("seen_mizukiri_nage") &&
					numFlag(s, "seen_mizukiri_kid") >= 2 &&
					!s.flag("seen_mizukiri_gokai")
				) {
					s.set("seen_mizukiri_gokai");
					await s.say(null, "見てて。……そりゃっ", { name: "浜の子" });
					await s.narrate("石は、五回　はねて\nしずんだ。");
					await s.say(null, "……いまのは、ほんとの　五回", {
						name: "浜の子",
					});
					await s.say("kiriko", "（かわらの　子は、\nゼロ回ンゴ）");
					return;
				}
				// 歩数の話は、護岸の チョークの字（chalk・seen_umi_chalk）を 見た 人だけ
				if (!s.flag("seen_umi_chalk")) {
					await s.narrate("浜の子は、石を　さがして\nしゃがんでいる。");
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
				// ⑳ 2回目で seen_inu_umi2（kawara inu_sanpo が 朝に 読む）
				if (!s.flag("seen_inu_umi2")) {
					s.set("seen_inu_umi2");
					await s.say(null, "かえったら、\nシャンプーなのよ", {
						name: "犬のさんぽの人",
					});
					return;
				}
				await s.narrate("犬が、海を　見たまま\nすわりこんだ。");
				await s.say(null, "……もう、かえるわよ", {
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
				// ① kawara tsuri_jichan の『二十年ものの鯉』（seen_tsuri2）を 聞いた 人だけ、一度（ぬしを 嘘とは 言わない）
				if (s.flag("seen_tsuri2") && !s.flag("seen_umi_nushi")) {
					s.set("seen_umi_nushi");
					await s.say("kiriko", "川の　ぬし、しってる\nンゴ？");
					await s.say(
						null,
						"かわらの　じいさんのか。\n……二十年、おなじ　話だ",
						{
							name: "つり人",
						},
					);
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
					// shiomihyo の 赤丸（seen_umi_shiomi）と「四時に　出る」（seen_amiban2）を 知っている 人だけ
					if (s.flag("seen_umi_shiomi") && s.flag("seen_amiban2"))
						await s.say(null, "しおに　のって\nかえってくる", {
							name: "あみ番",
						});
					if (s.flag("seen_amiban2")) {
						await s.say(null, "ゆうべの　あみが、\nいま　あがってくる", {
							name: "あみ番",
						});
						await s.say("kiriko", "（陸の　船長ンゴ）");
					}
					return;
				}
				// 2回目: 夕方に ukiwa の あひるを 見た 人だけ（seen_umi_ukiwa）。seen_amiban_asa を 2 にして 一度だけ
				if (s.flag("seen_umi_ukiwa") && numFlag(s, "seen_amiban_asa") < 2) {
					s.set("seen_amiban_asa", 2);
					await s.narrate("キリコは、小屋の　かべの\nうきわを　見た。");
					await s.say(
						null,
						"あの　あひるか。……らいねんの\n夏まで、あずかりだ",
						{
							name: "あみ番",
						},
					);
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
					// 決まりの 看板（seen_umi_rule）か 夕方の つり人（seen_tsuribito_umi）を 知っている 人には『日の出から』
					await s.say(
						null,
						s.flag("seen_umi_rule") || s.flag("seen_tsuribito_umi")
							? "日の出から、ってな。\nきっちり　守ってるだろ"
							: "朝の　アジは、\nはやい　もん　勝ちだ",
						{ name: "つり人" },
					);
					// 続きは 一つだけ: 宵の つり座の 電気うき（seen_umi_denkiuki）＞ 夕方の アジの 話（seen_tsuribito_umi）
					// 日の入りまでの 決まりを 知らない 人は、うきの ぬしを きくだけ（答えは 同じ）
					const q = s.flag("seen_umi_denkiuki")
						? s.flag("seen_umi_rule") || s.flag("seen_tsuribito_umi")
							? "ゆうべの　電気うき、\n日の入りの　あとンゴ？"
							: "ゆうべの　赤い　電気うき、\nおじさんのンゴ？"
						: s.flag("seen_tsuribito_umi")
							? "ゆうべは、アジ\nつれたンゴ？"
							: "";
					if (q) {
						await s.say("kiriko", q);
						await s.say(null, "……それは、\nきかない　やくそく", {
							name: "つり人",
						});
					}
					return;
				}
				// 深夜の つり座の うろこ（seen_umi_uroko）を 見た 人に、一度だけ（ボラより 先）
				if (s.flag("seen_umi_uroko") && !s.flag("seen_umi_uroko_neko")) {
					s.set("seen_umi_uroko_neko");
					await s.say("kiriko", "つり座に、うろこが\n一まい　あったンゴ");
					await s.say(null, "……あれは、ねこの\nぶんだ", { name: "つり人" });
					return;
				}
				await s.narrate("バケツの中は、\n海の水だけだ。");
				// 2回目だけ: 夕方の minato_naka の ボラ（seen_umi_bora）を 見た 人に（seen_tsuribito_asa を 2 に）
				if (s.flag("seen_umi_bora") && numFlag(s, "seen_tsuribito_asa") < 2) {
					s.set("seen_tsuribito_asa", 2);
					await s.say(null, "ボラは　つらねえよ", { name: "つり人" });
				}
			},
			{ dir: "down", when: (st) => st.flags.tod === "asa" },
		),
	],
};
