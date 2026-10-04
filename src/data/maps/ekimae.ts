// えきまえ（本物の駅）。docs/content-briefs.md「日常の町 拡張」・docs/style-everyday.md。
// 32×18・outdoor・BGM null。昼夜のある、生きている駅。ノスタルジーが本体。
//
// 時間帯の四つの顔:
//   夕方  … 生きた駅前。NPC 4体（キオスクのおばちゃん・タクシーの運転手・
//           伝言板の男の子・ベンチのじいちゃん）。改札から となりまち へ乗れる
//   宵    … 晩ごはんのあとの任意の散歩（docs/nostalgia.md P0-1）。NPC 0体。駅はまだ動いている
//           （ホームのあかり・時計は 20 時台で地区を回るたびに進む＝yoruClock。ほかの時計より1分すすむ）。
//           タクシーは本日終了、改札は「きょうは、やめとく」。文は におい・音・点いた灯り だけ
//   深夜  … 無人。駅舎のシャッターが降りている。
//           じはんきで温かい缶が一本買える（nostalgia.md P0-6。地区を移るたびに冷める＝kanTick）
//   朝    … 7時台（asaClock。始発は出たあと）。NPC 3体（仲直りの男の子×2・搬入の運転手）。
//           伝言板の書き込みが1つ増えている。スーパーの前に開店前のトラック（suupaa の payoff）
// 夕方に見たもの（10円・ゆうかん二部・ナイター・留守の交番・ちらし・穂・ねこの毛・花だんの札）を、
// 宵・深夜・朝の同じ場所が読む。朝の回収は、前振りを見た人にだけ出す（見ていない人には別の文）。
// 段と回収（2026-10-04 演出の強化）:
//   じはんき  宵 はしの一列の あかい札（seen_akafuda_eki）→ 深夜 ここで缶（seen_kan_eki）
//             → 朝 あかい札の列に うりきれランプ（缶の人だけ「ゆうべの一本で、おしまい」）
//   ねこ      夕 コンテナの毛（seen_neko_eki）→ 宵 しっぽ・深夜 毛だけ（seen_neko_sukima）
//             → 朝 まるくねている（夕か宵か深夜に すきまを見た人だけ）
//   黄色いぼうし  伝言板の書きこみ ⇄ 窓口 夕・宵（seen_madoguchi_boushi。どちらを先に見ても
//             キリコの一言は1回＝seen_boushi_dengon）→ 朝 窓口のフックがあく・男の子のあたま（yuu_asa）
//   コンテナ  夕 つんである → 宵 モップの水 → 深夜 あしたのぶん
//             → 朝 トラックの3回目（seen_ekimae_truck>=3「荷台が、からに」）のあと、ケースがおもてへ
//   自転車    夕 ずらり（seen_bike_yu）→ 宵 半分 → 深夜 一台・月曜の号（street・suupaa）→ 朝
//   男の子    朝のタカ（seen_taka_asa 数）で 仲直りが 進む
//   駅名の柱  seen_ekimei_minami → tonarimachi ekimei。となりまちに行った人には『つきみ』
//   よそから  保線の車（senro seen_senro_hosen → 朝の rail_fence）・アジフライ（suupaa seen_baa_aji
//             → 朝の chirashi）・まるい字（kokudo seen_kanban_kokudo → old_sign）
//   うんちん表  夕 『150円』（seen_unchin_eki）→ norikomi「表で　見た　150円」・tonarimachi eki_kaisatsu
//             宵 あかりで値段だけ・朝 ていきけん（通勤の人 seen_senro_tsuukin を見た人だけ一度 seen_unchin_teiki）
//   タクシー  宵・深夜 本日終了の札（宵で seen_takushii_fuda → 深夜「まだ　さがっている」）→ 朝 まだ来ない（中けい＋テレビの打ち切りを知る人だけ一言）
//
// 座標凍結v3:
//   東端 (31,9) → kokudo (1,10)／kokudo からの着地 (30,9)
//   スーパー入口 (10,4) → suupaa (10,12)（夕のみ。他は「シャッターが　おりている。」）
//   改札 talk (5,8)（夕のみ乗車演出 → tonarimachi (3,10)。宵「最終まで、まだ　ある。」
//   深夜「最終電車は　出たあとだ。」朝「ホームで　ベルが　鳴っている。」＝始発のあと・朝は乗らない）
//   ／tonarimachi からの着地 (5,9)
//   雑居ビルの戸 (15,4) → zakkyo (8,5) 上向き（いつも あいている）／zakkyo からの着地 (15,5) 下向き
//   南西 (0,15) を 左へ → norikae (38,9) 左向き（駅と駅のあいだの道。いつも 通れる）／norikae からの着地 (1,15) 右向き。
//   (0,14)(0,16) は 虚空なので、(1,15) からしか 踏めない

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
	chukeiDan,
	kanLv,
	kanShinya,
	kanTick,
	natsuOwari,
	numFlag,
	shinyaClock,
	yoruAkubi,
	yoruClock,
	yuClock,
} from "../nostalgia";
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
	"        (w$w(wW%W...            ", // y3  スーパーの看板 (10,3)・古い駅名標 (18,3)・雑居ビル (14-16,3)
	"        )cdc)c#D#...            ", // y4  スーパー入口 (10,4)・ちらし (9,4)・窓 (11,4)・営業時間 (13,4)・雑居ビルの戸 (15,4)・袖看板 (16,4)
	"faaaaaaaa........... aaa        ", // y5  スーパーからの戻り (10,5)・搬入の運転手 (12,5)朝
	"fAAAAAAAA........... AAA ,T,,T, ", // y6  駅舎の屋根・交番の屋根
	"f(w(((wi(........... (w( ,,,,,, ", // y7  キオスクのおばちゃん (7,7)夕
	"f)c))G)=)........... )o) ,,!,,, ", // y8  公衆電話 (1,8)・窓口 (2,8)・改札 (5,8)・キオスク (7,8)・交番 (22,8)・売地 (27,8)
	"::::::::::::::::::::::::::::::::", // y9  大どおり。西 (0,9)→senro・着地 (1,9)。tonarimachi からの着地 (5,9)・kokudo へ (31,9)・着地 (30,9)
	" :*&:::L:Kk::::!:V:L,,,,,,L,,,, ", // y10 駅名の柱 (1,10)・花だん (2,10)(3,10)・伝言板 (9,10)(10,10)・時計 (13,10)・案内図 (15,10)・じはんき (17,10)
	" ,||..|,,,::::::::::,nnnnn,,,,, ", // y11 自転車おきばの入口 (4,11)(5,11)・朝の男の子 (9,11)(10,11)
	" ,|...|,!,::000:::!:,^^^^^,,,,, ", // y12 バスのりば (8,12)・タクシーのりば (18,12)
	" ,|...|Bb,::000:::::,(w(w(,P,,, ", // y13 ベンチ (7,13)(8,13)・じいちゃん (9,13)夕・運転手 (18,13)夕
	" ,|||||,,,::0O0:::::,)c)o),,,,, ", // y14 噴水 (13,14)・いのうえさん家の窓 (22,14)・ひょうさつ (24,14)
	",,,,,,,,,,::::::::::,,,,,,,,,,, ", // y15 ロータリーの南のこみち。西 (0,15)→norikae・着地 (1,15)
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
	else if (t === "asa") {
		s.se("suzume", { pan, volume: 0.8 });
		// 夕方の 駅前で ヒグラシを きいた 人に、朝の 最初の 一波で 一度だけ（帯ふたつの 先に 踏んだ ほう）
		if (arrived(s, "ekimae", "yu") && !s.flag("seen_higurashi_eki")) {
			s.set("seen_higurashi_eki");
			await s.narrate(
				"きのう　ヒグラシの　ないてた\n木に、スズメが　あつまる。",
			);
		}
	}
};
/** old_sign: 国道の ファミレス看板の まるい字（kokudo seen_kanban_kokudo）を 見た 人への 一行。 */
const kanbanKokudo = (s: Story) =>
	s.say("kiriko", "（国道の　看板と、\nおなじ　まるい字ンゴ）");
