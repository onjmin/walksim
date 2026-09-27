// みどりがおか公園（町のうらの、丘の上の大きな公園）。docs/content-briefs.md「日常の町 拡張」・
// docs/style-everyday.md・docs/style-spaces.md。44×24・outdoor・BGM "@tod"。
// street のうらどおり（路地の北）から、ながい石段をのぼった先。sumire の小さな公園とはべつの、
// ひろい丘の公園。主役は画面ごとに一つ（石段／図書館／池とスワン／藤棚／野球場／展望台／給水塔／林の道）。
//
// 時間帯の顔（flags.tod）:
//   夕方 … 図書館の人がかぎをしめている（3層会話）。キャッチボールの子（相手は先に帰った）、
//           藤棚のベンチのふうふ、コイに麩をやる会社帰りの人、石段ダッシュのジョギングの人。
//           怪異ゼロ（必達）
//   宵   … NPC 0体（docs/nostalgia.md P0-1）。外灯・図書館の入口のあかり・給水塔のランプ。
//           文は「におい・音・点いた灯り」だけ
//   深夜 … NPC 0体（必達）。展望台のベンチに すわれる（seen_suwari_koen・P0-7 の形）。
//           脇道の違和感はひとつだけ: スワンが一羽、ロープをはなれて池のまんなかに
//           うかんでいる（seen_koen_swan。風でほどけた、で通る。朝は全部つながれている）。
//           ノートは呼ばない（notes.ts に該当 id が無い）
//   朝   … もや・スズメ。NPC 4体（ラジオ体操のじいさん・ジョギングの人・返却ポストをあける
//           図書館の人・ボールをさがす子）。夕方の setup の payoff（かぎ・ボール・ふうふ・石段）
//
// 出入口（地続き）: 南 (20,23)→street(4,4)・street からの着地 (20,22) 上向き／
//   西 (0,8)→yamamichi(38,1)・yamamichi からの着地 (1,8) 右向き。

import type {
	EventDef,
	GameState,
	MapDef,
	Story,
	TileDef,
} from "../../engine/defs";
import { npc, warp } from "../helpers";
import { kanHeld, kanLine, kanTick, yoruAkubi } from "../nostalgia";
import { DOOR, JP, TOWN, WALL } from "../tiles";

// ── タイル ──
// TOWN をベースに、丘の公園の地面と池・石段・藤棚・給水塔を足す。
//   ,  草地   :  土の道   .  舗装（広場・展望台・図書館の前）   =  石段   ~  池   #  桟橋
//   f  網フェンス（展望台の手すり・野球場）   |  いけがき   T  木   L  外灯
//   F  藤棚（花のおわった藤）   B b  ベンチ   V  自販機   U  水のみ場   Q  給水塔
//   a A  図書館の屋根   ( ) w  図書館の壁と窓   o  図書館の戸（しまっている）   K k  図書館の掲示板
//   s  野球場の土
const tiles: Record<string, TileDef> = {
	...TOWN,
	",": { layers: [JP.grassTuft], color: "#6a7a48", passable: true },
	":": { layers: [JP.dirtPath], color: "#7a6a50", passable: true },
	"=": { layers: [JP.stoneSteps], color: "#8a8a8a", passable: true },
	"~": { layers: [JP.water], color: "#4a6a88", passable: false },
	"#": { layers: [JP.bridgeV], color: "#8a8880", passable: true },
	s: { layers: [JP.schoolDirt], color: "#b89a6a", passable: true },
	L: { ...TOWN.L, layers: [JP.ground, JP.lamp] },
	F: {
		layers: [JP.ground, JP.flowers],
		color: "#6a7a48",
		passable: false,
	},
	Q: {
		layers: [JP.ground, JP.waterTower],
		color: "#8a8a90",
		passable: false,
	},
	o: {
		layers: [WALL.sidingLo, DOOR.house],
		color: "#e8e8e8",
		passable: false,
	},
};

