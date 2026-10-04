// やまみち（川の上流の田んぼ→林道→峠）。docs/content-briefs.md「日常の町 拡張」・docs/style-everyday.md。
// 44×22・outdoor・BGM @tod。かわらのみちの西。川をさかのぼると、田んぼと用水路・無人販売所・
// バス停があって、道は林道になり、つづら折りで峠へのぼる。峠のベンチから町が見える。
//
// 時間帯の顔（flags.tod）:
//   夕方 … ヒグラシ（道を歩くたびに遠のき、森の入口の帯 x16 で やむ＝seen_higurashi_yama 数）。わらを やく けむり。
//           NPC 4体（田んぼの人=3層会話・バス待ちのばあちゃん・自転車の子=周回・
//           ランニングの人=会釈と こしの鈴）。無人販売所は売れのこりが ふたふくろ→ひとふくろ→から
//           はざかけの すずめ（seen_hazakake 数。一羽→二羽）・用水路の アメンボ（seen_amenbo 数。
//           ながされる→もどって ふんばる→また ながされる）・南の田の わらの山と 水バケツ（seen_wara_yama）・
//           かかしの 黄色い ヘルメット（seen_kakashi_yama。かわらの むぎわらと くらべる）
//   宵   … NPC 0体（docs/nostalgia.md P0-1）。文は「におい・音・点いた灯り」だけ。
//           夕方の けむりの におい・ざぶとん・ぬのの下の ナス・黒く ひくくなった わらの山（夕方を見た人にだけ）
//   深夜 … NPC 0体必達。峠のベンチに すわれる（seen_suwari_yamamichi）。月は沈んでいる（影・白い穂は書かない）。
//           9月中旬なので、田は虫の声（カエルは書かない）
//   朝   … スズメ。NPC 3体（田んぼの人・自転車の子・販売所のおばちゃん）。
//           『つけ』のメモ・水門・道祖神の花・灰のまる・クマの看板の書きたし・杉のテープの日付など、夕方の payoff。
//           はざかけに すずめが ずらり・水門の よどみの アメンボ・灰のまるの やきいも（seen_wara_imo →
//           販売所の人「うちの　人よ」seen_imo_kiku）・かかしの あごひも（かわらの 宵の風）・
//           かわらの かかしの ぼうしの お礼（nouka_asa・seen_kakashi_orei）
//   石   … かわらで 水きりに 石を かりた人（seen_mizukiri_nage）は、川(25,19)で ひらたい石を 一まい
//           ひろえる（got_ishi_yama → kawara mizukiri_ishi で 山に かえす）
//
// 座標（統合担当と共有）:
//   東 (43,12)→kawara(1,8) right・kawara からの着地 (42,12) left
//   北東 (43,1)→koen(1,8) right・koen からの着地 (42,1) left
//   峠 (4,0)＝通行止めで一歩もどされる
//
// 経路: 川ぞいの舗装路(y12)が背骨。北＝田んぼとあぜ道(y6)→公園への道(x38)。
// 南＝用水路と田んぼ→川原の道(y17)→用水路の小橋(x34)でもどる輪。西＝林道のつづら折り(x14→y9→x6→y6→x13→y4→x4)。

import type {
	EventDef,
	GameState,
	MapDef,
	Story,
	TileDef,
} from "../../engine/defs";
import { npc, warp } from "../helpers";
import {
	akiMatsuri,
	arrived,
	kanHeld,
	kanLine,
	kanTick,
	numFlag,
	yoruAkubi,
} from "../nostalgia";
import { FIELD, JP, TOWN, town } from "../tiles";
import { VILLAGE_SPR } from "../tiles-village";

// ── タイル ──
// FIELD をベースに、JP の地面・土の道・田・川を重ねる。
//   .  地面   ,  草   :  土の道（林道・あぜ道）   r  舗装路（バスの通る道）
//   i  田（通れない・counter＝あぜ越しに調べられる）   ~  川・用水路   #  用水路の小橋
//   T  すぎの木   b  やぶ   u  ススキ（通れない）   H  はざかけ（稲を干す棚）
//   N n  峠のベンチ（左右）   f  みはらしのロープさく   m  無人販売所の棚   L  街灯
const GROUND = "#6a7a48";
const tiles: Record<string, TileDef> = {
	...FIELD,
	".": { layers: [JP.ground], color: GROUND, passable: true },
	",": { layers: [JP.grassTuft], color: GROUND, passable: true },
	":": { layers: [JP.dirtPath], color: "#7a6a50", passable: true },
	r: { layers: [JP.road], color: "#5a5a5e", passable: true },
	i: {
		layers: [JP.paddy],
		color: "#7a9a3a",
		passable: false,
		counter: true,
	},
	"~": { layers: [JP.water], color: "#4a6a88", passable: false },
	"#": { layers: [JP.water, JP.bridgeV], color: "#8a8880", passable: true },
	u: { layers: [JP.ground, JP.susuki], color: GROUND, passable: false },
	H: { layers: [JP.ground, JP.ropeFence], color: "#8a6a3a", passable: false },
	N: { layers: [JP.ground, town(4, 5)], color: GROUND, passable: false },
	n: { layers: [JP.ground, town(5, 5)], color: GROUND, passable: false },
	f: { layers: [JP.ground, JP.ropeFence], color: GROUND, passable: false },
	m: { layers: [JP.ground, JP.counterM], color: "#8a6a3a", passable: false },
	L: { ...TOWN.L, layers: [JP.ground, JP.lamp] },
};

const rows = [
	"   .:.                               TTT    ", // y0  峠の出口 (4,0)・通行止めのさく (3,0)(5,0)
	" T..:..Nn.,f                        b,::::::", // y1  峠。ベンチ (7,1)(8,1)・みはらし (11,1)・公園への出口 (43,1)・公園からの着地 (42,1)
	" T..:....,,f                       ,,,:,,b  ", // y2
	" TTT:TTTT                         ,,u,:,,,  ", // y3
	" TTT::::::::::TT                 ,,,,,:,u,, ", // y4  つづら折り（上）
	" TTT TTTTTTTT:TT  ,,HHHHHH,,,,,,,,,,,,:,,,  ", // y5  かたむいた杉 (12,5)・はざかけ (20-25,5)
	" TTTTT::::::::TT ,:::::::::::::::::::::,,b  ", // y6  つづら折り（中）・あぜ道・田んぼの人 (25,6)
	" TTTTT:TTTTTTTT  ,iiiiiiiii:iiiiiiiii,:,,   ", // y7
	" TTTT,:TTTTTTTT  ,iiiiiiiii:iiiiiiiii,:b    ", // y8  クマの看板 (5,8)・かかし (23,8)・田 (28,8)
	" TTTTT:::::::::T ,iiiiiiiii:iiiiiiiii,:,    ", // y9  つづら折り（下）
	"  TTTTTTTTTTTT:T,,,,,,,,,,,,,,,,,,,,,,:,,   ", // y10 公園の看板 (37,10)
	"      TTTTTT,,:,,,,,,,,L,,,,,,,,,,mm,,:,L,,,", // y11 林道の標識 (15,11)・バス停 (22,11)・街灯 (23,11)(40,11)・販売所 (34,11)(35,11)・きょり標 (41,11)
	"        TT,rrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrr", // y12 舗装路。道祖神 (10,12)・kawara への出口 (43,12)・着地 (42,12)
	"          ,,,,,,~~~~~~~~~~~~~~~~~~#~~~~~~~~~", // y13 用水路・水門 (26,13)・小橋 (34,13)
	"            ,,,,iiiiiiiiiiiiiiiiii:iiiiiiii ", // y14
	"             ,,,iiiiiiiiiiiiiiiiii:iiiiiiii ", // y15
	"             ,,,iiiiiiiiiiiiiiiiii:iiiiiiii ", // y16 田 (22,16)
	"            ,:::::::::::::::::::::::::::::: ", // y17 川原の道
	"          ,,,,,u,,,,,,,,,,,,,u,,,,,,,,,u,,,,", // y18 ススキ (15,18)
	"        ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~", // y19 川 (25,19)
	"      ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~", // y20
	"     ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~", // y21
];

