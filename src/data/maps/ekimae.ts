// えきまえ（本物の駅）。docs/content-briefs.md「日常の町 拡張」・docs/style-everyday.md。
// 32×18・outdoor・BGM null。工事囲いの「偽の駅口」（street 深夜）との対比の要＝
// こちらは昼夜のある、生きている駅。ノスタルジーが本体・怪異はおまけ（kaisatsu のみ）。
//
// 時間帯の四つの顔:
//   夕方  … 生きた駅前。NPC 4体（キオスクのおばちゃん・タクシーの運転手・
//           伝言板の男の子・ベンチのじいちゃん）。改札から となりまち へ乗れる
//   宵    … 晩ごはんのあとの任意の散歩（docs/nostalgia.md P0-1）。NPC 0体。駅はまだ動いている
//           （ホームのあかり・時計は 20 時台で地区を回るたびに進む＝yoruClock。ほかの時計より1分すすむ）。
//           タクシーは本日終了、改札は「きょうは、やめとく」。文は におい・音・点いた灯り だけ
//   深夜  … 無人。駅舎のシャッターが降りている。違和感は kaii `kaisatsu`
//           （シャッターの奥からかすかな改札機の音・s.note）ただ一つ。
//           じはんきで温かい缶が一本買える（nostalgia.md P0-6。地区を移るたびに冷める＝kanTick）
//   朝    … NPC 3体（仲直りの男の子×2・搬入の運転手）。伝言板の書き込みが
//           1つ増えている。スーパーの前に開店前のトラック（suupaa の payoff）
//
// 座標凍結v3:
//   東端 (31,9) → kokudo (1,10)／kokudo からの着地 (30,9)
//   スーパー入口 (10,4) → suupaa (10,12)（夕のみ。他は「シャッターが　おりている。」）
//   改札 talk (5,8)（夕のみ乗車演出 → tonarimachi (3,10)。宵「最終まで、まだ　ある。」
//   深夜「最終電車は　出たあとだ。」朝「まだ　動いていない。」）／tonarimachi からの着地 (5,9)

import type {
	EventDef,
	GameState,
	MapDef,
	Story,
	TileDef,
} from "../../engine/defs";
import { npc, warp } from "../helpers";
import { kanShinya, kanTick, yoruAkubi, yoruClock } from "../nostalgia";
import { DOOR, JP, TOWN, WALL, WIN } from "../tiles";