// 北＝展望台（手すり・方位盤・コイン双眼鏡・ベンチ）と給水塔。中央＝池（桟橋とスワン）と藤棚。
// 西＝林の道（→yamamichi）と図書館。東＝野球場（バックネット・ベンチ）。南＝ながい石段（→street）。
const rows = [
	"                                            ", // y0
	"                ffffffffffff                ", // y1  手すり。方位盤 (18,1)・双眼鏡 (21,1)・ながめ (25,1)
	"                ............ ,, ,           ", // y2
	"                L.......Bb..::,Q,           ", // y3  外灯 (16,3)・ベンチ (24,3)(25,3)・給水塔 (31,3)
	"                    ,=,      ,,,,           ", // y4  展望台への石段 (21,4)-(21,6)
	"                   T,=,T                    ", // y5
	" T   T   T  L T  T ,,=,, T                  ", // y6  外灯 (12,6)
	" ,T,,,T,,,, :::::::::::::::::               ", // y7  池のまわりの道（北）
	":::::::::::::~~~~~~~~~~~~~~~:FFFFF          ", // y8  林の道。yamamichi への出口 (0,8)・着地 (1,8)。藤棚 (29-33,8)
	",,,T,,,,T,,,:~~~~~~~~~~~~~~~:,,Bb,L         ", // y9  道しるべ (10,9)・ふうふのベンチ (31,9)(32,9)・外灯 (34,9)
	" T    T   T :~~~~~~~#~~~~~~~:,,,,,,         ", // y10 桟橋 (20,10)(20,11)
	"            :~~~~~~~#~~~~~~~:,,,,,          ", // y11 スワン (19,11)(21,11)
	"            ::::::::::::::::: ffffffffffffff", // y12 料金板 (21,12)・コイの人 (16,12)
	" aaaaaaaaa  ::::::::::::::::: fssssssssssss|", // y13 図書館の屋根
	" AAAAAAAAA          :         fssssssssssss|", // y14
	" (w((w((w(          :         fssssssssssss|", // y15 ボールのいけがき (43,15)
	" )))o)))))Kk.V..L.........U.  fssssssssssss|", // y16 開館時間 (3,16)・戸 (4,16)・掲示板 (10,16)・自販機 (13,16)・外灯 (16,16)・水のみ場 (26,16)
	"............................:::ssssssssssss|", // y17 図書館の前と広場。返却ポスト (7,17)。野球場の入口 (30,17)
	",,,,,,,,,,,,       |=|        fssssssssssss|", // y18
	"  T    T           |=|        fssssssssssss|", // y19
	"                  L.=..       fssssssssssss|", // y20 おどり場。外灯 (18,20)・タイムカプセル (22,20)・ホームベース (32,20)
	"                   |=|        ffffffBb||||||", // y21 わすれがさ (21,21)・バックネット (32,21)・日程表 (33,21)・ベンチ (36,21)
	"                   |=|                      ", // y22 street からの着地 (20,22)
	"                    :                       ", // y23 street への出口 (20,23)
];

// ── モブの歩行グラ ──
const LIBRARIAN = "pub:sprites/mob_ol.png";
const KID = "pub:sprites/mob_child.png";
const GRANDPA = "pub:sprites/mob_ojiichan.png";
const GRANDMA = "pub:sprites/mob_obaachan.png";
const SALARYMAN = "pub:sprites/mob_salaryman.png";
const JOGGER = "pub:sprites/mob_man.png";

/**
 * 環境音のワンショット（夕＝ヒグラシ／朝＝スズメ）。kawara と同じ方式：
 * 直前に鳴らした帯をモジュール変数で覚え、往復の連打を防ぐ（セーブしない）。
 */
let lastWave = "";
const wave = (id: string, pan: number) => async (s: Story) => {
	if (lastWave === id) return;
	lastWave = id;
	const t = s.flag("tod");
	if (t === "yu") s.se("higurashi", { pan, volume: 0.7 });
	else if (t === "asa") s.se("suzume", { pan, volume: 0.8 });
};
/** 見えない環境音の帯。 */
const waveBelt = (id: string, x: number, y: number, pan: number): EventDef => ({
	id,
	x,
	y,
	trigger: "touch",
	through: true,
	when: (st: GameState) => st.flags.tod === "yu" || st.flags.tod === "asa",
	run: wave(id, pan),
});

/** 公園の外灯（5本で共用。lights は yoru,shinya で点く）。 */
const gaitou = async (s: Story): Promise<void> => {
	const t = s.flag("tod");
	if (t === "shinya") {
		await s.narrate("外灯の　あかりに、\n羽虫が　まわっている。");
		return;
	}
	if (t === "yoru") {
		await s.narrate("公園の外灯。じじ、と\n鳴りながら　ついている。");
		return;
	}
	if (t === "asa") {
		await s.narrate("外灯。かさの上に、\nスズメが　とまっている。");
		return;
	}
	await s.narrate("公園の外灯。かさに、\nかれ葉が　ひっかかっている。");
};

/**
 * 深夜、展望台のベンチに すわる（nostalgia.md P0-7 と同じ形。seen_suwari_koen）。なにも起きない。
 * 目をとじる → 暗転して、目をあける → 下からの風 → 板のつめたさ（缶があれば缶の1行に替える）。
 * 暗いあいだは文を出さない。2回目からは選ばずに短い1行だけ。
 */
const suwaru = async (s: Story): Promise<void> => {
	if (s.flag("seen_suwari_koen")) {
		if (kanHeld(s)) await kanLine(s);
		else await s.narrate("ベンチに　すわって、\nすこし　町を　見た。");
		return;
	}
	const i = await s.choose(["＞＞1 すわる", "＞＞2 やめておく"], {
		cancel: 1,
	});
	if (i !== 0) return;
	s.set("seen_suwari_koen");
	await s.narrate("ベンチに　すわって、\n目を　とじた。");
	await s.fadeOut(900, "#04060f");
	await s.wait(900);
	await s.fadeIn(900);
	await s.narrate("丘の下から、かぜが\nゆっくり　あがってくる。");
	if (kanHeld(s)) await kanLine(s);
	else await s.narrate("ベンチの板が、\nしっとり　つめたい。");
	await s.say("kiriko", "……よし。おりるンゴ");
};