/** old_sign: 国道の ファミレスの はり紙（kokudo seen_hari_famiresu）を 見た 人への 一行。 */
const hariFamiresu = (s: Story) =>
	s.say("kiriko", "（ファミレスの　はり紙も、\n下に　古いのが　あったンゴ）");

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

// ── 時刻表（宵・朝は、駅前の時計よりあとの最初の1本を出す） ──
const YORU_DEN = ["20:52", "21:24", "21:58", "22:31"] as const;
const ASA_DEN = ["7:12", "7:24", "7:41", "8:02"] as const;
/** "H:MM" を分に。 */
const toMin = (t: string): number => {
	const [h, m] = t.split(":").map(Number);
	return h * 60 + m;
};
/** いまの時計（now）よりあとの最初の1本。無ければ最後の1本。 */
const tsugiNo = (list: readonly string[], now: string): string =>
	list.find((t) => toMin(t) > toMin(now)) ?? list[list.length - 1];

// ── 改札（夕＝乗車演出／深夜＝最終電車のあと／朝＝始発のあと） ──

const norikomi = async (s: Story): Promise<void> => {
	await s.narrate("改札のおくから、ホームの\nアナウンスが　きこえる。");
	const i = await s.choose(["＞＞1 となりまちへ　行く", "＞＞2 やめておく"], {
		cancel: 1,
	});
	if (i !== 0) {
		await s.say("kiriko", "……また今度ンゴ");
		return;
	}
	// (70) 夕方の うんちん表（unchin・seen_unchin_eki）を 読んだ 人は、その 150円で 買う
	if (s.flag("seen_unchin_eki"))
		await s.narrate("表で　見た　150円で、\nきっぷを　買った。");
	else await s.narrate("きっぷを　買った。\nとなりまちまで、150円。");
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
	bgm: "@tod", // 時間帯の曲（生活音の下にごく薄く。data/index.ts の todBgm）
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
				// 夕方に 乗った 人／夕方の 駅前で 遠い音を きいた 人だけ
				if (s.flag("seen_tonarimachi"))
					await s.say("kiriko", "（乗った　電車、\nまだ　はしってるンゴ）");
				else if (arrived(s, "ekimae", "yu"))
					await s.narrate("夕方と　おなじ　方から、\nさっきより　小さい　音。");
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
				await s.narrate(
					"駅舎の　あかりは、きえている。\n入口の　街灯だけ、ついている。",
				);
				// ㉔ 丘（koen の そうがんきょう）や 峠（yamamichi）から 駅の 灯りを 見た 人だけ
				if (s.flag("seen_miharashi_eki"))
					await s.say("kiriko", "（上から　見えた　灯り、\nこれンゴね）");
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
				// 深夜に ここへ 来た人（arrive_shinya の「じぶんの足音が、ロータリーに　ひびく」）だけ
				await s.narrate(
					arrived(s, "ekimae", "shinya")
						? "ゆうべ　足音の　ひびいた\nロータリーに、朝の光。"
						: "ロータリーに、朝の光。",
				);
				await s.narrate("スーパーの前に、トラックが\nとまっている。");
			},
		},

		// ── 出入り口（座標凍結v3） ──
		warp("to_kokudo", 31, 9, { map: "kokudo", x: 1, y: 10, dir: "right" }),
		// 西は せんろぞいのみち（となりまちまで歩いて行ける。地続きの拡張 2026-09-28）
		warp("to_senro", 0, 9, { map: "senro", x: 42, y: 7, dir: "left" }),
		// 南西は のりかえのみち（ほそい商店街を 歩いて となりまちの うら口へ）
		warp("to_norikae", 0, 15, { map: "norikae", x: 38, y: 9, dir: "left" }),
		// スーパー入口（夕のみ。他の時間帯は通さない）
		{
			id: "suupaa_in",
			x: 10,
			y: 4,
			trigger: "touch",
			exit: "up",
			exitWhen: (st) => st.flags.tod === "yu",
			through: true,
			run: async (s) => {
				if (s.flag("tod") === "yu") {
					await s.warp("suupaa", 10, 12, "up", { se: "doorbell" });
					return;
				}
				await s.narrate("シャッターが　おりている。");
				if (s.flag("tod") === "asa") {
					await s.narrate("おくで、はこを置く音が\nしている。");
					// ⑱ 夕方の 店の おく（suupaa hako）の回収。マジックの『あさ』まで見た人
					// （seen_suupaa_hako2）は そちらを優先、『みなみ』だけの人は『みなみ』
					if (s.flag("seen_suupaa_hako2"))
						await s.say(
							"kiriko",
							"（マジックの　『あさ』、\nいま　あけてるンゴ）",
						);
					else if (s.flag("seen_suupaa_hako"))
						await s.say("kiriko", "（ゆうべの　『みなみ』の\nはこンゴね）");
				}
				await s.move("player", "d");
			},
		},
		// 雑居ビルの戸（いつも あいている。上の階に夜の店がある）。上へ踏む → zakkyo (8,5) 上向き。
		// zakkyo の出口からは (15,5) 下向きに着く
		warp(
			"zakkyo_in",
			15,
			4,
			{ map: "zakkyo", x: 8, y: 5, dir: "up" },
			{ se: "door" },
		),
		// 雑居ビルの袖看板。宵 あかり（seen_zakkyo_kanban）→ 深夜 きえている
		{
			id: "zakkyo_kanban",
			x: 16,
			y: 4,
			trigger: "talk",
			run: async (s) => {
				const t = s.flag("tod");
				if (t === "yoru") {
					s.set("seen_zakkyo_kanban");
					await s.narrate(
						"たての　看板に、あかり。\n『みゆき』と『東南荘』が　ひかる。",
					);
					return;
				}
				if (t === "shinya") {
					await s.narrate("たての　看板は、\nぜんぶ　きえている。");
					if (s.flag("seen_zakkyo_kanban"))
						await s.say("kiriko", "（『みゆき』も、\nおしまいンゴ）");
					await s.narrate("ビルの　入口の　蛍光灯だけ、\nついている。");
					return;
				}
				if (t === "asa") {
					await s.narrate(
						"たての　看板に、朝日。\n『テナント募集』の　札が　白い。",
					);
					return;
				}
				await s.narrate("たての　看板。『東南荘』\n『みゆき』『さくら歯科』……");
				await s.narrate("あかりは、まだ　どれも\nついていない。");
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
				// 宵は改札の音だけ（人の姿は書かない）。乗らないと決めたことを、深夜の改札が覚えている
				if (t === "yoru") {
					s.se("tick", { pan: -0.3, volume: 0.5 });
					await s.narrate("改札のおくで、かちん、と\nだれかが　とおる音。");
					await s.narrate("最終まで、まだ　ある。");
					// ④ 夕方に となりまちへ 乗った 人は、もう 乗った 日
					if (s.flag("seen_tonarimachi")) {
						await s.say("kiriko", "……きょうは、もう\n乗ったンゴ");
						return;
					}
					// 乗れるのに やめた 夜だけ（深夜の改札が「のらなかった　最終」と 読む）
					s.set("seen_kaisatsu_yoru");
					await s.say("kiriko", "……きょうは、\nやめとくンゴ");
					return;
				}
				if (t === "shinya") {
					await s.narrate("シャッターが　おりている。");
					await s.narrate("最終電車は　出たあとだ。");
					// 宵に 改札の 前で やめた 人だけ
					if (s.flag("seen_kaisatsu_yoru"))
						await s.say("kiriko", "（のらなかった　最終ンゴ）");
					return;
				}
				// 朝は始発のあと（7時台）。ベルは鳴るが、キリコは乗らない
				if (t === "asa") {
					await s.narrate("改札に、あかり。\nホームで　ベルが　鳴っている。");
					// ㉕ せんろぞいで「7時41分の」通勤の人と 話した 人だけ、一度
					if (
						s.flag("seen_senro_tsuukin") &&
						!s.flag("seen_tsuukin_kaisatsu")
					) {
						s.set("seen_tsuukin_kaisatsu");
						s.se("tick", { volume: 0.7 });
						await s.narrate(
							"さっきの　通勤の人が、\n改札を　かけぬけていった。",
						);
					}
					return;
				}
				await s.narrate("改札だ。");
			},
		},

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
					// ㊿ スーパーの おかし売り場で ガムを 見た 人（suupaa okashi の seen_suupaa_gum）。二段目だけ＝一度
					if (s.flag("seen_suupaa_gum"))
						await s.say(
							"kiriko",
							"（こっちのは、おばちゃんが\nてわたしで　くれるンゴ）",
						);
					return;
				}
				// 三段目（宵の kiosk_closed で「二部、うれた」と回収する）
				s.set("seen_kiosk_nibu");
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
				// 二段目（宵・朝の taxi_stand で回収する）
				if (!s.flag("seen_takushii_naita")) {
					s.set("seen_takushii_naita");
					await s.say(null, "ナイターの中けいが\nはじまっちまう", {
						name: "運転手",
					});
					return;
				}
				await s.say(null, "42分のが　来たら、\nおしまい", { name: "運転手" });
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
				// seen_ekimae_jii は数（1＝はじめて話した／2＝となりまちの話をした）。朝の bench_ev も読む
				const jii = numFlag(s, "seen_ekimae_jii");
				if (jii === 0) {
					s.set("seen_ekimae_jii", 1);
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
				// ④ 改札から となりまちへ 乗って 帰ってきた 人に、一度だけ
				if (jii === 1 && s.flag("seen_tonarimachi")) {
					s.set("seen_ekimae_jii", 2);
					await s.say(null, "乗ったのかい。\n……どうだった", {
						name: "じいちゃん",
					});
					await s.say("kiriko", "夕日が、ずっと\nついてきたンゴ");
					await s.say(null, "そうかい。……そりゃ、\n乗らなきゃ　見られん", {
						name: "じいちゃん",
					});
					// (62) となりまちの『敬老の日　大売り出し』（tonarimachi hata）を 見た 人だけ
					if (s.flag("seen_keirou_tonari"))
						await s.say(
							null,
							"来週は　敬老の日だと。\nわしは　まだ　わかい　つもりだ",
							{ name: "じいちゃん" },
						);
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
				// seen_taka_asa は数（話すたび +1・3で止める）。仲直りが 段で すすむ
				const n = numFlag(s, "seen_taka_asa");
				s.set("seen_taka_asa", Math.min(3, n + 1));
				if (n === 0) {
					await s.say(null, "ごめんって、ちゃんと\n黒板に書いたのに", {
						name: "タカ",
					});
					await s.say(null, "じが　へたで　よめない", { name: "男の子" });
					await s.say(null, "へたって　言うな", { name: "タカ" });
					// 夕方に「もうちょっとだけ いる」子と 話した 人だけ
					if (s.flag("seen_ekimae_yuu") && !s.flag("seen_ekimae_taka")) {
						s.set("seen_ekimae_taka");
						await s.say("kiriko", "（……まってて、\nよかったンゴね）");
					}
					return;
				}
				// 二段目。きのうの「先に　行った」を、男の子が かえす
				if (n === 1) {
					await s.say(null, "……はやく　しろよ。\nまってて　やるから", {
						name: "タカ",
					});
					await s.say(null, "きのう　まってたの、\nこっちだし", {
						name: "男の子",
					});
					return;
				}
				await s.say(null, "……いくぞ", { name: "タカ" });
			},
			{ dir: "right", when: (st) => st.flags.tod === "asa" },
		),
		npc(
			"yuu_asa",
			10,
			11,
			CHILD,
			async (s) => {
				// 黄色い ぼうし（伝言板・窓口の 夕／宵）を 見た 人だけ、一度。持ちぬしは 説明しない
				// （窓口の 朝は「フックが、ひとつ　あいている」）
				if (
					(s.flag("seen_madoguchi_boushi") || numFlag(s, "seen_dengon") & 3) &&
					!s.flag("seen_boushi_asa")
				) {
					s.set("seen_boushi_asa");
					await s.narrate("男の子の　あたまに、\n黄色い　ぼうし。");
				}
				// 夕方に「もうちょっとだけ　いる」と言った子が、一度だけ 言いわけする
				if (s.flag("seen_ekimae_yuu") && !s.flag("seen_ekimae_yuu_asa")) {
					s.set("seen_ekimae_yuu_asa");
					await s.say(null, "……べつに、まってたん\nじゃないし", {
						name: "男の子",
					});
					// taka_asa で もう 心の声を 出した 人には 重ねない
					if (!s.flag("seen_ekimae_taka"))
						await s.say("kiriko", "（まってたンゴ）");
					return;
				}
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
				// seen_ekimae_truck は数（話すたび +1・3で止める）。荷台が 段で へっていく
				const n = numFlag(s, "seen_ekimae_truck");
				s.set("seen_ekimae_truck", Math.min(3, n + 1));
				if (n === 0) {
					await s.narrate(
						"トラックから、ぎゅうにゅうの\nケースを　おろしている。",
					);
					await s.say(null, "店があくのは　10時。\nうちらは、その前が仕事よ", {
						name: "運転手",
					});
					await s.say("kiriko", "……ごくろうさまンゴ");
					// ⑱ 夕方の 店で 牛乳を おくから 取った 人だけ（suupaa milk_a）
					if (s.flag("seen_suupaa_milk")) {
						await s.say(null, "あたらしいのは、\nいつも　おくに　入れるのよ", {
							name: "運転手",
						});
						await s.say("kiriko", "（……ばれてるンゴ）");
					}
					return;
				}
				if (n === 1) {
					await s.say(null, "あと　ひとつ。\n……よっ、こい、しょ", {
						name: "運転手",
					});
					return;
				}
				await s.narrate("荷台が、からに　なった。");
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
				const t = s.flag("tod");
				if (t === "shinya") {
					await s.narrate("みどりの　ランプだけ、\nくらがりに　うかんでいる。");
					return;
				}
				// 夕方・宵に 見のこした 10円は、朝には もう ない（見た 人だけ キリコが 受ける）
				if (t === "asa" && s.flag("seen_ekimae_10en")) {
					await s.narrate("おつりの口は、からっぽだ。");
					await s.say("kiriko", "（だれかの　10円に\nなったンゴ）");
					return;
				}
				if (!s.flag("seen_ekimae_phone")) {
					s.set("seen_ekimae_phone");
					await s.narrate("駅舎のかべに、みどりの\n公衆電話。");
					await s.narrate("つかいかたを、もう\nおもいだせない。");
					return;
				}
				if (t === "asa") {
					await s.narrate("おつりの口は、からっぽだ。");
					return;
				}
				s.set("seen_ekimae_10en");
				await s.narrate("おつりの口に、10円が\nのこっている。");
				// ⑧ スーパーで「あと　10円」の ガチャの 子を 見た 人だけ
				// ガチャに もう 10円を のせた 人には、あの子の ぶんは すんでいる（suupaa gacha）
				if (s.flag("seen_gacha_10en"))
					await s.say("kiriko", "（あの子の　ぶんは、\nもう　のせたンゴ）");
				else if (s.flag("seen_gacha_kid"))
					await s.say("kiriko", "（……ガチャの子の、\nあと　10円ンゴ）");
				else await s.say("kiriko", "……もらっていいンゴ？");
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
					// 夕・宵に 窓口の よこの 黄色い ぼうし（伝言板の わすれもの）を 見た 人だけ。
					// 持ちぬしは 説明しない（ロータリーの 男の子の あたま＝yuu_asa）
					if (s.flag("seen_madoguchi_boushi")) {
						await s.narrate("窓口の　よこの　フックが、\nひとつ　あいている。");
						return;
					}
					await s.narrate("窓口のおくで、ほうきの\n音がする。");
					return;
				}
				// 宵はラジオを出さない（延長の実況が聞こえるラジオは kokudo のスタンドの事務所だけ。P0-2）。
				// 駅員の姿は書かない（宵は音と灯りだけ）
				if (t === "yoru") {
					await s.narrate("窓口に、あかり。おくで\nペンの　はしる音が　する。");
					// 夕方に 見た 人には「まだ」。見ていない 人には はじめての 1行
					await s.narrate(
						s.flag("seen_madoguchi_boushi")
							? "黄色い　ぼうしが、\nまだ　かかっている。"
							: "窓口の　よこに、黄色い\nぼうしが　かかっている。",
					);
					s.set("seen_madoguchi_boushi");
					if (numFlag(s, "seen_dengon") & 3)
						await boushiTsunagu(s, "（伝言板の　ぼうしンゴね）");
					return;
				}
				await s.narrate("窓口のおく、ちいさな\nラジオが　鳴っている。");
				// 伝言板の『わすれものの　黄色い　ぼうし』（dengonban）。朝に フックが あく
				s.set("seen_madoguchi_boushi");
				await s.narrate("窓口の　よこに、黄色い\nぼうしが　かかっている。");
				if (numFlag(s, "seen_dengon") & 3)
					await boushiTsunagu(s, "（伝言板の　ぼうしンゴね）");
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
				// 朝は始発のあと。駅前の時計（asaClock(s, 1)）よりあとの最初の1本
				if (t === "asa") {
					const tsugi = tsugiNo(ASA_DEN, asaClock(s, 1));
					await s.narrate(`時刻表。つぎは、\n${tsugi}　となりまち行き。`);
					// ㉕ せんろぞいで「7時41分の」通勤の人と 話した 人だけ。
					// 改札を かけぬけたのを 見た（seen_tsuukin_kaisatsu）あとは、もう ホーム
					if (s.flag("seen_tsuukin_kaisatsu"))
						await s.say("kiriko", "（7時41分の　ひと、\nもう　ホームンゴね）");
					else if (s.flag("seen_senro_tsuukin"))
						await s.say("kiriko", "（7時41分の　ひと、\nまにあうンゴ？）");
					return;
				}
				// 宵の駅前の時計（yoruClock(s, 1)。いちばん進んでも 21:16）よりあとの最初の1本。
				// 地区を回るほど、つぎの電車が 先へ ずれていく
				if (t === "yoru") {
					const tsugi = tsugiNo(YORU_DEN, yoruClock(s, 1));
					await s.narrate(`時刻表。つぎは、\n${tsugi}　となりまち行き。`);
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
				// 深夜は となりの 公衆電話（denwa）の みどりの ランプが ガラスに うつる
				if (s.flag("tod") === "shinya") {
					await s.narrate(
						"うんちん表の　ガラスに、\nみどりの　ランプが　うつる。",
					);
					return;
				}
				// 朝は 下の ていきけんの あんない。senro の 通勤の人（seen_senro_tsuukin）を 見た 人だけ キリコ
				if (s.flag("tod") === "asa") {
					await s.narrate("うんちん表の　下に、\nていきけんの　あんない。");
					// 一度だけ。jikoku・kaisatsu_gate の 朝と 重ねないよう「7時41分」は くり返さない
					if (s.flag("seen_senro_tsuukin") && !s.flag("seen_unchin_teiki")) {
						s.set("seen_unchin_teiki");
						await s.say("kiriko", "（さっきの　ひとの、\nていきンゴね）");
					}
					return;
				}
				// 宵は 改札の あかりで 値段だけ。夕方は 全部 読んで (70) の 前振り（→ norikomi・tonarimachi）
				if (s.flag("tod") === "yoru") {
					await s.narrate("改札の　あかりで、\n『150円』だけ　よめる。");
				} else {
					await s.narrate("うんちん表。『となりまち\n150円』。");
					await s.narrate("そのさきは、じが小さくて\nよめない。");
					s.set("seen_unchin_eki");
				}
				// ④ 改札から 乗った 人（norikomi の「夕日が、ながれていく」）
				if (s.flag("seen_tonarimachi"))
					await s.say("kiriko", "（150円で、夕日つき\nだったンゴ）");
				// ベンチの じいちゃんの「見てるだけで　いい」（jiichan）
				else if (numFlag(s, "seen_ekimae_jii") >= 1)
					await s.say("kiriko", "（見るだけなら、\nタダンゴね）");
			},
		},
		{
			id: "poster",
			x: 6,
			y: 8,
			trigger: "talk",
			run: async (s) => {
				const t = s.flag("tod");
				// 深夜は 色だけ（字は よめない。seen_natsu_eki は 立てない）
				if (t === "shinya") {
					await s.narrate(
						"ポスターの　あかい色だけ、\n入口の　街灯で　わかる。",
					);
					return;
				}
				// 朝の「つきみ」は、前に いちど このポスターを 読んだ 人だけ（朝の 1回目も ふくむ。set の前に 見る）
				const yonda = !!s.flag("seen_natsu_eki");
				s.set("seen_natsu_eki");
				await s.narrate("『なつまつり』のポスター。\n……もう、おわったやつだ。");
				await s.narrate("はがすのを、わすれられて\nいる。");
				if (t === "yoru")
					await s.narrate("はがれかけた　かどが、\nかぜで　ゆれている。");
				if (t === "asa" && yonda)
					await s.narrate("となりに、あたらしく\n『つきみ　秋まつり』。");
				await natsuOwari(s);
			},
		},
		{
			id: "kiosk_closed",
			x: 7,
			y: 8,
			trigger: "talk",
			when: (st) => st.flags.tod !== "yu",
			run: async (s) => {
				const t = s.flag("tod");
				// 深夜は シャッターの 札（朝に「7時半まで」と 回収する）
				if (t === "shinya") {
					s.set("seen_kiosk_fuda");
					await s.narrate(
						"キオスクの　シャッターに、\n『あさ　7時半から』の札。",
					);
					return;
				}
				if (t === "asa") {
					await s.narrate("けさの新聞が、ひもで\nしばられて　とどいている。");
					// 駅前の時計（asaClock(s, 1)）が 7:30 より前。札を 読んだ 人だけ 待つ
					if (toMin(asaClock(s, 1)) < toMin("7:30")) {
						if (s.flag("seen_kiosk_fuda"))
							await s.say("kiriko", "（7時半まで、もう\nすこしンゴ）");
						return;
					}
					// 7:30 をこえたら、だれにでも あきはじめる（音は 一度だけ）
					if (!s.flag("seen_kiosk_shutter")) {
						s.set("seen_kiosk_shutter");
						s.se("shutter", { volume: 0.6 });
						await s.narrate("シャッターが、ガラガラと\nあがりはじめた。");
						return;
					}
					await s.narrate("シャッターが、半分\nあがっている。");
					return;
				}
				// 宵。夕方に「のこり　二部」と 聞いた 人だけ
				if (s.flag("seen_kiosk_nibu")) {
					await s.narrate("ゆうかんの　たなは、\nたたんで　ある。");
					await s.say("kiriko", "（二部、うれたンゴね）");
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
				const t = s.flag("tod");
				// ㊳ tonarimachi ekimei が 読む（むこうの柱で「うちの柱にも」）
				s.set("seen_ekimei_minami");
				// 深夜は 入口の 街灯（arrive_shinya）で、駅の 名前だけ 見える
				if (t === "shinya") {
					await s.narrate(
						"入口の　街灯で、『みなみ』の\n字だけ　うかんでいる。",
					);
					return;
				}
				await s.narrate("駅の名前の柱だ。\n――『みなみ』。");
				// となりまちに 着いた（歩いても 電車でも）人だけ、となりの名前が 町に なる
				if (s.flag("done:tonarimachi:arrive") || s.flag("seen_tonarimachi")) {
					await s.narrate(
						t === "asa"
							? "となりの駅は　『つきみ』。\n……きのう　行った　町だ。"
							: "となりの駅は　『つきみ』。\n……さっき　行った　町だ。",
					);
					return;
				}
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
					// 花だんの 札の「ていねいな　字」を 見た 人だけ（kadan_b）
					if (s.flag("seen_kadan_fuda"))
						await s.narrate("ジョウロに、ていねいな　字で\n『みなみ駅』。");
					return;
				}
				if (t === "yoru") {
					await s.narrate("街灯で、花の　色が\nわからない。");
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
				// 深夜は くらくて、ちいさな 字は よめない（時刻表・伝言板と おなじ）
				if (s.flag("tod") === "shinya") {
					await s.narrate("ちいさな札。くらくて、\n字は　よめない。");
					return;
				}
				s.set("seen_kadan_fuda");
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
					await s.narrate(`駅前の時計。――${shinyaClock(s, 1)}。`);
					return;
				}
				// 朝は 7時台。地区を回るたびに進む（ほかの時計より1分すすんでいる＝off 1）
				if (t === "asa") {
					await s.narrate(`駅前の時計。――${asaClock(s, 1)}。`);
					return;
				}
				// 宵は 20 時台。地区を回るたびに数分ずつ進む（ほかの時計より1分すすんでいる＝off 1）
				if (t === "yoru") {
					await s.narrate(`駅前の時計。――${yoruClock(s, 1)}。`);
					return;
				}
				await s.narrate(`駅前の時計。――${yuClock(s, 1)}。`);
				await s.narrate("文字盤が、夕日で\nオレンジ色だ。");
			},
		},
		{
			id: "annaizu",
			x: 15,
			y: 10,
			trigger: "talk",
			// ⑩ 段: 初回は 地図、2回目から すみの『売地』。
			// 回収: 予想図（seen_urichi_yosozu）か 団地の 案内図（danchi annaizu の 初回 seen_annaizu2＝シールが はがれかけ）を 見た 人に キリコ
			run: async (s) => {
				// 深夜は よめない（フラグは 立てない）
				if (s.flag("tod") === "shinya") {
					await s.narrate("くらくて、手がきの　線は\nよめない。");
					return;
				}
				if (!s.flag("seen_annaizu_eki")) {
					s.set("seen_annaizu_eki");
					await s.narrate("『えきまえ　あんない』。\n手がきの地図だ。");
					await s.narrate("スーパーのところに、\n二重まる。『やすい』。");
					return;
				}
				await s.narrate("すみに、えんぴつで　『売地』と\nかきたしてある。");
				if (s.flag("seen_urichi_yosozu"))
					await s.say("kiriko", "（予想図の　駅ビルは、\nかいてないンゴ）");
				else if (s.flag("seen_annaizu2"))
					await s.say(
						"kiriko",
						"（団地の　案内図も、\nシールが　はがれかけてたンゴ）",
					);
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
					// ここで 缶を 買った人（朝の うりきれランプで回収。senro jihanki_a と同じ形）
					const before = kanLv(s);
					await kanShinya(s);
					if (before === 0 && kanLv(s) === 1) s.set("seen_kan_eki");
					return;
				}
				// 朝。宵の あかい札（seen_akafuda_eki）か 深夜の 缶（seen_kan_eki）を 知っている 人だけ、札の列を 見る
				if (t === "asa") {
					if (s.flag("seen_kan_eki") || s.flag("seen_akafuda_eki")) {
						await s.narrate(
							"あかい札の　列に、うりきれランプが\nひとつ　ついている。",
						);
						if (s.flag("seen_kan_eki"))
							await s.say(
								"kiriko",
								"（ゆうべの　一本で、\nおしまいだったンゴ）",
							);
						return;
					}
					await s.narrate("じはんき。うりきれランプが\nひとつ　ついている。");
					return;
				}
				// 宵は、はしの一列が赤い札（深夜の缶の前ぶり。street vending_ev と同じ仕込み）
				if (t === "yoru") {
					s.set("seen_akafuda_eki");
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
					// (63) 宵に 赤い字を 見た 人だけ
					if (s.flag("seen_bus_akaji"))
						await s.say(
							"kiriko",
							"（赤い字の　さいしゅう、\nもう　行ったンゴ）",
						);
					return;
				}
				// 朝の 7:45 は 駅前の時計（いちばん進んでも 7:35）より、つねにあと
				if (t === "asa") {
					await s.narrate("バスのりば。つぎは\n7:45　だんち行き。");
					// 夕方の 18:05 を 見た 人だけ
					if (s.flag("seen_bus_eki"))
						await s.narrate("きのうの　18:05と　おなじ\n『だんち行き』。");
					return;
				}
				// 宵は時こくの数字を出さない（kokudo のバス停の「さいしゅうは22時10分」とぶつけない）。
				// seen_bus_akaji は kokudo busstop（宵）と ここの 深夜が 読む
				if (t === "yoru") {
					s.set("seen_bus_akaji");
					await s.narrate("バスのりば。時刻表の\nさいしゅうだけ、赤い字。");
					return;
				}
				s.set("seen_bus_eki");
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
					// ㉟ すわった あとは 一行だけ。seen_suwari_eki は 部屋の 布団（suwariNure）と 朝が 読む
					if (s.flag("seen_suwari_eki")) {
						await s.narrate("ぬれた　ベンチ。\nさっき　すわった　はしだ。");
						return;
					}
					await s.narrate("ベンチは、夜つゆに\nぬれている。");
					const i = await s.choose(["＞＞1 すわる", "＞＞2 やめておく"], {
						cancel: 1,
					});
					if (i !== 0) return;
					s.set("seen_suwari_eki");
					await s.narrate("すそが、ひやっと\nつめたく　なった。");
					return;
				}
				if (t === "asa") {
					// 夕方に「見てるだけで　いい」じいちゃんと 話した 人だけ
					if (s.flag("seen_ekimae_jii")) {
						// ㉟ 深夜に ここへ すわった 人は、じいちゃんの はしと 重ねる
						if (s.flag("seen_suwari_eki")) {
							await s.say("kiriko", "（ゆうべ　すわった　はしに、\n新聞ンゴ）");
							return;
						}
						await s.narrate("じいちゃんの　いた　はしに、\nけさの　新聞。");
						await s.say("kiriko", "（始発も、見に　来たンゴ）");
						return;
					}
					await s.narrate("新聞が、たたんで\nおいてある。");
					await s.narrate("よみおわった、\nだれかのだ。");
					return;
				}
				if (t === "yoru") {
					await s.narrate("すわる場所に、街灯の\nまるい　光が　おちている。");
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
					if (s.flag("seen_funsui")) return;
					const i = await s.choose(
						["＞＞1 ふちに　のぼる", "＞＞2 やめておく"],
						{
							cancel: 1,
						},
					);
					if (i !== 0) return;
					s.set("seen_funsui");
					await s.narrate("ふちを、ひとまわり\nあるいた。……おちなかった。");
					await s.say("kiriko", "吾輩、いま　ちょっと\nかっこよかったンゴ？");
					return;
				}
				if (t === "asa") {
					// 深夜に ふちを あるいた 人だけ
					if (s.flag("seen_funsui")) {
						await s.narrate(
							"ゆうべ　あるいた　ふちを、\nスズメが　あるいている。",
						);
						return;
					}
					await s.narrate("まだ　とまったまま。\n水面が、たいらだ。");
					return;
				}
				if (t === "yoru") {
					await s.narrate(
						"噴水は、もう　とまっている。\n水面が、まだ　ゆれている。",
					);
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
				// 深夜も 宵の 札が そのまま。ナイターの中けいと テレビの 打ち切り（P0-2）を 両方 知る 人だけ
				if (t === "shinya") {
					// 「まだ」は 宵に 札を 見た 人（seen_takushii_fuda）だけ
					if (s.flag("seen_takushii_fuda"))
						await s.narrate("『本日終了』の札が、\nまだ　さがっている。");
					else await s.narrate("『タクシーのりば』に、\n『本日終了』の札。");
					if (s.flag("seen_takushii_naita") && s.flag("seen_chukei_end"))
						await s.say("kiriko", "（延長、どっちが\nかったンゴ）");
					return;
				}
				if (t === "asa") {
					await s.narrate("まだ、一台も\n来ていない。");
					// 夕方の「ナイターの中けい」と、部屋のテレビの 打ち切り（P0-2）の 両方を 知っている 人だけ
					if (s.flag("seen_takushii_naita") && s.flag("seen_chukei_end"))
						await s.say("kiriko", "（延長の　せいンゴね）");
					return;
				}
				// 宵は本日終了の札。夕方の運転手の「ナイターの中けい」を 聞いた 人だけ キリコが 受ける。
				// 「からっぽ」とは書かない（nostalgia.md §7）
				if (t === "yoru") {
					await s.narrate("『タクシーのりば』に、\n『本日終了』の札。");
					s.set("seen_takushii_fuda");
					if (s.flag("seen_takushii_naita"))
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
					// ㉞ 通りの ベンチ（street bench_ev）か スーパーの ラック（suupaa zasshi）で 見た 号
					// スーパーで レジの 音を きいた 人（seen_suupaa_zasshi2）は、売れた 一冊と 重ねる
					if (s.flag("seen_suupaa_zasshi2"))
						await s.say("kiriko", "（スーパーで　売れた\n号ンゴ）");
					else if (s.flag("seen_zasshi") || s.flag("seen_suupaa_zasshi"))
						await s.say("kiriko", "（月曜の　号ンゴ）");
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
				// 宵は 半分（夕方の「ずらり」→ 宵 → 深夜の 一台 → 朝、と へっていく）。
				// 夕方の ずらりを 見た 人だけ「へっている」と くらべられる
				if (t === "yoru") {
					await s.narrate(
						s.flag("seen_bike_yu")
							? "まえカゴの　自転車が、\n半分くらいに　へっている。"
							: "まえカゴの　自転車が、\nまばらに　とまっている。",
					);
					return;
				}
				s.set("seen_bike_yu");
				await s.narrate("自転車おきば。まえカゴの\nついたのが、ずらり。");
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
					// 夕方・宵に 留守の 交番を 見た 人だけ
					if (s.flag("seen_koban_fuda")) {
						await s.narrate("おまわりさんの自転車が、\nもどっている。");
						await s.say("kiriko", "（……いたンゴ）");
						return;
					}
					await s.narrate("交番の前に、白い自転車。");
					return;
				}
				s.set("seen_koban_fuda");
				// 宵は 灯りと 物だけ（人の姿は書かない）
				if (t === "yoru") {
					await s.narrate(
						"交番の　まどに、あかり。\nつくえに　帽子が　おいてある。",
					);
					return;
				}
				await s.narrate("交番だ。『じゅんかいちゅう』\nの札が　かかっている。");
				await s.say("kiriko", "……いつ　いるンゴ？");
			},
		},
		// 売地の看板。二度目から、すみの色のぬけた『完成予想図』に気づく（来なかった未来。
		// nostalgia.md P0-8。時間帯を問わず同じ文＝変わるのではなく、気づく）。
		// ⑩ 完成予想図を 見た 人（seen_urichi_yosozu）だけ、店うらの old_sign で 回収する
		{
			id: "urichi",
			x: 27,
			y: 8,
			trigger: "talk",
			run: async (s) => {
				if (s.flag("seen_urichi2")) {
					s.set("seen_urichi_yosozu");
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
				// 夕方の「おなじ小節を三回」（seen_piano_eki）を、宵の ふた・朝の 一回で 回収する。
				// sumire の seen_piano_yu とは 別の家（混ぜない）
				if (t === "asa") {
					await s.narrate("ふとんが、ベランダに\nほしてある。");
					if (s.flag("seen_piano_eki"))
						await s.narrate("おくで、きのうの　小節が\n一回で　とおった。");
					return;
				}
				// 宵はピアノを鳴らさない（宵のピアノは sumire のやまだ家だけ）。ふたの かげだけ
				if (t === "yoru") {
					if (s.flag("seen_piano_eki"))
						await s.narrate(
							"まどに、あかり。ふたの\nしまった　ピアノの　かげ。",
						);
					else
						await s.narrate("まどに、あかり。ゆげで\nすこし　くもっている。");
					return;
				}
				s.set("seen_piano_eki");
				await s.narrate("まどのおく、ピアノ。\nおなじ　小節を　三回。");
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
					await s.narrate("げんかんの　あかりが、\nひとつ　ついたまま。");
					return;
				}
				// ⑲ 朝: 部屋の テレビで 天気よほうを 見た 人（room tv の seen_tenki）だけ キリコ
				if (t === "asa") {
					await s.narrate("テレビの天気よほうが\nきこえる。");
					if (s.flag("seen_tenki"))
						await s.say(
							"kiriko",
							"（ゆうべ　部屋で　見たのと\nおなじ　声ンゴ）",
						);
					return;
				}
				// ⑲・P0-2 宵: 中継の 段（chukeiDan）と おなじ テレビが、おくで 鳴っている
				if (t === "yoru") {
					if (chukeiDan(s) < 3)
						await s.narrate("おくで、ナイターの\n延長の　声。");
					else await s.narrate("おくの　テレビが、\n天気よほうに　かわった。");
					return;
				}
				await s.narrate("ゆうげの　においがする。");
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
					// ㉜ 深夜の せんろぞいで 保線の 黄色い ランプ（senro arrive_shinya）を 見た 人だけ。
					// 7時台の 本線には 電車が 走るので、車は ひきこみ線（senro の コメントの「側線」）
					await s.narrate(
						s.flag("seen_senro_hosen")
							? "ホームの　はしの　ひきこみ線に、\n黄色い　ランプの　車が　とまっている。"
							: "朝の　レールが、\nまだ　つめたそうだ。",
					);
					return;
				}
				if (t === "yoru") {
					// ホームの あかりは arrive_yoru が 言うので、ここは レールだけ
					await s.narrate(
						"レールが、くらい　なかに\nほそく　二本　のびている。",
					);
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
					await s.narrate("たんぼは、くらい。\n稲の　においだけが　する。");
					return;
				}
				if (t === "asa") {
					await s.narrate("たんぼの上に、うすく\nもやが　かかっている。");
					// 夕方に 穂を 見た 人だけ（稲刈りの 朝）
					if (s.flag("seen_tanbo_eki")) {
						await s.narrate("あぜに、コンバインが\nとまっている。");
						await s.say("kiriko", "（きのうの　穂ンゴ）");
					}
					return;
				}
				if (t === "yoru") {
					await s.narrate("柵のむこうで、虫が\nいっせいに　鳴いている。");
					return;
				}
				s.set("seen_tanbo_eki");
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
				const t = s.flag("tod");
				// 店うらの 一晩（宵 モップの水 → 深夜 あしたの ぶん → 朝 トラック）
				if (t === "yoru") {
					await s.narrate(
						"うらぐちの　戸から、\nモップの　水が　ながれてくる。",
					);
					return;
				}
				if (t === "shinya") {
					await s.narrate(
						"からの　コンテナが、\nあしたの　ぶん　そろえてある。",
					);
					return;
				}
				// 朝は 搬入の トラック（truck_asa の seen_ekimae_truck 数）。3回目の「荷台が、からに　なった」の
				// あとだけ、ケースが おもてへ 出る（トラックは 朝のあいだ (12,5) に とまったまま）
				if (t === "asa") {
					await s.narrate(
						numFlag(s, "seen_ekimae_truck") >= 3
							? "からの　ケースは、もう　ない。\nおもてへ　はこばれた。"
							: "からの　ケースが、\nトラックを　まっている。",
					);
					return;
				}
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
				const t = s.flag("tod");
				// ⑤ ねこの 一晩（夕 毛 → 宵 しっぽ → 深夜 毛だけ → 朝 まるく ねている）
				if (t === "asa") {
					// 夕方に 毛を 見て、深夜の 団地で ねこの あつまり（danchi neko_ura）を 見た 人
					if (s.flag("seen_neko_eki") && s.flag("seen_neko_shukai")) {
						await s.narrate("コンテナのすきまで、ねこが\nまるく　ねている。");
						await s.say("kiriko", "（あつまりの　かえりンゴ）");
						return;
					}
					// 夕方の 毛か、宵の しっぽ・深夜の 毛だけ（seen_neko_sukima）を 見た 人
					if (s.flag("seen_neko_eki") || s.flag("seen_neko_sukima")) {
						await s.narrate("すきまで、ねこが\nまるく　ねている。");
						return;
					}
					await s.narrate("コンテナのすきまに、\nねこの毛が　ついている。");
					return;
				}
				// 宵・深夜は seen_neko_sukima（seen_neko_eki は danchi neko_ura が「コンテナの　毛」と 読むので 別）
				if (t === "yoru") {
					s.set("seen_neko_sukima");
					await s.narrate("すきまの　おくから、\nしっぽの　さきが　でている。");
					return;
				}
				if (t === "shinya") {
					s.set("seen_neko_sukima");
					await s.narrate("すきまに、ねこの　毛だけ\nのこっている。");
					// 深夜の 団地の あつまり（danchi neko_ura）を 先に 見た 人だけ
					if (s.flag("seen_neko_shukai"))
						await s.say("kiriko", "（団地の　あつまりンゴね）");
					return;
				}
				// 夕方の毛（nekoSeen には入れない。深夜の あつまりの 条件は 変えない）
				s.set("seen_neko_eki");
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
				// ⑩ 売地の『完成予想図』を 見た 人だけ（urichi の 二度目）
				if (s.flag("seen_urichi_yosozu")) {
					await s.narrate(
						"完成予想図の　駅ビルにも、\nこの　まるい字が　あった。",
					);
					// 看板（まるい字）を 見た 人は 看板の 行、そうでなければ はり紙の 行（下の 分岐と 同じ 順）
					if (s.flag("seen_kanban_kokudo")) await kanbanKokudo(s);
					else if (s.flag("seen_hari_famiresu")) await hariFamiresu(s);
					return;
				}
				// ㊾ 国道の ファミレス看板の 朝の まるい字（kokudo famiresu_kanban）を 見た 人
				if (s.flag("seen_kanban_kokudo")) {
					await kanbanKokudo(s);
					return;
				}
				// ⑩/㊾ 国道の ファミレスの はり紙（kokudo famiresu_hours）を 見た 人
				if (s.flag("seen_hari_famiresu")) {
					await hariFamiresu(s);
					return;
				}
				// ⑱ スーパーの ばあちゃんに「店は　駅より　あと」と 聞いた 人
				if (s.flag("seen_baa2")) {
					await s.say("kiriko", "（スーパーより、\n先輩ンゴね）");
					return;
				}
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
				const t = s.flag("tod");
				if (t === "asa") {
					// きのうの『たまご・ティッシュ』を 読んだ 人だけ、はりかわった 中身に 気づく
					if (s.flag("seen_chirashi"))
						await s.narrate(
							"『たまご・ティッシュ』が、\n『ぎゅうにゅう』に　かわった。",
						);
					else
						await s.narrate(
							"とくばいの　ちらし。けさ、\nはりかえられた　ばかりだ。",
						);
					// ㊹ スーパーの ばあちゃんの「あしたは　アジフライが　半額」（suupaa baachan_ev）を 聞いた 人だけ
					if (s.flag("seen_baa_aji"))
						await s.narrate("すみに、小さく\n『アジフライ　半額』。");
					return;
				}
				if (t === "shinya") {
					await s.narrate("ちらしの　はしが、\nかぜで　めくれている。");
					return;
				}
				s.set("seen_chirashi");
				// 宵は 街灯の 下で 読む（品目は おなじ。朝の はりかえで 回収する）
				if (t === "yoru") {
					await s.narrate(
						"街灯の　下で、とくばいの　字。\n『たまご・ティッシュ』。",
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
					// ⑱ 夕方に れいとうケースの ふたを あけた 人だけ（suupaa reitou）
					if (s.flag("seen_suupaa_reitou"))
						await s.say(
							"kiriko",
							"（ふたを　あけた　ケース、\nいまも　ひえてるンゴ）",
						);
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
				// ⑱ 放送の 声の 主を ばあちゃんに 聞いた 人だけ（suupaa baachan_ev）
				if (s.flag("seen_suupaa_koe"))
					await s.say("kiriko", "（ばあちゃんの、\nわかい声ンゴ）");
			},
		},
		{
			id: "eigyo",
			x: 13,
			y: 4,
			trigger: "talk",
			run: async (s) => {
				// 深夜は 音だけ（となりの ちらしの「かぜで　めくれている」と 見る物を かえる）
				if (s.flag("tod") === "shinya") {
					await s.narrate(
						"札が　シャッターに　あたって、\nかた、かた、と　鳴る。",
					);
					return;
				}
				const t = s.flag("tod");
				// 宵: 19時を すぎて、もう しまったあと
				if (t === "yoru") {
					await s.narrate("札の　『19:00』を、\nもう　すぎている。");
					return;
				}
				if (t === "yu") {
					await s.narrate("『えいぎょう時間』の札。\n10:00〜19:00。");
					await s.say("kiriko", "（あと　すこしで\nしまうンゴ）");
					return;
				}
				await s.narrate("『えいぎょう時間』の札。\n10:00〜19:00。");
				// 朝: 搬入の トラック（truck_asa の seen_ekimae_truck）と 話した 人だけ、10時の 前を つなげる
				if (numFlag(s, "seen_ekimae_truck") >= 1)
					await s.say("kiriko", "（10時の　前が、\nトラックの　しごとンゴ）");
				else await s.say("kiriko", "……あさは、おそいンゴ");
			},
		},
	],
};

