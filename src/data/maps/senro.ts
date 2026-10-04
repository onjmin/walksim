// せんろぞいのみち（えきまえ と となりまち をつなぐ、線路わきの長い道）。
// docs/content-briefs.md「日常の町 拡張」・docs/style-everyday.md・docs/nostalgia.md。
// 44×14・outdoor・BGM @tod。地続きのルール（2026-09-28）で、ワープではなく歩いて
// となりまちのアーケードまで行ける道。進行には関係しない「歩くための場所」。
//
// 時間帯の顔（flags.tod）:
//   夕方 … あかずの踏切（3本つづけて とおる＝高校生の「つづけて 3本」）。ガード下で頭の上を電車がとおる。
//           NPC 4体（鉄道ずきの人=3層会話・下校の高校生×2・コスモスのじいちゃん）。
//           出前の自転車は人ではなく「ぬいていく」場面だけ（どんぶりは ひきど の前で 宵→深夜→朝）。
//           西の端から となりまち のアーケードへ入れる
//   宵   … NPC 0体（docs/nostalgia.md P0-1）。文は におい・音・点いた灯り だけ。
//           信号所の ランプが みどりに → 踏切で 灯りの まどが ながれる（seen_fumikiri_yoru）。
//           アーケードは店じまいの音（シャッター）で、入れない
//   深夜 … NPC 0体必達（人の声も無し）。踏切はくらい。西の線路に 保線の 黄色い ランプの 車
//           （人は書かない。車と 灯りと 機械の音だけ）。深夜の地区を回るほど ガードへ 近づき
//           （seen_senro_hosen・shinyaStep）、rail・michi_owari・ガード下・ブロックべいの文が かわる。
//           ガード下で 声を だせる（seen_guard_koe）。いけがきの すきまで えだが 鳴る（seen_sukima_shinya）。
//           ふみきりまちのブロックべいに すわれる（seen_suwari_senro）。
//           じはんきで缶が買える（kanShinya）・地区を移るたびに冷める（kanTick）
//   朝   … NPC 3体（鉄道ずきの人・高校生・通勤の人）。夕方の setup の payoff
//           （始発の写真・小テストのはんい・コスモスの水やりのあと）。ゆうべの ランプは
//           つぎめの 新しい ボルトと、かすみの さきの からっぽ（michi_owari）。ゆうべの 缶は『売切』の
//           ランプ になって のこる。ゆうべの 声は ガードの スズメ（guard_asa）、パキッと いった えだは
//           ビニールひも（sukima_ikegaki・monohoshi）、夕方の 3本は しゃだんきの 朝の 1本（shadanki）
//   夕方の あかずの踏切は、となりまちの 模型屋の ジオラマ（seen_mokei_b）とも 響く
//
// 出入口（地続き）:
//   東 (43,7) → ekimae (1,9) right／ekimae からの着地 (42,7) left
//   西 (0,7) touch … 夕方だけ tonarimachi (34,16) left へ。ほかの時間帯はアーケードの
//   シャッターがおりていて、一歩もどる。tonarimachi からの着地 (1,7) right
//
// 経路: 一本道にしない。線路の道(y7)⇄踏切(x31)⇄線路の北のあぜ道(y2)⇄ガード下(x9) のループと、
// 線路の道⇄路地(x1・x29)⇄家のうらの細道(y13) のループ。
// 隠し: いけがきの　すきま (10,9)（見た目は生けがき・通れる）→ うら庭 → 細道。
// 二度目で変わる: ガード下のポスター（下の古いポスター）・コスモスのちょうちょ（踏切を見た人は三度目も）。

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
	kanHeld,
	kanLine,
	kanLv,
	kanShinya,
	kanTick,
	numFlag,
	shinyaStep,
	yoruAkubi,
	yoruStep,
} from "../nostalgia";
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
/**
 * 西のはし（to_tonarimachi）の ㉖ 回収の行を、時間帯ごとに 最初の 通過だけに しぼる
 * （lastWave と同じく モジュール変数。セーブしない。もとからある 店じまいの行は 毎回）。
 */
let arcadeTod = "";
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
 * 踏切の前の帯（y7 の x29〜33）。夕方は一度だけ「あかずの踏切」: 電車が3本つづけて とおる
 * （koukou_b の「つづけて　3本　くるから」の回収。聞いた人にだけキリコの一言）。
 * 踏切の4段: 夕＝夕日の まど（ここ）／宵＝灯りの まど（fumikiriYoru）／深夜＝shadanki「終電は、もう　行った」／
 * 朝＝shadanki の1本（すぐ あがる。一度だけ）。
 */