/** コイン双眼鏡（100円。のぞくと、時間帯ごとに町のちがう所が見える）。 */
const sougankyou = async (s: Story): Promise<void> => {
	const t = s.flag("tod");
	await s.narrate("コイン双眼鏡。\n『100円　2分』");
	const i = await s.choose(["＞＞1 100円いれる", "＞＞2 やめておく"], {
		cancel: 1,
	});
	if (i !== 0) {
		await s.say("kiriko", "（はだかの目で、\n見ておくンゴ）");
		return;
	}
	s.se("tick", { volume: 0.5 });
	await s.narrate("ちゃりん。……かちり、と\nシャッターが　ひらいた。");
	if (t === "shinya") {
		await s.narrate("まっくらな　町。");
		await s.narrate("コンビニの　あかりと、\n駅の　入口の　あかりだけ。");
		await s.say("kiriko", "……ほかは、\nねてるンゴ");
	} else if (t === "yoru") {
		await s.narrate("窓の灯りが、町じゅうに\nちらばっている。");
		await s.narrate("国道を、ライトが\nつながって　ながれていく。");
	} else if (t === "asa") {
		await s.narrate("もやの上に、町の　やねが\nうかんでいる。");
		await s.narrate("そのむこうで、海が\n白く　ひかっている。");
		await s.say("kiriko", "海、あったンゴ……");
	} else {
		await s.narrate("えきまえの　ロータリーに、\nバスが　入っていく。");
		await s.narrate("川の　鉄橋を、電車が\nわたっていく。");
		await s.say("kiriko", "うちの　アパートは……\nビルの　かげンゴ");
	}
	await s.wait(400);
	await s.narrate("――がちゃん。\nまっくらに　なった。");
};