// ── タイル ──
// TOWN をベースに駅まわりを足す。
//   i  キオスクの中の床   =  キオスクのカウンター（むこうのおばちゃんに話しかけられる）
//   c  大きな窓（白壁の下段。窓口・スーパーの店先）   o  しまった戸（白壁）
//   G  改札口（駅舎の入口。talk イベントを置く）
const PAVE = JP.pave;
const WIN_LOW_WHITE = WIN.sash;
const tiles: Record<string, TileDef> = {
	...TOWN,
	i: { layers: [PAVE], color: "#9a9a9a", passable: true },
	"=": {
		layers: [PAVE, JP.counterM],
		color: "#b8905a",
		passable: false,
		counter: true,
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
	G: {
		layers: [WALL.sidingLo, DOOR.shop],
		color: "#c8c8c8",
		passable: false,
	},
};

// 北西＝駅舎（窓口・時刻表・キオスク・改札）。北＝スーパーみなみの店先（入口 (10,4)）と
// 店うらの小路（x17。古い駅名標の置き場＝寄り道）。東＝交番・売地・民家。
// 南＝ロータリー（噴水・バスのりば・タクシーのりば）と自転車おきば。西端 x0 は線路の柵。
const rows = [
	"                                ", // y0
	"        nnnnnnnnn               ", // y1  スーパーの屋根
	"        ^^^^^^^^^.xx            ", // y2  店うら。ビールケース (18,2)(19,2)
	"        (w$w(w(w(...            ", // y3  スーパーの看板 (10,3)・古い駅名標 (18,3)
	"        )cdc)c)c)...            ", // y4  スーパー入口 (10,4)・ちらし (9,4)・窓 (11,4)・営業時間 (13,4)
	"faaaaaaaa........... aaa        ", // y5  スーパーからの戻り (10,5)・搬入の運転手 (12,5)朝
	"fAAAAAAAA........... AAA ,T,,T, ", // y6  駅舎の屋根・交番の屋根
	"f(w(((wi(........... (w( ,,,,,, ", // y7  キオスクのおばちゃん (7,7)夕
	"f)c))G)=)........... )o) ,,!,,, ", // y8  公衆電話 (1,8)・窓口 (2,8)・改札 (5,8)・キオスク (7,8)・交番 (22,8)・売地 (27,8)
	"f:::::::::::::::::::::::::::::::", // y9  大どおり。tonarimachi からの着地 (5,9)・kokudo へ (31,9)・着地 (30,9)
	" :*&:::L:Kk::::!:V:L,,,,,,L,,,, ", // y10 駅名の柱 (1,10)・花だん (2,10)(3,10)・伝言板 (9,10)(10,10)・時計 (13,10)・案内図 (15,10)・じはんき (17,10)
	" ,||..|,,,::::::::::,nnnnn,,,,, ", // y11 自転車おきばの入口 (4,11)(5,11)・朝の男の子 (9,11)(10,11)
	" ,|...|,!,::000:::!:,^^^^^,,,,, ", // y12 バスのりば (8,12)・タクシーのりば (18,12)
	" ,|...|Bb,::000:::::,(w(w(,P,,, ", // y13 ベンチ (7,13)(8,13)・じいちゃん (9,13)夕・運転手 (18,13)夕・庭木 (27,13)
	" ,|||||,,,::0O0:::::,)c)o),,,,, ", // y14 噴水 (13,14)・いのうえさん家の窓 (22,14)・ひょうさつ (24,14)
	" ,,,,,,,,,::::::::::,,,,,,,,,,, ", // y15 ロータリーの南のこみち
	" |||||T|||||||||||||||||T|||||| ", // y16 たんぼの柵 (12,16)
	"                                ", // y17
];

// ── モブの歩行グラ（同梱の RPGEN DQ 風） ──
const CHILD = "pub:sprites/mob_child.png";
const KIOSK_LADY = "pub:sprites/mob_obachan.png";
const DRIVER = "pub:sprites/mob_salaryman.png";
const OLDMAN = "pub:sprites/mob_ojiichan.png";
const WORKER = "pub:sprites/mob_worker.png";

/**
 * 環境音のワンショット（ヒグラシ／スズメ）。street.ts と同じ方式：直前に鳴らした帯を
 * モジュール変数で覚えて連打を防ぐ（音だけの状態なのでセーブしない）。
 */
let lastWave = "";
const wave = (id: string, pan: number) => async (s: Story) => {
	if (lastWave === id) return;
	lastWave = id;
	const t = s.flag("tod");
	if (t === "yu") s.se("higurashi", { pan, volume: 0.8 });
	else if (t === "asa") s.se("suzume", { pan, volume: 0.8 });
};
/** 見えない環境音の帯（大どおりの2列にまたがせる）。 */
const waveBelt = (id: string, x: number, pan: number): EventDef[] =>
	[9, 10].map((y) => ({
		id: `${id}_${y}`,
		x,
		y,
		trigger: "touch" as const,
		through: true,
		when: (st: GameState) => st.flags.tod === "yu" || st.flags.tod === "asa",
		run: wave(id, pan),
	}));

// ── 改札（夕＝乗車演出／深夜＝最終電車のあと／朝＝始発まえ） ──

const norikomi = async (s: Story): Promise<void> => {
	await s.narrate("改札のおくから、ホームの\nアナウンスが　きこえる。");
	const i = await s.choose(["＞＞1 となりまちへ　行く", "＞＞2 やめておく"], {
		cancel: 1,
	});
	if (i !== 0) {
		await s.say("kiriko", "……また今度ンゴ");
		return;
	}
	await s.narrate("きっぷを　買った。\nとなりまちまで、150円。");
	s.se("tick", { volume: 0.8 });
	await s.narrate("かちん、と改札を　とおる。");
	s.set("seen_tonarimachi");
	await s.fadeOut(600);
	s.se("train", { volume: 0.8 });
	await s.wait(1000);
	await s.narrate("――夕日が、ながれていく。");
	await s.wait(400);
	await s.warp("tonarimachi", 3, 10, "down");
};

/**
 * 深夜の脇道怪異 `kaisatsu`（担当分はこれだけ）。駅に近づくと一度だけ、
 * シャッターの奥からかすかに改札機の音。無音の駅前でだけ効く＝SEは小さく。
 */
const kaisatsuOto = async (s: Story): Promise<void> => {
	if (s.flag("seen_kaisatsu_oto")) return;
	s.set("seen_kaisatsu_oto");
	await s.wait(300);
	s.se("tick", { volume: 0.5, pan: -0.2 });
	await s.wait(500);
	s.se("tick", { volume: 0.4, pan: -0.2 });
	await s.narrate("シャッターのおくで、\nかちり、と　音がした。");
	await s.narrate("……改札の音、だった\n気がする。");
	await s.narrate("耳をすますと、もう\nなにも　しない。");
	await s.note("kaisatsu");
};

export const ekimae: MapDef = {
	id: "ekimae",
	// ジオラマ表示の箱。場面ごとに区切る（engine/diorama.ts の boxFor）
	boxes: [
		{ x: 8, y: 0, w: 13, h: 5 }, // スーパー
		{ x: 0, y: 5, w: 9, h: 5 }, // 駅舎
		{ x: 9, y: 5, w: 12, h: 5 }, // 駅前
		{ x: 21, y: 5, w: 11, h: 5 }, // 東の家並み
		{ x: 0, y: 10, w: 16, h: 7 }, // ロータリーの西
		{ x: 16, y: 10, w: 16, h: 7 }, // ロータリーの東
	],
	name: "えきまえ",
	bgm: null,
	outdoor: true,
	outside: "#0d0b09",
	tiles,
	rows,
	// 光源（docs/night-fx.md §2）。駅舎の窓は "yu,yoru"・キオスクは夕だけ・
	// 街灯と自販機と交番は夜ふけ（深夜の交番は「あかりだけ、ついている」＝説明つきの安心）
	lights: [
		{ x: 2, y: 7, r: 2, only: "yu,yoru" },
		{ x: 6, y: 7, r: 2, only: "yu,yoru" },
		{ x: 2, y: 8, r: 2, only: "yu,yoru" },
		{ x: 7, y: 8, r: 2, color: "#ffdf9e", only: "yu" },
		{ x: 9, y: 4, r: 3, color: "#cfe4ff", only: "yu" },
		{ x: 13, y: 4, r: 3, color: "#cfe4ff", only: "yu" },
		{ x: 7, y: 10, r: 3, color: "#ffdf9e", only: "yoru,shinya" },
		{ x: 19, y: 10, r: 3, color: "#ffdf9e", only: "yoru,shinya" },
		{ x: 26, y: 10, r: 3, color: "#ffdf9e", only: "yoru,shinya" },
		{ x: 17, y: 10, r: 1.5, color: "#eef4ff", only: "yoru,shinya" },
		{ x: 22, y: 7, r: 2, only: "yoru,shinya" },
		{ x: 22, y: 14, r: 2, only: "yu,yoru" },
	],
	// 入るたびに環境音を一波（夕方＝ヒグラシ／朝＝スズメ。宵・深夜は鳴らさない）。
	// 深夜は手の缶が一段さめる（kanTick。文は出さない）
	onEnter: async (s) => {
		lastWave = "";
		kanTick(s);
		const t = s.flag("tod");
		if (t === "yu") s.se("higurashi", { volume: 0.8 });
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
				s.se("densha_far", { pan: -0.5, volume: 0.6 });
				await s.wait(900);
				await s.narrate("ホームのほうから、電車の\n出ていく音がした。");
				await s.say("kiriko", "……駅前まで来たの、\nひさしぶりンゴ");
			},
		},
		// 宵（電車はまだ動いている。夕方と同じ遠い音を、すこし小さく。4地区目あたりであくび＝yoruAkubi）
		{
			id: "arrive_yoru",
			x: 3,
			y: 0,
			trigger: "auto",
			once: true,
			when: (st) => st.flags.tod === "yoru",
			run: async (s) => {
				await s.wait(500);
				s.se("densha_far", { pan: -0.5, volume: 0.4 });
				await s.wait(700);
				await s.narrate("駅舎の窓から、ホームの\nあかりが　もれている。");
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
				await s.narrate("駅のあかりは、きえている。");
				await s.wait(400);
				await s.narrate("じぶんの足音が、\nロータリーに　ひびく。");
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
				s.se("suzume", { volume: 0.8 });
				await s.wait(600);
				await s.narrate("ロータリーに、朝の光。");
				await s.narrate("スーパーの前に、トラックが\nとまっている。");
			},
		},

		// ── 出入り口（座標凍結v3） ──
		warp("to_kokudo", 31, 9, { map: "kokudo", x: 1, y: 10, dir: "right" }),
		// スーパー入口（夕のみ。他の時間帯は通さない）
		{
			id: "suupaa_in",
			x: 10,
			y: 4,
			trigger: "touch",
			through: true,
			run: async (s) => {
				if (s.flag("tod") === "yu") {
					await s.warp("suupaa", 10, 12, "up", { se: "doorbell" });
					return;
				}
				await s.narrate("シャッターが　おりている。");
				if (s.flag("tod") === "asa")
					await s.narrate("おくで、はこを置く音が\nしている。");
				await s.move("player", "d");
			},
		},
		// 改札（夕のみ乗車。tonarimachi からの帰りは (5,9) に着く）。
		// 宵は乗れるのに乗らない＝キリコが自分で決める夜（nostalgia.md P0-1・nightwalk K）
		{
			id: "kaisatsu_gate",
			x: 5,
			y: 8,
			trigger: "talk",
			run: async (s) => {
				const t = s.flag("tod");
				if (t === "yu") {
					await norikomi(s);
					return;
				}
				if (t === "yoru") {
					await s.narrate("最終まで、まだ　ある。");
					await s.say("kiriko", "……きょうは、\nやめとくンゴ");
					return;
				}
				if (t === "shinya") {
					await s.narrate("シャッターが　おりている。");
					await s.narrate("最終電車は　出たあとだ。");
					return;
				}
				if (t === "asa") {
					await s.narrate("改札のおくは、まだ\nうすぐらい。");
					await s.narrate("まだ　動いていない。");
					return;
				}
				await s.narrate("改札だ。");
			},
		},

		// ── 深夜、駅の前で一度だけ（脇道怪異 kaisatsu） ──
		...[4, 5, 6].map(
			(x): EventDef => ({
				id: `kaisatsu_oto_${x}`,
				x,
				y: 9,
				trigger: "touch",
				through: true,
				when: (st) => st.flags.tod === "shinya" && !st.flags.seen_kaisatsu_oto,
				run: kaisatsuOto,
			}),
		),

		// ── 環境音の帯（夕方＝ヒグラシ／朝＝スズメ） ──
		...waveBelt("wave_w", 12, -0.2),
		...waveBelt("wave_e", 22, 0.3),

		// ── 夕方の人たち（くだらない雑談だけ。説明しない） ──
		npc(
			"kiosk_lady",
			7,
			7,
			KIOSK_LADY,
			async (s) => {
				if (!s.flag("seen_kiosk")) {
					s.set("seen_kiosk");
					await s.say(null, "いらっしゃい。\nゆうかんかい？", {
						name: "売店のおばちゃん",
					});
					await s.say("kiriko", "ガム、いくら？");
					await s.say(null, "30円。おまけは\nつかないよ", {
						name: "売店のおばちゃん",
					});
					await s.say("kiriko", "……きびしいンゴ");
					return;
				}
				if (!s.flag("seen_kiosk2")) {
					s.set("seen_kiosk2");
					await s.say(null, "この売店？　駅と\nおんなじだけ、やってるよ", {
						name: "売店のおばちゃん",
					});
					await s.say("kiriko", "駅は　なんねんンゴ？");
					await s.say(null, "さあ。……わたしより、\nうえだね", {
						name: "売店のおばちゃん",
					});
					return;
				}
				await s.say(null, "ゆうかん、のこり\n二部だよ", {
					name: "売店のおばちゃん",
				});
			},
			{ dir: "down", when: (st) => st.flags.tod === "yu" },
		),
		npc(
			"takushii",
			18,
			13,
			DRIVER,
			async (s) => {
				if (!s.flag("seen_takushii")) {
					s.set("seen_takushii");
					await s.say(null, "お、のってくかい", { name: "運転手" });
					await s.say("kiriko", "あるいて帰れる\nきょりンゴ");
					await s.say(null, "だろうねえ。ここらは\nみんな　そうだ", {
						name: "運転手",
					});
					await s.say(null, "17時42分のを　まって、\nきょうは　しまいよ", {
						name: "運転手",
					});
					return;
				}
				await s.say(null, "ナイターの中けいが\nはじまっちまう", {
					name: "運転手",
				});
			},
			{ dir: "left", when: (st) => st.flags.tod === "yu" },
		),
		npc(
			"yuu_yu",
			11,
			10,
			CHILD,
			async (s) => {
				if (!s.flag("seen_ekimae_yuu")) {
					s.set("seen_ekimae_yuu");
					await s.say(null, "タカのやつ、先に\n行ったって", {
						name: "男の子",
					});
					await s.say("kiriko", "……まって　あげないンゴ？");
					await s.say(null, "べつに。もうちょっとだけ\nいるだけ", {
						name: "男の子",
					});
					return;
				}
				await s.say(null, "……もう　ちょっとだけ", { name: "男の子" });
			},
			{ dir: "left", when: (st) => st.flags.tod === "yu" },
		),
		npc(
			"jiichan",
			9,
			13,
			OLDMAN,
			async (s) => {
				if (!s.flag("seen_ekimae_jii")) {
					s.set("seen_ekimae_jii");
					await s.say(
						null,
						"電車はねえ、乗らなくても\n見てるだけでいいんだよ",
						{
							name: "じいちゃん",
						},
					);
					await s.say("kiriko", "タダだしンゴ");
					await s.say(null, "はは。そういうことは\n言うもんじゃない", {
						name: "じいちゃん",
					});
					return;
				}
				await s.say(null, "ゆうがたのは、よく\nこんでる。……えらいねえ", {
					name: "じいちゃん",
				});
			},
			{ dir: "left", when: (st) => st.flags.tod === "yu" },
		),

		// ── 朝の人たち（伝言板の payoff・スーパーの搬入） ──
		npc(
			"taka_asa",
			9,
			11,
			CHILD,
			async (s) => {
				await s.say(null, "ごめんって、ちゃんと\n黒板に書いたのに", {
					name: "タカ",
				});
				await s.say(null, "じが　へたで　よめない", { name: "男の子" });
				await s.say(null, "へたって　言うな", { name: "タカ" });
			},
			{ dir: "right", when: (st) => st.flags.tod === "asa" },
		),
		npc(
			"yuu_asa",
			10,
			11,
			CHILD,
			async (s) => {
				await s.say(null, "きょうは、いっしょに\n行ってやるんだ", {
					name: "男の子",
				});
			},
			{ dir: "left", when: (st) => st.flags.tod === "asa" },
		),
		npc(
			"truck_asa",
			12,
			5,
			WORKER,
			async (s) => {
				if (!s.flag("seen_ekimae_truck")) {
					s.set("seen_ekimae_truck");
					await s.narrate(
						"トラックから、ぎゅうにゅうの\nケースを　おろしている。",
					);
					await s.say(null, "店があくのは　10時。\nうちらは、その前が仕事よ", {
						name: "運転手",
					});
					await s.say("kiriko", "……ごくろうさまンゴ");
					return;
				}
				await s.say(null, "よっ……こい、しょ", { name: "運転手" });
			},
			{ dir: "up", when: (st) => st.flags.tod === "asa" },
		),

		// ── 駅舎（公衆電話・窓口・時刻表・うんちん表・ポスター・キオスクの店じまい） ──
		{
			id: "denwa",
			x: 1,
			y: 8,
			trigger: "talk",
			run: async (s) => {
				if (!s.flag("seen_ekimae_phone")) {
					s.set("seen_ekimae_phone");
					await s.narrate("駅舎のかべに、みどりの\n公衆電話。");
					await s.narrate("つかいかたを、もう\nおもいだせない。");
					return;
				}
				await s.narrate("おつりの口に、10円が\nのこっている。");
				await s.say("kiriko", "……もらっていいンゴ？");
				await s.narrate("やめておいた。");
			},
		},
		{
			id: "madoguchi",
			x: 2,
			y: 8,
			trigger: "talk",
			run: async (s) => {
				const t = s.flag("tod");
				if (t === "shinya") {
					await s.narrate("窓口も、しまっている。");
					return;
				}
				if (t === "asa") {
					await s.narrate("窓口のおくで、ほうきの\n音がする。");
					return;
				}
				// 宵はラジオを出さない（延長の実況が聞こえるラジオは kokudo のスタンドの事務所だけ。P0-2）
				if (t === "yoru") {
					await s.narrate(
						"窓口に、あかり。おくで\n駅員さんが　日誌を　書いている。",
					);
					return;
				}
				await s.narrate("窓口のおく、ちいさな\nラジオが　鳴っている。");
			},
		},
		{
			id: "jikoku",
			x: 3,
			y: 8,
			trigger: "talk",
			run: async (s) => {
				const t = s.flag("tod");
				if (t === "shinya") {
					await s.narrate("時刻表は、くらがりの\n中だ。");
					return;
				}
				if (t === "asa") {
					await s.narrate("時刻表。始発までは、\nまだ　だいぶある。");
					return;
				}
				// 宵の駅前の時計（yoruClock(s, 1)。いちばん進んでも 20:48）より、つねにあと
				if (t === "yoru") {
					await s.narrate("時刻表。つぎは、\n20:52　となりまち行き。");
					return;
				}
				await s.narrate("時刻表。つぎは、\n17:42　となりまち行き。");
			},
		},
		{
			id: "unchin",
			x: 4,
			y: 8,
			trigger: "talk",
			run: async (s) => {
				await s.narrate("うんちん表。『となりまち\n150円』。");
				await s.narrate("そのさきは、じが小さくて\nよめない。");
			},
		},
		{
			id: "poster",
			x: 6,
			y: 8,
			trigger: "talk",
			run: async (s) => {
				await s.narrate("『なつまつり』のポスター。\n……もう、おわったやつだ。");
				await s.narrate("はがすのを、わすれられて\nいる。");
			},
		},
		{
			id: "kiosk_closed",
			x: 7,
			y: 8,
			trigger: "talk",
			when: (st) => st.flags.tod !== "yu",
			run: async (s) => {
				if (s.flag("tod") === "asa") {
					await s.narrate("けさの新聞が、ひもで\nしばられて　とどいている。");
					return;
				}
				await s.narrate("キオスク。たなに、ぬのが\nかかっている。");
			},
		},

		// ── 駅前ひろば（駅名の柱・花だん・伝言板・時計・案内図・じはんき） ──
		{
			id: "ekimei",
			x: 1,
			y: 10,
			sprite: JP.infoSign,
			trigger: "talk",
			fixedDir: true,
			run: async (s) => {
				await s.narrate("駅の名前の柱だ。\n――『みなみ』。");
				await s.narrate("となりの駅の名前も、\nちゃんと　書いてある。");
			},
		},
		{
			id: "kadan_a",
			x: 2,
			y: 10,
			trigger: "talk",
			run: async (s) => {
				const t = s.flag("tod");
				if (t === "shinya") {
					await s.narrate("花は、とじている。");
					return;
				}
				if (t === "asa") {
					await s.narrate("もう、水が　まいてある。");
					return;
				}
				await s.narrate("花だん。マリーゴールドが\nならんでいる。");
			},
		},
		{
			id: "kadan_b",
			x: 3,
			y: 10,
			trigger: "talk",
			run: async (s) => {
				await s.narrate("『はなを　とらないで』の\nちいさな札。");
				await s.narrate("じが、ていねいだ。");
			},
		},
		{
			id: "dengonban_a",
			x: 9,
			y: 10,
			trigger: "talk",
			run: dengonban,
		},
		{
			id: "dengonban_b",
			x: 10,
			y: 10,
			trigger: "talk",
			run: dengonban,
		},
		{
			id: "tokei",
			x: 13,
			y: 10,
			sprite: JP.clockPole,
			trigger: "talk",
			fixedDir: true,
			run: async (s) => {
				const t = s.flag("tod");
				if (t === "shinya") {
					await s.narrate("駅前の時計。――2:00。");
					return;
				}
				if (t === "asa") {
					await s.narrate("駅前の時計。――7:03。\n秒しんが、うごいている。");
					return;
				}
				// 宵は 20 時台。地区を回るたびに数分ずつ進む（ほかの時計より1分すすんでいる＝off 1）
				if (t === "yoru") {
					await s.narrate(`駅前の時計。――${yoruClock(s, 1)}。`);
					return;
				}
				await s.narrate("駅前の時計。――17:15。");
				await s.narrate("文字盤が、夕日で\nオレンジ色だ。");
			},
		},
		{
			id: "annaizu",
			x: 15,
			y: 10,
			trigger: "talk",
			run: async (s) => {
				await s.narrate("『えきまえ　あんない』。\n手がきの地図だ。");
				await s.narrate("スーパーのところに、\n二重まる。『やすい』。");
			},
		},
		{
			id: "jihanki",
			x: 17,
			y: 10,
			trigger: "talk",
			run: async (s) => {
				s.se("hum", { volume: 0.6 });
				const t = s.flag("tod");
				// 深夜は温かい缶が一本買える（買ったあとは再調べで いまの温度。nostalgia.md P0-6）
				if (t === "shinya") {
					await s.narrate("あかりだけ、ついている。\nひくい　うなり。");
					await kanShinya(s);
					return;
				}
				if (t === "asa") {
					await s.narrate("うりきれランプが、\nひとつ　ふえている。");
					return;
				}
				// 宵は、はしの一列が赤い札（深夜の缶の前ぶり。street vending_ev と同じ仕込み）
				if (t === "yoru") {
					await s.narrate("じはんき。はしの一列だけ、\n札が　あかい。");
					return;
				}
				await s.narrate("じはんき。かえりに\n一本、まよう。");
			},
		},

		// ── ロータリー（バスのりば・ベンチ・噴水・タクシーのりば） ──
		{
			id: "busstop",
			x: 8,
			y: 12,
			trigger: "talk",
			run: async (s) => {
				const t = s.flag("tod");
				if (t === "shinya") {
					await s.narrate("さいしゅうバスは、\nとっくに　出たあとだ。");
					return;
				}
				if (t === "asa") {
					await s.narrate("一番バスまで、まだ\n時間がある。");
					return;
				}
				// 宵は時こくの数字を出さない（kokudo のバス停の「さいしゅうは22時10分」とぶつけない）
				if (t === "yoru") {
					await s.narrate("バスのりば。時刻表の\nさいしゅうだけ、赤い字。");
					return;
				}
				await s.narrate("バスのりば。つぎは\n18:05　だんち行き。");
			},
		},
		{
			id: "bench_ev",
			x: 7,
			y: 13,
			trigger: "talk",
			run: async (s) => {
				const t = s.flag("tod");
				if (t === "shinya") {
					await s.narrate("ベンチは、夜つゆに\nぬれている。");
					return;
				}
				if (t === "asa") {
					await s.narrate("新聞が、たたんで\nおいてある。");
					await s.narrate("よみおわった、\nだれかのだ。");
					return;
				}
				await s.narrate("木のベンチ。すわる場所が\nつやつやに　なっている。");
			},
		},
		{
			id: "funsui",
			x: 13,
			y: 14,
			trigger: "talk",
			run: async (s) => {
				const t = s.flag("tod");
				if (t === "shinya") {
					await s.narrate("とまっている。水面に、\n街灯がうつっている。");
					return;
				}
				if (t === "asa") {
					await s.narrate("まだ　とまったまま。\n水面が、たいらだ。");
					return;
				}
				await s.narrate("ちいさな噴水。ときどき、\n思い出したように　ふく。");
			},
		},
		{
			id: "taxi_stand",
			x: 18,
			y: 12,
			trigger: "talk",
			run: async (s) => {
				const t = s.flag("tod");
				if (t === "shinya") {
					await s.narrate("『タクシーのりば』。\nだれも　いない。");
					return;
				}
				if (t === "asa") {
					await s.narrate("まだ、一台も\n来ていない。");
					return;
				}
				// 宵は本日終了の札（夕方の運転手「ナイターの中けいが　はじまっちまう」の受け）。
				// 「からっぽ」とは書かない（nostalgia.md §7）
				if (t === "yoru") {
					await s.narrate("『タクシーのりば』に、\n『本日終了』の札。");
					await s.say("kiriko", "……ナイター、\n見に帰ったンゴ");
					return;
				}
				await s.narrate("『タクシーのりば』。\n一台、とまっている。");
				await s.narrate("エンジンの音だけが、\nひくく　つづいている。");
			},
		},

		// ── 自転車おきば（深夜に見た一台を、朝おぼえている） ──
		{
			id: "bikes",
			x: 2,
			y: 12,
			trigger: "talk",
			run: async (s) => {
				const t = s.flag("tod");
				if (t === "shinya") {
					s.set("seen_bike_shinya");
					await s.narrate("自転車おきば。一台だけ、\nのこっている。");
					await s.narrate("かごに、ぬれた　ざっしが\n入ったままだ。");
					return;
				}
				if (t === "asa") {
					if (s.flag("seen_bike_shinya")) {
						await s.narrate("ゆうべの一台は、\nもう　ない。");
						await s.say("kiriko", "……帰れたンゴね");
						return;
					}
					await s.narrate("自転車が、ぽつぽつ\nとまりはじめている。");
					return;
				}
				await s.narrate("自転車おきば。まえカゴの\nついたのが、ずらり。");
			},
		},
		{
			id: "sanrinsha",
			x: 6,
			y: 12,
			trigger: "talk",
			run: async (s) => {
				await s.narrate("さびた三輪車が、すみに\nとめてある。");
				// 宵は点いた灯りだけ（宵の文に「だれも」を出さない。nostalgia.md P0-1 の受け入れ条件）
				if (s.flag("tod") === "yoru") {
					await s.narrate("街灯が、さびた　ハンドルに\nうつっている。");
					return;
				}
				await s.narrate("もう、だれも\nとりにこない大きさだ。");
			},
		},
		{
			id: "okigasa",
			x: 4,
			y: 14,
			trigger: "talk",
			run: async (s) => {
				await s.narrate("フェンスに、かさが\n一本かけてある。");
				await s.narrate("みんなの　おきがさだ。");
			},
		},

		// ── 東がわ（交番・売地・いのうえさん家） ──
		{
			id: "koban",
			x: 22,
			y: 8,
			trigger: "talk",
			run: async (s) => {
				const t = s.flag("tod");
				if (t === "shinya") {
					await s.narrate(
						"あかりだけが、ついている。\n札は『じゅんかいちゅう』。",
					);
					return;
				}
				if (t === "asa") {
					await s.narrate("おまわりさんの自転車が、\nもどっている。");
					return;
				}
				await s.narrate("交番だ。『じゅんかいちゅう』\nの札が　かかっている。");
				await s.say("kiriko", "……いつ　いるンゴ？");
			},
		},
		// 売地の看板。二度目から、すみの色のぬけた『完成予想図』に気づく（来なかった未来。
		// nostalgia.md P0-8。時間帯を問わず同じ文＝変わるのではなく、気づく）
		{
			id: "urichi",
			x: 27,
			y: 8,
			trigger: "talk",
			run: async (s) => {
				if (s.flag("seen_urichi2")) {
					await s.narrate("看板のすみに、色のぬけた\n『完成予想図』。");
					await s.narrate("ガラスの駅ビルと、半そでで\n手をふる人たち。");
					await s.say("kiriko", "……みんな、えがおが\nすごいンゴ");
					return;
				}
				s.set("seen_urichi2");
				await s.narrate("『売地』の看板。\n電話番号が、きえかかっている。");
				await s.narrate("……ずっと、このままだ。");
			},
		},
		{
			id: "h_win",
			x: 22,
			y: 14,
			trigger: "talk",
			run: async (s) => {
				const t = s.flag("tod");
				if (t === "shinya") {
					await s.narrate("カーテンが　しまっている。");
					return;
				}
				if (t === "asa") {
					await s.narrate("ふとんが、ベランダに\nほしてある。");
					return;
				}
				// 宵はピアノを出さない（宵のピアノは sumire のやまだ家だけ）。おふろのあと
				if (t === "yoru") {
					await s.narrate("まどに、あかり。ゆげで\nすこし　くもっている。");
					return;
				}
				await s.narrate("まどのおく、ピアノの\nれんしゅうの音がする。");
			},
		},
		{
			id: "h_door",
			x: 24,
			y: 14,
			trigger: "talk",
			run: async (s) => {
				await s.narrate("『いのうえ』の　ひょうさつ。");
				const t = s.flag("tod");
				if (t === "shinya") {
					await s.narrate("しずかだ。");
					return;
				}
				if (t === "asa") {
					await s.narrate("テレビの天気よほうが\nきこえる。");
					return;
				}
				if (t === "yoru") {
					await s.narrate("おくで、ドライヤーの\n音がする。");
					return;
				}
				await s.narrate("ゆうげの　においがする。");
			},
		},
		{
			id: "niwaki",
			x: 27,
			y: 13,
			trigger: "talk",
			run: async (s) => {
				await s.narrate("よく手入れされた\n庭木だ。");
				await s.narrate("たぶん、日曜ごとの\n仕事だ。");
			},
		},

		// ── へり（線路の柵・たんぼの柵） ──
		{
			id: "rail_fence",
			x: 0,
			y: 9,
			trigger: "talk",
			run: async (s) => {
				await s.narrate("柵のむこうは、線路だ。");
				const t = s.flag("tod");
				if (t === "shinya") {
					await s.narrate("レールは、くらがりの\nおくへ　きえている。");
					return;
				}
				if (t === "asa") {
					await s.narrate("始発まえの線路は、\nしんとしている。");
					return;
				}
				if (t === "yoru") {
					await s.narrate("ホームのあかりが、レールに\nほそく　のびている。");
					return;
				}
				await s.narrate("レールが、夕日で\n光っている。");
			},
		},
		{
			id: "tanbo",
			x: 12,
			y: 16,
			trigger: "talk",
			run: async (s) => {
				const t = s.flag("tod");
				if (t === "shinya") {
					await s.narrate("たんぼは、くらい。\n水のにおいだけがする。");
					return;
				}
				if (t === "asa") {
					await s.narrate("たんぼの上に、うすく\nもやが　かかっている。");
					return;
				}
				await s.narrate("柵のむこうは、たんぼだ。\nかぜが、穂をなでていく。");
			},
		},

		// ── 店うらの小路（寄り道。古い駅名標） ──
		{
			id: "crates_a",
			x: 19,
			y: 2,
			trigger: "talk",
			run: async (s) => {
				await s.narrate("ビールケースと、青い\nコンテナが　つんである。");
				await s.narrate("スーパーの、うらぐちだ。");
			},
		},
		{
			id: "crates_b",
			x: 18,
			y: 2,
			trigger: "talk",
			run: async (s) => {
				await s.narrate("コンテナのすきまに、\nねこの毛が　ついている。");
			},
		},
		{
			id: "old_sign",
			x: 18,
			y: 3,
			sprite: JP.infoSign,
			trigger: "talk",
			fixedDir: true,
			run: async (s) => {
				await s.narrate("ふるい駅名標が、かべに\n立てかけてある。");
				await s.narrate("『みなみ』。――いまのより、\nじが　まるい。");
				await s.say("kiriko", "……先代ンゴか");
			},
		},

		// ── スーパーの店先（ちらし・窓・営業時間） ──
		{
			id: "chirashi",
			x: 9,
			y: 4,
			trigger: "talk",
			run: async (s) => {
				if (s.flag("tod") === "asa") {
					await s.narrate(
						"とくばいの　ちらし。けさ、\nはりかえられた　ばかりだ。",
					);
					return;
				}
				await s.narrate("きょうの　とくばい。\n『たまご・ティッシュ』。");
			},
		},
		{
			id: "mise_mado",
			x: 11,
			y: 4,
			trigger: "talk",
			run: async (s) => {
				const t = s.flag("tod");
				if (t === "shinya") {
					await s.narrate("シャッターのおくで、\nれいぞうこの音だけがする。");
					return;
				}
				if (t === "asa") {
					await s.narrate("『じゅんびちゅう』の札が\nかかっている。");
					return;
				}
				// 宵は閉店のあと（19:00 まで。入口の touch も「シャッターが　おりている。」）
				if (t === "yoru") {
					await s.narrate("シャッターのおくで、\nモップの　音がする。");
					return;
				}
				await s.narrate("店のなか、レジの音と\n放送が　きこえる。");
			},
		},
		{
			id: "eigyo",
			x: 13,
			y: 4,
			trigger: "talk",
			run: async (s) => {
				await s.narrate("『えいぎょう時間』の札。\n10:00〜19:00。");
				await s.say("kiriko", "……あさは、おそいンゴ");
			},
		},
	],
};

/** 伝言板（黒板）。書き込み3つ・朝に1つ増えている。 */
async function dengonban(s: Story): Promise<void> {
	const t = s.flag("tod");
	if (t === "shinya") {
		await s.narrate("こくばんの伝言板。くらくて、\n字が　よみにくい。");
		await s.narrate("チョークの白だけ、\nうかんで見える。");
		return;
	}
	await s.narrate("こくばんの伝言板だ。\nチョークが、ぶらさがっている。");
	await s.narrate("『さきに　行ってます　タカ』");
	await s.narrate("『ゆうかん　とりにきて\nください　――キオスク』");
	await s.narrate("『わすれものの　かさは\n駅員さんに　あずけました』");
	if (t === "asa") {
		await s.narrate("――書き込みが、ひとつ\nふえている。");
		await s.narrate("『きのうは　ごめん。\nここで　まってる　タカ』");
	}
}
