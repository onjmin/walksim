// キリコの部屋（プロローグの一日の起点。DESIGN §4 時間帯システム・docs/style-everyday.md）。
// 12×10 の室内。ベッド・机・本棚・テレビ・モニター・蓄音機・日記（セーブ）・やかん・ドア。
// ゲームは street（夕方・tod="yu"）から始まり、帰宅で evening（tod を "yoru" に）→
// ベッドで就寝 → tod="shinya" になり、既存の 2:00 の目ざめ（opening）→「散歩してくるンゴ」。
// ドアは apart へ（座標凍結v2: room (5,9) → apart (2,3)）。
// 朝（tod="asa"）は まちのどおりの 窓の 場面（転）の あと。寄れば 秒針が 戻り、スレが 動き出す（結は umi.ts）。
// BGM は無音。秒針の音（tick）は時間帯ごとに SE で鳴らし分ける。
// カレンダーは 9月・13日に まる（外の 町に 越してきて ひと月。STORY.md §5.5）。
// テレビは、深夜は 月曜の 放送休止（seen_tv_shinya）。朝に つけると、テレビも おきている。
//
// ノスタルジー層（docs/nostalgia.md。共通部品は data/nostalgia.ts）。自室は錨（罠12）：異常も気配も足さない。
// 足すのは日常の物と、外で見たものの1行だけ。
//   宵   … テレビのナイターが、宵に回った地区の数か見た回数で延長の段を進む → 中継の打ち切り（P0-2）。
//           打ち切りのあとは、スレもその話。窓から一度だけ外への誘い（P0-1）→ street arrive_yoru で一言。
//           窓の音は yoruStep で 台所の水 → ふろの戸。スレは見るたびに ごちそうさま → おちる。
//           日記に きょうの一行（P0-4）。布団にもぐると、夕方に聞いた音が遠く鳴る（P0-3・④）。
//           蚊にさされていれば、まだかゆい（P0-10）。かべの時計は町の宵の時計（yoruClock。
//           テレビが町より先へ進んだら時刻は出さない）。やかんを かけただけで 出かけるか ねると、
//           火を とめてから（seen_kettle_tome → かけなおし／深夜の わかしかけ → 朝の ゆうべの お湯）
//   深夜 … 日記のつぎのページ。町を歩いてきたあとはポエムを書いてしまう（P0-4）。机で缶を飲み干す（P0-6）。
//           歩いてもどると、ふとんは冷えている・すわってきたら すそが しめっている（㉟）。ススキをコップに（⑮）。
//           モニターの すみの時計は町の深夜の時計（shinyaClock）。外から見えた あおい窓は これ
//           （⑫。street my_win／団地＋かわらの人。かわらだけ・団地だけの人には言わない）
//   朝   … ポエムを消しゴムで消す（P0-4）。机にレシートか ピザやのチラシ（P0-9・㊻）。枕元に福引券・かゆみは消えている（P0-9・P0-10）。
//           かべの時計は町の朝の時計（asaClock）にあわせる。ゆうべのレコードを本棚の空き箱へ。
//           ゴミの札を見た人に ゴミの車の音楽（⑯）。スレで お皿の つづき
//
// 読むだけのフラグ: got_dinner_onigiri / got_dinner_pan（street。夕方の買い物）・
//   done:<map>:arrive_yu（布団の遠い音）・done:<map>:arrive_yoru / arrive_shinya（nostalgia.ts 経由）・
//   seen_ka（kawara）・got_korokke / seen_kaikei（suupaa）・got_fukubikiken（tonarimachi）・got_kan（深夜の自販機）・
//   布団の遠い音（④）: seen_fumikiri_yu / seen_fumikiri_yoru（senro）・seen_tekkyo（kawara）・seen_densha_yu（street）・
//   seen_tonarimachi（ekimae）・seen_umi_densha（umi）・seen_piano_yu（sumire）・seen_gohan_danchi（danchi）・
//   seen_futon_tori（danchi。㉚）・got_hari / seen_hari_mise / seen_kotto_phono / seen_record_poster（tonarimachi。⑭㉙）・
//   got_susuki（kawara。⑮）・seen_aki_*（akiMatsuri 経由）・rec_q（アイテム。朝の本棚）・
//   seen_kotto_radio（数。tonarimachi。㊴）・seen_suupaa_senzai / seen_suupaa_denchi / seen_suupaa_cupmen（㊺）・
//   seen_bukatsu_korokke（kokudo。㉘）・got_pizza_chirashi（apart mybox。㊻）・
//   seen_keiji（apart）/ seen_gomi_fuda（danchi。⑯）・
//   seen_denki_kaishu（apart door_room。⑫）＋ seen_mywin_ao（street）/ seen_danchi_ue（danchi）/
//   seen_taigan_shinya（kawara）・seen_suwari_*（suwariNure 経由。㉟）・
//   seen_502_yakiu / seen_503_yoru（apart。筋(53)）・seen_tanaka_inu（street。筋(52)）・got_senro_bane（senro。筋(57)）・
//   seen_koen_kaikan（koen。筋(55)）・seen_susuki_yama（yamamichi）。
// set するフラグ: tod（"yoru"→"shinya"）・seen_asa_thread・seen_clock_denchi・seen_hoshumura・
//   seen_tv_yoru（数）・seen_chukei_end・seen_tenki・seen_tv_shinya・seen_yoru_sasoi・
//   seen_pc_yoru（数）・seen_pc_chukei・seen_kettle_yoru（数）・seen_kettle_tome・seen_phono・seen_hari_kaeta（kirokuLines が読む）・
//   seen_pc_ao・seen_pc_osara・seen_pizza_asa・seen_tv_senzai・seen_suwari_nure・
//   seen_hari_maru・seen_phono_kurabe・seen_susuki_kabin・seen_tana_rec・seen_cal_aki・
//   seen_nikki_yoru / seen_nikki_shinya（字）・seen_nikki_kesu・got_kan（kanDesk 経由）・
//   seen_phono_asa（筋(53)。shelf が読む）・seen_phono_kara（数。宵の から回りの段）・seen_kitaku_yoru（宵に帰った。window が読む）・
//   seen_nikki_asa・seen_receipt・seen_makura_asa・seen_bane_asa（この4つは room の中だけ。朝の日記・机・枕元を一度にする）。

import type { MapDef, Story, TileDef } from "../../engine/defs";
import {
	akiMatsuri,
	arrived,
	asaClock,
	chukeiDan,
	kanAsa,
	kanDesk,
	kanLv,
	NIKKI,
	nikkiKey,
	nikkiPoem,
	nikkiYoru,
	numFlag,
	POEM,
	poemKey,
	shinyaClock,
	shinyaStep,
	shinyaWalked,
	suwariNure,
	truckOoi,
	yoruClock,
	yoruStep,
} from "../nostalgia";
import { SPR } from "../sprites";
import { HOME_DIARY, ROOM } from "../tiles";

// 絵は自作チップ（data/tiles.ts の ROOM・scripts/make-home-tiles.mjs）
const tiles: Record<string, TileDef> = ROOM;

