// かわらのみち（川沿いの土手道）。docs/content-briefs.md「日常の町 拡張」・docs/style-everyday.md。
// 40×16・outdoor・BGM null（川の気配と生活音だけ）。土手の上の道(y8)と水ぎわの道(y11)の
// 二段構え＋石段の上の神社の高台＋戻り橋の対岸。
//
// 時間帯の顔（flags.tod）:
//   夕方 … 川面のきらめき・ヒグラシ。NPC 4体（つりの人=3層会話・ランニングの人=周回・
//           ハーモニカの子・水きりの子）。川しもの鉄橋を電車がわたる（定時音は正常の側に置く。
//           宵＝川面の窓のあかり／深夜＝くろい線の鉄橋／朝＝川をわたる音 と、時間帯ごとに一度ずつ。tekkyoBelt）。
//           水ぎわで一度だけ蚊にさされる（ka_a/b/c・seen_ka。寝る前と朝の一行は room bed）
//   宵   … NPC 0体（docs/nostalgia.md P0-1）。土手の街灯と常夜灯がつき、川の音がちかい。
//           文は「におい・音・点いた灯り」だけ（減った人・消えた窓は書かない）。つりのバケツだけ残っている
//   深夜 … NPC 0体必達。音だけの川。土手のふみあとに すわれる（P0-7）・対岸から自分のアパートのあたり（P0-5）。
//           手の中の缶は、地区を移るたびに冷める（onEnter の kanTick・P0-6）。
//   朝   … きらめきがもどる・スズメ。NPC 3体（つりの人・ランニングの人=周回・犬のさんぽの人）。
//           しらさぎの飛び立ち・バケツのリリースサイズ・ふみあとの「けさの分」など小さな payoff
//
// 座標凍結v3: 北 (5,1)→sumire(5,22)・sumire からの着地 (5,2)／
// 東 (38,8)→street(20,19)・street からの着地 (37,8)／
// 西 (0,8)→yamamichi(42,12)・yamamichi からの着地 (1,8)（2026-09-28 地続きの拡張）。
//
// 経路: 一本道にしない（土手道⇄石段の神社⇄水ぎわ⇄戻り橋の対岸）。
// 対岸は行き止まりだが「見るもの」を置く（花火のもえかす・川ごしの町）。
// 隠し: 対岸の西はし、ススキ（h・無印）が見た目のまま通れる → 水きり石の穴場。
// 二度目で変わる: 絵馬かけ・ご神木・水きり石（かりたあと）・ハーモニカの子・犬のさんぽの人・ほうきの人。
// 夕方の前振り → 朝の回収（このマップの中）: 中州のしらさぎ（seen_sagi_yu）→ 朝とびたつ → 犬が首をかしげる／
//   やしろの竹ぼうき（seen_yashiro_houki）・石段の四つめ（seen_ishidan）→ ほうきの人／
//   かかしのぼうし（seen_kakashi_boushi・宵の風 seen_kakashi_kaze）→ 朝、あぜのきわにとばされている（くいにかける）／
//   こまいぬ（seen_komainu_a/b。b のくもの巣は宵・深夜も常夜灯で）・ご神木のどんぐり（seen_donguri）・
//   ススキ（深夜 got_susuki）・ふみあと（深夜にすわった）・さいせん（seen_saisen → 朝「ゆうべの分と、けさの分」）・
//   ぬしのバケツ（深夜の丸いあと seen_tsuri_ato → 朝 つりの人「バケツは　夜、いっぺん…」seen_tsuri_baketsu）・
//   ハーモニカの子（seen_harmonica → 朝、土手の帯でとおくのハーモニカ harmonica_asa・seen_harmonica_asa）・
//   鉄橋（夕の音・深夜のくろい線 → 朝の川面にうつる鉄橋・電車は音だけ）。
// 町をまたぐ回収:
//   ⑥ 石を返す … 水きり石をかりてなげた（seen_mizukiri_nage）→ yamamichi kawa でひろう（got_ishi_yama）→
//      ここで山にのせる（seen_ishi_kaeshi → 朝「ゆうべのせた石の上に…」・水きりの子「ふえてた」・kirokuLines）
//   ㊱ かかし … やまみちのヘルメットのかかし（seen_kakashi_yama）と見くらべる・ぼうしは yamamichi nouka_asa へ
//   ㊲ わらのにおい … yamamichi の夕方のけむり（seen_wara_kemuri）→ 宵の川かぜ（arrive_yoru）
//   ㉑ 鈴のランナー（seen_runner_yama → 夕方 seen_runner_suzu）・㉒ しらさぎ（sumire の坂 seen_sagi_saka）
// 石碑『もどりばし』と銘板『もどりはし』は、どちらからでも見くらべられる（seen_hashi_sekihi・seen_hashi_meiban）。
// 両方 見た 人だけ、朝の houki_baachan が にごらない わけを 一度 言う（seen_hashi_naze）。
// 深夜の石碑は字が見えない（読んだ人だけ、ゆびで ほった みぞを なぞる）。
// 東の街灯: 宵の とどかない あかり（seen_lamp_e）→ 深夜の 川の音 → 朝、石碑が 見える。
// 対岸の 行きどまり（seen_modori）→ 橋の上で 一度「もどる　ほうへ」（seen_modori_hashi）。
// 花火の もえかす: 深夜に ふんだ（seen_natsu_kawa_shinya）→ 朝、つぶれた つつ。

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
	kanTick,
	natsuOwari,
	numFlag,
	yoruAkubi,
} from "../nostalgia";
import { DOOR, FIELD, JP, TOWN, WALL } from "../tiles";

// ── タイル ──
// FIELD をベースに、神社の高台（TOWN の石畳）と社・石段を足す。
//   i  田（通れない・counter＝あぜ越しに調べられる）   b  ススキ（茂みで代用）
//   h  ススキ（見た目は b と同じ・通れる＝対岸の隠し）   G  石どうろう（常夜灯）
//   z Z わら屋根（社）   [ ]  板壁   j  社の戸（しまっている）   Y  ご神木（高台のクスノキ）
//   .  水ぎわ・高台の石畳   =  石段   #  橋   ~  川   L  街灯
const PAVE = JP.ishidatami;
const tiles: Record<string, TileDef> = {
	...FIELD,
	i: {
		layers: [JP.paddy],
		color: "#7a9a3a",
		passable: false,
		counter: true,
	},
	".": { layers: [PAVE], color: "#8c8c90", passable: true },
	G: {
		layers: [PAVE, JP.stoneLantern],
		color: "#8c8c90",
		passable: false,
	},
	z: TOWN.z,
	Z: TOWN.Z,
	"[": TOWN["["],
	"]": TOWN["]"],
	j: {
		layers: [WALL.boardLo, DOOR.sliding],
		color: "#6a4a2a",
		passable: false,
	},
	"=": { layers: [JP.stoneSteps], color: "#8a8a8a", passable: true },
	Y: {
		layers: [PAVE, JP.tree],
		color: "#4a7a3a",
		passable: false,
	},
	h: {
		layers: [JP.ground, JP.susuki],
		color: "#6fae3a",
		passable: true,
	},
	L: { ...TOWN.L, layers: [JP.ground, JP.lamp] },
	// FIELD の地面・土手の道・川・橋も自作チップに（文字の意味は FIELD と同じ）
	",": { layers: [JP.grassTuft], color: "#6a7a48", passable: true },
	":": { layers: [JP.dirtPath], color: "#7a6a50", passable: true },
	"~": { layers: [JP.water], color: "#4a6a88", passable: false },
	"#": { layers: [JP.bridgeV], color: "#8a8880", passable: true },
};

// 西＝田んぼとかかし。北＝sumire への道(x5)と、石段の上の神社（ご神木・狛犬・常夜灯）。
// 中央＝土手の道(y8)・ススキの斜面・水ぎわの道(y11)。南＝川・戻り橋・対岸（隠しの穴場つき）。
const rows = [
	"                                        ", // y0
	"     :                                  ", // y1  sumire への出口 (5,1)
	"     :                        zzz       ", // y2  sumire からの着地 (5,2)・社の屋根
	"     :                        ZZZ       ", // y3
	"     :                      ..[j[...    ", // y4  狛犬 (29,4)(33,4)・社の戸 (31,4)
	"     :                      Y.......    ", // y5  ご神木 (28,5)・さいせん箱 (30,5)・絵馬かけ (34,5)
	"iiii,:,,,,,,,,,,,,,,,,,,,,,,G....G..    ", // y6  田んぼ・かかし (1,6)・常夜灯 (28,6)(33,6)。(29,6) から狛犬の前 (29,5) へ
	"iiii,:,,L,,,,,,,,,,,,,,,L,,,,,,=,,,,,b= ", // y7  街灯 (8,7)(24,7)・きょり標 (12,7)・石段 (31,7)
	",,::::::::::::::::::::::::::::::::::::: ", // y8  土手の道。street への出口 (38,8)・着地 (37,8)
	",,,,,,,,,,,,=,,b,,b,,,b,,,,b,,,,,,,,,,, ", // y9  土手の斜面とススキ・ハーモニカの子 (25,9)
	",,,,,,,,,,,,=,b,,,,,,,,,,b,,,,,,,b,,,,, ", // y10 石段 (12,9-10)・つりの人 (9,10)・バケツ (8,10)・石碑 (19,10)
	",,,,,,..........................,,,,,,, ", // y11 水ぎわの道・水きりの子 (17,11)・橋のたもと (20,11)
	"~~~~~~~~~~~~~~~~~~~~#~~~~~~~~~~~~~~~~~~ ", // y12 川と戻り橋 (x20)・銘板 (21,12)
	"~~~~~~~~~~~~~~~~~~~~#~~~~~~~~~~~~~~~~~~ ", // y13 橋の上から (19,13)
	"~~~~~~~~~~~~~~~~~~~~#~~~~~~~~~~~~~~~~~~ ", // y14 わたりきる直前 (20,14)
	"            ,,,h,,h,,,b,                ", // y15 対岸（行き止まり）。花火のあと (21,15)・隠しの h (18,15)(15,15)
];