// ── モブの歩行グラ ──
const NOUKA = "pub:sprites/mob_ojiichan.png";
const BAACHAN = "pub:sprites/mob_obaachan.png";
const OBACHAN = "pub:sprites/mob_obachan.png";
const KID = "pub:sprites/mob_child.png";
const RUNNER = "pub:sprites/mob_student.png";

/**
 * 夕方のヒグラシの段（seen_higurashi_yama 数 0〜3）。鳴らすたびに遠のき、森の入口（wave_w）で やむ。
 * 読む所: 帯（wave）・onEnter（入りなおしても、やんだあとは鳴らさない）・arrive_shinya。
 */
const HIGURASHI = "seen_higurashi_yama";
const HIGURASHI_VOL = [0.8, 0.5, 0.3];

/**
 * 無人販売所を夕方に見たあと、その場をはなれたか（モジュール変数・セーブしない）。
 * 見てすぐ見なおしても、ナスは へらない（道の帯を ふむか、入りなおすと もどる）。
 */
let tanaMita = false;
/** はざかけを夕方に見たあと、その場をはなれたか（tanaMita と同じ形。すずめは はなれて もどると 二羽に）。 */
let hazaMita = false;
/** 用水路を夕方に見たあと、その場をはなれたか（tanaMita と同じ形。アメンボは もどるたびに 一段 すすむ）。 */
let amenboMita = false;

/**
 * 環境音のワンショット（夕＝ヒグラシだけ。朝のスズメは onEnter と arrive_asa にまかせる）。kawara と同じ方式：
 * 直前に鳴らした帯をモジュール変数で覚え、往復の連打を防ぐ（セーブしない）。
 * 鳴らすたびに seen_higurashi_yama を +1、音を 0.8→0.5→0.3 と遠ざけ、3回目で一度だけ「やんだ」。
 * 3回目（やんだ）は 森の入口の帯 wave_w（x16）でだけ。出口（東 x43・公園への x38）の手前で やむと、
 * kawara・koen の onEnter が すぐ鳴らしなおして、段が 消えてしまう。ほかの帯では 遠いまま 数えない。
 */
let lastWave = "";
const YAMU_AT = "wave_w";
const wave = (id: string, pan: number) => async (s: Story) => {
	tanaMita = false;
	hazaMita = false;
	amenboMita = false;
	if (lastWave === id) return;
	lastWave = id;
	if (s.flag("tod") !== "yu") return;
	const n = numFlag(s, HIGURASHI);
	if (n >= HIGURASHI_VOL.length) return;
	if (n + 1 === HIGURASHI_VOL.length && id !== YAMU_AT) return;
	s.set(HIGURASHI, n + 1);
	s.se("higurashi", { pan, volume: HIGURASHI_VOL[n] });
	if (n + 1 === HIGURASHI_VOL.length) {
		await s.wait(900);
		await s.narrate("……ヒグラシが、\nふっと　やんだ。");
	}
};
/** 見えない環境音の帯（舗装路 y12 に置く。夕方だけ）。 */
const waveBelt = (id: string, x: number, pan: number): EventDef => ({
	id,
	x,
	y: 12,
	trigger: "touch",
	through: true,
	when: (st: GameState) => st.flags.tod === "yu",
	run: wave(id, pan),
});

/**
 * バス停の街灯 (23,11)。lights は yoru,shinya で点く。
 * (60) やまみちの蛾: 宵に見るたび seen_ga_yama を +1（1＝一ぴき、2〜＝二ひき）。
 * 深夜・朝は 宵に蛾を見た人にだけ つづき。room diary の poemKey『ga』が読む。
 */
const GA = "seen_ga_yama";
const lampBus = async (s: Story): Promise<void> => {
	const t = s.flag("tod");
	const ga = numFlag(s, GA);
	if (t === "shinya") {
		if (ga >= 1) {
			await s.narrate("蛾は、かさの　内がわで\nじっと　している。");
			return;
		}
		await s.narrate("あかりの下だけ、\n道が　白い。");
		return;
	}
	if (t === "yoru") {
		s.set(GA, ga + 1);
		if (ga === 0) {
			await s.narrate("蛾が　一ぴき、かさに\nこつこつ　あたる。");
			return;
		}
		if (ga === 1) {
			await s.narrate("蛾が、二ひきに\nふえている。");
			return;
		}
		await s.narrate("二ひきの　蛾が、\nかわるがわる　あたる。");
		return;
	}
	if (t === "asa") {
		if (ga >= 1) {
			await s.narrate("きえた　街灯の　かさに、\n蛾が　一ぴき　とまったまま。");
			return;
		}
		await s.narrate("街灯。もう、\nきえている。");
		return;
	}
	await s.narrate("田んぼの　街灯。\nまだ、ついていない。");
};

/**
 * 公園への分かれ道の街灯 (40,11)。lamp_bus とは文を分けて、公園との つなぎ目にする。
 * (64) 公園への坂: 宵は koen に宵に着いた人、深夜は 展望台に すわった人か koen に深夜に着いた人にだけ、
 * 坂の上の 公園の 一行。朝は (60) やまみちの蛾（lamp_bus の seen_ga_yama）を 見た人にだけ くらべる一行。
 */
const lampKoen = async (s: Story): Promise<void> => {
	const t = s.flag("tod");
	if (t === "shinya") {
		if (s.flag("seen_suwari_koen") || arrived(s, "koen", "shinya")) {
			await s.narrate("上の　展望台は、\nここからは　見えない。");
			return;
		}
		await s.narrate("坂の　上は、まっくらだ。");
		return;
	}
	if (t === "yoru") {
		if (arrived(s, "koen", "yoru")) {
			await s.narrate("坂の　上の　公園にも、\n外灯が　ついていた。");
			return;
		}
		await s.narrate("公園への　坂の　入口だけ\n明るい。");
		return;
	}
	if (t === "asa") {
		if (numFlag(s, GA) >= 1) {
			await s.narrate("こっちの　かさには、\n蛾が　いない。");
			return;
		}
		await s.narrate("街灯。もう、\nきえている。");
		return;
	}
	await s.narrate("公園への　坂。上で、\nカラスが　かえっていく。");
};

/**
 * 通行止めのさく（(3,0)(5,0) で共用）。
 * 夕方に はり紙を読んだ人（seen_tsuukou_yama）は、宵に「くずれた　ほう」の沢の音を聞き、
 * 朝に めくれていた角が とめなおしてあるのを見る（直した人は出さない）。
 */
const tsuukoudome = async (s: Story): Promise<void> => {
	const t = s.flag("tod");
	const yonda = s.flag("seen_tsuukou_yama");
	if (t === "shinya") {
		await s.narrate("通行止めの　さく。\nくらくて、字は　よめない。");
		return;
	}
	if (t === "yoru") {
		// 宵は うすぐらい。大きい字だけ よめて、あとは 耳で（深夜は 字も よめない）
		await s.narrate("さくの　はり紙。大きい\n『通行止め』だけ　よめる。");
		// 夕方の『土砂くずれ』を読んだ人には、音の出どころが わかる
		if (yonda) await s.narrate("くずれた　ほうから、\n沢の音。");
		else await s.narrate("さくの　むこうから、\n沢の音。");
		return;
	}
	await s.narrate("『この先　土砂くずれのため\n通行止め』");
	if (t === "asa" && yonda) {
		// 夕方の「角が　めくれている」の回収
		await s.narrate("めくれていた　角が、\nガムテープで　とめなおしてある。");
		await s.narrate("さくの　ロープに、\n朝つゆが　ならんでいる。");
		return;
	}
	await s.narrate(
		"『9月3日から　当分のあいだ』\nはり紙の　角が　めくれている。",
	);
	if (t === "asa") {
		await s.narrate("さくの　ロープに、\n朝つゆが　ならんでいる。");
		return;
	}
	s.set("seen_tsuukou_yama");
	await s.narrate("ロープに、赤トンボが\nとまっている。");
};

