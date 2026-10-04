// こくどう（国道ぞいの歩道）。docs/content-briefs.md「日常の町 拡張」・docs/style-everyday.md。
// 40×14・outdoor・BGM null（トラックの風とヒグラシが音楽のかわり）。
// 二車線の国道（わたれない）・南の歩道・歩道橋・つぶれたファミレス・営業中のガソリンスタンド。
// 「死んだ店（ファミレス）と生きた店（スタンド）が同じ道に並ぶ」対比が主役。
//
// 時間帯の顔（flags.tod）:
//   夕方 … トラックの風・バス待ちの人・部活帰り・スタンド営業中（店員の3層会話・洗車機の場面）
//   宵   … NPC 0体（docs/nostalgia.md P0-1）。トラックはライトをつけて通る・街灯がつく。
//           スタンドは営業をおえて、事務所のあかりとラジオのナイター中継だけ（P0-2。延長がつづく）
//   深夜 … NPC 0体必達。スタンドも消灯。ときどき トラックが とおる。
//           灯っている自販機 (31,11) で、あたたかい缶が一本買える（P0-6。缶は nostalgia.ts が持つ）
//   朝   … 始発前後のバス停・水をまく店員（夕の「空気はタダ」の payoff）
//
// このマップの中の段と回収（2026-10-04）:
//   ストレッチの人（yu・seen_stretch_kokudo／2回目 seen_stretch_kokudo2）→ 朝のバス停の人（bus_asa）
//   バス待ちの人のあめ玉（yu・seen_bus_obachan）→ 深夜の時こく表のつつみ紙（seen_tsutsumi_kokudo）→ 朝はかれている
//   店員の2層目（yu・seen_gasman2「バス停のじはんき」）→ 朝の事務所の缶コーヒー・ファミレスの『おかわり自由』の札
//   洗車機のテスト運転（yu・seen_sensha_scene）→ 朝の店員の2回目
//   部活帰りの子（yu・seen_bukatsu_kokudo）→ ファミレスのポテトの写真／got_korokke（suupaa）を子が見る
//   花たば（yu・yoru・shinya で seen_hanataba）→ 朝「あたらしいのに　かわっている」
//
// 座標凍結v3: 東 (39,10)→street(1,11)・street からの着地 (38,10)／
// 西 (0,10)→ekimae(30,9)・ekimae からの着地 (1,10)／
// 南 (20,11)→danchi(16,1)・danchi からの着地 (20,10)。
//
// 歩道橋: 南階段 (24,9)→デッキ(25,2)／デッキ西端 (24,2)→歩道(24,10)／
// デッキ東端 (28,2)→北側(28,7)／北階段 (28,6)→デッキ(27,2)。
// 北側（ファミレス前）へは歩道橋でしか渡れない＝橋に用事を作る。
//
// 寄り道: 歩道橋→ファミレス前（北）／ガソリンスタンド（南西）／
// 隠し: 東のしげみ (37,11) が見た目のまま通れる→ねこのたまり場。
// ガードレールの花 (13,9) は説明しない（へこみ (12,9) のとなり。それだけ）。

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
	kanLv,
	kanShinya,
	kanTick,
	numFlag,
	shinyaClock,
	yoruAkubi,
	yoruClock,
} from "../nostalgia";
import { DOOR, JP, TOWN, WALL, WIN } from "../tiles";

// ── タイル ──
//   r  車道（わたれない）  -  車道（センターライン）  =  歩道橋の階段
//   t  ファミレスの窓（レンガ下段）  j  しまった戸  b  草むら
//   q  草むら（見た目は b と同じ・通れる＝無印の隠し）
//   c  スタンド事務所の窓（白壁下段）  o  事務所の戸  M m  洗車機（上・下）
const ASPHALT = JP.road;
const WIN_LOW_BRICK = WIN.sash;
const WIN_LOW_WHITE = WIN.sash;
const tiles: Record<string, TileDef> = {
	...TOWN,
	r: { layers: [ASPHALT], color: "#55565e", passable: false },
	"-": { layers: [JP.roadCenter], color: "#55565e", passable: false },
	"=": { layers: [JP.stoneSteps], color: "#8a8a8a", passable: true },
	t: {
		layers: [WALL.tileLo, WIN_LOW_BRICK],
		color: "#a04a3a",
		passable: false,
	},
	j: {
		layers: [WALL.boardLo, DOOR.sliding],
		color: "#6a4a2a",
		passable: false,
	},
	// ファミレスの通用口（かぎが かかっている。通れない。(18,6) から調べる）
	J: {
		layers: [WALL.tileLo, DOOR.sliding],
		color: "#8a7a3a",
		passable: false,
	},
	b: {
		layers: [JP.ground, JP.susuki],
		color: "#5f8e2a",
		passable: false,
	},
	q: {
		layers: [JP.ground, JP.susuki],
		color: "#5f8e2a",
		passable: true,
	},
	c: {
		layers: [WALL.sidingLo, WIN_LOW_WHITE],
		color: "#e8e8e8",
		passable: false,
	},
	o: {
		layers: [WALL.sidingLo, DOOR.house],
		color: "#e8e8e8",
		passable: false,
	},
	M: { layers: [JP.carWashTop], color: "#7a8a94", passable: false },
	m: { layers: [JP.carWashBottom], color: "#7a8a94", passable: false },
};

