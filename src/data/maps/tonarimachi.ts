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
// 一本目（光にぎやか。lights は "yu" 多数）: 駅・レコード店（中に入れる・店主3層と針）・
// 本屋（立ち読みの子）・ゲーセン（音だけ・入れない）・模型屋（ジオラマ・二度目に犬）・
// たいやき屋（choice・got_taiyaki）。くぼみ (10,9)(16,9)(22,9) にも見るもの。
// 二本目（すこし静か）: 純喫茶・金物屋・骨董屋（店さきに蓄音機——値札を見るキリコ）・
// 八百屋・テナント募集。
// 場面（音・光の auto/touch）: 到着・レコードの曲おわり・発車した電車・アーケードの
// きれめの夕日・すきまの空・帰りの車窓。
//
// 段と回収（2026-10-04）: もどって来た回数（seen_tonari_kita 数）で着いたときの一言と店の人のあいさつが変わる。
// この数は、入るときではなく町を出るとき（deru: 帰りの電車・せんろへの東はし）に +1 する
// （エンジンは「つづきから」でも onEnter を呼ぶので、入るときに数えると、町を出ていないのに数がふえる）。
// 店の人・立ち読みの子・すきまのねこ・八百屋・骨董屋のラジオ・中古の棚は、話すたび／見るたびに進む（numFlag）。
// 帰りの車窓は、きれめの夕日（seen_yuhi_kireme）と会釈の人（seen_eshaku_tonari。その回に会った人だけ）を拾う。
// ほかの地区が読む前振り: 針（got_hari・seen_hari_mise → room phono）・中古盤のポスター（seen_record_poster
// → room poster）・店じまい（seen_record_owari・seen_record_oyaji3・seen_arcade_lamp・seen_kissa_nioi・
// seen_yaoya_n → senro to_tonarimachi の宵・深夜・朝）。宵・深夜・朝の差は senro・room が受ける（ここは夕方だけ）。

import type {
	EventDef,
	GameState,
	MapDef,
	Story,
	TileDef,
} from "../../engine/defs";
import { npc } from "../helpers";
import { numFlag } from "../nostalgia";
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
// 会釈の人は、レコード店主（mob_man）とは別の絵にする（帰りの電車で、むかいの席にいる）
const TSUUKOU = "pub:sprites/mob_salaryman.png";

/**
 * 「おや、もどって　きたね」（前の回にも その人と話した人へ。その回の最初に話したときだけ真）。
 * 回は seen_tonari_kita（町を出るたび +1）。前に話した回はセーブに残さない（lastWave と同じ扱い）。
 * NPC の run のいちばん上で、話すたびに呼ぶ（呼ぶと、この回に話したことになる）。
 */
const lastTalk = new Map<string, number>();
const modori = (s: Story, who: string): boolean => {
	const n = numFlag(s, "seen_tonari_kita");
	const prev = lastTalk.get(who);
	lastTalk.set(who, n);
	return prev !== undefined && prev < n;
};

/** 針（record_oyaji）を　ことわった　すぐ　つぎは、すすめない（つぎの　つぎに　また　きく）。セーブしない。 */
let hariMata = false;

/**
 * 町を出る（帰りの電車 rideHome・せんろへの東はし to_senro）。もどって来た回数を +1 して、
 * その回だけの前振り（会釈の人・発車した電車）を使いきる（つぎの回に「さっきの」と言わない）。
 */
const deru = (s: Story): void => {
	s.set("seen_tonari_kita", numFlag(s, "seen_tonari_kita") + 1);
	s.set("seen_eshaku_tonari", false);
	s.set("seen_densha_sakki", false);
};

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

/**
 * 帰りの乗車演出（夕日の車窓）。座標凍結v3。
 * 夕日の行は、アーケードのきれめの夕日（seen_yuhi_kireme）を見た人だけ差しかえ（行は増やさない）。
 * 足す行は、たいやき（got_taiyaki）と会釈の人（seen_eshaku_tonari。その回に会った人だけ）の2つまで。
 */