/**
 * 伝言板の読んだ時間帯（seen_dengon は数＝ビット。夕 1・宵 2・朝 4。true は夕とみなす＝numFlag）。
 * 朝の「ふえている」は、夕か宵に読んだ人だけ。同じ時間帯の2回目は タカの1行だけ（朝は けさの1行）。
 */
const DENGON_BIT: Record<string, number> = { yu: 1, yoru: 2, asa: 4 };

/**
 * 黄色い ぼうし（伝言板の書きこみ ⇄ 窓口の よこ）を、キリコが つなげる 一言。
 * どちらを先に見ても、夕・宵を通して 一度だけ（seen_boushi_dengon）。
 */
async function boushiTsunagu(s: Story, text: string): Promise<void> {
	if (s.flag("seen_boushi_dengon")) return;
	s.set("seen_boushi_dengon");
	await s.say("kiriko", text);
}

/** 伝言板（黒板）。書き込み3つ・宵に『ゆうかん』が消され・朝に1つ増えている。 */
async function dengonban(s: Story): Promise<void> {
	const t = s.flag("tod");
	if (t === "shinya") {
		await s.narrate("こくばんの伝言板。くらくて、\n字が　よみにくい。");
		await s.narrate("チョークの白だけ、\nうかんで見える。");
		return;
	}
	const read = numFlag(s, "seen_dengon");
	const bit = typeof t === "string" ? (DENGON_BIT[t] ?? 0) : 0;
	if (bit && read & bit) {
		// 朝の2回目は、けさの 書き込み（すぐ下に 本人たちが いる）
		await s.narrate(
			t === "asa"
				? "『きのうは　ごめん。\nここで　まってる　タカ』"
				: "『さきに　行ってます　タカ』",
		);
		return;
	}
	// 夕方か宵に 読んだか（朝の書き込みを「ふえた」と 気づけるか）
	const yube = (read & (DENGON_BIT.yu | DENGON_BIT.yoru)) !== 0;
	s.set("seen_dengon", read | bit);
	await s.narrate("こくばんの伝言板だ。\nチョークが、ぶらさがっている。");
	await s.narrate("『さきに　行ってます　タカ』");
	// 宵から先は、夕方の 二部の ゆうかんが とりにこられたあと
	if (t === "yu")
		await s.narrate("『ゆうかん　とりにきて\nください　――キオスク』");
	else await s.narrate("『ゆうかん』の　ところだけ、\nけされている。");
	// 窓口の よこの 黄色い ぼうし（madoguchi・seen_madoguchi_boushi）と つながる
	await s.narrate(
		"『わすれものの　黄色い　ぼうしは\n駅員さんに　あずけました』",
	);
	// 窓口を 先に 見た 人（senro・tonarimachi から 着くと 窓口が 近い）。朝は もう フックが あいている
	if (t !== "asa" && s.flag("seen_madoguchi_boushi"))
		await boushiTsunagu(s, "（窓口の　よこの　ぼうしンゴ）");
	if (t === "asa") {
		if (yube) await s.narrate("――書き込みが、ひとつ\nふえている。");
		await s.narrate("『きのうは　ごめん。\nここで　まってる　タカ』");
	}
}