// 北＝ファミレス（歩道橋でしか来られない）。南＝歩道・バスだまり・スタンド（y11-13）。
const rows = [
	"                                        ", // y0
	"                        fffff           ", // y1  歩道橋のらんかん（北）
	"                        .....           ", // y2  歩道橋のデッキ (24-28,2)
	"        nnnnnnnnnnn     fffff           ", // y3  ファミレスの屋根・らんかん（南）
	"        ^^^^^^^^^^^                     ", // y4
	"        #t#t#j#t#tJ                     ", // y5  われた窓 (9,5)・営業時間 (10,5)・入口 (13,5)・通用口 (18,5)
	"      ......................=..         ", // y6  ファミレス前・北階段 (28,6)・死んだ自販機 (30,6)
	"      .........................         ", // y7
	"----------------------------------------", // y8  国道（センターライン）
	"rrrrrrrrrrrrrrrrrrrrrrrr=rrrrrrrrrrrrrrr", // y9  南階段 (24,9)・へこみ (12,9)・花たば (13,9)
	"........................................", // y10 歩道。西 (0,10)→ekimae・東 (39,10)→street
	"bAAAA......MM.bbLbbb:.......!..V..!.Lqbb", // y11 スタンド屋根・洗車機・街灯・danchi (20,11)・バスだまり・隠し (37,11)
	"b)c)o......mm.bbbbbb:bbbbbbbbbbbbbbb,,,b", // y12 事務所の窓 (2,12)・戸 (4,12)・給油機・ねこのたまり場 (36-38,12)
	"b.............      :               bbb ", // y13 スタンドの前庭
];

// ── モブの歩行グラ ──
const OBACHAN = "pub:sprites/mob_obaachan.png";
const STUDENT = "pub:sprites/mob_student.png";
const MAN = "pub:sprites/mob_salaryman.png";
const GASMAN = "pub:sprites/mob_worker.png";

/**
 * 環境音のワンショット（夕＝ヒグラシ／朝＝スズメ／夕のトラック）。street と同じ方式：
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
/** 夕方と宵に、トラックの走行音が遠くを通る帯（国道の環境音。深夜は必ず無音）。 */
let lastTruck = "";
const truck = (id: string, pan: number) => async (s: Story) => {
	if (lastTruck === id) return;
	lastTruck = id;
	const t = s.flag("tod");
	if (t === "yu" || t === "yoru") s.se("train", { pan, volume: 0.35 });
};
/** 見えない環境音の帯（歩道 y10 の1マス）。宵はトラックだけが鳴る（ヒグラシ・スズメは鳴らない）。 */
const belt = (
	id: string,
	x: number,
	run: (s: Story) => Promise<void>,
): EventDef => ({
	id,
	x,
	y: 10,
	trigger: "touch",
	through: true,
	when: (st: GameState) =>
		st.flags.tod === "yu" || st.flags.tod === "yoru" || st.flags.tod === "asa",
	run,
});

/**
 * 歩道橋の階段（同じマップの中のワープ）の着地点。ワープのたびに onEnter が走るので、
 * ここに降りたときは「地区を移った」に数えない（深夜の缶が、橋の昇り降りだけで冷めないように）。
 */
const HODO_LANDING = ["25,2", "24,10", "27,2", "28,7"];

/** 歩道橋の上からの国道（tod で顔が変わる）。 */
const hodokyoView = async (s: Story): Promise<void> => {
	const t = s.flag("tod");
	if (t === "shinya") {
		await s.narrate("歩道橋の上。国道は、\nどこまでも　からっぽだ。");
		await s.wait(800);
		s.se("train", { pan: 0.5, volume: 0.3 });
		await s.narrate(
			"……とおくから、トラックが\n一台、走ってきて　とおりすぎた。",
		);
		return;
	}
	if (t === "asa") {
		// 朝は 車が ふえる（深夜の「からっぽ」と arrive_asa の「もう　ならんでいる」の つづき）
		s.se("train", { pan: 0.4, volume: 0.35 });
		await s.narrate("歩道橋の上。車が、とぎれずに\nながれていく。");
		return;
	}
	s.se("train", { pan: -0.4, volume: 0.4 });
	await s.narrate("歩道橋の上。トラックが、\n下を　とおりぬけていく。");
	if (t === "yoru") {
		// 宵は西日のかわりに、ついた街灯の列（P0-1）
		await s.narrate("街灯のオレンジが、国道の\nずっと先まで　つづいている。");
		return;
	}
	await s.narrate("国道は、西日のほうへ\nまっすぐ　のびている。");
};

// ── スタンドの店員（街道のガイド役。3層: 初回／二層目の雑談／待機） ──