/** 峠のみはらし（(11,1)(11,2) で共用。町の見え方が時間帯で変わる）。 */
const miharashi = async (s: Story): Promise<void> => {
	const t = s.flag("tod");
	if (t === "shinya") {
		// ㉔ 駅の灯り: ここで見た灯りを、ekimae arrive_shinya が「上から　見えた　灯り」で回収する
		s.set("seen_miharashi_eki");
		await s.narrate("町は、ほとんど　くらい。");
		await s.narrate("コンビニの　白い灯りと、\n駅の灯りだけが　見える。");
		return;
	}
	if (t === "yoru") {
		await s.narrate("町の灯りが、まばらに\nちらばっている。");
		await s.narrate("国道のあたりだけ、\n灯りが　ながれていく。");
		// ㊶ 国道のライト: kokudo の歩道橋で ライトが 下を とおりぬけるのを 見た人（seen_hodo_yoru）
		if (s.flag("seen_hodo_yoru"))
			await s.say("kiriko", "（あの　ながれの　上を、\nさっき　わたったンゴ）");
		return;
	}
	if (t === "asa") {
		await s.narrate("町が、朝もやの　下に\nしずんでいる。");
		await s.narrate("屋根と　鉄橋だけ、\nところどころ　うかんでいる。");
		return;
	}
	await s.narrate("町が、ぜんぶ　見える。\n窓に　ひとつずつ　灯りがつく。");
	await s.narrate("川が、夕日で\n一本の線になっている。");
	await s.say("kiriko", "（アパート、どこか\nわからんンゴ）");
};

/**
 * 深夜、峠のベンチに すわる（nostalgia.md P0-7。seen_suwari_yamamichi）。なにも起きない。
 * kawara の fumiato と同じ段取り（文は暗転の前とあとだけ。缶があれば缶の1行に替える）。
 */
const suwaru = async (s: Story): Promise<void> => {
	if (s.flag("seen_suwari_yamamichi")) {
		if (kanHeld(s)) await kanLine(s);
		else await s.narrate("ベンチに　すわって、\nすこし　町のほうを見た。");
		return;
	}
	const i = await s.choose(["＞＞1 すわる", "＞＞2 やめておく"], {
		cancel: 1,
	});
	if (i !== 0) return;
	s.set("seen_suwari_yamamichi");
	await s.narrate("ベンチに　すわって、\n目を　とじた。");
	await s.fadeOut(900, "#04060f");
	await s.wait(900);
	await s.fadeIn(900);
	await s.narrate("下の　田んぼから、\n虫の声が　のぼってくる。");
	// ㉔ 駅の灯りを 見た人（seen_miharashi_eki。みはらし・こうえんの 双眼鏡）は、峠から 町の 灯りを ふたつ かぞえる。
	// 日記の ポエム ue『町の灯りを　かぞえた』の もとになる
	await s.narrate(
		s.flag("seen_miharashi_eki")
			? "目を　あけて、町の\n灯りを　かぞえた。……ふたつ。"
			: "目を　あけると、下に\n町の灯りが　ぽつぽつ。",
	);
	if (kanHeld(s)) await kanLine(s);
	else await s.narrate("ベンチの板が、\n夜つゆで　つめたい。");
	await s.say("kiriko", "……よし。もうすこし\nあるくンゴ");
};

/** 峠のベンチ（(7,1)(8,1) で共用。深夜だけ すわれる）。 */
const bench = async (s: Story): Promise<void> => {
	const t = s.flag("tod");
	if (t === "shinya") {
		await suwaru(s);
		return;
	}
	if (t === "yoru") {
		// ⑨ 夕方に見た かきかけは、宵も まだ そのまま（朝に そろう）
		if (s.flag("seen_aiai_yama")) {
			// 峠に 灯りはない。目ではなく 指で（kuma_sign の宵「くらくて　よめない」と そろえる）
			await s.narrate(
				"指で　なぞると、あいあいがさは\nまだ　かきかけの　まま。",
			);
			return;
		}
		await s.narrate("ベンチの　板が、\n夜気で　すこし　しめっている。");
		return;
	}
	if (t === "asa") {
		await s.narrate("ベンチが、朝つゆで\nしっとり　ぬれている。");
		// ⑨ ゆうべ かきかけだった あいあいがさが、朝には そろっている（書いた人は 出さない）
		if (s.flag("seen_aiai_yama")) {
			await s.narrate(
				"かきかけの　あいあいがさに、\nかさの　右がわが　足されていた。",
			);
			if (s.flag("seen_aiai_hodo") && !s.flag("seen_aiai_kansei")) {
				s.set("seen_aiai_kansei");
				await s.say("kiriko", "（……歩道橋のと、\nやっと　おそろいンゴ）");
			}
		}
		return;
	}
	s.set("seen_aiai_yama");
	await s.narrate("峠の　ベンチ。板に、\nだれかの　イニシャル。");
	await s.narrate("『K・M』。そのとなりに、\nあいあいがさの　かきかけ。");
	if (s.flag("seen_aiai_hodo"))
		await s.say("kiriko", "（……歩道橋の　らくがきと、\nおなじ　字ンゴ）");
};

