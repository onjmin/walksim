// キリコの部屋（プロローグの一日の起点。DESIGN §4 時間帯システム・docs/style-everyday.md）。
// 12×10 の室内。ベッド・机・本棚・テレビ・モニター・蓄音機・日記（セーブ）・やかん・ドア。
// ゲームは street（夕方・tod="yu"）から始まり、帰宅で evening（tod を "yoru" に）→
// ベッドで就寝 → tod="shinya" になり、既存の 2:00 の目ざめ（opening）→「散歩してくるンゴ」。
// ドアは apart へ（座標凍結v2: room (5,9) → apart (2,3)）。
// 朝（tod="asa"）は まちのどおりの 窓の 場面（転）の あと。寄れば 秒針が 戻り、スレが 動き出す（結は umi.ts）。
// BGM は無音。秒針の音（tick）は時間帯ごとに SE で鳴らし分ける。
// カレンダーは 3月・15日に まる（外の 町に 越してきて ひと月。STORY.md §5.5）。
// 小ネタ: テレビの砂あらし →（レコードを持って・3回目）NNN風の名前の放送（note nnn）。
//
// ノスタルジー層（docs/nostalgia.md。共通部品は data/nostalgia.ts）。自室は錨（罠12）：異常も気配も足さない。
//   宵   … テレビのナイターが、宵に回った地区の数か見た回数で延長の段を進む → 中継の打ち切り（P0-2）。
//           打ち切りのあとは、スレもその話。窓から一度だけ外への誘い（P0-1）。日記に きょうの一行（P0-4）。
//           布団にもぐると、夕方に歩いた地区の音が遠く鳴る（P0-3）。蚊にさされていれば、まだかゆい（P0-10）
//   深夜 … 日記のつぎのページ。町を歩いてきたあとはポエムを書いてしまう（P0-4）。机で缶を飲み干す（P0-6）
//   朝   … ポエムを消しゴムで消す（P0-4）。机にレシート（P0-9）。枕元に福引券・かゆみは消えている（P0-9・P0-10）
//
// 読むだけのフラグ: got_dinner_onigiri / got_dinner_pan（street。夕方の買い物）・
//   done:<map>:arrive_yu（布団の遠い音）・done:<map>:arrive_yoru / arrive_shinya（nostalgia.ts 経由）・
//   seen_ka（kawara）・got_korokke / seen_kaikei（suupaa）・got_fukubikiken（tonarimachi）・got_kan（深夜の自販機）。
// set するフラグ: tod（"yoru"→"shinya"）・seen_asa_thread・seen_clock・seen_tv・
//   seen_tv_yoru（数）・seen_chukei_end・seen_tenki・seen_yoru_sasoi・
//   seen_nikki_yoru / seen_nikki_shinya（字）・seen_nikki_kesu・got_kan（kanDesk 経由）・
//   seen_nikki_asa・seen_receipt・seen_makura_asa（この3つは room の中だけ。朝の日記・机・枕元を一度にする）。

import type { MapDef, Story, TileDef } from "../../engine/defs";
import {
	arrived,
	chukeiDan,
	kanDesk,
	NIKKI,
	nikkiKey,
	nikkiPoem,
	nikkiYoru,
	numFlag,
	POEM,
	poemKey,
	shinyaWalked,
	yoruStep,
} from "../nostalgia";
import { ALL_RECORDS } from "../records";
import { SPR } from "../sprites";
import { HOME_DIARY, ROOM } from "../tiles";

// 絵は自作チップ（data/tiles.ts の ROOM・scripts/make-home-tiles.mjs）
const tiles: Record<string, TileDef> = ROOM;

// W 窓 / Q 絵（ポスター） / c カレンダー / k 壁掛け時計 / Z z ベッド / t 机 / j やかんの台 / B 本棚 / V テレビ / M モニター / n いす
const rows = [
	"############", // y0
	"#HHWHHQHHHH#", // y1  窓 (3,1)・ポスター (6,1)
	"#hhhchhhkhh#", // y2  カレンダー (4,2)（(4,3) から）・壁掛け時計 (8,2)
	"#Zto.B.V.M.#", // y3  ベッド (1,3)・机 (2,3)・本棚 (5,3)・テレビ (7,3)・モニター (9,3)
	"#z.......nw#", // y4  いす (9,4)。目ざめの場所 (2,4)
	"#g.....m...#", // y5
	"#.........j#", // y6  日記 (2,6)・蓄音機 (5,6)・やかんの台 (10,6)
	"#e......l..#", // y7
	"#.........f#", // y8  apart からの戻り位置 (5,8)
	"#####D######", // y9  ドア (5,9) → apart (2,3)（座標凍結v2）
];