const gasman = async (s: Story): Promise<void> => {
	if (!s.flag("seen_gasman")) {
		s.set("seen_gasman");
		await s.say(null, "いらっしゃい！\n……あれ、お車は？", {
			name: "スタンドの店員",
		});
		await s.say("kiriko", "徒歩ンゴ");
		await s.say(null, "徒歩かあ。徒歩に入れる\n油は、ないなあ", {
			name: "スタンドの店員",
		});
		await s.say("kiriko", "吾輩、油ぎれでは\nないンゴ");
		await s.say(null, "じゃあ空気だ。\n空気なら　タダだよ", {
			name: "スタンドの店員",
		});
		return;
	}
	if (!s.flag("seen_gasman2")) {
		s.set("seen_gasman2");
		await s.say(null, "むかいのファミレスさ、\nむかしは夜中までやってて", {
			name: "スタンドの店員",
		});
		await s.say(null, "夜勤あけに、コーヒーだけ\nのみに行ったもんだよ", {
			name: "スタンドの店員",
		});
		await s.say("kiriko", "……いまは、ンゴ？");
		// 「バス停の　じはんき」は (31,11)。朝の gasmanAsa の缶コーヒー・famiresu_win2 の札で回収
		await s.say(null, "いまは　バス停の\nじはんきが　ある。……はは", {
			name: "スタンドの店員",
		});
		return;
	}
	await s.say(null, "洗車、いまなら\n待ちゼロだよ", { name: "スタンドの店員" });
};

/**
 * 朝の店員（水まき中）。段は seen_gasman_asa の数（numFlag）。
 * 1回目＝夕方に話していれば「徒歩のお客さん」の payoff／2回目＝夕方の洗車機のテスト運転を見た人だけ／3回目から水まき。
 */
const gasmanAsa = async (s: Story): Promise<void> => {
	const n = numFlag(s, "seen_gasman_asa");
	s.set("seen_gasman_asa", n + 1);
	if (n === 0) {
		await s.narrate("ホースで、地面を\nあらっている。");
		if (s.flag("seen_gasman")) {
			await s.say(null, "お、きのうの徒歩の\nお客さん", {
				name: "スタンドの店員",
			});
			await s.say("kiriko", "きゃくでは、ないンゴ……");
			await s.say(null, "空気を入れに来たら\n客だよ", {
				name: "スタンドの店員",
			});
		} else {
			await s.say(null, "おはよう。開店は\nもうちょっと先だよ", {
				name: "スタンドの店員",
			});
		}
		// 夕方の2層目（「いまは　バス停の　じはんきが　ある」）を聞いた人だけ
		if (s.flag("seen_gasman2"))
			await s.narrate("事務所の　まどべに、\nじはんきの　缶コーヒー。");
		return;
	}
	// 夕方の洗車機のテスト運転（sensha_scene）を見た人だけ、2回目に
	if (n === 1 && s.flag("seen_sensha_scene")) {
		await s.say(null, "きのう、ぬれなかった？\nあれ、テストでさ", {
			name: "スタンドの店員",
		});
		await s.say("kiriko", "あびる前に、\nにげたンゴ");
		return;
	}
	await s.say(null, "朝に水をまくとね、\n一日、ほこりが立たない", {
		name: "スタンドの店員",
	});
};