// W 窓 / Q 絵（ポスター） / c カレンダー / k 壁掛け時計 / Z z ベッド / t 机 / j やかんの台 / B 本棚 / V テレビ / M モニター / n いす
const rows = [
	"            ", // y0
	" HHWHHQHHHH ", // y1  窓 (3,1)・ポスター (6,1)
	" hhhchhhkhh ", // y2  カレンダー (4,2)（(4,3) から）・壁掛け時計 (8,2)
	" Zto.B.V.M. ", // y3  ベッド (1,3)・机 (2,3)・本棚 (5,3)・テレビ (7,3)・モニター (9,3)
	" z.......nw ", // y4  いす (9,4)。目ざめの場所 (2,4)
	" g.....m... ", // y5
	" .........j ", // y6  日記 (2,6)・蓄音機 (5,6)・やかんの台 (10,6)
	" e......l.. ", // y7
	" .........f ", // y8  apart からの戻り位置 (5,8)
	"     D      ", // y9  ドア (5,9) → apart (2,3)（座標凍結v2）
];

/** 朝のスレの書き込み（名前欄「名無しさん」。声はカメオ音源。DESIGN §5）。 */
const post = (s: Story, who: string, text: string) =>
	s.say(who, text, { name: "名無しさん", noPortrait: true });

/**
 * 晩ごはんの呼び名（street の買い物フラグで決まる。どちらも無ければ、スーパーのコロッケ（㉘）か、
 * 戸だなのカップめん）。
 */
const dinnerName = (s: Story): string =>
	s.flag("got_dinner_onigiri")
		? "おにぎりの　ふくろ"
		: s.flag("got_dinner_pan")
			? "パンの　ふくろ"
			: s.flag("got_korokke")
				? "コロッケの　つつみ"
				: "カップめんの　空き";

/**
 * 布団で聞く町（nostalgia.md P0-3・④）。夕方〜宵に その音を 聞いた 人だけに、遠く小さく。
 * flags のどれかが立っているか、also のどれかの時間帯に その地区へ着いていれば鳴らす。
 * flags も also も無い行は、その地区の arrive_yu が済んでいるとき。
 * 上から見て、電車（densha）は最初の1つだけ・合わせて3音まで。並びが そのまま 優先。地区名は出さない。
 */
const TOOI_OTO: {
	map: string;
	/** どれかが 立っていれば 鳴らす（flags も also も 無い行は arrive_yu で）。 */
	flags?: string[];
	/** この時間帯に その地区へ着いていても 鳴らす（flags と どちらか）。 */
	also?: ("yu" | "yoru")[];
	/** 電車の音（一晩に1つだけ鳴らす）。 */
	densha?: true;
	/** 2打（秒針の1打と 鳴らし分ける。ふみきりの かんかん）。 */
	twice?: true;
	se: string;
	pan: number;
	volume: number;
	text: string;
	/** 筋(65) 国道でトラックを何台も見た人（truckOoi）だけの文（kokudo 行のみ）。 */
	textMany?: string;
}[] = [
	// senro のふみきり（夕方 seen_fumikiri_yu・宵 seen_fumikiri_yoru）
	{
		map: "senro",
		flags: ["seen_fumikiri_yu", "seen_fumikiri_yoru"],
		densha: true,
		twice: true,
		se: "tick",
		pan: 0.3,
		volume: 0.15,
		text: "ふみきりの　音が、\nかすかに　とどく。",
	},
	// kawara tekkyo_belt（夕方の鉄橋）
	{
		map: "kawara",
		flags: ["seen_tekkyo"],
		densha: true,
		se: "densha_far",
		pan: 0.6,
		volume: 0.3,
		text: "とおくで、鉄橋を\nわたる音。",
	},
	// street densha_yu（夕方の通りで聞いた電車）
	{
		map: "street",
		flags: ["seen_densha_yu"],
		densha: true,
		se: "densha_far",
		pan: 0.4,
		volume: 0.2,
		text: "夕方と　おなじ　方から、\n電車の　音。",
	},
	// ekimae norikomi（となりまちへ乗った）
	{
		map: "ekimae",
		flags: ["seen_tonarimachi"],
		densha: true,
		se: "densha_far",
		pan: -0.3,
		volume: 0.3,
		text: "とおくで、電車が\nとなりまちへ　出ていく音。",
	},
	// umi densha_belt（浜で見た電車）。旗の無い ekimae の行より上（④。駅前に着いただけの人に負けない）
	{
		map: "umi",
		flags: ["seen_umi_densha"],
		densha: true,
		se: "densha_far",
		pan: 0.7,
		volume: 0.2,
		text: "とおくで、電車が　一本、\nかえっていく音。",
	},
	{
		map: "ekimae",
		densha: true,
		se: "densha_far",
		pan: -0.3,
		volume: 0.3,
		text: "とおくで、電車が\n出ていく音。",
	},
	// sumire yamada_door（同じところで つっかえる ピアノ。朝は「こえた」）。
	// sumire arrive_yu の「おなじところで、とまった」ピアノを聞いた人にも（also: yu）
	{
		map: "sumire",
		flags: ["seen_piano_yu"],
		also: ["yu"],
		se: "needle",
		pan: -0.2,
		volume: 0.1,
		text: "ピアノが、また\nおなじところで　つっかえた。",
	},
	// danchi gohanYobu（夕方の「ごはんよー」のあとの、戸のしまる音）
	{
		map: "danchi",
		flags: ["seen_gohan_danchi"],
		se: "door",
		pan: -0.4,
		volume: 0.2,
		// 距離を文で決めておく（部屋のすぐ外の気配に読ませない。自室は錨＝罠12）
		text: "ずっと　むこうで、戸の\nしまる音。",
	},
	// 筋(52) street h2_win（宵の窓辺の、たなかさんちの犬のはなさき。seen_tanaka_inu）→ 朝 h2_door
	{
		map: "street",
		flags: ["seen_tanaka_inu"],
		se: "popo",
		pan: 0.5,
		volume: 0.1,
		text: "どこかで、犬が\nひと声　だけ。",
	},
	// kokudo（夕方か宵に、国道へ着いた人に。トラックの音として言いきる）
	{
		map: "kokudo",
		also: ["yu", "yoru"],
		se: "train",
		pan: -0.8,
		volume: 0.2,
		text: "国道を、トラックの\nながい　音が　とおっていく。",
		// 筋(65) kokudo truck_a/truck_b で数えた（seen_truck_kokudo>=4）人には、まだ　とおっている
		textMany: "トラックが、また　一台\nとおっていく。",
	},
];

/** 布団の中で、遠い音を順に鳴らす（宵の就寝だけ）。1音でも鳴らしたら true。 */
const tooiOto = async (s: Story): Promise<boolean> => {
	const heard: (typeof TOOI_OTO)[number][] = [];
	let densha = false;
	for (const o of TOOI_OTO) {
		if (heard.length >= 3) break;
		const kiita =
			(o.flags?.some((f) => !!s.flag(f)) ?? false) ||
			(o.also ?? (o.flags ? [] : ["yu" as const])).some((t) =>
				arrived(s, o.map, t),
			);
		if (!kiita) continue;
		if (o.densha) {
			if (densha) continue;
			densha = true;
		}
		heard.push(o);
	}
	for (const o of heard) {
		s.se(o.se, { pan: o.pan, volume: o.volume });
		if (o.twice) {
			await s.wait(420);
			s.se(o.se, { pan: o.pan, volume: o.volume });
		}
		await s.narrate(
			o.map === "kokudo" && o.textMany && truckOoi(s) ? o.textMany : o.text,
		);
	}
	return heard.length > 0;
};

/**
 * ⑮ 深夜のかわらで一本もらったススキ（kawara susuki_a の got_susuki）を、机のコップに さす。
 * room desk の shinya（kanDesk の前）か asa（kanAsa のあと）の最初の一回だけ（seen_susuki_kabin）。
 */
