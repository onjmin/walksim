// 過去ログの地層（26×22）。docs/content-briefs.md「world: kakolog2」＋品質ノルマ。
// 地下の書庫廃墟。棚の通路＝スレ、行き止まりのくぼみ＝dat落ちスレ。
// dark 0.5（懐中電灯で快適）・ambient dust・BGM deep4・outside は色みの墨 #050408。
//
// 地層（上から下へ）:
//   入口＝斜めの階段（黒の海を渡る一本道。docs/kousatsu-bait.md 技法1:
//   下りは13マス・上りは12段に聞こえる。テキストでは一切触れない。リノだけが「12段」と言う）
//   浅層（y8〜12） … dat落ちの棚とくぼみ。懐中電灯の机。総選挙の貼り紙
//   中層（y13〜17）… おんちゃんの部屋（唯一の明るい床）・リノの食堂・にぃちぇ徘徊・
//                    ミャウミャウ目撃②・Web廃墟の一角
//   深層（y18〜21）… 柵の向こうのムッジェ・深淵の看板・石破ブウ・牛の首の空きスロット・
//                    名前のない作り手の遺構・奥の間（レコードC）・隠しくぼみ（無ラベルの盤）
//
// 座標フリーズ: 入口の着地 (3,2)。出口 touch (3,1) → hub (16,2)。

import type { EventDef, MapDef, TileDef } from "../../engine/defs";
import { npc, savePoint, sign, warp } from "../helpers";
import { SPR } from "../sprites";
import { base, CAVE, PROPS } from "../tiles";
import { weekday } from "../weekday";

// ── タイル。CAVE を土台に、書庫の棚・食堂・おんちゃんの部屋を足す ──
const DARK = base(1, 162); // 暗い土の床
const WOOD = base(0, 46); // 木の床（おんちゃんの部屋だけ明るい）
const C_SHELF = "#3a3226";
const shelfOn = (img: string): TileDef => ({
	layers: [DARK, img],
	color: C_SHELF,
	passable: false,
});
const counterOn = (img: string): TileDef => ({
	layers: [DARK, img],
	color: C_SHELF,
	passable: false,
	counter: true,
});

const tiles: Record<string, TileDef> = {
	...CAVE,
	S: shelfOn(base(0, 108, 1, 2)), // 大きな棚（左）
	s: shelfOn(base(1, 108, 1, 2)), // 大きな棚（右）
	B: shelfOn(base(3, 104, 1, 2)), // 棚（一本）
	t: shelfOn(base(2, 108)), // 机
	x: shelfOn(base(4, 123)), // ダンボール箱（CAVE の骸骨は使わない）
	f: shelfOn(base(5, 32)), // 鉄の柵（ムッジェの前）
	"[": counterOn(base(1, 98)), // 食堂のカウンター
	"=": counterOn(base(2, 98)),
	"]": counterOn(base(3, 98)),
	b: { layers: [WOOD], color: "#b8905a", passable: true }, // おんちゃんの部屋の床
	Z: { layers: [WOOD, base(0, 112)], color: "#b8905a", passable: false }, // ふとん（枕）
	z: { layers: [WOOD, base(0, 113)], color: "#b8905a", passable: false }, // ふとん（すそ）
	m: { layers: [DARK, PROPS.magicCircle], color: "#6a5a3a", passable: true }, // 奥の間の台
	h: { layers: [], color: "#050408", passable: true }, // 隠しすきま（外の黒と同じ色）
};

