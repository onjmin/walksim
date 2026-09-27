// となりまち「つきみ」（アーケード商店街）。docs/content-briefs.md「日常の町 拡張」。
// 36×20・outdoor・BGM null・夕方のみ（ekimae の電車か、せんろぞいのみちを歩いて来る。
// senro の西はしは夕方だけ通れる＝アーケードのシャッター）・怪異ゼロ必達。
// ここは「行かなくてもいい豊かさ」の担当——進行に一切関係しない。純ノスタルジー地区。
// かいいノート（s.note）は一つも呼ばない。
//
// 座標凍結v3: ekimae の乗車演出 → (3,10) 着地／駅の talk (2,9) → 乗車演出 → ekimae(5,9)。
// たいやきを買っている（got_taiyaki）と、帰りの車窓の一言が変わる。
// ポケットの紙もの（nostalgia.md P0-9）: たいやきのおつりに福引券が一まい（got_fukubikiken）。
// 福引きの係は留守のままで、券は朝の枕元で見つかる（room bed）。回せなくても罰も催促も無い。
// 貼り紙の下の貼り紙（P0-8）: テナント募集は、二度目に看板の跡が見える（seen_tenant）。
//
// 経路: 一本目のアーケード(y10-12)と二本目(y16-18)を、東の路地(x30-33)と西の路地(x0)で
// つないだ回遊ループ。純喫茶と金物屋のあいだ (7,13)-(7,15) は、黒く見えるが通れる
// 隠しのすきま（無印。換気扇・ねこ）＝ループの近道にもなる。
//
// 一本目（光にぎやか。lights は "yu" 多数）: 駅・レコード店（中に入れる・店主3層）・
// 本屋（立ち読みの子）・ゲーセン（音だけ・入れない）・模型屋（ジオラマ・二度目に犬）・
// たいやき屋（choice・got_taiyaki）。くぼみ (10,9)(16,9)(22,9) にも見るもの。
// 二本目（すこし静か）: 純喫茶・金物屋・骨董屋（店さきに蓄音機——値札を見るキリコ）・
// 八百屋・テナント募集。
// 場面（音・光の auto/touch）: 到着・レコードの曲おわり・発車した電車・アーケードの
// きれめの夕日・すきまの空・帰りの車窓。

import type {
	EventDef,
	GameState,
	MapDef,
	Story,
	TileDef,
} from "../../engine/defs";
import { npc, warp } from "../helpers";
import { SPR } from "../sprites";
import { DOOR, JP, TOWN, WALL, WIN } from "../tiles";