// ── モブの歩行グラ ──
const GRANDPA = "pub:sprites/mob_ojiichan.png";
const RUNNER = "pub:sprites/mob_student.png";
const KID = "pub:sprites/mob_child.png";
const WALKER = "pub:sprites/mob_mama.png";

/**
 * 環境音のワンショット（夕＝ヒグラシ／朝＝スズメ）。street・sumire と同じ方式：
 * 直前に鳴らした帯をモジュール変数で覚え、往復の連打を防ぐ（セーブしない）。
 */
let lastWave = "";
const wave = (id: string, pan: number) => async (s: Story) => {
	if (lastWave === id) return;
	lastWave = id;
	const t = s.flag("tod");
	// 夏まつりのおわり（seen_natsu_owari）を見た人には、ヒグラシが遠のく（sumire と同じ）
	if (t === "yu")
		s.se("higurashi", {
			pan,
			volume: s.flag("seen_natsu_owari") ? 0.4 : 0.8,
		});
	else if (t === "asa") s.se("suzume", { pan, volume: 0.8 });
};
/** 見えない環境音の帯（土手の道 y8 に置く）。 */
const waveBelt = (id: string, x: number, pan: number): EventDef => ({
	id,
	x,
	y: 8,
	trigger: "touch",
	through: true,
	when: (st: GameState) => st.flags.tod === "yu" || st.flags.tod === "asa",
	run: wave(id, pan),
});

/**
 * 朝、水ぎわに下りたとき一度だけ（しらさぎの飛び立ち。kawa_b の朝の payoff）。
 * ㉒ 夕方に中州のしらさぎを見た人（seen_sagi_yu）か、すみれの坂の上から中州の白い点を見た人
 * （seen_sagi_saka）には「中州の　しらさぎが」。
 * 立てた seen_sagi_asa は inu_sanpo（asa。犬が首をかしげる）・umi kyori_0（河口）・sumire saka_rail（asa）が読む。
 */
const sagiBelt = (x: number, y: number): EventDef => ({
	id: `sagi_${x}`,
	x,
	y,
	trigger: "touch",
	through: true,
	when: (st) => st.flags.tod === "asa" && !st.flags.seen_sagi_asa,
	run: async (s) => {
		s.set("seen_sagi_asa");
		await s.narrate(
			s.flag("seen_sagi_yu") || s.flag("seen_sagi_saka")
				? "中州の　しらさぎが、はねの音も\nたてずに　とびたった。"
				: "――しらさぎが、はねの音も\nたてずに　とびたった。",
		);
		await s.narrate("川しもへ、白い点に\nなっていく。");
	},
});

/**
 * 川しもの鉄橋（土手の道 (34,8)(35,8) の帯。④ 電車の音）。時間帯ごとに一度だけ1行。
 * 夕方の seen_tekkyo は room の布団の遠い音（TOOI_OTO）と koen tesuri が読む。
 * 深夜は、夕方に聞いた人だけ「川の上のくろい線」（音は鳴らさない）。
 * 宵・朝は、川べりでしか見えないもの（川面のあかり・水をわたる音）にする（koen tesuri・senro と重ねない）。
 * 朝は、深夜の「くろい線」（seen_tekkyo_shinya）か夕方の音（seen_tekkyo）を見聞きした人に、その続きの1行。
 */
const tekkyoBelt = (
	id: string,
	when: (st: GameState) => boolean,
	run: (s: Story) => Promise<void>,
): EventDef[] =>
	([34, 35] as const).map((x, i) => ({
		id: `${id}_${i}`,
		x,
		y: 8,
		trigger: "touch" as const,
		through: true,
		when,
		run,
	}));

/**
 * 夕方の水ぎわで、蚊（nostalgia.md P0-10。帯3つのどれかで一日一回だけ・seen_ka）。
 * からだの一行なので、郷愁の文とは吹き出しを分けておく。
 */
const kaBelt = (id: string, x: number): EventDef => ({
	id,
	x,
	y: 11,
	trigger: "touch",
	through: true,
	when: (st) => st.flags.tod === "yu" && !st.flags.seen_ka,
	run: async (s) => {
		s.set("seen_ka");
		await s.narrate("……ぷうん、と　耳もとで\n音がした。");
		await s.narrate("うでを、蚊に　さされた。");
		await s.say("kiriko", "（夕方の川は、\nこれがあるンゴ）");
	},
});

/**
 * 朝、土手を横ぎる帯（x22 の (22,6)(22,7)(22,8)(22,10)(22,11)。(22,9) はススキで踏めない。
 * (22,6) は田んぼの北の草地 y6 を東へぬける人のぶん）。
 * 夕方にハーモニカの子に会った人（seen_harmonica）に一度だけ、とおくのハーモニカ（seen_harmonica_asa）。
 * 子の姿は出さない（音だけ）。絵馬の話をきいた人（seen_harmonica_ema）は、だれの音か わかる。SE は鳴らさない。
 */
const harmonicaAsa = (i: number, y: number): EventDef => ({
	id: `harmonica_asa_${i}`,
	x: 22,
	y,
	trigger: "touch",
	through: true,
	when: (st) =>
		st.flags.tod === "asa" &&
		!!st.flags.seen_harmonica &&
		!st.flags.seen_harmonica_asa,
	run: async (s) => {
		s.set("seen_harmonica_asa");
		await s.narrate("とおくで、ハーモニカ。\nきのうより、ながく　つづく。");
		await s.say(
			"kiriko",
			s.flag("seen_harmonica_ema")
				? "（……絵馬の　子ンゴ。\n言わないンゴ）"
				: "（きかないで、って\n言われてるンゴ）",
		);
	},
});

/**
 * 狛犬の一言。夕方に見たほう（seen_komainu_a/b）は、朝に見なおすと変わる
 * （a＝夕日が口の中までさして わらって見えた顔が、朝は横からの光で口の中がかげ／b＝あごの下のくもの巣に朝つゆ）。
 * b のくもの巣は、宵・深夜にも常夜灯のあかりで見える（夕→夜→朝の三段）。
 */
const komainu = async (s: Story, which: "a" | "b"): Promise<void> => {
	const t = s.flag("tod");
	if (t === "yu") {
		if (which === "a") {
			s.set("seen_komainu_a");
			await s.narrate("こまいぬ。口を　あけている\nほうだ。");
			// 光の せい（朝は 横から さして、口の中が かげになる）
			await s.narrate(
				"夕日が　口の中まで　さしこんで、\nわらっているようにも　見える。",
			);
			return;
		}
		s.set("seen_komainu_b");
		await s.narrate("こまいぬ。口を　とじている\nほうだ。");
		await s.narrate("あごの下に、くもの巣。");
		return;
	}
	if (t === "asa") {
		// 夕方の顔・くもの巣を見た人だけ
		if (which === "a" && s.flag("seen_komainu_a")) {
			await s.narrate("あさの光は　横から。\n口の中は　かげに　なっている。");
			return;
		}
		if (which === "b" && s.flag("seen_komainu_b")) {
			await s.narrate("あごの下の　くもの巣に、\n朝つゆが　ならんでいる。");
			return;
		}
		await s.narrate("こまいぬ。あさの光で、\n石のはだが　しろい。");
		return;
	}
	// 宵・深夜: 夕方に b の くもの巣を 見た 人だけ、常夜灯の あかりで（朝の 朝つゆ へ つづく）。
	// a の 顔は 夜に 書かない
	if (which === "b" && s.flag("seen_komainu_b")) {
		await s.narrate("常夜灯の　あかりで、\nくもの巣が　ひかっている。");
		return;
	}
	await s.narrate("こまいぬ。くらくて、\nかおが　見えない。");
};

/** 常夜灯（(28,6)(33,6) で共用。夜にひが入る＝だれかが世話をしている。説明しない）。 */
const jouyatou = async (s: Story): Promise<void> => {
	const t = s.flag("tod");
	if (t === "shinya") {
		s.set("seen_jouyatou_shinya");
		await s.narrate("石どうろうに、ひが\n入っている。");
		await s.narrate("ちいさな　ほのおが、\nしずかに　ゆれている。");
		return;
	}
	if (t === "yoru") {
		// 宵は、ともしたばかり（深夜＝ちいさな ほのお・朝＝においだけ へつづく）
		await s.narrate("石どうろうに、ひが\n入っている。");
		await s.narrate("ろうそくは、まだ　ながい。");
		return;
	}
	if (t === "asa") {
		await s.narrate("ひは、もう　きえている。");
		await s.narrate("ろうそくの　においだけ、\nのこっている。");
		return;
	}
	await s.narrate("石どうろう。あたらしい\nろうそくが、立ててある。");
};

/**
 * 土手の街灯（西 (8,7)＝w・東 (24,7)＝e。lights は yoru,shinya で点く）。
 * 西: 深夜の 羽虫（seen_hamushi_kawa。やまみちの 蛾 seen_ga_yama を 見た 人には 一度 くらべる）→ 朝、その下の スズメ。
 * 東: 宵は あかりが 石碑まで とどかない（hashi_sekihi の 宵と 対。seen_lamp_e）→
 *     深夜、わの そとの 川の音 → 朝、とどかなかった 石碑が 見える（石碑を 読んだ 人にも）。
 */