export const koen: MapDef = {
	id: "koen",
	name: "みどりがおか公園",
	bgm: "@tod",
	outdoor: true,
	outside: "#0b0c09",
	tiles,
	rows,
	// ジオラマ表示の箱（場面ごと。重ならないように区切る）
	boxes: [
		{ x: 13, y: 0, w: 16, h: 6 }, // 展望台
		{ x: 29, y: 0, w: 10, h: 6 }, // 給水塔
		{ x: 0, y: 5, w: 12, h: 7 }, // 林の道
		{ x: 12, y: 6, w: 17, h: 8 }, // 池とスワン
		{ x: 29, y: 6, w: 10, h: 6 }, // 藤棚
		{ x: 0, y: 12, w: 12, h: 8 }, // 図書館
		{ x: 12, y: 14, w: 16, h: 5 }, // 広場
		{ x: 14, y: 19, w: 13, h: 5 }, // ながい石段
		{ x: 29, y: 12, w: 15, h: 5 }, // 野球場（外野）
		{ x: 28, y: 17, w: 16, h: 5 }, // 野球場（バックネット）
	],
	// 光源: 外灯5本・図書館の入口のあかり・給水塔のランプ・自販機（丘の上はくらいのが正しい）
	lights: [
		{ x: 16, y: 3, r: 3, color: "#ffdf9e", only: "yoru,shinya" },
		{ x: 12, y: 6, r: 3, color: "#ffdf9e", only: "yoru,shinya" },
		{ x: 34, y: 9, r: 3, color: "#ffdf9e", only: "yoru,shinya" },
		{ x: 16, y: 16, r: 3, color: "#ffdf9e", only: "yoru,shinya" },
		{ x: 18, y: 20, r: 3, color: "#ffdf9e", only: "yoru,shinya" },
		{ x: 5, y: 15, r: 2, only: "yu" }, // 図書館の窓（しめるまえ）
		{ x: 4, y: 16, r: 2, color: "#cfe4ff", only: "yoru,shinya" }, // 図書館の入口のあかり
		{ x: 31, y: 1, r: 1, color: "#ff7060", only: "yoru,shinya" }, // 給水塔のランプ
		{ x: 13, y: 16, r: 1.5, color: "#eef4ff", only: "yu,yoru,shinya" }, // 自販機
	],
	// 入るたびに環境音を一波（夕方＝ヒグラシ／朝＝スズメ）。深夜は缶が地区ひとつぶん冷める（P0-6）
	onEnter: async (s) => {
		lastWave = "";
		kanTick(s);
		const t = s.flag("tod");
		if (t === "yu") s.se("higurashi", { volume: 0.7 });
		else if (t === "asa") s.se("suzume", { volume: 0.8 });
	},
	events: [
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
				await s.narrate("丘の上は、空が　ひろい。");
				await s.narrate("どこかで、ボールが\nグローブに　おさまる音。");
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
				await s.narrate("草の　においが、\n夕方より　こい。");
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
				await s.narrate("風の音が、木の上を\nとおっていく。");
				await s.narrate("丘の上は、町より\nすこし　さむい。");
			},
		},
		{
			id: "arrive_asa",
			x: 3,
			y: 0,
			trigger: "auto",
			once: true,
			when: (st) => st.flags.tod === "asa",
			run: async (s) => {
				await s.wait(500);
				s.se("suzume", { pan: -0.3, volume: 0.8 });
				await s.wait(600);
				await s.narrate("池から、うすく\nもやが　たっている。");
			},
		},

		// ── 出入り口（地続き） ──
		warp("to_street", 20, 23, { map: "street", x: 4, y: 4, dir: "down" }),
		warp("to_yamamichi", 0, 8, {
			map: "yamamichi",
			x: 38,
			y: 1,
			dir: "down",
		}),

		// ── 環境音の帯（池の北の道・広場） ──
		waveBelt("wave_n", 16, 7, -0.3),
		waveBelt("wave_ne", 26, 7, 0.4),
		waveBelt("wave_plaza", 20, 17, 0),
		waveBelt("wave_lib", 6, 17, -0.6),

		// ── ながい石段（のぼり口。一度だけ） ──
		{
			id: "kaidan",
			x: 20,
			y: 19,
			trigger: "touch",
			through: true,
			when: (st) => !st.flags.seen_koen_kaidan,
			run: async (s) => {
				s.set("seen_koen_kaidan");
				await s.narrate("ながい　石段。だんの\nはしに、白い　数字。");
				await s.narrate("『38』。……まだ、\nおどり場だ。");
			},
		},
		{
			id: "wasuregasa",
			x: 21,
			y: 21,
			trigger: "talk",
			run: async (s) => {
				const t = s.flag("tod");
				if (t === "asa") {
					await s.narrate("いけがきの　かさは、\nもう　なかった。");
					await s.narrate("登校の　とちゅうで、\nもっていったらしい。");
					return;
				}
				if (t === "yoru") {
					await s.narrate(
						"いけがきの　ビニールがさが、\n夜風で　かさかさ　鳴る。",
					);
					return;
				}
				await s.narrate("いけがきに、ビニールがさが\nひっかけてある。");
				await s.narrate("えに　マジックで\n『3の2　さとう』。");
				if (t === "yu") {
					await s.say("kiriko", "（先週の　雨の日の\nわすれものンゴ）");
				}
			},
		},
		{
			id: "lamp_odoriba",
			x: 18,
			y: 20,
			trigger: "talk",
			run: gaitou,
		},
		{
			id: "timecapsule",
			x: 22,
			y: 20,
			sprite: JP.sekihi,
			trigger: "talk",
			fixedDir: true,
			run: async (s) => {
				const t = s.flag("tod");
				if (t === "shinya") {
					await s.narrate("おどり場の　石。\nくらくて、字は　よめない。");
					return;
				}
				await s.narrate(
					"『タイムカプセル　うめた日』\n『みどりがおか小　卒業生』",
				);
				await s.narrate("『ほりだす日　2030年の春』");
				if (t === "asa") {
					await s.narrate("石の上に、どんぐりが\nひとつ　のっている。");
					return;
				}
				await s.say("kiriko", "……あと、ちょっとンゴ");
			},
		},

		// ── 広場（石段の上） ──
		{
			id: "lamp_plaza",
			x: 16,
			y: 16,
			trigger: "talk",
			run: gaitou,
		},
		{
			id: "jihanki",
			x: 13,
			y: 16,
			trigger: "talk",
			run: async (s) => {
				const t = s.flag("tod");
				if (t === "shinya") {
					s.se("hum", { pan: -0.2, volume: 0.25 });
					await s.narrate("じはんきが、ひくく\nうなっている。");
					return;
				}
				if (t === "yoru") {
					await s.narrate("じはんきの　あかりに、\n羽虫が　あつまっている。");
					return;
				}
				if (t === "asa") {
					await s.narrate("じはんきの　とりだし口に、\n朝つゆが　ついている。");
					return;
				}
				await s.narrate("じはんき。スポーツドリンク\nだけ、『売り切』の赤。");
				await s.say("kiriko", "（野球の子たちンゴ）");
			},
		},
		{
			id: "mizunomiba",
			x: 26,
			y: 16,
			trigger: "talk",
			run: async (s) => {
				await s.narrate("水のみ場。じゃぐちを\nひねると……");
				await s.narrate("水が、おもったより\nたかく　とんだ。");
				if (s.flag("tod") === "shinya") return;
				await s.say("kiriko", "……まえがみが\nぬれたンゴ");
			},
		},

		// ── 図書館（平屋。開館時間・返却ポスト・掲示板・戸） ──
		{
			id: "kaikan_jikan",
			x: 3,
			y: 16,
			trigger: "talk",
			run: async (s) => {
				if (s.flag("tod") === "shinya") {
					await s.narrate("かべの　札は、\nくらくて　よめない。");
					return;
				}
				await s.narrate("『開館　9:00～17:00』\n『月曜・第3木曜　休館』");
				await s.narrate("下に　手書きで\n『10月から　木曜は19時まで』");
			},
		},
		{
			id: "tosho_door",
			x: 4,
			y: 16,
			trigger: "talk",
			run: async (s) => {
				const t = s.flag("tod");
				if (t === "shinya") {
					await s.narrate("ガラスの　おくに、\nみどりの　ひじょうとう。");
					return;
				}
				if (t === "yoru") {
					await s.narrate("入口の上の　あかりが、\nしずかに　ついている。");
					await s.narrate("ガラスに、羽虫が\nこつこつ　あたる。");
					return;
				}
				if (t === "asa") {
					await s.narrate("戸の　おくで、ブラインドの\nあがる音がした。");
					return;
				}
				if (s.flag("seen_koen_shisho")) {
					await s.narrate("戸には、もう\nかぎが　かかっている。");
					return;
				}
				await s.narrate("図書館の戸。\n『本日の　貸出は　おわりました』");
			},
		},
		{
			id: "henkyaku_post",
			x: 7,
			y: 17,
			sprite: JP.postSquare,
			trigger: "talk",
			fixedDir: true,
			run: async (s) => {
				const t = s.flag("tod");
				if (t === "asa") {
					await s.narrate("返却ポスト。うしろの\nとびらが、あいている。");
					await s.narrate("中から、本が\nぞろぞろ　出てくる。");
					return;
				}
				if (t === "shinya") {
					await s.narrate("返却ポスト。\n鉄の　ふたが、つめたい。");
					return;
				}
				if (t === "yoru") {
					await s.narrate("返却ポストの　ふたが、\n夜風で　かたん、と鳴った。");
					return;
				}
				await s.narrate("返却ポスト。\n『時間外は　こちらへ』");
				await s.narrate("『CD・紙しばいは\n入れないでください』");
				await s.say("kiriko", "（かえす本は、\nないンゴ）");
			},
		},
		{
			id: "tosho_board",
			x: 10,
			y: 16,
			trigger: "talk",
			run: async (s) => {
				if (s.flag("tod") === "shinya") {
					await s.narrate("図書館の　掲示板。\nくらくて、よめない。");
					return;
				}
				if (!s.flag("seen_koen_board")) {
					s.set("seen_koen_board");
					await s.narrate(
						"『おはなし会　土曜10時』\n『こんげつの本：くつした』",
					);
					await s.narrate("『さがしています　白い\nねこの　ぬいぐるみ』");
					return;
				}
				await s.narrate("『さがしています』の\n紙の　すみに、赤ペン。");
				await s.narrate("『みつかりました。\n　ありがとう』");
			},
		},

		// ── 林の道（西。やまみちへ） ──
		{
			id: "michishirube",
			x: 10,
			y: 9,
			sprite: JP.signpost,
			trigger: "talk",
			fixedDir: true,
			run: async (s) => {
				const t = s.flag("tod");
				if (t === "shinya") {
					await s.narrate("『← やまみち』。\n道の先は、木の　かげだ。");
					return;
				}
				await s.narrate("『← やまみち』\n『あかまつ峠まで　2.4km』");
				if (t === "asa") {
					await s.narrate("くいの　てっぺんに、\n朝つゆの　玉。");
					return;
				}
				await s.narrate("『イノシシに注意』の　シールが\nはがれかけている。");
			},
		},

		// ── 池（桟橋・スワン・料金板） ──
		{
			id: "ike",
			x: 14,
			y: 11,
			trigger: "talk",
			run: async (s) => {
				const t = s.flag("tod");
				if (t === "shinya") {
					await s.narrate("くろい　水面。\n風が　やむと、鏡みたいだ。");
					return;
				}
				if (t === "yoru") {
					await s.narrate("水面に、外灯の　あかりが\nほそく　ゆれている。");
					return;
				}
				if (t === "asa") {
					await s.narrate("もやの下を、コイが\nゆっくり　横ぎった。");
					return;
				}
				await s.narrate("コイが、口を　あけて\nよってくる。");
				await s.say("kiriko", "……なにも　もってない\nンゴ");
			},
		},
		{
			id: "ryoukin",
			x: 21,
			y: 12,
			sprite: JP.infoSign,
			trigger: "talk",
			fixedDir: true,
			run: async (s) => {
				const t = s.flag("tod");
				if (t === "shinya") {
					await s.narrate("ボートの　料金板。\n字は、くらくて　よめない。");
					return;
				}
				await s.narrate(
					"『スワンボート　30分500円』\n『コイのえさ（麩）　50円』",
				);
				await s.narrate("すみに　手書きで\n『2号は　ハンドルが重いです』");
				if (t === "yu") {
					await s.narrate("『本日の受付は\n終了しました』の　札。");
					return;
				}
				if (t === "asa") {
					await s.narrate("『受付　10時から』の\n札が　かかっている。");
				}
			},
		},
		{
			id: "swan_w",
			x: 19,
			y: 11,
			trigger: "talk",
			run: async (s) => {
				const t = s.flag("tod");
				if (t === "shinya") {
					await s.narrate("スワンの　白いくびが、\nくらい水に　うかんでいる。");
					return;
				}
				if (t === "yoru") {
					await s.narrate("スワンどうしが、ときどき\nこつん、と　ぶつかる音。");
					return;
				}
				if (t === "asa") {
					await s.narrate("スワンの　せなかに、\n朝つゆが　たまっている。");
					return;
				}
				await s.narrate("スワンボートが、ロープで\nならんで　つながれている。");
				await s.narrate("くびの　ペンキが、\nすこし　はげている。");
			},
		},
		// 深夜の脇道（一つだけ）。ロープが一本たれていて、池のまんなかに白いもの。
		// 風でほどけた、で通る（説明しない・ノートは呼ばない）。朝は全部つながれている
		{
			id: "swan_e",
			x: 21,
			y: 11,
			trigger: "talk",
			run: async (s) => {
				const t = s.flag("tod");
				if (t === "shinya") {
					if (s.flag("seen_koen_swan")) {
						await s.narrate(
							"池の　まんなかの　白いものは、\nさっきと　おなじ所にある。",
						);
						return;
					}
					s.set("seen_koen_swan");
					await s.narrate("ロープが　一本だけ、\n水に　たれている。");
					await s.wait(600);
					await s.narrate("池の　まんなかに、\n白いものが　ひとつ。");
					await s.say("kiriko", "……風で、ほどけた\nンゴ");
					return;
				}
				if (t === "asa") {
					await s.narrate("スワンは、ぜんぶ\nならんで　つながれている。");
					if (s.flag("seen_koen_swan")) {
						await s.narrate("むすび目が　ひとつだけ、\nあたらしい。");
					}
					return;
				}
				if (t === "yoru") {
					await s.narrate("桟橋の下で、水が\nちゃぷ、と鳴った。");
					return;
				}
				await s.narrate("『2号』と　かいてある\nスワン。");
				await s.say("kiriko", "（ハンドルが\n重いほうンゴ）");
			},
		},

		// ── 藤棚（東。ふうふのベンチ・外灯） ──
		{
			id: "fujidana",
			x: 30,
			y: 8,
			trigger: "talk",
			run: async (s) => {
				const t = s.flag("tod");
				if (t === "shinya") {
					await s.narrate("藤の　さやが、風で\nからから　鳴る。");
					return;
				}
				if (t === "yoru") {
					await s.narrate("藤棚の下で、\nこおろぎが　鳴いている。");
					return;
				}
				if (t === "asa") {
					await s.narrate("藤の葉から、つゆが\nぽたっと　おちた。");
					return;
				}
				await s.narrate(
					"藤棚。花は　もう　おわって、\nながい　さやが　さがっている。",
				);
			},
		},
		// 夕方はふうふがすわっている（fuufu_jii・fuufu_baa）ので、ほかの時間帯だけ
		{
			id: "fuji_bench",
			x: 32,
			y: 9,
			trigger: "talk",
			when: (st) => st.flags.tod !== "yu",
			run: async (s) => {
				const t = s.flag("tod");
				if (t === "asa") {
					await s.narrate("藤棚の　ベンチ。\nすわると、つゆで　ぬれそうだ。");
					return;
				}
				await s.narrate("藤棚の　ベンチ。\n板に、藤の　さやが　ひとつ。");
			},
		},
		{
			id: "lamp_fuji",
			x: 34,
			y: 9,
			trigger: "talk",
			run: gaitou,
		},
		{
			id: "lamp_ike",
			x: 12,
			y: 6,
			trigger: "talk",
			run: gaitou,
		},

		// ── 展望台（手すり・方位盤・双眼鏡・ベンチ）と給水塔 ──
		{
			id: "lamp_tenbou",
			x: 16,
			y: 3,
			trigger: "talk",
			run: gaitou,
		},
		{
			id: "hoiban",
			x: 18,
			y: 1,
			sprite: JP.infoSign,
			trigger: "talk",
			fixedDir: true,
			run: async (s) => {
				if (s.flag("tod") === "shinya") {
					await s.narrate("方位盤。やじるしだけ、\nぼんやり　白い。");
					return;
				}
				await s.narrate("方位盤。『うみ』『やま』\n『えき』の　やじるし。");
				await s.narrate("『えき』の字だけ、\nさわられて　ぴかぴかだ。");
			},
		},
		{
			id: "sougankyou",
			x: 21,
			y: 1,
			sprite: JP.airTower,
			trigger: "talk",
			fixedDir: true,
			run: sougankyou,
		},
		{
			id: "tesuri",
			x: 25,
			y: 1,
			trigger: "talk",
			run: async (s) => {
				const t = s.flag("tod");
				if (t === "shinya") {
					await s.narrate("町の　街灯が、\nてんてんと　つづいている。");
					await s.narrate("そのむこうは、山か　空か\nわからない。");
					return;
				}
				if (t === "yoru") {
					await s.narrate("町の　灯りが、\n丘の下に　しずかに　ならぶ。");
					return;
				}
				if (t === "asa") {
					await s.narrate("もやの上に、山の\nかたちだけ　うかんでいる。");
					return;
				}
				await s.narrate("手すりの　むこうに、町。\n川と、鉄橋と、海のはし。");
				await s.narrate("山の　せが、くっきり\n黒い。");
			},
		},
		// 深夜だけ、ここに すわれる
		{
			id: "tenbou_bench",
			x: 24,
			y: 3,
			trigger: "talk",
			run: async (s) => {
				const t = s.flag("tod");
				if (t === "shinya") {
					await suwaru(s);
					return;
				}
				if (t === "yoru") {
					await s.narrate(
						"展望台の　ベンチ。\n夜つゆで、すこし　しめっている。",
					);
					return;
				}
				if (t === "asa") {
					await s.narrate("ベンチの　つゆを、\nそでで　ふいた。");
					return;
				}
				await s.narrate("展望台の　ベンチ。\n板が、まだ　あたたかい。");
			},
		},
		{
			id: "kyusuito",
			x: 31,
			y: 3,
			trigger: "talk",
			run: async (s) => {
				const t = s.flag("tod");
				if (t === "shinya") {
					await s.narrate(
						"給水塔の　てっぺんで、\n赤い　ランプが　点滅している。",
					);
					return;
				}
				if (t === "yoru") {
					await s.narrate("給水塔の　てっぺんに、\n赤い　ランプが　ついた。");
					return;
				}
				if (t === "asa") {
					await s.narrate("給水塔の　あたまが、\nもやから　出ている。");
					return;
				}
				await s.narrate("給水塔。フェンスに\n『関係者以外　立入禁止』。");
				await s.narrate("根もとに、チョークで\nねこの　らくがき。");
			},
		},

		// ── 野球場（バックネット・日程表・ホームベース・いけがきのボール） ──
		{
			id: "backnet",
			x: 32,
			y: 21,
			trigger: "talk",
			run: async (s) => {
				const t = s.flag("tod");
				if (t === "shinya") {
					await s.narrate("バックネットの　あみが、\n風で　ひゅう、と鳴る。");
					return;
				}
				await s.narrate(
					"バックネット。あみに、\nボールの　あとが　ならんでいる。",
				);
			},
		},
		{
			id: "nittei",
			x: 33,
			y: 21,
			trigger: "talk",
			run: async (s) => {
				if (s.flag("tod") === "shinya") {
					await s.narrate("ネットに　はられた紙。\nくらくて、よめない。");
					return;
				}
				await s.narrate("『みどりがおかジュニア\n　れんしゅう　土日9時～』");
				await s.narrate("『10月5日　練習試合\n　vs かわしもクラブ』");
				await s.narrate("お茶当番の　らんに、\n『ゆうた母』。");
			},
		},
		{
			id: "home_base",
			x: 32,
			y: 20,
			trigger: "talk",
			run: async (s) => {
				const t = s.flag("tod");
				if (t === "shinya") {
					await s.narrate("ホームベース。白線だけが、\nぼんやり　見える。");
					return;
				}
				if (t === "yoru") {
					await s.narrate("ホームベースの　まわりで、\n虫が　鳴いている。");
					return;
				}
				if (t === "asa") {
					await s.narrate("土に、トンボの　あとが\nきれいに　ついている。");
					return;
				}
				await s.narrate("ホームベース。\nふちが、土に　うまっている。");
			},
		},
		{
			id: "ball_ikegaki",
			x: 43,
			y: 15,
			trigger: "talk",
			run: async (s) => {
				const t = s.flag("tod");
				if (
					s.flag("seen_koen_ball_bench") ||
					(t === "asa" && s.flag("seen_koen_kid_asa"))
				) {
					await s.narrate("いけがきの　えだが、\nすこし　おれている。");
					return;
				}
				if (t === "asa") {
					await s.narrate("いけがきの　おくに、\nボールが　ひとつ。");
					return;
				}
				await s.narrate("いけがきの　おくに、\nなんしきボールが　ひとつ。");
				await s.narrate("マジックで『ゆうた』。");
				const i = await s.choose(
					["＞＞1 ベンチにのせる", "＞＞2 そのままにする"],
					{ cancel: 1 },
				);
				if (i !== 0) return;
				s.set("seen_koen_ball_bench");
				await s.narrate("ボールを、ベンチの\n上に　のせておいた。");
			},
		},
		{
			id: "dugout_bench",
			x: 36,
			y: 21,
			trigger: "talk",
			run: async (s) => {
				if (s.flag("seen_koen_ball_bench") && s.flag("tod") !== "asa") {
					await s.narrate("ベンチの上に、\nボールが　ひとつ。");
					return;
				}
				await s.narrate("野球場の　ベンチ。\nスパイクの　土が　おちている。");
			},
		},

		// ── 夕方の人たち（くだらない雑談だけ。説明しない） ──
		// 図書館の人（3層: 初回／二層目=かぎの話／待機）
		npc(
			"shisho",
			4,
			17,
			LIBRARIAN,
			async (s) => {
				if (!s.flag("seen_koen_shisho")) {
					s.set("seen_koen_shisho");
					await s.say(
						null,
						"あ、ごめんなさいね。\nきょうは　もう　しめちゃうの",
						{
							name: "図書館の人",
						},
					);
					await s.say("kiriko", "（かぎの　たばが、\nおもそうンゴ）");
					await s.say(null, "かえす本なら、\nそこの　ポストに　どうぞ", {
						name: "図書館の人",
					});
					return;
				}
				if (!s.flag("seen_koen_shisho2")) {
					s.set("seen_koen_shisho2");
					await s.narrate("かぎを、ひとつずつ\nあなに　あてている。");
					await s.say(null, "……ちがう。……これも\nちがう", {
						name: "図書館の人",
					});
					await s.say("kiriko", "ぜんぶ、おなじ\nかたちンゴ");
					await s.say(
						null,
						"ここに　来て　三年。\n一回で　あたったこと、ないの",
						{
							name: "図書館の人",
						},
					);
					return;
				}
				await s.narrate("かぎの　たばが、\nじゃらじゃら　鳴っている。");
			},
			{ dir: "up", when: (st) => st.flags.tod === "yu" },
		),
		// キャッチボールの子（相手は先に帰った。のこりの一球）
		npc(
			"catch_kid",
			33,
			18,
			KID,
			async (s) => {
				if (!s.flag("seen_koen_kid")) {
					s.set("seen_koen_kid");
					await s.say(null, "たけし、先に　かえった。\nチャイム　なったから", {
						name: "野球の子",
					});
					await s.say(null, "……おれも、あと　一球", {
						name: "野球の子",
					});
					await s.say("kiriko", "（その一球が、\nながいンゴ）");
					return;
				}
				await s.say(
					null,
					"ボール、いっこ　いけがきに\n入っちゃった。……あした",
					{
						name: "野球の子",
					},
				);
			},
			{ dir: "down", when: (st) => st.flags.tod === "yu" },
		),
		// 藤棚のベンチのふうふ（ベンチの上にすわっている）
		npc(
			"fuufu_jii",
			31,
			9,
			GRANDPA,
			async (s) => {
				s.set("seen_koen_fuufu");
				if (!s.flag("seen_koen_jii")) {
					s.set("seen_koen_jii");
					await s.say(null, "藤の　花どきに、\nまた　来ようかね", {
						name: "ベンチのじいさん",
					});
					await s.say(null, "あんた、それ　毎年\nいうわね", {
						name: "ベンチのばあさん",
					});
					return;
				}
				await s.say(null, "……ちょっと、ひえてきたな", {
					name: "ベンチのじいさん",
				});
			},
			{ dir: "down", when: (st) => st.flags.tod === "yu" },
		),
		npc(
			"fuufu_baa",
			32,
			9,
			GRANDMA,
			async (s) => {
				s.set("seen_koen_fuufu");
				if (!s.flag("seen_koen_baa")) {
					s.set("seen_koen_baa");
					await s.say(null, "藤の　まめ、あれ\nたべられないのよ", {
						name: "ベンチのばあさん",
					});
					await s.say("kiriko", "（きいてないンゴ……）");
					await s.say(null, "この人が　むかし\nたべたの", {
						name: "ベンチのばあさん",
					});
					return;
				}
				await s.say(null, "あしたの　ラジオ体操、\nこの人　おきられるかしら", {
					name: "ベンチのばあさん",
				});
			},
			{ dir: "down", when: (st) => st.flags.tod === "yu" },
		),
		// コイに麩をやる会社帰りの人
		npc(
			"koi_man",
			16,
			12,
			SALARYMAN,
			async (s) => {
				if (!s.flag("seen_koen_koi")) {
					s.set("seen_koen_koi");
					await s.narrate("麩を　ちぎって、\n池に　なげている。");
					await s.say(null, "五十円で、これだけ\nよってくるんだよ", {
						name: "会社帰りの人",
					});
					await s.say("kiriko", "（口が、ぱくぱく\nしてるンゴ）");
					return;
				}
				await s.say(null, "かいしゃ　かえりに、\nここで　ひと休み", {
					name: "会社帰りの人",
				});
			},
			{ dir: "up", when: (st) => st.flags.tod === "yu" },
		),
		// 石段ダッシュのジョギングの人（周回）
		npc(
			"jogger_yu",
			24,
			7,
			JOGGER,
			async (s) => {
				if (!s.flag("seen_koen_jogger")) {
					s.set("seen_koen_jogger");
					await s.say(null, "……石段ダッシュ、\nあと　三本", {
						name: "ジョギングの人",
					});
					return;
				}
				await s.narrate("はっ、はっ、と\nいきの音が　とおりすぎた。");
			},
			{ wander: true, when: (st) => st.flags.tod === "yu" },
		),

		// ── 朝の人たち（夕方の setup の payoff） ──
		npc(
			"shisho_asa",
			6,
			17,
			LIBRARIAN,
			async (s) => {
				if (!s.flag("seen_koen_shisho_asa")) {
					s.set("seen_koen_shisho_asa");
					await s.say(null, "あら、おはよう。\n返却ポスト、あけるところ", {
						name: "図書館の人",
					});
					if (s.flag("seen_koen_shisho2")) {
						await s.say(null, "きのうは　かぎ、\n四本目で　あたったの", {
							name: "図書館の人",
						});
						await s.say(null, "けさは、一本目", { name: "図書館の人" });
						await s.say("kiriko", "（しんきろくンゴ）");
					}
					return;
				}
				await s.narrate("本を、かかえるだけ\nかかえている。");
			},
			{ dir: "right", when: (st) => st.flags.tod === "asa" },
		),
		npc(
			"taiso_jii",
			35,
			15,
			GRANDPA,
			async (s) => {
				if (!s.flag("seen_koen_taiso")) {
					s.set("seen_koen_taiso");
					await s.narrate("外野で、何人かが\nラジオ体操を　している。");
					if (s.flag("seen_koen_fuufu")) {
						await s.say(null, "おや、ゆうべの。\nばあさんは　ねぼうだ", {
							name: "体操のじいさん",
						});
						await s.say("kiriko", "（おきられたの、\nこっちンゴ）");
						return;
					}
					await s.say(null, "いっしょに　どうだい。\nうでを　まえから……", {
						name: "体操のじいさん",
					});
					return;
				}
				await s.narrate("せのびの　運動を\nしている。");
			},
			{ dir: "down", when: (st) => st.flags.tod === "asa" },
		),
		npc(
			"jogger_asa",
			22,
			7,
			JOGGER,
			async (s) => {
				if (!s.flag("seen_koen_jogger_asa")) {
					s.set("seen_koen_jogger_asa");
					if (s.flag("seen_koen_jogger")) {
						await s.say(null, "ゆうべの。……けさは\n五本　いけそう", {
							name: "ジョギングの人",
						});
						return;
					}
					await s.narrate("はしりながら、かるく\n会釈をされた。");
					return;
				}
				await s.narrate("きょうも、石段の\nほうへ　はしっていく。");
			},
			{ wander: true, when: (st) => st.flags.tod === "asa" },
		),
		npc(
			"ball_kid",
			42,
			16,
			KID,
			async (s) => {
				if (!s.flag("seen_koen_kid_asa")) {
					s.set("seen_koen_kid_asa");
					if (s.flag("seen_koen_ball_bench")) {
						await s.say(null, "ボール、ベンチに\nのってた！……だれだろ", {
							name: "野球の子",
						});
						await s.say("kiriko", "（しらないンゴ）");
						return;
					}
					await s.say(null, "あった！　……朝つゆで\nびしょびしょ", {
						name: "野球の子",
					});
					return;
				}
				await s.say(null, "学校の前に、\nいっこ　とりに　きたんだ", {
					name: "野球の子",
				});
			},
			{ dir: "up", when: (st) => st.flags.tod === "asa" },
		),
	],
};