const rideHome = async (s: Story): Promise<void> => {
	await s.fadeOut(600);
	s.se("train", { volume: 0.7 });
	await s.wait(900);
	await s.narrate("――ガタン、ゴトン。");
	await s.narrate("アーケードの灯りが、\nうしろへ　ながれていく。");
	await s.narrate(
		s.flag("seen_yuhi_kireme")
			? "路地の　きれめの　夕日が、\n川の　うえまで　ついてきた。"
			: "夕日が、川をわたるあいだ\nずっと　ついてきた。",
	);
	if (s.flag("got_taiyaki"))
		await s.narrate("ふくろの中の　たいやきが、\nまだ　あたたかい。");
	// 会釈だけの通行人（eshaku）が、おなじ電車の　むかいの席にいる（deru で使いきる）
	if (s.flag("seen_eshaku_tonari"))
		await s.narrate("むかいの　席で、さっきの\n人が　会釈を　した。");
	s.se("train", { volume: 0.4, pan: -0.3 });
	await s.wait(400);
	deru(s);
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
		{ x: 3, y: 18, r: 3, color: "#ffcc88", only: "yu" }, // 街灯（南西。二本目は一本目よりオレンジ）
		{ x: 26, y: 18, r: 3, color: "#ffcc88", only: "yu" }, // 街灯（南東）
	],
	onEnter: async (s) => {
		// 数はふやさない（出るときの deru で数える）。はじめからやり直したときや、
		// 前より古いセーブを読んだときは、店の人の「前に話した回」のメモを消す
		const n = numFlag(s, "seen_tonari_kita");
		for (const [who, kai] of lastTalk)
			if (n === 0 || kai > n) lastTalk.delete(who);
		s.se("higurashi", { volume: 0.6 });
	},
	events: [
		// ── 着いたとき（一度だけ） ──
		// せんろぞいのみちを歩いて来た人（東はし (34,16) に着く）は、1行目が変わる
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
				await s.narrate(
					s.state.x >= 30
						? "せんろぞいの　道は、\n商店街の　はしに　出た。"
						: "アーケードの下は、\nもう　夕方の買いもの時だ。",
				);
				await s.narrate("しらない町の、しっている\nにおいがする。");
				await s.say("kiriko", "……にぎやかンゴ");
			},
		},
		// 一度出て、もどって来たとき（一度だけ。灯りは lights のまま、見え方だけ）
		{
			id: "arrive_2",
			x: 1,
			y: 0,
			trigger: "auto",
			once: true,
			when: (st) => {
				const n = st.flags.seen_tonari_kita;
				return typeof n === "number" && n >= 1;
			},
			run: async (s) => {
				await s.wait(500);
				await s.narrate(
					"アーケードの　灯りが、\nさっきより　あかるく　見える。",
				);
			},
		},

		// ── 駅（もどりの talk。座標凍結v3） ──
		{
			id: "eki_kaisatsu",
			x: 2,
			y: 9,
			trigger: "talk",
			run: async (s) => {
				// この回に発車した電車（densha_deru）を見た人には、一度だけ「つぎの」電車として
				// （seen_densha_sakki は、ここか、町を出るとき deru で使いきる）
				if (s.flag("seen_densha_sakki")) {
					s.set("seen_densha_sakki", false);
					await s.narrate("さっきの　つぎの　電車が、\nもう　入っている。");
				} else {
					await s.narrate("つきみ駅の改札。かえりの\n電車が、もう入っている。");
				}
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
		// 改札の前をとおると、一本先の電車が出ていく（一度だけ。この回のうちなら eki_kaisatsu が「つぎの」電車で拾う）
		...sceneBelt(
			"densha_deru",
			[
				[2, 10],
				[1, 11],
			],
			"seen_densha_deru",
			async (s) => {
				s.set("seen_densha_sakki");
				s.se("densha_far", { pan: -0.6, volume: 0.6 });
				await s.narrate("改札のおくで、電車が\n一本、出ていった。");
				await s.say("kiriko", "……吾輩のは、まだ\nあるンゴね？");
			},
		),

		// ── レコード店（キリコが長居する店。中に入れる） ──
		// ㉙ 窓のすみのポスター（seen_record_poster）は、部屋のかべのポスター（room poster）が拾う
		{
			id: "record_win",
			x: 6,
			y: 9,
			trigger: "talk",
			run: async (s) => {
				s.set("seen_record_poster");
				await s.narrate(
					"レコード店の窓。ジャケットが\nびっしり　ならんでいる。",
				);
				await s.narrate("窓の　すみに『中古盤、\n高価買取』の　ポスター。");
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
		// 中に入ったとき（一度だけ）。店の前で曲のおわり（record_owari）を聞いた人は、そのつぎの曲の中へ
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
				if (s.flag("seen_record_owari")) {
					await s.narrate(
						"さっき　はじまった　曲が、\n店じゅうに　ひろがっている。",
					);
					return;
				}
				await s.narrate("店のなかは、レコードの\n音で　みたされている。");
				await s.narrate("ざらざらした、いい音だ。");
			},
		},
		// 中古の棚（seen_record_tana 数）。二度目に『つきみ音頭』のドーナツ盤
		// （秋まつりのポスター matsuri_poster を見た人は、ジャケットの絵に気づく。
		// 棚の二度目のあとでポスターを見た人には、三度目より先で一度だけ。seen_tana_tsuki）
		{
			id: "record_tana",
			x: 9,
			y: 8,
			trigger: "talk",
			run: async (s) => {
				const n = numFlag(s, "seen_record_tana") + 1;
				s.set("seen_record_tana", n);
				const tsuki =
					"ジャケットの　月の絵は、\n秋まつりの　ポスターと　おなじ。";
				if (n === 1) {
					await s.narrate("中古の棚。手書きの札に\n『どれも一期一会』。");
					await s.narrate("背の字が、みんな\n日に焼けて　うすい。");
					await s.say("kiriko", "ぜんぶ聞くには、人生が\n足りないンゴ……");
					return;
				}
				if (n === 2) {
					await s.narrate("棚の　はしに、ドーナツ盤。\n『つきみ音頭』");
					if (s.flag("seen_aki_tonari")) {
						s.set("seen_tana_tsuki");
						await s.narrate(tsuki);
					}
					return;
				}
				if (s.flag("seen_aki_tonari") && !s.flag("seen_tana_tsuki")) {
					s.set("seen_tana_tsuki");
					await s.narrate("『つきみ音頭』を、\nもういちど　手に　とる。");
					await s.narrate(tsuki);
					return;
				}
				await s.narrate("『つきみ音頭』は、まだ\n棚の　はしに　ある。");
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
		// 店の前で、一曲おわる（一度だけ。音だけの場面）。seen_record_owari は record_naka と
		// senro to_tonarimachi（yoru。シャッターのおくの　レコード）が読む
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

		// ── くぼみ（店のあいだの見るもの） ──
		// 秋まつり（seen_aki_tonari → akiMatsuri: room calendar・yamamichi susuki。record_tana の二度目も読む）。
		// 夏まつりの名残を3つ見た人（seen_natsu_owari）には、一度だけキリコの一言を差しかえ
		{
			id: "matsuri_poster",
			x: 10,
			y: 9,
			sprite: JP.matsuriPoster,
			trigger: "talk",
			fixedDir: true,
			run: async (s) => {
				s.set("seen_aki_tonari");
				await s.narrate("『つきみ秋まつり』の\nポスター。");
				await s.narrate("しらない　おまつりだ。\n日づけは、らいげつ。");
				if (s.flag("seen_natsu_owari") && !s.flag("seen_matsuri_aki_kiri")) {
					s.set("seen_matsuri_aki_kiri");
					await s.say("kiriko", "（つぎは、秋ンゴ）");
					return;
				}
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
		// ㉖ 灯りの列（seen_arcade_lamp）。senro to_tonarimachi の深夜が「はしから　はしまで」を拾う
		{
			id: "arcade_lamp",
			x: 2,
			y: 12,
			trigger: "talk",
			run: async (s) => {
				s.set("seen_arcade_lamp");
				await s.narrate(
					"アーケードの灯り。はしから\nはしまで、ぜんぶ　ついている。",
				);
			},
		},
		// わすれものの水とう（seen_suito）。もちぬしは立ち読みの子（tachiyomi の3回目で取りにくる）
		{
			id: "bench_1",
			x: 10,
			y: 12,
			trigger: "talk",
			run: async (s) => {
				if (s.flag("seen_suito_kaeshi")) {
					await s.narrate(
						"水とうは、もう　ない。\nベンチが、まるく　ぬれている。",
					);
					return;
				}
				s.set("seen_suito");
				await s.narrate("ベンチ。だれかの水とうが\nわすれてある。");
				await s.narrate("……もちぬしは、たぶん\nゲーセンだ。");
			},
		},
		// アーケードのきれめ（東の路地の口）に、夕日がさしこむ（一度だけ。帰りの車窓 rideHome が拾う）
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
		// ㉖ 『モーニングやってます』（seen_kissa_nioi）。senro to_tonarimachi の朝が、シャッターの
		// すきまの　コーヒーで拾う。すきまの換気扇（sukima_kanki）・ねこ（sukima_neko）も読む
		{
			id: "kissa_door",
			x: 3,
			y: 15,
			trigger: "talk",
			run: async (s) => {
				s.set("seen_kissa_nioi");
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
		// 店のおくのラジオ（seen_kotto_radio 数）。17時台なので、まだ試合前 → はじまる → 夕日が上だけに
		{
			id: "kotto_oku",
			x: 17,
			y: 15,
			trigger: "talk",
			run: async (s) => {
				const n = numFlag(s, "seen_kotto_radio") + 1;
				s.set("seen_kotto_radio", n);
				if (n === 1) {
					await s.narrate("窓のおく、ガラスびんの\n列に、夕日がとおる。");
					await s.narrate("店のおくの　ラジオ。\n『――まもなく　プレイボール』");
					return;
				}
				if (n === 2) {
					await s.narrate("ラジオの　むこうで、\nわっと　歓声。");
					await s.say(null, "……よしっ", { name: "骨董屋" });
					return;
				}
				await s.narrate("ガラスびんの　列の、\nいちばん　上だけ　ひかる。");
			},
		},
		// 骨董屋の店さきの蓄音機（値札を見るキリコ）。⑭ seen_kotto_phono は、レコード店主の
		// 針の話（record_oyaji）と、部屋の蓄音機（room phono）が読む
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
		// 八百屋の呼びこみ（yaoya_oyaji の seen_yaoya_n）が3回目に「売りきれ」まで進むと、箱がからになる
		{
			id: "ringo_box",
			x: 20,
			y: 16,
			sprite: JP.ringoBox,
			trigger: "talk",
			fixedDir: true,
			run: async (s) => {
				if (numFlag(s, "seen_yaoya_n") >= 3) {
					await s.narrate("『つがる』の　箱は、\nからっぽだ。");
					return;
				}
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
				// ㉗ ふたつのすきま: せんろぞいのいけがきのすきま（senro sukima_ikegaki）を先に抜けた人
				if (s.flag("seen_senro_sukima"))
					await s.say("kiriko", "（いけがきの　すきまより、\nひろいンゴ）");
				await s.narrate("見あげると、空が\nほそながい。");
			},
		},
		// 換気扇（純喫茶の戸 kissa_door で、においをかいだ人には「ここから　来ていた」）
		{
			id: "sukima_kanki",
			x: 6,
			y: 14,
			trigger: "talk",
			run: async (s) => {
				await s.narrate("純喫茶の換気扇が、\nゆっくり　まわっている。");
				await s.narrate(
					s.flag("seen_kissa_nioi")
						? "コーヒーのにおいは、\nここから来ていた。"
						: "コーヒーの　においが、\nすきまに　こもっている。",
				);
			},
		},
		// すきまのねこ（seen_sukima_neko 数）。3回目に、純喫茶の勝手口から小皿が出る
		{
			id: "sukima_neko",
			x: 8,
			y: 14,
			trigger: "talk",
			run: async (s) => {
				const n = numFlag(s, "seen_sukima_neko") + 1;
				s.set("seen_sukima_neko", n);
				if (n === 1) {
					await s.narrate("室外機のうえに、ねこ。\nここの　ぬしの顔だ。");
					await s.say("kiriko", "（おじゃまします、\nンゴ……）");
					return;
				}
				if (n === 2) {
					await s.narrate("ねこは目をとじたまま、\nしっぽだけ　ふった。");
					return;
				}
				if (n === 3) {
					// 純喫茶の戸（seen_kissa_nioi）を見ていない人には、どこの戸かは言わない
					await s.narrate(
						s.flag("seen_kissa_nioi")
							? "純喫茶の　勝手口が　あいて、\n小皿が　ひとつ　おかれた。"
							: "となりの　勝手口が　あいて、\n小皿が　ひとつ　おかれた。",
					);
					await s.narrate("ねこが、やっと　目を\nあけた。");
					return;
				}
				await s.narrate("小皿は、もう　からっぽだ。");
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
		// 2032/9/13（月）の一週間あと＝9/20（月）が敬老の日
		{
			id: "hata",
			x: 26,
			y: 18,
			trigger: "talk",
			run: async (s) => {
				await s.narrate("街灯の　ポールに、\n『敬老の日　大売り出し』。");
				await s.narrate("……来週の　月曜だ。");
			},
		},

		// ── 東はし（二本目の通り）→ せんろぞいのみち（歩いて えきまえへ。地続きの拡張 2026-09-28） ──
		// （warp ヘルパではなく、出る前に deru で数える touch。座標は同じ）
		...(
			[
				["to_senro", 16],
				["to_senro2", 17],
			] as const
		).map(
			([id, y]): EventDef => ({
				id,
				x: 35,
				y,
				trigger: "touch",
				through: true,
				run: async (s) => {
					deru(s);
					await s.warp("senro", 1, 7, "right");
				},
			}),
		),
		// ── 人たち（夕方だけの町なので when は不要） ──
		// レコード店主（店のおく。初回／2回目／閉店の話）。
		// ⑭ 蓄音機の針: 骨董屋の蓄音機（seen_kotto_phono）を見た人だけ、キリコが針をたずねる
		// （2回目。蓄音機をあとで見た人は、そのつぎに話したとき）。seen_hari_mise・got_hari は room phono が読む。
		// 「またこんど」のあとも、店主が「針、もってくかい？」とまたすすめる（ことわったすぐつぎは、はさまない）。
		// ㉖ 閉店の話（seen_record_oyaji3）は senro to_tonarimachi の宵が読む
		npc(
			"record_oyaji",
			6,
			8,
			RECORD_OYAJI,
			async (s) => {
				const name = "レコード店主";
				// 前の回にも話した人へ（話すたびに呼ぶ）。使うのは、針をもう一度すすめる枝と「閉店？」の枝だけ
				const back = modori(s, "record_oyaji");
				const mata = hariMata;
				hariMata = false;
				if (!s.flag("seen_record_oyaji")) {
					s.set("seen_record_oyaji");
					await s.say(null, "いらっしゃい。……おっ、\nいい耳してそうな顔だ", {
						name,
					});
					await s.say("kiriko", "か、顔でわかるンゴ？");
					await s.say(null, "わかるよ。ゆっくり\n見ていきな", { name });
					return;
				}
				if (s.flag("seen_kotto_phono") && !s.flag("seen_hari_mise")) {
					s.set("seen_record_oyaji2");
					await s.say("kiriko", "……蓄音機の　針、\nありますンゴ？");
					await s.say(null, "蓄音機の針かい？\nまだ置いてるよ、おくに", {
						name,
					});
					s.set("seen_hari_mise");
					const i = await s.choose(["＞＞1 ひとつ買う", "＞＞2 またこんど"], {
						cancel: 1,
					});
					if (i === 0) {
						s.se("item", { volume: 0.8 });
						s.set("got_hari");
						await s.narrate("ちいさな　紙の　箱を、\nポケットに　入れた。");
					} else hariMata = true;
					await s.say(null, "はは。針がいる子は\nひさしぶりだ", { name });
					return;
				}
				if (!s.flag("seen_record_oyaji2")) {
					s.set("seen_record_oyaji2");
					await s.say(null, "いまの　盤かい？\nB面の　ほうが　いいよ", {
						name,
					});
					return;
				}
				// 「またこんど」と言った人には、あとからでも（ことわったすぐつぎは「閉店？」をはさむ）
				if (s.flag("seen_hari_mise") && !s.flag("got_hari") && !mata) {
					if (back) await s.say(null, "おや、もどって　きたね", { name });
					await s.say(null, "針、もってくかい？", { name });
					const i = await s.choose(["＞＞1 ひとつ買う", "＞＞2 またこんど"], {
						cancel: 1,
					});
					if (i === 0) {
						s.se("item", { volume: 0.8 });
						s.set("got_hari");
						await s.narrate("ちいさな　紙の　箱を、\nポケットに　入れた。");
						return;
					}
					hariMata = true;
					await s.say(null, "はいよ。おくに　あるからね", { name });
					return;
				}
				s.set("seen_record_oyaji3");
				// 前の回にも話した人には、その回の最初に一度だけ
				if (back) await s.say(null, "おや、もどって　きたね", { name });
				await s.say(null, "閉店？　気分しだいだね。\nゆっくりしていきな", {
					name,
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
				// 前の回にも話した人へ（話すたびに呼ぶ）。使うのは「まいど」の枝だけ
				const back = modori(s, "taiyaki_obachan");
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
				// 前の回にも話した人には、その回の最初に一度だけ
				if (back)
					await s.say(null, "おや、もどって　きたね", { name: "たいやき屋" });
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
			// 立ち読みの子（seen_tachiyomi 数）。3回目、ベンチの水とう（bench_1 の seen_suito）を
			// 見た人には、それがこの子のものだとわかる（seen_suito_kaeshi。ベンチ側も変わる）
			async (s) => {
				const n = numFlag(s, "seen_tachiyomi") + 1;
				s.set("seen_tachiyomi", n);
				if (n === 1) {
					await s.say(null, "……いま、いいところ\nなんです", {
						name: "立ち読みの子",
					});
					await s.narrate("ページをめくる手が、\n止まらない。");
					return;
				}
				if (n === 2) {
					await s.narrate("返事がない。");
					await s.narrate("ページをめくる音だけ、\nさっきより　はやい。");
					return;
				}
				if (s.flag("seen_suito") && !s.flag("seen_suito_kaeshi")) {
					s.set("seen_suito_kaeshi");
					await s.say("kiriko", "ベンチの　水とう、\nきみのンゴ？");
					await s.say(null, "……あっ", { name: "立ち読みの子" });
					// ベンチ (10,12) の手前 (10,11) まで。キリコが下にいるときは上の列を回る
					const p = s.state;
					await s.move(
						"tachiyomi",
						p.x === 13 && p.y === 11 ? "llldD" : "dlllD",
					);
					await s.wait(300);
					s.face("tachiyomi", "player");
					await s.narrate("水とうを　だいて、\nぺこりと　頭を　さげた。");
					return;
				}
				if (s.flag("seen_suito_kaeshi")) {
					await s.narrate("水とうを　だいて、\nまた　ページを　めくっている。");
					return;
				}
				if (n === 3) {
					await s.narrate("……ふう、と　息をついて、\n本を　棚に　もどした。");
					return;
				}
				await s.narrate("となりの　巻を、もう\nひらいている。");
			},
			{ dir: "up" },
		),
		npc(
			"kaimono_wife",
			18,
			16,
			WIFE,
			// 買いものの人（seen_kaimono_wife 数）。㉘ コロッケ: スーパーのコロッケ（got_korokke）を
			// 買った人は、キリコの返しが変わる。3回目には、ならんで買ってきている
			async (s) => {
				const name = "買いものの人";
				const n = numFlag(s, "seen_kaimono_wife") + 1;
				s.set("seen_kaimono_wife", n);
				if (n === 1) {
					await s.say(
						null,
						"この先の　肉屋の　コロッケは、\nならんでも　買うのよ",
						{ name },
					);
					await s.say(
						"kiriko",
						s.flag("got_korokke")
							? "（うちの　町のは、\n半額だったンゴ）"
							: "（コロッケ、どこの\n店ンゴ……）",
					);
					return;
				}
				if (n === 2) {
					await s.say(null, "いそいで買うとね、\nろくなことないのよ", {
						name,
					});
					await s.say("kiriko", "（人生の話ンゴ？）");
					return;
				}
				if (n === 3) {
					await s.narrate("うでに、肉屋の\n紙ぶくろ。");
					await s.say(null, "ほらね、ならんだ　かい\nあったわ", { name });
					return;
				}
				await s.narrate("紙ぶくろから、あげたての\nにおいが　する。");
			},
			{ wander: true },
		),
		// 八百屋（seen_yaoya_n 数。話すたび +1）: 呼びこみ → しまいの値下げ → 売りきれ。
		// ㉖ senro to_tonarimachi の朝（だいこんの箱）と、りんごの箱（ringo_box）が読む
		npc(
			"yaoya_oyaji",
			22,
			16,
			YAOYA,
			async (s) => {
				const n = numFlag(s, "seen_yaoya_n") + 1;
				s.set("seen_yaoya_n", n);
				if (n === 1) {
					await s.say(null, "りんご、はしりだよ！\nすっぱいの上等！", {
						name: "八百屋",
					});
					await s.say(null, "……すっぱくないのも\nあるよ", { name: "八百屋" });
					return;
				}
				if (n === 2) {
					await s.say(null, "もう　しまいだ！\nつがる、三つで　百円！", {
						name: "八百屋",
					});
					return;
				}
				await s.say(null, "……きょうは、もう\n売りきれだ", { name: "八百屋" });
			},
			{ dir: "up" },
		),
		// 会釈だけの通行人（しらない町の、無害な他者）。seen_eshaku_tonari を、帰りの電車
		// （rideHome）の　むかいの席が拾う（その回だけ。町を出るとき deru で消え、また話せば立つ）
		npc(
			"eshaku",
			26,
			11,
			TSUUKOU,
			async (s) => {
				s.set("seen_eshaku_tonari");
				await s.narrate("かるく、会釈をされた。\nしらない町でも、おなじだ。");
			},
			{ dir: "down" },
		),
	],
};