const gaitou =
	(side: "w" | "e") =>
	async (s: Story): Promise<void> => {
		const t = s.flag("tod");
		if (t === "shinya") {
			if (side === "e") {
				// 宵に あかりが 石碑まで とどかないのを 見た 人（seen_lamp_e）
				await s.narrate(
					s.flag("seen_lamp_e")
						? "あかりの　わの　そとで、\n川の音が　する。"
						: "街灯の　しただけ、\n草の　色が　ある。",
				);
				return;
			}
			await s.narrate("街灯のあかりに、羽虫が\nあつまっている。");
			if (side === "w") {
				// (60) yamamichi lamp_bus の 蛾を 見た 人だけ、はじめての 一度
				if (numFlag(s, "seen_ga_yama") >= 1 && !s.flag("seen_hamushi_kawa"))
					await s.narrate("やまみちの　蛾より、\nずっと　ちいさい。");
				s.set("seen_hamushi_kawa");
			}
			return;
		}
		if (t === "yoru") {
			if (side === "e") {
				s.set("seen_lamp_e");
				await s.narrate("あかりの　はしが、\n石碑まで　とどかない。");
				return;
			}
			await s.narrate("土手の街灯。まるい　あかりが\n道に　おちている。");
			return;
		}
		if (t === "asa") {
			// 東: 宵の とどかない あかりを 見た 人（seen_lamp_e）だけ あかりに ふれる。石碑を 読んだだけの 人（seen_hashi_sekihi）は 別の 文
			if (side === "e") {
				await s.narrate(
					s.flag("seen_lamp_e")
						? "あかりの　とどかなかった　石碑が、\nここから　見える。"
						: s.flag("seen_hashi_sekihi")
							? "よんだ　石碑が、\nここから　見える。"
							: "街灯。もう、\nきえている。",
				);
				return;
			}
			// 深夜に 羽虫を 見た 人だけ（seen_hamushi_kawa）
			await s.narrate(
				side === "w" && s.flag("seen_hamushi_kawa")
					? "スズメが、街灯の　下を\nつついている。"
					: "街灯。もう、\nきえている。",
			);
			return;
		}
		await s.narrate("土手の街灯。まだ、\nついていない。");
	};

/**
 * 深夜、土手のしゃめんに すわる（fumiato。nostalgia.md P0-7。seen_suwari_kawara）。なにも起きない。
 * 目をとじる → 暗転して、目をあける → コオロギがふえてくる → 草のつめたさ（缶があれば缶の1行に替える）。
 * 文は暗転の前とあとにだけ出す（暗転 .fade は吹き出しより上に重なるので、暗いあいだの文は見えない）。
 * 無音は暗転の 2.7 秒だけ。深夜の電車・トラックの音は鳴らさない。
 * 2回目からは選ばずに短い1行だけ（缶があれば缶の1行。danchi・sumire の座る場所とそろえる）。
 */
const suwaru = async (s: Story): Promise<void> => {
	if (s.flag("seen_suwari_kawara")) {
		if (kanHeld(s)) await kanLine(s);
		else await s.narrate("しゃめんに　すわって、\nすこし　川の音を　きいた。");
		return;
	}
	const i = await s.choose(["＞＞1 すわる", "＞＞2 やめておく"], {
		cancel: 1,
	});
	if (i !== 0) return;
	s.set("seen_suwari_kawara");
	await s.narrate("しゃめんに　すわって、\n目を　とじた。");
	await s.fadeOut(900, "#04060f");
	await s.wait(900);
	await s.fadeIn(900);
	await s.narrate("コオロギの　声が、ひとつ、\nまたひとつ　ふえてくる。");
	if (kanHeld(s)) await kanLine(s);
	else await s.narrate("しゃめんの草が、\n夜つゆで　つめたい。");
	await s.say("kiriko", "……よし。もうすこし\nあるくンゴ");
};