/** レコードを1枚でも持っているか。 */
const anyRecord = (st: { items: Record<string, number> }): boolean =>
	ALL_RECORDS.some((id) => (st.items[id] ?? 0) > 0);

/** 朝のスレの書き込み（名前欄「名無しさん」。声はカメオ音源。DESIGN §5）。 */
const post = (s: Story, who: string, text: string) =>
	s.say(who, text, { name: "名無しさん", noPortrait: true });

/** 晩ごはんの呼び名（street の買い物フラグで決まる。どちらも無ければ戸だなのカップめん）。 */
const dinnerName = (s: Story): string =>
	s.flag("got_dinner_onigiri")
		? "おにぎりの　ふくろ"
		: s.flag("got_dinner_pan")
			? "パンの　ふくろ"
			: "カップめんの　空き";

/**
 * 布団で聞く町（nostalgia.md P0-3）。夕方に着いた地区（done:<map>:arrive_yu）の音だけを、遠く小さく。
 * 地区名は出さない。駅（ekimae）は鉄橋（kawara）に行っていないときだけ鳴らすので、多くて3音。
 */
const TOOI_OTO: {
	map: string;
	se: string;
	pan: number;
	volume: number;
	text: string;
}[] = [
	{
		map: "kawara",
		se: "densha_far",
		pan: 0.6,
		volume: 0.3,
		text: "とおくで、鉄橋を\nわたる音。",
	},
	{
		map: "kokudo",
		se: "train",
		pan: -0.8,
		volume: 0.2,
		text: "国道のほうから、\nながい　音。",
	},
	{
		map: "danchi",
		se: "door",
		pan: -0.4,
		volume: 0.2,
		// 距離を文で決めておく（部屋のすぐ外の気配に読ませない。自室は錨＝罠12）
		text: "ずっと　むこうで、戸の\nしまる音。",
	},
	{
		map: "ekimae",
		se: "densha_far",
		pan: -0.3,
		volume: 0.3,
		text: "とおくで、電車が\n出ていく音。",
	},
];

/** 布団の中で、遠い音を順に鳴らす（宵の就寝だけ）。1音でも鳴らしたら true。 */
const tooiOto = async (s: Story): Promise<boolean> => {
	const heard = TOOI_OTO.filter(
		(o) =>
			arrived(s, o.map, "yu") &&
			!(o.map === "ekimae" && arrived(s, "kawara", "yu")),
	);
	for (const o of heard) {
		s.se(o.se, { pan: o.pan, volume: o.volume });
		await s.narrate(o.text);
	}
	return heard.length > 0;
};

/** 日記帳の、いつもの一行（書くことも読み返すことも無いとき）。 */
const NIKKI_ITSUMO = "日記帳だ。ひらいたページに\n今日の日付だけ　書いてある。";