const susukiKabin = async (s: Story): Promise<void> => {
	if (!s.flag("got_susuki") || s.flag("seen_susuki_kabin")) return;
	s.set("seen_susuki_kabin");
	await s.narrate("ポケットの　ススキを、\nコップに　さした。");
};

/** 日記帳の、いつもの一行（書くことも読み返すことも無いとき）。 */
const NIKKI_ITSUMO = "日記帳だ。ひらいたページに\n今日の日付だけ　書いてある。";

/** 書いたばかりの一行を、もう一度ひらいたとき（宵の2回目・深夜のポエムのあと）。 */
const NIKKI_SAKKI = "さっき書いた　一行が、\nそのまま　ある。";

/** ㊴ 骨董屋のラジオの「……よしっ」を、宵にはじめて つけたテレビ（1対1）で思いだす。 */
const YOSHI = "（骨董屋の　『よしっ』は、\nこの　1点ンゴ？）";

/**
 * 一行日記（nostalgia.md P0-4）。セーブの前に、時間帯ごとに一度だけ書く・読む。
 * 宵＝きょうの一行を一つだけ（nikkiKey）／深夜＝つぎのページ。町を歩いてきたあとはポエム（poemKey）／
 * 朝＝ポエムを消しゴムで消す。ポエムが無ければ、ゆうべの一行を読み返す。
 * 2回目からは1行だけ（今の「日記帳だ。」と同じ手間。セーブのたびに文を出さない）。
 */
const nikkiPage = async (s: Story): Promise<void> => {
	const t = s.flag("tod");
	if (t === "yoru") {
		if (nikkiYoru(s)) {
			await s.narrate(NIKKI_SAKKI);
			return;
		}
		const key = nikkiKey(s);
		s.set("seen_nikki_yoru", key);
		await s.narrate("日記帳を　ひらいた。\nきょうの日付の、下に――");
		await s.narrate(NIKKI[key]);
		await s.narrate("……それだけ　書いて、\nとじた。");
		return;
	}
	if (t === "shinya") {
		if (nikkiPoem(s)) {
			await s.narrate(NIKKI_SAKKI);
			return;
		}
		// 「さっき」の一行は、日付をまたぐと黙って「ゆうべ」の一行になる
		await s.narrate(
			nikkiYoru(s)
				? "日記帳。ゆうべの　一行の\nつぎの　ページは、まっしろだ。"
				: "日記帳。まっしろな\nページが　つづいている。",
		);
		if (!shinyaWalked(s)) return;
		const key = poemKey(s);
		s.set("seen_nikki_shinya", key);
		await s.narrate("……なにか、書きたく\nなった。");
		await s.narrate(POEM[key]);
		return;
	}
	if (t === "asa") {
		// 夜の本音は、朝のキリコが自分で消す（ツッコミで閉じる。説教はしない）
		const poem = nikkiPoem(s);
		if (poem && !s.flag("seen_nikki_kesu")) {
			s.set("seen_nikki_kesu");
			await s.narrate("ゆうべの字が、ねむそうに\nかたむいている。");
			await s.narrate(poem);
			await s.say("kiriko", "……だれンゴ、これ");
			await s.narrate("消しゴムで、けした。");
			return;
		}
		const yoru = nikkiYoru(s);
		if (!poem && yoru && !s.flag("seen_nikki_asa")) {
			s.set("seen_nikki_asa");
			await s.narrate("ゆうべの　一行。");
			await s.narrate(yoru);
			return;
		}
	}
	await s.narrate(NIKKI_ITSUMO);
};