const fumikiriBelt = (x: number): EventDef => ({
	id: `fumikiri_belt_${x}`,
	x,
	y: 7,
	trigger: "touch",
	through: true,
	when: (st) => st.flags.tod === "yu" && !st.flags.seen_fumikiri_yu,
	run: async (s) => {
		s.set("seen_fumikiri_yu");
		await kankan(s, 3, 0.6);
		await s.narrate("カン、カン、と\nふみきりが　鳴りはじめた。");
		await kankan(s, 2, 0.6);
		await s.narrate("しゃだんきが、ゆっくり\nおりてくる。");
		s.se("train", { pan: 0.2, volume: 0.9 });
		await s.wait(900);
		await s.narrate("電車が、目のまえを\nとおりすぎていく。");
		await s.narrate("まどが　ぜんぶ、\n夕日の色だ。");
		// 2本目（反対がわから）・3本目
		await kankan(s, 2, 0.6);
		await s.narrate("……あがらない。\nこんどは　反対がわから。");
		s.se("train", { pan: -0.2, volume: 0.9 });
		await s.wait(900);
		await kankan(s, 2, 0.5);
		s.se("train", { pan: 0.2, volume: 0.8 });
		await s.wait(900);
		await s.narrate("……3本目。");
		// 高校生の「つづけて　3本」＞ となりまちの 模型屋の ジオラマ（mokei_b）
		if (s.flag("seen_senro_koukou_b"))
			await s.say("kiriko", "（ほんとに　3本ンゴ）");
		else if (numFlag(s, "seen_mokei_b") > 0)
			await s.say("kiriko", "（ジオラマの　ふみきりと、\nおなじ　形ンゴ）");
		await kankan(s, 1, 0.4);
		await s.narrate("しゃだんきが、やっと\nあがった。");
	},
});

/**
 * 宵の踏切（y7 の x29〜33）。信号所の まどで みどりの ランプを 見た人に、一度だけ電車がとおる
 * （shingo_mado の seen_senro_midori → seen_fumikiri_yoru。room の布団の遠い音が読む）。人は書かない。
 */
const fumikiriYoru = (x: number): EventDef => ({
	id: `fumikiri_yoru_${x}`,
	x,
	y: 7,
	trigger: "touch",
	through: true,
	when: (st) =>
		st.flags.tod === "yoru" &&
		!!st.flags.seen_senro_midori &&
		!st.flags.seen_fumikiri_yoru,
	run: async (s) => {
		s.set("seen_fumikiri_yoru");
		await kankan(s, 2, 0.5);
		s.se("train", { pan: 0.2, volume: 0.8 });
		await s.wait(900);
		await s.narrate("あかるい　まどが、つながって\nながれていく。");
	},
});

/** 街灯（(5,8)。(24,8) は灯りだけ。lights は yoru,shinya で点く）。 */
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
 * 2回目からは選ばずに短い1行だけ（缶 ＞ 保線の ランプの 車 ＞ ながめる）。
 * 朝の blockBei が「朝つゆで　ほかと　おなじ　色」で回収する。
 */