// ── マップ本体 ──
const rows = [
	"                          ", // y0
	"   (                      ", // y1  出口 (3,1) → hub
	"  ,.,                     ", // y2  着地 (3,2)
	"   ,                      ", // y3  階段の1マス目（影。段には見えない）
	"   >>                     ", // y4  ここから斜めの階段
	"    >>                    ", // y5
	"     >>                   ", // y6
	"      >>                  ", // y7
	"       >>   ,,   ,,  ,,   ", // y8  浅層のくぼみ（急募 (12,8) / CD晒し (18,8) / 総選挙 (22,8)）
	"        >>Ss,SsSsB,SsB,Ss ", // y9  浅層・北の棚
	"         ...............x ", // y10 浅層の通路。東端に箱 (24,10)
	"         Ss,SsB,BSsSsBB,B ", // y11 浅層・南の棚
	"          t,   ,,      >  ", // y12 机（懐中電灯）/ 外の音のくぼみ / 中層への段
	"                       >  ", // y13
	"                    ,,,.  ", // y14 dat落ちのくぼみ（ターボババア）
	"  >.......................", // y15 中層の通路。西端は深層への段
	"  >bbbZ   [==], S,s,,,, > ", // y16 おんちゃんの部屋 / 食堂 / 棚の間 / Web廃墟
	"  >bbbz   ,,,,   , ,,,  > ", // y17
	"  >   ,          ,      > ", // y18 くぼみ（かくれんぼ / 例のスレ）
	"  ....................... ", // y19 深層の通路
	"   hSs, fffff, ,   ,,,,,, ", // y20 隠し / 牛の首の棚（東のすきまから表へ回る）/ 柵 / 深淵 / ブウ / 奥の間 / 遺構
	"   , ,,   ,        ~m~,,, ", // y21 無ラベルの盤 / 牛の首の棚の表 / ムッジェ / レコードCの台
];

// ── 入口の階段（技法1）。13マスの下り道。音は tick 一打ずつ ──
// 1マス目 (3,3) だけ、下りるときにしか鳴らない（見た目も床のまま）。
// 下り＝13回、上り＝12回。どこにも書かない。
const STAIR_PATH: [number, number][] = [
	[3, 3],
	[3, 4],
	[4, 4],
	[4, 5],
	[5, 5],
	[5, 6],
	[6, 6],
	[6, 7],
	[7, 7],
	[7, 8],
	[8, 8],
	[8, 9],
	[9, 9],
];
const stairSteps: EventDef[] = STAIR_PATH.map(([x, y], i) => ({
	id: `step_${i}`,
	x,
	y,
	trigger: "touch",
	through: true,
	run: async (s) => {
		if (i === 0 && s.state.dir !== "down") return;
		s.se("tick", { volume: 0.6 });
	},
}));