export const room: MapDef = {
	id: "room",
	name: "キリコの部屋",
	bgm: "@tod", // 時間帯の曲（生活音の下にごく薄く。data/index.ts の todBgm）
	// 深夜の家（自室とアパート）は amb_kansouki「乾燥機がまわるあいだ」。2:00 の目ざめと、散歩の合間に帰る場所
	todBgm: { shinya: "amb_kansouki" },
	outside: "#1b1410",
	tiles,
	rows,
	// ?classic の屋内では使わない（tod の灯りは屋外だけ）。ジオラマ表示の差し色の源
	lights: [
		{ x: 9, y: 3, r: 1.5, color: "#cfe4ff" }, // モニター
		{ x: 5, y: 6, r: 1.6 }, // 蓄音機
	],
	events: [
		// ── 夕方の帰宅（auto once）。晩ごはんを机に・スレは賑やか・日が落ちて tod="yoru" ──
		// street 側が先に "yoru" へ送っていても取りこぼさないよう、夕方と夜の両方で受ける
		{
			id: "evening",
			x: 5,
			y: 8,
			trigger: "auto",
			once: true,
			when: (st) => st.flags.tod === "yu" || st.flags.tod === "yoru",
			run: async (s) => {
				await s.wait(400);
				await s.say("kiriko", "ただいまンゴ");
				const korokke = !!s.flag("got_korokke");
				// ㉘ kokudo bukatsu_kid の「……それ、コロッケ？」（seen_bukatsu_korokke）を聞いた人は、はしっこから。
				// 「たべた」は あとの「晩ごはんを　たべた」に まかせる（食べる場面を 二つに しない）
				const hashikko = async () => {
					if (s.flag("seen_bukatsu_korokke"))
						await s.narrate("まず、はしっこを　ひとくち。");
				};
				if (s.flag("got_dinner_onigiri") || s.flag("got_dinner_pan")) {
					await s.narrate(
						s.flag("got_dinner_onigiri")
							? "おにぎりの　ふくろを、\n机に　おいた。"
							: "パンの　ふくろを、\n机に　おいた。",
					);
					// ㉘ スーパーのコロッケ（got_korokke）も、晩ごはんの机に
					if (korokke) {
						await s.narrate("コロッケの　つつみも、\nとなりに　ひろげた。");
						await hashikko();
					}
				} else if (korokke) {
					// ㉘ 晩ごはんは買いそびれても、コロッケはある（カップめんは出さない）
					await s.say("kiriko", "……コロッケだけは、\nあるンゴ");
					await s.narrate("コロッケの　つつみを、\n机に　ひろげた。");
					await hashikko();
				} else {
					await s.say("kiriko", "……晩ごはん、\n買いそびれたンゴ");
					await s.narrate("戸だなの　カップめんを、\n机に　おいた。");
					// ㊺ suupaa cupmen の棚（seen_suupaa_cupmen）を見てきた人だけ
					if (s.flag("seen_suupaa_cupmen"))
						await s.say(
							"kiriko",
							"（しんはつばいじゃ　ない、\nいつもの　やつンゴ）",
						);
				}
				// 日が落ちる（DESIGN §4: room は夜。屋外に出れば夜の色は各マップの地の色）。
				// 宵の町を歩いてから帰った人（もとの tod が yoru）は、もう暗い（seen_kitaku_yoru。window の誘いを出さない）
				const osoi = s.flag("tod") === "yoru";
				s.set("tod", "yoru");
				if (osoi) {
					s.set("seen_kitaku_yoru");
					await s.narrate("窓のそとは、もう\nまっくらだ。");
					// どこかの地区に 宵で 着いていた人（yoruStep）
					if (yoruStep(s) >= 1)
						await s.say("kiriko", "（ずいぶん　おそく\nなったンゴ）");
				} else {
					await s.narrate("窓のそとが、ゆっくり\n暗くなっていく。");
				}
				await s.narrate("モニターを　つけた。\nスレに、あかりが　ともる。");
				await s.narrate("『(´・ω・｀)しごと　おわた』");
				await s.narrate(
					osoi
						? "『(＾ω＾)おそかったお。\nおかえりお』"
						: "『(＾ω＾)おかえりお。\nきょうも　おつかれやで』",
				);
				// ㉛ やきうの前振り（全員が通る。umi yakiu_end「外で　見とる　言うたやろ」で回収）
				await s.narrate("『(´・ω・｀)やきう、さいきん\n見ないな』");
				await s.narrate("『(＾ω＾)外で　見とるって\n言うてたお』");
				await s.narrate("スレを　ながめながら、\n晩ごはんを　たべた。");
				await s.say(
					"kiriko",
					"……今夜も、へいわンゴ。\nたべたら　ねむくなってきた",
				);
			},
		},
		// ── 深夜2:00の目ざめ（auto once）。ベッド（bed）で tod="shinya" になった直後に始まる ──
		{
			id: "opening",
			x: 2,
			y: 4,
			trigger: "auto",
			once: true,
			when: (st) => st.flags.tod === "shinya",
			run: async (s) => {
				await s.wait(900);
				await s.fadeIn(1200);
				await s.wait(400);
				await s.narrate("……目が　さめた。");
				await s.narrate("時計の音が　しない。\n――2:00。とまっている。");
				await s.say("kiriko", "……電池、きれたンゴ。\nまだ　よなかンゴ");
				await s.wait(400);
				await s.say("kiriko", "……ねむれそうにないし、\n散歩してくるンゴ");
			},
		},
		// ── ドア → アパートの廊下（座標凍結v2: room (5,9) → apart (2,3)） ──
		{
			id: "door",
			x: 5,
			y: 9,
			trigger: "touch",
			through: true,
			run: async (s) => {
				// 宵に やかんを かけただけ（kettle の seen_kettle_yoru が 1）で 出かけるなら、火を とめてから。
				// 一度だけ（seen_kettle_tome）。kettle は「かけなおした」、bed は とめなおさない
				if (
					s.flag("tod") === "yoru" &&
					numFlag(s, "seen_kettle_yoru") === 1 &&
					!s.flag("seen_kettle_tome")
				) {
					s.set("seen_kettle_tome");
					await s.say("kiriko", "（……あ、やかん）");
					await s.narrate("火を　とめてから、\n出た。");
				}
				await s.warp("apart", 2, 3, "down", { se: "door" });
			},
		},
		// ── 日記（セーブ）。絵は床のノート（自作チップ）。
		//    セーブの前に一行日記（nostalgia.md P0-4。宵に一行・深夜にポエム・朝に消す＝nikkiPage） ──
		{
			id: "diary",
			x: 2,
			y: 6,
			sprite: HOME_DIARY,
			trigger: "talk",
			fixedDir: true,
			run: async (s) => {
				await nikkiPage(s);
				await s.saveMenu();
			},
		},
		// ── 蓄音機（メニューの案内は初回だけ）。
		//    ⑭ となりまちの針・骨董の蓄音機を、ここで一つだけ回収する（上から一つ） ──
		{
			id: "phono",
			x: 5,
			y: 6,
			sprite: SPR.phono,
			trigger: "talk",
			fixedDir: true,
			run: async (s) => {
				const t = s.flag("tod");
				const rec = s.has("rec_q") > 0;
				const first = !s.flag("seen_phono");
				await s.narrate("キリコの　蓄音機だ。");
				if (first) {
					s.set("seen_phono");
					await s.narrate(
						"ひろった　レコードは、メニューの\n「レコード」で　いつでも　聞ける。",
					);
					// 深夜に レコードを持って はじめて しらべたときは、案内だけ（「かけない」は つぎから）
					if (t === "shinya" && rec) return;
				}
				// ⑭ tonarimachi record_oyaji で買った針（got_hari）。日記・まとめの「針を　かえた」へ
				if (s.flag("got_hari") && !s.flag("seen_hari_kaeta")) {
					s.set("seen_hari_kaeta");
					s.se("needle", { volume: 0.6 });
					await s.narrate("となりまちの　針に、\nとりかえた。");
					return;
				}
				// ⑭ 針を見せてもらって、買わなかった人（seen_hari_mise）
				if (
					s.flag("seen_hari_mise") &&
					!s.flag("got_hari") &&
					!s.flag("seen_hari_maru")
				) {
					s.set("seen_hari_maru");
					await s.narrate("針が、だいぶ　まるく\nなっている。");
					await s.say("kiriko", "（となりまちの　店に、\nあったンゴ）");
					return;
				}
				// 筋(53) 朝、ゆうべ深夜のバス停の レコード（rec_q。しまったあと＝seen_tana_rec も）を、一度だけ ちいさく かける
				// （深夜は となりを おこすので かけない↓）。⑭ とりかえた針（seen_hari_kaeta）・まるい針（seen_hari_maru）は ここで鳴らす。
				// 曲の中身・持ち主は書かない。shelf（asa）の「かけおわった」へ
				if (
					t === "asa" &&
					(rec || s.flag("seen_tana_rec")) &&
					!s.flag("seen_phono_asa")
				) {
					s.set("seen_phono_asa");
					s.se("record", { volume: 0.4 });
					if (s.flag("seen_hari_kaeta")) {
						await s.narrate("あたらしい　針で、\nはじめての　一まい。");
					} else if (s.flag("seen_hari_maru")) {
						await s.narrate("まるい　針の　まま、\nかけた。");
						await s.say("kiriko", "（……ざらざらンゴ）");
					} else {
						await s.narrate("ゆうべの　レコードを、\nちいさく　かけた。");
					}
					return;
				}
				// ⑭ tonarimachi kotto_phono（骨董屋の蓄音機）と見くらべる
				if (s.flag("seen_kotto_phono") && !s.flag("seen_phono_kurabe")) {
					s.set("seen_phono_kurabe");
					await s.narrate("ラッパの　まがりを、\nゆびで　なぞった。");
					await s.say("kiriko", "（うちのは、ゼロ　ひとつ\nすくないンゴ）");
					return;
				}
				// 筋(53) 深夜、拾ったレコードは あるけれど かけない。
				// apart の宵に かべごしに聞いた となり（d502 ナイター seen_502_yakiu／d503 シャワー seen_503_yoru）を思う
				if (t === "shinya" && rec) {
					await s.say(
						"kiriko",
						s.flag("seen_502_yakiu")
							? "（502の　人、もう\nねたンゴかね）"
							: s.flag("seen_503_yoru")
								? "（503の　人、もう\nねたンゴかね）"
								: "（いま　かけたら、となりが\nおきるンゴ）",
					);
					return;
				}
				// 宵の2回目から（レコードは まだ 無い。深夜の バス停で ひろう）。
				// 段は seen_phono_kara（数）で進み、3回目で shelf の空き箱へつなぐ
				if (t === "yoru" && !rec && !first) {
					const n = numFlag(s, "seen_phono_kara") + 1;
					s.set("seen_phono_kara", n);
					if (n === 1)
						await s.narrate("ターンテーブルが、から回り\nする　音。");
					else if (n === 2)
						await s.narrate("針を　あげた。\nかける　レコードが　ない。");
					else await s.say("kiriko", "（本棚の　箱も、\nからっぽンゴ）");
					return;
				}
				// 深夜、まだ レコードの無い人には、ほこりだけ（段は進めない）
				if (t === "shinya" && !rec)
					await s.narrate("ターンテーブルに、\nうっすら　ほこり。");
			},
		},
		// ── しらべられる家具（見えない talk イベント）。時間帯で一言が変わる ──
		{
			id: "clock",
			x: 8,
			y: 2,
			trigger: "talk",
			run: async (s) => {
				const t = s.flag("tod");
				if (t === "yu" || t === "yoru") {
					s.se("tick", { volume: 0.7 });
					// 宵は、町の時計（yoruClock。宵に回った地区ごとに進む）とそろえる。
					// ただしテレビが町より先へ進んだ（中継が延長を重ねた）ら、時刻は出さない
					// （部屋の中だけ時計を進めると、町の時計を見たとき戻ってしまう。分が止まって見えるのも さける）
					if (t === "yoru" && numFlag(s, "seen_tv_yoru") <= yoruStep(s)) {
						await s.narrate(`かべの時計。――${yoruClock(s)}。`);
						await s.narrate("秒針が、こつこつ\n歩いている。");
						return;
					}
					await s.narrate("かべの時計。秒針が、\nこつこつ　歩いている。");
					return;
				}
				if (t === "asa") {
					// 深夜に とまっていた かべの時計（電池ぎれ）を、朝に なおす。
					// 時刻は町の朝の時計（asaClock。street clock_tower と同じ）にあわせる
					if (!s.flag("seen_clock_denchi")) {
						s.set("seen_clock_denchi");
						await s.narrate("かべの時計。\n――2:00で　とまったまま。");
						// ㊺ 深夜に「レジよこの　電池」を思いだした人（seen_suupaa_denchi）は、さいごの一本を見つける
						await s.narrate(
							s.flag("seen_suupaa_denchi")
								? "たんすの　おくの　一本に\nとりかえて、はりを　あわせた。"
								: "たんすの　電池に\nとりかえて、はりを　あわせた。",
						);
						s.se("tick", { volume: 0.7 });
						await s.wait(500);
						s.se("tick", { volume: 0.7 });
						await s.narrate(
							`${asaClock(s)}。こつ、こつ、と\nまた　歩きだした。`,
						);
						return;
					}
					s.se("tick", { volume: 0.7 });
					await s.narrate("かべの時計。秒針が、\nこつこつ　歩いている。");
					return;
				}
				await s.narrate("かべの時計。\n――2:00で　とまっている。");
				// ㊺ suupaa rejiyoko の かん電池（seen_suupaa_denchi）を見てきた人は、そっちを思いだす
				await s.say(
					"kiriko",
					s.flag("seen_suupaa_denchi")
						? "（レジよこの　電池、\n手に　とればよかったンゴ）"
						: "（電池は、あしたの\n朝に　かえるンゴ）",
				);
			},
		},
		{
			id: "window",
			x: 3,
			y: 2,
			trigger: "talk",
			run: async (s) => {
				// 夕方の枝は無い（evening が入室と同時に tod を "yoru" にするので、部屋の窓は宵から）
				const t = s.flag("tod");
				if (t === "yoru") {
					// 宵の段（yoruStep）。窓の外の音が、夜の家の順に進む（人の姿は出さない）
					const step = yoruStep(s);
					await s.narrate(
						step === 0
							? "むかいの家に、あかり。\nどこかで、犬の声。"
							: step <= 2
								? "むかいの家の　台所で、\n水を　つかう音。"
								: "どこかで、ふろの　戸を\nしめる音。",
					);
					// P0-2 中継の打ち切りのあと（room tv の seen_chukei_end）。よその家のテレビも、つぎの番組
					if (s.flag("seen_chukei_end"))
						await s.narrate("どこかの　窓から、\n天気よほうの　声。");
					// 一度だけ、外への誘い（nostalgia.md P0-1。宵の町をまだ歩いていないときだけ）。
					// 回収は外で（street arrive_yoru の「……風、すずしいンゴ」・seen_sasoi_kaeri）
					// 宵の町から おそく帰った人（evening の seen_kitaku_yoru）には、もう誘わない
					if (
						!s.flag("seen_yoru_sasoi") &&
						!s.flag("seen_kitaku_yoru") &&
						step === 0
					) {
						s.set("seen_yoru_sasoi");
						await s.say(
							"kiriko",
							"……ねるまえに、ちょっと\nそとの風　すうンゴ？",
						);
					}
					return;
				}
				if (t === "asa") {
					s.se("suzume", { volume: 0.6 });
					await s.narrate("あさの光。\nスズメが、鳴いている。");
					// ⑯ ゴミの日の札（apart keiji の seen_keiji・danchi gomi の seen_gomi_fuda）を見た人だけ。9/14 は火曜
					if (s.flag("seen_keiji") || s.flag("seen_gomi_fuda"))
						await s.narrate("とおくで、ゴミの　車の\n音楽が　鳴っている。");
					return;
				}
				await s.narrate("そとは　しずか。\n窓の　あかりは、ぜんぶ　消えた。");
				// ⑫ 深夜の町を歩いてきた人（shinyaStep>=1）は、外から見たものを内から見る（上から一つ）。
				// street my_win の青い窓（seen_mywin_ao）・street vending_ev（yoru）のあかい札（seen_akafuda_st）
				// ・夕方に自販機を見ただけの人（seen_jihanki_st）は札でなく　あかりを言う
				const sStep = shinyaStep(s);
				await s.narrate(
					sStep >= 1 && s.flag("seen_mywin_ao")
						? "さっき　下から　見あげた\n窓の、内がわだ。"
						: sStep >= 1 && s.flag("seen_akafuda_st")
							? "自販機の　あかい札が、\nここからも　見える。"
							: sStep >= 1 && s.flag("seen_jihanki_st")
								? "自販機の　あかりが、\nここからも　見える。"
								: "街灯と、コンビニの\nあかりだけ　ついている。",
				);
				// 深夜を長く歩いた人には、もっと　しずか
				if (sStep >= 3)
					await s.narrate("街灯の　したを、\nだれも　とおらない。");
			},
		},
		{
			id: "calendar",
			x: 4,
			y: 2,
			trigger: "talk",
			run: async (s) => {
				const t = s.flag("tod");
				await s.narrate("カレンダー。9月。\n13日に、まるが　ついている。");
				// 朝、秋まつりの行のあとに一つだけ: yamamichi の ススキ（seen_susuki_yama・③）か、
				// 筋(55) koen kaikan_jikan の『10月から　木曜は19時まで』（seen_koen_kaikan）
				// noSusuki: 書きこみの初回で コップの ススキを もう言ったときは、ススキを かさねない
				const calTsuika = async (noSusuki = false) => {
					if (!noSusuki && akiMatsuri(s) && s.flag("seen_susuki_yama"))
						await s.say(
							"kiriko",
							"（ススキは、やまみちに\nいっぱい　あったンゴ）",
						);
					else if (s.flag("seen_koen_kaikan"))
						await s.say("kiriko", "（10月の　木曜に、\nまる　つけるンゴ）");
					// 筋(62) tonarimachi hata の『敬老の日　大売り出し』（seen_keirou_tonari）。来週の月曜＝9/20
					else if (s.flag("seen_keirou_tonari"))
						await s.say("kiriko", "（来週の　月曜は、\nお休みンゴ）");
				};
				// 深夜は、もう日づけをまたいでいる（14日の火曜）
				if (t === "shinya") {
					await s.say("kiriko", "（日づけは、もう\n14日ンゴ）");
					return;
				}
				// ③ 朝、秋まつりの おしらせを どこかで 見た 人は、書きこむ（akiMatsuri）
				if (t === "asa" && akiMatsuri(s)) {
					if (!s.flag("seen_cal_aki")) {
						s.set("seen_cal_aki");
						await s.narrate("すみに、えんぴつで\n書きこんだ。");
						await s.narrate("『つきみ　秋まつり』");
						// ⑮ ゆうべ机のコップに さしたススキ（seen_susuki_kabin）が 目に入る
						await s.say(
							"kiriko",
							s.flag("seen_susuki_kabin")
								? "（コップの　ススキ、\nつきみには　はやいンゴ）"
								: "……来られたら、\n来るンゴ",
						);
						await calTsuika(!!s.flag("seen_susuki_kabin"));
						return;
					}
					await s.narrate("すみに、えんぴつの\n『つきみ　秋まつり』。");
					await calTsuika();
					return;
				}
				if (t === "asa") {
					await s.narrate("13日の　まるの　となりが、\nきょうの　ます。");
					await calTsuika();
					return;
				}
				await s.narrate("外の　町に　越してきて、\nちょうど　ひと月の　日。");
			},
		},
		{
			id: "poster",
			x: 6,
			y: 2,
			trigger: "talk",
			run: async (s) => {
				await s.narrate("レコードやの　ポスター。\n『中古盤、高価買取』");
				// ㉙ tonarimachi record_win の窓に、同じポスター（seen_record_poster）
				if (s.flag("seen_record_poster"))
					await s.say("kiriko", "（となりまちの、あの\n店のンゴ）");
				// 朝、ゆうべのレコードを本棚の空き箱へ しまった人（room shelf の seen_tana_rec）
				await s.say(
					"kiriko",
					s.flag("tod") === "asa" && s.flag("seen_tana_rec")
						? "（売らないのが、一まい\nふえたンゴ）"
						: "……売らないンゴ",
				);
			},
		},
		// ── ベッド。夜はここから就寝（tod="yoru"→"shinya"。目ざめは opening が受ける） ──
		{
			id: "bed",
			x: 1,
			y: 4,
			trigger: "talk",
			run: async (s) => {
				const t = s.flag("tod");
				if (t === "shinya") {
					// 深夜の町を歩いてもどると、ふとんは冷えている（shinyaStep）。
					// 缶を のみほした（kanLv 4）あとは、よこに なるだけ
					if (shinyaStep(s) >= 1) {
						await s.narrate("ふとんは、もう\nつめたく　なっていた。");
						if (kanLv(s) === 4)
							await s.narrate("……すこし、よこに　なった。\n目は、さえている。");
						// ㉟ 深夜に すわってきた所（kawara 土手・senro ブロックべい・koen 展望台・yamamichi 峠）。一度だけ
						if (suwariNure(s) && !s.flag("seen_suwari_nure")) {
							s.set("seen_suwari_nure");
							await s.narrate("コートの　すそが、\n夜つゆで　しめっている。");
						}
						return;
					}
					await s.narrate(
						"ふとんは　まだ　あたたかい。\n……もう　ねむれる気が　しない。",
					);
					return;
				}
				if (t === "asa") {
					await s.narrate("ふとんを、なおした。\n……あれから、ねむれなかった。");
					// かゆみ・福引券は一度だけ（レシート・日記の読み返しとそろえる。2回目からは上の1行だけ）
					if (
						s.flag("seen_makura_asa") ||
						!(s.flag("seen_ka") || s.flag("got_fukubikiken"))
					)
						return;
					s.set("seen_makura_asa");
					// からだの一行（nostalgia.md P0-10）。ゆうべのかゆみは、もう無い
					if (s.flag("seen_ka"))
						await s.narrate("かゆみは、いつのまにか\nきえていた。");
					// ポケットの紙もの（P0-9）。となりまちの福引券。回せなくても罰も催促も無い
					if (s.flag("got_fukubikiken")) {
						await s.narrate("まくらもとに、福引券。\nきげんは、きょうまで。");
						await s.say("kiriko", "……また　150円\nかかるンゴ");
					}
					return;
				}
				// 夕方・夜（tod が無い旧データ・デバッグ起動も、寝れば 2:00 の開幕へ合流できる）
				await s.narrate("ふとんは、ほしたてで\nふかふかだ。");
				// ㉚ danchi futon_tori の1回目（るすの家の ふとんを たたいた。seen_futon_tori）。
				// 宵・深夜の b_futon「出しっぱなし」と、朝の「ぱん、ぱん」へつなぐ
				if (t === "yoru" && s.flag("seen_futon_tori"))
					await s.say(
						"kiriko",
						"（るすの家の　ふとんは、\nまだ　そとンゴ……？）",
					);
				// 夕方の川で蚊にさされていれば（P0-10。郷愁の文とは吹き出しを分ける）
				if (t === "yoru" && s.flag("seen_ka"))
					await s.narrate("うでの　さされたとこが、\nまだ　かゆい。");
				const c = await s.choose(["＞＞1 もうねる", "＞＞2 まだおきてる"], {
					cancel: 1,
				});
				if (c !== 0) return;
				// 宵に やかんを かけただけ（kettle の seen_kettle_yoru が 1）なら、火を とめてから。
				// 出かけるときに door で もう とめた人（seen_kettle_tome）は とめなおさない。
				// 深夜の「わかしかけの　お湯」・朝の「ゆうべの　お湯」へ つなぐ
				if (
					t === "yoru" &&
					numFlag(s, "seen_kettle_yoru") === 1 &&
					!s.flag("seen_kettle_tome")
				) {
					await s.say("kiriko", "（……あ、やかん）");
					await s.narrate("火を　とめてから、\nふとんに　もぐりこんだ。");
				} else {
					await s.narrate("ふとんに　もぐりこんだ。");
				}
				// 布団で聞く町（P0-3）。宵の就寝だけ。
				// どの地区にも行っていなければ、今までと同じ
				const tooi = t === "yoru" && (await tooiOto(s));
				s.se("tick", { volume: 0.6 });
				await s.wait(700);
				s.se("tick", { volume: 0.6 });
				if (tooi) await s.narrate("いちばん　ちかいのは、\n秒針の音だった。");
				await s.narrate("秒針の音が、\nとおくなっていく――");
				await s.fadeOut(1500);
				await s.wait(600);
				s.se("tick", { volume: 0.5 });
				await s.wait(1400);
				// ここで秒針の音が、やむ。目ざめの場面は opening（auto）が続ける
				s.set("tod", "shinya");
				await s.warp("room", 2, 4, "down", { fade: false });
			},
		},
		// ── 机。夕方に買った晩ごはんが、次の朝まで のこっている ──
		{
			id: "desk",
			x: 2,
			y: 3,
			trigger: "talk",
			run: async (s) => {
				const t = s.flag("tod");
				if (t === "yu" || t === "yoru") {
					await s.narrate(`机のうえに、${dinnerName(s)}。\nもう、からっぽだ。`);
					return;
				}
				if (t === "shinya") {
					await s.narrate(`机のうえ、ゆうべの\n${dinnerName(s)}が　そのまま。`);
					await susukiKabin(s); // ⑮ かわらのススキ（最初の一回）
					// 深夜の自販機で買った缶は、ここで飲み干せる（nostalgia.md P0-6。持っていなければ何も出ない）
					await kanDesk(s);
					return;
				}
				if (t === "asa") {
					await s.narrate(
						`机のうえ、ゆうべの\n${dinnerName(s)}が　のこっている。`,
					);
					await s.say("kiriko", "……かたづけるンゴ");
					// ポケットの紙もの（P0-9）。コロッケを会計した人だけ、レシートが出てくる（一度だけ）。
					// ゆうべ深夜の自販機で買った缶（夜の散歩は本当にあった。夢オチにしない）
					// ⑮ 深夜に コップへ さしてあったか（susukiKabin より先に とる）
					const kabin = !!s.flag("seen_susuki_kabin");
					await kanAsa(s);
					if (kabin)
						await s.narrate("コップの　ススキに、\n朝の　光が　さしている。");
					else await susukiKabin(s); // ⑮ かわらのススキ（朝に はじめて さす人）
					const receipt =
						!!s.flag("got_korokke") &&
						!!s.flag("seen_kaikei") &&
						!s.flag("seen_receipt");
					// 筋(57) senro koujou_fuda で ひろった もりた製作所の ばね（got_senro_bane）。一度だけ（seen_bane_asa）。
					// レシートが出る朝は レシートを先に。ばねは つぎに しらべたとき（seen_receipt のあと）
					if (
						s.flag("got_senro_bane") &&
						!s.flag("seen_bane_asa") &&
						!receipt
					) {
						s.set("seen_bane_asa");
						await s.narrate("つくえの　上に、\nちいさな　ばね。");
					}
					if (receipt) {
						s.set("seen_receipt");
						await s.narrate(
							"ポケットから、くしゃくしゃの\nレシート。『コロッケ（半）』",
						);
						await s.narrate("おまけの一個は、\nどこにも　のっていない。");
						// 「……」とンゴは、すぐ上の「……かたづけるンゴ」にまかせる（nostalgia.md §5）
						await s.say("kiriko", "（ばあちゃんの　ないしょ）");
						return;
					}
					// ㊻ apart mybox 深夜の ピザやの チラシ（got_pizza_chirashi）。紙ものは1回に一つ。
					// 深夜の「あしたの晩ごはん」が、朝には「きょう」
					if (s.flag("got_pizza_chirashi") && !s.flag("seen_pizza_asa")) {
						s.set("seen_pizza_asa");
						await s.narrate("ポケットから、ピザやの\nチラシ。");
						await s.say("kiriko", "（……きょうの　晩ごはんンゴ）");
					}
					return;
				}
				await s.narrate("机のうえは、きれいだ。");
				await s.narrate("……こんなに　きれいなのは、\nめずらしい。");
			},
		},
		// ── モニター。夕・夜=賑やか／深夜=止まっている／朝=動き出す（MGRoidらの書き込み） ──
		{
			id: "pc",
			x: 9,
			y: 3,
			trigger: "talk",
			run: async (s) => {
				const t = s.flag("tod");
				if (t === "yu" || t === "yoru") {
					if (!s.flag("seen_hoshumura")) {
						s.set("seen_hoshumura");
						await s.narrate(
							"保守村。人の　散った　おんJに\n残った　みんなの　スレ。",
						);
					}
					const yoru = t === "yoru";
					// テレビの中継が打ち切られたあと（seen_chukei_end）は、一度だけスレもその話
					// （seen_pc_chukei。nostalgia.md P0-2。顔文字の住民だけ。チーム名・選手名は書かない）。
					// 2回目からは、中継がおわって住民が おちていく段へ（深夜の『保守』→ umi yakiu_end）
					const chukei = yoru && !!s.flag("seen_chukei_end");
					const chukeiNow = chukei && !s.flag("seen_pc_chukei");
					// 宵は、見るたびにスレが進む（seen_pc_yoru。読んでから +1）:
					// 麻婆豆腐 → ごちそうさま → 住民が おちていく（深夜の『保守』へ）
					const n = yoru ? numFlag(s, "seen_pc_yoru") : 0;
					const dan = chukei ? Math.max(n, 2) : n;
					await s.narrate(
						yoru && dan >= 2 && !chukeiNow
							? "保守村の　スレ。\nレスの　あいだが、あいてきた。"
							: "保守村の　スレは、\nこんやも　にぎやかだ。",
					);
					if (chukeiNow) {
						s.set("seen_pc_chukei");
						await s.narrate("『(´・ω・｀)中継　おわって草』");
						await s.narrate("『(＾ω＾)ラジオ民は\nおらんかお？』");
						return;
					}
					if (yoru) s.set("seen_pc_yoru", Math.min(3, dan + 1));
					if (dan === 0) {
						await s.narrate("『ロゼ：麻婆豆腐、\nつくりすぎたアル』");
						await s.narrate("『シヨ：……だれか、\nたべに　きなさいよ』");
						await s.narrate("『フェリス：はーい、\nいく〜』");
						return;
					}
					if (dan === 1) {
						// 朝のスレ（asa の1回目）で「お皿、まだ」と つづく（seen_pc_osara）
						s.set("seen_pc_osara");
						await s.narrate("『フェリス：ごちそうさま〜』");
						await s.narrate("『シヨ：……お皿は　あらって\nかえりなさいよ』");
						return;
					}
					await s.narrate("『(´・ω・｀)ほな、おちるわ』");
					await s.narrate("『保守』");
					return;
				}
				if (t === "shinya") {
					await s.narrate("モニターの　あかりだけが、\nついている。");
					// ⑫ 外から見た あおい窓（apart door_room の seen_denki_kaishu）は、これだった。一度だけ。
					// 外から青い窓を じっさいに見た人（street my_win・danchi のいちばん上）で、しかも
					// door_room が「だれの部屋か」の答えを まだ言っていない人（かわらか通りの問いがある）だけ。
					// かわらだけの人は窓を見ていない・団地だけの人は door_room で もう言った
					const mieta = !!(s.flag("seen_mywin_ao") || s.flag("seen_danchi_ue"));
					const toi = !!(
						s.flag("seen_taigan_shinya") || s.flag("seen_mywin_ao")
					);
					if (
						s.flag("seen_denki_kaishu") &&
						mieta &&
						toi &&
						!s.flag("seen_pc_ao")
					) {
						s.set("seen_pc_ao");
						await s.say("kiriko", "（……これが、そとから\n見えてたンゴ）");
					}
					// 画面の時計は 町の深夜の時計（shinyaClock。地区を回るほど進む）。かべの時計だけ 2:00 のまま
					await s.narrate(`画面の　すみの　時計は、\n${shinyaClock(s)}。`);
					await s.narrate(
						"保守村の　スレは、しずかだ。\nさいごの　レスは、名無しの『保守』。",
					);
					await s.say("kiriko", "……みんな、ねてるンゴ");
					return;
				}
				if (t === "asa") {
					if (!s.flag("seen_asa_thread")) {
						s.set("seen_asa_thread");
						await s.narrate("モニターに、あかり。\n（スレが　うごいている。）");
						await post(s, "mgroid", "おはようさん。\n……保守");
						await post(s, "motroid", "朝から　スレ　伸びとって\n草");
						await post(
							s,
							"nynroid",
							"朝メシ、梨の　のこり。\nひえとって　うまいで",
						);
						// 宵のスレの「お皿は　あらって　かえりなさいよ」（seen_pc_osara）を読んだ人だけ
						if (s.flag("seen_pc_osara"))
							await s.narrate(
								"『シヨ：……お皿、まだ\nかえって　きてないんだけど』",
							);
						await s.say("kiriko", "……吾輩も、あとで\n書くンゴ");
						return;
					}
					await s.narrate("あたらしい書きこみが、\nすこしずつ、ふえていく。");
					return;
				}
				await s.narrate(
					"モニターは　ついていない。\nじぶんの顔だけ、うつっている。",
				);
			},
		},
		{
			id: "shelf",
			x: 5,
			y: 3,
			trigger: "talk",
			run: async (s) => {
				// 朝、ゆうべ深夜のバス停で拾ったレコード（rec_q）を、空き箱に しまう（一度だけ）
				if (s.flag("tod") === "asa") {
					if (s.has("rec_q") > 0 && !s.flag("seen_tana_rec")) {
						s.set("seen_tana_rec");
						// 筋(53) 朝の phono で一度かけた人（seen_phono_asa）は、かけおわってから しまう
						await s.narrate(
							s.flag("seen_phono_asa")
								? "空き箱に、かけおわった\nレコードを　しまった。"
								: "空き箱に、ゆうべの\nレコードを　しまった。",
						);
						return;
					}
					if (s.flag("seen_tana_rec")) {
						await s.narrate("空き箱に、レコードが\n一まい。");
						return;
					}
				}
				await s.narrate("本と、レコードの空き箱が\nひとつ。");
				// 筋(53) 深夜に拾ったレコード（rec_q）は、朝まで しまわない（朝の phono で かけてから）
				if (s.flag("tod") === "shinya" && s.has("rec_q") > 0)
					await s.say("kiriko", "（しまうのは、朝ンゴ）");
			},
		},
		// ── テレビ（夕・夜=やきう中継、朝=あさの番組。深夜は月曜の放送休止＝seen_tv_shinya）。
		//    夜のナイターは延長戦が町の時計（nostalgia.md P0-2）: 9回うら → 延長10回 → 11回 →
		//    中継の打ち切り（seen_chukei_end）→ 天気よほう（seen_tenki）→ あとは自分で消す。
		//    結果は、あしたの朝刊（apart mybox）で ──
		{
			id: "tv",
			x: 7,
			y: 3,
			trigger: "talk",
			run: async (s) => {
				const t = s.flag("tod");
				if (t === "yu" || t === "yoru") {
					// 段＝max(宵に回った地区の数, 宵にテレビを見た回数)。見た回数は段を読んでから数える
					// （テレビだけでも4回目で打ち切り。3地区を回ってきた人は1回目で打ち切り）
					const dan = chukeiDan(s);
					// テレビを はじめて つけた一回（㊴ の回収は、画面が 1対1 の dan 0・1 の ここだけ）
					const hajime = numFlag(s, "seen_tv_yoru") === 0;
					s.set("seen_tv_yoru", numFlag(s, "seen_tv_yoru") + 1);
					// ㊴ tonarimachi kotto_oku のラジオの「……よしっ」（seen_kotto_radio 2）を聞いた人
					const yoshi = hajime && numFlag(s, "seen_kotto_radio") >= 2;
					// ㊺ suupaa nichiyou の せんざい（seen_suupaa_senzai）が、延長のあいだの CM に 一度だけ
					const senzaiCm = async () => {
						if (!s.flag("seen_suupaa_senzai") || s.flag("seen_tv_senzai"))
							return;
						s.set("seen_tv_senzai");
						await s.narrate("CMに、あの　せんざいの\n箱が　出てきた。");
					};
					if (dan === 0) {
						await s.narrate("テレビを　つけた。\nやきう中継。9回うら。");
						await s.narrate("1対1。……まだ、おわらない。");
						if (yoshi) await s.say("kiriko", YOSHI);
						return;
					}
					if (dan === 1) {
						await s.narrate("テレビを　つけた。\n延長10回。まだ、1対1。");
						// ㊴ を聞いた人は、そっちの ひとことに かえる（キリコを 2行 つづけない）
						await s.say("kiriko", yoshi ? YOSHI : "しあいの　ながい日ンゴ");
						await senzaiCm();
						return;
					}
					if (dan === 2) {
						await s.narrate("延長11回。ピッチャーが、\nまた　かわった。");
						await senzaiCm();
						return;
					}
					if (!s.flag("seen_chukei_end")) {
						s.set("seen_chukei_end");
						await s.narrate("『中継は　ここまでと\nなります』");
						await s.narrate("『つづきは、ラジオで――』");
						await s.say("kiriko", "……ラジオ、ないンゴ");
						return;
					}
					if (!s.flag("seen_tenki")) {
						s.set("seen_tenki");
						await s.narrate("天気よほう。\n『あしたは、はれ』");
						return;
					}
					s.se("tick", { volume: 0.6 });
					await s.narrate("テレビを　つけて、\nすぐに　けした。");
					return;
				}
				if (t === "asa") {
					await s.narrate("テレビを　つけた。\nあさの番組が、ながれている。");
					await s.narrate("……いつもの、\n火曜の　朝の　声だ。");
					// 深夜の放送休止を見た人だけ（seen_tv_shinya）
					if (s.flag("seen_tv_shinya"))
						await s.say("kiriko", "（テレビも、おきたンゴ）");
					return;
				}
				// 深夜（月曜の夜おそく）は、放送休止。2回目からは、つけない
				if (s.flag("seen_tv_shinya")) {
					await s.narrate("テレビは、つけずに　おいた。");
					return;
				}
				s.set("seen_tv_shinya");
				// 声には しない（だれも しゃべらない画面。文字だけ）
				await s.narrate("テレビを　つけた。画面に\n『放送休止』の　文字。");
				await s.say("kiriko", "（テレビも、ねてるンゴ）");
			},
		},
		{
			id: "kettle",
			x: 10,
			y: 6,
			trigger: "talk",
			run: async (s) => {
				const t = s.flag("tod");
				// 宵は、さわるたびに やかんが進む（seen_kettle_yoru 数。3で止める）:
				// かけた → わいて、お茶を いれた → もう のんだ。深夜に その のこりを さわる
				const n = numFlag(s, "seen_kettle_yoru");
				if (t === "yu" || t === "yoru") {
					s.set("seen_kettle_yoru", Math.min(3, n + 1));
					if (n === 0) {
						await s.narrate("やかんを　かけた。");
						return;
					}
					if (n === 1) {
						// 出かける前に 火を とめた人（door の seen_kettle_tome）は、かけなおしてから
						await s.narrate(
							s.flag("seen_kettle_tome")
								? "火に　かけなおした。\nお茶を　いれた。"
								: "しゅんしゅん　いってきた。\nお茶を　いれた。",
						);
						return;
					}
					await s.narrate("お茶は、もう　のんだ。");
					return;
				}
				if (t === "asa") {
					// 朝は、宵に どこまで やったかで のこりが ちがう（深夜と同じ n を読む）
					if (n >= 2) {
						await s.narrate("きゅうすに、ゆうべの\nお茶っぱが　ひらいている。");
						await s.say("kiriko", "……あとで　わかし\nなおすンゴ");
						return;
					}
					if (n === 1) {
						await s.narrate("やかんに、ゆうべの\nお湯が　のこっている。");
						await s.say("kiriko", "……あとで　わかし\nなおすンゴ");
						return;
					}
					await s.narrate("やかんは、からっぽだ。");
					await s.say("kiriko", "……あとで　わかすンゴ");
					return;
				}
				if (n >= 2) {
					await s.narrate("やかん。さわると、\nほんのり　ぬるい。");
					await s.narrate("……ねるまえの　おちゃの、\nのこりだ。");
					return;
				}
				// かけただけで、お茶を いれずに ねた（bed で 火を とめた。朝の「ゆうべの　お湯」へ）
				if (n === 1) {
					await s.narrate("やかんに、わかしかけの\nお湯。もう　ぬるい。");
					return;
				}
				await s.narrate("やかん。つめたい。\n水は　入っていない。");
			},
		},
	],
};