/** 書いたばかりの一行を、もう一度ひらいたとき（宵の2回目・深夜のポエムのあと）。 */
const NIKKI_SAKKI = "さっき書いた　一行が、\nそのまま　ある。";

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
				if (s.flag("got_dinner_onigiri")) {
					await s.narrate("おにぎりの　ふくろを、\n机に　おいた。");
				} else if (s.flag("got_dinner_pan")) {
					await s.narrate("パンの　ふくろを、\n机に　おいた。");
				} else {
					await s.say("kiriko", "……晩ごはん、\n買いそびれたンゴ");
					await s.narrate("戸だなの　カップめんを、\n机に　おいた。");
				}
				// 日が落ちる（DESIGN §4: room は夜。屋外に出れば夜の色は各マップの地の色）
				s.set("tod", "yoru");
				await s.narrate("窓のそとが、ゆっくり\n暗くなっていく。");
				await s.narrate("モニターを　つけた。\nスレに、あかりが　ともる。");
				await s.narrate("『(´・ω・｀)しごと　おわた』");
				await s.narrate("『(＾ω＾)おかえりお。\nきょうも　おつかれやで』");
				await s.narrate("『(´・ω・｀)なんか外で\n音しない？』");
				await s.say("kiriko", "気のせいやろ、って\n書いておくンゴ");
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
				await s.say("kiriko", "……まだ　よなかンゴ");
				await s.narrate(
					"ドアの下から、しろい光が\nすじに　なって　もれている。",
				);
				await s.say("kiriko", "……ろうかの電気、\nこんな色だったンゴ？");
				await s.wait(400);
				await s.say("kiriko", "……ねむれそうにないし、\n散歩してくるンゴ");
			},
		},
		// ── 蓄音機がひとりでに回っている（レコードを持って戻ったとき。朝には鳴らさない） ──
		{
			id: "phono_spin",
			x: 6,
			y: 5,
			trigger: "auto",
			once: true,
			when: (st) =>
				anyRecord(st) &&
				!!st.flags["done:room:opening"] &&
				st.flags.tod !== "asa",
			run: async (s) => {
				await s.wait(400);
				s.se("record");
				await s.narrate("――蓄音機が、ひとりでに\nまわっている。");
				await s.narrate("レコードは、\nのせていないのに。");
				s.se("needle");
				await s.narrate("針をあげると、すなおに\nとまった。");
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
		// ── 蓄音機（メニューの案内） ──
		{
			id: "phono",
			x: 5,
			y: 6,
			sprite: SPR.phono,
			trigger: "talk",
			fixedDir: true,
			run: async (s) => {
				await s.narrate("キリコの　蓄音機だ。");
				await s.narrate(
					"ひろった　レコードは、メニューの\n「レコード」で　いつでも　聞ける。",
				);
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
					await s.narrate("かべの時計。秒針が、\nこつこつ　歩いている。");
					return;
				}
				if (t === "asa") {
					s.se("tick", { volume: 0.7 });
					await s.wait(500);
					s.se("tick", { volume: 0.7 });
					await s.narrate("かべの時計。5:12。\n……ちゃんと、うごいている。");
					return;
				}
				await s.narrate("かべの時計。\n――2:00で　とまっている。");
				s.se("tick");
				await s.wait(700);
				if (!s.flag("seen_clock")) {
					s.set("seen_clock");
					await s.say("kiriko", "……いま、動いたンゴ？");
					return;
				}
				await s.narrate("……秒針は、それきり\nうごかない。");
			},
		},
		{
			id: "window",
			x: 3,
			y: 2,
			trigger: "talk",
			run: async (s) => {
				const t = s.flag("tod");
				if (t === "yu") {
					s.se("higurashi", { volume: 0.5 });
					await s.narrate("西の空が、あかい。\nヒグラシの声が、とおい。");
					return;
				}
				if (t === "yoru") {
					await s.narrate("むかいの家に、あかり。\nどこかで、犬の声。");
					// 一度だけ、外への誘い（nostalgia.md P0-1。宵の町をまだ歩いていないときだけ）
					if (!s.flag("seen_yoru_sasoi") && yoruStep(s) === 0) {
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
					return;
				}
				await s.narrate("そとは　まっくら。\nまちの明かりが、ひとつもない。");
				await s.narrate("街灯も、信号の色も、\nどこにも　ない。");
			},
		},
		{
			id: "calendar",
			x: 4,
			y: 2,
			trigger: "talk",
			run: async (s) => {
				await s.narrate("カレンダー。3月。\n15日に、まるが　ついている。");
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
				await s.say("kiriko", "……売らないンゴ");
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
				// 夕方の川で蚊にさされていれば（P0-10。郷愁の文とは吹き出しを分ける）
				if (t === "yoru" && s.flag("seen_ka"))
					await s.narrate("うでの　さされたとこが、\nまだ　かゆい。");
				const c = await s.choose(["＞＞1 もうねる", "＞＞2 まだおきてる"], {
					cancel: 1,
				});
				if (c !== 0) return;
				await s.narrate("ふとんに　もぐりこんだ。");
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
					// 朝のあき缶は置かない（深夜の町が夢かどうかの答え合わせになるため）
					if (
						s.flag("got_korokke") &&
						s.flag("seen_kaikei") &&
						!s.flag("seen_receipt")
					) {
						s.set("seen_receipt");
						await s.narrate(
							"ポケットから、くしゃくしゃの\nレシート。『コロッケ（半）』",
						);
						await s.narrate("おまけの一個は、\nどこにも　のっていない。");
						// 「……」とンゴは、すぐ上の「……かたづけるンゴ」にまかせる（nostalgia.md §5）
						await s.say("kiriko", "（ばあちゃんの　ないしょ）");
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
					await s.narrate("保守村の　スレは、\nこんやも　にぎやかだ。");
					// テレビの中継が打ち切られたあとは、スレもその話（nostalgia.md P0-2。
					// 顔文字の住民だけ。チーム名・選手名は書かない）
					if (t === "yoru" && s.flag("seen_chukei_end")) {
						await s.narrate("『(´・ω・｀)中継　おわって草』");
						await s.narrate("『(＾ω＾)ラジオ民は\nおらんかお？』");
						return;
					}
					await s.narrate("『ロゼ：麻婆豆腐、\nつくりすぎたアル』");
					await s.narrate("『シヨ：……だれか、\nたべに　きなさいよ』");
					await s.narrate("『フェリス：はーい、\nいく〜』");
					return;
				}
				if (t === "shinya") {
					await s.narrate("モニターの　あかりだけが、\nついている。");
					await s.narrate(
						"保守村の　スレは、しずかだ。\nさいごの　レスは『保守』。",
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
							"朝メシ、おでんの残りに\nするわ。あったまるで",
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
				await s.narrate("本と、レコードの空き箱。\nどれも　見おぼえがある。");
			},
		},
		// ── テレビ（夕・夜=やきう中継、朝=あさの番組。深夜は砂あらし →まれに NNN → note nnn）。
		//    夜のナイターは延長戦が町の時計（nostalgia.md P0-2）: 9回うら → 延長10回 → 11回 →
		//    中継の打ち切り（seen_chukei_end）→ 天気よほう（seen_tenki）→ あとは自分で消す。
		//    結果は、あしたの朝刊（apart mybox）で。NNN の条件（seen_tv の回数）と文言は変えない ──
		{
			id: "tv",
			x: 7,
			y: 3,
			trigger: "talk",
			run: async (s) => {
				const n = Number(s.flag("seen_tv") ?? 0);
				s.set("seen_tv", n + 1);
				const t = s.flag("tod");
				if (t === "yu" || t === "yoru") {
					// 段＝max(宵に回った地区の数, 宵にテレビを見た回数)。見た回数は段を読んでから数える
					// （テレビだけでも4回目で打ち切り。3地区を回ってきた人は1回目で打ち切り）
					const dan = chukeiDan(s);
					s.set("seen_tv_yoru", numFlag(s, "seen_tv_yoru") + 1);
					if (dan === 0) {
						await s.narrate("テレビを　つけた。\nやきう中継。9回うら。");
						await s.narrate("1対1。……まだ、おわらない。");
						return;
					}
					if (dan === 1) {
						await s.narrate("テレビを　つけた。\n延長10回。まだ、1対1。");
						await s.say("kiriko", "しあいの　ながい日ンゴ");
						return;
					}
					if (dan === 2) {
						await s.narrate("延長11回。ピッチャーが、\nまた　かわった。");
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
					return;
				}
				s.se("hum", { volume: 0.6 });
				await s.narrate("テレビを　つけた。\n――ざあ、と　砂あらし。");
				await s.narrate("なにも　うつらないので、\nけした。");
			},
		},
		{
			id: "kettle",
			x: 10,
			y: 6,
			trigger: "talk",
			run: async (s) => {
				const t = s.flag("tod");
				if (t === "yu" || t === "yoru") {
					await s.narrate("やかんを　かけた。\nお茶の　じかんだ。");
					return;
				}
				if (t === "asa") {
					await s.narrate("やかんは、つめたい。\nあとで　わかしなおすンゴ。");
					return;
				}
				await s.narrate("やかん。さわると、\nほんのり　ぬるい。");
				await s.narrate("……ゆうべの　おちゃの、\nのこりだ。");
			},
		},
	],
};