// ── タイル ──
//   M  駅の改札（もどりの talk）  i  店の中の床（レコード店・たいやき屋）
//   < = >  カウンター  o j  しまった戸  d  あいている戸
//   R  レコード店のあいている戸（下半分）  r  その上半分（店の中の床）
//   c  下段の窓（白壁）  t  下段の窓（レンガ）  u  すきま（黒く見えるが通れる＝無印の隠し）
const PAVE = JP.pave;
const WIN_LOW_WHITE = WIN.sash;
const WIN_LOW_BRICK = WIN.sash;
const tiles: Record<string, TileDef> = {
	...TOWN,
	M: {
		layers: [WALL.sidingLo, DOOR.shop],
		color: "#8c8c90",
		passable: false,
	},
	i: { layers: [PAVE], color: "#9a9a9a", passable: true },
	"<": {
		layers: [PAVE, JP.counterL],
		color: "#b8905a",
		passable: false,
		counter: true,
	},
	"=": {
		layers: [PAVE, JP.counterM],
		color: "#b8905a",
		passable: false,
		counter: true,
	},
	">": {
		layers: [PAVE, JP.counterR],
		color: "#b8905a",
		passable: false,
		counter: true,
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
	d: {
		layers: [WALL.sidingLo, DOOR.house],
		color: "#e8e8e8",
		passable: true,
	},
	// レコード店の戸は上下2マスに分けて描く。16x32 の d のままだと、上半分が店の中 (8,8) で
	// キャラより手前に描かれ、そこに立つキリコが足ぶみのたびに点滅してしまう。
	R: {
		layers: [WALL.sidingLo, DOOR.houseBottom],
		color: "#e8e8e8",
		passable: true,
	},
	r: { layers: [PAVE, DOOR.houseTop], color: "#9a9a9a", passable: true },
	c: {
		layers: [WALL.sidingLo, WIN_LOW_WHITE],
		color: "#e8e8e8",
		passable: false,
	},
	t: {
		layers: [WALL.tileLo, WIN_LOW_BRICK],
		color: "#a04a3a",
		passable: false,
	},
	u: { layers: [], color: "#000", passable: true },
	".": { layers: [PAVE], color: "#9a9a9a", passable: true },
};

// 一本目: 駅・レコード店（中あり）・本屋・ゲーセン・模型屋・たいやき屋（中あり）。
// 二本目: 純喫茶・金物屋・骨董屋・八百屋・テナント募集。x7 の黒い縦すじが隠しのすきま。
const rows = [
	"                                    ", // y0
	"                                    ", // y1
	"                                    ", // y2
	"                                    ", // y3
	"                                    ", // y4
	"                                    ", // y5
	"                                    ", // y6
	"aaaaannnnn nnnnn nnnnn nnnnnnnnnnn  ", // y7  駅とアーケード一本目の屋根
	"AAAAA(iir( (w(w( (w(w( %W%W%%iiii%  ", // y8  レコード店の中 (6-8,8)・たいやき屋の中 (30,8)
	")cM)))c)R).)d)c).)j)t).#t#t#%<==>%  ", // y9  改札 (2,9)・くぼみ (10,9)(16,9)(22,9)
	"..................................  ", // y10 着地 (3,10)
	"..................................  ", // y11
	"..L.......Bb....p............L....  ", // y12 丸ポスト (6,12)・電話ボックス (20,12)
	". zzzzzunnnnn aaaaa zzzzz nnnn....  ", // y13 二本目の屋根・すきま (7,13)・東の路地 (30-33)
	". ZZZZZu^^^^^ AAAAA ZZZZZ ^^^^....  ", // y14 西の路地 (x0)・すきまのねこ (8,14)
	". )o)c)u)c)d) )c)c) )c)o) ]jj]....  ", // y15 純喫茶・金物屋・骨董屋・八百屋・テナント
	"....................................", // y16 蓄音機の台 (16,16)
	"....................................", // y17
	"  .L......!.....Bb........L.......  ", // y18 福引き (10,18)
	"                                    ", // y19
];

// ── モブの歩行グラ ──
const RECORD_OYAJI = "pub:sprites/mob_man.png";
const TAIYAKI_OBACHAN = "pub:sprites/mob_obachan.png";
const STUDENT = "pub:sprites/mob_student.png";
const WIFE = "pub:sprites/mob_mama.png";
const YAOYA = "pub:sprites/mob_shopkeeper.png";
const MAN = "pub:sprites/mob_man.png";

/** 一度だけ鳴る「場面」の帯（見えない touch を数マスに敷く）。 */
const sceneBelt = (
	id: string,
	cells: [number, number][],
	flag: string,
	run: (s: Story) => Promise<void>,
): EventDef[] =>
	cells.map(([x, y], i) => ({
		id: `${id}_${i}`,
		x,
		y,
		trigger: "touch" as const,
		through: true,
		when: (st: GameState) => !st.flags[flag],
		run: async (s: Story) => {
			s.set(flag);
			await run(s);
		},
	}));

/** 帰りの乗車演出（夕日の車窓。たいやきを買っていると一言ふえる）。座標凍結v3。 */
const rideHome = async (s: Story): Promise<void> => {
	await s.fadeOut(600);
	s.se("train", { volume: 0.7 });
	await s.wait(900);
	await s.narrate("――ガタン、ゴトン。");
	await s.narrate("アーケードの灯りが、\nうしろへ　ながれていく。");
	await s.narrate("夕日が、川をわたるあいだ\nずっと　ついてきた。");
	if (s.flag("got_taiyaki"))
		await s.narrate("ふくろの中の　たいやきが、\nまだ　あたたかい。");
	s.se("train", { volume: 0.4, pan: -0.3 });
	await s.wait(400);
	await s.warp("ekimae", 5, 9, "down");
};

export const tonarimachi: MapDef = {
	id: "tonarimachi",
	// ジオラマ表示の箱。場面ごとに区切る（engine/diorama.ts の boxFor）
	boxes: [
		{ x: 0, y: 7, w: 12, h: 6 }, // アーケード一本目の西
		{ x: 12, y: 7, w: 12, h: 6 }, // アーケード一本目のなか
		{ x: 24, y: 7, w: 12, h: 6 }, // アーケード一本目の東
		{ x: 0, y: 13, w: 12, h: 7 }, // 二本目の西
		{ x: 12, y: 13, w: 12, h: 7 }, // 二本目のなか
		{ x: 24, y: 13, w: 12, h: 7 }, // 二本目の東
	],
	name: "となりまち",
	bgm: "@tod", // 時間帯の曲（生活音の下にごく薄く。data/index.ts の todBgm）
	outdoor: true,
	outside: "#0d0a0c",
	tiles,
	rows,
	// アーケードは灯りの列（ここだけは「明るい夕方」でよい。生活の密度が主役）。
	// 一本目に多数・二本目はすこし静かに。路地とすきまは灯りなし＝暗さの対比で作る。
	lights: [
		// 一本目（にぎやか）
		{ x: 2, y: 8, r: 2, only: "yu" }, // 駅舎の窓
		{ x: 6, y: 9, r: 2, only: "yu" }, // レコード店の窓
		{ x: 7, y: 8, r: 2, only: "yu" }, // レコード店の中
		{ x: 13, y: 9, r: 2, only: "yu" }, // 本屋の戸
		{ x: 14, y: 9, r: 2, only: "yu" }, // 本屋の窓
		{ x: 19, y: 9, r: 2.5, color: "#cfe4ff", only: "yu" }, // ゲーセン（電子の白）
		{ x: 24, y: 9, r: 2, only: "yu" }, // 模型屋（西）
		{ x: 26, y: 9, r: 2, only: "yu" }, // 模型屋（東）
		{ x: 30, y: 8, r: 3, color: "#ffcc88", only: "yu" }, // たいやき屋
		{ x: 16, y: 9, r: 1.5, color: "#eef4ff", only: "yu" }, // くぼみのじはんき
		{ x: 2, y: 12, r: 3, color: "#ffdf9e", only: "yu" }, // 街灯（西）
		{ x: 29, y: 12, r: 3, color: "#ffdf9e", only: "yu" }, // 街灯（東）
		// 二本目（すこし静か・オレンジ寄り）
		{ x: 5, y: 15, r: 2, only: "yu" }, // 純喫茶
		{ x: 9, y: 15, r: 2, only: "yu" }, // 金物屋
		{ x: 15, y: 15, r: 1.5, only: "yu" }, // 骨董屋（弱い）
		{ x: 21, y: 15, r: 2, only: "yu" }, // 八百屋
		{ x: 3, y: 18, r: 3, color: "#ffdf9e", only: "yu" }, // 街灯（南西）
		{ x: 26, y: 18, r: 3, color: "#ffdf9e", only: "yu" }, // 街灯（南東）
	],
	onEnter: async (s) => {
		s.se("higurashi", { volume: 0.6 });
	},
	events: [
		// ── 着いたとき（一度だけ） ──
		{
			id: "arrive",
			x: 0,
			y: 0,
			trigger: "auto",
			once: true,
			run: async (s) => {
				await s.wait(500);
				s.se("doorbell", { pan: 0.4, volume: 0.7 });
				await s.wait(500);
				await s.narrate("アーケードの下は、\nもう　夕方の買いもの時だ。");
				await s.narrate("しらない町の、しっている\nにおいがする。");
				await s.say("kiriko", "……にぎやかンゴ");
			},
		},

		// ── 駅（もどりの talk。座標凍結v3） ──
		{
			id: "eki_kaisatsu",
			x: 2,
			y: 9,
			trigger: "talk",
			run: async (s) => {
				await s.narrate("つきみ駅の改札。かえりの\n電車が、もう入っている。");
				const i = await s.choose(["＞＞1 のって帰る", "＞＞2 まだ歩く"], {
					cancel: 1,
				});
				if (i === 0) {
					await rideHome(s);
					return;
				}
				await s.say("kiriko", "もうすこしだけ、\n見ていくンゴ");
			},
		},
		{
			id: "ekimei",
			x: 1,
			y: 9,
			trigger: "talk",
			run: async (s) => {
				await s.narrate("駅名標。『つきみ』。");
				await s.narrate("となりの駅は『みなみ』と\n書いてある。……うちの駅だ。");
			},
		},
		// 改札の前をとおると、一本先の電車が出ていく（一度だけ）
		...sceneBelt(
			"densha_deru",
			[
				[2, 10],
				[1, 11],
			],
			"seen_densha_deru",
			async (s) => {
				s.se("densha_far", { pan: -0.6, volume: 0.6 });
				await s.narrate("改札のおくで、電車が\n一本、出ていった。");
				await s.say("kiriko", "……吾輩のは、まだ\nあるンゴね？");
			},
		),

		// ── レコード店（キリコが長居する店。中に入れる） ──
		{
			id: "record_win",
			x: 6,
			y: 9,
			trigger: "talk",
			run: async (s) => {
				await s.narrate(
					"レコード店の窓。ジャケットが\nびっしり　ならんでいる。",
				);
				await s.narrate("どの背も、日に焼けている。");
			},
		},
		// 戸の鈴（入るときも出るときも鳴る）
		{
			id: "record_bell",
			x: 8,
			y: 9,
			trigger: "touch",
			through: true,
			run: async (s) => {
				s.se("doorbell", { volume: 0.7 });
			},
		},
		// 中に入ったとき（一度だけ）
		{
			id: "record_naka",
			x: 8,
			y: 8,
			trigger: "touch",
			through: true,
			when: (st) => !st.flags.seen_record_naka,
			run: async (s) => {
				s.set("seen_record_naka");
				s.se("record", { volume: 0.6 });
				await s.narrate("店のなかは、レコードの\n音で　みたされている。");
				await s.narrate("ざらざらした、いい音だ。");
			},
		},
		{
			id: "record_tana",
			x: 9,
			y: 8,
			trigger: "talk",
			run: async (s) => {
				await s.narrate("中古の棚。手書きの札に\n『どれも一期一会』。");
				await s.narrate("背の字が、みんな\n日に焼けて　うすい。");
				await s.say("kiriko", "ぜんぶ聞くには、人生が\n足りないンゴ……");
			},
		},
		{
			id: "record_kabe",
			x: 7,
			y: 7,
			trigger: "talk",
			run: async (s) => {
				await s.narrate("かべ一面、天井まで\nレコードだ。");
				await s.narrate("いちばん上は、はしごが\nないと　とどかない。");
			},
		},
		// 窓 (6,9) と戸 (8,9) のあいだ（どちらの前もあけておく）
		{
			id: "record_wagon",
			x: 7,
			y: 10,
			sprite: JP.recordWagon,
			trigger: "talk",
			fixedDir: true,
			run: async (s) => {
				await s.narrate("店頭のワゴン。『どれでも\n3まい500円』。");
				await s.say("kiriko", "……えらべる気が\nしないンゴ");
			},
		},
		// 店の前で、一曲おわる（一度だけ。音だけの場面）
		...sceneBelt(
			"record_owari",
			[
				[6, 10],
				[8, 10],
				[9, 10],
			],
			"seen_record_owari",
			async (s) => {
				s.se("record", { volume: 0.4, pan: -0.1 });
				await s.wait(700);
				s.se("needle", { volume: 0.6, pan: -0.1 });
				await s.narrate("戸のおくで、曲がおわって\n針のあがる音がした。");
				await s.wait(600);
				await s.narrate("すこしして、つぎの曲が\nはじまった。");
			},
		),

		// ── 本屋 ──
		{
			id: "honya_win",
			x: 14,
			y: 9,
			trigger: "talk",
			run: async (s) => {
				await s.narrate("本屋の窓。『本日発売』の\nポスターが　三枚。");
				await s.narrate("しらない漫画ばかりだ。");
			},
		},
		{
			id: "honya_door",
			x: 12,
			y: 9,
			trigger: "talk",
			run: async (s) => {
				await s.narrate("本屋の戸。立ち読みの\nせなかが、二つ見える。");
			},
		},

		// ── ゲーセン（音だけ・入れない） ──
		{
			id: "geesen_door",
			x: 18,
			y: 9,
			trigger: "talk",
			run: async (s) => {
				s.se("decide", { volume: 0.4, pan: 0.1 });
				await s.wait(300);
				s.se("decide", { volume: 0.3, pan: -0.1 });
				await s.narrate("とびらのおくから、電子音と\nだれかの歓声。");
				await s.say("kiriko", "……きょうは、やめて\nおくンゴ");
			},
		},
		{
			id: "geesen_win",
			x: 20,
			y: 9,
			trigger: "talk",
			run: async (s) => {
				await s.narrate(
					"ゲーセンの窓。ポスターだらけで\n中は見えない。音だけ、もれてる。",
				);
			},
		},
		...sceneBelt(
			"geesen_oto",
			[
				[19, 10],
				[20, 10],
			],
			"seen_geesen_oto",
			async (s) => {
				s.se("decide", { volume: 0.35, pan: 0 });
				await s.narrate("ゲーセンの前だけ、\n音の温度が　たかい。");
			},
		),

		// ── 模型屋 ──
		{
			id: "mokei_a",
			x: 24,
			y: 9,
			trigger: "talk",
			run: async (s) => {
				await s.narrate(
					"模型屋のショーウィンドウ。\n戦艦の箱絵が、波をけたてる。",
				);
				await s.say("kiriko", "箱の絵だけで　ごはん\n三ばい　いけるンゴ");
			},
		},
		{
			id: "mokei_b",
			x: 26,
			y: 9,
			trigger: "talk",
			run: async (s) => {
				if (!s.flag("seen_mokei_b")) {
					s.set("seen_mokei_b");
					await s.narrate("ジオラマ。ちいさな駅と、\nちいさな　ふみきり。");
					await s.narrate("ちいさな人が、ちいさな\nかばんを　もっている。");
					return;
				}
				await s.narrate("……ふみきりの前に、\nちいさな犬も　いた。");
				await s.narrate("さっきは、気づかなかった。");
			},
		},

		// ── たいやき屋（買うと帰りの車窓が変わる） ──
		{
			id: "taiyaki_yuge",
			x: 28,
			y: 9,
			trigger: "talk",
			run: async (s) => {
				await s.narrate("あまい　においが、\nここまで　ながれてくる。");
			},
		},

		// ── くぼみ（店のあいだの見るもの） ──
		{
			id: "matsuri_poster",
			x: 10,
			y: 9,
			sprite: JP.matsuriPoster,
			trigger: "talk",
			fixedDir: true,
			run: async (s) => {
				await s.narrate("『つきみ秋まつり』の\nポスター。");
				await s.narrate("しらない　おまつりだ。\n日づけは、らいげつ。");
				await s.say("kiriko", "……来られたら、\n来るンゴ");
			},
		},
		{
			id: "jihanki_kubomi",
			x: 16,
			y: 9,
			sprite: JP.vending,
			trigger: "talk",
			fixedDir: true,
			run: async (s) => {
				s.se("hum", { volume: 0.5 });
				await s.narrate("じはんき。しらない\nメーカーの　ジュースだ。");
			},
		},
		{
			id: "oki_kanban",
			x: 22,
			y: 9,
			sprite: JP.infoSign,
			trigger: "talk",
			fixedDir: true,
			run: async (s) => {
				await s.narrate("『本日　大やす売り』の\n置き看板。");
				await s.narrate("……どの店のものかは、\n書いていない。");
			},
		},

		// ── 一本目の通りの小物 ──
		{
			id: "maru_post",
			x: 6,
			y: 12,
			sprite: JP.postRound,
			trigger: "talk",
			fixedDir: true,
			run: async (s) => {
				await s.narrate("まるい、ふるい形のポスト。");
				await s.narrate("ペンキだけ、ぬりたてで\nつやつやだ。……現役らしい。");
			},
		},
		{
			id: "denwa_box",
			x: 20,
			y: 12,
			sprite: JP.phoneBox,
			trigger: "talk",
			fixedDir: true,
			run: async (s) => {
				await s.narrate("電話ボックス。ガラスが\nみがきあげてある。");
				await s.narrate("中に、電話帳が\n二冊も　さがっている。");
			},
		},
		{
			id: "arcade_lamp",
			x: 2,
			y: 12,
			trigger: "talk",
			run: async (s) => {
				await s.narrate(
					"アーケードの灯り。はしから\nはしまで、ぜんぶ　ついている。",
				);
			},
		},
		{
			id: "bench_1",
			x: 10,
			y: 12,
			trigger: "talk",
			run: async (s) => {
				await s.narrate("ベンチ。だれかの水とうが\nわすれてある。");
				await s.narrate("……もちぬしは、たぶん\nゲーセンだ。");
			},
		},
		{
			id: "ueki_hachi",
			x: 16,
			y: 12,
			trigger: "talk",
			run: async (s) => {
				await s.narrate("店さきの　植木ばち。\nきちんと　手入れされている。");
			},
		},
		// アーケードのきれめ（東の路地の口）に、夕日がさしこむ（一度だけ）
		...sceneBelt(
			"yuhi_kireme",
			[
				[31, 12],
				[32, 12],
			],
			"seen_yuhi_kireme",
			async (s) => {
				await s.narrate("アーケードのきれめから、\n夕日が　よこに　さしこむ。");
				await s.narrate("とおりのかげが、みんな\nながい。");
			},
		),

		// ── 二本目の通り（純喫茶・金物屋・骨董屋・八百屋・テナント） ──
		{
			id: "kissa_door",
			x: 3,
			y: 15,
			trigger: "talk",
			run: async (s) => {
				await s.narrate("純喫茶の戸。ベルつきだ。\n『モーニングやってます』");
				await s.narrate("コーヒーのにおいが、\n戸のすきまから　もれている。");
			},
		},
		{
			id: "kissa_win",
			x: 5,
			y: 15,
			trigger: "talk",
			run: async (s) => {
				await s.narrate("レースのカーテンごし、\nシャンデリアの灯り。");
				await s.narrate("……よるの色の店だ。");
			},
		},
		{
			id: "kanamono_win",
			x: 9,
			y: 15,
			trigger: "talk",
			run: async (s) => {
				await s.narrate(
					"金物屋の窓。なべ、やかん、\nざる。ぜんぶ銀色にひかる。",
				);
			},
		},
		{
			id: "kanamono_door",
			x: 11,
			y: 15,
			trigger: "talk",
			run: async (s) => {
				await s.narrate("店さきに、たわしの山。");
				await s.narrate("ひとつください、が\n言いづらい　量だ。");
			},
		},
		{
			id: "kotto_win",
			x: 15,
			y: 15,
			trigger: "talk",
			run: async (s) => {
				await s.narrate(
					"骨董屋の窓。ブリキのバスと、\nこけしと、ふるいラジオ。",
				);
				await s.narrate("ねだんの札は、ぜんぶ\nうらがえしだ。");
			},
		},
		{
			id: "kotto_oku",
			x: 17,
			y: 15,
			trigger: "talk",
			run: async (s) => {
				await s.narrate("窓のおく、ガラスびんの\n列に、夕日がとおる。");
				await s.narrate("店のおくから、野球中継の\nラジオが　きこえる。");
			},
		},
		// 骨董屋の店さきの蓄音機（値札を見るキリコ）
		{
			id: "kotto_phono",
			x: 16,
			y: 16,
			sprite: SPR.phono,
			trigger: "talk",
			fixedDir: true,
			run: async (s) => {
				if (!s.flag("seen_kotto_phono")) {
					s.set("seen_kotto_phono");
					await s.narrate("店さきの台に――\n蓄音機だ。");
					await s.narrate("ラッパのまがりが、うちのと\nすこし　ちがう。");
					await s.narrate("値札を、そっと　めくる。");
					await s.say("kiriko", "……ゼロが、ひとつ\n多いンゴ");
					await s.narrate("そっと、もどした。");
					return;
				}
				await s.narrate("蓄音機は、まだ\n売れていない。");
				await s.say("kiriko", "（……よかったンゴ）");
			},
		},
		{
			id: "yaoya_win",
			x: 21,
			y: 15,
			trigger: "talk",
			run: async (s) => {
				await s.narrate("八百屋の店さき。だいこんが\nそろって　白い。");
			},
		},
		// 二度目で、前の店の看板の跡に気づく（P0-8。変わるのではなく、気づく）
		{
			id: "tenant",
			x: 27,
			y: 15,
			trigger: "talk",
			run: async (s) => {
				if (!s.flag("seen_tenant")) {
					s.set("seen_tenant");
					await s.narrate("シャッターに『テナント\n募集』の紙。");
					await s.narrate("……ここだけ、通りの音が\nとおくなる。");
					return;
				}
				await s.narrate("シャッターの上の　かべに、\n看板のかたちの　こい色。");
				await s.narrate("字は、ない。\nねじの穴が、四つ。");
			},
		},
		{
			id: "ringo_box",
			x: 20,
			y: 16,
			sprite: JP.ringoBox,
			trigger: "talk",
			fixedDir: true,
			run: async (s) => {
				await s.narrate("箱づみの　りんご。\n『つがる』と書いてある。");
			},
		},

		// ── すきま（純喫茶と金物屋のあいだ。黒く見えるが通れる＝無印の隠し） ──
		{
			id: "sukima",
			x: 7,
			y: 14,
			trigger: "touch",
			through: true,
			when: (st) => !st.flags.seen_sukima,
			run: async (s) => {
				s.set("seen_sukima");
				await s.narrate("ビルとビルの、すきま。");
				await s.narrate("見あげると、空が\nほそながい。");
			},
		},
		{
			id: "sukima_kanki",
			x: 6,
			y: 14,
			trigger: "talk",
			run: async (s) => {
				await s.narrate("純喫茶の換気扇が、\nゆっくり　まわっている。");
				await s.narrate("コーヒーのにおいは、\nここから来ていた。");
			},
		},
		{
			id: "sukima_neko",
			x: 8,
			y: 14,
			trigger: "talk",
			run: async (s) => {
				if (!s.flag("seen_sukima_neko")) {
					s.set("seen_sukima_neko");
					await s.narrate("室外機のうえに、ねこ。\nここの　ぬしの顔だ。");
					await s.say("kiriko", "（おじゃまします、\nンゴ……）");
					return;
				}
				await s.narrate("ねこは目をとじたまま、\nしっぽだけ　ふった。");
			},
		},

		// ── 路地（回遊ループのつなぎ目にも見るものを） ──
		{
			id: "katteguchi",
			x: 31,
			y: 14,
			sprite: JP.polyBucket,
			trigger: "talk",
			fixedDir: true,
			run: async (s) => {
				await s.narrate("店の勝手口。ネギの\nはこが、つんである。");
			},
		},
		{
			id: "nishi_jitensha",
			x: 1,
			y: 14,
			trigger: "talk",
			run: async (s) => {
				await s.narrate("かべに、はいたつの自転車。\nにもつ台に『米』のはこ。");
				await s.narrate("とまっているのに、\nいそがしそうな自転車だ。");
			},
		},
		// 福引券（たいやきのおつり）をもっていると、キリコの一言が変わる（P0-9）。
		// 留守を一度見ていれば「まだ　もどらない」。seen_fukubiki はそのためだけのフラグ
		{
			id: "fukubiki",
			x: 10,
			y: 18,
			trigger: "talk",
			run: async (s) => {
				const mata = !!s.flag("seen_fukubiki");
				s.set("seen_fukubiki");
				await s.narrate("『福引き』ののぼりと、\nガラガラの抽選器。");
				if (!s.flag("got_fukubikiken")) {
					await s.narrate("係の人は、いま\n留守のようだ。");
					await s.say("kiriko", "（一回だけ回したい\nンゴ……がまん）");
					return;
				}
				await s.narrate(
					mata
						? "係の人は、まだ\nもどらない。"
						: "係の人は、いま\n留守のようだ。",
				);
				await s.say("kiriko", "（券だけ、もって\nかえるンゴ）");
			},
		},
		{
			id: "bench_2",
			x: 16,
			y: 18,
			trigger: "talk",
			run: async (s) => {
				await s.narrate("二本目の通りのベンチ。\nこっちは、ひなたぼっこ用だ。");
			},
		},
		{
			id: "hata",
			x: 26,
			y: 18,
			trigger: "talk",
			run: async (s) => {
				await s.narrate("街灯のポールに\n『歳末大売り出し』のはた。");
				await s.narrate("……まだ、秋のはじめだ。\n気がはやい。");
			},
		},
		{
			id: "arcade_lamp2",
			x: 3,
			y: 18,
			trigger: "talk",
			run: async (s) => {
				await s.narrate("こっちのアーケードの灯りは、\nすこし　オレンジ色だ。");
			},
		},

		// ── 東はし（二本目の通り）→ せんろぞいのみち（歩いて えきまえへ。地続きの拡張 2026-09-28） ──
		warp("to_senro", 35, 16, { map: "senro", x: 1, y: 7, dir: "right" }),
		warp("to_senro2", 35, 17, { map: "senro", x: 1, y: 7, dir: "right" }),
		// ── 人たち（夕方だけの町なので when は不要） ──
		// レコード店主（店のおく。3層: 初回／針の話／待機）
		npc(
			"record_oyaji",
			6,
			8,
			RECORD_OYAJI,
			async (s) => {
				if (!s.flag("seen_record_oyaji")) {
					s.set("seen_record_oyaji");
					await s.say(null, "いらっしゃい。……おっ、\nいい耳してそうな顔だ", {
						name: "レコード店主",
					});
					await s.say("kiriko", "か、顔でわかるンゴ？");
					await s.say(null, "わかるよ。ゆっくり\n見ていきな", {
						name: "レコード店主",
					});
					return;
				}
				if (!s.flag("seen_record_oyaji2")) {
					s.set("seen_record_oyaji2");
					await s.say(null, "蓄音機の針かい？\nまだ置いてるよ、おくに", {
						name: "レコード店主",
					});
					await s.say("kiriko", "……！　この店、\nしんようできるンゴ");
					await s.say(null, "はは。針がいる子は\nひさしぶりだ", {
						name: "レコード店主",
					});
					return;
				}
				await s.say(null, "閉店？　気分しだいだね。\nゆっくりしていきな", {
					name: "レコード店主",
				});
			},
			{ dir: "right" },
		),
		npc(
			"taiyaki_obachan",
			30,
			8,
			TAIYAKI_OBACHAN,
			async (s) => {
				if (!s.flag("got_taiyaki")) {
					await s.say(null, "たいやき、やいてるよ。\nあんこ、しっぽまで入り", {
						name: "たいやき屋",
					});
					const i = await s.choose(["＞＞1 ひとつ買う", "＞＞2 またこんど"], {
						cancel: 1,
					});
					if (i === 0) {
						s.se("item", { volume: 0.8 });
						await s.narrate(
							"あつあつの　たいやきを、\n紙ぶくろに　入れてくれた。",
						);
						s.set("got_taiyaki");
						// ポケットの紙もの（P0-9）。福引き (10,18) と朝の枕元（room bed）で読む
						s.set("got_fukubikiken");
						await s.narrate("おつりと　いっしょに、\n福引券を　一まい。");
						await s.say(null, "あちち、のうちに\nおたべ", {
							name: "たいやき屋",
						});
						await s.say("kiriko", "（電車まで　がまん……\nできるンゴか？）");
						return;
					}
					await s.say(null, "はいよ。にげないから、\nいつでもおいで", {
						name: "たいやき屋",
					});
					return;
				}
				await s.say(null, "まいど！　あんこは\nしっぽから？　頭から？", {
					name: "たいやき屋",
				});
				await s.say("kiriko", "……なやましい質問ンゴ");
			},
			{ dir: "down" },
		),
		npc(
			"tachiyomi",
			13,
			10,
			STUDENT,
			async (s) => {
				if (!s.flag("seen_tachiyomi")) {
					s.set("seen_tachiyomi");
					await s.say(null, "……いま、いいところ\nなんです", {
						name: "立ち読みの子",
					});
					await s.narrate("ページをめくる手が、\n止まらない。");
					return;
				}
				await s.narrate("返事がない。");
				await s.narrate("ページをめくる音だけ、\nさっきより　はやい。");
			},
			{ dir: "up" },
		),
		npc(
			"kaimono_wife",
			18,
			16,
			WIFE,
			async (s) => {
				if (!s.flag("seen_kaimono_wife")) {
					s.set("seen_kaimono_wife");
					await s.say(null, "ここのコロッケはね、\nならんでも　買うのよ", {
						name: "買いものの人",
					});
					await s.say("kiriko", "（コロッケ情報が\n多い町ンゴ）");
					return;
				}
				await s.say(null, "いそいで買うとね、\nろくなことないのよ", {
					name: "買いものの人",
				});
				await s.say("kiriko", "（人生の話ンゴ？）");
			},
			{ wander: true },
		),
		npc(
			"yaoya_oyaji",
			22,
			16,
			YAOYA,
			async (s) => {
				await s.say(null, "りんご、はしりだよ！\nすっぱいの上等！", {
					name: "八百屋",
				});
				await s.say(null, "……すっぱくないのも\nあるよ", { name: "八百屋" });
			},
			{ dir: "up" },
		),
		// 会釈だけの通行人（しらない町の、無害な他者）
		npc(
			"eshaku",
			26,
			11,
			MAN,
			async (s) => {
				await s.narrate("かるく、会釈をされた。\nしらない町でも、おなじだ。");
			},
			{ dir: "down" },
		),
	],
};