export const kawara: MapDef = {
	id: "kawara",
	foreground: "susuki", // ジオラマ表示の前景（手前のススキ）
	// ジオラマ表示の箱。場面ごとに区切る（engine/diorama.ts の boxFor）
	boxes: [
		{ x: 26, y: 1, w: 12, h: 7 }, // 神社
		{ x: 14, y: 12, w: 13, h: 4 }, // 川ぞいの橋
		{ x: 0, y: 0, w: 13, h: 6 }, // すみれ町へのみち
		{ x: 0, y: 6, w: 13, h: 6 }, // 田んぼと土手
		{ x: 13, y: 6, w: 13, h: 6 }, // 土手のなかほど
		{ x: 26, y: 7, w: 14, h: 5 }, // 土手の東
	],
	name: "かわらのみち",
	bgm: "@tod", // 時間帯の曲（生活音の下にごく薄く。data/index.ts の todBgm）
	outdoor: true,
	outside: "#0b0c09",
	tiles,
	rows,
	// 光源は土手の街灯2本と神社の常夜灯2基だけ（川沿いはくらいのが正しい。docs/night-fx.md §2）
	lights: [
		{ x: 8, y: 7, r: 3, color: "#ffdf9e", only: "yoru,shinya" },
		{ x: 24, y: 7, r: 3, color: "#ffdf9e", only: "yoru,shinya" },
		{ x: 28, y: 6, r: 2, color: "#ffcc88", only: "yoru,shinya" }, // 常夜灯
		{ x: 33, y: 6, r: 2, color: "#ffcc88", only: "yoru,shinya" },
	],
	// 入るたびに環境音を一波（夕方＝ヒグラシ／朝＝スズメ。宵・深夜は無音のまま）。
	// 深夜は、手の中の缶が地区ひとつぶん冷める（nostalgia.md P0-6。文は出さない）
	onEnter: async (s) => {
		lastWave = "";
		kanTick(s);
		const t = s.flag("tod");
		if (t === "yu")
			s.se("higurashi", { volume: s.flag("seen_natsu_owari") ? 0.4 : 0.8 });
		else if (t === "asa") s.se("suzume", { volume: 0.8 });
	},
	events: [
		// ── 西（土手の道の西はし）→ やまみち（川上の田んぼ・林道・峠。地続きの拡張 2026-09-28） ──
		warp("to_yamamichi", 0, 8, { map: "yamamichi", x: 42, y: 12, dir: "left" }),
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
				await s.narrate("川のにおいがする。");
				await s.narrate("水面が、夕日で\nちかちかしている。");
			},
		},
		// 宵（nostalgia.md P0-1。座標は y0 の空き。4地区目あたりで あくび）
		{
			id: "arrive_yoru",
			x: 3,
			y: 0,
			trigger: "auto",
			once: true,
			when: (st) => st.flags.tod === "yoru",
			run: async (s) => {
				await s.wait(500);
				// 「夕方より」は、夕方にここへ来た人だけ
				await s.narrate(
					arrived(s, "kawara", "yu")
						? "川の音が、夕方より\nちかく　きこえる。"
						: "川の音が、くらがりで\nちかく　きこえる。",
				);
				// ㊲ やまみちの 夕方の わらの けむり（seen_wara_kemuri）を 見た 人だけ
				if (s.flag("seen_wara_kemuri"))
					await s.narrate("川かぜに、わらを　やいた\nにおいが　まじっている。");
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
				await s.narrate("くらくて、川は\n見えない。");
				await s.narrate("音だけが、ずっと\nながれている。");
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
				s.se("suzume", { pan: 0.3, volume: 0.8 });
				await s.wait(600);
				// 深夜に「音だけ」の川を歩いた人だけ（arrive_shinya の回収）
				await s.narrate(
					arrived(s, "kawara", "shinya")
						? "夜は　音だけだった　川が、\nぜんぶ　見える。"
						: "川が、あさの光を\nはねかえしている。",
				);
			},
		},

		// ── 出入り口（座標凍結v3） ──
		warp("to_sumire", 5, 1, { map: "sumire", x: 5, y: 22, dir: "up" }),
		// 土手の 東はしの 石段 (38,7) を 上へ のぼると、まちのどおりの うらどおり（石段の 上 (21,18)）
		warp("to_street", 38, 7, { map: "street", x: 21, y: 18, dir: "up" }),

		// ── 環境音の帯（土手の道。歩くたび遠近が変わる） ──
		waveBelt("wave_w", 10, -0.3),
		waveBelt("wave_m", 19, 0),
		waveBelt("wave_e", 29, 0.4),
		// 朝の水ぎわ（しらさぎ）
		sagiBelt(12, 11),
		sagiBelt(20, 11),
		// 夕方の水ぎわ（蚊。どれか一つで一日一回）
		kaBelt("ka_a", 11),
		kaBelt("ka_b", 16),
		kaBelt("ka_c", 24),
		// 朝の土手（ハーモニカの子の回収。どれか一つで一度）
		harmonicaAsa(0, 7),
		harmonicaAsa(1, 8),
		harmonicaAsa(2, 10),
		harmonicaAsa(3, 11),
		harmonicaAsa(4, 6),

		// ── 川しもの鉄橋（時間帯ごとに一度・定時音を正常の側に置く） ──
		// 夕方（seen_tekkyo は room の布団の遠い音が読む）
		...tekkyoBelt(
			"tekkyo_belt",
			(st) => st.flags.tod === "yu" && !st.flags.seen_tekkyo,
			async (s) => {
				s.set("seen_tekkyo");
				s.se("densha_far", { pan: 0.6, volume: 0.6 });
				await s.narrate("川しもの鉄橋を、電車が\nわたっていく音。");
			},
		),
		// 宵（人の姿は書かない。電車の窓のあかりだけ）
		...tekkyoBelt(
			"tekkyo_yoru",
			(st) => st.flags.tod === "yoru" && !st.flags.seen_tekkyo_yoru,
			async (s) => {
				s.set("seen_tekkyo_yoru");
				s.se("densha_far", { pan: 0.6, volume: 0.35 });
				await s.narrate(
					"電車の　窓の　あかりが、\n川面に　ならんで　うつった。",
				);
			},
		),
		// 深夜（夕方に電車を聞いた人だけ。音は鳴らさない）
		...tekkyoBelt(
			"tekkyo_shinya",
			(st) =>
				st.flags.tod === "shinya" &&
				!!st.flags.seen_tekkyo &&
				!st.flags.seen_tekkyo_shinya,
			async (s) => {
				s.set("seen_tekkyo_shinya");
				await s.narrate("鉄橋は、川の上の\nくろい　線に　なっている。");
			},
		),
		// 朝（深夜の くろい線 ＞ 夕方の 音 の 前振りを 回収。どちらも 無い人は 音だけ）
		...tekkyoBelt(
			"tekkyo_asa",
			(st) => st.flags.tod === "asa" && !st.flags.seen_tekkyo_asa,
			async (s) => {
				s.set("seen_tekkyo_asa");
				s.se("densha_far", { pan: 0.6, volume: 0.6 });
				await s.narrate(
					s.flag("seen_tekkyo_shinya")
						? "ゆうべ　くろい　線だった　鉄橋が、\n朝の　川面に　うつっている。"
						: s.flag("seen_tekkyo")
							? "ゆうべと　おなじ　音が、\n川を　わたってくる。"
							: "ごとん、ごとん、と　鉄橋の\n音が、川を　わたってくる。",
				);
			},
		),

		// 石碑『もどりばし』⇄ 銘板『もどりはし』（どちらを先に見ても、あとのほうで見くらべる）
		{
			id: "hashi_sekihi",
			x: 19,
			y: 10,
			sprite: JP.sekihi,
			trigger: "talk",
			fixedDir: true,
			run: async (s) => {
				// 深夜は字が見えない。夕・宵・朝に読んだ人だけ、ゆびで みぞを なぞる
				const t = s.flag("tod");
				if (t === "shinya") {
					if (!s.flag("seen_hashi_sekihi")) {
						await s.narrate("橋のたもとの、ふるい石碑。");
						await s.narrate("くらくて、字は　よめない。");
						return;
					}
					await s.narrate("ゆびで　なぞると、\nほった　みぞが　つめたい。");
					return;
				}
				s.set("seen_hashi_sekihi");
				await s.narrate("橋のたもとの、ふるい石碑。");
				await s.narrate(
					"『もどりばし』と　よめる。\n由来は、けずれて　よめない。",
				);
				// 宵は 街灯の あかりが とおい（lamp_e の 宵と 対）→ 深夜は ゆびで なぞる → 朝は 朝つゆで こく
				if (t === "yoru")
					await s.narrate("くらがりに　目を　ならして、\nやっと　よめる。");
				else if (t === "asa")
					await s.narrate("朝つゆで、ほった　字が\nこく　見える。");
				if (s.flag("seen_hashi_meiban"))
					await s.narrate("……橋の　銘板は、\nにごらずに　ほってある。");
			},
		},
		{
			id: "hashi_meiban",
			x: 21,
			y: 12,
			trigger: "talk",
			run: async (s) => {
				// 深夜は石碑とおなじく字が見えない（街灯 (24,7) の光の外）。読んだ人だけ、ゆびでなぞる
				if (s.flag("tod") === "shinya") {
					if (!s.flag("seen_hashi_meiban")) {
						await s.narrate("橋のたもとの　銘板。\n字は、くらくて　見えない。");
						return;
					}
					await s.narrate("銘板の　字を、ゆびで\nなぞった。");
					return;
				}
				s.set("seen_hashi_meiban");
				await s.narrate("橋のたもとの、銘板。\nひらがなで『もどりはし』。");
				if (s.flag("seen_hashi_sekihi"))
					await s.narrate("……にごらずに、\nほってある。");
			},
		},
		{
			id: "hashi_ue",
			x: 19,
			y: 13,
			trigger: "talk",
			run: async (s) => {
				const t = s.flag("tod");
				// 対岸の 行きどまり（taigan_view の seen_modori）を 見た 人に、どの時間帯でも 一度
				// （朝の ささぶねが 先。同じ回には 2つ 出さない）
				const modori = async (): Promise<boolean> => {
					if (!s.flag("seen_modori") || s.flag("seen_modori_hashi"))
						return false;
					s.set("seen_modori_hashi");
					await s.narrate("もどる　ほうへ、\n橋を　わたっている。");
					return true;
				};
				if (t === "shinya") {
					await s.narrate("くらい水が、橋の下を\nくぐっていく音がする。");
					await modori();
					return;
				}
				if (t === "asa") {
					await s.narrate("あさもやの　きれはしが、\n橋の下から　ながれ出た。");
					// ㉓ すみれの みぞを ながれていった ささぶね（sumire mizo）
					if (s.flag("seen_sasabune")) {
						await s.narrate(
							"岸の　草に、ささぶねが\nひとつ　ひっかかっている。",
						);
						return;
					}
					await modori();
					return;
				}
				await s.narrate("橋の上は、川かぜの\nとおり道だ。");
				if (await modori()) return;
				if (t === "yoru") {
					await s.narrate("土手の上に、街灯が\nふたつ　ついている。");
					return;
				}
				await s.narrate("きらめきが、川しもまで\nつづいている。");
			},
		},

		// ── 川面（中州。夕=しらさぎ／宵=はねの音／深夜=ぬしの音／朝=とびたったあと） ──
		// 川面は、ここと hashi_ue（橋の上）の2か所だけ
		{
			id: "kawa_b",
			x: 30,
			y: 12,
			trigger: "talk",
			run: async (s) => {
				const t = s.flag("tod");
				if (t === "shinya") {
					// ① ぬし：深夜の 川は、来るたびに 音が 大きくなる（seen_kawa_shinya 数）
					const n = numFlag(s, "seen_kawa_shinya");
					s.set("seen_kawa_shinya", n + 1);
					if (n === 0) {
						await s.narrate("……ちゃぷ、と　どこかで\n魚が　はねた。");
						return;
					}
					if (n === 1) {
						await s.narrate("――ばしゃん。");
						await s.narrate("さっきより、ずっと\n大きな　音だ。");
						if (s.flag("seen_tsuri2"))
							await s.say("kiriko", "……二十年もの、ンゴ？");
						return;
					}
					// n===2（3回目）は しん→水ぎわの波、n>=3（4回目〜）は 川の音だけ（段は 足さない）
					if (n === 2) {
						await s.narrate("――しん、と　しずかになった。");
						await s.narrate(
							"足もとの　水ぎわに、\nちいさな　波が　よせてきた。",
						);
						return;
					}
					await s.narrate("川の　音だけ。");
					return;
				}
				if (t === "asa") {
					if (!s.flag("seen_sagi_asa")) {
						await s.narrate("あさの川。しらさぎが、\n一羽だけ立っている。");
						return;
					}
					await s.narrate("あさもやが、水面に\nうすく　のこっている。");
					return;
				}
				if (t === "yoru") {
					// 宵は音だけ（夕方のしらさぎは書かない）
					await s.narrate("中州の　あたりで、\nばさ、と　はねの音。");
					return;
				}
				// ㉒ 夕方の しらさぎ（朝の sagiBelt・inu_sanpo・umi kyori_0 が回収）
				s.set("seen_sagi_yu");
				await s.narrate(
					"川のまんなかの　中州に、\nしらさぎが　一羽　立っている。",
				);
			},
		},

		// ── 田んぼの端（田はあぜ越しに見るだけ。調べられるのは かかしと看板） ──
		// かかし: 夕方のぼうし（seen_kakashi_boushi）・宵の風（seen_kakashi_kaze）→ 深夜、つばの音がやむ →
		// 朝、ぼうしがあぜのきわにとばされている（くいにかける seen_kakashi_naoshi は yamamichi nouka_asa・kirokuLines が読む）。
		// ㊱ やまみちの ヘルメットの かかし（seen_kakashi_yama）を 見た 人は、夕方に見くらべる
		{
			id: "kakashi",
			x: 1,
			y: 6,
			trigger: "talk",
			run: async (s) => {
				const t = s.flag("tod");
				if (t === "shinya") {
					// ㊱ 宵の風（seen_kakashi_kaze）を聞いた人には、つばの音が やんでいる（朝の あぜのきわ へ）
					// 深夜は姿でなく音だけで書きわける
					if (s.flag("seen_kakashi_kaze")) {
						await s.narrate(
							"田の　おくで、ぱたぱた　いう\n音が　しなくなっている。",
						);
						await s.say("kiriko", "（……とんだンゴ？）");
						return;
					}
					await s.narrate("田の　おくで、かかしの\nそでが　かさっと　鳴った。");
					await s.say("kiriko", "（……ごくろうさま\nンゴ）");
					return;
				}
				if (t === "yoru") {
					s.set("seen_kakashi_kaze");
					await s.narrate(
						"かぜが　出てきた。ぼうしの\nつばが、ぱたぱた　鳴っている。",
					);
					return;
				}
				if (t === "asa") {
					// 夕方のぼうしか、宵の風を見た人だけ
					if (s.flag("seen_kakashi_boushi") || s.flag("seen_kakashi_kaze")) {
						// 田には入らない（tanbo_sign『はいらないでね』）。手のとどく あぜの くいに かける
						if (s.flag("seen_kakashi_naoshi")) {
							await s.narrate(
								"くいの　ぼうしに、すずめが\n一羽　とまっている。",
							);
							return;
						}
						await s.narrate(
							"むぎわらぼうしが、あぜの\nきわまで　とばされている。",
						);
						const i = await s.choose(
							["＞＞1 あぜの　くいに　かける", "＞＞2 そのままにする"],
							{ cancel: 1 },
						);
						if (i !== 0) return;
						s.set("seen_kakashi_naoshi");
						await s.narrate("あぜの　くいに、ぼうしを\nかけておいた。");
						return;
					}
					await s.narrate("かかしの　かたに、すずめ。");
					await s.narrate("いばしょを、\nまちがえている。");
					return;
				}
				const first = !s.flag("seen_kakashi_boushi");
				s.set("seen_kakashi_boushi");
				await s.narrate(
					"田んぼのおくに、かかし。\nむぎわらぼうしが　あたらしい。",
				);
				// ㊱ やまみちの 黄色い ヘルメットの かかしを 先に 見た 人だけ、一度
				// （かわらが 先だった 人は、yamamichi kakashi の ほうで 見くらべている）
				if (first && s.flag("seen_kakashi_yama"))
					await s.say("kiriko", "（こっちは、ちゃんと\nむぎわらンゴ）");
			},
		},
		{
			id: "tanbo_sign",
			x: 4,
			y: 7,
			sprite: JP.infoSign,
			trigger: "talk",
			fixedDir: true,
			run: async (s) => {
				await s.narrate("田んぼの看板。こどもの字で\n『はいらないでね』。");
				await s.narrate("……はいりません。");
			},
		},

		// ── 神社（石段の上。狛犬が komainu の担当・常夜灯は lights と対） ──
		{
			id: "ishidan",
			x: 31,
			y: 7,
			trigger: "touch",
			through: true,
			when: (st) => !st.flags.seen_ishidan,
			// 四つめの段がゆれる（kazoe の『4』のぬけ・朝の houki_baachan「らいげつには　なおるよ」が回収）
			run: async (s) => {
				s.set("seen_ishidan");
				await s.narrate("石段の　四つめが、\nことん、と　ゆれた。");
			},
		},
		{
			id: "kazoe",
			x: 31,
			y: 7,
			trigger: "talk",
			run: async (s) => {
				const t = s.flag("tod");
				if (t === "shinya") {
					await s.narrate("チョークの数字は、\nくらくて　よめない。");
					return;
				}
				if (t === "asa") {
					await s.narrate("チョークの　数字が、\nあさつゆで　にじんでいる。");
					// 夕方・宵に『4』の ぬけを 見た 人だけ（seen_kazoe）
					if (s.flag("seen_kazoe"))
						await s.narrate(
							"にじんだ　数字の　あいだに、\nだれかが　小さく　4を　かいた。",
						);
					return;
				}
				s.set("seen_kazoe");
				await s.narrate(
					t === "yoru"
						? "チョークの　数字が、常夜灯の\nあかりで　しろく　うかぶ。"
						: "石段のはしに、チョークの\n数字。『1 2 3 5 6……』",
				);
				await s.narrate("4だけ、とばしてある。");
				// 四つめの段を ふんだ 人だけ（ishidan）
				if (s.flag("seen_ishidan"))
					await s.say("kiriko", "（……ゆれる　段ンゴ）");
			},
		},
		// やしろ: 夕方・宵の竹ぼうき（seen_yashiro_houki）→ 深夜も まだある → 朝、ほうきの人（houki_baachan）
		{
			id: "yashiro",
			x: 31,
			y: 4,
			trigger: "talk",
			run: async (s) => {
				const t = s.flag("tod");
				if (t === "asa") {
					await s.narrate("ちいさな　やしろ。戸の前が\nきれいに　はいてある。");
					return;
				}
				if (t === "shinya") {
					await s.narrate(
						s.flag("seen_yashiro_houki")
							? "竹ぼうきは、まだ\nたてかけてある。"
							: "くらくて、やしろの　形だけ\n見える。",
					);
					// ⑦ 宵の マッチの 箱（seen_yashiro_match）は、深夜には もうない
					if (s.flag("seen_yashiro_match"))
						await s.narrate("マッチの　箱は、もう\nない。");
					return;
				}
				s.set("seen_yashiro_houki");
				if (t === "yoru") {
					// ⑦ 宵: 常夜灯を ともした あとの マッチ（深夜に きえる → 朝 houki_baachan の 心の声）
					s.set("seen_yashiro_match");
					await s.narrate("ちいさな　やしろ。戸の　よこに\n竹ぼうきが　一本。");
					await s.narrate(
						"さいせん箱の　よこに、\nマッチの　箱が　おいてある。",
					);
					return;
				}
				await s.narrate("ちいさな　やしろ。\nしめなわは、あたらしい。");
				await s.narrate("戸の　よこに、竹ぼうきが\n一本　たてかけてある。");
			},
		},
		{
			id: "komainu_a",
			x: 29,
			y: 4,
			sprite: JP.komainuA,
			trigger: "talk",
			fixedDir: true,
			run: async (s) => {
				await komainu(s, "a");
			},
		},
		{
			id: "komainu_b",
			x: 33,
			y: 4,
			sprite: JP.komainuB,
			trigger: "talk",
			fixedDir: true,
			run: async (s) => {
				await komainu(s, "b");
			},
		},
		{
			id: "saisen",
			x: 30,
			y: 5,
			sprite: JP.saisen,
			trigger: "talk",
			fixedDir: true,
			// 夕・宵は一度いれたら選ばせない。朝は「ゆうべの分と、けさの分」（seen_saisen_asa）。
			// seen_saisen は日記（nikkiKey の saisen）が読む
			run: async (s) => {
				const t = s.flag("tod");
				if (t === "shinya") {
					await s.narrate("さいせん箱。");
					await s.say("kiriko", "……夜のおまいりは、\nやめておくンゴ");
					return;
				}
				await s.narrate("さいせん箱。");
				if (t !== "asa" && s.flag("seen_saisen")) {
					await s.say("kiriko", "……さっき　いれたンゴ");
					return;
				}
				if (t === "asa") {
					// ⑦ ほうきの人（ろうそくを かえにくる ばあちゃん）に会った人だけ、だれの なしか わかる
					await s.narrate(
						s.flag("seen_houki")
							? "ばあちゃんの　なしが、\nふちに　のっている。"
							: "ふちに、なしが\nひとつ　のっている。",
					);
				}
				const i = await s.choose(["＞＞1 5円いれる", "＞＞2 やめておく"], {
					cancel: 1,
				});
				if (i === 0) {
					s.se("kane", { volume: 0.7 });
					await s.narrate("ちゃりん。");
					// 朝: ゆうべ いれた 人に 一度だけ
					if (
						t === "asa" &&
						s.flag("seen_saisen") &&
						!s.flag("seen_saisen_asa")
					) {
						s.set("seen_saisen_asa");
						await s.say("kiriko", "ゆうべの　分と、\nけさの　分ンゴ");
						return;
					}
					if (!s.flag("seen_saisen")) {
						s.set("seen_saisen");
						await s.say("kiriko", "……ねがいごとは、\nとくに　ないンゴ");
						return;
					}
					await s.say("kiriko", "きょうの分ンゴ");
					return;
				}
				await s.say("kiriko", "ごえんが　なかったンゴ");
			},
		},
		{
			id: "emakake",
			x: 34,
			y: 5,
			sprite: JP.emakake,
			trigger: "talk",
			fixedDir: true,
			run: async (s) => {
				const t = s.flag("tod");
				// 深夜は 字を 書かない（seen_ema も 立てない）
				if (t === "shinya") {
					await s.narrate("くらがりで、絵馬が\nこつ、こつ　と　ふれあう。");
					return;
				}
				if (t === "asa") {
					// ハーモニカの子に「だれにも　言わないで」と言われた 人だけ（harmonica_kid の 回収。姿は 出さない）
					if (s.flag("seen_harmonica_ema")) {
						await s.narrate(
							"はっぴょう会の　絵馬の\nよこに、あたらしい　一枚。",
						);
						await s.narrate("『ハーモニカ、さいごまで\nふけますように』");
						return;
					}
				}
				// 宵と朝の 2回目は、ひとこと 言ってから 下の らくがき・コイの絵馬へ 流す（①の回収を 夕方だけに しない）
				const sideNote = !!s.flag("seen_ema") && (t === "asa" || t === "yoru");
				if (sideNote)
					await s.narrate(
						t === "asa"
							? "絵馬が、朝の　風で\nいっせいに　おなじ　むき。"
							: "常夜灯の　あかりで、\n絵馬の　かげが　ゆれる。",
					);
				if (!s.flag("seen_ema")) {
					s.set("seen_ema");
					await s.narrate(
						t === "yoru"
							? "常夜灯の　あかりで、\n絵馬の　かげが　ゆれる。"
							: "絵馬かけ。風で、絵馬が\nこつ、と鳴った。",
					);
					await s.narrate("『じてんしゃが　ほしい』");
					await s.narrate("『はっぴょう会で　まちがえ\nませんように』");
					await s.narrate("『でっかいコイが　つれます\nように』");
					return;
				}
				// ハーモニカの子に会った人だけ、はっぴょう会の絵馬のすみに目がいく（harmonica_kid の2回目と対）
				const kid = !!s.flag("seen_harmonica");
				if (kid)
					await s.narrate(
						"はっぴょう会の　絵馬。すみに、\nハーモニカの　らくがき。",
					);
				// ① ぬしの 話を 聞いた 人だけ、コイの 絵馬に もどる
				if (s.flag("seen_tsuri2")) {
					await s.narrate("『でっかいコイが　つれます\nように』の　絵馬。");
					await s.narrate(
						"ふちが　まるく　すりきれて、\nいちばん　ふるい　ひもだ。",
					);
					return;
				}
				if (!kid && !sideNote)
					await s.narrate("いちばん古い絵馬は、\n字が　きえて　よめない。");
			},
		},
		// ご神木: 夕方の2回目で うろの どんぐり（seen_donguri）→ 朝、ヤマガラが くわえていく
		{
			id: "goshinboku",
			x: 28,
			y: 5,
			trigger: "talk",
			run: async (s) => {
				const t = s.flag("tod");
				if (t === "yoru") {
					// 夕方に うろの どんぐりを 見た 人だけ、宵から 音（深夜・朝の ヤマガラへ）
					await s.narrate(
						s.flag("seen_donguri")
							? "うろの　ほうで、\nかさ、と　音。"
							: "クスノキの　葉が、夜風で\nかさかさ　こすれている。",
					);
					return;
				}
				if (t === "shinya") {
					// 夕方に うろの どんぐりを 見た 人だけ。宵の 音の あと、深夜は しずか（朝の ヤマガラへ つづく）
					await s.narrate(
						s.flag("seen_donguri")
							? "うろの　おくは、\nもう　しずかだ。"
							: "くらくて、みきの　太さだけ\nわかる。",
					);
					return;
				}
				if (t === "asa") {
					if (s.flag("seen_donguri")) {
						// 1回目は ヤマガラ → 2回目から へった どんぐり（seen_donguri_asa）
						if (s.flag("seen_donguri_asa")) {
							await s.narrate("うろの　どんぐりが、\nひとつ　へっている。");
							return;
						}
						s.set("seen_donguri_asa");
						await s.narrate(
							"うろの　ふちに、ヤマガラ。\nどんぐりを　くわえて　いった。",
						);
						return;
					}
					await s.narrate(
						s.flag("seen_goshinboku")
							? "しめなわに、朝つゆ。"
							: "ふるい　クスノキ。しめなわに、\n朝つゆ。",
					);
					return;
				}
				if (!s.flag("seen_goshinboku")) {
					s.set("seen_goshinboku");
					await s.narrate(
						"ふるい　クスノキ。みきに、\nしめなわが　まいてある。",
					);
					return;
				}
				s.set("seen_donguri");
				await s.narrate("みきのうろに、どんぐりが\nためこんである。");
				await s.narrate("……だれのだろう。");
			},
		},
		{
			id: "touro_a",
			x: 28,
			y: 6,
			trigger: "talk",
			run: jouyatou,
		},
		{
			id: "touro_b",
			x: 33,
			y: 6,
			trigger: "talk",
			run: jouyatou,
		},

		// ── 土手の道と斜面（街灯・きょり標・ススキ・ふみあと） ──
		{
			id: "lamp_w",
			x: 8,
			y: 7,
			trigger: "talk",
			run: gaitou("w"),
		},
		{
			id: "lamp_e",
			x: 24,
			y: 7,
			trigger: "talk",
			run: gaitou("e"),
		},
		{
			id: "kyorihyo",
			x: 12,
			y: 7,
			sprite: JP.signpost,
			trigger: "talk",
			fixedDir: true,
			run: async (s) => {
				s.set("seen_kyori_12");
				await s.narrate("くいの　きょり標。\n『河口から 12.5km』");
				await s.narrate("川は、まだ　ずっと\nつづいているらしい。");
			},
		},
		// ⑮ ススキ: 深夜に一本もらう（got_susuki）→ 朝、ぬいたあと・room desk のコップ（seen_susuki_kabin）
		{
			id: "susuki_a",
			x: 15,
			y: 9,
			trigger: "talk",
			run: async (s) => {
				const t = s.flag("tod");
				if (t === "shinya") {
					// 月は しずんでいる（白く 見える とは 書かない）。さわった 手ざわりだけ
					await s.narrate("ススキの　穂が、ほおを\nさわっと　なでた。");
					if (s.flag("got_susuki")) return;
					const i = await s.choose(["＞＞1 一本　もらう", "＞＞2 やめておく"], {
						cancel: 1,
					});
					if (i !== 0) return;
					s.se("item", { volume: 0.4 });
					s.set("got_susuki");
					await s.narrate("一本　ぬいて、ポケットに\nさした。");
					return;
				}
				if (t === "yoru") {
					await s.narrate("ススキの　ねもとで、\n虫が　鳴きはじめた。");
					return;
				}
				if (t === "asa") {
					await s.narrate(
						s.flag("got_susuki")
							? "一本　ぬいた　あとが、\nすきまに　なっている。"
							: "土手の　ススキが、\n朝の風で　ななめに　なる。",
					);
					return;
				}
				await s.narrate("ススキが、夕日で\n金色になっている。");
			},
		},
		{
			id: "fumiato",
			x: 26,
			y: 9,
			trigger: "talk",
			run: async (s) => {
				await s.narrate("土手のくさに、ふみあと。\n近道の　あとらしい。");
				const t = s.flag("tod");
				if (t === "yoru") {
					await s.narrate("ふみあとの　草が、街灯の\nはしで　ひかる。");
					return;
				}
				if (t === "asa") {
					// 深夜に ここへ すわった 人だけ（suwaru）
					if (s.flag("seen_suwari_kawara"))
						await s.narrate(
							"ゆうべ　すわった　ところ、\n草が　まるく　ねている。",
						);
					await s.narrate("……けさの分が、もう\nついている。");
					return;
				}
				// 深夜だけ、ここに すわれる（座れる場所は町に3か所だけ）
				if (t === "shinya") await suwaru(s);
			},
		},
		{
			id: "kasen_sign",
			x: 16,
			y: 10,
			sprite: JP.infoSign,
			trigger: "talk",
			fixedDir: true,
			run: async (s) => {
				await s.narrate("『ぞうすい時は　川に\n近づかない』");
				await s.narrate("かんばんの絵の波は、\nずいぶん　元気だ。");
			},
		},
		{
			id: "tsuri_bucket",
			x: 8,
			y: 10,
			sprite: JP.bucket,
			trigger: "talk",
			fixedDir: true,
			when: (st) => st.flags.tod !== "shinya",
			run: async (s) => {
				const t = s.flag("tod");
				if (t === "asa") {
					await s.narrate(
						"バケツの中に、ちいさいのが\n一ぴき。……リリースサイズだ。",
					);
					return;
				}
				// 宵はバケツだけが残っている（つりの人のことは書かない。深夜は丸いあとだけ＝tsuri_ato）
				if (t === "yoru") {
					await s.narrate(
						"つりのバケツ。ときどき、\nぱしゃ、と　水が　はねる。",
					);
					return;
				}
				await s.narrate("つりのバケツ。中では\n小魚が　まわっている。");
			},
		},
		{
			id: "tsuri_ato",
			x: 8,
			y: 10,
			trigger: "talk",
			when: (st) => st.flags.tod === "shinya",
			// ① ぬし: 夜はバケツが無い（seen_tsuri_ato → 朝の tsuri_asa 2回目「バケツは　夜、いっぺん…」）
			run: async (s) => {
				s.set("seen_tsuri_ato");
				await s.narrate("つり人の　跡。バケツの\n丸いあとだけ、のこっている。");
			},
		},

		// ── 対岸（行き止まりの見るもの＋ススキ h のむこうの隠し） ──
		// 足もとの物なので踏んで通れる（東どなりの taigan_view を (21,15) から調べる）
		{
			id: "hanabi_ato",
			x: 21,
			y: 15,
			sprite: JP.hanabiAto,
			trigger: "talk",
			through: true,
			fixedDir: true,
			// ③ 夏まつりの名残（seen_natsu_kawa → natsuOwari）。深夜は見えずに足で、朝はつゆで
			// 深夜に 足で ふんだ（seen_natsu_kawa_shinya）→ 朝、つぶれた つつ。「夏の　わすれもの」は はじめての 一度だけ
			run: async (s) => {
				const mita = !!s.flag("seen_natsu_kawa");
				s.set("seen_natsu_kawa");
				const t = s.flag("tod");
				if (t === "shinya") {
					await s.narrate("足もとで、紙の　つつが\nかさっと　鳴った。");
					await s.narrate("……花火の　もえかすだ。");
					s.set("seen_natsu_kawa_shinya");
				} else if (t === "asa") {
					await s.narrate(
						s.flag("seen_natsu_kawa_shinya")
							? "ゆうべ　ふんだ　つつが、\nつぶれている。"
							: "花火の　もえかすが、\n朝つゆで　しめっている。",
					);
				} else if (t === "yoru") {
					if (!mita) await s.narrate("花火の　もえかす。");
					await s.narrate("川かぜで、つつが　ころ、と\nころがった。");
				} else {
					await s.narrate("花火の　もえかす。");
				}
				if (!mita) await s.narrate("夏の　わすれものだ。");
				await natsuOwari(s);
			},
		},
		{
			id: "taigan_view",
			x: 22,
			y: 15,
			trigger: "talk",
			run: async (s) => {
				const t = s.flag("tod");
				// 石碑『もどりばし』を読んだ人だけ、一度（名の由来は言わない。行きどまりの川岸と橋だけ）
				if (s.flag("seen_hashi_sekihi") && !s.flag("seen_modori")) {
					s.set("seen_modori");
					await s.narrate("ここで、行きどまり。\nもどる　橋は、あれだけだ。");
				}
				if (t === "shinya") {
					await s.narrate("川ごしの町。街灯が、\nぽつ、ぽつ、と　あるだけだ。");
					// 帰る場所のあたり（nostalgia.md P0-5）。一度だけ。窓が見えたとは言わない
					if (s.flag("seen_taigan_shinya")) return;
					s.set("seen_taigan_shinya");
					await s.say("kiriko", "……うちの　アパート、\nあのへんンゴ？");
					await s.narrate("街灯の　ならびの、どこか。");
					await s.say("kiriko", "（電気、けして\nきたっけ）");
					return;
				}
				if (t === "yoru") {
					await s.narrate("川ごしの町。窓の灯りが、\nならんで　ともっている。");
					await s.say("kiriko", "（どれが　どの家か、\nさっぱりンゴ）");
					return;
				}
				if (t === "asa") {
					await s.narrate("川ごしの町が、あさの\n白い光の中にある。");
					// 深夜に アパートの あたりを さがした 人（seen_taigan_shinya）。夕→深夜→朝の 三段
					if (s.flag("seen_taigan_shinya"))
						await s.narrate("ゆうべ　さがした　あたりの、\n屋根が　見える。");
					return;
				}
				await s.narrate("川ごしに、町。\nぜんぶ、夕やけの色だ。");
			},
		},
		{
			id: "susuki_taigan",
			x: 18,
			y: 15,
			trigger: "talk",
			// 夕方の ちいさな くつあと（水きりの子の かくし場所へ）→ 朝、ぬれた くつあと（石を かりた 人だけ）
			run: async (s) => {
				const t = s.flag("tod");
				// 宵・深夜は音だけ（宵の文に「だれも」を出さない。nostalgia.md P0-1 の受け入れ条件）
				if (t === "yoru" || t === "shinya") {
					await s.narrate("こっち岸のススキが、\n川かぜで　さわさわ　鳴る。");
					return;
				}
				if (t === "asa" && s.flag("seen_mizukiri_nage")) {
					await s.narrate(
						"ぬれた　ちいさな　くつあとが、\nススキの　むこうへ　つづく。",
					);
					return;
				}
				// 夕方に くつあとを 見た 人だけ（seen_kutsuato）、けさの ぶんで ふかくなる
				// （『いったり　きたり』は mizukiri_ishi の 朝だけ）
				if (t === "asa" && s.flag("seen_kutsuato")) {
					await s.narrate("くつあとは、きのうより\nふかい。");
					return;
				}
				await s.narrate("こっち岸のススキは、\nだれにも　刈られていない。");
				if (t === "yu") {
					s.set("seen_kutsuato");
					await s.narrate("ねもとに、ちいさな　くつの\nあとが　つづいている。");
				}
			},
		},
		{
			id: "mizukiri_ishi",
			x: 13,
			y: 15,
			trigger: "talk",
			// ⑥ やまみちの 石を かえす: 夕方に かりて なげた（seen_mizukiri_nage）→ やまみちの 川で ひろう
			// （got_ishi_yama）→ ここで 山に のせる（seen_ishi_kaeshi。mizukiri_kid・kirokuLines が読む）。
			// 朝に のせた 人は seen_ishi_kaeshi_asa（その朝の 見なおしで「もう一まい」と言わない）
			run: async (s) => {
				const t = s.flag("tod");
				const nage = !!s.flag("seen_mizukiri_nage");
				const kaesu =
					nage && !!s.flag("got_ishi_yama") && !s.flag("seen_ishi_kaeshi");
				if (t === "shinya") {
					// 月は しずんでいる。見えないので、さわって たしかめる
					if (kaesu) {
						s.set("seen_ishi_kaeshi");
						await s.narrate("手さぐりで、石の　山の\nてっぺんに　のせた。");
						await s.say("kiriko", "（これで　かえせたンゴ）");
						return;
					}
					await s.narrate(
						s.flag("seen_ishi_kaeshi")
							? "さわると、石の山は\nもとの　高さだ。"
							: nage
								? "さわると、石の山は\nひとつぶん　ひくいまま。"
								: "ススキの　かげで、ゆびが\nつめたい　石に　さわった。",
					);
					return;
				}
				// ⑥ 水きりの子と 二度 以上 話した 人だけ（あの子が 朝も 来ている。姿は 出さない）
				if (t === "asa" && numFlag(s, "seen_mizukiri_kid") >= 2)
					await s.narrate(
						"水ぎわの　すなに、ちいさな\nくつあとが　いったり　きたり。",
					);
				if (nage) {
					if (t === "asa") {
						let kaeshita = false;
						if (s.flag("seen_ishi_kaeshi_asa")) {
							// けさ のせた 人の 見なおし（高さは 言わない）
							await s.narrate("いちばん上に、やまみちの\n石が　のっている。");
						} else if (s.flag("seen_ishi_kaeshi")) {
							// ゆうべ かえした 人（あの子が 朝 来て、もう一まい。もとより ひとつ 高い）
							await s.narrate("石の山が、ゆうべより\nひとつぶん　高い。");
							await s.narrate(
								"ゆうべ　のせた　石の　上に、\nもう　一まい　のっている。",
							);
						} else {
							// かえしていない 人・けさ かえす 人（あの子が 一まい たして、もとの 高さ）
							await s.narrate("石の山が、もとの　高さに\nもどっている。");
							await s.narrate(
								"いちばん上に、あたらしい\nひらたい　石が　一まい。",
							);
							if (kaesu) {
								s.set("seen_ishi_kaeshi");
								s.set("seen_ishi_kaeshi_asa");
								kaeshita = true;
								await s.narrate("その上に、やまみちの\n石を　のせた。");
							}
						}
						// キリコは 一つまで（すみれの ひみつきちの ひらたい石 ＞ けさ かえせた）
						if (s.flag("seen_kichi_ishi"))
							await s.say("kiriko", "（……たからものの\n石ンゴ）");
						else if (kaeshita)
							await s.say("kiriko", "（これで　かえせたンゴ）");
						return;
					}
					if (kaesu) {
						s.set("seen_ishi_kaeshi");
						await s.narrate(
							"やまみちの　ひらたい　石を、\n石の山の　てっぺんに　のせた。",
						);
						await s.say("kiriko", "（これで　かえせたンゴ）");
						return;
					}
					await s.narrate(
						s.flag("seen_ishi_kaeshi")
							? "石の山は、もとの　高さに\nもどっている。"
							: "石の山が、ひとつぶん\nひくくなっている。",
					);
					return;
				}
				// susuki_taigan の 夕方の くつあと（seen_kutsuato）を 見た 人だけ、はじめて 来たときに 一度
				if (
					t === "yu" &&
					s.flag("seen_kutsuato") &&
					!s.flag("seen_kutsuato_ishi")
				) {
					s.set("seen_kutsuato_ishi");
					await s.narrate("くつあとは、ここで\nおわっている。");
				}
				await s.narrate(
					"ススキのかげに、ひらたい\n石が、きれいに　つんである。",
				);
				await s.narrate("だれかの、水きりの\nとっておきらしい。");
				const i = await s.choose(
					["＞＞1 一まい　かりる", "＞＞2 そっとしておく"],
					{ cancel: 1 },
				);
				if (i === 0) {
					s.set("seen_mizukiri_nage");
					await s.narrate("えいっ。");
					await s.narrate("――三回はねて、\nしずんだ。");
					await s.say("kiriko", "……かえせなくなったンゴ");
					return;
				}
				await s.narrate("そっとしておいた。");
			},
		},

		// ── 夕方の人たち（くだらない雑談だけ。説明しない） ──
		// つりの人（3層: 初回／二層目=ぬしの話／待機）
		npc(
			"tsuri_jichan",
			9,
			10,
			GRANDPA,
			async (s) => {
				if (!s.flag("seen_tsuri")) {
					s.set("seen_tsuri");
					await s.say(
						null,
						"つれるかって？　それを\nきくのは　やぼってもんよ",
						{
							name: "つりの人",
						},
					);
					await s.say("kiriko", "（きいてないンゴ……）");
					await s.say(null, "川を見てるだけで、\n一日おわる。それでいいの", {
						name: "つりの人",
					});
					return;
				}
				if (!s.flag("seen_tsuri2")) {
					s.set("seen_tsuri2");
					await s.say(null, "この川にはな、ぬしが\nいるんだ。二十年ものの鯉", {
						name: "つりの人",
					});
					await s.say("kiriko", "見たこと、あるンゴ？");
					await s.say(null, "二十年前に、\nいっぺんだけな", {
						name: "つりの人",
					});
					await s.say("kiriko", "……それ、もう　いない\nンゴじゃ……");
					await s.say(null, "――しっ。いま、いいとこ", { name: "つりの人" });
					return;
				}
				await s.narrate("うきが、ぴくりとも\nしていない。");
				await s.say(null, "……しっ。いまいいとこ", { name: "つりの人" });
			},
			{ dir: "down", when: (st) => st.flags.tod === "yu" },
		),
		// ランニングの人（周回。話しかけても会釈だけ＝無害な他者のベースライン）
		npc(
			"runner_yu",
			16,
			8,
			RUNNER,
			async (s) => {
				const had = !!s.flag("seen_runner_yu");
				s.set("seen_runner_yu");
				await s.narrate("はしりながら、かるく\n会釈をされた。");
				// ㉑ やまみちで すれちがった 鈴の ランナー（seen_runner_yama）と おなじ人。
				// 気づくのは一度だけ: やまみちが 先だった人に、ここで 初めて 会ったとき。
				// かわらが 先だった人は yamamichi runner_yu で もう 気づいているので、だまって 立てるだけ
				if (s.flag("seen_runner_yama")) {
					s.se("suzu", { volume: 0.4 });
					await s.narrate("すれちがうとき、こしの\n鈴が　ちりちり　鳴った。");
					if (!s.flag("seen_runner_suzu")) {
						s.set("seen_runner_suzu");
						if (!had) await s.say("kiriko", "（やまみちの　人ンゴ）");
					}
				}
			},
			{ wander: true, when: (st) => st.flags.tod === "yu" },
		),
		npc(
			"harmonica_kid",
			25,
			9,
			KID,
			async (s) => {
				if (!s.flag("seen_harmonica")) {
					s.set("seen_harmonica");
					await s.narrate("ハーモニカの音が、\nとぎれとぎれに　きこえる。");
					await s.say(null, "れんしゅう中だから、\nきかないで", {
						name: "土手の子",
					});
					await s.say("kiriko", "（きこえてたンゴ）");
					return;
				}
				// 2回目: 絵馬かけを見た人にだけ、一度（はっぴょう会の絵馬は この子の。emakake のらくがきと対）
				if (s.flag("seen_ema") && !s.flag("seen_harmonica_ema")) {
					s.set("seen_harmonica_ema");
					await s.say(null, "……絵馬、見た？　あれ、\nだれにも　言わないで", {
						name: "土手の子",
					});
					await s.say("kiriko", "（言わないンゴ）");
					return;
				}
				await s.say(null, "……はっぴょう会、\nらいしゅうなんだ", {
					name: "土手の子",
				});
			},
			{ dir: "down", when: (st) => st.flags.tod === "yu" },
		),
		npc(
			"mizukiri_kid",
			17,
			11,
			KID,
			async (s) => {
				// ⑥ 話すたび +1（seen_mizukiri_kid 数。2以上は 朝の mizukiri_ishi の くつあと、3以上（五回の 話を 聞いた）は umi が読む）
				const n = numFlag(s, "seen_mizukiri_kid");
				s.set("seen_mizukiri_kid", n + 1);
				if (n === 0) {
					await s.say(null, "見てて。……そりゃっ", { name: "水きりの子" });
					await s.narrate("石は、一回もはねずに\nしずんだ。");
					await s.say(null, "……いまのは、にぎりが\nわるかった", {
						name: "水きりの子",
					});
					await s.say("kiriko", "（きろくは、ゼロンゴ）");
					return;
				}
				// (61) 話す2回目に一度: 日曜の しあい（koen nittei の『vs かわしもクラブ』と どちらの順でも つながる）
				const shiai = async () => {
					if (n !== 1 || s.flag("seen_shiai_kawa")) return;
					s.set("seen_shiai_kawa");
					await s.say(null, "日曜、こうえんで　しあい。\nかわしもクラブ", {
						name: "水きりの子",
					});
					if (s.flag("seen_koen_nittei"))
						await s.say("kiriko", "（日程表の、\nかわしもンゴ）");
				};
				// 話す3回目に一度: susuki_taigan の くつあと（seen_kutsuato）を 見て、石を かえしていない 人だけ
				const susuki = async () => {
					if (n !== 2 || !s.flag("seen_kutsuato") || s.flag("seen_ishi_kaeshi"))
						return;
					await s.say(null, "……ススキの　とこ、\n見た？", {
						name: "水きりの子",
					});
				};
				// ⑥ かくし場所の 石を かりた 人だけ（やまみちの 石を かえした 人には「ふえてた」）
				if (s.flag("seen_mizukiri_nage")) {
					if (s.flag("seen_ishi_kaeshi")) {
						await s.say(null, "とっておきの　石、\nなんか　ふえてた", {
							name: "水きりの子",
						});
						await s.say("kiriko", "（……やまみちの　石ンゴ）");
						await shiai();
						return;
					}
					await s.say(null, "とっておきの　石、\nへってた。……だれだよ", {
						name: "水きりの子",
					});
					await s.say("kiriko", "（……ごめんンゴ）");
					await shiai();
					await susuki();
					return;
				}
				// 石を かりていない 人: 0回目 ゼロ → 1回目 一回 はねる → 2回目 五回の 話（umi の 浜の子の 前振り）→ あとは きろく 一回のまま
				if (n === 1) {
					await s.say(null, "……そりゃっ", { name: "水きりの子" });
					await s.narrate("――ぽちゃん。……一回、\nはねた。");
					await s.say(null, "いまの　見た？", { name: "水きりの子" });
					await shiai();
					return;
				}
				if (n === 2) {
					await s.say(
						null,
						"五回はねる人も、いるんだ。\nどこで練習してんだか",
						{
							name: "水きりの子",
						},
					);
					await susuki();
					return;
				}
				await s.say("kiriko", "（きろくは、一回ンゴ）");
			},
			{ dir: "down", when: (st) => st.flags.tod === "yu" },
		),

		// ── 朝の人たち（セリフ全差し替え。夕方の setup の payoff） ──
		npc(
			"tsuri_asa",
			9,
			10,
			GRANDPA,
			async (s) => {
				if (!s.flag("seen_tsuri_asa")) {
					s.set("seen_tsuri_asa");
					await s.say(
						null,
						"あさまづめ、ってやつよ。\n……つれるかは、べつの話",
						{
							name: "つりの人",
						},
					);
					if (s.flag("seen_tsuri")) {
						await s.say(null, "ゆうべの子か。ほら、\nバケツ、見てみな", {
							name: "つりの人",
						});
						await s.say("kiriko", "（……ちいさいンゴ）");
					}
					// ① 深夜の 川で 大きな 音を 聞いた 人だけ
					if (numFlag(s, "seen_kawa_shinya") >= 2) {
						s.set("seen_nushi");
						await s.say(null, "夜中に、でっかいのが\nはねたろ", {
							name: "つりの人",
						});
						await s.say("kiriko", "……聞いたンゴ");
						await s.say(null, "ぬしだよ。……まだ、いる", {
							name: "つりの人",
						});
					}
					return;
				}
				// ① 深夜に バケツの 丸いあとだけを 見た 人に、一度（tsuri_ato の回収）
				if (s.flag("seen_tsuri_ato") && !s.flag("seen_tsuri_baketsu")) {
					s.set("seen_tsuri_baketsu");
					await s.say(null, "バケツは　夜、いっぺん\nもって　かえるのよ", {
						name: "つりの人",
					});
					await s.say(null, "……ぬしに　とられちゃ\nかなわんからな", {
						name: "つりの人",
					});
					await s.say("kiriko", "（ゆうべ、なかったンゴ）");
					return;
				}
				await s.narrate("うきを、じっと\n見ている。");
			},
			{ dir: "down", when: (st) => st.flags.tod === "asa" },
		),
		npc(
			"houki_baachan",
			32,
			5,
			"pub:sprites/mob_obaachan.png",
			async (s) => {
				if (!s.flag("seen_houki")) {
					s.set("seen_houki");
					await s.narrate("竹ぼうきで、やしろの\n前を　はいている。");
					if (s.flag("seen_baachan")) {
						await s.say(null, "おや、足音の　子だね", { name: "ばあちゃん" });
						// ⑦ 夕方に「あしたの朝は、かわらの やしろを はきに いくの」を聞いた人（street baachan 2回目）
						await s.say(
							"kiriko",
							s.flag("seen_baachan2")
								? "……ほんとに、\nはきに　来てるンゴ"
								: "……まちのどおりの、\n花の　ひとンゴ？",
						);
						await s.say(null, "朝は　ここ。ろうそくを\nかえにくるのさ", {
							name: "ばあちゃん",
						});
					} else {
						await s.say(null, "はやいね。ろうそく、\nかえにきたんだよ", {
							name: "ばあちゃん",
						});
					}
					// 心の声は一つだけ（深夜の常夜灯 ＞ 宵の マッチ ＞ 夕方・宵の やしろの 竹ぼうき）
					if (s.flag("seen_jouyatou_shinya"))
						await s.say("kiriko", "（……ゆうべの　ほのお、\nこのひとのンゴ）");
					else if (s.flag("seen_yashiro_match"))
						await s.say("kiriko", "（マッチの　ひと、\nこのひとンゴ）");
					else if (s.flag("seen_yashiro_houki"))
						await s.say(
							"kiriko",
							"（たてかけてあった　ほうき、\nこのひとのンゴ）",
						);
					return;
				}
				// 2回目: 石段の 四つめを ふんだ 人／チョークの 数字を 見た 人に、一度だけ（kazoe の『4』の ぬけ を 閉じる）
				if (
					(s.flag("seen_ishidan") || s.flag("seen_kazoe")) &&
					!s.flag("seen_ishidan_naoru")
				) {
					s.set("seen_ishidan_naoru");
					await s.say(
						null,
						s.flag("seen_ishidan")
							? "四つめの　段、\nらいげつには　なおるよ"
							: "4の　段は、こどもらが\nとばして　のぼるのさ",
						{ name: "ばあちゃん" },
					);
					return;
				}
				// 石碑『もどりばし』と 銘板『もどりはし』を 両方 見た 人だけ、一度（片方だけの 人には 出さない）
				if (
					s.flag("seen_hashi_sekihi") &&
					s.flag("seen_hashi_meiban") &&
					!s.flag("seen_hashi_naze")
				) {
					s.set("seen_hashi_naze");
					await s.say(
						null,
						"銘板　つくった　役場の人が、\nにごりを　わすれたのさ",
						{
							name: "ばあちゃん",
						},
					);
					await s.say("kiriko", "（……それだけンゴ）");
					return;
				}
				await s.narrate("しゃっ、しゃっ、と\nほうきの　音。");
			},
			{ dir: "down", when: (st) => st.flags.tod === "asa" },
		),
		npc(
			"runner_asa",
			28,
			8,
			RUNNER,
			async (s) => {
				// 夕方に 会釈を された 人だけ「ゆうべの人だ」
				if (s.flag("seen_runner_yu") && !s.flag("seen_runner_asa")) {
					s.set("seen_runner_asa");
					await s.narrate("ゆうべの人だ、という顔を\nされた。");
					await s.narrate("……会釈を、かえしておく。");
				} else {
					await s.narrate("おなじ　ペースで、\n土手を　はしっていく。");
				}
				// ㉑ やまみちで すれちがった 鈴の ランナー（yamamichi runner_yu）
				if (s.flag("seen_runner_yama")) {
					s.se("suzu", { pan: 0.2, volume: 0.4 });
					await s.narrate("こしの　鈴が、\nちりんと　鳴った。");
				}
			},
			{ wander: true, when: (st) => st.flags.tod === "asa" },
		),
		npc(
			"inu_sanpo",
			14,
			8,
			WALKER,
			async (s) => {
				if (!s.flag("seen_inu_kawara")) {
					s.set("seen_inu_kawara");
					// ㉒ 水ぎわに下りて しらさぎを とばした 人（sagiBelt）には、ほえる 相手が いない
					if (s.flag("seen_sagi_asa")) {
						await s.narrate("犬が、川のほうを　見て、\n首を　かしげた。");
						await s.say(null, "いつもは、白い鳥に\nだけ　ほえるんですけど", {
							name: "犬のさんぽの人",
						});
						await s.say("kiriko", "（……吾輩が、\nとばしたンゴ）");
						return;
					}
					await s.narrate("犬が、川に向かって\n一声だけ　ほえた。");
					await s.say(null, "すみません。あの白い鳥に\nだけ、ほえるんです", {
						name: "犬のさんぽの人",
					});
					await s.say("kiriko", "（こだわりが　あるンゴ）");
					return;
				}
				// ⑳ 夕方の 浜で 会った 人（umi inu_umi）。一度だけ
				if (s.flag("seen_inu_umi") && !s.flag("seen_inu_kawara2")) {
					s.set("seen_inu_kawara2");
					await s.say(
						null,
						"……あら、浜で　あった　子ね。\nこの子の　順路、川ぞいなの",
						{
							name: "犬のさんぽの人",
						},
					);
					// 浜で「かえったら　シャンプー」を聞いた人だけ
					if (s.flag("seen_inu_umi2"))
						await s.say(null, "……シャンプー、\nむだに　なったわ", {
							name: "犬のさんぽの人",
						});
					return;
				}
				// 浜から顔を知っている人には、くだけた口調のまま
				if (s.flag("seen_inu_kawara2")) {
					await s.say(null, "この子、順路に\nうるさいのよ", {
						name: "犬のさんぽの人",
					});
					return;
				}
				await s.say(null, "この子、さんぽの順路に\nうるさいんですよ", {
					name: "犬のさんぽの人",
				});
			},
			{ wander: true, when: (st) => st.flags.tod === "asa" },
		),
	],
};