export const kokudo: MapDef = {
	id: "kokudo",
	// ジオラマ表示の箱。場面ごとに区切る（engine/diorama.ts の boxFor）
	boxes: [
		{ x: 4, y: 3, w: 16, h: 5 }, // ファミレス
		{ x: 20, y: 1, w: 14, h: 7 }, // 歩道橋
		{ x: 0, y: 8, w: 14, h: 6 }, // スタンド
		{ x: 14, y: 8, w: 13, h: 6 }, // バスだまり
		{ x: 27, y: 8, w: 13, h: 6 }, // 南の歩道の東
	],
	name: "こくどう",
	bgm: "@tod", // 時間帯の曲（生活音の下にごく薄く。data/index.ts の todBgm）
	// 深夜は国道の曲（amb_zure「ずれる地層」）
	todBgm: { shinya: "amb_zure" },
	outdoor: true,
	outside: "#0a0a0c",
	tiles,
	rows,
	// ナトリウム灯の色（#ffdf9e）が国道の夜。ファミレスは灯りを持たない（死んだ店の記号）。
	// スタンドの灯りは夕〜夜だけ＝深夜はしまっている（生きた店にも閉まる時間がある）。
	lights: [
		{ x: 16, y: 11, r: 3, color: "#ffdf9e", only: "yoru,shinya" }, // 街灯（中）
		{ x: 36, y: 11, r: 3, color: "#ffdf9e", only: "yoru,shinya" }, // 街灯（東）
		{ x: 16, y: 6, r: 2, color: "#cfe4ff", only: "yoru,shinya" }, // 電光掲示板
		{ x: 31, y: 11, r: 1.5, color: "#eef4ff", only: "yoru,shinya" }, // じはんき
		{ x: 2, y: 12, r: 2, only: "yu,yoru" }, // スタンド事務所の窓
		{ x: 8, y: 12, r: 4, color: "#cfe4ff", only: "yu,yoru" }, // スタンドの前庭（蛍光灯）
	],
	onEnter: async (s) => {
		lastWave = "";
		lastTruck = "";
		// 深夜の缶は、地区を移るたびに冷める（P0-6。歩道橋の昇り降りは数えない）
		if (!HODO_LANDING.includes(`${s.state.x},${s.state.y}`)) kanTick(s);
		const t = s.flag("tod");
		if (t === "yu") s.se("higurashi", { volume: 0.7 });
		else if (t === "asa") s.se("suzume", { volume: 0.7 });
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
				s.se("train", { pan: -0.5, volume: 0.4 });
				await s.wait(600);
				await s.narrate("大きなトラックが、風を\nつれて　とおりすぎた。");
			},
		},
		// 宵（P0-1）。夕方とおなじトラックが、こんどはライトをつけて通る
		{
			id: "arrive_yoru",
			x: 3,
			y: 0,
			trigger: "auto",
			once: true,
			when: (st) => st.flags.tod === "yoru",
			run: async (s) => {
				await s.wait(500);
				s.se("train", { pan: -0.5, volume: 0.5 });
				await s.wait(600);
				await s.narrate("トラックが、ライトを\nつけて　とおりすぎる。");
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
				await s.narrate("国道に、車が一台も\nいない。");
				await s.narrate("街灯の音だけが、\nじー、と　している。");
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
				s.se("suzume", { pan: 0.2, volume: 0.7 });
				await s.wait(500);
				// 深夜に ここを 歩いた人だけ（arrive_shinya「車が一台も　いない」の 回収）
				if (arrived(s, "kokudo", "shinya")) {
					await s.narrate(
						"ゆうべの　しずかな　国道に、\n車が　もう　ならんでいる。",
					);
					return;
				}
				await s.narrate("アスファルトが、朝つゆで\nすこし　しめっている。");
			},
		},

		// ── 出入り口（座標凍結v3） ──
		warp("to_ekimae", 0, 10, { map: "ekimae", x: 30, y: 9, dir: "left" }),
		warp("to_street", 39, 10, { map: "street", x: 1, y: 11, dir: "right" }),
		warp("to_danchi", 20, 11, { map: "danchi", x: 16, y: 1, dir: "down" }),

		// ── 環境音の帯（夕＝ヒグラシ＋トラック／朝＝スズメ。深夜は無音のまま） ──
		belt("wave_w", 4, wave("wave_w", -0.4)),
		belt("wave_e", 33, wave("wave_e", 0.4)),
		belt("truck_a", 13, truck("truck_a", -0.3)),
		belt("truck_b", 25, truck("truck_b", 0.4)),

		// ── 歩道橋（階段はワープで昇り降り） ──
		warp(
			"hodo_up_s",
			24,
			9,
			{ map: "kokudo", x: 25, y: 2, dir: "right" },
			{ se: "stairs" },
		),
		warp(
			"hodo_dn_w",
			24,
			2,
			{ map: "kokudo", x: 24, y: 10, dir: "down" },
			{ se: "stairs" },
		),
		warp(
			"hodo_up_n",
			28,
			6,
			{ map: "kokudo", x: 27, y: 2, dir: "left" },
			{ se: "stairs" },
		),
		warp(
			"hodo_dn_e",
			28,
			2,
			{ map: "kokudo", x: 28, y: 7, dir: "down" },
			{ se: "stairs" },
		),
		{
			id: "hodokyo_view",
			x: 26,
			y: 1,
			trigger: "talk",
			run: hodokyoView,
		},
		{
			id: "hodokyo_rakugaki",
			x: 26,
			y: 3,
			trigger: "talk",
			run: async (s) => {
				s.set("seen_aiai_hodo");
				await s.narrate(
					"らんかんの　らくがき。\n『K』と『M』の　あいあいがさ。",
				);
				if (s.flag("seen_aiai_yama"))
					await s.say("kiriko", "（……峠の　ベンチの、\nつづきンゴ？）");
				if (s.flag("tod") === "asa") {
					await s.narrate("朝日で、白いペンの\nあとまで　よく見える。");
				}
			},
		},

		// ── つぶれたファミレス ──
		{
			id: "famiresu_win",
			x: 9,
			y: 5,
			trigger: "talk",
			run: async (s) => {
				const t = s.flag("tod");
				if (t === "shinya") {
					await s.narrate("われた窓。中は、くらい。");
					await s.narrate(
						"国道の　街灯が、さかさまの\nいすの　足を　てらしている。",
					);
					return;
				}
				await s.narrate("われた窓に、テープが\nばってん印に　はってある。");
				if (t === "yoru") {
					// 宵（P0-1）。arrive_yoru の ライトを つけた トラックが、中まで とどく
					s.se("train", { pan: -0.3, volume: 0.35 });
					await s.narrate(
						"トラックの　ライトが、\nさかさまの　いすを　なでていく。",
					);
					return;
				}
				await s.narrate("中に、さかさまの\nいすが見える。");
			},
		},
		{
			id: "famiresu_hours",
			x: 10,
			y: 5,
			trigger: "talk",
			run: async (s) => {
				await s.narrate("はり紙。『営業時間\nAM11:00～PM10:00』");
				await s.narrate("すみのテープが、四つとも\n茶色くなっている。");
			},
		},
		{
			id: "famiresu_door",
			x: 13,
			y: 5,
			trigger: "talk",
			run: async (s) => {
				await s.narrate("『ながらくの　ごあいこ――』");
				await s.narrate("はり紙のつづきは、\n日に焼けて　よめない。");
			},
		},
		// 通用口（かぎが かかっている。小道具）
		{
			id: "famiresu_back",
			x: 18,
			y: 5,
			trigger: "talk",
			run: async (s) => {
				await s.narrate("『従業員通用口』\n……かぎが　かかっている。");
			},
		},
		{
			id: "famiresu_win2",
			x: 15,
			y: 5,
			trigger: "talk",
			run: async (s) => {
				await s.narrate("窓ごしに、レジだけが\nそのまま　のこっている。");
				// 深夜は 店の中が まっくら（famiresu_win「中は、くらい」）。札も写真も よめない
				if (s.flag("tod") === "shinya") return;
				// 店員の2層目（gasman「夜勤あけに、コーヒーだけ」）を聞いた人だけ
				if (s.flag("seen_gasman2"))
					await s.narrate(
						"レジの　おくに、『コーヒー\nおかわり　自由』の　札。",
					);
				// 部活帰りの子（bukatsu_kid「まえは　ポテトが　あったのに」）を見た人だけ
				if (s.flag("seen_bukatsu_kokudo"))
					await s.narrate(
						"かべに、ポテトの　写真が\nはがれかけて　のこっている。",
					);
			},
		},
		{
			id: "famiresu_kanban",
			x: 12,
			y: 6,
			sprite: JP.signpost,
			trigger: "talk",
			fixedDir: true,
			run: async (s) => {
				await s.narrate("たおれかけた看板。\n色が、すっかり　ぬけている。");
				await s.narrate("『ファミリーレストラン\n■■■■』……店名は、よめない。");
			},
		},

		// ── ファミレス前（歩道橋でしか来られない側） ──
		{
			id: "densou_ban",
			x: 16,
			y: 6,
			sprite: JP.roadInfo,
			trigger: "talk",
			fixedDir: true,
			run: async (s) => {
				const t = s.flag("tod");
				// 宵と深夜は 時刻と気温に かわる（町の時計 yoruClock／shinyaClock と 同じ 時を さす）
				if (t === "yoru") {
					await s.narrate(`電光掲示板。\n『${yoruClock(s)}　気温22℃』`);
					return;
				}
				if (t === "shinya") {
					await s.narrate(`電光掲示板。\n『${shinyaClock(s)}　気温20℃』`);
					await s.narrate("……見ている車は、\n一台も　とおらない。");
					return;
				}
				await s.narrate("電光掲示板。『スピード\nおとせ』が、ながれている。");
			},
		},
		{
			id: "nobori",
			x: 19,
			y: 6,
			sprite: JP.infoSign,
			trigger: "talk",
			fixedDir: true,
			run: async (s) => {
				await s.narrate("色あせた　のぼり。\n『うどん　はじめました』");
				await s.narrate("……はじまって、そして\nおわったらしい。");
			},
		},
		{
			id: "driveinn_sign",
			x: 6,
			y: 6,
			sprite: JP.infoSign,
			trigger: "talk",
			fixedDir: true,
			run: async (s) => {
				await s.narrate("『ドライブイン　みなみ\nこの先500m』");
				await s.say("kiriko", "……この店の　ことンゴ？");
			},
		},
		{
			id: "shinda_jihanki",
			x: 30,
			y: 6,
			sprite: JP.vending,
			trigger: "talk",
			fixedDir: true,
			run: async (s) => {
				await s.narrate("じはんき。あかりが、\nついていない。");
				await s.narrate("見本のかんが、日やけで\nまっしろだ。");
				// ⑩ 深夜に 缶を 手に 持っていれば、灯らない 自販機と くらべる（3 は もう ぬるい）
				if (s.flag("tod") === "shinya" && kanHeld(s))
					await s.narrate(
						kanLv(s) <= 2
							? "手の　中の　缶だけが、\nあたたかい。"
							: "手の　中の　缶も、\nもう　ぬるい。",
					);
			},
		},

		// ── 南の歩道ぞい ──
		{
			id: "guardrail",
			x: 12,
			y: 9,
			trigger: "talk",
			run: async (s) => {
				await s.narrate("ガードレール。とそうが\nところどころ、はげている。");
				await s.narrate("大きな　へこみが、ひとつ。");
			},
		},
		// ガードレールの花（説明しない。tod で見え方が かわり、朝に 花が 入れかわる）
		{
			id: "hanataba",
			x: 13,
			y: 9,
			sprite: JP.hanataba,
			trigger: "talk",
			through: true,
			fixedDir: true,
			run: async (s) => {
				const t = s.flag("tod");
				if (t === "asa") {
					// 前の晩までに 花たばを 見た人だけ、入れかわったと わかる
					await s.narrate(
						s.flag("seen_hanataba")
							? "花たばが、あたらしいのに\nかわっている。"
							: "花たばに、朝つゆが\nついている。",
					);
					return;
				}
				s.set("seen_hanataba");
				if (t === "shinya") {
					await s.narrate("花たばが、くらがりで\n白く見える。");
					return;
				}
				if (t === "yoru") {
					await s.narrate("街灯の　オレンジで、\n花の　色が　わからない。");
					return;
				}
				await s.narrate("ガードレールの根もとに、\n花たばが　そなえてある。");
			},
		},
		{
			id: "busstop",
			x: 28,
			y: 11,
			trigger: "talk",
			run: async (s) => {
				const t = s.flag("tod");
				if (t === "shinya") {
					await s.narrate("バスていの時こく表。\nさいしゅうは、22時10分。");
					await s.narrate("……とっくに、\n行ったあとだ。");
					// 夕方のバス待ちの人（bus_obachan「あめ玉、なめて待つの」）を見た人だけ
					if (s.flag("seen_bus_obachan")) {
						s.set("seen_tsutsumi_kokudo");
						await s.narrate("時こく表の下に、あめ玉の\nつつみ紙が　一枚。");
					}
					return;
				}
				if (t === "asa") {
					await s.narrate("時こく表。始発は\n6時52分。……もう出た。");
					// 深夜に つつみ紙を 見た人だけ（だれが はいたかは 書かない）
					if (s.flag("seen_tsutsumi_kokudo"))
						await s.narrate("つつみ紙は、もう\nはかれたあとだ。");
					await s.narrate("つぎのバスまで、\nまだ　すこし　ある。");
					return;
				}
				if (t === "yoru") {
					// 宵（P0-1）。深夜の「とっくに、行ったあと」の手前
					await s.narrate("時こく表。さいしゅうは\n22時10分。……まだ、ある。");
					return;
				}
				await s.narrate("バスていの時こく表。\nつぎは、17時41分。");
				await s.narrate("ガラスが、夕日で\nオレンジ色だ。");
			},
		},
		{
			id: "vending_ev",
			x: 31,
			y: 11,
			trigger: "talk",
			run: async (s) => {
				s.se("hum", { volume: 0.6 });
				const t = s.flag("tod");
				if (t === "shinya") {
					await s.narrate("じはんき。国道の夜に、\nこの明かりだけが　ある。");
					// 『あったか～い』の缶（P0-6）。一晩に一本・持っていれば いまの温度
					await kanShinya(s);
					return;
				}
				if (t === "asa") {
					// ゆうべ どこかの じはんきで 缶を 買った人だけ（got_kan）。
					// 買った場所は ここと かぎらない（senro の朝と 食いちがわないよう「おなじ列」とだけ言う）
					if (kanLv(s) > 0) {
						await s.say("kiriko", "（ゆうべの　一本と、\nおなじ　列ンゴ）");
						return;
					}
					await s.narrate("じはんきの　あかりが、\n朝日で　うすい。");
					return;
				}
				if (t === "yoru") {
					// 宵（P0-1）。深夜の 一本（kanShinya）の 前振り
					await s.narrate(
						"じはんき。あかりが　ついた。\n『あったか～い』の　列も　ある。",
					);
					return;
				}
				await s.narrate(
					"じはんき。『つめた～い』の\nならびに、『あったか～い』が　まじっている。",
				);
			},
		},
		{
			id: "kiropost",
			x: 34,
			y: 11,
			trigger: "talk",
			run: async (s) => {
				await s.narrate("キロポスト。\n『東京まで　112km』");
				await s.say("kiriko", "……とおいのか、ちかいのか\nわからない数字ンゴ");
			},
		},
		{
			id: "sokkou",
			x: 18,
			y: 11,
			trigger: "talk",
			run: async (s) => {
				const t = s.flag("tod");
				if (t === "shinya") {
					await s.narrate("側溝の　水の音が、\n国道の　ほうまで　きこえる。");
					return;
				}
				if (t === "asa") {
					// 朝の 店員の 水まき（gasmanAsa）の 水
					await s.narrate("側溝を、スタンドの　ほうから\n水が　ながれてくる。");
					return;
				}
				await s.narrate("草むらのおくに、側溝。\n水の音がしている。");
				s.se("train", { pan: -0.2, volume: 0.4 });
				await s.narrate("トラックが　来るたび、\n水の音が　きえる。");
			},
		},
		{
			id: "lamp_w",
			x: 16,
			y: 11,
			trigger: "talk",
			run: async (s) => {
				const t = s.flag("tod");
				if (t === "shinya") {
					// 音は arrive_shinya の「じー」に まかせる（apart の蛍光灯 罠8 と 言い方を わける）
					await s.narrate("街灯の　あかりを、虫が　一ぴき\nまわっている。");
					return;
				}
				if (t === "asa") {
					await s.narrate("街灯。もう、きえている。");
					return;
				}
				if (t === "yoru") {
					// 宵（P0-1）。夕方の「まだ、ついていない」の続き（「いつのまにか」は怪異の言い回しなので使わない）
					await s.narrate("せの高い街灯。オレンジ色に\nついている。");
					return;
				}
				await s.narrate("せの高い街灯。まだ、\nついていない。");
			},
		},

		// ── ガソリンスタンド（夕は営業・宵は店じまいで事務所だけ・深夜は消灯。生きた店の記号） ──
		// 夕方、前庭にふみこむと洗車機のテスト運転（音の場面。once。朝の gasmanAsa の2回目で回収）
		...[6, 7, 8, 9, 10].map(
			(x): EventDef => ({
				id: `sensha_scene_${x}`,
				x,
				y: 11,
				trigger: "touch",
				through: true,
				when: (st) => st.flags.tod === "yu" && !st.flags.seen_sensha_scene,
				run: async (s) => {
					s.set("seen_sensha_scene");
					s.se("hum", { volume: 0.8 });
					await s.narrate("――洗車機が、ゴウン、と\nうなりだした。");
					await s.narrate("ブラシが　から回りして、\n水を　とばしている。");
					await s.say(null, "テスト！　テスト！", { name: "スタンドの店員" });
					await s.say("kiriko", "……あびる前で\nよかったンゴ");
				},
			}),
		),
		{
			id: "gs_kanban",
			x: 5,
			y: 11,
			sprite: JP.signpost,
			trigger: "talk",
			fixedDir: true,
			run: async (s) => {
				await s.narrate("ねだんの看板。数字のふだが\n一枚、うらがえしだ。");
				await s.say("kiriko", "けっきょく、いくら\nンゴ……");
			},
		},
		{
			id: "gs_nobori",
			x: 13,
			y: 11,
			sprite: JP.infoSign,
			trigger: "talk",
			fixedDir: true,
			run: async (s) => {
				const t = s.flag("tod");
				if (t === "shinya") {
					await s.narrate("のぼりは、しまわれて\nポールだけだ。");
					return;
				}
				if (t === "asa") {
					await s.narrate("『せんしゃ』ののぼりが、\n立てられたばかりだ。");
					return;
				}
				if (t === "yoru") {
					// 宵（P0-1）。夕方の 風が やんで、深夜には しまわれる 手前
					await s.narrate("のぼりが、ポールに\nまきついて　とまっている。");
					return;
				}
				await s.narrate("のぼり。『せんしゃ』の\n字が、風でおどっている。");
			},
		},
		...[
			[11, 11],
			[12, 11],
			[11, 12],
			[12, 12],
		].map(
			([x, y]): EventDef => ({
				id: `gs_sensha_${x}_${y}`,
				x,
				y,
				trigger: "talk",
				run: async (s) => {
					const t = s.flag("tod");
					if (t === "shinya") {
						await s.narrate(
							"洗車機は、とまっている。\nくらがりで、大きな箱だ。",
						);
						return;
					}
					if (t === "asa") {
						await s.narrate(
							"洗車機の下に、ゆうべの\n水たまりが　のこっている。",
						);
						return;
					}
					if (t === "yoru") {
						await s.narrate(
							"洗車機。ブラシから、\nぽた、ぽた、と　しずくの音。",
						);
						return;
					}
					s.se("hum", { volume: 0.5 });
					await s.narrate(
						"洗車機。ゴウン、ゴウン、と\nブラシが　まわっている。",
					);
				},
			}),
		),
		{
			id: "gs_pump",
			x: 7,
			y: 12,
			sprite: JP.gasPump,
			trigger: "talk",
			fixedDir: true,
			run: async (s) => {
				const t = s.flag("tod");
				if (t === "shinya") {
					await s.narrate("給油機。ノズルに\nカバーが　かかっている。");
					return;
				}
				if (t === "asa") {
					await s.narrate("給油機。けさは、まだ\nだれも来ていない。");
					return;
				}
				if (t === "yoru") {
					await s.narrate(
						"給油機。蛍光灯の　あかりが、\nつるりと　うつっている。",
					);
					return;
				}
				await s.narrate("給油機。よくみがかれて、\n夕日が　うつっている。");
			},
		},
		{
			id: "gs_air",
			x: 9,
			y: 12,
			sprite: JP.airTower,
			trigger: "talk",
			fixedDir: true,
			run: async (s) => {
				await s.narrate("空気入れのホース。\n『ご自由に　どうぞ』");
				await s.say("kiriko", "（タダ、ンゴ）");
			},
		},
		{
			id: "gs_window",
			x: 2,
			y: 12,
			trigger: "talk",
			run: async (s) => {
				const t = s.flag("tod");
				if (t === "shinya") {
					await s.narrate("事務所は、くらい。\nレジに、布がかけてある。");
					return;
				}
				if (t === "asa") {
					await s.narrate("まどガラスが、ふきたてで\nぴかぴかだ。");
					return;
				}
				if (t === "yoru") {
					// 宵（P0-2）。部屋のテレビが中継を打ち切ったあとも、ここのラジオは延長をやっている
					if (s.flag("seen_chukei_end")) {
						await s.narrate("事務所に、あかり。\nラジオは、まだ　延長だ。");
						await s.say("kiriko", "……ここに、ラジオ\nあったンゴ");
						return;
					}
					await s.narrate("事務所に、あかり。\nラジオが、延長の　実況。");
					return;
				}
				await s.narrate("事務所のまど。ラジオの\nナイター中けいの声。");
			},
		},
		{
			id: "gs_door",
			x: 4,
			y: 12,
			trigger: "talk",
			run: async (s) => {
				const t = s.flag("tod");
				if (t === "shinya") {
					await s.narrate("『本日の営業は\nおわりました』の札。");
					return;
				}
				if (t === "asa") {
					await s.narrate("『準備中』の札。\nもうすぐ、ひっくりかえる。");
					return;
				}
				if (t === "yoru") {
					// 宵（P0-1）。札はもう裏がえっている。においは夕方のまま
					await s.narrate("『本日の営業は\nおわりました』の札。");
					await s.narrate("あぶらのにおいが、\nまだ　のこっている。");
					return;
				}
				await s.narrate("『営業中』の札。\nあぶらのにおいがする。");
			},
		},

		// ── ねこのたまり場（隠し: (37,11) のしげみが通れる） ──
		{
			id: "esara",
			x: 36,
			y: 12,
			trigger: "talk",
			run: async (s) => {
				const t = s.flag("tod");
				if (t === "shinya") {
					await s.narrate("草のかげに、エサの皿。\n白く、からっぽだ。");
					return;
				}
				if (t === "asa") {
					await s.narrate("エサの皿。あたらしいのが\n入っている。");
					return;
				}
				if (t === "yoru") {
					await s.narrate("エサの皿を、ねこが\nぴちゃぴちゃ　なめている。");
					return;
				}
				await s.narrate("草のかげに、エサの皿。\nきれいに　からっぽだ。");
			},
		},
		{
			id: "neko_tamari",
			x: 38,
			y: 12,
			trigger: "talk",
			run: async (s) => {
				const t = s.flag("tod");
				if (t === "shinya") {
					await s.narrate("ねこは、いない。\n草だけが、ゆれている。");
					return;
				}
				if (t === "asa") {
					await s.narrate("ねこが二ひき、ならんで\n毛づくろいしている。");
					// ⑤ ここで 三びきを 見て、夜の あつまりも 見た 人だけ
					if (s.flag("seen_neko_shukai") && s.flag("seen_neko_kokudo"))
						await s.say("kiriko", "（もう一ぴきは、まだ\n団地の　うらンゴ？）");
					return;
				}
				s.set("seen_neko_kokudo");
				if (t === "yoru") {
					// 宵（P0-1）。一ぴきは esara の 皿（「ぴちゃぴちゃ　なめている」）
					await s.narrate(
						"二ひきが　おしくらまんじゅう。\n一ぴきは、皿の　ほうだ。",
					);
				} else {
					await s.narrate("ねこが三びき、\nおしくらまんじゅう中だ。");
				}
				await s.say("kiriko", "まざりたいンゴ……");
			},
		},

		// ── 夕方の人たち ──
		npc("gasman", 6, 12, GASMAN, gasman, {
			dir: "right",
			when: (st) => st.flags.tod === "yu",
		}),
		npc(
			"bus_obachan",
			26,
			11,
			OBACHAN,
			async (s) => {
				if (!s.flag("seen_bus_obachan")) {
					s.set("seen_bus_obachan");
					await s.say(null, "バスねえ。時こく表は\nあくまで　目安なのよ", {
						name: "バス待ちの人",
					});
					await s.say("kiriko", "そういうもの、ンゴ？");
					await s.say(null, "そういうものよ。だから\nあめ玉、なめて待つの", {
						name: "バス待ちの人",
					});
					return;
				}
				await s.say(null, "……まだ来ないわねえ", { name: "バス待ちの人" });
			},
			{ dir: "right", when: (st) => st.flags.tod === "yu" },
		),
		npc(
			"bukatsu_kid",
			23,
			11,
			STUDENT,
			async (s) => {
				// 2回目からは ひとことだけ（1回目の seen_bukatsu_kokudo は famiresu_win2 の ポテトの写真で回収）
				if (s.flag("seen_bukatsu_kokudo")) {
					await s.say(null, "……はらへった", { name: "部活帰りの子" });
					return;
				}
				s.set("seen_bukatsu_kokudo");
				await s.say(null, "部活のあとの　この道、\nながいんだよなー", {
					name: "部活帰りの子",
				});
				await s.say(null, "むかいの店、まえは\nポテトが　あったのに", {
					name: "部活帰りの子",
				});
				await s.say(null, "……はらへった", { name: "部活帰りの子" });
				// ㉘ スーパーで コロッケを 買った人だけ（suupaa korokke の got_korokke）
				if (s.flag("got_korokke")) {
					await s.say(null, "……それ、コロッケ？", {
						name: "部活帰りの子",
					});
					await s.say("kiriko", "（はしっこは、\n吾輩のンゴ）");
				}
			},
			{ dir: "down", when: (st) => st.flags.tod === "yu" },
		),
		// 会釈だけの通行人（無害な他者＝深夜の「不在」を効かせるベースライン）。
		// 1回目 seen_stretch_kokudo → 朝のバス停の人（bus_asa）で同じ人だとわかる。2回目だけ会釈がもう一回
		npc(
			"stretch_man",
			35,
			11,
			MAN,
			async (s) => {
				if (s.flag("seen_stretch_kokudo") && !s.flag("seen_stretch_kokudo2")) {
					s.set("seen_stretch_kokudo2");
					await s.narrate("会釈を、もう一回\nされた。");
					await s.say("kiriko", "（二回目は、どう\nかえすのが　正解ンゴ）");
					return;
				}
				s.set("seen_stretch_kokudo");
				await s.narrate("ストレッチ中だ。\nかるく、会釈をされた。");
			},
			{ dir: "up", when: (st) => st.flags.tod === "yu" },
		),

		// ── 朝の人たち ──
		npc("gasman_asa", 8, 13, GASMAN, gasmanAsa, {
			dir: "up",
			when: (st) => st.flags.tod === "asa",
		}),
		npc(
			"bus_asa",
			26,
			11,
			MAN,
			async (s) => {
				// 夕方の ストレッチの人（stretch_man）を見た人だけ、同じ人だと わかる
				if (s.flag("seen_stretch_kokudo"))
					await s.narrate("ゆうがた、ストレッチを\nしていた　人だ。スーツだ。");
				// 時こく表（busstop の asa「始発は　6時52分。……もう出た」）と あわせる
				await s.say(null, "始発、目の前で\n行っちゃってね", {
					name: "バス待ちの人",
				});
			},
			{ dir: "right", when: (st) => st.flags.tod === "asa" },
		),
	],
};