const suwaru = async (s: Story): Promise<void> => {
	if (s.flag("seen_suwari_senro")) {
		if (kanHeld(s)) await kanLine(s);
		// ㉜ 保線の 車（arrive_shinya）。深夜の地区を回るほど ガードへ 近づく（rail と おなじ段）
		else if (s.flag("seen_senro_hosen")) {
			// ブロックべい（x33）は ガードから 遠い。見え方と 音で 段を 出す
			if (shinyaStep(s) < 5)
				await s.narrate("レールの　はるか　さきに、\n黄色い　点が　ひとつ。");
			else {
				s.se("hum", { pan: -0.6, volume: 0.15 });
				await s.narrate("西の　ほうから、ひくい　機械の\nうなりが　とどく。");
			}
		} else
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
		// ㉟ ゆうべ 深夜に すわった人（suwaru の seen_suwari_senro）
		if (s.flag("seen_suwari_senro")) {
			await s.narrate(
				"ゆうべ　すわった　ところも、\n朝つゆで　ほかと　おなじ　色。",
			);
			await s.say("kiriko", "（おしりの　あと、\nきえたンゴ）");
			return;
		}
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
	// 宵と深夜は線路ぞいの長い道の曲（amb_hakuhyo「薄氷の回廊」。ベースの 3+3+2 が線路の継ぎ目）
	todBgm: { yoru: "amb_hakuhyo", shinya: "amb_hakuhyo" },
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
		// 宵（nostalgia.md P0-1。におい・音・点いた灯り だけ）。
		// 宵の段: 4地区目までに着けば あげる音、ほかの地区に寄ってから来れば においだけ
		// （宵の senro へは street→kokudo→ekimae を通るので、いちばん近い道で 4。done は run の
		// あとに立つので、いま着いた ここを +1 で足す）。朝の ie_mado が だしの においで回収する
		{
			id: "arrive_yoru",
			x: 3,
			y: 0,
			trigger: "auto",
			once: true,
			when: (st) => st.flags.tod === "yoru",
			run: async (s) => {
				await s.wait(500);
				if (yoruStep(s) + 1 <= 4)
					await s.narrate("どこかの　台所から、\nてんぷらを　あげる　音。");
				else await s.narrate("てんぷらの　においだけ、\nまだ　のこっている。");
				await yoruAkubi(s);
			},
		},
		// 深夜: 西の線路で 保線の 黄色い ランプ（正体は 車。人は書かない）。rail・michi_owari・guard_shinya・
		// ブロックべいの2回目が 段で近づけ、朝の arrive_asa（ボルト）・michi_owari・ekimae rail_fence が回収
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
				s.set("seen_senro_hosen");
				s.se("hum", { pan: -0.8, volume: 0.15 });
				await s.narrate(
					"ずっと　西の　線路で、黄色い\nランプが　まわっている。",
				);
			},
		},
		// 朝: 上から1つ（ゆうべの 保線のランプ ＞ 夕方の 夕日のレール ＞ はじめての人）
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
				if (s.flag("seen_senro_hosen")) {
					// ランプは 西から ガード（x9）まで。東の入口からは 西を 見る
					await s.narrate(
						"西の　ほうの　つぎめに、\nぴかぴかの　ボルトが　一本。",
					);
					await s.say("kiriko", "（あの　黄色い　ランプンゴ）");
					return;
				}
				if (arrived(s, "senro", "yu")) {
					await s.narrate(
						"きのう　夕日を　はねていた\nレールが、けさは　白い。",
					);
					return;
				}
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
				// ㉖ となりまちの店じまい（夕方の アーケードで 見たものを、1回に1行まで）
				if (t === "yoru") {
					s.se("shutter", { pan: -0.6, volume: 0.4 });
					await s.narrate(
						"アーケードの　シャッターが、\nはんぶん　おりている。",
					);
					await s.narrate("おくで、ガラガラと\nシャッターを　おろす音。");
					await s.say("kiriko", "……店じまいンゴ");
					// tonarimachi record_owari／record_oyaji 3回目／record_naka（宵の 最初の 通過だけ）
					if (
						arcadeTod !== t &&
						(s.flag("seen_record_owari") ||
							s.flag("seen_record_oyaji3") ||
							s.flag("seen_record_naka"))
					) {
						arcadeTod = t;
						s.se("record", { pan: -0.7, volume: 0.2 });
						await s.narrate(
							"シャッターの　おくで、\nまだ　レコードが　鳴っている。",
						);
					}
				} else if (t === "shinya") {
					await s.narrate("アーケードの　シャッターは、\nおりている。");
					await s.narrate("天井の　常夜灯が、\nひとつだけ　ついている。");
					// tonarimachi arcade_lamp（深夜の 最初の 通過だけ）
					if (arcadeTod !== t && s.flag("seen_arcade_lamp")) {
						arcadeTod = t;
						await s.say("kiriko", "（夕方は、はしから\nはしまで　だったンゴ）");
					}
				} else {
					await s.narrate("シャッターは、まだ\nおりている。");
					await s.narrate("荷おろしの　トラックが、\nエンジンを　かけたまま。");
					// tonarimachi kissa_door（『モーニングやってます』）＞ yaoya_oyaji（朝の 最初の 通過だけ）
					if (arcadeTod !== "asa") {
						// tonarimachi yaoya_win の のこりの だいこん（八百屋に 3回以上）は、ほかの 行の かわりに
						if (s.flag("seen_daikon_nokori")) {
							arcadeTod = "asa";
							await s.narrate(
								"トラックから、だいこんの\n箱が　おろされていく。",
							);
						} else if (s.flag("seen_kissa_nioi")) {
							arcadeTod = "asa";
							await s.narrate(
								"シャッターの　すきまから、\nコーヒーの　におい。",
							);
							await s.say("kiriko", "（モーニング、\nはじまったンゴ）");
						} else if (numFlag(s, "seen_yaoya_n") > 0) {
							// 八百屋と 話した 回数（3回で『つがる』が 売りきれ → 朝、つぎの 箱が くる）
							arcadeTod = "asa";
							if (numFlag(s, "seen_yaoya_n") >= 3)
								await s.narrate(
									"トラックから、『つがる』の\n箱が　おろされていく。",
								);
							else await s.narrate("りんごの　箱が、\nおろされていく。");
						}
					}
				}
				await s.move("player", "r");
			},
		},

		// ── 環境音の帯（線路の道。歩くたび遠近が変わる） ──
		waveBelt("wave_w", 10, -0.4),
		waveBelt("wave_m", 22, 0),
		waveBelt("wave_e", 36, 0.4),

		// ── 踏切の場面（夕方＝電車がとおる） ──
		...[29, 30, 31, 32, 33].map(fumikiriBelt),
		// 宵＝信号所の みどりの ランプを 見た人に、灯りの まどが とおる
		...[29, 30, 31, 32, 33].map(fumikiriYoru),

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
		// 深夜のガード下（一度だけ。じぶんの 声が かえってくる。夕方の 電車を 聞いた人は くらべる）。
		// ㉜ 保線の 車が ガードの てまえまで 来ていれば（shinyaStep 5〜）、かべに 黄色い 光と 機械の うなり。
		// 声を だした人（seen_guard_koe）は、朝の guard_asa で スズメの 声に 回収
		// （1＝ひびいた／2＝うなりに まぎれた。2の人には「かえって　こなかった」）
		...[4, 5].map(
			(y): EventDef => ({
				id: `guard_shinya_${y}`,
				x: 9,
				y,
				trigger: "touch",
				through: true,
				when: (st) => st.flags.tod === "shinya" && !st.flags.seen_guard_shinya,
				run: async (s) => {
					s.set("seen_guard_shinya");
					const kuruma = !!s.flag("seen_senro_hosen") && shinyaStep(s) >= 5;
					if (kuruma)
						await s.narrate(
							"ガードの　かべを、黄色い　ひかりが\nゆっくり　なでていく。",
						);
					else await s.narrate("ガードの　中は、じぶんの\n足音だけ。");
					const i = await s.choose(["＞＞1 こえを　だす", "＞＞2 やめておく"], {
						cancel: 1,
					});
					if (i === 0) {
						s.set("seen_guard_koe", kuruma ? 2 : 1);
						await s.say("kiriko", "……ンゴ");
						if (kuruma) {
							s.se("hum", { pan: -0.4, volume: 0.3 });
							await s.narrate("声は、機械の　うなりに\nまぎれて　しまった。");
						} else
							await s.narrate(
								"じぶんの　声が、ガードに\nひびいて　もどってきた。",
							);
					}
					if (s.flag("seen_guard_densha"))
						await s.say("kiriko", "（夕方は、電車の音で\nいっぱいだったンゴ）");
				},
			}),
		),
		// 朝のガード下（一度だけ。ゆうべ ここで 声を だした人に、スズメの 声が はねかえる）
		...[4, 5].map(
			(y): EventDef => ({
				id: `guard_asa_${y}`,
				x: 9,
				y,
				trigger: "touch",
				through: true,
				when: (st) =>
					st.flags.tod === "asa" &&
					!!st.flags.seen_guard_koe &&
					!st.flags.seen_guard_asa,
				run: async (s) => {
					s.set("seen_guard_asa");
					s.se("suzume", { volume: 0.6 });
					await s.narrate("ガードの　中で、スズメの　声が\nはねかえっている。");
					if (numFlag(s, "seen_guard_koe") === 2)
						await s.say(
							"kiriko",
							"（ゆうべは、吾輩の　声、\nかえって　こなかったンゴ）",
						);
					else
						await s.say("kiriko", "（ゆうべは、吾輩の　声が\nこうだったンゴ）");
				},
			}),
		),

		// ── 出前の自転車（夕方に一度。人ではなく、ぬいていく場面だけ。ie_hikido のどんぶりへ） ──
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

		// ── 隠し: いけがきの　すきま（見た目は生けがき。はじめて抜けたときと、深夜にはじめて抜けたとき） ──
		// 深夜に パキッと 鳴らした えだは、朝 ビニールひもで まかれている（seen_sukima_asa。
		// うら庭の monohoshi の朝と 共用で、先に 見たほうで 一度だけ）
		{
			id: "sukima_ikegaki",
			x: 10,
			y: 9,
			trigger: "touch",
			through: true,
			when: (st) =>
				!st.flags.seen_senro_sukima ||
				(st.flags.tod === "shinya" && !st.flags.seen_sukima_shinya) ||
				(st.flags.tod === "asa" &&
					!!st.flags.seen_sukima_shinya &&
					!st.flags.seen_sukima_asa),
			run: async (s) => {
				if (
					s.flag("tod") === "asa" &&
					s.flag("seen_sukima_shinya") &&
					!s.flag("seen_sukima_asa")
				) {
					s.set("seen_sukima_asa");
					await s.narrate(
						"ゆうべ　パキッと　いった　えだに、\nビニールひもが　まいてある。",
					);
					await s.say("kiriko", "（……こんどは、そっとンゴ）");
					return;
				}
				const first = !s.flag("seen_senro_sukima");
				if (first) {
					s.set("seen_senro_sukima");
					await s.narrate(
						"いけがきの　すきまを、\nからだを　よこにして　ぬけた。",
					);
				}
				// 深夜（一度だけ）
				if (s.flag("tod") === "shinya" && !s.flag("seen_sukima_shinya")) {
					s.set("seen_sukima_shinya");
					await s.narrate("ぬけるとき、えだが\nパキッと　鳴った。");
				}
				if (!first) return;
				await s.say("kiriko", "（……近道、はっけんンゴ）");
				// ㉗ ふたつのすきま（となりまちの sukima を先に抜けた人）
				if (s.flag("seen_sukima"))
					await s.say("kiriko", "（となりまちの　すきまより、\nせまいンゴ）");
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
				// guard_board の ポスター『とまって　みて　わたろう』を 見た人
				if (numFlag(s, "seen_guard_board") >= 1)
					await s.say("kiriko", "（とまって、みて、ンゴ）");
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
			// 踏切の 段: 夕＝あかずの 3本（fumikiriBelt）→ 深夜＝あがったまま → 朝＝1本で すぐ あがる
			run: async (s) => {
				const t = s.flag("tod");
				if (t === "shinya") {
					await s.narrate(
						"しゃだんきは、あがったまま。\n終電は、もう　行った。",
					);
					if (s.flag("seen_fumikiri_yu"))
						await s.say(
							"kiriko",
							"（夕方は、あんなに\nカンカン　いってたンゴ）",
						);
					return;
				}
				if (t === "yoru") {
					await s.narrate(
						"黄色と　黒の　しましまが、\nふみきりの　灯りに　うかぶ。",
					);
					return;
				}
				if (t === "asa") {
					// 朝の 1本は 一度だけ（seen_shadanki_asa）。2回目からは 音なし
					if (s.flag("seen_shadanki_asa")) {
						await s.narrate("しましまに、朝つゆが\nならんでいる。");
						return;
					}
					s.set("seen_shadanki_asa");
					await kankan(s, 1, 0.4);
					s.se("train", { pan: 0.2, volume: 0.7 });
					await s.wait(700);
					await s.narrate("1本　とおって、しゃだんきが\nすぐに　あがった。");
					// 夕方の あかずの踏切（fumikiriBelt の 3本）を 待った人
					if (s.flag("seen_fumikiri_yu"))
						await s.say("kiriko", "（夕方は、3本　だったンゴ）");
					return;
				}
				// 夕方: あかずの踏切の すぐ あと（fumikiriBelt）。ふるえは 一度だけ（seen_shadanki_yu）
				if (s.flag("seen_fumikiri_yu") && !s.flag("seen_shadanki_yu")) {
					s.set("seen_shadanki_yu");
					await s.narrate(
						"しゃだんきの　ビニールテープが、\nまだ　ふるえている。",
					);
					return;
				}
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
			// 筋(56) はやせみち: 初回で seen_hayasemichi → cosmos_jii（yu）3回目
			run: async (s) => {
				const t = s.flag("tod");
				if (s.flag("seen_hayasemichi") && t === "yu") {
					await s.narrate("名札の　うらに、\nさびた　ねじ　あと。");
					return;
				}
				if (s.flag("seen_hayasemichi") && t === "asa") {
					await s.narrate("名札に　あさつゆ。\n『はやせ』の　字だけ　よめる。");
					return;
				}
				s.set("seen_hayasemichi");
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
					// cosmos_jii の2回目「みんな　東に　かたむくの」を聞いた人
					if (s.flag("seen_senro_jii2")) {
						await s.narrate("ほんとうに、みんな\n東に　かたむいている。");
						return;
					}
					await s.narrate("コスモスが、朝の光で\nすけている。");
					return;
				}
				// ちょうちょの段（seen_cosmos_chou 数）。踏切の 電車を 見た人は 三度目で とんでいく
				const n = numFlag(s, "seen_cosmos_chou");
				if (n === 0) {
					s.set("seen_cosmos_chou", 1);
					await s.narrate("ひとつだけ、ちょうちょが\nとまっている。");
					return;
				}
				if (n >= 2 && s.flag("seen_fumikiri_yu")) {
					if (n === 2) {
						s.set("seen_cosmos_chou", 3);
						s.se("train", { pan: 0.3, volume: 0.5 });
						await s.wait(700);
						await s.narrate("電車の　かぜで、花が\nいっせいに　ゆれた。");
					}
					await s.narrate("ちょうちょは、もう　とんでいった。");
					return;
				}
				if (n === 1) s.set("seen_cosmos_chou", 2);
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
			// ② 距離の筋: seen_kilo_senro → kokudo kiropost
			run: async (s) => {
				s.set("seen_kilo_senro");
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
				// 宵: みどりの ランプ（seen_senro_midori）→ 踏切で 電車（fumikiriYoru）→ 赤に もどる
				if (t === "yoru") {
					if (!s.flag("seen_senro_midori")) {
						s.set("seen_senro_midori");
						await s.narrate(
							"まどの中の　ランプが、ひとつ\nみどりに　かわった。",
						);
						return;
					}
					if (!s.flag("seen_fumikiri_yoru")) {
						await s.narrate("みどりの　ランプが、\nまだ　ともっている。");
						return;
					}
					await s.narrate("みどりの　ランプは、\nもう　赤に　もどっている。");
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
				const t = s.flag("tod");
				await s.narrate("小屋の名札。\n『東3号　信号所』");
				// 宵: shingo_mado の みどりの ランプを 見た人
				if (t === "yoru" && s.flag("seen_senro_midori")) {
					await s.narrate("当番表が、まどの　ランプで\nうっすら　みどり。");
					return;
				}
				// 朝: ㉜ 深夜の 保線の 車（seen_senro_hosen）を 見た人
				if (t === "asa") {
					if (s.flag("seen_senro_hosen"))
						await s.narrate(
							"当番表の　いちばん下に、\nゆうべの　日付が　ふえている。",
						);
					else await s.narrate("戸の　ノブに、あさつゆ。");
					return;
				}
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
					// ㉜ 保線の 車（arrive_shinya）。深夜の地区を回るほど 東の ガード（x9）へ
					if (!s.flag("seen_senro_hosen"))
						await s.narrate("レールだけが、くらやみの\nほうへ　のびている。");
					else if (shinyaStep(s) < 5)
						await s.narrate(
							"くらやみの　さきで、黄色い\nランプが　まわっている。",
						);
					else
						await s.narrate(
							"西は　まっくら。黄色い　ランプは、\nうしろの　ガードの　ほう。",
						);
					// 夕方 to_tonarimachi で アーケードを くぐった人（seen_senro_arcade）
					// 西が「まっくら」の 分岐（保線の 車が 東へ 去ったあと）とは 重ねない
					if (
						s.flag("seen_senro_arcade") &&
						(!s.flag("seen_senro_hosen") || shinyaStep(s) < 5)
					)
						await s.narrate("アーケードの　あかりは、\nもう　ひとつだけ。");
					return;
				}
				if (t === "yoru") {
					// 夕方 to_tonarimachi で アーケードを くぐった人（seen_senro_arcade）
					if (s.flag("seen_senro_arcade")) {
						await s.narrate(
							"夕方　くぐった　アーケード。\nあかりが　はしから　へっていく。",
						);
						return;
					}
					await s.narrate("西のほうに、アーケードの\nあかりが　ぼんやり。");
					return;
				}
				if (t === "asa") {
					await s.narrate("レールの　さきが、\nあさの　かすみに　とける。");
					// ゆうべの 保線の 車は、もう いない（ekimae rail_fence の 側線へ）
					if (s.flag("seen_senro_hosen"))
						await s.narrate("かすみの　さきに、もう\n黄色い　ランプは　ない。");
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
					// ㉜ 保線の ランプ（arrive_shinya）の 正体は 小さな 車（人は書かない）。
					// 深夜の地区を回るほど ガードへ 近づき、朝は ekimae rail_fence の 側線に とまっている
					if (s.flag("seen_senro_hosen")) {
						if (shinyaStep(s) < 5)
							await s.narrate(
								"西の　線路の上に、黄色い\nランプの　小さな　車。",
							);
						else {
							s.se("hum", { pan: -0.5, volume: 0.2 });
							await s.narrate(
								"ランプの　車が、ガードの\nてまえで　とまっている。",
							);
						}
					}
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
				// seen_guard_board は数（1＝ポスター、2＝古いポスターの はしまで）。夕の fumikiri・朝ここで 読む
				const n = numFlag(s, "seen_guard_board");
				if (s.flag("tod") === "asa" && n >= 2) {
					await s.narrate("ポスターの　画びょうが、\nひとつ　あたらしい。");
					return;
				}
				if (n === 0) {
					s.set("seen_guard_board", 1);
					await s.narrate("ガード下の　掲示板。\nこどもの　交通安全ポスター。");
					await s.narrate("クレヨンの　電車と、\n『とまって　みて　わたろう』");
					await s.narrate("すみに、金色の\n『入選』の　シール。");
					return;
				}
				if (n === 1) s.set("seen_guard_board", 2);
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
					// ここで 缶を 買った人（朝の『売切』で回収）
					const b = kanLv(s);
					await kanShinya(s);
					if (b === 0 && kanLv(s) === 1) s.set("seen_senro_kan");
					return;
				}
				if (t === "yoru") {
					await s.narrate("はしの一列だけ、\nあかい札。『あったか～い』");
					return;
				}
				if (t === "asa") {
					if (s.flag("seen_senro_kan")) {
						await s.narrate(
							"『あったか～い』の　ひとつに、\n『売切』の　ランプ。",
						);
						await s.say("kiriko", "（吾輩が、買いしめたンゴ）");
						return;
					}
					await s.narrate(
						"じはんきの　よこに、\n補充の　段ボールが　つんである。",
					);
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
				// 朝: 夕方に めくれた かどを 見た人には、だれかが なおしたあと
				if (t === "asa") {
					if (s.flag("seen_senro_harigami")) {
						await s.narrate(
							"めくれていた　かどに、\nあたらしい　セロハンテープ。",
						);
						return;
					}
					await s.narrate(
						"シャッターに　貼り紙。\n『ながいあいだ　ありがとう』",
					);
					return;
				}
				s.set("seen_senro_harigami");
				await s.narrate("シャッターに　貼り紙。\n『ながいあいだ　ありがとう』");
				await s.narrate("かどが　めくれて、\n風に　ぱたぱた　鳴っている。");
			},
		},
		{
			id: "koujou_fuda",
			x: 18,
			y: 12,
			trigger: "talk",
			// 筋(57) もりた製作所の ばね: ひろう→got_senro_bane（room desk・kirokuLines）／そのまま→seen_senro_bane（朝ここで）
			run: async (s) => {
				const t = s.flag("tod");
				const got = !!s.flag("got_senro_bane");
				await s.narrate("『もりた　製作所』\nペンキが、うすく　なっている。");
				if (got) {
					if (t === "yu" || t === "yoru")
						await s.narrate("ポケットの　ばねを、\nぎゅっと　にぎった。");
					return;
				}
				if (t === "shinya") {
					// ばねを 見て、そのまま 置いてきた人だけ
					if (s.flag("seen_senro_bane"))
						await s.narrate("ばねは、くらくて\n見えない。");
					return;
				}
				if (t === "asa") {
					if (s.flag("seen_senro_bane"))
						await s.narrate("ばねは、シャッターの\nまえに　よせてある。");
					else
						await s.narrate("足もとに、小さな　ばねが\nひとつ　おちている。");
					return;
				}
				await s.narrate("足もとに、小さな　ばねが\nひとつ　おちている。");
				const i = await s.choose(["＞＞1 ひろう", "＞＞2 そのまま"], {
					cancel: 1,
				});
				if (i === 0) s.set("got_senro_bane");
				else s.set("seen_senro_bane");
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
					// ゆうべ すきま（sukima_ikegaki）で えだを 鳴らした人。南の細道から 先に 来たとき
					if (s.flag("seen_sukima_shinya") && !s.flag("seen_sukima_asa")) {
						s.set("seen_sukima_asa");
						await s.narrate(
							"ゆうべ　パキッと　いった　えだに、\nビニールひもが　まいてある。",
						);
					}
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
					// P0-2 ナイター延長（room tv の 打ち切りを 見た人）
					if (s.flag("seen_chukei_end")) {
						await s.narrate(
							"まどの　ナイターが、\n天気よほうの　声に　かわった。",
						);
						return;
					}
					await s.narrate("まどから、ナイター中継の\n音が　もれてくる。");
					return;
				}
				if (t === "asa") {
					// 宵の arrive_yoru の てんぷら
					if (arrived(s, "senro", "yoru")) {
						await s.narrate("まどから、だしの　におい。");
						await s.say("kiriko", "（てんぷらの　のこり、\nおそばンゴ？）");
						return;
					}
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
				// 出前の どんぶり（夕方の demae で 自転車を 見た人だけ。宵→深夜→朝）
				const demae = !!s.flag("seen_demae_senro");
				if (t === "shinya") {
					if (demae) {
						s.set("seen_demae_shinya");
						await s.narrate(
							"そろえてある　長ぐつの　よこに、\nどんぶりが　ふたつ。",
						);
						return;
					}
					await s.narrate("ひきどの　前に、\n長ぐつが　そろえてある。");
					return;
				}
				if (t === "yoru") {
					if (demae) {
						s.set("seen_demae_yoru");
						await s.narrate(
							"ひきどの　前に、どんぶりが\nふたつ。新聞紙が　かけてある。",
						);
						return;
					}
					await s.narrate(
						"ひきどの　すりガラスが、\nオレンジに　ひかっている。",
					);
					return;
				}
				if (t === "asa") {
					// どんぶりを 宵か深夜に 見た人だけ「もう　ない」
					if (s.flag("seen_demae_yoru") || s.flag("seen_demae_shinya")) {
						s.set("seen_demae_asa");
						await s.narrate(
							"どんぶりは、もう　ない。\nおくから、ほうきの　音。",
						);
						return;
					}
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
				// ⑤ ねこ（夕方 seen_neko_senro → 深夜は 団地の あつまり → 朝 もどってくる）
				if (t === "shinya") {
					// 夕方に ここの ねこを 見た人にだけ、いなくなった あと
					if (s.flag("seen_neko_senro")) {
						await s.narrate(
							"うえきばちの　かげの　土が、\nまるく　ならされている。",
						);
						return;
					}
					await s.narrate("行きどまり。\nうえきばちが　ひとつ。");
					return;
				}
				if (t === "yoru") {
					await s.narrate("うえきばちの　土が、\nまだ　しめっている。");
					return;
				}
				if (t === "asa") {
					await s.narrate("うえきばちの上で、\nねこが　のびを　した。");
					// 夕方に ここの ねこを 見て、danchi neko_ura の 深夜の あつまりも 見た人
					if (s.flag("seen_neko_shukai") && s.flag("seen_neko_senro"))
						await s.say("kiriko", "（おかえりンゴ）");
					return;
				}
				s.set("seen_neko_senro");
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
					await s.say(null, "あしたは、始発に\nくるの", {
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
					// 先に あかずの踏切（fumikiriBelt）を 見てきた人の 受け
					if (s.flag("seen_fumikiri_yu"))
						await s.say("kiriko", "（さっきの、3本ンゴ）");
					await s.say(null, "まってるあいだに、\n英単語　ひとつ　おぼえる", {
						name: "高校生",
					});
					await s.say("kiriko", "（えらいンゴ）");
					return;
				}
				// あかずの踏切（fumikiriBelt）を いっしょに 待った人
				if (s.flag("seen_fumikiri_yu")) {
					await s.say(null, "……3つ　おぼえて、\n3つ　わすれた", {
						name: "高校生",
					});
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
				// 3回目: 筋(56) keihouki_n の名札『はやせみち』を見た人だけ
				if (s.flag("seen_senro_jii2") && s.flag("seen_hayasemichi")) {
					await s.say(null, "あのふみきり、むかしは\nはやせみち、いってな", {
						name: "コスモスの人",
					});
					await s.say(null, "ばあさんの　かよった\n道だよ", {
						name: "コスモスの人",
					});
					return;
				}
				// 2回目（朝の cosmos_b が「ほんとうに」で回収）
				s.set("seen_senro_jii2");
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
				// seen_senro_koukou_asa は話した回数（1 初回／2 夕方の「3本」の回収）
				const n = numFlag(s, "seen_senro_koukou_asa");
				if (n === 0) {
					s.set("seen_senro_koukou_asa", 1);
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
				// 2回目: 夕方の koukou_b（つづけて 3本・英単語）を聞いた人に一度だけ
				if (n === 1 && s.flag("seen_senro_koukou_b")) {
					s.set("seen_senro_koukou_asa", 2);
					await s.say(null, "けさは　1本で　あいた。\n……単語、ゼロ", {
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
					await s.say(null, "すみません、いそいでて。\n……7時41分の、なんです", {
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