export const yamamichi: MapDef = {
	id: "yamamichi",
	foreground: "susuki", // ジオラマ表示の前景（手前のススキ）
	// ジオラマ表示の箱。場面ごとに区切る（engine/diorama.ts の boxFor）
	boxes: [
		{ x: 0, y: 0, w: 14, h: 5 }, // 峠
		{ x: 32, y: 0, w: 12, h: 5 }, // 公園への坂
		{ x: 0, y: 5, w: 16, h: 6 }, // 林道のつづら折り
		{ x: 16, y: 5, w: 14, h: 6 }, // はざかけと田んぼ
		{ x: 30, y: 5, w: 14, h: 6 }, // 田んぼの東・公園への道
		{ x: 6, y: 11, w: 14, h: 6 }, // 道祖神と林道の入口
		{ x: 20, y: 11, w: 12, h: 6 }, // バス停と水門
		{ x: 32, y: 11, w: 12, h: 6 }, // 無人販売所
		{ x: 6, y: 17, w: 14, h: 5 }, // 川原の西
		{ x: 20, y: 17, w: 12, h: 5 }, // 川原のなかほど
		{ x: 32, y: 17, w: 12, h: 5 }, // 川原の東
	],
	name: "やまみち",
	bgm: "@tod", // 時間帯の曲（生活音の下にごく薄く。data/index.ts の todBgm）
	// 深夜は山の曲（amb_kazan「活火山の底」）
	todBgm: { shinya: "amb_kazan" },
	outdoor: true,
	outside: "#0a0c08",
	tiles,
	rows,
	// 光源はバス停と、公園への分かれ道の街灯だけ（田舎道はくらいのが正しい。docs/night-fx.md §2）
	lights: [
		{ x: 23, y: 11, r: 3, color: "#ffdf9e", only: "yoru,shinya" },
		{ x: 40, y: 11, r: 3, color: "#ffdf9e", only: "yoru,shinya" },
	],
	// 入るたびに環境音を一波（夕方＝ヒグラシ／朝＝スズメ。宵・深夜は無音のまま）。
	// 夕方のヒグラシは、帯で遠のいた段の音量のまま。やんだあと（3）は鳴らさない（数えない）。
	// 深夜は、手の中の缶が地区ひとつぶん冷める（nostalgia.md P0-6。文は出さない）
	onEnter: async (s) => {
		lastWave = "";
		tanaMita = false;
		hazaMita = false;
		amenboMita = false;
		kanTick(s);
		const t = s.flag("tod");
		if (t === "yu") {
			const n = numFlag(s, HIGURASHI);
			if (n < HIGURASHI_VOL.length)
				s.se("higurashi", { pan: -0.3, volume: HIGURASHI_VOL[n] });
		} else if (t === "asa") s.se("suzume", { volume: 0.8 });
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
				await s.narrate("田んぼの　においがする。");
				await s.narrate("山のほうから、ヒグラシが\nふってくる。");
				// わらの けむり → 宵の におい（arrive_yoru）→ 朝の 灰のまる（arrive_asa）
				s.set("seen_wara_kemuri");
				await s.narrate("田んぼの　はしで、わらを\nやく　けむりが　ひとすじ。");
			},
		},
		// 宵（nostalgia.md P0-1。におい・音・点いた灯りだけ）
		{
			id: "arrive_yoru",
			x: 1,
			y: 0,
			trigger: "auto",
			once: true,
			when: (st) => st.flags.tod === "yoru",
			run: async (s) => {
				await s.wait(500);
				// 夕方の けむりを見た人には「夕方の」と つなげる
				await s.narrate(
					s.flag("seen_wara_kemuri")
						? "夕方の　けむりの　においが、\nまだ　すこし　のこっている。"
						: "わらを　やいた　においが、\nうすく　ただよっている。",
				);
				await s.narrate("バス停の　あかりが、\nついている。");
				await yoruAkubi(s);
			},
		},
		{
			id: "arrive_shinya",
			x: 2,
			y: 0,
			trigger: "auto",
			once: true,
			when: (st) => st.flags.tod === "shinya",
			run: async (s) => {
				await s.wait(700);
				// 夕方にここへ来た人（ヒグラシを聞いた人）には、夕方との ちがいで見せる
				if (arrived(s, "yamamichi", "yu") || numFlag(s, HIGURASHI) >= 3) {
					await s.narrate("夕方の　ヒグラシは、\nもう　鳴かない。");
					await s.narrate("虫の声と、用水路の\n水の音だけ。");
				} else {
					await s.narrate("くらい。虫の声と、\n用水路の　水の音だけ。");
				}
				await s.narrate("山の　かたちが、空より\nすこしだけ　黒い。");
			},
		},
		{
			id: "arrive_asa",
			x: 0,
			y: 2,
			trigger: "auto",
			once: true,
			when: (st) => st.flags.tod === "asa",
			run: async (s) => {
				await s.wait(500);
				s.se("suzume", { pan: -0.3, volume: 0.8 });
				await s.wait(600);
				// 夕方の わらの けむり（arrive_yu）のあと
				await s.narrate(
					s.flag("seen_wara_kemuri")
						? "田んぼの　すみに、黒い\n灰の　まるが　のこっている。"
						: "田んぼに、朝もやが\nひくく　たまっている。",
				);
			},
		},

		// ── 出入り口 ──
		warp("to_kawara", 43, 12, { map: "kawara", x: 1, y: 8, dir: "right" }),
		warp("to_koen", 43, 1, { map: "koen", x: 1, y: 8, dir: "right" }),
		// 峠（通行止めで一歩もどる）
		{
			id: "touge",
			x: 4,
			y: 0,
			trigger: "touch",
			through: true,
			// 時間帯ごとの段（seen_touge_yama_<tod> を +1）。その時間帯の初回だけ 時間帯の文、
			// 2回目は「やっぱり」、3回目からは キリコの一言だけ。seen_touge_yama は通算（nostalgia の表どおり）。
			// はり紙を読んだ人（seen_tsuukou_yama）は、宵に「くずれた　ほう」の水の音を聞き（さくの宵とは別の言いかた）、
			// 朝に さくの足もとの タイヤの あとを 回数によらず一度は見る（seen_touge_tire）
			run: async (s) => {
				const t = s.flag("tod") || "yu";
				const yonda = s.flag("seen_tsuukou_yama");
				s.set("seen_touge_yama", numFlag(s, "seen_touge_yama") + 1);
				const key = `seen_touge_yama_${t}`;
				const n = numFlag(s, key);
				s.set(key, n + 1);
				if (t === "asa" && yonda && !s.flag("seen_touge_tire")) {
					s.set("seen_touge_tire");
					if (n === 0) {
						await s.narrate("さくが　ある。\n谷から、もやが　あがってくる。");
					}
					await s.narrate("さくの　足もとに、\nあたらしい　タイヤの　あと。");
				} else if (n >= 2) {
					await s.say("kiriko", "（ここで　ひきかえすンゴ）");
				} else if (n === 1) {
					await s.narrate("……やっぱり、さく。");
				} else if (t === "yoru") {
					await s.narrate("むこうの　空に、まだ　すこし\n青が　のこっている。");
					if (yonda) await s.narrate("くずれた　ほうで、\n水の音が　する。");
				} else if (t === "shinya") {
					await s.narrate(
						yonda
							? "むこうは、まっくらだ。\nくずれた　ほうから　沢の音。"
							: "むこうは、まっくらだ。\n沢の音だけ　する。",
					);
				} else if (t === "asa") {
					await s.narrate("さくが　ある。\n谷から、もやが　あがってくる。");
				} else {
					await s.narrate("さくが　ある。\nむこうの空が、夕やけで　赤い。");
				}
				await s.move("player", "d");
			},
		},
		{
			id: "sakuW",
			x: 3,
			y: 0,
			sprite: JP.kakoi,
			trigger: "talk",
			fixedDir: true,
			run: tsuukoudome,
		},
		{
			id: "sakuE",
			x: 5,
			y: 0,
			sprite: JP.kakoi,
			trigger: "talk",
			fixedDir: true,
			run: tsuukoudome,
		},

		// ── 環境音の帯（舗装路。歩くたび遠近が変わる） ──
		waveBelt("wave_w", 16, -0.5),
		waveBelt("wave_m", 28, -0.1),
		waveBelt("wave_e", 39, 0.3),

		// ── 峠（ベンチ・みはらし） ──
		{ id: "benchW", x: 7, y: 1, trigger: "talk", run: bench },
		{ id: "benchE", x: 8, y: 1, trigger: "talk", run: bench },
		{ id: "miharashiA", x: 11, y: 1, trigger: "talk", run: miharashi },
		{ id: "miharashiB", x: 11, y: 2, trigger: "talk", run: miharashi },

		// ── 林道（かたむいた杉・クマの看板・林道の標識） ──
		{
			id: "katamuki_sugi",
			x: 12,
			y: 5,
			trigger: "talk",
			run: async (s) => {
				const t = s.flag("tod");
				if (t === "shinya") {
					// 月は沈んでいる（影は書かない）。星あかりの かたちだけ
					await s.narrate(
						"かたむいた　杉の　かたちが、\n星空を　ななめに　きっている。",
					);
					return;
				}
				if (t === "yoru") {
					await s.narrate("杉の　やにの　においが、\n夜は　こい。");
					return;
				}
				if (t === "asa") {
					// 夕方の「予定は　未定」の回収。日付は はじめから書いてあった（夕方は にじんで よめなかった）。
					// 9/27 は月曜（9/20〜22 は 敬老の日・国民の休日・秋分の日で休み）
					if (s.flag("seen_sugi_tape")) {
						await s.narrate("朝の光で、テープの　すみの\n『9/27』が　よめた。");
						await s.say("kiriko", "（未定じゃ　なかった\nンゴ）");
						return;
					}
					await s.narrate(
						"杉が　一本、かたむいている。\nピンクの　テープが、風に　ゆれている。",
					);
					return;
				}
				s.set("seen_sugi_tape");
				await s.narrate("杉が　一本、道のほうへ\nかたむいている。");
				await s.narrate("みきに、ピンクの　テープ。\n『伐採予定』。");
				await s.narrate("すみの　ちいさい　字は、\nにじんで　よめない。");
				await s.say("kiriko", "（予定は　未定ンゴ）");
			},
		},
		{
			id: "kuma_sign",
			x: 5,
			y: 8,
			sprite: JP.infoSign,
			trigger: "talk",
			fixedDir: true,
			run: async (s) => {
				const t = s.flag("tod");
				if (t === "shinya") {
					await s.narrate("看板の字は、くらくて\nよめない。");
					return;
				}
				await s.narrate("『クマ出没注意』\n鈴を　つけて　歩きましょう");
				if (t === "yoru") {
					await s.narrate("手書きの　ところは、\nもう　くらくて　よめない。");
					return;
				}
				if (t === "asa") {
					// 夕方に読んだ手書きの下に、けさの一行
					if (s.flag("seen_kuma")) {
						await s.narrate(
							"手書きが　一行　ふえている。\n『9/14　見回り　異状なし』",
						);
						return;
					}
					await s.narrate("クマの絵が、朝つゆで\nないている　みたいだ。");
					return;
				}
				s.set("seen_kuma");
				await s.narrate("下に　手書きで　『9/12\n足あと　あり　（役場）』。");
				// ㉑ 鈴のランナー（runner_yu）の こしの鈴を聞いた人
				await s.say(
					"kiriko",
					s.flag("seen_runner_yama")
						? "（さっきの　人の　鈴、\nこれンゴね）"
						: "（鈴、もってないンゴ）",
				);
			},
		},
		{
			id: "rindou_sign",
			x: 15,
			y: 11,
			sprite: JP.signpost,
			trigger: "talk",
			fixedDir: true,
			run: async (s) => {
				// 宵も うすぐらくて、大きい字だけ（tsuukoudome の宵と そろえる）
				const t = s.flag("tod");
				if (t === "shinya" || t === "yoru") {
					await s.narrate("林道の　標識。\n『峠まで』の　字だけ　よめる。");
					return;
				}
				// ここから峠まで。koen michishirube の 2.4km は 公園からの 道のり（べつの数）
				await s.narrate("『林道　さわのうえ線\n峠まで　1.2km』");
				await s.narrate(
					"その下に　『落石注意』。\n石の絵が、ちょっと　まるい。",
				);
				// (64) 公園への坂: koen michishirube の はがれかけの シールを見た人にだけ
				if (s.flag("seen_koen_michi")) {
					await s.narrate("こっちの　標識の　シールは、\nはがれていない。");
				}
			},
		},
		{
			id: "dosojin",
			x: 10,
			y: 12,
			sprite: JP.sekihi,
			trigger: "talk",
			fixedDir: true,
			run: async (s) => {
				await s.narrate("道ばたの　石。ふたり\nならんで　ほってある。");
				const t = s.flag("tod");
				if (t === "shinya") {
					await s.narrate("かおは、くらくて\n見えない。");
					return;
				}
				if (t === "yoru") {
					await s.narrate("石が、昼の　ぬくもりを\nすこし　のこしている。");
					return;
				}
				if (t === "asa") {
					if (s.flag("seen_dosojin_hana")) {
						await s.narrate("足もとの　花が、\nあたらしいのに　かわっている。");
						return;
					}
					await s.narrate("足もとに、つゆくさが\n一本　そなえてある。");
					return;
				}
				s.set("seen_dosojin_hana");
				await s.narrate("足もとに、野の花。\nすこし　しおれている。");
			},
		},

		// ── バス停 ──
		{
			id: "basutei",
			x: 22,
			y: 11,
			sprite: VILLAGE_SPR.busStop,
			trigger: "talk",
			fixedDir: true,
			run: async (s) => {
				const t = s.flag("tod");
				if (t === "shinya") {
					await s.narrate("時刻表。くらくて、\n顔を　ちかづける。");
					// 始発は 朝の「6:52 の　バスは、もう　出たあと」と そろえる
					await s.narrate("さいごの行は　19:12。\n始発は　6:52。");
					return;
				}
				await s.narrate("バス停『かみがわら』。\n時刻表の　数字が　すくない。");
				if (t === "yoru") {
					await s.narrate("さいごの　バスは　19:12。\nもう、出たあとだ。");
					// バス待ちの人（baachan_yu）の ざぶとん。持ち主の姿は書かない
					if (s.flag("seen_basu_baachan"))
						await s.narrate("ベンチに、手あみの\nざぶとんだけ　のこっている。");
					return;
				}
				if (t === "asa") {
					await s.narrate("6:52 の　バスは、\nもう　出たあとらしい。");
					await s.narrate("つぎは　7:40。\nそのつぎは、おひるすぎ。");
					// 夕方の「むすめのとこに　おかず」のあと、ざぶとんは ひと晩 そのまま
					if (s.flag("seen_basu_baachan")) {
						await s.narrate("ざぶとんが、朝つゆを\nすって　おもたい。");
						await s.say("kiriko", "（むすめさんの　とこに\nとまったンゴね）");
					}
					return;
				}
				await s.narrate("つぎは　17:48。\nそのあとは　19:12で　おわり。");
				await s.narrate("ベンチに、手あみの\nざぶとんが　しいてある。");
			},
		},
		{ id: "lamp_bus", x: 23, y: 11, trigger: "talk", run: lampBus },
		{ id: "lamp_koen", x: 40, y: 11, trigger: "talk", run: lampKoen },

		// ── 無人販売所 ──
		{
			id: "mujin_tana",
			x: 34,
			y: 11,
			trigger: "talk",
			run: async (s) => {
				const t = s.flag("tod");
				// 夕方の段（seen_mujin_fukuro 数 1〜3）＝ ふたふくろ → ひとふくろ → から。
				// 宵・朝は、夕方に見た人にだけ つづきを見せる
				const n = numFlag(s, "seen_mujin_fukuro");
				if (t === "shinya") {
					await s.narrate("たなは、からっぽだ。\n板に、どろの　あと。");
					return;
				}
				if (t === "yoru") {
					if (n >= 3) {
						// 夕方に からの たなを 見た人
						await s.narrate(
							"たなに、ぬのが　かけてある。\n土と　ナスの　におい。",
						);
						return;
					}
					await s.narrate(
						n >= 1
							? "ぬのの　すそから、ナスが\nひとふくろだけ　のぞいている。"
							: "たなに、ぬのが\nかけてある。",
					);
					return;
				}
				if (t === "asa") {
					await s.narrate("ナスと　ピーマンが、\nたなに　ならんでいる。");
					await s.narrate(
						n >= 1
							? "『けさ　とれました』。\nきょうは、ほんとうに　けさだ。"
							: "ふくろに　マジックで\n『けさ　とれました』。",
					);
					return;
				}
				// 夕方。見てすぐ見なおしても へらない（その場を はなれて もどると、ひとつ すすむ）
				const m = n >= 3 || (n >= 1 && tanaMita) ? n : n + 1;
				tanaMita = true;
				if (m !== n) s.set("seen_mujin_fukuro", m);
				if (m <= 1) {
					await s.narrate("無人販売所。ナスが\nふたふくろ、のこっている。");
					await s.narrate("ふくろに　マジックで、\n『けさ　とれました』。");
					return;
				}
				if (m === 2) {
					await s.narrate("ナスが、ひとふくろに\nへっている。");
					return;
				}
				await s.narrate(
					"たなは、もう　からだ。\n板に、ナスの　へたが　ひとつ。",
				);
			},
		},
		{
			id: "mujin_hako",
			x: 35,
			y: 11,
			trigger: "talk",
			run: async (s) => {
				const t = s.flag("tod");
				if (t === "shinya") {
					await s.narrate("料金箱。南京錠が、\nかかっている。");
					return;
				}
				await s.narrate(
					"料金箱。『ひとふくろ　百円』\n木の箱に、ほそい　すきま。",
				);
				if (t === "yu") {
					await s.narrate("ふると、じゃらっと\n鳴りそうな　重さだ。");
					// 田んぼの人（nouka_yu の二層目）の『つけ』の話を聞いた人
					await s.say(
						"kiriko",
						s.flag("seen_nouka2")
							? "（ここに、『つけ』の\nメモが　入ってたンゴ）"
							: "（ふらないンゴ）",
					);
					return;
				}
				if (t === "yoru") {
					await s.narrate("ふたに、夜つゆが\nういている。");
					return;
				}
				if (t === "asa") {
					await s.narrate("ふたに、セロテープで\nあたらしい　メモ。");
					await s.narrate("『おつりは　出ません』。");
					// 『つけ』の子は、けさ はらいに来た（nouka_asa と おなじ朝）
					if (s.flag("seen_nouka2"))
						await s.narrate("その下に、えんぴつで\n『はらいました』。");
				}
			},
		},

		// ── 田んぼ（はざかけ・かかし・あぜ越し） ──
		{
			id: "hazakake",
			x: 22,
			y: 5,
			trigger: "talk",
			run: async (s) => {
				const t = s.flag("tod");
				if (t === "shinya") {
					// 月は沈んでいる（影は書かない）
					await s.narrate(
						"はざかけの　かたちが、\n黒い　へいのように　ながい。",
					);
					return;
				}
				if (t === "yoru") {
					await s.narrate("ほした　稲の　におい。\nすこし　あまい。");
					return;
				}
				if (t === "asa") {
					// 夕方の 一羽（→二羽）を見た人にだけ、朝は ずらり
					if (numFlag(s, "seen_hazakake") >= 1) {
						await s.narrate("はざかけに、すずめが\nずらりと　ならんでいる。");
						await s.say(
							"kiriko",
							"（ゆうべの　一羽が、\nなかまを　よんだンゴ）",
						);
						return;
					}
					await s.narrate("稲たばに、朝つゆが\nびっしり　ついている。");
					return;
				}
				// 夕方の段（seen_hazakake 数 1〜2）＝ すずめ一羽 → 二羽。
				// 見てすぐ見なおしても ふえない（その場を はなれて もどると、ひとつ すすむ。mujin_tana と同じ）
				const n = numFlag(s, "seen_hazakake");
				const m = n === 0 || (n === 1 && !hazaMita) ? n + 1 : n;
				if (m !== n) s.set("seen_hazakake", m);
				if (m === n) {
					// 数が すすまない 見なおしは、1行目だけ
					await s.narrate("はざかけ。かった　稲が、\nさかさまに　ほしてある。");
				} else if (m === 1) {
					await s.narrate("はざかけ。かった　稲が、\nさかさまに　ほしてある。");
					await s.narrate("すずめが　一羽、\nこっそり　つまんでいる。");
					// ㊼ しんまい: スーパーの『新米　入りました』を見た人／田んぼの人の「となりの田は、もう」を聞いた人
					if (s.flag("seen_suupaa_kome"))
						await s.say(
							"kiriko",
							"（スーパーの　新米の、\nまだ　ほしてる　ほうンゴ）",
						);
					else if (s.flag("seen_nouka"))
						await s.say("kiriko", "（となりの　田の\nぶんンゴね）");
				} else {
					await s.narrate("すずめが、二羽に\nふえている。");
				}
				hazaMita = true;
			},
		},
		{
			id: "kakashi",
			x: 23,
			y: 8,
			trigger: "talk",
			run: async (s) => {
				const t = s.flag("tod");
				if (t === "shinya") {
					await s.narrate(
						"田んぼの　まんなかの　かかし。\nあたまの形だけ、わかる。",
					);
					return;
				}
				if (t === "yoru") {
					await s.narrate(
						"かかしの　ヘルメットに、\n虫が　こつん、と　あたる音。",
					);
					return;
				}
				if (t === "asa") {
					// 夕方に この かかしを 見た人だけ。上から 一つ（キリコは 一つまで）
					if (!s.flag("seen_kakashi_yama")) {
						await s.narrate("かかしが、朝もやに\nぼんやり　立っている。");
						return;
					}
					// ㊱ かわらの 宵の風（seen_kakashi_kaze）で むぎわらの つばが ばたつくのを 聞いた人
					if (s.flag("seen_kakashi_kaze")) {
						await s.narrate(
							"ヘルメットは、あごひもで\nしっかり　とまっている。",
						);
						await s.say("kiriko", "（こっちは、とばされ\nないンゴね）");
						return;
					}
					await s.narrate("かかしの　ヘルメットに、\nカラスが　のっている。");
					// 夕方の はざかけの すずめ（seen_hazakake）を見た人
					await s.say(
						"kiriko",
						numFlag(s, "seen_hazakake") >= 1
							? "（はざかけの　みはりは、\nしてないンゴ）"
							: "（なめられてるンゴ）",
					);
					return;
				}
				// ㊱ ふたつのかかし: seen_kakashi_yama → kawara kakashi（yu）・この かかしの 朝
				s.set("seen_kakashi_yama");
				await s.narrate("かかし。黄色い\nヘルメットを　かぶっている。");
				await s.narrate("工事げんばの　おさがり\nらしい。");
				// かわらの かかしの むぎわら（seen_kakashi_boushi）を 先に見た人
				if (s.flag("seen_kakashi_boushi"))
					await s.say(
						"kiriko",
						"（かわらのは　むぎわら、\nこっちは　ヘルメットンゴ）",
					);
			},
		},
		{
			id: "tanbo_kita",
			x: 28,
			y: 8,
			trigger: "talk",
			run: async (s) => {
				const t = s.flag("tod");
				if (t === "shinya") {
					// 宵の さわさわ が、深夜は やむ
					await s.narrate("風が　やんで、稲が\nぴたりと　とまっている。");
					return;
				}
				if (t === "yoru") {
					await s.narrate("いねの　穂が、夜風で\nさわさわ　いう。");
					return;
				}
				if (t === "asa") {
					// 田んぼの人（nouka_yu）の「うちは　来週」を聞いた人に、朝の あぜの鎌
					if (s.flag("seen_nouka")) {
						await s.narrate("あぜに、鎌が　二本\nとぎかけで　ならべてある。");
						await s.say("kiriko", "（来週の　ぶんンゴ）");
						return;
					}
					// 夕方に「頭を　さげている」いねを見た人に
					if (s.flag("seen_tanbo_kita")) {
						await s.narrate(
							"ゆうべ　さげていた　穂に、\nつゆが　ならんでいる。",
						);
						return;
					}
					await s.narrate("いねの　先に、つゆの\nつぶが　ならんでいる。");
					return;
				}
				s.set("seen_tanbo_kita");
				await s.narrate("いねが、おもたそうに\n頭を　さげている。");
				// 田んぼの人（nouka_yu）の「うちは　来週。腰が　いたい」を聞いた人
				if (s.flag("seen_nouka"))
					await s.say("kiriko", "（これを　ぜんぶ、手で\nかるンゴ……）");
			},
		},
		{
			id: "koen_sign",
			x: 37,
			y: 10,
			sprite: JP.infoSign,
			trigger: "talk",
			fixedDir: true,
			run: async (s) => {
				await s.narrate("『この上　公園』。\n矢印は、手書きだ。");
				await s.narrate("板の　すみに、ちいさく\n『ベンチ　あります』。");
			},
		},
		{
			id: "kyorihyo",
			x: 41,
			y: 11,
			sprite: JP.signpost,
			trigger: "talk",
			fixedDir: true,
			run: async (s) => {
				s.set("seen_kyori_14");
				await s.narrate("くいの　きょり標。\n『河口から 14.0km』");
				await s.narrate("川は、まだ　上へ\nつづいている。");
			},
		},

		// ── 用水路と水門・南の田んぼ・川原 ──
		{
			id: "suimon",
			x: 26,
			y: 13,
			trigger: "talk",
			run: async (s) => {
				const t = s.flag("tod");
				if (t === "shinya") {
					// 深夜の水音は yousuiro に まかせて、ここは虫の声
					await s.narrate(
						"水門の　ハンドルの　あたりで、\n虫が　チン、チン、と　鳴く。",
					);
					return;
				}
				if (t === "yoru") {
					await s.narrate("水門の　すきまから、\n水の　おちる音。");
					return;
				}
				if (t === "asa") {
					await s.narrate("水門が、すこしだけ\nあけてある。");
					await s.narrate("ハンドルに、軍手が\nひっかけてある。");
					// 夕方、用水路（yousuiro）で アメンボが ながされるのを 見た人（水門は その 下手）
					if (numFlag(s, "seen_amenbo") >= 1) {
						await s.narrate(
							"水門の　てまえの　よどみに、\nアメンボが　たまっている。",
						);
						await s.say("kiriko", "（ここまで　ながされて\nきたンゴ）");
					}
					return;
				}
				await s.narrate("用水路の　水門。\nハンドルに　赤いペンキ。");
				await s.narrate("『かってに　まわさない』\n……まわしません。");
			},
		},
		{
			id: "yousuiro",
			x: 18,
			y: 13,
			trigger: "talk",
			run: async (s) => {
				const t = s.flag("tod");
				if (t === "shinya") {
					await s.narrate("水の音だけが、\n昼より　ずっと　大きい。");
					return;
				}
				if (t === "yoru") {
					await s.narrate("用水路の　水音に、\nコオロギが　まじる。");
					return;
				}
				if (t === "asa") {
					await s.narrate("用水路に、青い空が\nうつって　ながれていく。");
					return;
				}
				// 夕方の段（seen_amenbo 数 1〜3）＝ ながされる → もどって ふんばる → また ながされる。
				// はなれて もどるたびに ひとつ すすむ（amenboMita。mujin_tana と同じ）。朝は suimon の よどみで回収
				const n = numFlag(s, "seen_amenbo");
				const m = n >= 3 || (n >= 1 && amenboMita) ? n : n + 1;
				amenboMita = true;
				if (m !== n) s.set("seen_amenbo", m);
				if (m === 2) {
					await s.narrate(
						"さっきの　アメンボが、\nまた　上で　ふんばっている。",
					);
					if (m !== n) await s.say("kiriko", "（もどってきたンゴ……）");
					return;
				}
				if (m === 3 && m !== n) {
					await s.narrate("……また　ながされた。");
					return;
				}
				await s.narrate("用水路。水が　はやい。\nアメンボが　ながされていく。");
				if (m !== n) await s.say("kiriko", "（さからう気が\nないンゴ）");
			},
		},
		{
			id: "tanbo_minami",
			x: 22,
			y: 16,
			trigger: "talk",
			run: async (s) => {
				const t = s.flag("tod");
				if (t === "shinya") {
					await s.narrate("虫の声が、田んぼ\nいっぱいに　ひろがっている。");
					return;
				}
				// ㊲ わらのけむり: 夕方の わらの山（seen_wara_yama）→ 宵、黒く ひくく → 朝、灰の まるの やきいも
				// （seen_wara_imo → mujin_asa の 2回目「うちの　人よ」seen_imo_kiku）。やいている 人は 出さない
				if (t === "yoru") {
					// 火の色は 書かない
					await s.narrate(
						s.flag("seen_wara_yama")
							? "わらの　山が、黒く\nひくく　なっている。"
							: "あぜの　草むらで、\n虫が　鳴きかわしている。",
					);
					return;
				}
				if (t === "asa") {
					if (s.flag("seen_wara_yama")) {
						await s.narrate(
							"灰の　まるの　まんなかに、\nアルミホイルの　つつみ。",
						);
						if (!s.flag("seen_wara_imo")) {
							s.set("seen_wara_imo");
							await s.say("kiriko", "（やきいも、\nわすれてるンゴ）");
						}
						return;
					}
					await s.narrate("あぜの　草が、朝つゆで\nおもたそうだ。");
					return;
				}
				s.set("seen_wara_yama");
				// 着いたときの けむり（arrive_yu の seen_wara_kemuri）の 出どころ
				await s.narrate(
					s.flag("seen_wara_kemuri")
						? "あぜの　はしに、わらの　山。\nけむりは、ここから　だった。"
						: "あぜの　はしに、わらの　山。\nてっぺんが、まだ　くすぶっている。",
				);
				await s.narrate("そばに、水の　入った\nバケツが　おいてある。");
			},
		},
		{
			id: "kawa",
			x: 25,
			y: 19,
			trigger: "talk",
			run: async (s) => {
				const t = s.flag("tod");
				if (t === "shinya") {
					await s.narrate("音だけの川。\n石に　あたって　くだける音。");
					return;
				}
				if (t === "yoru") {
					await s.narrate("水面は　くろい。\n川の音が、ちかい。");
					return;
				}
				if (t === "asa") {
					await s.narrate("川から、白い　もやが\nたちのぼっている。");
				} else {
					await s.narrate(
						"川はばが、せまくなった。\n石が　ごろごろ　している。",
					);
					await s.narrate("夕日が、石のあいだで\nこまかく　われている。");
				}
				// ⑥ 水きり: かわらの とっておきの 石を なげてしまった人（seen_mizukiri_nage）が、
				// ここで 一まい ひろって（got_ishi_yama）、kawara mizukiri_ishi の 山に かえす（seen_ishi_kaeshi）
				if (
					!s.flag("seen_mizukiri_nage") ||
					s.flag("got_ishi_yama") ||
					s.flag("seen_ishi_kaeshi")
				)
					return;
				await s.narrate("足もとに、ひらたい　石が\nいくらでも　ある。");
				const i = await s.choose(["＞＞1 一まい　ひろう", "＞＞2 やめておく"], {
					cancel: 1,
				});
				if (i !== 0) return;
				s.se("item", { volume: 0.4 });
				s.set("got_ishi_yama");
				await s.say("kiriko", "（かわらの　石の山に、\nかえすンゴ）");
			},
		},
		{
			id: "susuki",
			x: 15,
			y: 18,
			trigger: "talk",
			run: async (s) => {
				const t = s.flag("tod");
				if (t === "shinya") {
					// 月は沈んでいる（白い穂は見えない）
					await s.narrate("ススキの　ゆれる　音だけ。\n穂は、見えない。");
					// ③ まつり: 夕方に「つきみの　ススキ」を思った人に
					if (s.flag("seen_susuki_yama"))
						await s.say("kiriko", "（つきみまで、\nあと　ひと月ンゴ）");
					return;
				}
				if (t === "yoru") {
					await s.narrate("ススキの　あいだを、\n夜風が　ぬけていく。");
					return;
				}
				if (t === "asa") {
					// ③ まつり: 夕方に見た穂の、ひと晩あと
					if (s.flag("seen_susuki_yama")) {
						await s.narrate("穂が、すこし\nひらいてきた。");
						return;
					}
					await s.narrate("ススキに、朝つゆ。\nさわると　つめたい。");
					return;
				}
				await s.narrate("ススキの　ねもとで、\nコオロギが　鳴いている。");
				// ③ まつり: 来月の つきみ秋まつりの おしらせを どこかで見た人（akiMatsuri）に、一度だけ
				if (akiMatsuri(s) && !s.flag("seen_susuki_yama")) {
					s.set("seen_susuki_yama");
					await s.say("kiriko", "（つきみの　ススキ、\nここに　いっぱいンゴ）");
				}
			},
		},

		// ── 夕方の人たち（くだらない雑談だけ。説明しない） ──
		// 田んぼの人（3層: 初回／二層目=無人販売所の『つけ』／待機）
		npc(
			"nouka_yu",
			25,
			6,
			NOUKA,
			async (s) => {
				if (!s.flag("seen_nouka")) {
					s.set("seen_nouka");
					await s.say(null, "となりの田は、もう\nかりおわってな", {
						name: "田んぼの人",
					});
					await s.say(null, "うちは　来週。\n腰が　いまから　いたい", {
						name: "田んぼの人",
					});
					await s.say("kiriko", "まだ　かってないンゴ……");
					await s.say(null, "いたくなる　予定の\nいたさだ", {
						name: "田んぼの人",
					});
					return;
				}
				if (!s.flag("seen_nouka2")) {
					s.set("seen_nouka2");
					await s.say(null, "下の　無人のとこ、\nうちの　ナスだよ", {
						name: "田んぼの人",
					});
					await s.say(
						null,
						"きのう、箱の中に\n『つけ』って　メモが　あってな",
						{
							name: "田んぼの人",
						},
					);
					await s.say("kiriko", "つけ、きくンゴ？");
					await s.say(null, "子どもの字だった。\n……まあ、いいわな", {
						name: "田んぼの人",
					});
					return;
				}
				await s.say(null, "……腰がな", { name: "田んぼの人" });
			},
			{ dir: "down", when: (st) => st.flags.tod === "yu" },
		),
		// バス待ちのばあちゃん
		npc(
			"baachan_yu",
			21,
			11,
			BAACHAN,
			async (s) => {
				if (!s.flag("seen_basu_baachan")) {
					s.set("seen_basu_baachan");
					await s.say(null, "町の　むすめのとこに、\nおかず　とどけるの", {
						name: "バス待ちの人",
					});
					await s.say(
						null,
						"バスが　すくないから、\nはやめに　来て　すわってるの",
						{
							name: "バス待ちの人",
						},
					);
					await s.say("kiriko", "（はやすぎる気が\nするンゴ）");
					return;
				}
				await s.say(null, "ざぶとん、うちのよ。\n……すわる？", {
					name: "バス待ちの人",
				});
				await s.say("kiriko", "えんりょするンゴ");
			},
			{ dir: "down", when: (st) => st.flags.tod === "yu" },
		),
		// 自転車の子（舗装路を行き来する）
		npc(
			"jitensha_yu",
			30,
			12,
			KID,
			async (s) => {
				if (!s.flag("seen_jitensha_yu")) {
					s.set("seen_jitensha_yu");
					await s.say(null, "チャイム　なったから、\nかえるとこ！", {
						name: "自転車の子",
					});
					await s.say(null, "きょう、カレー。\nにおいで　わかる", {
						name: "自転車の子",
					});
					await s.say("kiriko", "（まだ　家に\nついてないンゴ）");
					return;
				}
				await s.say(null, "じゃあね！　カレーが\nまってるから！", {
					name: "自転車の子",
				});
			},
			{ wander: true, when: (st) => st.flags.tod === "yu" },
		),
		// ランニングの人（話しかけても会釈だけ。こしに クマよけの鈴）
		// ㉑ 鈴のランナー: seen_runner_yama → kuma_sign（yu）・kawara runner_asa（asa）。
		// kawara runner_yu（seen_runner_yu）で すれちがった人には、おなじ人だと気づかせる
		npc(
			"runner_yu",
			33,
			6,
			RUNNER,
			async (s) => {
				if (s.flag("seen_runner_yama")) {
					s.se("suzu", { volume: 0.4 });
					await s.narrate("鈴の音が、あぜ道を\nとおざかっていく。");
					return;
				}
				s.set("seen_runner_yama");
				await s.narrate("はしりながら、かるく\n会釈をされた。");
				s.se("suzu", { volume: 0.4 });
				await s.narrate("こしの　鈴が、\nちりちり　鳴っている。");
				if (s.flag("seen_runner_yu"))
					await s.say("kiriko", "（かわらで　すれちがった\n人ンゴ）");
			},
			{ wander: true, when: (st) => st.flags.tod === "yu" },
		),

		// ── 朝の人たち（セリフ全差し替え。夕方の setup の payoff） ──
		npc(
			"nouka_asa",
			25,
			6,
			NOUKA,
			async (s) => {
				if (!s.flag("seen_nouka_asa")) {
					s.set("seen_nouka_asa");
					if (s.flag("seen_nouka2")) {
						await s.say(
							null,
							"『つけ』の子な、けさ\nちゃんと　はらいに　来たよ",
							{
								name: "田んぼの人",
							},
						);
						await s.say(null, "十円玉で、十まい。\n……ぬくかったわ", {
							name: "田んぼの人",
						});
						await s.say("kiriko", "（にぎりしめて\nきたンゴ）");
						return;
					}
					if (s.flag("seen_nouka")) {
						await s.say(null, "ゆうべの　散歩の子か。\nはやいな", {
							name: "田んぼの人",
						});
						await s.say(null, "腰？　……まだ\nいたくない。予定どおり", {
							name: "田んぼの人",
						});
						return;
					}
					await s.say(null, "おはよう。\n露が　はれたら　はじめるよ", {
						name: "田んぼの人",
					});
					return;
				}
				// ㊱ ふたつのかかし: かわらの 西はしの 田（kawara kakashi）も、この人の 田。
				// 朝、とばされた むぎわらを くいに かけた人（seen_kakashi_naoshi）に、一度だけ
				if (s.flag("seen_kakashi_naoshi") && !s.flag("seen_kakashi_orei")) {
					s.set("seen_kakashi_orei");
					await s.say(
						null,
						"かかしの　ぼうし、くいに\nかけといたの、あんたか",
						{
							name: "田んぼの人",
						},
					);
					await s.say(null, "……ありがとさん", { name: "田んぼの人" });
					return;
				}
				await s.narrate("田んぼの　水口を、\nじっと　見ている。");
			},
			{ dir: "down", when: (st) => st.flags.tod === "asa" },
		),
		npc(
			"jitensha_asa",
			28,
			12,
			KID,
			async (s) => {
				if (!s.flag("seen_jitensha_asa")) {
					s.set("seen_jitensha_asa");
					if (s.flag("seen_jitensha_yu")) {
						await s.say(null, "きのうの　カレー、\nけさも　カレーだった", {
							name: "自転車の子",
						});
						await s.say("kiriko", "（二日目ンゴ）");
						return;
					}
					await s.say(null, "ねぼうした！\n……してない！　してない！", {
						name: "自転車の子",
					});
					return;
				}
				await s.say(null, "7:40の　バスに\nかつんだ！", { name: "自転車の子" });
			},
			{ wander: true, when: (st) => st.flags.tod === "asa" },
		),
		npc(
			"mujin_asa",
			36,
			11,
			OBACHAN,
			async (s) => {
				if (!s.flag("seen_mujin_asa")) {
					s.set("seen_mujin_asa");
					await s.say(null, "ならべてる　とこよ。\nけさの　ナス", {
						name: "販売所の人",
					});
					// 夕方の『けさ　とれました』の ふくろ（mujin_tana）を見た人にだけ、種明かし
					if (s.flag("seen_mujin_fukuro")) {
						await s.say(
							null,
							"『けさ　とれました』は、\nきのうの　ふくろの　つかいまわし",
							{
								name: "販売所の人",
							},
						);
						await s.say("kiriko", "（きのうのは、\nきのうの　けさンゴ）");
						return;
					}
					await s.say(null, "ひとふくろ　百円。\nおつりは　出ないのよ", {
						name: "販売所の人",
					});
					return;
				}
				// ㊲ わらのけむり: 南の田の 灰の まるで やきいもの つつみを 見た人（seen_wara_imo）に、一度だけ
				if (s.flag("seen_wara_imo") && !s.flag("seen_imo_kiku")) {
					s.set("seen_imo_kiku");
					await s.say("kiriko", "灰の　中の　いも、\nだれのンゴ？");
					await s.say(null, "うちの　人よ。\nまいとし　わすれるの", {
						name: "販売所の人",
					});
					return;
				}
				// 田んぼの人（nouka_yu）から『つけ』の話を聞いた人
				if (s.flag("seen_nouka2")) {
					await s.say(null, "『つけ』の　子ねえ……\nうちの　人が　あまいのよ", {
						name: "販売所の人",
					});
					return;
				}
				await s.say(null, "ピーマンも　あるわよ。\nまがってる　けど", {
					name: "販売所の人",
				});
			},
			{ dir: "left", when: (st) => st.flags.tod === "asa" },
		),
	],
};