export const kakolog2: MapDef = {
	id: "kakolog2",
	scene: "sepia", // ジオラマ表示の場面（怪異の地区は箱がほどける）
	name: "過去ログの地層",
	bgm: "kakolog",
	dark: 0.5,
	ambient: { kind: "dust" },
	outside: "#050408",
	tiles,
	rows,
	events: [
		// ── 出入り口 ──
		warp(
			"to_hub",
			3,
			1,
			{ map: "hub", x: 16, y: 2, dir: "down" },
			{ se: "stairs" },
		),
		...stairSteps,

		// ── はじめて入ったとき（auto once） ──
		{
			id: "arrive",
			x: 3,
			y: 2,
			trigger: "auto",
			once: true,
			run: async (s) => {
				await s.wait(400);
				await s.narrate("紙の、ふるいにおいがする。");
				await s.say("kiriko", "……したの階から、風ンゴ");
			},
		},

		// ═══════════ 浅層 ═══════════

		// ── 懐中電灯（机の上）。取ったあとは机だけ残る ──
		{
			id: "flashlight_ev",
			x: 10,
			y: 12,
			sprite: SPR.lantern,
			trigger: "talk",
			fixedDir: true,
			when: (st) => !(st.items.flashlight ?? 0),
			run: async (s) => {
				s.se("item");
				s.give("flashlight");
				s.set("flashlight");
				await s.narrate("机の上に、懐中電灯。\nまだ　あたたかい気がする。");
				await s.narrate("あかりが　とおくまで\nとどくようになった。");
			},
		},
		{
			id: "flashlight_after",
			x: 10,
			y: 12,
			trigger: "talk",
			when: (st) => (st.items.flashlight ?? 0) > 0,
			run: async (s) => {
				await s.narrate("机の上は、からっぽだ。\nひきだしは、あかない。");
			},
		},

		// ── dat落ちのくぼみ（スレタイの看板） ──
		// 看板は入口のすきま (12,9)(18,9)(22,9) の真北に立て、すきまから上向きで調べる。
		// 棚の真北 (13,8)(17,8)(21,8) は棚の上半分がキャラより手前に描かれるので、置くと隠れてしまう。
		sign(
			"dat_kyubo",
			12,
			8,
			"『【急募】眠れない時の\n過ごし方』……dat落ちスレだ。",
		),
		{
			// 日付が1日だけズレている（技法3。だれも言及しない）
			id: "dat_cd",
			x: 18,
			y: 8,
			sprite: PROPS.sign,
			trigger: "talk",
			fixedDir: true,
			run: async (s) => {
				await s.narrate("『今日買ったCD晒すスレ』\n――dat落ちだ。");
				await s.narrate("最後のレスの日付は、\n2021/03/16(火)。");
			},
		},
		{
			id: "senkyo",
			x: 22,
			y: 8,
			sprite: PROPS.notice,
			trigger: "talk",
			fixedDir: true,
			run: async (s) => {
				await s.narrate("『一軍選抜総選挙は　凍結中です』");
				await s.narrate("――貼り紙は、すこし\n黄ばんでいる。");
				await s.say("kiriko", "一軍って、なんの\n一軍ンゴ……");
			},
		},
		{
			id: "dat_soto",
			x: 16,
			y: 12,
			sprite: PROPS.sign,
			trigger: "talk",
			fixedDir: true,
			run: async (s) => {
				await s.narrate("『なんか外で音しない？』\n……dat落ちだ。");
				await s.narrate("最後のレス。\n『気のせいやろ。はよ寝ろ』");
			},
		},
		{
			id: "crate_a",
			x: 24,
			y: 10,
			trigger: "talk",
			run: async (s) => {
				await s.narrate("ダンボールの箱。よこに\n『あ』と　書いてある。");
			},
		},

		// ═══════════ 中層 ═══════════

		// ── dat落ちのくぼみ（ターボババア） ──
		{
			id: "dat_turbo",
			x: 20,
			y: 14,
			sprite: PROPS.sign,
			trigger: "talk",
			fixedDir: true,
			run: async (s) => {
				await s.narrate("『【速報】深夜の県道で\n婆さんに　抜かれたんだが』");
				await s.narrate("レスは『釣り乙』で\n止まっている。");
				await s.note("turbo");
			},
		},

		// ── おんちゃんの部屋（唯一の明るい床・安全地帯） ──
		{
			id: "onroom_in",
			x: 4,
			y: 16,
			trigger: "touch",
			through: true,
			when: (st) => !st.flags.seen_kk_onroom,
			run: async (s) => {
				s.set("seen_kk_onroom");
				await s.narrate("ゆかが、木のいろだ。\nあたたかい。");
				await s.narrate("天井に、電球がひとつ。\nちゃんと、ついている。");
			},
		},
		savePoint("save_on", 3, 16),
		npc(
			"onchan",
			5,
			16,
			"char:onchan",
			async (s) => {
				if (!s.flag("seen_kk_on_met")) {
					s.set("seen_kk_on_met");
					await s.say("onchan", "よく来たおん。\nさむかったろうおん");
					await s.say(
						"onchan",
						"お茶でも　飲んでいくおん。\nここは　あったかいおん",
					);
					await s.say("kiriko", "……生きかえるンゴ");
					await s.say("onchan", "ムッジェ、この下で\n元気にしてるおん？");
					await s.say("kiriko", "（……だれの　ことンゴ？）");
					return;
				}
				if (s.flag("note_mujje") && !s.flag("seen_kk_on_mujje")) {
					s.set("seen_kk_on_mujje");
					await s.say("onchan", "下の　こえ、聞いたおん？");
					await s.say("kiriko", "……あかくて、とおかったンゴ");
					await s.say("onchan", "声が　でてるうちは、\n元気な　しるしおん");
					await s.say("onchan", "こんど　お茶、もってくおん");
					return;
				}
				await s.say(
					"onchan",
					"ゆっくりして　いくおん。\n水晶で、記録も　できるおん",
				);
			},
			{ dir: "down" },
		),
		{
			id: "on_futon",
			x: 6,
			y: 17,
			trigger: "talk",
			run: async (s) => {
				await s.narrate("ふとんが　しいてある。\nひなたの　においが　する。");
			},
		},
		{
			id: "on_yakan",
			x: 3,
			y: 17,
			trigger: "talk",
			run: async (s) => {
				await s.narrate(
					"ちいさな　こんろの上で、\nやかんが　ことこと　いっている。",
				);
			},
		},

		// ── リノの食堂（カウンターごし） ──
		npc(
			"rino",
			11,
			17,
			"char:rino",
			async (s) => {
				// 初回: 注文（＞＞1 おでん / ＞＞2 みそしる）
				if (!s.flag("seen_kk_rino_met")) {
					s.set("seen_kk_rino_met");
					await s.say(
						"rino",
						"あら、見ない顔やねぇ。\nおすわり。夜は　冷えるでね",
					);
					await s.narrate(
						"カウンターの　むこうで、\n鍋が　ことこと　いっている。",
					);
					await s.say("rino", "なにに　しよか");
					const i = await s.choose(["＞＞1 おでん", "＞＞2 みそしる"]);
					if (i === 0) {
						await s.narrate("大根と　たまごが、\nゆっくり　出てきた。");
						await s.say("kiriko", "……しみるンゴ");
						await s.say("rino", "出汁が　いいでねぇ。\n三日は　継ぎ足しとるよ");
					} else {
						await s.narrate("湯気の向こうから、\n赤だしの　においがした。");
						await s.say("kiriko", "……実家の　味ンゴ");
						await s.say("rino", "あんた、ええ舌しとるわ。\n八丁味噌や");
					}
					return;
				}
				// レコードCを拾ったあと: 頼みごと（縦糸。受けると seen_rino_request → terminus が読む）
				if (s.has("rec_c") > 0 && !s.flag("seen_kk_rino_asked")) {
					s.set("seen_kk_rino_asked");
					await s.say("rino", "……その盤、うちの\n常連さんのやわ");
					await s.say("kiriko", "……『おやすみ』って\n書いてあったンゴ");
					await s.say(
						"rino",
						"もし　終点まで行くなら、\nかけてやってくれんかね",
					);
					const i = await s.choose([
						"＞＞1 まかせるンゴ",
						"＞＞2 ……考えとくンゴ",
					]);
					if (i === 0) {
						s.set("seen_rino_request");
						await s.say("rino", "おおきに。\n……たまご、二つ入れる人やった");
					} else {
						await s.say("rino", "ふふ、ええよ。\n……盤は、あんたが拾たんやし");
					}
					return;
				}
				// 考察: 牛の首（客の噂話。オチは出汁。「12段」はここだけ）
				if (
					(s.flag("note_samejima") || s.flag("note_ushinokubi")) &&
					!s.flag("seen_kk_rino_gyu")
				) {
					s.set("seen_kk_rino_gyu");
					await s.say("kiriko", "……『牛の首』って、\nなんのスレンゴ？");
					await s.say("rino", "牛の首？　ああ……\nたのんだ人は　おらんねぇ");
					await s.say(
						"rino",
						"聞いた客は　みぃんな、\n階段を　駆けあがってくと",
					);
					await s.say("kiriko", "……逃げきれるンゴ？");
					await s.say(
						"rino",
						"12段やろ。若い足なら　すぐよ。\n……ま、出汁が冷めるでね。はい",
					);
					return;
				}
				// 考察: 黄色い部屋の先客（技法6。テトの「31年」と食い違う）
				if (s.has("rec_a") > 0 && !s.flag("seen_kk_rino_teto")) {
					s.set("seen_kk_rino_teto");
					await s.say("rino", "あんた、黄色いほうにも\n行ったんやろ");
					await s.say("kiriko", "……椅子の先輩が　いたンゴ");
					await s.say("rino", "あの黄色い部屋の子？\n去年、ふらっと来たきりよ");
					await s.say("kiriko", "……去年？");
					await s.say(
						"rino",
						"おでん、食べてったわ。\nはんぺんだけ　残してねぇ",
					);
					return;
				}
				await s.say("rino", "まいど。\nあったまって　いきない");
			},
			{ dir: "down" },
		),
		sign(
			"rino_fuda",
			14,
			16,
			"『えいぎょう中』の札。\nあたたかい湯気が、ながれてくる。",
			PROPS.notice,
		),
		{
			id: "rino_nabe",
			x: 12,
			y: 17,
			trigger: "talk",
			run: async (s) => {
				await s.narrate("大きな鍋が、ことこと\nいっている。……おでんだ。");
			},
		},

		// ── にぃちぇ（徘徊。曜日ギミック: data/weekday.ts） ──
		npc(
			"nichie",
			8,
			15,
			"char:nichie",
			async (s) => {
				await s.say("nichie", "あ！今日　日曜日だニィ！");
				if (weekday() === 0) {
					await s.wait(600);
					await s.say("nichie", "……ほんとに　日曜ニィ？\n……ほんとに？");
					await s.narrate("にぃちぇは　それきり、\nだまってしまった。");
					return;
				}
				await s.say("kiriko", "……きのうも　日曜って\n言ってたンゴ");
				await s.say("nichie", "きのうも　日曜だった");
				await s.say("kiriko", "…………");
				await s.say("nichie", "いい時代に　なったニィ！");
			},
			{ wander: true },
		),

		// ── ミャウミャウ目撃②（棚の間。近づくと auto 風の touch 帯） ──
		npc(
			"myau2",
			17,
			16,
			SPR.myaumyauB,
			async (s) => {
				await s.say("myaumyau", "……ぷ", { name: "？？？" });
			},
			{ dir: "up", when: (st) => !st.flags.seen_myau2 },
		),
		...[16, 17, 18].map(
			(x): EventDef => ({
				id: `myau2_tr_${x}`,
				x,
				y: 15,
				trigger: "touch",
				through: true,
				when: (st) => !st.flags.seen_myau2,
				run: async (s) => {
					s.set("seen_myau2");
					const dx = 17 - s.state.x;
					s.face("player", dx > 0 ? "right" : dx < 0 ? "left" : "down");
					await s.narrate(
						"棚のあいだに、紙袋あたまの\nちいさい人が　立っている。",
					);
					await s.narrate("（紙袋の下で、なにか\n言っている気がする。）");
					await s.say("myaumyau", "ぷゆゆ🥺", { name: "？？？" });
					await s.move("myau2", "d");
					s.hide("myau2");
					await s.narrate("棚のあいだに、もう\nだれも　いない。");
					await s.note("myaumyau");
				},
			}),
		),

		// ── Web廃墟の一角（個人サイトの跡地） ──
		{
			id: "web_counter",
			x: 19,
			y: 16,
			sprite: PROPS.sign,
			trigger: "talk",
			fixedDir: true,
			run: async (s) => {
				await s.narrate("『あなたは　777777人目の\nお客様です』");
				await s.narrate("カウンターは、もう\nうごかない。");
				await s.note("webhaikyo");
			},
		},
		{
			// お絵かき掲示板（描きかけの絵＝優音アイ。二度目に一行ふえる）
			id: "web_oekaki",
			x: 22,
			y: 16,
			sprite: PROPS.board,
			trigger: "talk",
			fixedDir: true,
			run: async (s) => {
				if (!s.flag("seen_kk_oekaki")) {
					s.set("seen_kk_oekaki");
					await s.narrate("お絵かき掲示板だ。\n描きかけの絵が、一枚。");
					await s.narrate("女の子の　輪郭だけ。\nつづきは、描かれていない。");
					return;
				}
				await s.narrate("描きかけの絵。\n……一行、ふえている。");
				await s.narrate("『たのしかった……』");
				await s.note("ai");
			},
		},
		{
			id: "web_links",
			x: 19,
			y: 17,
			sprite: PROPS.sign,
			trigger: "talk",
			fixedDir: true,
			run: async (s) => {
				await s.narrate("『相互リンク集』。\nどれを　押しても――");
				await s.narrate("ぜんぶ、切れていた。");
			},
		},
		sign(
			"web_kouji",
			21,
			17,
			"『工事中』の看板。\n……ずっと、工事中だ。",
			PROPS.notice,
		),

		// ═══════════ 深層 ═══════════

		// ── 深層に降りたとき（touch once・両方の階段の下） ──
		...[
			[2, 19],
			[24, 19],
		].map(
			([x, y]): EventDef => ({
				id: `deep_in_${x}`,
				x,
				y,
				trigger: "touch",
				through: true,
				when: (st) => !st.flags.seen_kk_deep,
				run: async (s) => {
					s.set("seen_kk_deep");
					s.se("hum", { volume: 0.4 });
					await s.wait(400);
					await s.narrate("空気が、つめたく\nしずんでいる。");
					await s.narrate(
						"蛍光灯の音が、どこかで\nしている。……どこにも、ないのに。",
					);
				},
			}),
		),

		// ── dat落ちのくぼみ（ひとりかくれんぼ / 例のスレ） ──
		{
			id: "dat_kakurenbo",
			x: 6,
			y: 18,
			sprite: PROPS.sign,
			trigger: "talk",
			fixedDir: true,
			run: async (s) => {
				await s.narrate(
					"『【実況】ひとりかくれんぼ\nやってみる』……dat落ちだ。",
				);
				await s.narrate("最後のレスは\n『風呂場みてくる』。");
				await s.narrate("そこで、止まっている。");
				await s.note("kakurenbo");
			},
		},
		{
			id: "dat_samejima",
			x: 17,
			y: 18,
			sprite: PROPS.sign,
			trigger: "talk",
			fixedDir: true,
			run: async (s) => {
				await s.narrate("『【削除】このスレッドは\n表示できません。』");
				await s.narrate("（それ以上　調べる気に\nなれなかった。）");
				await s.note("samejima");
			},
		},

		// ── 牛の首（棚の空きスロット。通路の側は棚の裏なので、表の (5,21) から調べる） ──
		{
			id: "ushinokubi_ev",
			x: 5,
			y: 20,
			trigger: "talk",
			run: async (s) => {
				await s.narrate(
					"棚の　空きスロット。\n『牛の首』と　ラベルだけ　ある。",
				);
				await s.narrate("中身は、ない。");
				await s.note("ushinokubi");
			},
		},
		// となりの棚 (4,20) には調べるものを置かない。表 (4,21) は黒の海で、裏 (4,19) からは
		// 調べられず、タップすると横の隠しすきま h (3,20) へ回りこんで隠しをばらしてしまう。

		// ── ムッジェ（柵の向こうの赤い気配。近づくと一度だけ声） ──
		{
			id: "mujje",
			x: 10,
			y: 21,
			sprite: "char:mujje",
			dir: "up",
			trigger: "talk",
			fixedDir: true,
			run: async (s) => {
				await s.narrate("とおくで、こえがした。");
			},
		},
		...[9, 10, 11].map(
			(x): EventDef => ({
				id: `mujje_tr_${x}`,
				x,
				y: 19,
				trigger: "touch",
				through: true,
				when: (st) => !st.flags.seen_kk_mujje,
				run: async (s) => {
					s.set("seen_kk_mujje");
					s.face("player", "down");
					await s.wait(300);
					await s.narrate("とおくで、こえがした。");
					await s.narrate("「ホゲェ……」");
					await s.narrate(
						"柵のむこうの　くらやみで、\nあかいものが、ゆれている。",
					);
					await s.note("mujje");
					await s.say("kiriko", "……元気そうで、なによりンゴ");
				},
			}),
		),
		{
			id: "rails_ev",
			x: 11,
			y: 20,
			trigger: "talk",
			run: async (s) => {
				await s.narrate("鉄の柵。おくは、くらい。");
				await s.narrate("……あかい　ものが、\nゆっくり　うごいた気がする。");
			},
		},

		// ── 深淵の看板（にぃちぇの字） ──
		{
			id: "shinen_ev",
			x: 13,
			y: 20,
			sprite: PROPS.sign,
			trigger: "talk",
			fixedDir: true,
			run: async (s) => {
				await s.narrate("床の看板。ゆがんだ字だ。");
				await s.narrate(
					"『深淵をのぞくとき、深淵も\nこちらを　のぞいているのだニィ』",
				);
				await s.narrate("……にぃちぇの字だ。");
				await s.note("shinen");
			},
		},

		// ── 石破ブウ（dat落ちスレタイ） ──
		{
			id: "dat_buu",
			x: 15,
			y: 20,
			sprite: PROPS.sign,
			trigger: "talk",
			fixedDir: true,
			run: async (s) => {
				await s.narrate("『ワイは「あ」を担当するで\nみんなで　完成させよう』");
				await s.narrate("（つづきの音は、書かれて\nいなかった。）");
				await s.note("buu");
			},
		},

		// ── 名前のない作り手の遺構（饒舌 → 宣伝せんといて → 沈黙） ──
		{
			id: "iko_labels",
			x: 22,
			y: 20,
			sprite: PROPS.sign,
			trigger: "talk",
			fixedDir: true,
			run: async (s) => {
				await s.narrate("棚に　二枚だけ。\n『無題_037』『無題_041』。");
				await s.narrate("題は、それだけ。");
			},
		},
		{
			id: "iko_1",
			x: 24,
			y: 20,
			sprite: PROPS.notice,
			trigger: "talk",
			fixedDir: true,
			run: async (s) => {
				await s.narrate("古い貼り紙。\n『037できた！　聞いてくれ！");
				await s.narrate("音を　まちがえた気もするが\nそれも味や。次いくで』");
			},
		},
		{
			id: "iko_2",
			x: 22,
			y: 21,
			sprite: PROPS.notice,
			trigger: "talk",
			fixedDir: true,
			run: async (s) => {
				await s.narrate("『みんな　聞いてくれて\nありがとう。……ほんまに』");
				await s.narrate("『でも、宣伝は　せんといて』");
			},
		},
		{
			id: "iko_3",
			x: 24,
			y: 21,
			sprite: PROPS.notice,
			trigger: "talk",
			fixedDir: true,
			run: async (s) => {
				await s.narrate("三枚目の　貼り紙は、\nまっしろだ。");
				await s.narrate("なにも、書かれていない。");
			},
		},

		// ── 奥の間（レコードC） ──
		{
			id: "rec_c_ev",
			x: 20,
			y: 21,
			sprite: SPR.record,
			trigger: "talk",
			fixedDir: true,
			when: (st) => !(st.items.rec_c ?? 0),
			run: async (s) => {
				s.se("item");
				s.give("rec_c");
				s.set("got_rec_c");
				await s.narrate("台の上に、黒いレコード。\nほこりを、はらった。");
				await s.record("rec_c");
				// 途切れた日常のあとに、日常の一言（dialogue-guide §3）
				await s.say("kiriko", "……おやすみンゴ");
			},
		},
		{
			id: "rec_c_after",
			x: 20,
			y: 21,
			trigger: "talk",
			when: (st) => (st.items.rec_c ?? 0) > 0,
			run: async (s) => {
				await s.narrate("台は、からになった。");
			},
		},
		{
			id: "mizu_ev",
			x: 19,
			y: 21,
			trigger: "talk",
			run: async (s) => {
				await s.narrate("くろい水たまり。\n底は、見えない。");
			},
		},

		// ── 隠しくぼみ（黒に見えるすきまの先。ラベルのない盤） ──
		{
			id: "blank_rec",
			x: 3,
			y: 21,
			trigger: "touch",
			through: true,
			run: async (s) => {
				if (!s.flag("seen_kk_blank")) {
					s.set("seen_kk_blank");
					await s.narrate(
						"……くらがりに、レコードが\n一枚だけ　立てかけてある。",
					);
					await s.narrate("ラベルは、ない。");
					await s.narrate("題も、名前も、ない。\n……そっと、置きなおした。");
					return;
				}
				await s.narrate("ラベルのない　レコード。\nしずかに、そこに　ある。");
			},
		},
	],
};
